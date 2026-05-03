/**
 * Auth Service - Cognito authentication and session management
 */

import {
  clearAuthToken,
  getResolvedAuthToken,
  setAuthToken,
  setOnAuthFailure,
  setOnTokenRefresh,
  ApiException,
} from './api';
import { GraphQLException, mutation, query, resetGraphQLClient, type GraphQLExceptionPayload } from './graphql';
import { storage } from './storage';
import {
  confirmForgotPasswordChange,
  confirmSignUpCode,
  globalSignOut,
  refreshCognitoSession,
  resendSignUpCode,
  signInWithHostedUi,
  signInWithPassword,
  signUpWithPassword,
  startForgotPassword,
  type CognitoCodeDeliveryDetails,
  type CognitoHostedUiProfile,
} from './cognito';
import { removeBiometricCredentials } from './biometric';
import { getRegisteredPushToken, unregisterPushToken } from './notifications';
import {
  clearPendingProvisioningSession,
  clearSession,
  getPendingProvisioningSession as getPersistedPendingProvisioningSession,
  getSession,
  getSessionExpiry,
  setPendingProvisioningSession,
  setSession,
  updateSessionUser,
} from './session';
import type { Language, NotificationSettings, User } from '../types/user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  language: Language;
}

export interface RegisterResponse {
  email: string;
  userConfirmed: boolean;
  codeDeliveryDetails?: CognitoCodeDeliveryDetails;
}

export interface ConfirmRegistrationRequest {
  email: string;
  code: string;
  password: string;
  name?: string;
  language?: Language;
}

export interface SocialAuthRequest {
  provider: 'google' | 'apple';
  name?: string;
  language?: Language;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordResetConfirmationRequest {
  email: string;
  code: string;
  password: string;
}

export interface CompletePendingProvisioningRequest {
  name: string;
  language?: Language;
}

export type AuthStateCallback = (user: User | null, isAuthenticated: boolean) => void;

interface BackendNotificationPreference {
  caseUpdates: boolean;
  community: boolean;
  proAlerts: boolean;
  news: boolean;
}

interface BackendEntitlement {
  entitlementKey: string;
  expiresAt?: string | null;
}

interface BackendUser {
  id: string;
  name: string;
  email: string;
  language: Language;
  biometricEnabled: boolean;
  notificationPreference?: BackendNotificationPreference | null;
  entitlements: BackendEntitlement[];
}

interface SocialJwtClaims {
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
const PROVISIONING_REQUIRED_CODE = 428;
const USER_NOT_PROVISIONED_MESSAGE = 'User profile not provisioned';

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  caseUpdates: true,
  community: true,
  proAlerts: true,
  news: true,
};

const BACKEND_USER_SELECTION = /* GraphQL */ `
  id
  name
  email
  language
  biometricEnabled
  notificationPreference {
    caseUpdates
    community
    proAlerts
    news
  }
  entitlements {
    entitlementKey
    expiresAt
  }
`;

const ME_QUERY = /* GraphQL */ `
  query AuthMe {
    me {
      ${BACKEND_USER_SELECTION}
    }
  }
`;

const UPDATE_PROFILE_MUTATION = /* GraphQL */ `
  mutation AuthUpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      ${BACKEND_USER_SELECTION}
    }
  }
`;

const PROVISION_CURRENT_USER_MUTATION = /* GraphQL */ `
  mutation AuthProvisionCurrentUser($input: ProvisionCurrentUserInput!) {
    provisionCurrentUser(input: $input) {
      ${BACKEND_USER_SELECTION}
    }
  }
`;

type ProvisionSeed = Pick<BackendUser, 'email' | 'name'> & Partial<Pick<BackendUser, 'language'>>;

const UPDATE_NOTIFICATION_PREFERENCES_MUTATION = /* GraphQL */ `
  mutation AuthUpdateNotificationPreferences($input: UpdateNotificationPreferencesInput!) {
    updateNotificationPreferences(input: $input) {
      caseUpdates
      community
      proAlerts
      news
    }
  }
`;

const authStateListeners: Set<AuthStateCallback> = new Set();
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let currentSessionUser: User | null = null;

function toNotificationSettings(
  preference?: Partial<BackendNotificationPreference> | Partial<NotificationSettings> | null,
): NotificationSettings {
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(preference ?? {}),
  };
}

