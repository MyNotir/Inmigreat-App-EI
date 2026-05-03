/**
 * AuthContext - Unified session, auth, and user state management.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import type { User, AuthState, Language, NotificationSettings } from '../types/user';
import {
  getBiometricEnabled,
  setBiometricEnabled,
  clearAll,
  getLanguage,
  setLanguage as saveLanguage,
  setUserName as saveUserName,
  getUserName,
  removeItem,
  STORAGE_KEYS,
} from '../services/storage';
import {
  authService,
  type LoginRequest,
  type RegisterRequest,
  type RegisterResponse,
  type ConfirmRegistrationRequest,
  type SocialAuthRequest,
  type PasswordResetConfirmationRequest,
} from '../services/auth';
import { ApiException, clearAuthToken, getResolvedAuthToken, setAuthToken } from '../services/api';
import { getAccessToken as getSessionAccessToken } from '../services/session';
import { setMonitoringUser } from '../services/error-monitoring';
import { translate } from '../i18n/config';

interface SubscriptionStatus {
  isPro: boolean;
  subscriptionExpiry?: string;
}

interface AuthContextValue {
  authState: AuthState;
  isLoading: boolean;
  currentUser: User | null;
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  notificationSettings: NotificationSettings;
  subscriptionStatus: SubscriptionStatus;
  userName: string | null;
  setUserName: (name: string) => Promise<void>;
  loginWithCredentials: (credentials: LoginRequest) => Promise<void>;
  completePendingProvisioning: (name: string) => Promise<void>;
  registerUser: (data: RegisterRequest) => Promise<RegisterResponse>;
  confirmRegistration: (data: ConfirmRegistrationRequest) => Promise<void>;
  resendRegistrationCode: (email: string) => Promise<void>;
  loginWithSocial: (data: SocialAuthRequest) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (data: PasswordResetConfirmationRequest) => Promise<void>;
  setBiometricAuth: (enabled: boolean) => Promise<void>;
  updateProfile: (input: {
    name?: string;
    language?: Language;
    biometricEnabled?: boolean;
  }) => Promise<void>;
  updateNotificationPreferences: (settings: Partial<NotificationSettings>) => Promise<void>;
  isBiometricEnabled: boolean;
  /**
   * Dev-only: bypass real Cognito auth and drop the user straight into Main.
   * Available only when __DEV__ is true. Used by the Splash 'Preview app'
   * button when no real backend is configured (placeholder .env values).
   */
  __devBypassAuth?: () => void;
}

const DEFAULT_LANGUAGE: Language = 'ES';

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  caseUpdates: true,
  community: true,
  proAlerts: true,
  news: true,
};

