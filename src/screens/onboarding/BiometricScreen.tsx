/**
 * BiometricScreen
 * 
 * Screen for prompting Face ID / Touch ID setup during onboarding.
 * Shows platform-appropriate biometric icon (Face ID on iOS, fingerprint on Android).
 * Provides "Enable" and "Skip" options.
 * 
 * Validates: Requirements 3.11, 3.12, 3.13
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { StackNavigationProp } from '@react-navigation/stack';

import { AnimatedBackground, ONBOARDING_GRADIENT_COLORS } from '../../components/common/AnimatedBackground';
import { GlassCard } from '../../components/common/GlassCard';
import { useFadeUp, usePressAnimation, usePopIn } from '../../styles/animations';
import { colors, typography, spacing, borderRadius } from '../../styles/theme';
import { OnboardingStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
  type BiometricAvailability,
} from '../../services/biometric';
import { useViewTranslation } from '../../i18n';

interface BiometricScreenProps {
  navigation: StackNavigationProp<OnboardingStackParamList, 'Biometric'>;
}

/**
 * Face ID Icon Component (iOS)
 */
const FaceIdIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 80,
  color = colors.accent,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Face outline */}
    <Rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="4"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    {/* Left eye */}
    <Path
      d="M9 9v2"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    {/* Right eye */}
    <Path
      d="M15 9v2"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    {/* Nose */}
    <Path
      d="M12 11v2.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    {/* Mouth */}
    <Path
      d="M9 16c.5 1 1.5 1.5 3 1.5s2.5-.5 3-1.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

/**
 * Fingerprint Icon Component (Android)
 */
const FingerprintIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 80,
  color = colors.accent,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Fingerprint arcs */}
    <Path
      d="M12 2C9.24 2 7 4.24 7 7v4c0 2.76 2.24 5 5 5s5-2.24 5-5V7c0-2.76-2.24-5-5-5z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M12 5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M4 12c0 4.42 3.58 8 8 8"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M20 12c0 4.42-3.58 8-8 8"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M12 22v-2"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

/**
 * Shield Check Icon Component
 */
const ShieldCheckIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = colors.success,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M9 12l2 2 4-4"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * BiometricScreen Component
 * 
 * Prompts user to enable Face ID / Touch ID for secure authentication.
 * - Shows platform-appropriate icon (Face ID on iOS, fingerprint on Android)
 * - Provides "Enable" button to set up biometric auth
 * - Provides "Skip" option to proceed without biometric auth
 * - Navigates to main app on completion (auth state triggers navigation change)
 */
