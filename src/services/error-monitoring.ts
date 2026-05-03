import type { ComponentType } from 'react';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as Sentry from '@sentry/react-native';

import { getPublicEnvValue, getRequestedPublicAppEnvironment } from '../config/public-env';

type MonitoringUser = {
  id?: string | null;
  email?: string | null;
} | null;

type ErrorCaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

const sentryDsn = getPublicEnvValue('EXPO_PUBLIC_SENTRY_DSN') || '';

const appEnvironment = (() => {
  return getRequestedPublicAppEnvironment() ?? (__DEV__ ? 'development' : 'production');
})();

let initialized = false;

function configureGlobalScope(): void {
  const scope = Sentry.getGlobalScope();

  scope.setTag('app.environment', appEnvironment);
  scope.setTag('expo.is_embedded_launch', Updates.isEmbeddedLaunch ? 'true' : 'false');

  if (Constants.executionEnvironment) {
    scope.setTag('expo.execution_environment', String(Constants.executionEnvironment));
  }

  if (Updates.updateId) {
    scope.setTag('expo.update_id', Updates.updateId);
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId === 'string' && projectId.trim()) {
    scope.setTag('expo.project_id', projectId);
  }
}

export function initErrorMonitoring(): void {
  if (initialized) {
    return;
  }

  initialized = true;

  Sentry.init({
    dsn: sentryDsn || undefined,
    enabled: Boolean(sentryDsn),
    environment: appEnvironment,
    sendDefaultPii: false,
    enableNativeFramesTracking: !__DEV__,
  });

  configureGlobalScope();

  if (__DEV__) {
    console.log(`[Monitoring] Sentry ${sentryDsn ? 'enabled' : 'disabled'} for ${appEnvironment}`);
  }
}

export function isErrorMonitoringEnabled(): boolean {
  return Boolean(sentryDsn);
}

export function setMonitoringUser(user: MonitoringUser): void {
  initErrorMonitoring();

  if (!user?.id && !user?.email) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id ?? undefined,
    email: user.email ?? undefined,
  });
}

export function captureException(error: unknown, context: ErrorCaptureContext = {}): string | undefined {
  initErrorMonitoring();

  return Sentry.withScope((scope) => {
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    return Sentry.captureException(error);
  });
}

export function wrapRootComponent(Component: ComponentType<any>): ComponentType<any> {
  initErrorMonitoring();
  return Sentry.wrap(Component);
}

initErrorMonitoring();