function resolveCasesProEntitlement(
  entitlements: BackendEntitlement[] | undefined,
): BackendEntitlement | null {
  if (!entitlements?.length) {
    return null;
  }

  const now = Date.now();

  return (
    entitlements.find((entitlement) => {
      if (entitlement.entitlementKey !== 'cases_pro') {
        return false;
      }

      if (!entitlement.expiresAt) {
        return true;
      }

      return new Date(entitlement.expiresAt).getTime() > now;
    }) ?? null
  );
}

function normalizeUser(user: User): User {
  return {
    ...user,
    isPro: Boolean(user.isPro),
    notificationSettings: toNotificationSettings(user.notificationSettings),
  };
}

function toAppUser(user: BackendUser): User {
  const proEntitlement = resolveCasesProEntitlement(user.entitlements);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    language: user.language,
    biometricEnabled: user.biometricEnabled,
    notificationSettings: toNotificationSettings(user.notificationPreference),
    isPro: proEntitlement !== null,
    subscriptionExpiry: proEntitlement?.expiresAt ?? undefined,
  };
}

function buildProvisionSeed(
  profileSeed?: Partial<Pick<BackendUser, 'email' | 'name' | 'language'>>,
): ProvisionSeed | null {
  const email = profileSeed?.email?.trim().toLowerCase();
  const name = profileSeed?.name?.trim();

  if (!email || !name) {
    return null;
  }

  return {
    email,
    name,
    ...(profileSeed?.language ? { language: profileSeed.language } : {}),
  };
}

function decodeBase64UrlSegment(value: string): string | undefined {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = `${normalized}${'='.repeat(padding)}`;
  const runtimeBuffer = (globalThis as {
    Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } };
  }).Buffer;

  if (runtimeBuffer) {
    return runtimeBuffer.from(padded, 'base64').toString('utf8');
  }

  if (typeof globalThis.atob !== 'function') {
    return undefined;
  }

  const binary = globalThis.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function parseSocialJwtClaims(token?: string): SocialJwtClaims | undefined {
  const payload = token?.split('.')[1];

  if (!payload) {
    return undefined;
  }

  const decodedPayload = decodeBase64UrlSegment(payload);

  if (!decodedPayload) {
    return undefined;
  }

  try {
    return JSON.parse(decodedPayload) as SocialJwtClaims;
  } catch {
    return undefined;
  }
}

function mergeSocialProfile(
  profile?: CognitoHostedUiProfile,
  idToken?: string,
): CognitoHostedUiProfile | undefined {
  const tokenClaims = parseSocialJwtClaims(idToken);

  if (!profile && !tokenClaims) {
    return undefined;
  }

  return {
    ...(tokenClaims ?? {}),
    ...(profile ?? {}),
  };
}

function resolveSocialProfileName(
  profile?: CognitoHostedUiProfile,
): string | undefined {
  const directName = typeof profile?.name === 'string' ? profile.name.trim() : '';
  if (directName) {
    return directName;
  }

  const derivedName = [
    typeof profile?.given_name === 'string' ? profile.given_name.trim() : '',
    typeof profile?.family_name === 'string' ? profile.family_name.trim() : '',
  ].filter(Boolean).join(' ').trim();

  return derivedName || undefined;
}

function isProvisioningRequiredError(error: unknown): error is GraphQLException {
  if (!(error instanceof GraphQLException)) {
    return false;
  }

  return isProvisioningRequiredPayload(error);
}

function isProvisioningRequiredPayload(
  error: Pick<GraphQLExceptionPayload, 'message' | 'errors'>,
): boolean {
  const extensionCode = error.errors?.[0]?.extensions?.code;
  const extensionStatus = error.errors?.[0]?.extensions?.status;
  const normalizedMessage = error.message.trim().toLowerCase();

  return (
    normalizedMessage === USER_NOT_PROVISIONED_MESSAGE.toLowerCase() ||
    (extensionCode === 'NOT_FOUND' && extensionStatus === 404)
  );
}

function createProvisioningRequiredException(requestId: string): ApiException {
  return new ApiException({
    type: 'validation_error',
    code: PROVISIONING_REQUIRED_CODE,
    message: 'Necesitamos completar tu perfil en Inmigreat antes de entrar. Comparte al menos tu nombre para crear el usuario local.',
    details: {
      profile: ['User profile must be provisioned before continuing'],
    },
    requestId,
  });
}