export const BiometricScreen: React.FC<BiometricScreenProps> = ({ navigation }) => {
  const { t } = useViewTranslation('onboarding');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const [isLoading, setIsLoading] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState<BiometricAvailability | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { setBiometricAuth, authState } = useAuth();

  // Animations
  const { animatedStyle: iconAnimatedStyle, popIn: iconPopIn } = usePopIn({
    initialScale: 0.5,
    duration: 500,
    delay: 100,
  });

  const { animatedStyle: titleAnimatedStyle, fadeIn: titleFadeIn } = useFadeUp({
    duration: 400,
    delay: 200,
    distance: 20,
  });

  const { animatedStyle: subtitleAnimatedStyle, fadeIn: subtitleFadeIn } = useFadeUp({
    duration: 400,
    delay: 300,
    distance: 15,
  });

  const { animatedStyle: cardAnimatedStyle, fadeIn: cardFadeIn } = useFadeUp({
    duration: 400,
    delay: 400,
    distance: 20,
  });

  const { animatedStyle: buttonsAnimatedStyle, fadeIn: buttonsFadeIn } = useFadeUp({
    duration: 400,
    delay: 500,
    distance: 20,
  });

  // Press animations
  const { animatedStyle: enablePressStyle, onPressIn: enablePressIn, onPressOut: enablePressOut } = usePressAnimation();
  const { animatedStyle: skipPressStyle, onPressIn: skipPressIn, onPressOut: skipPressOut } = usePressAnimation();

  useEffect(() => {
    // Check biometric availability on mount
    checkBiometricAvailability().then(setBiometricInfo);
    
    // Start animations
    iconPopIn();
    titleFadeIn();
    subtitleFadeIn();
    cardFadeIn();
    buttonsFadeIn();
  }, [iconPopIn, titleFadeIn, subtitleFadeIn, cardFadeIn, buttonsFadeIn]);

  /**
   * Handle enabling biometric authentication
   * Validates: Requirement 3.11, 3.12
   */
  const handleEnableBiometric = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Authenticate with biometrics to verify it works
      const authResult = await authenticateWithBiometric({
        promptMessage: tx(
          'biometric.prompt.setup',
          'Configura {{biometricName}}',
          { biometricName: biometricInfo?.biometricName || 'biometria' },
        ),
        cancelLabel: tx('biometric.prompt.cancel', 'Cancelar'),
      });

      if (!authResult.success) {
        if (authResult.cancelled) {
          // User cancelled, don't show error
          setIsLoading(false);
          return;
        }
        setError(authResult.error || tx('biometric.error.setup', 'Error al configurar biometria'));
        setIsLoading(false);
        return;
      }
      // Enable biometric auth in context
      await setBiometricAuth(true);

      // Navigation will happen automatically via auth state change
      // The root navigator watches auth state and switches to Main when authenticated
    } catch (err) {
      console.error('[BiometricScreen] Error enabling biometric:', err);
      setError(tx('biometric.error.enable', 'Error al configurar la autenticacion biometrica'));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle skipping biometric setup
   * Validates: Requirement 3.13
   */
  const handleSkip = async () => {
    setIsLoading(true);
    
    try {
      // Ensure biometric is disabled
      await setBiometricAuth(false);
      
      // Navigation will happen automatically via auth state change
      // The root navigator watches auth state and switches to Main when authenticated
    } catch (err) {
      console.error('[BiometricScreen] Error skipping biometric:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine which icon to show based on platform and biometric type
  const BiometricIcon = Platform.OS === 'ios' ? FaceIdIcon : FingerprintIcon;
  const biometricName = biometricInfo?.biometricName || (Platform.OS === 'ios' ? 'Face ID' : 'Touch ID');
  
  // Check if biometrics are available
  const isBiometricAvailable = biometricInfo?.hasHardware && biometricInfo?.isEnrolled;

  return (
    <AnimatedBackground colors={ONBOARDING_GRADIENT_COLORS}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Icon Section */}
          <View style={styles.iconSection}>
            <Animated.View style={iconAnimatedStyle}>
              <View style={styles.iconContainer}>
                <BiometricIcon size={80} color={colors.accent} />
              </View>
            </Animated.View>
          </View>

          {/* Header Section */}
          <View style={styles.header}>
            <Animated.View style={titleAnimatedStyle}>
              <Text style={styles.title}>
                {tx('biometric.title', 'Protege tu cuenta')}
              </Text>
            </Animated.View>
            <Animated.View style={subtitleAnimatedStyle}>
              <Text style={styles.subtitle}>
                {tx(
                  'biometric.subtitle',
                  'Usa {{biometricName}} para acceder de forma rapida y segura a tu cuenta',
                  { biometricName },
                )}
              </Text>
            </Animated.View>
          </View>

          {/* Benefits Card */}
          <View style={styles.cardSection}>
            <Animated.View style={cardAnimatedStyle}>
              <GlassCard style={styles.benefitsCard}>
                <View style={styles.benefitRow}>
                  <ShieldCheckIcon size={24} color={colors.success} />
                  <View style={styles.benefitTextContainer}>
                    <Text style={styles.benefitTitle}>
                      {tx('biometric.benefit.secureTitle', 'Acceso seguro')}
                    </Text>
                    <Text style={styles.benefitDescription}>
                      {tx(
                        'biometric.benefit.secureDescription',
                        'Solo tu puedes acceder a tu cuenta',
                      )}
                    </Text>
                  </View>
                </View>
                <View style={styles.benefitDivider} />
                <View style={styles.benefitRow}>
                  <ShieldCheckIcon size={24} color={colors.success} />
                  <View style={styles.benefitTextContainer}>
                    <Text style={styles.benefitTitle}>
                      {tx('biometric.benefit.fastTitle', 'Inicio rapido')}
                    </Text>
                    <Text style={styles.benefitDescription}>
                      {tx(
                        'biometric.benefit.fastDescription',
                        'Sin necesidad de escribir tu contrasena',
                      )}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Buttons Section */}
          <View style={styles.buttonsSection}>
            <Animated.View style={buttonsAnimatedStyle}>
              {/* Enable Button */}
              {isBiometricAvailable ? (
                <TouchableOpacity
                  activeOpacity={1}
                  onPressIn={enablePressIn}
                  onPressOut={enablePressOut}
                  onPress={handleEnableBiometric}
                  disabled={isLoading}
                >
                  <Animated.View style={enablePressStyle}>
                    <View style={[styles.enableButton, isLoading && styles.buttonDisabled]}>
                      {isLoading ? (
                        <ActivityIndicator color={colors.text.inverse} size="small" />
                      ) : (
                        <Text style={styles.enableButtonText}>
                          {tx('biometric.action.activate', 'Activar {{biometricName}}', {
                            biometricName,
                          })}
                        </Text>
                      )}
                    </View>
                  </Animated.View>
                </TouchableOpacity>
              ) : (
                <View style={styles.unavailableContainer}>
                  <Text style={styles.unavailableText}>
                    {biometricInfo?.hasHardware
                      ? tx(
                          'biometric.unavailable.configured',
                          '{{biometricName}} no esta configurado en este dispositivo',
                          { biometricName },
                        )
                      : tx(
                          'biometric.unavailable.unsupported',
                          'Este dispositivo no soporta autenticacion biometrica',
                        )}
                  </Text>
                </View>
              )}

              {/* Skip Button */}
              <TouchableOpacity
                activeOpacity={1}
                onPressIn={skipPressIn}
                onPressOut={skipPressOut}
                onPress={handleSkip}
                disabled={isLoading}
                style={styles.skipButtonContainer}
              >
                <Animated.View style={skipPressStyle}>
                  <View style={[styles.skipButton, isLoading && styles.buttonDisabled]}>
                    <Text style={[styles.skipButtonText, isLoading && styles.skipButtonTextDisabled]}>
                      {isBiometricAvailable
                        ? tx('biometric.action.notNow', 'Ahora no')
                        : tx('biometric.action.continue', 'Continuar')}
                    </Text>
                  </View>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    justifyContent: 'space-between',
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.accent}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.xl,
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
  cardSection: {
    flex: 1,
    justifyContent: 'center',
  },
  benefitsCard: {
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
    borderColor: colors.border.light,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  benefitTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  benefitTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  benefitDescription: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  benefitDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.md,
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.error,
    textAlign: 'center',
  },
  unavailableContainer: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  unavailableText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  buttonsSection: {
    paddingBottom: spacing['2xl'],
  },
  enableButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  enableButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
  skipButtonContainer: {
    marginTop: spacing.md,
  },
  skipButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  skipButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
  },
  skipButtonTextDisabled: {
    color: colors.text.tertiary,
  },
});

export default BiometricScreen;
