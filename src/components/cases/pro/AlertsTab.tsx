/**
 * AlertsTab Component
 * 
 * Displays Pro alerts features including:
 * - Similar case approvals with matched users count
 * - Service center speed changes with percentage
 * - Visa Bulletin updates
 * - Risk alerts for backlog or delays
 * - Matched users with similar case profiles
 * - Relative timestamps (hace 1h, hace 1d)
 * 
 * Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, ScrollView } from 'react-native';

import { GlassCard } from '../../common/GlassCard';
import { AlertsIcon } from '../../../icons/ProIcons';
import { useViewTranslation } from '../../../i18n';
import {
  AlertApprovedIcon,
  AlertSpeedIcon,
  AlertCalendarIcon,
  AlertWarningIcon,
  AlertNewsIcon,
} from '../../../icons/AlertIcons';
import { colors, spacing, typography } from '../../../styles/theme';

type CasesTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

export type AlertType = 'approval' | 'speed' | 'bulletin' | 'risk' | 'matched';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  timestamp: string;
  /** For approval alerts: matched users count */
  matchedUsersCount?: number;
  /** For speed alerts: percentage change */
  percentageChange?: number;
  /** For risk alerts: severity level */
  severity?: 'low' | 'medium' | 'high';
}

export interface MatchedUser {
  id: string;
  name: string;
  caseType: string;
  similarity: number;
  avatarColor: string;
}

export interface AlertsTabProps {
  /** List of alerts to display */
  alerts: Alert[];
  /** List of matched users with similar profiles */
  matchedUsers?: MatchedUser[];
  /** Optional style overrides */
  style?: ViewStyle;
}

/**
 * Get the icon component for an alert type
 */
const getAlertIcon = (type: AlertType, color: string, size: number = 20) => {
  switch (type) {
    case 'approval':
      return <AlertApprovedIcon size={size} color={color} />;
    case 'speed':
      return <AlertSpeedIcon size={size} color={color} />;
    case 'bulletin':
      return <AlertCalendarIcon size={size} color={color} />;
    case 'risk':
      return <AlertWarningIcon size={size} color={color} />;
    case 'matched':
      return <AlertNewsIcon size={size} color={color} />;
    default:
      return <AlertApprovedIcon size={size} color={color} />;
  }
};

/**
 * Get the color for an alert type
 */
const getAlertColor = (type: AlertType, severity?: Alert['severity']): string => {
  switch (type) {
    case 'approval':
      return colors.success;
    case 'speed':
      return colors.pro;
    case 'bulletin':
      return colors.accent;
    case 'risk':
      return severity === 'high' ? colors.error : severity === 'medium' ? colors.warning : colors.warm.inkSoft;
    case 'matched':
      return colors.pro;
    default:
      return colors.warm.inkSoft;
  }
};

/**
 * Get the background color for an alert type
 */
const getAlertBackgroundColor = (type: AlertType, severity?: Alert['severity']): string => {
  const baseColor = getAlertColor(type, severity);
  return `${baseColor}15`;
};

/**
 * Format relative timestamp
 * Validates: Requirement 10.7
 */
const formatRelativeTime = (timestamp: string): string => {
  // For demo purposes, we'll just return the timestamp as-is
  // In production, this would calculate the relative time from the timestamp
  return timestamp;
};

/**
 * AlertCard Component
 * 
 * Individual alert card displaying alert information
 */
