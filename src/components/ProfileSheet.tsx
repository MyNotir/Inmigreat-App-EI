/**
 * ProfileSheet Component
 * 
 * A modal sheet for user profile management including:
 * - User name and subscription status display
 * - Language toggle (ES, EN, PT)
 * - Notification toggles (case updates, community, news)
 * - Subscription management and expiry display
 * - Logout functionality with data clearing
 * 
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8
 */

import React, { useCallback, useEffect } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { GlassCard } from './common/GlassCard';
import { FlagES, FlagUS, FlagBR } from '../icons/FlagIcons';
import { useFadeUp, usePressAnimation, getStaggerDelay } from '../styles/animations';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { useAppAlert } from '../context/AppAlertContext';
import { usePremiumPaywall } from '../hooks/usePremiumPaywall';
import { useViewTranslation } from '../i18n';
import type { MainTabParamList } from '../types/navigation';
import type { Language, NotificationSettings } from '../types/user';

// ============================================================================
// Types
// ============================================================================

interface ProfileSheetProps {
  /** Callback when the sheet should be closed */
  onClose: () => void;
  /** Callback when logout is complete (to navigate to onboarding) */
  onLogout?: () => void;
  /** Whether the sheet is rendered inside a bottom sheet container */
  embedded?: boolean;
}

// ============================================================================
// Language Options Configuration
// ============================================================================

const LANGUAGE_OPTIONS: Array<{
  code: Language;
  nativeName: string;
  Flag: React.FC<{ size?: number }>;
}> = [
  { code: 'ES', nativeName: 'Español', Flag: FlagES },
  { code: 'EN', nativeName: 'English', Flag: FlagUS },
  { code: 'PT', nativeName: 'Português', Flag: FlagBR },
];

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Section Header Component
 */
interface SectionHeaderProps {
  title: string;
  animatedStyle?: object;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, animatedStyle }) => (
  <Animated.View style={[styles.sectionHeader, animatedStyle]}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </Animated.View>
);

/**
 * Language Option Button
 */
interface LanguageOptionButtonProps {
  code: Language;
  nativeName: string;
  Flag: React.FC<{ size?: number }>;
  isSelected: boolean;
  onSelect: (code: Language) => void;
}

const LanguageOptionButton: React.FC<LanguageOptionButtonProps> = ({
  code,
  nativeName,
  Flag,
  isSelected,
  onSelect,
}) => {
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressAnimation();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => onSelect(code)}
      style={styles.languageOptionWrapper}
    >
      <Animated.View style={pressStyle}>
        <View
          style={[
            styles.languageOption,
            isSelected && styles.languageOptionSelected,
          ]}
        >
          <View style={styles.flagContainer}>
            <Flag size={32} />
          </View>
          <Text
            style={[
              styles.languageText,
              isSelected && styles.languageTextSelected,
            ]}
          >
            {nativeName}
          </Text>
          {isSelected && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * Toggle Row Component for notification settings
 */
interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, value, onValueChange }) => (
  <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border.light, true: colors.accent }}
      thumbColor={colors.background.primary}
      ios_backgroundColor={colors.border.light}
    />
  </View>
);

// ============================================================================
// Main Component
// ============================================================================

