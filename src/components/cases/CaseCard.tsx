/**
 * CaseCard Component
 * 
 * Displays an immigration case card with all relevant information including:
 * - Case type icon and name
 * - Form number, current case status, receipt number, category
 * - Progress bar with gradient fill
 * - Days since last update
 * - "URGENTE" badge for high urgency cases
 * - Community link with active members
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.10, 6.11
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import { GlassCard } from '../common/GlassCard';
import { IconPill } from '../common/IconPill';
import {
  GreenCardIcon,
  WorkPermitIcon,
  AsylumIcon,
  CitizenshipIcon,
  VisaIcon,
} from '../../icons';
import type { IconProps } from '../../icons';
import { useViewTranslation } from '../../i18n';
import type { Case, CaseType } from '../../types/case';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { usePressAnimation } from '../../styles/animations';
import { createColoredGlassBackground, createGlassBackground } from '../../styles/glassmorphism';

type CasesTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

/**
 * Props interface for CaseCard component
 */
export interface CaseCardProps {
  /** The case data to display */
  case: Case;
  /** Whether the user has Pro subscription */
  isPro?: boolean;
  /** Callback when paywall should be shown */
  onPaywall?: () => void;
  /** Callback when community link is tapped */
  onCommunity?: () => void;
  /** Callback when share button is tapped */
  onShare?: () => void;
  /** Callback when the card is pressed */
  onPress?: () => void;
  /** Additional styles for the container */
  style?: ViewStyle;
}

/**
 * Map of case types to their display names
 */
const CASE_TYPE_NAMES: Record<CaseType, string> = {
  'I-485': 'Green Card',
  'I-765': 'Permiso de Trabajo',
  'EOIR': 'Caso EOIR',
  'I-130': 'Petición Familiar',
  'I-140': 'Petición de Empleo',
};

const CASE_TYPE_TRANSLATION_KEYS: Record<CaseType, { key: string; defaultValue: string }> = {
  'I-485': { key: 'caseCard.caseType.i485', defaultValue: 'Green Card' },
  'I-765': { key: 'caseCard.caseType.i765', defaultValue: 'Permiso de trabajo' },
  'EOIR': { key: 'caseCard.caseType.eoir', defaultValue: 'Caso EOIR' },
  'I-130': { key: 'caseCard.caseType.i130', defaultValue: 'Peticion familiar' },
  'I-140': { key: 'caseCard.caseType.i140', defaultValue: 'Peticion de empleo' },
};

/**
 * Map of case types to their icons
 */
const CASE_TYPE_ICONS: Record<CaseType, React.ComponentType<IconProps>> = {
  'I-485': GreenCardIcon,
  'I-765': WorkPermitIcon,
  'EOIR': AsylumIcon,
  'I-130': CitizenshipIcon,
  'I-140': VisaIcon,
};

/**
 * Map of case types to their accent colors
 */
const CASE_TYPE_COLORS: Record<CaseType, string> = {
  'I-485': colors.caseAccent.greenCard,
  'I-765': colors.caseAccent.workPermit,
  'EOIR': colors.caseAccent.asylum,
  'I-130': colors.caseAccent.citizenship,
  'I-140': colors.caseAccent.visa,
};

/**
 * Default community members count for display
 */
const DEFAULT_COMMUNITY_MEMBERS = 1247;

function formatAlienNumber(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return undefined;
  }

  return `A-${normalized.replace(/^A-?/i, '')}`;
}

function hasDisplayValue(value?: string): value is string {
  return Boolean(value?.trim());
}

function coalesceDisplayValue(...values: Array<string | undefined | null>): string | undefined {
  return values.find((value): value is string => hasDisplayValue(value ?? undefined));
}

function formatLocalReviewDate(
  lastCheckedAt: string | undefined,
  locale: string,
  tx: CasesTranslate,
): string {
  if (!lastCheckedAt) {
    return tx('caseCard.review.noRecord', 'Ultima revision Inmigreat · Sin registro');
  }

  const parsed = new Date(lastCheckedAt);
  if (Number.isNaN(parsed.getTime())) {
    return tx('caseCard.review.withDate', 'Ultima revision Inmigreat · {{date}}', { date: lastCheckedAt });
  }

  const formattedDate = parsed
    .toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .replace('.', '');

  return tx('caseCard.review.withDate', 'Ultima revision Inmigreat · {{date}}', {
    date: formattedDate,
  });
}

