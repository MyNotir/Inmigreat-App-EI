import Constants from 'expo-constants';

export type PublicAppEnvironment = 'development' | 'production';

function readTrimmedValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getEmbeddedPublicEnvSources(): Array<Record<string, unknown> | undefined> {
  return [
    Constants.expoConfig?.extra?.publicRuntimeEnv as Record<string, unknown> | undefined,
    (Constants as any).manifest?.extra?.publicRuntimeEnv as Record<string, unknown> | undefined,
    (Constants as any).manifest2?.extra?.publicRuntimeEnv as Record<string, unknown> | undefined,
  ];
}

export function getPublicEnvValue(name: string, aliases: string[] = []): string | undefined {
  const candidates = [name, ...aliases];

  for (const candidate of candidates) {
    const processValue = readTrimmedValue(process.env[candidate]);
    if (processValue) {
      return processValue;
    }

    for (const source of getEmbeddedPublicEnvSources()) {
      const embeddedValue = readTrimmedValue(source?.[candidate]);
      if (embeddedValue) {
        return embeddedValue;
      }
    }
  }

  return undefined;
}

export function getRequestedPublicAppEnvironment(): PublicAppEnvironment | null {
  const value = getPublicEnvValue('EXPO_PUBLIC_APP_ENV')?.toLowerCase();

  if (value === 'development' || value === 'production') {
    return value;
  }

  return null;
}