const DEFAULT_SUBSCRIPTION_STATUS: SubscriptionStatus = {
  isPro: false,
  subscriptionExpiry: undefined,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function shouldLogAuthFlowError(error: unknown): boolean {
  return !(error instanceof ApiException && error.code === 428);
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [draftLanguage, setDraftLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [draftUserName, setDraftUserNameState] = useState<string | null>(null);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);

  useEffect(() => {
    setMonitoringUser(
      currentUser
        ? {
            id: currentUser.id,
            email: currentUser.email,
          }
        : null,
    );
  }, [currentUser]);

  const loadStoredUserDrafts = useCallback(async (): Promise<void> => {
    try {
      const [savedLanguage, savedUserName] = await Promise.all([
        getLanguage(),
        getUserName(),
      ]);

      if (savedLanguage) {
        setDraftLanguageState(savedLanguage);
      }

      if (savedUserName) {
        setDraftUserNameState(savedUserName);
      }
    } catch (error) {
      console.error('[Auth] Error loading stored user drafts:', error);
    }
  }, []);

  const setLanguage = useCallback(async (newLanguage: Language): Promise<void> => {
    try {
      await saveLanguage(newLanguage);
      setDraftLanguageState(newLanguage);
      setCurrentUserState((previousUser) => (
        previousUser
          ? {
              ...previousUser,
              language: newLanguage,
            }
          : previousUser
      ));
    } catch (error) {
      console.error('[Auth] Error setting language:', error);
      throw error;
    }
  }, []);

  const setUserName = useCallback(async (name: string): Promise<void> => {
    try {
      const normalizedName = name.trim();

      if (currentUser) {
        setCurrentUserState({
          ...currentUser,
          name: normalizedName,
        });
        return;
      }

      await saveUserName(normalizedName);
      setDraftUserNameState(normalizedName);
    } catch (error) {
      console.error('[Auth] Error setting user name:', error);
      throw error;
    }
  }, [currentUser]);

  const setCurrentUser = useCallback(async (user: User | null): Promise<void> => {
    if (!user) {
      setCurrentUserState(null);
      return;
    }

    const normalizedUser: User = {
      ...user,
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...user.notificationSettings,
      },
    };

    setCurrentUserState(normalizedUser);
    setDraftLanguageState(normalizedUser.language);
    setDraftUserNameState(null);

    await Promise.all([
      saveLanguage(normalizedUser.language),
      removeItem(STORAGE_KEYS.USER_NAME).catch(() => {}),
      removeItem(STORAGE_KEYS.NOTIFICATION_SETTINGS).catch(() => {}),
    ]);
  }, []);

  const clearUserState = useCallback(async (
    options?: { preserveLanguage?: boolean },
  ): Promise<void> => {
    const preserveLanguage = options?.preserveLanguage ?? false;

    setCurrentUserState(null);
    setDraftUserNameState(null);

    if (!preserveLanguage) {
      setDraftLanguageState(DEFAULT_LANGUAGE);
    }

    await Promise.all([
      removeItem(STORAGE_KEYS.USER_NAME).catch(() => {}),
      removeItem(STORAGE_KEYS.NOTIFICATION_SETTINGS).catch(() => {}),
      preserveLanguage ? Promise.resolve() : removeItem(STORAGE_KEYS.LANGUAGE).catch(() => {}),
    ]);
  }, []);

  const resetPreferences = useCallback(async (): Promise<void> => {
    await clearUserState();
  }, [clearUserState]);

  const language = currentUser?.language ?? draftLanguage;
  const notificationSettings = currentUser?.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS;
  const subscriptionStatus = currentUser
    ? {
        isPro: currentUser.isPro,
        subscriptionExpiry: currentUser.subscriptionExpiry,
      }
    : DEFAULT_SUBSCRIPTION_STATUS;
  const userName = currentUser?.name ?? draftUserName;

  const resolveSessionToken = useCallback(async (): Promise<string | null> => {
    return getResolvedAuthToken();
  }, []);

  const commitAuthenticatedState = useCallback(async (user: User, token: string): Promise<void> => {
    setAuthToken(token);
    await setCurrentUser(user);
    setAuthTokenState(token);
    setIsAuthenticated(true);
  }, [setCurrentUser]);

  const checkBiometricAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return false;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return isEnrolled;
    } catch (error) {
      console.error('[Auth] Error checking biometric availability:', error);
      return false;
    }
  }, []);

  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const isAvailable = await checkBiometricAvailability();
      if (!isAvailable) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: translate('biometric.promptMessage', { ns: 'auth' }),
        fallbackLabel: translate('biometric.fallbackLabel', { ns: 'auth' }),
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('[Auth] Biometric authentication error:', error);
      return false;
    }
  }, [checkBiometricAvailability]);

  const setBiometricAuth = useCallback(async (enabled: boolean): Promise<void> => {
    try {
      if (isAuthenticated) {
        const sessionToken = await resolveSessionToken();
        const updatedUser = await authService.updateProfile({ biometricEnabled: enabled });

        if (sessionToken) {
          await commitAuthenticatedState(updatedUser, sessionToken);
        }
      }

      await setBiometricEnabled(enabled);
      setIsBiometricEnabled(enabled);
    } catch (error) {
      console.error('[Auth] Error setting biometric auth:', error);
      throw error;
    }
  }, [commitAuthenticatedState, isAuthenticated, resolveSessionToken]);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      authService.setupAuthFailureHandler();
      await loadStoredUserDrafts();

      const hadPersistedSession = Boolean(await getSessionAccessToken());
      const user = await authService.initializeAuth();
      const biometricEnabled = await getBiometricEnabled();

      setIsBiometricEnabled(biometricEnabled ?? false);

      if (!user) {
        clearAuthToken();
        setAuthTokenState(null);
        setIsAuthenticated(false);

        if (hadPersistedSession) {
          await clearUserState({ preserveLanguage: true });
        }

        return false;
      }

      if (biometricEnabled) {
        const biometricSuccess = await authenticateWithBiometric();
        if (!biometricSuccess) {
          clearAuthToken();
          setAuthTokenState(null);
          setIsAuthenticated(false);
          await clearUserState({ preserveLanguage: true });
          return false;
        }
      }

      const sessionToken = await getResolvedAuthToken();

      if (!sessionToken) {
        clearAuthToken();
        setAuthTokenState(null);
        setIsAuthenticated(false);
        await clearUserState({ preserveLanguage: true });
        return false;
      }

      await commitAuthenticatedState(user, sessionToken);
      return true;
    } catch (error) {
      console.error('[Auth] Error checking auth:', error);
      clearAuthToken();
      setAuthTokenState(null);
      setIsAuthenticated(false);
      await clearUserState({ preserveLanguage: true });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authenticateWithBiometric, clearUserState, commitAuthenticatedState, loadStoredUserDrafts]);

  const login = useCallback(async (user: User, token: string): Promise<void> => {
    try {
      await commitAuthenticatedState(user, token);
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    }
  }, [commitAuthenticatedState]);

  const updateProfile = useCallback(async (input: {
    name?: string;
    language?: Language;
    biometricEnabled?: boolean;
  }): Promise<void> => {
    const updatedUser = await authService.updateProfile(input);
    const sessionToken = await resolveSessionToken();

    if (!sessionToken) {
      throw new ApiException({
        type: 'auth_error',
        code: 401,
        message: 'No hay una sesión activa para actualizar el perfil.',
        requestId: `auth_${Date.now()}`,
      });
    }

    await commitAuthenticatedState(updatedUser, sessionToken);
  }, [commitAuthenticatedState, resolveSessionToken]);

  const updateNotificationPreferences = useCallback(async (
    settings: Partial<NotificationSettings>,
  ): Promise<void> => {
    const updatedUser = await authService.updateNotificationPreferences(settings);
    const sessionToken = await resolveSessionToken();

    if (!sessionToken) {
      throw new ApiException({
        type: 'auth_error',
        code: 401,
        message: 'No hay una sesión activa para actualizar notificaciones.',
        requestId: `auth_${Date.now()}`,
      });
    }

    await commitAuthenticatedState(updatedUser, sessionToken);
  }, [commitAuthenticatedState, resolveSessionToken]);

  const loginWithCredentials = useCallback(async (credentials: LoginRequest): Promise<void> => {
    try {
      const response = await authService.login(credentials, {
        name: userName ?? undefined,
        language,
      });
      await commitAuthenticatedState(response.user, response.accessToken);
    } catch (error) {
      if (shouldLogAuthFlowError(error)) {
        console.error('[Auth] Login with credentials error:', error);
      }
      throw error;
    }
  }, [commitAuthenticatedState, language, userName]);

  const completePendingProvisioning = useCallback(async (name: string): Promise<void> => {
    try {
      const response = await authService.completePendingProvisioning({
        name,
        language,
      });
      await commitAuthenticatedState(response.user, response.accessToken);
    } catch (error) {
      console.error('[Auth] Complete pending provisioning error:', error);
      throw error;
    }
  }, [commitAuthenticatedState, language]);

  const registerUser = useCallback(async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
      return await authService.register(data);
    } catch (error) {
      console.error('[Auth] Register error:', error);
      throw error;
    }
  }, []);

  const confirmRegistration = useCallback(async (data: ConfirmRegistrationRequest): Promise<void> => {
    try {
      const response = await authService.confirmRegistration(data);
      await commitAuthenticatedState(response.user, response.accessToken);
    } catch (error) {
      console.error('[Auth] Confirm registration error:', error);
      throw error;
    }
  }, [commitAuthenticatedState]);

  const resendRegistrationCode = useCallback(async (email: string): Promise<void> => {
    try {
      await authService.resendRegistrationCode(email);
    } catch (error) {
      console.error('[Auth] Resend registration code error:', error);
      throw error;
    }
  }, []);

  const loginWithSocial = useCallback(async (data: SocialAuthRequest): Promise<void> => {
    try {
      const response = await authService.socialLogin({
        ...data,
        name: data.name ?? userName ?? undefined,
        language: data.language ?? language,
      });
      await commitAuthenticatedState(response.user, response.accessToken);
    } catch (error) {
      console.error('[Auth] Social login error:', error);
      throw error;
    }
  }, [commitAuthenticatedState, language, userName]);

  const requestPasswordReset = useCallback(async (email: string): Promise<void> => {
    try {
      await authService.requestPasswordReset(email);
    } catch (error) {
      console.error('[Auth] Password reset request error:', error);
      throw error;
    }
  }, []);

  const confirmPasswordReset = useCallback(async (data: PasswordResetConfirmationRequest): Promise<void> => {
    try {
      await authService.confirmPasswordReset(data);
    } catch (error) {
      console.error('[Auth] Password reset confirmation error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
      await resetPreferences();
      setAuthTokenState(null);
      setIsAuthenticated(false);
      setIsBiometricEnabled(false);
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      clearAuthToken();
      await clearAll();
      await resetPreferences();
      setAuthTokenState(null);
      setIsAuthenticated(false);
      setIsBiometricEnabled(false);
      throw error;
    }
  }, [resetPreferences]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user, nextIsAuthenticated) => {
      void (async () => {
        if (!nextIsAuthenticated || !user) {
          clearAuthToken();
          setAuthTokenState(null);
          setIsAuthenticated(false);
          await clearUserState({ preserveLanguage: true });
          return;
        }

        const sessionToken = await getResolvedAuthToken();

        if (!sessionToken) {
          clearAuthToken();
          setAuthTokenState(null);
          setIsAuthenticated(false);
          await clearUserState({ preserveLanguage: true });
          return;
        }

        setAuthToken(sessionToken);
        await setCurrentUser(user);
        setAuthTokenState(sessionToken);
        setIsAuthenticated(true);
      })();
    });

    return unsubscribe;
  }, [clearUserState, setCurrentUser]);

  const authState = useMemo<AuthState>(
    () => ({
      isAuthenticated,
      user: currentUser,
      token: authToken,
    }),
    [authToken, currentUser, isAuthenticated],
  );

  const __devBypassAuth = useCallback(() => {
    if (!__DEV__) return;
    const fakeUser: User = {
      id: 'dev-user-001',
      name: draftUserName ?? 'Demo',
      email: 'demo@inmigreat.local',
      language: draftLanguage,
      isPro: true,
      biometricEnabled: false,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
    };
    setCurrentUserState(fakeUser);
    setAuthTokenState('dev-bypass-token');
    setIsAuthenticated(true);
    setIsLoading(false);
  }, [draftLanguage, draftUserName]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      authState,
      isLoading,
      currentUser,
      language,
      setLanguage,
      notificationSettings,
      subscriptionStatus,
      userName,
      setUserName,
      loginWithCredentials,
      completePendingProvisioning,
      registerUser,
      confirmRegistration,
      resendRegistrationCode,
      loginWithSocial,
      logout,
      requestPasswordReset,
      confirmPasswordReset,
      setBiometricAuth,
      updateProfile,
      updateNotificationPreferences,
      isBiometricEnabled,
      __devBypassAuth: __DEV__ ? __devBypassAuth : undefined,
    }),
    [
      authState,
      isLoading,
      currentUser,
      language,
      setLanguage,
      notificationSettings,
      subscriptionStatus,
      userName,
      setUserName,
      loginWithCredentials,
      completePendingProvisioning,
      registerUser,
      confirmRegistration,
      resendRegistrationCode,
      loginWithSocial,
      logout,
      requestPasswordReset,
      confirmPasswordReset,
      setBiometricAuth,
      updateProfile,
      updateNotificationPreferences,
      isBiometricEnabled,
      __devBypassAuth,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { AuthContextValue, SubscriptionStatus };