function formatCaseMilestoneDate(
  value: string | undefined,
  locale: string,
  tx: CasesTranslate,
): string {
  if (!value) {
    return tx('caseCard.noDate', 'Sin fecha');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed
    .toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .replace('.', '');
}

function formatCompactEoirAddress(value?: string): string | undefined {
  if (!hasDisplayValue(value)) {
    return undefined;
  }

  const normalized = value
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return normalized;
  }

  if (parts.length === 2) {
    return `${parts[0]}\n${parts[1]}`;
  }

  const head = parts.slice(0, -2).join(', ');
  const tail = parts.slice(-2).join(', ');

  return head ? `${head}\n${tail}` : tail;
}

/**
 * CaseCard Component
 * 
 * Renders a comprehensive case card with all case information.
 */
export const CaseCard: React.FC<CaseCardProps> = ({
  case: caseData,
  isPro = false,
  onPaywall,
  onCommunity,
  onShare,
  onPress,
  style,
}) => {
  void isPro;
  void onPaywall;
  void onShare;

  const { t, i18n } = useViewTranslation('cases');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();
  const isEoirCase = caseData.type === 'EOIR';
  const locale = i18n.resolvedLanguage === 'en'
    ? 'en-US'
    : i18n.resolvedLanguage === 'pt'
      ? 'pt-BR'
      : 'es-ES';

  const CaseIcon = CASE_TYPE_ICONS[caseData.type] || GreenCardIcon;
  const caseTypeNameConfig = CASE_TYPE_TRANSLATION_KEYS[caseData.type];
  const caseTypeName = caseTypeNameConfig
    ? tx(caseTypeNameConfig.key, caseTypeNameConfig.defaultValue)
    : CASE_TYPE_NAMES[caseData.type] || caseData.type;
  const accentColor = caseData.accentColor || CASE_TYPE_COLORS[caseData.type] || colors.accent;
  const progressGradientColors = [
    accentColor,
    adjustColorBrightness(accentColor, 20),
  ];
  const eoirInfo = caseData.eoir;
  const hasEoirHearing = Boolean(
    eoirInfo?.hearing?.scheduledAt ||
    eoirInfo?.hearing?.date,
  );
  const hasEoirAppeal = Boolean(
    eoirInfo?.appeal?.exists ||
    eoirInfo?.appeal?.pendingAtBia,
  );
  const hasEoirProceedingDecision = Boolean(
    eoirInfo?.proceeding?.decisionCode ||
    eoirInfo?.proceeding?.completedAt ||
    eoirInfo?.proceedingDecision,
  );
  const lastStatusChangeDate =
    caseData.timeline.find((step) => step.date && step.date !== tx('caseCard.noDate', 'Sin fecha'))?.date ??
    tx('caseCard.noDate', 'Sin fecha');
  const localReviewDate = formatLocalReviewDate(caseData.lastCheckedAt, locale, tx);
  const cardBackground = createGlassBackground(0.9);
  const cardBorder = createColoredGlassBackground(accentColor, 0.12);
  const cardStyle: ViewStyle = {
    ...styles.card,
    backgroundColor: cardBackground,
    borderColor: cardBorder,
    shadowColor: accentColor,
  };
  const statusHighlightBackground = createColoredGlassBackground(accentColor, 0.08);
  const statusHighlightBorder = createColoredGlassBackground(accentColor, 0.2);
  const eoirHeaderTitle = isEoirCase
    ? formatAlienNumber(eoirInfo?.alienNumber ?? caseData.receiptNumber) ?? caseTypeName
    : caseTypeName;
  const eoirHeaderSubtitle = isEoirCase
    ? eoirInfo?.personName ?? caseData.formNumber
    : caseData.formNumber;
  const eoirJudgeName = coalesceDisplayValue(
    eoirInfo?.hearing?.judgeName,
    eoirInfo?.proceeding?.judgeName,
    eoirInfo?.judgeName,
  );
  const eoirSummaryLabel = hasEoirHearing
    ? tx('caseCard.summary.judge', 'Juez')
    : tx('caseCard.summary.status', 'Estado');
  const eoirSummaryValue = hasEoirHearing
    ? eoirJudgeName ?? '-'
    : hasEoirAppeal
      ? tx('caseCard.summary.appeal', 'Apelacion')
      : hasEoirProceedingDecision
        ? tx('caseCard.summary.completed', 'Completado')
        : tx('caseCard.summary.waiting', 'En espera');
  const eoirHearingDate = hasEoirHearing
    ? formatCaseMilestoneDate(
      eoirInfo?.hearing?.scheduledAt ?? eoirInfo?.hearing?.date,
      locale,
      tx,
    )
    : undefined;
  const eoirHearingTime = coalesceDisplayValue(
    eoirInfo?.hearing?.time,
  );
  const eoirDecisionText = hasEoirAppeal
    ? coalesceDisplayValue(
      eoirInfo?.appeal?.decisionSummary,
      eoirInfo?.appeal?.decisionLabel,
      eoirInfo?.appealDecision,
    ) ?? tx('caseCard.summary.appealRegistered', 'Apelacion registrada')
    : hasEoirProceedingDecision
      ? coalesceDisplayValue(
        eoirInfo?.proceeding?.decisionSummary,
        eoirInfo?.proceeding?.decisionLabel,
        eoirInfo?.proceedingDecision,
      ) ?? caseData.status.label
      : tx('caseCard.summary.initial', 'Estado inicial');
  const eoirAddressText = formatCompactEoirAddress(
    coalesceDisplayValue(
      eoirInfo?.hearing?.location,
      eoirInfo?.hearing?.contactAddress,
      eoirInfo?.proceeding?.contactAddress,
      eoirInfo?.hearingLocation,
      eoirInfo?.courtName,
    ),
  );
  const eoirInfoText = hasEoirHearing
    ? eoirAddressText ?? '-'
    : hasEoirProceedingDecision
      ? formatCaseMilestoneDate(eoirInfo?.proceeding?.completedAt, locale, tx)
      : localReviewDate;
  const primaryLabel = isEoirCase
    ? tx('caseCard.labels.alienNumber', 'Alien Number')
    : tx('caseCard.labels.receiptNumber', 'Numero de recibo');
  const primaryValue = isEoirCase
    ? caseData.eoir?.alienNumber ?? caseData.receiptNumber
    : caseData.receiptNumber;
  const secondaryLabel = isEoirCase
    ? tx('caseCard.labels.court', 'Corte')
    : tx('caseCard.labels.lastUscisUpdate', 'Ultima actualizacion USCIS');
  const secondaryValue = isEoirCase
    ? caseData.eoir?.courtName ?? caseData.serviceCenter
    : lastStatusChangeDate;
  const tertiaryValue = isEoirCase
    ? formatCaseMilestoneDate(
      caseData.eoir?.nextHearingAt ?? caseData.eoir?.nextHearingDate,
      locale,
      tx,
    )
    : null;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      disabled={!onPress}
    >
      <Animated.View style={[animatedStyle, style]}>
        <GlassCard style={cardStyle} blurIntensity={6}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <IconPill
                Icon={CaseIcon}
                color={accentColor}
                backgroundColor={createColoredGlassBackground(accentColor, 0.15)}
                preset="medium"
              />
              <View style={styles.headerInfo}>
                <Text style={styles.caseTypeName}>{eoirHeaderTitle}</Text>
                <Text style={styles.formNumber}>{eoirHeaderSubtitle}</Text>
              </View>
            </View>

            {caseData.urgency === 'high' && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>{tx('caseCard.urgent', 'URGENTE')}</Text>
              </View>
            )}
          </View>

          <View style={styles.detailsContainer}>
            <View
              style={[
                styles.currentStatusCard,
                isEoirCase && styles.currentStatusCardCentered,
                {
                  backgroundColor: statusHighlightBackground,
                  borderColor: statusHighlightBorder,
                },
              ]}
            >
              <Text style={[styles.currentStatusText, isEoirCase && styles.currentStatusTextCentered]}>
                {caseData.status.label}
              </Text>
            </View>

            {isEoirCase ? (
              <>
                <View style={styles.eoirSummaryRow}>
                  <Text style={styles.detailLabel}>{eoirSummaryLabel}</Text>
                  <Text style={styles.detailValue} selectable>
                    {eoirSummaryValue}
                  </Text>
                </View>

                {hasEoirHearing ? (
                  <View style={styles.eoirHearingRow}>
                    <View style={[styles.eoirHearingPill, styles.eoirHearingPillLeft]}>
                      <Text style={styles.eoirHearingLabel}>{tx('caseCard.labels.date', 'Fecha')}</Text>
                      <Text style={styles.eoirHearingValue} numberOfLines={2} selectable>
                        {eoirHearingDate ?? '-'}
                      </Text>
                    </View>

                    <View style={[styles.eoirHearingPill, styles.eoirHearingPillRight]}>
                      <Text style={styles.eoirHearingLabel}>{tx('caseCard.labels.time', 'Hora')}</Text>
                      <Text style={styles.eoirHearingValue} numberOfLines={2} selectable>
                        {eoirHearingTime ?? '-'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.eoirDecisionCard}>
                    <Text style={styles.eoirDecisionText} numberOfLines={4} selectable>
                      {eoirDecisionText}
                    </Text>
                  </View>
                )}

                <View style={[styles.eoirInfoCard, hasEoirHearing && styles.eoirInfoCardAddress]}>
                  <Text
                    style={[styles.eoirInfoText, hasEoirHearing && styles.eoirInfoTextAddress]}
                    numberOfLines={3}
                    selectable
                  >
                    {eoirInfoText}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{primaryLabel}</Text>
                  <Text style={styles.detailValue} selectable>
                    {primaryValue}
                  </Text>
                </View>

                <View style={[styles.detailRow, !isEoirCase && styles.detailRowLast]}>
                  <Text style={styles.detailLabel}>{secondaryLabel}</Text>
                  <Text style={styles.detailValue} selectable>
                    {secondaryValue}
                  </Text>
                </View>

                {isEoirCase ? (
                  <View style={[styles.detailRow, styles.detailRowLast]}>
                    <Text style={styles.detailLabel}>{tx('caseCard.labels.nextHearing', 'Proxima audiencia')}</Text>
                    <Text style={styles.detailValue} selectable>
                      {tertiaryValue}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </View>

          {!isEoirCase ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>{tx('caseCard.labels.progress', 'Progreso')}</Text>
                <Text style={[styles.progressPercentage, { color: accentColor }]}>
                  {caseData.completionPercentage}%
                </Text>
              </View>
              <View style={styles.progressBarBackground}>
                <LinearGradient
                  colors={progressGradientColors as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBarFill,
                    { width: `${caseData.completionPercentage}%` },
                  ]}
                />
              </View>
            </View>
          ) : null}

          <View style={[styles.statusRow, isEoirCase && styles.statusRowCentered]}>
            <Text style={[styles.updateText, isEoirCase && styles.updateTextCentered]}>
              {localReviewDate}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.communityLink, { borderTopColor: createColoredGlassBackground(accentColor, 0.12) }]}
            onPress={onCommunity}
            activeOpacity={0.7}
          >
            <View style={styles.communityDot} />
            <Text style={styles.communityText}>
              <Text style={styles.communityCount}>{DEFAULT_COMMUNITY_MEMBERS}</Text>
              {` ${tx('caseCard.labels.communityActive', 'miembros activos en la comunidad')}`}
            </Text>
            <Text style={styles.communityArrow}>→</Text>
          </TouchableOpacity>
        </GlassCard>
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * Helper function to adjust color brightness
 */
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  caseTypeName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  formNumber: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  
  // Urgency badge styles - Requirement 6.10
  urgentBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
  },
  urgentBadgeText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  
  // Details styles
  detailsContainer: {
    marginBottom: spacing.md,
  },
  currentStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  currentStatusCardCentered: {
    justifyContent: 'center',
  },
  currentStatusText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    lineHeight: typography.fontSize.md * typography.lineHeight.snug,
  },
  currentStatusTextCentered: {
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  eoirSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  eoirHearingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  eoirHearingPill: {
    flex: 1,
    borderRadius: borderRadius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  eoirHearingPillLeft: {
    alignItems: 'flex-start',
  },
  eoirHearingPillRight: {
    alignItems: 'flex-end',
  },
  eoirHearingLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  eoirHearingValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  eoirDecisionCard: {
    borderRadius: borderRadius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  eoirDecisionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  eoirInfoCard: {
    borderRadius: borderRadius.medium,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  eoirInfoCardAddress: {
    alignItems: 'center',
  },
  eoirInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  eoirInfoTextAddress: {
    textAlign: 'center',
  },
  
  // Progress bar styles - Requirement 6.4
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  progressPercentage: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  
  // Status row styles
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusRowCentered: {
    justifyContent: 'center',
  },
  updateText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  updateTextCentered: {
    textAlign: 'center',
  },
  
  // Community link styles - Requirement 6.11
  communityLink: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  communityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  communityText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  communityCount: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  communityArrow: {
    fontSize: typography.fontSize.md,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },
});

export default CaseCard;
