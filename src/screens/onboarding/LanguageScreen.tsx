/**
 * LanguageScreen
 * 
 * Language selection screen for the onboarding flow.
 * Displays Spanish (ES), English (EN), and Portuguese (PT) options with flag icons.
 * Persists selection using the unified auth/user store and navigates to NameScreen.
 * 
 * Validates: Requirements 3.3, 3.4
 */

import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { StackNavigationProp } from '@react-navigation/stack';

import { AnimatedBackground, ONBOARDING_GRADIENT_COLORS } from '../../components/common/AnimatedBackground';
import { GlassCard } from '../../components/common/GlassCard';
import { FlagES, FlagUS, FlagBR } from '../../icons/FlagIcons';
import { useFadeUp, usePressAnimation, getStaggerDelay } from '../../styles/animations';
import { colors, typography, spacing } from '../../styles/theme';
import { OnboardingStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import type { Language } from '../../types/user';
import { useViewTranslation } from '../../i18n';

/** Language options configuration */
const LANGUAGE_OPTIONS: Array<{
  code: Language;
  name: string;
  nativeName: string;
  Flag: React.FC<{ size?: number }>;
}> = [
  {
    code: 'ES',
    name: 'Spanish',
    nativeName: 'Español',
    Flag: FlagES,
  },
  {
    code: 'EN',
    name: 'English',
    nativeName: 'English',
    Flag: FlagUS,
  },
  {
    code: 'PT',
    name: 'Portuguese',
    nativeName: 'Português',
    Flag: FlagBR,
  },
];

interface LanguageScreenProps {
  navigation: StackNavigationProp<OnboardingStackParamList, 'Language'>;
}

/**
 * LanguageOption - Individual language selection card with press animation
 */
interface LanguageOptionProps {
  code: Language;
  name: string;
  nativeName: string;
  Flag: React.FC<{ size?: number }>;
  index: number;
  onSelect: (code: Language) => void;
  isSelected: boolean;
}

const LanguageOption: React.FC<LanguageOptionProps> = ({
  code,
  nativeName,
  Flag,
  index,
  onSelect,
  isSelected,
}) => {
  const delay = getStaggerDelay(index, 100) + 300;
  const { animatedStyle: fadeStyle, fadeIn } = useFadeUp({
    duration: 400,
    delay,
    distance: 20,
  });
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressAnimation();

  useEffect(() => {
    fadeIn();
  }, [fadeIn]);

  const handlePress = () => {
    onSelect(code);
  };

  return (
    <Animated.View style={[styles.optionWrapper, fadeStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={handlePress}
      >
        <Animated.View style={pressStyle}>
          <GlassCard
            style={isSelected 
              ? { ...styles.optionCard, ...styles.optionCardSelected }
              : styles.optionCard
            }
            opacity={Platform.OS === 'android' ? 1 : undefined}
            blurIntensity={Platform.OS === 'android' ? 0 : undefined}
          >
            <View style={styles.optionContent}>
              <View style={styles.flagContainer}>
                <Flag size={48} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.languageCode}>{code}</Text>
                <Text style={styles.languageName}>{nativeName}</Text>
              </View>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
          </GlassCard>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * LanguageScreen Component
 * 
 * Displays language selection options with flag icons.
 * Persists selection and navigates to Name screen.
 */
export const LanguageScreen: React.FC<LanguageScreenProps> = ({ navigation }) => {
  const { language: currentLanguage, setLanguage } = useAuth();
  const { t } = useViewTranslation('onboarding');

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

  useEffect(() => {
    titleFadeIn();
    subtitleFadeIn();
  }, [titleFadeIn, subtitleFadeIn]);

  const handleLanguageSelect = async (code: Language) => {
    try {
      // Persist the language selection
      await setLanguage(code);
      // Navigate to Name screen
      navigation.navigate('Name');
    } catch (error) {
      console.error('[LanguageScreen] Error setting language:', error);
    }
  };

  return (
    <AnimatedBackground colors={ONBOARDING_GRADIENT_COLORS}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.header}>
            <Animated.View style={titleAnimatedStyle}>
              <Text style={styles.title}>
                {t('language.title', { defaultValue: 'Selecciona tu idioma' })}
              </Text>
            </Animated.View>
            <Animated.View style={subtitleAnimatedStyle}>
              <Text style={styles.subtitle}>
                {t('language.subtitle', {
                  defaultValue: 'Elige el idioma en el que deseas usar la aplicacion',
                })}
              </Text>
            </Animated.View>
          </View>

          {/* Language Options */}
          <View style={styles.optionsContainer}>
            {LANGUAGE_OPTIONS.map((option, index) => (
              <LanguageOption
                key={option.code}
                code={option.code}
                name={option.name}
                nativeName={option.nativeName}
                Flag={option.Flag}
                index={index}
                onSelect={handleLanguageSelect}
                isSelected={currentLanguage === option.code}
              />
            ))}
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
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  optionWrapper: {
    marginBottom: spacing.sm,
  },
  optionCard: {
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
    borderColor: colors.border.light,
  },
  optionCardSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.background.secondary,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagContainer: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderRadius: 4,
    overflow: 'hidden',
  },
  optionTextContainer: {
    flex: 1,
  },
  languageCode: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  languageName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bold,
  },
});

export default LanguageScreen;
