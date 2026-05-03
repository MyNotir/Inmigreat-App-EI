import React, { useEffect, useState } from 'react';
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

import { AnimatedBackground, ONBOARDING_GRADIENT_COLORS } from '../../components/common/AnimatedBackground';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { ApiException } from '../../services/api';
import { useFadeUp, usePressAnimation } from '../../styles/animations';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';
import type { OnboardingStackParamList } from '../../types/navigation';
import { useViewTranslation } from '../../i18n';

type ConfirmRegistrationScreenProps = StackScreenProps<OnboardingStackParamList, 'ConfirmRegistration'>;

const BackArrowIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = colors.text.primary,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M19 12H5" />
    <Path d="M12 19l-7-7 7-7" />
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

export const ConfirmRegistrationScreen: React.FC<ConfirmRegistrationScreenProps> = ({ navigation, route }) => {
  const { email } = route.params;
  const { t } = useViewTranslation('onboarding');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { confirmRegistration, resendRegistrationCode, userName, language } = useAuth();
  const { showAlert, showError } = useAppAlert();

  const { animatedStyle: headerAnimatedStyle, fadeIn: headerFadeIn } = useFadeUp({
    duration: 400,
    delay: 100,
    distance: 18,
  });
  const { animatedStyle: formAnimatedStyle, fadeIn: formFadeIn } = useFadeUp({
    duration: 400,
    delay: 200,
    distance: 18,
  });
  const { animatedStyle: buttonPressStyle, onPressIn, onPressOut } = usePressAnimation();

  useEffect(() => {
    headerFadeIn();
    formFadeIn();
  }, [formFadeIn, headerFadeIn]);

  const validateCode = (value: string): boolean => {
    if (!value.trim()) {
      setCodeError(
        tx('confirmRegistration.validation.codeRequired', 'Ingresa el codigo que llego por correo.'),
      );
      return false;
    }

    if (value.trim().length < 6) {
      setCodeError(
        tx('confirmRegistration.validation.codeLength', 'El codigo debe tener 6 caracteres.'),
      );
      return false;
    }

    setCodeError(null);
    return true;
  };

  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError(
        tx(
          'confirmRegistration.validation.passwordRequired',
          'Ingresa la contrasena que registraste.',
        ),
      );
      return false;
    }

    setPasswordError(null);
    return true;
  };

  const handleConfirm = async () => {
    Keyboard.dismiss();

    const isCodeValid = validateCode(code);
    const isPasswordValid = validatePassword(password);

    if (!isCodeValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);
    setInfoMessage(null);

    try {
      await confirmRegistration({
        email,
        code: code.trim(),
        password,
        name: userName ?? undefined,
        language,
      });
      navigation.navigate('Biometric');
    } catch (error) {
      if (error instanceof ApiException) {
        if (error.details?.code?.[0]) {
          setCodeError(error.details.code[0]);
        } else if (error.details?.password?.[0]) {
          setPasswordError(error.details.password[0]);
        } else if (error.type === 'network_error') {
          setInfoMessage(
            tx(
              'confirmRegistration.validation.offline',
              'Sin conexion. Verifica tu internet e intenta de nuevo.',
            ),
          );
          showError(error, { title: tx('confirmRegistration.alert.networkTitle', 'Sin conexion') });
        } else {
          setPasswordError(error.message);
          showError(error, {
            title: tx('confirmRegistration.alert.confirmFailed', 'No pudimos confirmar tu cuenta'),
            preferInlineValidation: true,
          });
        }
      } else {
        setInfoMessage(
          tx(
            'confirmRegistration.validation.genericConfirmFailure',
            'No fue posible confirmar tu cuenta. Intenta de nuevo.',
          ),
        );
        showError(error, {
          title: tx('confirmRegistration.alert.confirmFailed', 'No pudimos confirmar tu cuenta'),
          fallbackMessage: tx(
            'confirmRegistration.validation.genericConfirmFailure',
            'No fue posible confirmar tu cuenta. Intenta de nuevo.',
          ),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setInfoMessage(null);

    try {
      await resendRegistrationCode(email);
      setInfoMessage(
        tx('confirmRegistration.resentMessage', 'Enviamos un nuevo codigo a {{email}}.', { email }),
      );
      showAlert({
        title: tx('confirmRegistration.alert.resentTitle', 'Codigo reenviado'),
        message: tx('confirmRegistration.resentMessage', 'Enviamos un nuevo codigo a {{email}}.', { email }),
        tone: 'success',
      });
    } catch (error) {
      if (error instanceof ApiException) {
        setInfoMessage(error.message);
        showError(error, {
          title: tx('confirmRegistration.alert.resendFailed', 'No pudimos reenviar el codigo'),
        });
      } else {
        setInfoMessage(
          tx(
            'confirmRegistration.validation.genericResendFailure',
            'No fue posible reenviar el codigo.',
          ),
        );
        showError(error, {
          title: tx('confirmRegistration.alert.resendFailed', 'No pudimos reenviar el codigo'),
          fallbackMessage: tx(
            'confirmRegistration.validation.genericResendFailure',
            'No fue posible reenviar el codigo.',
          ),
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AnimatedBackground colors={ONBOARDING_GRADIENT_COLORS}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <BackArrowIcon />
              </TouchableOpacity>

              <Animated.View style={headerAnimatedStyle}>
                <Text style={styles.title}>
                  {tx('confirmRegistration.title', 'Confirma tu correo')}
                </Text>
                <Text style={styles.subtitle}>
                  {tx(
                    'confirmRegistration.subtitle',
                    'Revisa {{email}} e ingresa el codigo para activar tu cuenta y entrar a la app.',
                    { email },
                  )}
                </Text>
              </Animated.View>

              <Animated.View style={formAnimatedStyle}>
                <GlassCard style={styles.card}>
                  {infoMessage && <Text style={styles.infoText}>{infoMessage}</Text>}

                  <View style={styles.readonlyRow}>
                    <MailIcon />
                    <Text style={styles.readonlyText}>{email}</Text>
                  </View>

                  <TextInput
                    style={[styles.codeInput, codeError && styles.codeInputError]}
                    placeholder={tx(
                      'confirmRegistration.codePlaceholder',
                      'Codigo de verificacion',
                    )}
                    placeholderTextColor={colors.text.tertiary}
                    value={code}
                    onChangeText={(text) => {
                      setCode(text);
                      if (codeError) {
                        validateCode(text);
                      }
                    }}
                    onBlur={() => validateCode(code)}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  {codeError && <Text style={styles.errorText}>{codeError}</Text>}

                  <View style={styles.inputContainer}>
                    <View style={styles.inputIconContainer}>
                      <LockIcon color={passwordError ? colors.error : colors.text.secondary} />
                    </View>
                    <TextInput
                      style={[styles.textInput, passwordError && styles.textInputError]}
                      placeholder={tx(
                        'confirmRegistration.passwordPlaceholder',
                        'Vuelve a ingresar tu contrasena',
                      )}
                      placeholderTextColor={colors.text.tertiary}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (passwordError) {
                          validatePassword(text);
                        }
                      }}
                      onBlur={() => validatePassword(password)}
                      secureTextEntry
                      editable={!isLoading}
                      returnKeyType="done"
                      onSubmitEditing={handleConfirm}
                    />
                  </View>
                  {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

                  <TouchableOpacity
                    activeOpacity={1}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    onPress={handleConfirm}
                    disabled={!code.trim() || !password || isLoading}
                    style={styles.buttonWrapper}
                  >
                    <Animated.View style={buttonPressStyle}>
                      <View style={[styles.button, (!code.trim() || !password || isLoading) && styles.buttonDisabled]}>
                        {isLoading ? (
                          <ActivityIndicator color={colors.text.inverse} size="small" />
                        ) : (
                          <Text style={styles.buttonText}>
                            {tx('confirmRegistration.confirmAndEnter', 'Confirmar y entrar')}
                          </Text>
                        )}
                      </View>
                    </Animated.View>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleResendCode} disabled={isResending || isLoading}>
                    <Text style={styles.linkText}>
                      {isResending
                        ? tx('confirmRegistration.resendingCode', 'Reenviando codigo...')
                        : tx('confirmRegistration.resendCode', 'Reenviar codigo')}
                    </Text>
                  </TouchableOpacity>
                </GlassCard>
              </Animated.View>
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
    paddingVertical: spacing['2xl'],
    gap: spacing.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize['4xl'],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.md,
    lineHeight: 22,
  },
  card: {
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: borderRadius['3xl'],
    backgroundColor: colors.background.primary,
    borderColor: colors.border.light,
  },
  infoText: {
    color: colors.success,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
  },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  readonlyText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    letterSpacing: 1.2,
  },
  codeInputError: {
    borderColor: colors.error,
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.base,
  },
  inputIconContainer: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    paddingVertical: spacing.base,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
  },
  textInputError: {
    color: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
  },
  buttonWrapper: {
    marginTop: spacing.base,
  },
  button: {
    minHeight: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  buttonDisabled: {
    backgroundColor: colors.border.medium,
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bold,
  },
  linkText: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: colors.text.link,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
  },
});

export default ConfirmRegistrationScreen;