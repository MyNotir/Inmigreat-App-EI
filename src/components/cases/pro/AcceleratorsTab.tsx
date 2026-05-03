/**
 * AcceleratorsTab Component
 * 
 * Displays Pro accelerator features including:
 * - Detected accelerator opportunities with impact levels (Alto, Medio)
 * - Accelerator cards with expand/collapse for details
 * - Action buttons for each accelerator
 * - Mandamus alert when case exceeds processing thresholds
 * 
 * Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';

import { GlassCard } from '../../common/GlassCard';
import { AccelerateIcon } from '../../../icons/ProIcons';
import { DocLetterIcon, InquiryIcon, CongressIcon, MandamusIcon } from '../../../icons/UtilityIcons';
import { useViewTranslation } from '../../../i18n';
import { colors, spacing, typography } from '../../../styles/theme';

type CasesTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

export type ImpactLevel = 'high' | 'medium' | 'low';

export interface Accelerator {
  id: string;
  title: string;
  description: string;
  impact: ImpactLevel;
  details: string;
  actionLabel: string;
  icon: 'document' | 'inquiry' | 'congress';
}

export interface AcceleratorsTabProps {
  /** List of accelerator opportunities */
  accelerators: Accelerator[];
  /** Whether to show Mandamus alert */
  showMandamusAlert?: boolean;
  /** Days over processing threshold (for Mandamus) */
  daysOverThreshold?: number;
  /** Callback when accelerator action is pressed */
  onAcceleratorAction?: (acceleratorId: string) => void;
  /** Callback when Mandamus action is pressed */
  onMandamusAction?: () => void;
  /** Optional style overrides */
  style?: ViewStyle;
}

const getImpactColor = (impact: ImpactLevel): string => {
  switch (impact) {
    case 'high':
      return colors.success;
    case 'medium':
      return colors.warning;
    case 'low':
      return colors.warm.inkSoft;
    default:
      return colors.warm.inkSoft;
  }
};

const getImpactLabel = (impact: ImpactLevel, tx: CasesTranslate): string => {
  switch (impact) {
    case 'high':
      return tx('accelerators.impact.high', 'Alto');
    case 'medium':
      return tx('accelerators.impact.medium', 'Medio');
    case 'low':
      return tx('accelerators.impact.low', 'Bajo');
    default:
      return impact;
  }
};

const getAcceleratorIcon = (iconType: Accelerator['icon'], color: string, size: number = 24) => {
  switch (iconType) {
    case 'document':
      return <DocLetterIcon size={size} color={color} />;
    case 'inquiry':
      return <InquiryIcon size={size} color={color} />;
    case 'congress':
      return <CongressIcon size={size} color={color} />;
    default:
      return <DocLetterIcon size={size} color={color} />;
  }
};

interface AcceleratorCardProps {
  accelerator: Accelerator;
  isExpanded: boolean;
  onToggle: () => void;
  onAction: () => void;
  tx: CasesTranslate;
}

/**
 * AcceleratorCard Component
 * 
 * Individual accelerator card with expand/collapse functionality
 * Validates: Requirements 9.2, 9.6
 */
const AcceleratorCard: React.FC<AcceleratorCardProps> = ({
  accelerator,
  isExpanded,
  onToggle,
  onAction,
  tx,
}) => {
  const impactColor = getImpactColor(accelerator.impact);
  const impactLabel = getImpactLabel(accelerator.impact, tx);

  return (
    <GlassCard style={styles.acceleratorCard}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={styles.acceleratorHeader}
      >
        <View style={styles.acceleratorIconContainer}>
          {getAcceleratorIcon(accelerator.icon, colors.pro)}
        </View>
        <View style={styles.acceleratorContent}>
          <View style={styles.acceleratorTitleRow}>
            <Text style={styles.acceleratorTitle} numberOfLines={2}>
              {accelerator.title}
            </Text>
            <View style={[styles.impactBadge, { backgroundColor: `${impactColor}15` }]}>
              <Text style={[styles.impactLabel, { color: impactColor }]}>
                {impactLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.acceleratorDescription} numberOfLines={isExpanded ? undefined : 2}>
            {accelerator.description}
          </Text>
        </View>
        <View style={styles.expandIconContainer}>
          <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsLabel}>{tx('accelerators.details', 'Detalles')}</Text>
            <Text style={styles.detailsText}>{accelerator.details}</Text>
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAction}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>{accelerator.actionLabel}</Text>
          </TouchableOpacity>
        </View>
      )}
    </GlassCard>
  );
};

/**
 * MandamusAlert Component
 * 
 * Alert displayed when case exceeds processing thresholds
 * Validates: Requirement 9.7
 */
interface MandamusAlertProps {
  daysOverThreshold: number;
  onAction: () => void;
  tx: CasesTranslate;
}

