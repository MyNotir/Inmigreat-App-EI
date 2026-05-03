/**
 * SplashScreen
 * 
 * Initial splash screen displaying the InMiGreat logo and app statistics.
 * Auto-navigates to the Language screen after a delay.
 * 
 * Validates: Requirements 3.1, 3.2
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { StackNavigationProp } from '@react-navigation/stack';

import { AnimatedBackground, ONBOARDING_GRADIENT_COLORS } from '../../components/common/AnimatedBackground';
import { InmigreatLogo } from '../../icons/BrandIcons';
import { useFadeUp, usePopIn, getStaggerDelay } from '../../styles/animations';
import { colors, typography, spacing } from '../../styles/theme';
import { OnboardingStackParamList } from '../../types/navigation';
import { useViewTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';

/** Auto-navigation delay in milliseconds */
const AUTO_NAVIGATE_DELAY = 2500;

/** App statistics to display */
interface SplashScreenProps {
  navigation: StackNavigationProp<OnboardingStackParamList, 'Splash'>;
}

/**
 * MetricItem - Individual metric display with staggered animation
 */
interface MetricItemProps {
  value: string;
  label: string;
  index: number;
}

const MetricItem: React.FC<MetricItemProps> = ({ value, label, index }) => {
  const delay = getStaggerDelay(index, 150) + 800; // Start after logo animation
  const { animatedStyle, fadeIn } = useFadeUp({
    duration: 400,
    delay,
    distance: 15,
  });

  useEffect(() => {
    fadeIn();
  }, [fadeIn]);

  return (
    <Animated.View style={[styles.metricItem, animatedStyle]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Animated.View>
  );
};

/**
 * SplashScreen Component
 * 
 * Displays the InMiGreat logo with animations and app statistics.
 * Automatically navigates to the Language screen after a delay.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { t } = useViewTranslation('onboarding');
  const { __devBypassAuth } = useAuth();
  const [autoNavigate, setAutoNavigate] = useState(true);

  const metrics = [
    {
      value: '12,847',
      label: t('splash.metrics.activeUsers', { defaultValue: 'Usuarios activos' }),
    },
    {
      value: '94%',
      label: t('splash.metrics.resolvedCases', { defaultValue: 'Casos resueltos' }),
    },
    {
      value: '4.9 ★',
      label: t('splash.metrics.appStore', { defaultValue: 'App Store' }),
    },
  ] as const;

  // Logo animation
  const { animatedStyle: logoAnimatedStyle, popIn } = usePopIn({
    initialScale: 0.6,
    duration: 500,
    delay: 200,
  });

  // Title animation
  const { animatedStyle: titleAnimatedStyle, fadeIn: titleFadeIn } = useFadeUp({
    duration: 400,
    delay: 500,
    distance: 20,
  });

  // Start animations on mount
  useEffect(() => {
    popIn();
    titleFadeIn();
  }, [popIn, titleFadeIn]);

  // Auto-navigate to Language screen after delay (cancellable when user taps EI Preview)
  useEffect(() => {
    if (!autoNavigate) return;
    const timer = setTimeout(() => {
      navigation.replace('Language');
    }, AUTO_NAVIGATE_DELAY);

    return () => clearTimeout(timer);
  }, [navigation, autoNavigate]);

  return (
    <AnimatedBackground colors={ONBOARDING_GRADIENT_COLORS}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Logo Section */}
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <View style={styles.logoWrapper}>
              <InmigreatLogo size={80} strokeWidth={2} />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <Text style={styles.title}>InMiGreat</Text>
            <Text style={styles.subtitle}>
              {t('splash.subtitle', { defaultValue: 'Tu camino hacia el exito migratorio' })}
            </Text>
          </Animated.View>

          {/* Metrics Section */}
          <View style={styles.metricsContainer}>
            {metrics.map((metric, index) => (
              <MetricItem
                key={metric.label}
                value={metric.value}
                label={metric.label}
                index={index}
              />
            ))}
          </View>

          {/* EI Preview entry — visible during the redesign experiment so
              stakeholders can see the new system without auth. Cancels the
              auto-navigate so the user has time to decide. */}
          <TouchableOpacity
            style={styles.eiPreviewButton}
            onPress={() => {
              setAutoNavigate(false);
              navigation.navigate('EIPreview');
            }}
            accessibilityRole="button"
            accessibilityLabel="Open Emotional Intelligence design preview"
          >
            <Text style={styles.eiPreviewLabel}>Preview · EI Redesign →</Text>
          </TouchableOpacity>

          {/* DEV-only demo login: bypass real Cognito and drop straight into
              Main tabs so you can navigate Cases / Chat / Community / Resources
              without a backend. Hidden in production builds. */}
          {__DEV__ && __devBypassAuth ? (
            <TouchableOpacity
              style={styles.devLoginButton}
              onPress={() => {
                setAutoNavigate(false);
                __devBypassAuth();
              }}
              accessibilityRole="button"
              accessibilityLabel="Dev demo login — bypass real auth"
            >
              <Text style={styles.devLoginLabel}>Demo Login (sin password) →</Text>
            </TouchableOpacity>
          ) : null}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing['2xl'],
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  title: {
    fontSize: typography.fontSize['4xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: spacing.base,
  },
  metricItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  metricValue: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  eiPreviewButton: {
    marginTop: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.warm.clay,
  },
  eiPreviewLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 0.4,
  },
  devLoginButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  devLoginLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.inverse,
    letterSpacing: 0.4,
  },
});

export default SplashScreen;