export const ProfileSheet: React.FC<ProfileSheetProps> = ({
  onClose,
  onLogout,
  embedded = false,
}) => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { t, i18n } = useViewTranslation('profile');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const {
    currentUser,
    authState,
    language,
    setLanguage,
    notificationSettings,
    subscriptionStatus,
    userName,
    logout,
    updateProfile,
    updateNotificationPreferences,
  } = useAuth();
  const { openPaywall, paywallElement } = usePremiumPaywall({
    subtitle: tx('premium.subtitle', 'Activa tu membresia premium'),
    description: tx(
      'premium.description',
      'Accede a herramientas avanzadas, comunidad exclusiva y alertas premium desde tu perfil.',
    ),
  });
  const { showAlert, showError } = useAppAlert();
  const glassCardProps = Platform.OS === 'android'
    ? { opacity: 1, blurIntensity: 0 }
    : {};

  const handleOpenChatFromProfile = useCallback(() => {
    onClose();
    navigation.navigate('Chat', {
      sourceScreen: 'ProfileSheet',
      sourceAction: 'open_chat_from_profile',
    });
  }, [navigation, onClose]);

  const handleOpenChatFromProfilePaywall = useCallback(() => {
    onClose();
    navigation.navigate('Chat', {
      sourceScreen: 'ProfileSheet',
      sourceAction: 'open_chat_from_profile_paywall',
    });
  }, [navigation, onClose]);

  // Animations
  const { animatedStyle: headerStyle, fadeIn: headerFadeIn } = useFadeUp({
    duration: 400,
    delay: 100,
    distance: 20,
  });

  const { animatedStyle: userInfoStyle, fadeIn: userInfoFadeIn } = useFadeUp({
    duration: 400,
    delay: getStaggerDelay(0, 100) + 150,
    distance: 15,
  });

  const { animatedStyle: languageStyle, fadeIn: languageFadeIn } = useFadeUp({
    duration: 400,
    delay: getStaggerDelay(1, 100) + 150,
    distance: 15,
  });

  const { animatedStyle: notificationStyle, fadeIn: notificationFadeIn } = useFadeUp({
    duration: 400,
    delay: getStaggerDelay(2, 100) + 150,
    distance: 15,
  });

  const { animatedStyle: subscriptionStyle, fadeIn: subscriptionFadeIn } = useFadeUp({
    duration: 400,
    delay: getStaggerDelay(3, 100) + 150,
    distance: 15,
  });

  const { animatedStyle: logoutStyle, fadeIn: logoutFadeIn } = useFadeUp({
    duration: 400,
    delay: getStaggerDelay(4, 100) + 150,
    distance: 15,
  });

  const { animatedStyle: logoutPressStyle, onPressIn: logoutPressIn, onPressOut: logoutPressOut } = usePressAnimation();

  useEffect(() => {
    headerFadeIn();
    userInfoFadeIn();
    languageFadeIn();
    notificationFadeIn();
    subscriptionFadeIn();
    logoutFadeIn();
  }, [headerFadeIn, userInfoFadeIn, languageFadeIn, notificationFadeIn, subscriptionFadeIn, logoutFadeIn]);

  /**
   * Handle language selection
   * Validates: Requirement 15.3
   */
  const handleLanguageSelect = useCallback(
    async (code: Language) => {
      try {
        if (authState.isAuthenticated) {
          await updateProfile({ language: code });
          return;
        }

        await setLanguage(code);
      } catch (error) {
        console.error('[ProfileSheet] Error setting language:', error);
      }
    },
    [authState.isAuthenticated, setLanguage, updateProfile]
  );

  /**
   * Handle notification toggle changes
   * Validates: Requirement 15.4
   */
  const handleNotificationToggle = useCallback(
    async (key: keyof NotificationSettings, value: boolean) => {
      try {
        const newSettings: NotificationSettings = {
          ...notificationSettings,
          [key]: value,
        };
        await updateNotificationPreferences(newSettings);
      } catch (error) {
        console.error('[ProfileSheet] Error updating notification settings:', error);
      }
    },
    [notificationSettings, updateNotificationPreferences]
  );

  const handleUpgradeToPro = useCallback(() => {
    openPaywall({
      title: tx('premium.title', 'InMiGreat Pro'),
      subtitle: tx('premium.subtitle', 'Activa tu membresia premium'),
      showChatButton: true,
      chatCtaLabel: tx('premium.chatCta', 'Preguntar a la AI'),
      onOpenChat: handleOpenChatFromProfilePaywall,
    });
  }, [handleOpenChatFromProfilePaywall, openPaywall, tx]);

  const handleManageSubscription = useCallback(() => {
    showAlert({
      title: tx('subscription.title', 'Suscripcion Pro'),
      message: tx(
        'subscription.unavailableMessage',
        'La administracion de suscripciones estara disponible proximamente.',
      ),
      tone: 'info',
    });
  }, [showAlert, tx]);

  /**
   * Handle logout with confirmation
   * Validates: Requirements 15.7, 15.8
   */
  const handleLogout = useCallback(() => {
    Alert.alert(
      tx('logout.title', 'Cerrar sesion'),
      tx(
        'logout.message',
        'Estas seguro de que deseas cerrar sesion? Se borraran todos los datos locales.',
      ),
      [
        {
          text: tx('logout.cancel', 'Cancelar'),
          style: 'cancel',
        },
        {
          text: tx('logout.confirm', 'Cerrar sesion'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await logout();
                onLogout?.();
                onClose();
              } catch (error) {
                console.error('[ProfileSheet] Error during logout:', error);
                showError(error, {
                  title: tx('logout.errorTitle', 'No pudimos cerrar sesion'),
                  fallbackMessage: tx(
                    'logout.errorMessage',
                    'No se pudo cerrar sesion. Intenta de nuevo.',
                  ),
                });
              }
            })();
          },
        },
      ],
    );
  }, [logout, onClose, onLogout, showError, tx]);

  /**
   * Format subscription expiry date
   */
  const formatExpiryDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const locale = i18n.resolvedLanguage === 'en'
        ? 'en-US'
        : i18n.resolvedLanguage === 'pt'
          ? 'pt-BR'
          : 'es-ES';

      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Get display name from user context or auth state
  const displayName = currentUser?.name || userName || tx('user.fallback', 'Usuario');

  const content = (
    <>
      {!embedded ? (
        <Animated.View style={[styles.header, headerStyle]}>
          <Text style={styles.headerTitle}>{tx('header.title', 'Perfil')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      <Animated.View style={userInfoStyle}>
        <GlassCard {...glassCardProps} style={styles.userInfoCard}>
          <View style={styles.userInfoContent}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{displayName}</Text>
              <View style={styles.subscriptionBadge}>
                <Text
                  style={[
                    styles.subscriptionText,
                    subscriptionStatus.isPro && styles.subscriptionTextPro,
                  ]}
                >
                  {subscriptionStatus.isPro
                    ? tx('subscription.badge.pro', 'Pro')
                    : tx('subscription.badge.free', 'Free')}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.chatEntryButton} onPress={handleOpenChatFromProfile} activeOpacity={0.8}>
            <Text style={styles.chatEntryButtonText}>
              {tx('chat.accountCta', 'Hablar con la AI sobre tu cuenta')}
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </Animated.View>

      <SectionHeader title={tx('section.language', 'Idioma')} animatedStyle={languageStyle} />
      <Animated.View style={languageStyle}>
        <GlassCard {...glassCardProps} style={styles.sectionCard}>
          <View style={styles.languageOptions}>
            {LANGUAGE_OPTIONS.map((option) => (
              <LanguageOptionButton
                key={option.code}
                code={option.code}
                nativeName={option.nativeName}
                Flag={option.Flag}
                isSelected={language === option.code}
                onSelect={handleLanguageSelect}
              />
            ))}
          </View>
        </GlassCard>
      </Animated.View>

      <SectionHeader title={tx('section.notifications', 'Notificaciones')} animatedStyle={notificationStyle} />
      <Animated.View style={notificationStyle}>
        <GlassCard {...glassCardProps} style={styles.sectionCard}>
          <ToggleRow
            label={tx('notification.caseUpdates', 'Actualizaciones de casos')}
            value={notificationSettings.caseUpdates}
            onValueChange={(value) => handleNotificationToggle('caseUpdates', value)}
          />
          <View style={styles.toggleDivider} />
          <ToggleRow
            label={tx('notification.community', 'Comunidad')}
            value={notificationSettings.community}
            onValueChange={(value) => handleNotificationToggle('community', value)}
          />
          <View style={styles.toggleDivider} />
          <ToggleRow
            label={tx('notification.proAlerts', 'Alertas Pro')}
            value={notificationSettings.proAlerts}
            onValueChange={(value) => handleNotificationToggle('proAlerts', value)}
          />
          <View style={styles.toggleDivider} />
          <ToggleRow
            label={tx('notification.news', 'Noticias')}
            value={notificationSettings.news}
            onValueChange={(value) => handleNotificationToggle('news', value)}
          />
        </GlassCard>
      </Animated.View>

      <SectionHeader title={tx('section.subscription', 'Suscripcion')} animatedStyle={subscriptionStyle} />
      <Animated.View style={subscriptionStyle}>
        <GlassCard {...glassCardProps} style={styles.sectionCard}>
          <View style={styles.subscriptionInfo}>
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>{tx('subscription.planLabel', 'Plan actual')}</Text>
              <Text
                style={[
                  styles.subscriptionValue,
                  subscriptionStatus.isPro && styles.subscriptionValuePro,
                ]}
              >
                {subscriptionStatus.isPro
                  ? tx('subscription.plan.pro', 'InMiGreat Pro')
                  : tx('subscription.plan.free', 'Gratuito')}
              </Text>
            </View>
            {subscriptionStatus.isPro && subscriptionStatus.subscriptionExpiry && (
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>{tx('subscription.expiresLabel', 'Vence el')}</Text>
                <Text style={styles.subscriptionValue}>
                  {formatExpiryDate(subscriptionStatus.subscriptionExpiry)}
                </Text>
              </View>
            )}
            {!subscriptionStatus.isPro && (
              <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgradeToPro}>
                <Text style={styles.upgradeButtonText}>{tx('subscription.upgrade', 'Actualizar a Pro')}</Text>
              </TouchableOpacity>
            )}
            {subscriptionStatus.isPro && (
              <TouchableOpacity style={styles.manageButton} onPress={handleManageSubscription}>
                <Text style={styles.manageButtonText}>{tx('subscription.manage', 'Administrar suscripcion')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>
      </Animated.View>

      <Animated.View style={[styles.logoutContainer, logoutStyle]}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={logoutPressIn}
          onPressOut={logoutPressOut}
          onPress={handleLogout}
        >
          <Animated.View style={logoutPressStyle}>
            <View style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>{tx('logout.button', 'Cerrar sesion')}</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </>
  );

  if (embedded) {
    return (
      <View style={[styles.container, styles.containerEmbedded]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, styles.scrollContentEmbedded]}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
        {paywallElement}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
      {paywallElement}
    </SafeAreaView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warm.cream,
  },
  containerEmbedded: {
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  scrollContentEmbedded: {
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warm.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.warm.inkSoft,
    fontFamily: typography.fontFamily.medium,
  },
  userInfoCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  userInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.cream,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.xs,
  },
  subscriptionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.warm.cream,
  },
  subscriptionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
  },
  subscriptionTextPro: {
    color: colors.pro,
  },
  chatEntryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.warm.cream,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border.warm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  chatEntryButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.accent,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  sectionCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  languageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  languageOptionWrapper: {
    flex: 1,
  },
  languageOption: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.large,
    backgroundColor: colors.warm.sand,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.warm.cream,
  },
  flagContainer: {
    marginBottom: spacing.sm,
  },
  languageText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
  },
  languageTextSelected: {
    color: colors.warm.ink,
    fontFamily: typography.fontFamily.semibold,
  },
  checkmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.warm.cream,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.ink,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.xs,
  },
  subscriptionInfo: {
    gap: spacing.md,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
  },
  subscriptionValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  subscriptionValuePro: {
    color: colors.pro,
  },
  upgradeButton: {
    backgroundColor: colors.pro,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  upgradeButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.cream,
  },
  manageButton: {
    backgroundColor: colors.warm.cream,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  manageButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.ink,
  },
  logoutContainer: {
    marginTop: spacing.xl,
  },
  logoutButton: {
    backgroundColor: colors.status.urgentWarm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.cream,
  },
});

export default ProfileSheet;