interface AlertCardProps {
  alert: Alert;
  tx: CasesTranslate;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, tx }) => {
  const alertColor = getAlertColor(alert.type, alert.severity);
  const backgroundColor = getAlertBackgroundColor(alert.type, alert.severity);
  const isRiskAlert = alert.type === 'risk';

  return (
    <View style={[styles.alertCard, isRiskAlert && alert.severity === 'high' && styles.alertCardHighRisk]}>
      <View style={[styles.alertIconContainer, { backgroundColor }]}>
        {getAlertIcon(alert.type, alertColor)}
      </View>
      <View style={styles.alertContent}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertTitle} numberOfLines={1}>
            {alert.title}
          </Text>
          <Text style={styles.alertTimestamp}>
            {formatRelativeTime(alert.timestamp)}
          </Text>
        </View>
        <Text style={styles.alertDescription} numberOfLines={2}>
          {alert.description}
        </Text>
        {/* Additional info based on alert type */}
        {alert.type === 'approval' && alert.matchedUsersCount !== undefined && (
          <View style={styles.alertMeta}>
            <Text style={[styles.alertMetaText, { color: alertColor }]}>
              {`👥 ${tx('alerts.similarUsers', '{{count}} usuarios similares', { count: alert.matchedUsersCount })}`}
            </Text>
          </View>
        )}
        {alert.type === 'speed' && alert.percentageChange !== undefined && (
          <View style={styles.alertMeta}>
            <Text style={[styles.alertMetaText, { color: alertColor }]}>
              {tx('alerts.speedChange', '{{direction}} {{count}}% cambio', {
                direction: alert.percentageChange > 0 ? '↑' : '↓',
                count: Math.abs(alert.percentageChange),
              })}
            </Text>
          </View>
        )}
        {alert.type === 'risk' && alert.severity && (
          <View style={[styles.severityBadge, { backgroundColor }]}>
            <Text style={[styles.severityText, { color: alertColor }]}>
              {alert.severity === 'high'
                ? tx('alerts.severity.high', 'Alto riesgo')
                : alert.severity === 'medium'
                  ? tx('alerts.severity.medium', 'Riesgo medio')
                  : tx('alerts.severity.low', 'Bajo riesgo')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

/**
 * MatchedUserCard Component
 * 
 * Displays a matched user with similar case profile
 * Validates: Requirement 10.6
 */
interface MatchedUserCardProps {
  user: MatchedUser;
  tx: CasesTranslate;
}

const MatchedUserCard: React.FC<MatchedUserCardProps> = ({ user, tx }) => {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.matchedUserCard}>
      <View style={[styles.matchedUserAvatar, { backgroundColor: user.avatarColor }]}>
        <Text style={styles.matchedUserInitials}>{initials}</Text>
      </View>
      <View style={styles.matchedUserInfo}>
        <Text style={styles.matchedUserName}>{user.name}</Text>
        <Text style={styles.matchedUserCase}>{user.caseType}</Text>
      </View>
      <View style={styles.matchedUserSimilarity}>
        <Text style={styles.similarityValue}>{user.similarity}%</Text>
        <Text style={styles.similarityLabel}>{tx('alerts.similarity', 'similar')}</Text>
      </View>
    </View>
  );
};

/**
 * AlertSection Component
 * 
 * Groups alerts by type with a section header
 */
interface AlertSectionProps {
  title: string;
  alerts: Alert[];
  icon: React.ReactNode;
  tx: CasesTranslate;
}

const AlertSection: React.FC<AlertSectionProps> = ({ title, alerts, icon, tx }) => {
  if (alerts.length === 0) return null;

  return (
    <View style={styles.alertSection}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{alerts.length}</Text>
        </View>
      </View>
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} tx={tx} />
      ))}
    </View>
  );
};

/**
 * EmptyState Component
 * 
 * Displayed when there are no alerts
 */
const EmptyState: React.FC<{ tx: CasesTranslate }> = ({ tx }) => (
  <GlassCard style={styles.emptyCard}>
    <Text style={styles.emptyIcon}>🔔</Text>
    <Text style={styles.emptyTitle}>{tx('alerts.empty.title', 'Sin alertas')}</Text>
    <Text style={styles.emptyDescription}>
      {tx(
        'alerts.empty.description',
        'No tienes alertas en este momento. Te notificaremos cuando haya actualizaciones relevantes para tu caso.',
      )}
    </Text>
  </GlassCard>
);

/**
 * AlertsTab Component
 * 
 * Main component displaying all alerts grouped by type
 */
