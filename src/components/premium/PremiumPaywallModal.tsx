import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { GlassCard } from '../common/GlassCard';
import { useViewTranslation } from '../../i18n';
import { ForecastIcon } from '../../icons/ProIcons';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

export interface PremiumPaywallConfig {
  title?: string;
  subtitle?: string;
  description?: string;
  priceValue?: string;
  pricePeriod?: string;
  benefits?: string[];
  accentColor?: string;
  ctaLabel?: string;
  chatCtaLabel?: string;
  dismissLabel?: string;
  showSubscribeButton?: boolean;
  showChatButton?: boolean;
  onOpenChat?: () => void;
}

export interface PremiumPaywallModalProps extends PremiumPaywallConfig {
  visible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

const buildDefaultBenefits = (tx: (key: string, fallback: string) => string) => [
  tx('modal.benefits.forecast', 'Forecast y lectura inteligente de tus casos'),
  tx('modal.benefits.alerts', 'Alertas y recomendaciones premium'),
  tx('modal.benefits.community', 'Comunidad y contenido exclusivo Pro'),
  tx('modal.benefits.tools', 'Herramientas avanzadas para priorizar tu siguiente paso'),
];

export const PremiumPaywallModal: React.FC<PremiumPaywallModalProps> = ({
  visible,
  title,
  subtitle,
  description,
  priceValue = '$20',
  pricePeriod,
  benefits,
  accentColor = colors.pro,
  ctaLabel,
  chatCtaLabel,
  dismissLabel,
  showSubscribeButton = true,
  showChatButton = false,
  onOpenChat,
  onClose,
  onSubscribe,
}) => {
  const { t } = useViewTranslation('premium');
  const tx = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const resolvedBenefits = benefits ?? buildDefaultBenefits(tx);
  const resolvedTitle = title ?? tx('modal.title', 'InMiGreat Pro');
  const resolvedSubtitle = subtitle ?? tx('modal.subtitle', 'Desbloquea herramientas premium');
  const resolvedDescription = description
    ?? tx(
      'modal.description',
      'Accede a predicciones, inteligencia, aceleradores y beneficios exclusivos para avanzar tu proceso con mas contexto.',
    );
  const resolvedPricePeriod = pricePeriod ?? tx('modal.pricePeriod', '/ano');
  const resolvedCtaLabel = ctaLabel ?? tx('modal.actions.subscribe', 'Ver planes');
  const resolvedChatCtaLabel = chatCtaLabel ?? tx('modal.actions.chat', 'Hablar con la AI');
  const resolvedDismissLabel = dismissLabel ?? tx('modal.actions.dismiss', 'Ahora no');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <GlassCard style={styles.card}>
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}28`,
                },
              ]}
            >
              <ForecastIcon size={30} color={accentColor} />
            </View>
            <Text style={styles.title}>{resolvedTitle}</Text>
            <Text style={styles.subtitle}>{resolvedSubtitle}</Text>
            <Text style={styles.description}>{resolvedDescription}</Text>
          </View>

          <View style={styles.benefits}>
            {resolvedBenefits.map((benefit, index) => (
              <View key={`${benefit}_${index}`} style={styles.benefitRow}>
                <Text style={[styles.benefitCheck, { color: accentColor }]}>✓</Text>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={styles.pricing}>
            <Text style={[styles.priceValue, { color: accentColor }]}>{priceValue}</Text>
            <Text style={styles.pricePeriod}>{resolvedPricePeriod}</Text>
          </View>

          <View style={styles.actions}>
            {showSubscribeButton ? (
              <TouchableOpacity
                style={[styles.subscribeButton, { backgroundColor: accentColor }]}
                onPress={onSubscribe}
                activeOpacity={0.85}
              >
                <Text style={styles.subscribeButtonText}>{resolvedCtaLabel}</Text>
              </TouchableOpacity>
            ) : null}
            {showChatButton && onOpenChat ? (
              <TouchableOpacity
                style={[styles.chatButton, { borderColor: `${accentColor}55` }]}
                onPress={onOpenChat}
                activeOpacity={0.8}
              >
                <Text style={[styles.chatButtonText, { color: accentColor }]}>{resolvedChatCtaLabel}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.dismissButton} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.dismissButtonText}>{resolvedDismissLabel}</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    padding: spacing.xl,
    borderRadius: borderRadius['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  benefits: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  benefitCheck: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  benefitText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  pricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  priceValue: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
  },
  pricePeriod: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
  subscribeButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
  chatButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: colors.background.primary,
  },
  chatButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
  },
  dismissButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
  },
});

export default PremiumPaywallModal;