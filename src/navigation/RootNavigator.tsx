/**
 * RootNavigator - Root navigation container with auth-based navigation and state persistence
 * Validates: Requirements 2.5, 2.6, 2.7, 18.7
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import {
  NavigationContainer,
  NavigationState,
  LinkingOptions,
  getStateFromPath as getNavigationStateFromPath,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as ExpoLinking from 'expo-linking';

import { AnimatedBackground } from '../components/common/AnimatedBackground';
import { BrandedLoadingState } from '../components/common/BrandedLoadingState';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import {
  saveNavigationState,
  getNavigationState,
  type NavigationState as StoredNavigationState,
} from '../services/storage';
import { setActiveNotificationContext } from '../services/notifications';
import { useViewTranslation } from '../i18n';
import { OnboardingStack } from './OnboardingStack';
import { MainTabs } from './MainTabs';

/**
 * Deep linking configuration
 * Validates: Requirement 18.7
 * 
 * Supported URL schemes:
 * - inmigreat:// (custom scheme)
 * - https://inmigreat.com (universal links)
 * - https://www.inmigreat.com (universal links)
 * 
 * Supported paths:
 * - /chat - Opens Chat tab
 * - /cases - Opens Cases tab
 * - /cases/:caseId - Opens specific case detail
 * - /community - Opens Community tab
 * - /community/group/:groupId - Opens specific group
 * - /community/post/:postId - Opens specific post thread
 * - /resources - Opens Resources tab
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    ExpoLinking.createURL('/'),
    'inmigreat://',
    'https://inmigreat.com',
    'https://www.inmigreat.com',
  ],
  config: {
    screens: {
      Main: {
        screens: {
          Chat: 'chat',
          Cases: 'cases',
          Community: {
            screens: {
              GroupsList: 'community',
              GroupDetail: 'community/group/:groupId',
              ThreadView: 'community/post/:postId',
              Compose: 'community/compose/:groupId',
            },
          },
          Resources: 'resources',
        },
      },
      Onboarding: {
        screens: {
          Splash: '',
          Language: 'language',
          Name: 'name',
          Login: 'login',
          ForgotPassword: 'forgot-password',
          Biometric: 'biometric',
        },
      },
    },
  },
  getStateFromPath(path, options) {
    const hasOAuthParams = /(?:^|[?&])(code|state|error|error_description)=/i.test(path);
    const normalizedPath = path.split('?')[0]?.replace(/^\/+/, '').replace(/\/+$/, '');

    if (normalizedPath === 'auth/callback' || (!normalizedPath && hasOAuthParams)) {
      return undefined;
    }

    return getNavigationStateFromPath(path, options);
  },
  // Handle incoming URLs
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }
    // Check if app was opened from Expo linking
    const expoUrl = await ExpoLinking.getInitialURL();
    return expoUrl;
  },
  // Subscribe to incoming links
  subscribe(listener) {
    // Listen to incoming links from deep linking
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    return () => {
      linkingSubscription.remove();
    };
  },
};

const Stack = createStackNavigator<RootStackParamList>();

function getDeepestRouteContext(state: NavigationState | undefined): {
  routeName: string | null;
  routeParams?: Record<string, unknown>;
} {
  if (!state || state.routes.length === 0) {
    return { routeName: null };
  }

  let currentRoute: any = state.routes[state.index ?? 0];

  while (currentRoute?.state?.routes?.length) {
    currentRoute = currentRoute.state.routes[currentRoute.state.index ?? 0];
  }

  return {
    routeName: typeof currentRoute?.name === 'string' ? currentRoute.name : null,
    routeParams:
      currentRoute?.params && typeof currentRoute.params === 'object'
        ? (currentRoute.params as Record<string, unknown>)
        : undefined,
  };
}

/**
 * Loading screen shown while checking auth state and restoring navigation
 */
const LoadingScreen: React.FC = () => {
  const { t, isReady } = useViewTranslation('root-navigation');

  return (
    <AnimatedBackground>
      <View style={styles.loadingContainer}>
        <BrandedLoadingState
          title={isReady ? t('loading.title') : 'Preparando tu espacio'}
          subtitle={
            isReady
              ? t('loading.subtitle')
              : 'Restaurando tu sesion y organizando todo antes de entrar.'
          }
          variant="cases"
          eyebrow="Inmigreat"
          style={styles.loadingState}
        />
      </View>
    </AnimatedBackground>
  );
};

/**
 * RootNavigator Component
 * 
 * Manages the root navigation structure with:
 * - Auth-based navigation (Onboarding vs Main)
 * - Navigation state persistence with AsyncStorage
 * 
 * When not authenticated: Shows OnboardingStack
 * When authenticated: Shows MainTabs
 */
export const RootNavigator: React.FC = () => {
  const { authState, isLoading: isAuthLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState<StoredNavigationState | undefined>();
  const navigationRef = useRef<any>(null);

  /**
   * Restore navigation state from AsyncStorage on app start
   * Validates: Requirement 2.7
   */
  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedState = await getNavigationState();
        if (savedState) {
          setInitialState(savedState);
        }
      } catch (error) {
        console.error('[RootNavigator] Error restoring navigation state:', error);
      } finally {
        setIsReady(true);
      }
    };

    // Only restore state if auth check is complete
    if (!isAuthLoading) {
      restoreState();
    }
  }, [isAuthLoading]);

  /**
   * Save navigation state to AsyncStorage on state change
   * Validates: Requirement 2.7
   */
  const onStateChange = useCallback(async (state: NavigationState | undefined) => {
    if (state) {
      setActiveNotificationContext(getDeepestRouteContext(state));

      try {
        await saveNavigationState(state as StoredNavigationState);
      } catch (error) {
        console.error('[RootNavigator] Error saving navigation state:', error);
      }
    }
  }, []);

  // Show loading screen while checking auth and restoring navigation state
  if (isAuthLoading || !isReady) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      initialState={initialState}
      onStateChange={onStateChange}
      onReady={() => {
        setActiveNotificationContext(getDeepestRouteContext(navigationRef.current?.getRootState?.()));
      }}
      linking={linking}
      fallback={<LoadingScreen />}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' },
          animation: 'default',
        }}
      >
        {authState.isAuthenticated ? (
          // User is authenticated - show main app
          // Validates: Requirement 2.6
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{
              animationTypeForReplace: 'push',
            }}
          />
        ) : (
          // User is not authenticated - show onboarding
          // Validates: Requirement 2.5
          <Stack.Screen
            name="Onboarding"
            component={OnboardingStack}
            options={{
              animationTypeForReplace: 'pop',
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingState: {
    width: '100%',
  },
});

export default RootNavigator;