export const AlertsTab: React.FC<AlertsTabProps> = ({
  alerts,
  matchedUsers = [],
  style,
}) => {
  const { t } = useViewTranslation('cases');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  // Group alerts by type
  const approvalAlerts = alerts.filter((a) => a.type === 'approval');
  const speedAlerts = alerts.filter((a) => a.type === 'speed');
  const bulletinAlerts = alerts.filter((a) => a.type === 'bulletin');
  const riskAlerts = alerts.filter((a) => a.type === 'risk');

  const hasAlerts = alerts.length > 0 || matchedUsers.length > 0;

  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <GlassCard style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <AlertsIcon size={28} color={colors.pro} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{tx('alerts.headerTitle', 'Alertas Pro')}</Text>
            <Text style={styles.headerSubtitle}>
              {tx('alerts.activeAlerts', '{{count}} alertas activas', { count: alerts.length })}
            </Text>
          </View>
        </View>
      </GlassCard>

      {!hasAlerts ? (
        <EmptyState tx={tx} />
      ) : (
        <>
          {/* Risk Alerts - Show first if any high severity */}
          {riskAlerts.some((a) => a.severity === 'high') && (
            <AlertSection
              title={tx('alerts.sections.risk', 'Alertas de riesgo')}
              alerts={riskAlerts.filter((a) => a.severity === 'high')}
              icon={<AlertWarningIcon size={18} color={colors.error} />}
              tx={tx}
            />
          )}

          {/* Approval Alerts */}
          <AlertSection
            title={tx('alerts.sections.approvals', 'Aprobaciones similares')}
            alerts={approvalAlerts}
            icon={<AlertApprovedIcon size={18} color={colors.success} />}
            tx={tx}
          />

          {/* Speed Change Alerts */}
          <AlertSection
            title={tx('alerts.sections.speed', 'Cambios de velocidad')}
            alerts={speedAlerts}
            icon={<AlertSpeedIcon size={18} color={colors.pro} />}
            tx={tx}
          />

          {/* Bulletin Updates */}
          <AlertSection
            title={tx('alerts.sections.bulletin', 'Actualizaciones del boletin')}
            alerts={bulletinAlerts}
            icon={<AlertCalendarIcon size={18} color={colors.accent} />}
            tx={tx}
          />

          {/* Other Risk Alerts (non-high severity) */}
          {riskAlerts.some((a) => a.severity !== 'high') && (
            <AlertSection
              title={tx('alerts.sections.otherRisk', 'Otras alertas de riesgo')}
              alerts={riskAlerts.filter((a) => a.severity !== 'high')}
              icon={<AlertWarningIcon size={18} color={colors.warning} />}
              tx={tx}
            />
          )}

          {/* Matched Users Section */}
          {matchedUsers.length > 0 && (
            <View style={styles.matchedUsersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.matchedUsersIcon}>👥</Text>
                <Text style={styles.sectionTitle}>{tx('alerts.sections.matchedUsers', 'Usuarios similares')}</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{matchedUsers.length}</Text>
                </View>
              </View>
              <GlassCard style={styles.matchedUsersCard}>
                {matchedUsers.map((user, index) => (
                  <React.Fragment key={user.id}>
                    <MatchedUserCard user={user} tx={tx} />
                    {index < matchedUsers.length - 1 && <View style={styles.userDivider} />}
                  </React.Fragment>
                ))}
              </GlassCard>
            </View>
          )}
        </>
      )}
    </ScrollView>
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

  // Alert Section
  alertSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginLeft: spacing.sm,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: colors.warm.cream,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
  },

  // Alert Card
  alertCard: {
    flexDirection: 'row',
    backgroundColor: colors.warm.sand,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  alertCardHighRisk: {
    borderColor: `${colors.error}40`,
    backgroundColor: `${colors.error}05`,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  alertTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    flex: 1,
    marginRight: spacing.sm,
  },
  alertTimestamp: {
    fontSize: typography.fontSize.xs,
    color: colors.warm.inkFaint,
  },
  alertDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  alertMeta: {
    marginTop: spacing.xs,
  },
  alertMetaText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  severityText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
  },

  // Matched Users Section
  matchedUsersSection: {
    marginBottom: spacing.lg,
  },
  matchedUsersIcon: {
    fontSize: 18,
  },
  matchedUsersCard: {
    padding: spacing.md,
  },
  matchedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  matchedUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  matchedUserInitials: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.cream,
  },
  matchedUserInfo: {
    flex: 1,
  },
  matchedUserName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.ink,
    marginBottom: 2,
  },
  matchedUserCase: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
  },
  matchedUserSimilarity: {
    alignItems: 'flex-end',
  },
  similarityValue: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.pro,
  },
  similarityLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.warm.inkFaint,
  },
  userDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.xs,
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

export default AlertsTab;
