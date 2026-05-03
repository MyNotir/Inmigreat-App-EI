/**
 * NameScreen
 * 
 * Screen for collecting the user's first name during onboarding.
 * Displays a welcoming title, text input for name, and Continue button.
 * Uses GlassCard for the input container and AnimatedBackground for gradient.
 * 
 * Validates: Requirements 3.5
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { StackScreenProps } from '@react-navigation/stack';

import { AnimatedBackground, ONBOARDING_GRADIENT_COLORS } from '../../components/common/AnimatedBackground';
import { GlassCard } from '../../components/common/GlassCard';
import { useFadeUp, usePressAnimation } from '../../styles/animations';
import { colors, typography, spacing, borderRadius } from '../../styles/theme';
import { OnboardingStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { ApiException } from '../../services/api';
import { useViewTranslation } from '../../i18n';

type NameScreenProps = StackScreenProps<OnboardingStackParamList, 'Name'>;

/**
 * NameScreen Component
 * 
 * Collects user's first name for personalization.
 * Validates that name is not empty before allowing navigation.
 */
export const NameScreen: React.FC<NameScreenProps> = ({ navigation, route }) => {
  const { completePendingProvisioning, setUserName, userName } = useAuth();
  const { t } = useViewTranslation('onboarding');

  const [name, setName] = useState(userName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isProvisioningContinuation = route.params?.completePendingProvisioning === true;
  const actionLabel = isProvisioningContinuation
    ? t('name.completeProfile', { defaultValue: 'Completar perfil' })
    : t('name.continue', { defaultValue: 'Continuar' });

  // Title animation
  const { animatedStyle: titleAnimatedStyle, fadeIn: titleFadeIn } = useFadeUp({
    duration: 400,
    delay: 100,
    distance: 20,
  });

  // Subtitle animation
  const { animatedStyle: subtitleAnimatedStyle, fadeIn: subtitleFadeIn } = useFadeUp({
    duration: 400,
    delay: 200,
    distance: 15,
  });

  // Input card animation
  const { animatedStyle: cardAnimatedStyle, fadeIn: cardFadeIn } = useFadeUp({
    duration: 400,
    delay: 300,
    distance: 20,
  });

  // Button animation
  const { animatedStyle: buttonAnimatedStyle, fadeIn: buttonFadeIn } = useFadeUp({
    duration: 400,
    delay: 400,
    distance: 20,
  });

  // Press animation for button
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressAnimation();

  useEffect(() => {
    titleFadeIn();
    subtitleFadeIn();
    cardFadeIn();
    buttonFadeIn();
  }, [titleFadeIn, subtitleFadeIn, cardFadeIn, buttonFadeIn]);

  const isNameValid = name.trim().length > 0;

  const handleContinue = async () => {
    if (!isNameValid) {
      setError(t('name.requiredError', { defaultValue: 'Por favor, ingresa tu nombre' }));
      return;
    }

    const trimmedName = name.trim();

    try {
      setIsSubmitting(true);
      await setUserName(trimmedName);

      if (isProvisioningContinuation) {
        await completePendingProvisioning(trimmedName);
        return;
      }

      navigation.navigate('Login', {
        email: route.params?.email,
        notice:
          route.params?.notice ??
          t('name.defaultLoginNotice', {
            defaultValue: 'Continua con tu acceso para entrar a Inmigreat.',
          }),
      });
    } catch (err) {
      if (err instanceof ApiException) {
        if (isProvisioningContinuation && err.code === 401) {
          navigation.replace('Login', {
            email: route.params?.email,
            notice: err.message,
          });
          return;
        }

        setError(err.message);
        return;
      }

      console.error('[NameScreen] Error saving name:', err);
      setError(
        t('name.saveError', { defaultValue: 'Error al guardar tu nombre. Intenta de nuevo.' }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (text: string) => {
    setName(text);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <AnimatedBackground colors={ONBOARDING_GRADIENT_COLORS}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.content}>
              {/* Header Section */}
              <View style={styles.header}>
                <Animated.View style={titleAnimatedStyle}>
                  <Text style={styles.title}>
                    {t('name.title', { defaultValue: 'Hola 👋' })}
                  </Text>
                </Animated.View>
                <Animated.View style={subtitleAnimatedStyle}>
                  <Text style={styles.subtitle}>
                    {isProvisioningContinuation
                      ? t('name.provisioningSubtitle', {
                          defaultValue: 'Solo falta tu nombre para crear tu perfil local y entrar a la app.',
                        })
                      : t('name.subtitle', {
                          defaultValue: 'Como te llamas? Queremos personalizar tu experiencia.',
                        })}
                  </Text>
                </Animated.View>
                {route.params?.notice ? (
                  <Text style={styles.noticeText}>{route.params.notice}</Text>
                ) : null}
              </View>

              {/* Input Section */}
              <View style={styles.inputSection}>
                <Animated.View style={cardAnimatedStyle}>
                  <GlassCard
                    style={styles.inputCard}
                    opacity={Platform.OS === 'android' ? 1 : undefined}
                    blurIntensity={Platform.OS === 'android' ? 0 : undefined}
                  >
                    <Text style={styles.inputLabel}>
                      {t('name.inputLabel', { defaultValue: 'Tu nombre' })}
                    </Text>
                    <TextInput
                      ref={inputRef}
                      style={[
                        styles.textInput,
                        error && styles.textInputError,
                      ]}
                      placeholder={t('name.placeholder', { defaultValue: 'Ingresa tu nombre' })}
                      placeholderTextColor={colors.text.tertiary}
                      value={name}
                      onChangeText={handleNameChange}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleContinue}
                      maxLength={50}
                      editable={!isSubmitting}
                    />
                    {error && (
                      <Text style={styles.errorText}>{error}</Text>
                    )}
                  </GlassCard>
                </Animated.View>
              </View>

              {/* Button Section */}
              <View style={styles.buttonSection}>
                <Animated.View style={buttonAnimatedStyle}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    onPress={handleContinue}
                    disabled={!isNameValid || isSubmitting}
                  >
                    <Animated.View style={pressStyle}>
                      <View
                        style={[
                          styles.continueButton,
                          (!isNameValid || isSubmitting) && styles.continueButtonDisabled,
                        ]}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color={colors.text.inverse} />
                        ) : (
                          <Text
                            style={[
                              styles.continueButtonText,
                              !isNameValid && styles.continueButtonTextDisabled,
                            ]}
                          >
                            {actionLabel}
                          </Text>
                        )}
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
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
    paddingTop: spacing['3xl'],
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.md * typography.lineHeight.normal,
    paddingHorizontal: spacing.md,
  },
  noticeText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  inputSection: {
    flex: 1,
    justifyContent: 'center',
  },
  inputCard: {
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
    borderColor: colors.border.light,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  textInput: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  textInputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.error,
    marginTop: spacing.sm,
  },
  buttonSection: {
    paddingBottom: spacing['2xl'],
  },
  continueButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.border.medium,
  },
  continueButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
  continueButtonTextDisabled: {
    color: colors.text.tertiary,
  },
});

export default NameScreen;