function createPendingProvisioningExpiredException(requestId: string): ApiException {
  return new ApiException({
    type: 'auth_error',
    code: 401,
    message: 'Tu sesion expiro antes de completar tu perfil. Inicia sesion otra vez para continuar.',
    requestId,
  });
}

async function rememberPendingProvisioningSession(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  profileSeed?: Partial<Pick<BackendUser, 'email' | 'language'>>,
): Promise<void> {
  const email = profileSeed?.email?.trim().toLowerCase();

  if (!email) {
    clearAuthToken();
    throw createProvisioningRequiredException(`auth_${Date.now()}`);
  }

  await setPendingProvisioningSession({
    accessToken,
    refreshToken,
    tokenExpiry: Date.now() + (expiresIn * 1000),
    email,
    ...(profileSeed?.language ? { language: profileSeed.language } : {}),
  });

  clearAuthToken();
  resetGraphQLClient();
}

async function getActivePendingProvisioningSession(): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  email: string;
  language?: Language;
}> {
  const pendingSession = await getPersistedPendingProvisioningSession();

  if (!pendingSession) {
    throw createPendingProvisioningExpiredException(`auth_${Date.now()}`);
  }

  const remainingMs = pendingSession.tokenExpiry - Date.now();

  if (remainingMs > 0) {
    return {
      accessToken: pendingSession.accessToken,
      refreshToken: pendingSession.refreshToken,
      expiresIn: Math.max(1, Math.floor(remainingMs / 1000)),
      email: pendingSession.email,
      ...(pendingSession.language ? { language: pendingSession.language } : {}),
    };
  }

  try {
    const refreshedSession = await refreshCognitoSession(pendingSession.refreshToken);
    const nextRefreshToken = refreshedSession.refreshToken || pendingSession.refreshToken;

    await setPendingProvisioningSession({
      ...pendingSession,
      accessToken: refreshedSession.accessToken,
      refreshToken: nextRefreshToken,
      tokenExpiry: Date.now() + (refreshedSession.expiresIn * 1000),
    });

    return {
      accessToken: refreshedSession.accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: refreshedSession.expiresIn,
      email: pendingSession.email,
      ...(pendingSession.language ? { language: pendingSession.language } : {}),
    };
  } catch {
    await clearPendingProvisioningSession();
    clearAuthToken();
    throw createPendingProvisioningExpiredException(`auth_${Date.now()}`);
  }
}

function notifyAuthStateChange(user: User | null): void {
  currentSessionUser = user;
  authStateListeners.forEach((callback) => {
    try {
      callback(user, user !== null);
    } catch (error) {
      console.error('[Auth] Error in auth state listener:', error);
    }
  });
}

function buildAuthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function logAccessTokenForDebug(accessToken: string): void {
  if (!__DEV__) {
    return;
  }

  console.log(`[Auth Debug] Access token:\n${accessToken}`);
}

async function fetchCurrentUserFromBackend(accessToken: string): Promise<User> {
  setAuthToken(accessToken);

  const response = await query<{ me: BackendUser }>(ME_QUERY, {
    operationName: 'AuthMe',
    headers: buildAuthHeaders(accessToken),
    shouldLogError: (error) => !isProvisioningRequiredPayload(error),
  });

  return toAppUser(response.data.me);
}

async function syncProfile(
  accessToken: string,
  input: Partial<Pick<BackendUser, 'name' | 'language' | 'biometricEnabled'>>,
): Promise<User> {
  setAuthToken(accessToken);

  const response = await mutation<{ updateProfile: BackendUser }, { input: typeof input }>(
    UPDATE_PROFILE_MUTATION,
    {
      operationName: 'AuthUpdateProfile',
      headers: buildAuthHeaders(accessToken),
      variables: { input },
    },
  );

  return toAppUser(response.data.updateProfile);
}

async function syncNotificationPreferences(
  accessToken: string,
  input: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
  const response = await mutation<
    { updateNotificationPreferences: BackendNotificationPreference },
    { input: Partial<NotificationSettings> }
  >(UPDATE_NOTIFICATION_PREFERENCES_MUTATION, {
    operationName: 'AuthUpdateNotificationPreferences',
    headers: buildAuthHeaders(accessToken),
    variables: { input },
  });

  return toNotificationSettings(response.data.updateNotificationPreferences);
}

