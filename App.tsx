/**
 * App.tsx - Main entry point for InMiGreat React Native application
 * 
 * Initializes the app with:
 * - Context providers (Auth)
 * - Service initialization (storage, notifications, sync)
 * - App state change handling (background/foreground)
 * - Navigation container
 * 
 * Validates: Requirements 1.1
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, StyleSheet, LogBox, Linking } from 'react-native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Context providers
import { AuthProvider } from './src/context/AuthContext';
import { AppAlertProvider } from './src/context/AppAlertContext';
import { AppI18nProvider } from './src/i18n';

// Navigation
import { RootNavigator } from './src/navigation/RootNavigator';

// Services
import { initializeSyncService, cleanupSyncService, syncPendingActions, refreshData } from './src/services/sync';
import {
  requestPermissions,
  getExpoPushToken,
  registerPushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponse,
} from './src/services/notifications';
import { captureException } from './src/services/error-monitoring';
import type { PushNotification } from './src/types/user';

// Ignore specific warnings that are known issues with dependencies
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'InteractionManager has been deprecated',
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

/**
 * Initialize app services on startup
 * - Sync service for offline support
 * - Push notification registration
 */
async function initializeServices(): Promise<void> {
  try {
    // Initialize sync service for offline support
    await initializeSyncService();
    console.log('[App] Sync service initialized');

    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.log('[Notifications] Expo Go detected, skipping remote push setup');
      return;
    }

    // Request notification permissions and register push token
    const permissionResult = await requestPermissions();
    if (permissionResult.granted) {
      const tokenResult = await getExpoPushToken();
      if (tokenResult.success && tokenResult.token) {
        await registerPushToken(tokenResult.token);
        console.log('[App] Push notifications registered');
      }
    }
  } catch (error) {
    captureException(error, {
      tags: {
        scope: 'app.initialize_services',
      },
    });
    console.error('[App] Error initializing services:', error);
  }
}

/**
 * Main App component
 * Wraps the app with necessary providers and handles lifecycle events
 */
export default function App(): React.ReactElement {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastHandledNotificationIdRef = useRef<string | null>(null);
  const [fontsLoaded, fontLoadError] = useFonts({
    NunitoLight: require('./assets/fonts/Nunito-Light.ttf'),
    NunitoRegular: require('./assets/fonts/Nunito-Regular.ttf'),
    NunitoMedium: require('./assets/fonts/Nunito-Medium.ttf'),
    NunitoSemiBold: require('./assets/fonts/Nunito-SemiBold.ttf'),
    NunitoBold: require('./assets/fonts/Nunito-Bold.ttf'),
    NunitoExtraBold: require('./assets/fonts/Nunito-ExtraBold.ttf'),
    UnifrakturCook: require('./assets/fonts/UnifrakturCook-Bold.ttf'),
    SquarePegRegular: require('./assets/fonts/SquarePeg-Regular.ttf'),
  });

  useEffect(() => {
    if (!fontLoadError) {
      return;
    }

    captureException(fontLoadError, {
      tags: {
        scope: 'app.fonts',
      },
    });
    console.error('[App] Error loading fonts:', fontLoadError);
  }, [fontLoadError]);

  const handleNotificationNavigation = useCallback(async (notification: PushNotification) => {
    const url = typeof notification.data?.url === 'string' ? notification.data.url : null;

    if (!url || lastHandledNotificationIdRef.current === notification.id) {
      return;
    }

    lastHandledNotificationIdRef.current = notification.id;

    try {
      await Linking.openURL(url);
    } catch (error) {
      captureException(error, {
        tags: {
          scope: 'app.notification_navigation',
        },
        extra: {
          url,
        },
      });
      console.error('[App] Error opening notification URL:', error);
    }
  }, []);

  /**
   * Handle app state changes (background/foreground)
   * - When app comes to foreground: sync pending actions and refresh data
   * - When app goes to background: no action needed (sync service handles this)
   */
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    // App came to foreground from background/inactive
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('[App] App came to foreground, syncing data...');
      try {
        // Sync any pending actions that were queued while offline
        await syncPendingActions();
        // Refresh data from server
        await refreshData();
      } catch (error) {
        captureException(error, {
          tags: {
            scope: 'app.foreground_sync',
          },
        });
        console.error('[App] Error syncing on foreground:', error);
      }
    }

    // App going to background
    if (
      appState.current === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
      console.log('[App] App going to background');
      // Could save any unsaved state here if needed
    }

    appState.current = nextAppState;
  }, []);

  /**
   * Initialize services and set up listeners on mount
   */
  useEffect(() => {
    // Initialize services
    initializeServices();

    // Set up app state change listener
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up notification listeners
    const notificationReceivedSubscription = addNotificationReceivedListener((notification) => {
      console.log('[App] Notification received:', notification.title);
      // Foreground delivery is currently surfaced by the native notification banner.
    });

    const notificationResponseSubscription = addNotificationResponseListener((notification, actionIdentifier) => {
      console.log('[App] Notification tapped:', notification.title, actionIdentifier);
      void handleNotificationNavigation(notification);
    });

    // Check if app was opened from a notification
    getLastNotificationResponse().then((notification) => {
      if (notification) {
        console.log('[App] App opened from notification:', notification.title);
        void handleNotificationNavigation(notification);
      }
    });

    // Cleanup on unmount
    return () => {
      appStateSubscription.remove();
      notificationReceivedSubscription.remove();
      notificationResponseSubscription.remove();
      cleanupSyncService();
    };
  }, [handleAppStateChange, handleNotificationNavigation]);

  if (!fontsLoaded && !fontLoadError) {
    return <GestureHandlerRootView style={styles.container} />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppI18nProvider>
            <AppAlertProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </AppAlertProvider>
          </AppI18nProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