const MandamusAlert: React.FC<MandamusAlertProps> = ({ daysOverThreshold, onAction, tx }) => (
  <GlassCard style={styles.mandamusCard}>
    <View style={styles.mandamusHeader}>
      <View style={styles.mandamusIconContainer}>
        <MandamusIcon size={28} color={colors.error} />
      </View>
      <View style={styles.mandamusContent}>
        <View style={styles.mandamusTitleRow}>
          <Text style={styles.mandamusTitle}>{tx('accelerators.mandamus.title', 'Accion Mandamus disponible')}</Text>
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>{tx('accelerators.mandamus.urgent', 'URGENTE')}</Text>
          </View>
        </View>
        <Text style={styles.mandamusDescription}>
          {tx(
            'accelerators.mandamus.description',
            'Tu caso ha excedido el tiempo de procesamiento estandar por {{count}} dias. Podrias calificar para una demanda Mandamus.',
            { count: daysOverThreshold },
          )}
        </Text>
      </View>
    </View>
    <View style={styles.mandamusDetails}>
      <Text style={styles.mandamusDetailsText}>
        {tx(
          'accelerators.mandamus.details',
          'Una demanda Mandamus es una accion legal que puede obligar a USCIS a tomar una decision sobre tu caso. Esta opcion esta disponible cuando el tiempo de espera excede significativamente los tiempos de procesamiento normales.',
        )}
      </Text>
    </View>
    <TouchableOpacity
      style={styles.mandamusButton}
      onPress={onAction}
      activeOpacity={0.8}
    >
      <Text style={styles.mandamusButtonText}>{tx('accelerators.mandamus.action', 'Consultar con abogado')}</Text>
    </TouchableOpacity>
  </GlassCard>
);

/**
 * AcceleratorsTab Component
 * 
 * Main component displaying all accelerator opportunities
 */
export const AcceleratorsTab: React.FC<AcceleratorsTabProps> = ({
  accelerators,
  showMandamusAlert = false,
  daysOverThreshold = 0,
  onAcceleratorAction,
  onMandamusAction,
  style,
}) => {
  const { t } = useViewTranslation('cases');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleAcceleratorAction = useCallback(
    (id: string) => {
      onAcceleratorAction?.(id);
    },
    [onAcceleratorAction]
  );

  const handleMandamusAction = useCallback(() => {
    onMandamusAction?.();
  }, [onMandamusAction]);

  return (
    <View style={[styles.container, style]}>
      {/* Header Card */}
      <GlassCard style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <AccelerateIcon size={28} color={colors.pro} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{tx('accelerators.headerTitle', 'Aceleradores')}</Text>
            <Text style={styles.headerSubtitle}>
              {tx('accelerators.opportunitiesDetected', '{{count}} oportunidades detectadas', {
                count: accelerators.length,
              })}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Mandamus Alert (if applicable) */}
      {showMandamusAlert && (
        <MandamusAlert
          daysOverThreshold={daysOverThreshold}
          onAction={handleMandamusAction}
          tx={tx}
        />
      )}

      {/* Accelerator Cards */}
      <View style={styles.acceleratorsSection}>
        <Text style={styles.sectionTitle}>{tx('accelerators.opportunitiesTitle', 'Oportunidades de aceleracion')}</Text>
        {accelerators.map((accelerator) => (
          <AcceleratorCard
            key={accelerator.id}
            accelerator={accelerator}
            isExpanded={expandedIds.has(accelerator.id)}
            onToggle={() => toggleExpanded(accelerator.id)}
            onAction={() => handleAcceleratorAction(accelerator.id)}
            tx={tx}
          />
        ))}
      </View>

      {/* Empty State */}
      {accelerators.length === 0 && !showMandamusAlert && (
        <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>{tx('accelerators.empty.title', 'Sin aceleradores disponibles')}</Text>
          <Text style={styles.emptyDescription}>
            {tx(
              'accelerators.empty.description',
              'No hemos detectado oportunidades de aceleracion para tu caso en este momento. Seguiremos monitoreando y te notificaremos cuando haya opciones disponibles.',
            )}
          </Text>
        </GlassCard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.base,
  },

  // Header Card
  headerCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.pro}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.ink,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
  },

  // Section
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.md,
  },
  acceleratorsSection: {
    marginBottom: spacing.md,
  },

  // Accelerator Card
  acceleratorCard: {
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  acceleratorHeader: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  acceleratorIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.pro}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  acceleratorContent: {
    flex: 1,
  },
  acceleratorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  acceleratorTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    flex: 1,
    marginRight: spacing.sm,
  },
  acceleratorDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  expandIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIcon: {
    fontSize: 10,
    color: colors.warm.inkFaint,
  },

  // Impact Badge
  impactBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  impactLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
  },

  // Expanded Content
  expandedContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.warm,
    marginTop: spacing.xs,
    paddingTop: spacing.md,
  },
  detailsContainer: {
    marginBottom: spacing.md,
  },
  detailsLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  detailsText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.ink,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  actionButton: {
    backgroundColor: colors.pro,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.warm.cream,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
  },

  // Mandamus Alert
  mandamusCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
    backgroundColor: `${colors.error}05`,
  },
  mandamusHeader: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  mandamusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  mandamusContent: {
    flex: 1,
  },
  mandamusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  mandamusTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.ink,
    marginRight: spacing.sm,
  },
  urgentBadge: {
    backgroundColor: colors.status.urgentWarm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.cream,
  },
  mandamusDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  mandamusHighlight: {
    fontFamily: typography.fontFamily.bold,
    color: colors.status.urgentWarm,
  },
  mandamusDetails: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  mandamusDetailsText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  mandamusButton: {
    backgroundColor: colors.status.urgentWarm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  mandamusButtonText: {
    color: colors.warm.cream,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
  },

  // Empty State
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
  },
});

export default AcceleratorsTab;
