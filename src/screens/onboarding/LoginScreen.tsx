import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { StackScreenProps } from '@react-navigation/stack';
import Svg, { Path, Rect } from 'react-native-svg';

import { AnimatedBackground } from '../../components/common/AnimatedBackground';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { ApiException } from '../../services/api';
import { useFadeUp, usePressAnimation } from '../../styles/animations';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';
import type { OnboardingStackParamList } from '../../types/navigation';
import { getKeyboardBehavior, getKeyboardVerticalOffset, isIOS } from '../../utils/platform';
import { useViewTranslation } from '../../i18n';

type LoginScreenProps = StackScreenProps<OnboardingStackParamList, 'Login'>;
type ScreenMode = 'login' | 'register';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const LOGIN_GRADIENT_COLORS = ['#FFFCF6', '#FFF8EE', '#FFFFFF', '#F8F7FF'] as const;

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

const AppleIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = '#000000',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </Svg>
);

const MailIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = colors.text.secondary,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Rect x="2" y="4" width="20" height="16" rx="2" />
    <Path d="M22 6l-10 7L2 6" />
  </Svg>
);

const LockIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = colors.text.secondary,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Rect x="3" y="11" width="18" height="11" rx="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const { loginWithCredentials, registerUser, loginWithSocial, userName, language, __devBypassAuth } = useAuth();
  const { showAlert, showError } = useAppAlert();
  const { t } = useViewTranslation('onboarding');

  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });

  const [mode, setMode] = useState<ScreenMode>('login');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(route.params?.notice ?? null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const { animatedStyle: titleAnimatedStyle, fadeIn: titleFadeIn } = useFadeUp({
    duration: 400,
    delay: 100,
    distance: 20,
  });
  const { animatedStyle: subtitleAnimatedStyle, fadeIn: subtitleFadeIn } = useFadeUp({
    duration: 400,
    delay: 180,
    distance: 16,
  });
  const { animatedStyle: formAnimatedStyle, fadeIn: formFadeIn } = useFadeUp({
    duration: 400,
    delay: 260,
    distance: 18,
  });
  const { animatedStyle: footerAnimatedStyle, fadeIn: footerFadeIn } = useFadeUp({
    duration: 400,
    delay: 340,
    distance: 14,
  });
  const { animatedStyle: submitPressStyle, onPressIn: submitPressIn, onPressOut: submitPressOut } = usePressAnimation();

  useEffect(() => {
    titleFadeIn();
    subtitleFadeIn();
    formFadeIn();
    footerFadeIn();
  }, [footerFadeIn, formFadeIn, subtitleFadeIn, titleFadeIn]);

  useEffect(() => {
    if (route.params?.email) {
      setEmail(route.params.email);
    }
    if (route.params?.notice) {
      setNotice(route.params.notice);
    }
  }, [route.params?.email, route.params?.notice]);

  const headerTitle = useMemo(() => {
    if (mode === 'register') {
      return userName
        ? tx('login.title.createWithName', 'Crea tu cuenta, {{name}}', { name: userName })
        : tx('login.title.create', 'Crea tu cuenta');
    }
    return userName
      ? tx('login.title.welcomeWithName', 'Bienvenido, {{name}}', { name: userName })
      : tx('login.title.welcome', 'Bienvenido');
  }, [mode, t, userName]);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(tx('login.validation.emailRequired', 'El correo electronico es requerido.'));
      return false;
    }

    if (!EMAIL_REGEX.test(value.trim())) {
      setEmailError(tx('login.validation.emailInvalid', 'Ingresa un correo electronico valido.'));
      return false;
    }

    setEmailError(null);
    return true;
  };

  const validatePassword = (value: string, currentMode: ScreenMode): boolean => {
    if (!value) {
      setPasswordError(tx('login.validation.passwordRequired', 'La contrasena es requerida.'));
      return false;
    }

    if (currentMode === 'register' && !STRONG_PASSWORD_REGEX.test(value)) {
      setPasswordError(
        tx(
          'login.validation.strongPassword',
          'Usa al menos 8 caracteres, una mayuscula, una minuscula y un numero.',
        ),
      );
      return false;
    }

    setPasswordError(null);
    return true;
  };

  const validateConfirmPassword = (value: string, sourcePassword: string): boolean => {
    if (mode !== 'register') {
      setConfirmPasswordError(null);
      return true;
    }

    if (!value) {
      setConfirmPasswordError(
        tx('login.validation.confirmPasswordRequired', 'Confirma tu contrasena.'),
      );
      return false;
    }

    if (value !== sourcePassword) {
      setConfirmPasswordError(
        tx('login.validation.confirmPasswordMismatch', 'Las contrasenas no coinciden.'),
      );
      return false;
    }

    setConfirmPasswordError(null);
    return true;
  };

  const handleModeChange = (nextMode: ScreenMode) => {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setConfirmPasswordError(null);
    setNotice(null);
  };

  const applyApiError = (error: unknown, normalizedEmail: string) => {
    if (!(error instanceof ApiException)) {
      const fallbackMessage = tx(
        'login.alert.authFallback',
        'No fue posible completar la autenticacion. Intenta de nuevo.',
      );
      setPasswordError(fallbackMessage);
      showError(error, {
        title:
          mode === 'login'
            ? tx('login.alert.loginFailed', 'No pudimos iniciar sesion')
            : tx('login.alert.registerFailed', 'No pudimos crear tu cuenta'),
        fallbackMessage,
      });
      return;
    }

    const normalizedMessage = error.message.toLowerCase();

    if (error.details?.email?.[0]) {
      setEmailError(error.details.email[0]);
    }

    if (error.details?.password?.[0]) {
      setPasswordError(error.details.password[0]);
    }

    if (
      error.type === 'auth_error' &&
      normalizedMessage.includes('confirmar tu correo')
    ) {
      showAlert({
        title: tx('login.alert.confirmEmailTitle', 'Confirma tu correo'),
        message: tx(
          'login.alert.confirmEmailMessage',
          'Necesitamos verificar tu correo antes de iniciar sesion. Te llevaremos al siguiente paso para completar la confirmacion.',
        ),
        tone: 'info',
        actions: [
          {
            label: tx('login.alert.continue', 'Continuar'),
            onPress: () => navigation.navigate('ConfirmRegistration', { email: normalizedEmail }),
          },
        ],
      });
      return;
    }

    if (error.code === 428) {
      if (!userName?.trim()) {
        showAlert({
          title: tx('login.alert.completeProfileTitle', 'Completa tu perfil'),
          message: tx(
            'login.alert.completeProfileMessage',
            'Necesitamos tu nombre para terminar de crear tu perfil en Inmigreat.',
          ),
          tone: 'info',
          actions: [
            {
              label: tx('login.alert.continue', 'Continuar'),
              onPress: () => navigation.navigate('Name', {
                email: normalizedEmail,
                notice: tx(
                  'login.alert.completeProfileMessage',
                  'Necesitamos tu nombre para terminar de crear tu perfil en Inmigreat.',
                ),
                completePendingProvisioning: true,
              }),
            },
          ],
        });
        return;
      } else {
        setNotice(error.message);
      }
      setPasswordError(error.message);
      showError(error, { title: tx('login.alert.completeProfileTitle', 'Completa tu perfil') });
      return;
    }

    if (normalizedMessage.includes('no encontramos una cuenta')) {
      setEmailError(error.message);
    } else if (!error.details?.password?.[0]) {
      setPasswordError(error.message);
    }

    showError(error, {
      title:
        mode === 'login'
          ? tx('login.alert.loginFailed', 'No pudimos iniciar sesion')
          : tx('login.alert.registerFailed', 'No pudimos crear tu cuenta'),
      preferInlineValidation: true,
    });
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    const normalizedEmail = email.trim().toLowerCase();
    const isEmailValid = validateEmail(normalizedEmail);
    const isPasswordValid = validatePassword(password, mode);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword, password);

    if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    setIsLoading(true);
    setNotice(null);

    try {
      if (mode === 'login') {
        await loginWithCredentials({
          email: normalizedEmail,
          password,
        });
        navigation.navigate('Biometric');
        return;
      }

      const registrationName = userName?.trim() || normalizedEmail.split('@')[0];
      const result = await registerUser({
        email: normalizedEmail,
        password,
        name: registrationName,
        language,
      });

      if (result.userConfirmed) {
        await loginWithCredentials({ email: normalizedEmail, password });
        navigation.navigate('Biometric');
        return;
      }

      navigation.navigate('ConfirmRegistration', { email: normalizedEmail });
    } catch (error) {
      applyApiError(error, normalizedEmail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');

    try {
      await loginWithSocial({
        provider: 'google',
      });

      navigation.navigate('Biometric');
    } catch (error) {
      if (error instanceof ApiException && error.code === 499) {
        return;
      }

      if (error instanceof ApiException && error.code === 428) {
        const noticeMessage = tx(
          'login.alert.completeProfileMessage',
          'Necesitamos tu nombre para terminar de crear tu perfil en Inmigreat.',
        );

        if (!userName?.trim()) {
          showAlert({
            title: tx('login.alert.completeProfileTitle', 'Completa tu perfil'),
            message: noticeMessage,
            tone: 'info',
            actions: [
              {
                label: tx('login.alert.continue', 'Continuar'),
                onPress: () => navigation.navigate('Name', {
                  notice: noticeMessage,
                  completePendingProvisioning: true,
                }),
              },
            ],
          });
          return;
        }

        setNotice(error.message);
      }

      if (error instanceof ApiException) {
        setPasswordError(error.message);
      }
      showError(error, {
        title: tx('login.alert.googleFailed', 'No pudimos iniciar sesion con Google'),
      });
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');

    try {
      await loginWithSocial({
        provider: 'apple',
      });

      navigation.navigate('Biometric');
    } catch (error) {
      if (error instanceof ApiException && error.code === 499) {
        return;
      }

      if (error instanceof ApiException && error.code === 428) {
        const noticeMessage = tx(
          'login.alert.completeProfileMessage',
          'Necesitamos tu nombre para terminar de crear tu perfil en Inmigreat.',
        );

        if (!userName?.trim()) {
          showAlert({
            title: tx('login.alert.completeProfileTitle', 'Completa tu perfil'),
            message: noticeMessage,
            tone: 'info',
            actions: [
              {
                label: tx('login.alert.continue', 'Continuar'),
                onPress: () => navigation.navigate('Name', {
                  notice: noticeMessage,
                  completePendingProvisioning: true,
                }),
              },
            ],
          });
          return;
        }

        setNotice(error.message);
      }

      if (error instanceof ApiException) {
        setPasswordError(error.message);
      }
      showError(error, {
        title: tx('login.alert.appleFailed', 'No pudimos iniciar sesion con Apple'),
      });
    } finally {
      setSocialLoading(null);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword', {
      email: email.trim() ? email.trim().toLowerCase() : undefined,
    });
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const isFormValid = Boolean(
    email.trim() &&
      password &&
      (mode === 'login' || confirmPassword) &&
      !emailError &&
      !passwordError &&
      !confirmPasswordError,
  );
  const isAnyLoading = isLoading || socialLoading !== null;

  return (
    <AnimatedBackground colors={LOGIN_GRADIENT_COLORS}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={getKeyboardBehavior()}
          keyboardVerticalOffset={getKeyboardVerticalOffset()}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.content}>
              <View style={styles.header}>
                <Animated.View style={titleAnimatedStyle}>
                  <Text style={styles.title}>{headerTitle}</Text>
                </Animated.View>
                <Animated.View style={subtitleAnimatedStyle}>
                  <Text style={styles.subtitle}>
                    {mode === 'login'
                      ? tx(
                          'login.subtitle.login',
                          'Inicia sesion con tu correo para continuar con tu seguimiento de casos.',
                        )
                      : tx(
                          'login.subtitle.register',
                          'Registra tu correo y contrasena para crear tu acceso en Cognito.',
                        )}
                  </Text>
                </Animated.View>
              </View>

              <View style={styles.formSection}>
                <Animated.View style={formAnimatedStyle}>
                  <GlassCard
                    style={styles.formCard}
                    opacity={Platform.OS === 'android' ? 1 : undefined}
                    blurIntensity={Platform.OS === 'android' ? 0 : undefined}
                  >
                    <View style={styles.modeRow}>
                      <TouchableOpacity
                        style={[styles.modeChip, mode === 'login' && styles.modeChipActive]}
                        onPress={() => handleModeChange('login')}
                        disabled={isLoading}
                      >
                        <Text style={[styles.modeChipText, mode === 'login' && styles.modeChipTextActive]}>
                          {tx('login.mode.login', 'Iniciar sesion')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modeChip, mode === 'register' && styles.modeChipActive]}
                        onPress={() => handleModeChange('register')}
                        disabled={isLoading}
                      >
                        <Text style={[styles.modeChipText, mode === 'register' && styles.modeChipTextActive]}>
                          {tx('login.mode.register', 'Crear cuenta')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {notice && <Text style={styles.noticeText}>{notice}</Text>}

                    <View style={styles.inputContainer}>
                      <View style={styles.inputIconContainer}>
                        <MailIcon size={20} color={emailError ? colors.error : colors.text.secondary} />
                      </View>
                      <TextInput
                        style={[styles.textInput, emailError && styles.textInputError]}
                        placeholder={tx('login.field.emailPlaceholder', 'Correo electronico')}
                        placeholderTextColor={colors.text.tertiary}
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          if (emailError) {
                            validateEmail(text);
                          }
                        }}
                        onBlur={() => validateEmail(email)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                        editable={!isAnyLoading}
                      />
                    </View>
                    {emailError && <Text style={styles.errorText}>{emailError}</Text>}

                    <View style={[styles.inputContainer, styles.inputSpacing]}>
                      <View style={styles.inputIconContainer}>
                        <LockIcon size={20} color={passwordError ? colors.error : colors.text.secondary} />
                      </View>
                      <TextInput
                        ref={passwordInputRef}
                        style={[styles.textInput, passwordError && styles.textInputError]}
                        placeholder={
                          mode === 'login'
                            ? tx('login.field.passwordPlaceholder', 'Contrasena')
                            : tx('login.field.securePasswordPlaceholder', 'Crea una contrasena segura')
                        }
                        placeholderTextColor={colors.text.tertiary}
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (passwordError) {
                            validatePassword(text, mode);
                          }
                          if (confirmPasswordError) {
                            validateConfirmPassword(confirmPassword, text);
                          }
                        }}
                        onBlur={() => validatePassword(password, mode)}
                        secureTextEntry
                        returnKeyType={mode === 'register' ? 'next' : 'done'}
                        onSubmitEditing={() => {
                          if (mode === 'register') {
                            confirmPasswordInputRef.current?.focus();
                            return;
                          }
                          handleSubmit();
                        }}
                        editable={!isAnyLoading}
                      />
                    </View>
                    {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

                    {mode === 'register' && (
                      <>
                        <View style={[styles.inputContainer, styles.inputSpacing]}>
                          <View style={styles.inputIconContainer}>
                            <LockIcon size={20} color={confirmPasswordError ? colors.error : colors.text.secondary} />
                          </View>
                          <TextInput
                            ref={confirmPasswordInputRef}
                            style={[styles.textInput, confirmPasswordError && styles.textInputError]}
                            placeholder={tx(
                              'login.field.confirmPasswordPlaceholder',
                              'Confirma tu contrasena',
                            )}
                            placeholderTextColor={colors.text.tertiary}
                            value={confirmPassword}
                            onChangeText={(text) => {
                              setConfirmPassword(text);
                              if (confirmPasswordError) {
                                validateConfirmPassword(text, password);
                              }
                            }}
                            onBlur={() => validateConfirmPassword(confirmPassword, password)}
                            secureTextEntry
                            returnKeyType="done"
                            onSubmitEditing={handleSubmit}
                            editable={!isAnyLoading}
                          />
                        </View>
                        {confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}
                        <Text style={styles.helperText}>
                          {tx(
                            'login.helper.passwordPolicy',
                            'La contrasena debe tener mayuscula, minuscula y numero.',
                          )}
                        </Text>
                      </>
                    )}

                    <TouchableOpacity
                      activeOpacity={1}
                      onPressIn={submitPressIn}
                      onPressOut={submitPressOut}
                      onPress={handleSubmit}
                      disabled={!isFormValid || isAnyLoading}
                      style={styles.primaryButtonContainer}
                    >
                      <Animated.View style={submitPressStyle}>
                        <View
                          style={[
                            styles.primaryButton,
                            (!isFormValid || isAnyLoading) && styles.primaryButtonDisabled,
                          ]}
                        >
                          {isLoading ? (
                            <ActivityIndicator color={colors.text.inverse} size="small" />
                          ) : (
                            <Text
                              style={[
                                styles.primaryButtonText,
                                (!isFormValid || isAnyLoading) && styles.primaryButtonTextDisabled,
                              ]}
                            >
                              {mode === 'login'
                                ? tx('login.action.login', 'Entrar')
                                : tx('login.action.register', 'Continuar con registro')}
                            </Text>
                          )}
                        </View>
                      </Animated.View>
                    </TouchableOpacity>

                    {mode === 'register' && (
                      <Text style={styles.socialNotice}>
                        {tx(
                          'login.helper.socialNotice',
                          'Google y Apple ya estan disponibles desde el modo de inicio de sesion.',
                        )}
                      </Text>
                    )}
                  </GlassCard>
                </Animated.View>

                {mode === 'login' && (
                  <>
                    <View style={styles.dividerContainer}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>
                        {tx('login.helper.divider', 'o continua con')}
                      </Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialButtonsContainer}>
                      <TouchableOpacity
                        activeOpacity={1}
                        onPress={handleGoogleSignIn}
                        disabled={isAnyLoading}
                        style={styles.socialButtonWrapper}
                      >
                        <View style={[styles.socialButton, isAnyLoading && styles.socialButtonDisabled]}>
                          {socialLoading === 'google' ? (
                            <ActivityIndicator color={colors.text.primary} size="small" />
                          ) : (
                            <>
                              <GoogleIcon size={20} />
                              <Text style={styles.socialButtonText}>Google</Text>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>

                      {isIOS && (
                        <TouchableOpacity
                          activeOpacity={1}
                          onPress={handleAppleSignIn}
                          disabled={isAnyLoading}
                          style={styles.socialButtonWrapper}
                        >
                          <View style={[styles.socialButton, styles.appleButton, isAnyLoading && styles.socialButtonDisabled]}>
                            {socialLoading === 'apple' ? (
                              <ActivityIndicator color={colors.text.inverse} size="small" />
                            ) : (
                              <>
                                <AppleIcon size={20} color={colors.text.inverse} />
                                <Text style={[styles.socialButtonText, styles.appleButtonText]}>Apple</Text>
                              </>
                            )}
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={handleForgotPassword}
                      disabled={isAnyLoading}
                      style={styles.forgotPasswordContainer}
                    >
                      <Text style={[styles.forgotPasswordText, isAnyLoading && styles.forgotPasswordTextDisabled]}>
                        {tx('login.helper.forgotPassword', 'Olvidaste tu contrasena?')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <Animated.View style={footerAnimatedStyle}>
                  <TouchableOpacity
                    onPress={() => handleModeChange(mode === 'login' ? 'register' : 'login')}
                    disabled={isAnyLoading}
                  >
                    <Text style={styles.footerText}>
                      {mode === 'login'
                        ? tx('login.helper.footerCreate', 'Todavia no tienes cuenta? Crear cuenta')
                        : tx('login.helper.footerLogin', 'Ya tienes cuenta? Iniciar sesion')}
                    </Text>
                  </TouchableOpacity>

                  {__devBypassAuth ? (
                    <TouchableOpacity
                      onPress={__devBypassAuth}
                      style={styles.devLoginButton}
                      accessibilityRole="button"
                      accessibilityLabel="Demo login — entrar sin password"
                    >
                      <Text style={styles.devLoginLabel}>Demo Login (sin password) →</Text>
                    </TouchableOpacity>
                  ) : null}
                </Animated.View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.md * typography.lineHeight.normal,
    paddingHorizontal: spacing.md,
  },
  formSection: {
    width: '100%',
  },
  formCard: {
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
    borderColor: colors.border.light,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modeChip: {
    flex: 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.medium,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  modeChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  modeChipText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
  },
  modeChipTextActive: {
    color: colors.text.inverse,
  },
  noticeText: {
    color: colors.success,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  inputSpacing: {
    marginTop: spacing.md,
  },
  inputIconContainer: {
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
  },
  textInputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  helperText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  primaryButtonContainer: {
    marginTop: spacing.lg,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: colors.accent,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.border.medium,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bold,
  },
  primaryButtonTextDisabled: {
    color: colors.text.tertiary,
  },
  linkText: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    color: colors.text.link,
    textAlign: 'center',
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
  },
  socialNotice: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.md,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  socialButtonWrapper: {
    flex: 1,
    maxWidth: 160,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: spacing.sm,
    minHeight: 48,
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  socialButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  appleButtonText: {
    color: colors.text.inverse,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  forgotPasswordText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.link,
  },
  forgotPasswordTextDisabled: {
    color: colors.text.tertiary,
  },
  footerText: {
    textAlign: 'center',
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    marginTop: spacing.xl,
  },
  devLoginButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  devLoginLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
    letterSpacing: 0.4,
  },
});

export default LoginScreen;