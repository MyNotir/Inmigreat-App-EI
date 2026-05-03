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
import { ApiException } from '../../services/api';
import { useFadeUp, usePressAnimation } from '../../styles/animations';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';
import type { OnboardingStackParamList } from '../../types/navigation';
import { useViewTranslation } from '../../i18n';

type ResetPasswordScreenProps = StackScreenProps<OnboardingStackParamList, 'ResetPassword'>;

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

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

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ navigation, route }) => {
  const { email } = route.params;
  const { t } = useViewTranslation('onboarding');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { confirmPasswordReset } = useAuth();

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
        tx('resetPassword.validation.codeRequired', 'Ingresa el codigo que recibiste por correo.'),
      );
      return false;
    }

    if (value.trim().length < 6) {
      setCodeError(tx('resetPassword.validation.codeLength', 'El codigo debe tener 6 caracteres.'));
      return false;
    }

    setCodeError(null);
    return true;
  };

  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError(
        tx('resetPassword.validation.passwordRequired', 'La nueva contrasena es requerida.'),
      );
      return false;
    }

    if (!STRONG_PASSWORD_REGEX.test(value)) {
      setPasswordError(
        tx(
          'resetPassword.validation.strongPassword',
          'Usa al menos 8 caracteres, una mayuscula, una minuscula y un numero.',
        ),
      );
      return false;
    }

    setPasswordError(null);
    return true;
  };

  const validateConfirmPassword = (value: string): boolean => {
    if (!value) {
      setConfirmPasswordError(
        tx('resetPassword.validation.confirmRequired', 'Confirma tu nueva contrasena.'),
      );
      return false;
    }

    if (value !== password) {
      setConfirmPasswordError(
        tx('resetPassword.validation.confirmMismatch', 'Las contrasenas no coinciden.'),
      );
      return false;
    }

    setConfirmPasswordError(null);
    return true;
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    const isCodeValid = validateCode(code);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isCodeValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset({
        email,
        code: code.trim(),
        password,
      });
      navigation.navigate('Login', {
        email,
        notice: tx('resetPassword.updatedNotice', 'Tu contrasena fue actualizada. Inicia sesion nuevamente.'),
      });
    } catch (error) {
      if (error instanceof ApiException) {
        if (error.details?.code?.[0]) {
          setCodeError(error.details.code[0]);
        } else if (error.details?.password?.[0]) {
          setPasswordError(error.details.password[0]);
        } else {
          setPasswordError(error.message);
        }
      } else {
        setPasswordError(
          tx('resetPassword.validation.genericFailure', 'No fue posible actualizar la contrasena.'),
        );
      }
    } finally {
      setIsLoading(false);
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
                  {tx('resetPassword.title', 'Nueva contrasena')}
                </Text>
                <Text style={styles.subtitle}>
                  {tx(
                    'resetPassword.subtitle',
                    'Ingresa el codigo enviado a {{email}} y define una contrasena nueva.',
                    { email },
                  )}
                </Text>
              </Animated.View>

              <Animated.View style={formAnimatedStyle}>
                <GlassCard
                  style={styles.card}
                  opacity={Platform.OS === 'android' ? 1 : undefined}
                  blurIntensity={Platform.OS === 'android' ? 0 : undefined}
                >
                  <TextInput
                    style={[styles.codeInput, codeError && styles.codeInputError]}
                    placeholder={tx('resetPassword.codePlaceholder', 'Codigo de verificacion')}
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
                      placeholder={tx('resetPassword.passwordPlaceholder', 'Nueva contrasena')}
                      placeholderTextColor={colors.text.tertiary}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (passwordError) {
                          validatePassword(text);
                        }
                        if (confirmPasswordError) {
                          validateConfirmPassword(confirmPassword);
                        }
                      }}
                      onBlur={() => validatePassword(password)}
                      secureTextEntry
                      editable={!isLoading}
                    />
                  </View>
                  {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

                  <View style={styles.inputContainer}>
                    <View style={styles.inputIconContainer}>
                      <LockIcon color={confirmPasswordError ? colors.error : colors.text.secondary} />
                    </View>
                    <TextInput
                      style={[styles.textInput, confirmPasswordError && styles.textInputError]}
                      placeholder={tx(
                        'resetPassword.confirmPasswordPlaceholder',
                        'Confirma la contrasena',
                      )}
                      placeholderTextColor={colors.text.tertiary}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (confirmPasswordError) {
                          validateConfirmPassword(text);
                        }
                      }}
                      onBlur={() => validateConfirmPassword(confirmPassword)}
                      secureTextEntry
                      editable={!isLoading}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                  </View>
                  {confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}

                  <Text style={styles.helperText}>
                    {tx(
                      'resetPassword.helper',
                      'La contrasena debe cumplir la politica de Cognito: 8 caracteres, mayuscula, minuscula y numero.',
                    )}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={1}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    onPress={handleSubmit}
                    disabled={!code.trim() || !password || !confirmPassword || isLoading}
                    style={styles.buttonWrapper}
                  >
                    <Animated.View style={buttonPressStyle}>
                      <View
                        style={[
                          styles.button,
                          (!code.trim() || !password || !confirmPassword || isLoading) && styles.buttonDisabled,
                        ]}
                      >
                        {isLoading ? (
                          <ActivityIndicator color={colors.text.inverse} size="small" />
                        ) : (
                          <Text style={styles.buttonText}>
                            {tx('resetPassword.updatePassword', 'Actualizar contrasena')}
                          </Text>
                        )}
                      </View>
                    </Animated.View>
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
  helperText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
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
});

export default ResetPasswordScreen;