async function provisionCurrentUser(
  accessToken: string,
  input: ProvisionSeed,
): Promise<User> {
  setAuthToken(accessToken);

  const response = await mutation<
    { provisionCurrentUser: BackendUser },
    { input: ProvisionSeed }
  >(PROVISION_CURRENT_USER_MUTATION, {
    operationName: 'AuthProvisionCurrentUser',
    headers: buildAuthHeaders(accessToken),
    variables: { input },
  });

  return toAppUser(response.data.provisionCurrentUser);
}

async function persistBiometricPreference(user: User): Promise<void> {
  const normalizedUser = normalizeUser(user);

  await storage.setBiometricEnabled(normalizedUser.biometricEnabled);
}

async function persistSession(
  user: User,
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number,
): Promise<void> {
  const normalizedUser = normalizeUser(user);
  const expiresAt = Date.now() + (expiresIn * 1000);

  await setSession({
    user: normalizedUser,
    accessToken,
    refreshToken,
    expiresAt,
  });

  await persistBiometricPreference(normalizedUser);
  setAuthToken(accessToken);
  resetGraphQLClient();
  scheduleTokenRefresh(expiresIn);
  notifyAuthStateChange(normalizedUser);
}

async function persistAuthenticatedUser(user: User): Promise<User> {
  const normalizedUser = normalizeUser(user);
  const session = await getSession();

  if (session?.accessToken) {
    await updateSessionUser(normalizedUser);
    await persistBiometricPreference(normalizedUser);
    notifyAuthStateChange(normalizedUser);
  } else {
    await persistBiometricPreference(normalizedUser);
    notifyAuthStateChange(normalizedUser);
  }

  return normalizedUser;
}

async function clearTokens(): Promise<void> {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  await clearSession();

  clearAuthToken();
  resetGraphQLClient();
}

function scheduleTokenRefresh(expiresIn: number): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  const refreshDelay = Math.max(0, (expiresIn * 1000) - REFRESH_THRESHOLD_MS);

  refreshTimer = setTimeout(async () => {
    try {
      await refreshToken();
    } catch (error) {
      console.error('[Auth] Auto refresh failed:', error);
    }
  }, refreshDelay);
}

async function establishSession(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  profileSeed?: Partial<Pick<BackendUser, 'email' | 'name' | 'language'>>,
  options?: { provisionExplicitly?: boolean },
): Promise<AuthResponse> {
  setAuthToken(accessToken);
  logAccessTokenForDebug(accessToken);

  const provisionSeed = buildProvisionSeed(profileSeed);
  let user: User;
  let provisionedDuringSession = false;

  if (options?.provisionExplicitly) {
    if (!provisionSeed) {
      throw createProvisioningRequiredException(`auth_${Date.now()}`);
    }

    user = await provisionCurrentUser(accessToken, provisionSeed);
    provisionedDuringSession = true;
  } else {
    try {
      user = await fetchCurrentUserFromBackend(accessToken);
    } catch (error) {
      if (!isProvisioningRequiredError(error)) {
        throw error;
      }

      if (!provisionSeed) {
        await rememberPendingProvisioningSession(accessToken, refreshToken, expiresIn, profileSeed);
        throw createProvisioningRequiredException(error.requestId);
      }

      user = await provisionCurrentUser(accessToken, provisionSeed);
      provisionedDuringSession = true;
    }
  }

  if (!provisionedDuringSession && !options?.provisionExplicitly && (profileSeed?.name || profileSeed?.language)) {
    user = await syncProfile(accessToken, {
      ...(profileSeed.name ? { name: profileSeed.name } : {}),
      ...(profileSeed.language ? { language: profileSeed.language } : {}),
    });
  }

  await persistSession(user, accessToken, refreshToken, expiresIn);
  await clearPendingProvisioningSession();

  return {
    user,
    accessToken,
    refreshToken,
    expiresIn,
  };
}

export function onAuthStateChange(callback: AuthStateCallback): () => void {
  authStateListeners.add(callback);
  return () => {
    authStateListeners.delete(callback);
  };
}

