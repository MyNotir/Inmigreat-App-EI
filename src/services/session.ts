import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { User, Language } from '../types/user';

const SECURE_KEYS = {
  SESSION: 'inmigreat_session',
  LEGACY_AUTH_TOKEN: 'inmigreat_auth_token',
  LEGACY_USER_DATA: 'inmigreat_user_data',
  PENDING_PROVISIONING_SESSION: 'inmigreat_pending_provisioning_session',
} as const;

const ASYNC_KEYS = {
  LEGACY_REFRESH_TOKEN: '@inmigreat/refresh_token',
  LEGACY_TOKEN_EXPIRY: '@inmigreat/token_expiry',
} as const;

export interface SessionRecord {
  user: User;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}

export interface PendingProvisioningSession {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  email: string;
  language?: Language;
}

interface LegacyAuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

let sessionCache: SessionRecord | null | undefined;
let pendingProvisioningCache: PendingProvisioningSession | null | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.accessToken === 'string'
    && 'user' in value
    && isRecord(value.user)
    && typeof value.user.email === 'string';
}

async function readSecureJson<T>(key: string): Promise<T | null> {
  try {
    const rawValue = await SecureStore.getItemAsync(key);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.error(`[Session] Error reading secure key ${key}:`, error);
    return null;
  }
}

async function writeSecureJson<T>(key: string, value: T): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}

async function readLegacyAsyncJson<T>(key: string): Promise<T | null> {
  try {
    const rawValue = await AsyncStorage.getItem(key);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.error(`[Session] Error reading legacy async key ${key}:`, error);
    return null;
  }
}

async function clearLegacySessionData(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEYS.LEGACY_AUTH_TOKEN).catch(() => {}),
    SecureStore.deleteItemAsync(SECURE_KEYS.LEGACY_USER_DATA).catch(() => {}),
    AsyncStorage.removeItem(ASYNC_KEYS.LEGACY_REFRESH_TOKEN).catch(() => {}),
    AsyncStorage.removeItem(ASYNC_KEYS.LEGACY_TOKEN_EXPIRY).catch(() => {}),
  ]);
}

async function migrateLegacySession(): Promise<SessionRecord | null> {
  const [legacyAuthState, legacyAccessToken, legacyRefreshToken, legacyExpiry] = await Promise.all([
    readSecureJson<LegacyAuthState>(SECURE_KEYS.LEGACY_USER_DATA),
    SecureStore.getItemAsync(SECURE_KEYS.LEGACY_AUTH_TOKEN).catch(() => null),
    readLegacyAsyncJson<string>(ASYNC_KEYS.LEGACY_REFRESH_TOKEN),
    readLegacyAsyncJson<number>(ASYNC_KEYS.LEGACY_TOKEN_EXPIRY),
  ]);

  const user = legacyAuthState?.user ?? null;
  const accessToken = legacyAccessToken ?? legacyAuthState?.token ?? null;

  if (!user || !accessToken) {
    return null;
  }

  const migratedSession: SessionRecord = {
    user,
    accessToken,
    refreshToken: legacyRefreshToken ?? null,
    expiresAt: typeof legacyExpiry === 'number' ? legacyExpiry : null,
  };

  await writeSecureJson(SECURE_KEYS.SESSION, migratedSession);
  await clearLegacySessionData();

  return migratedSession;
}

export async function getSession(): Promise<SessionRecord | null> {
  if (sessionCache !== undefined) {
    return sessionCache;
  }

  const storedSession = await readSecureJson<SessionRecord>(SECURE_KEYS.SESSION);

  if (storedSession && isSessionRecord(storedSession)) {
    sessionCache = storedSession;
    return storedSession;
  }

  const migratedSession = await migrateLegacySession();
  sessionCache = migratedSession;
  return migratedSession;
}

export async function setSession(session: SessionRecord): Promise<void> {
  sessionCache = session;
  await writeSecureJson(SECURE_KEYS.SESSION, session);
}

export async function clearSession(): Promise<void> {
  sessionCache = null;

  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEYS.SESSION).catch(() => {}),
    clearLegacySessionData(),
  ]);
}

export function clearSessionCache(): void {
  sessionCache = undefined;
}

export async function getAccessToken(): Promise<string | null> {
  return (await getSession())?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await getSession())?.refreshToken ?? null;
}

export async function getSessionExpiry(): Promise<number | null> {
  return (await getSession())?.expiresAt ?? null;
}

export async function getSessionUser(): Promise<User | null> {
  return (await getSession())?.user ?? null;
}

export async function updateSessionUser(user: User): Promise<void> {
  const currentSession = await getSession();

  if (!currentSession) {
    return;
  }

  await setSession({
    ...currentSession,
    user,
  });
}

export async function updateSessionTokens(input: {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
}): Promise<void> {
  const currentSession = await getSession();

  if (!currentSession) {
    return;
  }

  await setSession({
    ...currentSession,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken ?? currentSession.refreshToken,
    expiresAt: input.expiresAt ?? currentSession.expiresAt,
  });
}

export async function setPendingProvisioningSession(
  session: PendingProvisioningSession,
): Promise<void> {
  pendingProvisioningCache = session;
  await writeSecureJson(SECURE_KEYS.PENDING_PROVISIONING_SESSION, session);
}

export async function getPendingProvisioningSession(): Promise<PendingProvisioningSession | null> {
  if (pendingProvisioningCache !== undefined) {
    return pendingProvisioningCache;
  }

  const session = await readSecureJson<PendingProvisioningSession>(SECURE_KEYS.PENDING_PROVISIONING_SESSION);
  pendingProvisioningCache = session;
  return session;
}

export async function clearPendingProvisioningSession(): Promise<void> {
  pendingProvisioningCache = null;
  await SecureStore.deleteItemAsync(SECURE_KEYS.PENDING_PROVISIONING_SESSION).catch(() => {});
}

export const sessionService = {
  getSession,
  setSession,
  clearSession,
  clearSessionCache,
  getAccessToken,
  getRefreshToken,
  getSessionExpiry,
  getSessionUser,
  updateSessionUser,
  updateSessionTokens,
  setPendingProvisioningSession,
  getPendingProvisioningSession,
  clearPendingProvisioningSession,
};

export default sessionService;