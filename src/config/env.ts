import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getPublicEnvValue, getRequestedPublicAppEnvironment } from './public-env';

export type AppEnvironment = 'development' | 'production';

export interface BackendConfig {
  environment: AppEnvironment;
  origins: {
    http: string;
    ws: string;
  };
  rest: {
    baseUrl: string;
    healthUrl: string;
  };
  graphql: {
    path: string;
    httpUrl: string;
    wsUrl: string;
  };
  realtime: {
    casesPath: string;
    casesWsUrl: string;
  };
  cognito: {
    region: string;
    userPoolId: string;
    clientId: string;
    hostedUiUrl?: string;
    redirectUri?: string;
  };
}

const DEFAULT_GRAPHQL_PATH = '/graphql';
const DEFAULT_CASES_WS_PATH = '/ws';
const DEFAULT_HEALTH_PATH = '/health';

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizePath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

function toWebSocketOrigin(value: string): string {
  if (value.startsWith('https://')) {
    return `wss://${value.slice('https://'.length)}`;
  }

  if (value.startsWith('http://')) {
    return `ws://${value.slice('http://'.length)}`;
  }

  return value;
}

function getRequestedEnvironment(): AppEnvironment | null {
  return getRequestedPublicAppEnvironment();
}

function getRequiredEnv(name: string, aliases: string[] = []): string {
  const candidates = [name, ...aliases];

  const value = getPublicEnvValue(name, aliases);
  if (value) {
    return value;
  }

  throw new Error(`Missing required environment variable: ${candidates.join(' or ')}`);
}

function getOptionalEnv(name: string, aliases: string[] = []): string | undefined {
  const value = getPublicEnvValue(name, aliases);
  return value?.trim() || undefined;
}

function resolveOrigin(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();

  if (trimmed) {
    return normalizeOrigin(trimmed);
  }

  return normalizeOrigin(fallback);
}

function resolvePath(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();

  if (trimmed) {
    return normalizePath(trimmed);
  }

  return normalizePath(fallback);
}

function isLocalHostName(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function detectDevMachineHost(): string | null {
  const hostUriCandidates = [
    Constants.expoConfig?.hostUri,
    (Constants as any).manifest?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoClient?.hostUri,
  ];

  for (const candidate of hostUriCandidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) {
      continue;
    }

    const host = candidate.split(':')[0]?.trim();
    if (host && !isLocalHostName(host)) {
      return host;
    }
  }

  return null;
}

function resolveRuntimeOrigin(origin: string): string {
  let parsed: URL;

  try {
    parsed = new URL(origin);
  } catch {
    return origin;
  }

  if (!isLocalHostName(parsed.hostname) || Platform.OS === 'web') {
    return origin;
  }

  // On physical devices (including Android), prefer the dev machine's actual LAN IP from Expo.
  const devMachineHost = detectDevMachineHost();
  if (devMachineHost) {
    parsed.hostname = devMachineHost;
    return parsed.toString().replace(/\/$/, '');
  }

  // Android emulator does not map localhost to host machine — fall back to its alias.
  if (Platform.OS === 'android') {
    parsed.hostname = '10.0.2.2';
    return parsed.toString().replace(/\/$/, '');
  }

  return origin;
}

export const APP_ENV: AppEnvironment = getRequestedEnvironment() ?? (__DEV__ ? 'development' : 'production');

export const BACKEND_HTTP_ORIGIN = resolveRuntimeOrigin(
  normalizeOrigin(getRequiredEnv('EXPO_PUBLIC_BACKEND_URL', ['EXPO_PUBLIC_API_URL'])),
);

export const WS_BASE_URL = resolveOrigin(
  resolveRuntimeOrigin(getPublicEnvValue('EXPO_PUBLIC_BACKEND_WS_URL', ['EXPO_PUBLIC_WS_URL']) || ''),
  toWebSocketOrigin(BACKEND_HTTP_ORIGIN),
);

export const GRAPHQL_PATH = resolvePath(
  getPublicEnvValue('EXPO_PUBLIC_GRAPHQL_PATH'),
  DEFAULT_GRAPHQL_PATH,
);

export const CASES_WS_PATH = resolvePath(
  getPublicEnvValue('EXPO_PUBLIC_CASES_WS_PATH'),
  DEFAULT_CASES_WS_PATH,
);

export const HEALTH_PATH = resolvePath(
  getPublicEnvValue('EXPO_PUBLIC_HEALTH_PATH'),
  DEFAULT_HEALTH_PATH,
);

export const API_BASE_URL = BACKEND_HTTP_ORIGIN;
export const HEALTH_URL = `${BACKEND_HTTP_ORIGIN}${HEALTH_PATH}`;
export const GRAPHQL_HTTP_URL = `${BACKEND_HTTP_ORIGIN}${GRAPHQL_PATH}`;
export const GRAPHQL_WS_URL = `${WS_BASE_URL}${GRAPHQL_PATH}`;
export const CASES_WS_URL = `${WS_BASE_URL}${CASES_WS_PATH}`;

export const backendConfig: BackendConfig = {
  environment: APP_ENV,
  origins: {
    http: BACKEND_HTTP_ORIGIN,
    ws: WS_BASE_URL,
  },
  rest: {
    baseUrl: API_BASE_URL,
    healthUrl: HEALTH_URL,
  },
  graphql: {
    path: GRAPHQL_PATH,
    httpUrl: GRAPHQL_HTTP_URL,
    wsUrl: GRAPHQL_WS_URL,
  },
  realtime: {
    casesPath: CASES_WS_PATH,
    casesWsUrl: CASES_WS_URL,
  },
  cognito: {
    region: getRequiredEnv('EXPO_PUBLIC_COGNITO_REGION'),
    userPoolId: getRequiredEnv('EXPO_PUBLIC_COGNITO_USER_POOL_ID'),
    clientId: getRequiredEnv('EXPO_PUBLIC_COGNITO_CLIENT_ID'),
    hostedUiUrl: getOptionalEnv('EXPO_PUBLIC_COGNITO_HOSTED_UI_URL'),
    redirectUri: getOptionalEnv('EXPO_PUBLIC_COGNITO_REDIRECT_URI'),
  },
};