export async function login(
  credentials: LoginRequest,
  profileSeed?: Partial<Pick<BackendUser, 'name' | 'language'>>,
): Promise<AuthResponse> {
  const session = await signInWithPassword(credentials.email, credentials.password);

  if (!session.refreshToken) {
    throw new ApiException({
      type: 'server_error',
      code: 500,
      message: 'Cognito no devolvió refresh token para esta sesión.',
      requestId: `auth_${Date.now()}`,
    });
  }

  return establishSession(session.accessToken, session.refreshToken, session.expiresIn, {
    email: credentials.email.trim().toLowerCase(),
    ...(profileSeed?.name ? { name: profileSeed.name } : {}),
    ...(profileSeed?.language ? { language: profileSeed.language } : {}),
  });
}

export async function completePendingProvisioning(
  input: CompletePendingProvisioningRequest,
): Promise<AuthResponse> {
  const pendingSession = await getActivePendingProvisioningSession();
  const language = input.language ?? pendingSession.language;
  const provisionSeed = buildProvisionSeed({
    email: pendingSession.email,
    name: input.name,
    ...(language ? { language } : {}),
  });

  if (!provisionSeed) {
    throw createProvisioningRequiredException(`auth_${Date.now()}`);
  }

  return establishSession(
    pendingSession.accessToken,
    pendingSession.refreshToken,
    pendingSession.expiresIn,
    provisionSeed,
    {
      provisionExplicitly: true,
    },
  );
}

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const result = await signUpWithPassword(data.email, data.password, data.name);

  return {
    email: data.email,
    userConfirmed: result.userConfirmed,
    codeDeliveryDetails: result.codeDeliveryDetails,
  };
}

export async function confirmRegistration(data: ConfirmRegistrationRequest): Promise<AuthResponse> {
  await confirmSignUpCode(data.email, data.code);

  const session = await signInWithPassword(data.email, data.password);

  if (!session.refreshToken) {
    throw new ApiException({
      type: 'server_error',
      code: 500,
      message: 'Cognito no devolvió refresh token para esta sesión.',
      requestId: `auth_${Date.now()}`,
    });
  }

  return establishSession(session.accessToken, session.refreshToken, session.expiresIn, {
    email: data.email,
    ...(data.name?.trim() ? { name: data.name.trim() } : {}),
    ...(data.language ? { language: data.language } : {}),
  }, {
    provisionExplicitly: true,
  });
}

export async function resendRegistrationCode(email: string): Promise<CognitoCodeDeliveryDetails | undefined> {
  return resendSignUpCode(email);
}

export async function socialLogin(data: SocialAuthRequest): Promise<AuthResponse> {
  const session = await signInWithHostedUi(data.provider);

  if (!session.refreshToken) {
    throw new ApiException({
      type: 'server_error',
      code: 500,
      message: 'Cognito no devolvió refresh token para esta sesión social.',
      requestId: `auth_${Date.now()}`,
    });
  }

  const mergedProfile = mergeSocialProfile(session.profile, session.idToken);
  const profileName = data.name?.trim() || resolveSocialProfileName(mergedProfile);
  const profileEmail = typeof mergedProfile?.email === 'string'
    ? mergedProfile.email.trim().toLowerCase()
    : undefined;

  return establishSession(session.accessToken, session.refreshToken, session.expiresIn, {
    ...(profileEmail ? { email: profileEmail } : {}),
    ...(profileName ? { name: profileName } : {}),
    ...(data.language ? { language: data.language } : {}),
  });
}

export async function refreshToken(): Promise<RefreshTokenResponse> {
  const activeSession = await getSession();
  const storedRefreshToken = activeSession?.refreshToken ?? null;

  if (!storedRefreshToken) {
    throw new ApiException({
      type: 'auth_error',
      code: 401,
      message: 'No hay refresh token disponible.',
      requestId: `auth_${Date.now()}`,
    });
  }

  const session = await refreshCognitoSession(storedRefreshToken);
  const nextRefreshToken = session.refreshToken || storedRefreshToken;

  if (activeSession?.user) {
    await persistSession(activeSession.user, session.accessToken, nextRefreshToken, session.expiresIn);
  } else {
    setAuthToken(session.accessToken);
    resetGraphQLClient();
  }

  return {
    accessToken: session.accessToken,
    refreshToken: nextRefreshToken,
    expiresIn: session.expiresIn,
  };
}

