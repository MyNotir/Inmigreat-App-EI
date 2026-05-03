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

type ForgotPasswordScreenProps = StackScreenProps<OnboardingStackParamList, 'ForgotPassword'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation, route }) => {
  const { t } = useViewTranslation('onboarding');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { requestPasswordReset } = useAuth();
  const { showError } = useAppAlert();

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

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(tx('forgotPassword.validation.emailRequired', 'El correo electronico es requerido.'));
      return false;
    }

    if (!EMAIL_REGEX.test(value.trim())) {
      setEmailError(tx('forgotPassword.validation.emailInvalid', 'Ingresa un correo electronico valido.'));
      return false;
    }

    setEmailError(null);
    return true;
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    const normalizedEmail = email.trim().toLowerCase();

    if (!validateEmail(normalizedEmail)) {
      return;
    }

    setIsLoading(true);

    try {
      await requestPasswordReset(normalizedEmail);
      navigation.navigate('ResetPassword', { email: normalizedEmail });
    } catch (error) {
      if (error instanceof ApiException && error.type === 'network_error') {
        setEmailError(
          tx('forgotPassword.validation.offline', 'Sin conexion. Verifica tu internet e intenta de nuevo.'),
        );
        showError(error, { title: tx('forgotPassword.networkTitle', 'Sin conexion') });
      } else {
        navigation.navigate('ResetPassword', { email: normalizedEmail });
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
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                disabled={isLoading}
              >
                <BackArrowIcon color={isLoading ? colors.text.tertiary : colors.text.primary} />
              </TouchableOpacity>

              <Animated.View style={headerAnimatedStyle}>
                <Text style={styles.title}>
                  {tx('forgotPassword.title', 'Recuperar contrasena')}
                </Text>
                <Text style={styles.subtitle}>
                  {tx(
                    'forgotPassword.subtitle',
                    'Enviaremos un codigo a tu correo para que elijas una contrasena nueva.',
                  )}
                </Text>
              </Animated.View>

              <Animated.View style={formAnimatedStyle}>
                <GlassCard
                  style={styles.card}
                  opacity={Platform.OS === 'android' ? 1 : undefined}
                  blurIntensity={Platform.OS === 'android' ? 0 : undefined}
                >
                  <View style={styles.inputContainer}>
                    <View style={styles.inputIconContainer}>
                      <MailIcon color={emailError ? colors.error : colors.text.secondary} />
                    </View>
                    <TextInput
                      style={[styles.textInput, emailError && styles.textInputError]}
                      placeholder={tx('forgotPassword.emailPlaceholder', 'Correo electronico')}
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
                      editable={!isLoading}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                  </View>
                  {emailError && <Text style={styles.errorText}>{emailError}</Text>}

                  <Text style={styles.helperText}>
                    {tx(
                      'forgotPassword.helper',
                      'Si la cuenta existe, Cognito enviara un codigo de verificacion a este correo.',
                    )}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={1}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    onPress={handleSubmit}
                    disabled={!email.trim() || isLoading}
                    style={styles.buttonWrapper}
                  >
                    <Animated.View style={buttonPressStyle}>
                      <View style={[styles.button, (!email.trim() || isLoading) && styles.buttonDisabled]}>
                        {isLoading ? (
                          <ActivityIndicator color={colors.text.inverse} size="small" />
                        ) : (
                          <Text style={styles.buttonText}>
                            {tx('forgotPassword.sendCode', 'Enviar codigo')}
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

export default ForgotPasswordScreen;