export async function logout(): Promise<void> {
  const [accessToken, pushToken] = await Promise.all([
    getResolvedAuthToken(),
    getRegisteredPushToken(),
  ]);

  if (accessToken && pushToken) {
    await unregisterPushToken(pushToken).catch((error) => {
      console.warn('[Auth] Could not unregister push token during logout:', error);
    });
  }

  if (accessToken) {
    await globalSignOut(accessToken).catch(() => {
      console.log('[Auth] Cognito sign out failed, clearing local state');
    });
  }

  await clearTokens();
  await removeBiometricCredentials().catch(() => {
    console.warn('[Auth] Could not clear biometric credentials during logout');
  });
  await storage.clearAll();
  notifyAuthStateChange(null);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await startForgotPassword(email);
}

export async function confirmPasswordReset(
  data: PasswordResetConfirmationRequest,
): Promise<void> {
  await confirmForgotPasswordChange(data.email, data.code, data.password);
}

export async function initializeAuth(): Promise<User | null> {
  try {
    const activeSession = await getSession();
    const persistedAccessToken = activeSession?.accessToken ?? null;

    if (!persistedAccessToken || !activeSession?.user) {
      return null;
    }

    const tokenExpiry = await getSessionExpiry();
    const now = Date.now();
    let accessToken = persistedAccessToken;

    if (!tokenExpiry || tokenExpiry <= now + REFRESH_THRESHOLD_MS) {
      try {
        const refreshed = await refreshToken();
        accessToken = refreshed.accessToken;
      } catch {
        await clearTokens();
        return null;
      }
    } else {
      scheduleTokenRefresh(Math.floor((tokenExpiry - now) / 1000));
    }

    setAuthToken(accessToken);

    try {
      const freshUser = await fetchCurrentUserFromBackend(accessToken);
      await persistAuthenticatedUser(freshUser);
      return freshUser;
    } catch (error) {
      if (isProvisioningRequiredError(error)) {
        console.warn('[Auth] Backend user is not provisioned locally; clearing session.');
        await clearTokens();
        notifyAuthStateChange(null);
        return null;
      }

      console.warn('[Auth] Falling back to stored user during auth initialization:', error);
      const normalizedStoredUser = normalizeUser(activeSession.user);
      await persistBiometricPreference(normalizedStoredUser);
      notifyAuthStateChange(normalizedStoredUser);
      return normalizedStoredUser;
    }
  } catch (error) {
    console.error('[Auth] Error initializing auth:', error);
    return null;
  }
}

export async function updateProfile(
  input: Partial<Pick<BackendUser, 'name' | 'language' | 'biometricEnabled'>>,
): Promise<User> {
  const accessToken = await getResolvedAuthToken();

  if (!accessToken) {
    throw new ApiException({
      type: 'auth_error',
      code: 401,
      message: 'No hay una sesión activa para actualizar el perfil.',
      requestId: `auth_${Date.now()}`,
    });
  }

  const updatedUser = await syncProfile(accessToken, input);
  return persistAuthenticatedUser(updatedUser);
}

export async function updateNotificationPreferences(
  input: Partial<NotificationSettings>,
): Promise<User> {
  const accessToken = await getResolvedAuthToken();

  if (!accessToken) {
    throw new ApiException({
      type: 'auth_error',
      code: 401,
      message: 'No hay una sesión activa para actualizar notificaciones.',
      requestId: `auth_${Date.now()}`,
    });
  }

  setAuthToken(accessToken);

  const activeSession = await getSession();
  const currentStoredUser = activeSession?.user ? normalizeUser(activeSession.user) : currentSessionUser;

  if (!currentStoredUser) {
    throw new ApiException({
      type: 'auth_error',
      code: 401,
      message: 'No hay datos de usuario para actualizar notificaciones.',
      requestId: `auth_${Date.now()}`,
    });
  }

  const notificationSettings = await syncNotificationPreferences(accessToken, input);

  return persistAuthenticatedUser({
    ...currentStoredUser,
    notificationSettings,
  });
}

export function setupAuthFailureHandler(): void {
  setOnAuthFailure(async () => {
    console.log('[Auth] Auth failure detected, logging out');
    await logout();
  });
  setOnTokenRefresh(async () => {
    const response = await refreshToken();
    return response.accessToken;
  });
}

export const authService = {
  login,
  completePendingProvisioning,
  register,
  confirmRegistration,
  resendRegistrationCode,
  socialLogin,
  logout,
  refreshToken,
  updateProfile,
  updateNotificationPreferences,
  requestPasswordReset,
  confirmPasswordReset,
  initializeAuth,
  setupAuthFailureHandler,
  onAuthStateChange,
};

export default authService;