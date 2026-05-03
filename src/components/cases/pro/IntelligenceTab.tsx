/**
 * IntelligenceTab Component
 * 
 * Displays Pro intelligence features including:
 * - USCIS processing map showing service center speeds
 * - Speed indicators with color coding
 * - Processing time ranges for each center
 * - Visa Bulletin predictor with priority date status
 * 
 * Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';

import { GlassCard } from '../../common/GlassCard';
import { IntelIcon } from '../../../icons/ProIcons';
import { useViewTranslation } from '../../../i18n';
import { colors, spacing, typography } from '../../../styles/theme';

type CasesTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

export interface ServiceCenterData {
  name: string;
  speed: 'accelerating' | 'stable' | 'slow';
  averageWeeks: number;
  isUserCenter?: boolean;
}

export interface VisaBulletinData {
  priorityDate: string;
  currentDate: string;
  movement: 'forward' | 'backward' | 'stable';
  estimatedWait: string;
}

export interface IntelligenceTabProps {
  serviceCenters: ServiceCenterData[];
  visaBulletin: VisaBulletinData;
  userWaitComparison: string;
  style?: ViewStyle;
}

const getSpeedColor = (speed: ServiceCenterData['speed']): string => {
  switch (speed) {
    case 'accelerating': return colors.success;
    case 'stable': return colors.warning;
    case 'slow': return colors.error;
    default: return colors.text.secondary;
  }
};

const getSpeedLabel = (speed: ServiceCenterData['speed'], tx: CasesTranslate): string => {
  switch (speed) {
    case 'accelerating': return tx('intelligence.legend.accelerating', 'Acelerando');
    case 'stable': return tx('intelligence.legend.stable', 'Estable');
    case 'slow': return tx('intelligence.legend.slow', 'Lento');
    default: return speed;
  }
};

const getSpeedIcon = (speed: ServiceCenterData['speed']): string => {
  switch (speed) {
    case 'accelerating': return '⚡';
    case 'stable': return '➡️';
    case 'slow': return '🐢';
    default: return '•';
  }
};

const ServiceCenterCard: React.FC<{ center: ServiceCenterData; tx: CasesTranslate }> = ({ center, tx }) => {
  const speedColor = getSpeedColor(center.speed);
  const speedLabel = getSpeedLabel(center.speed, tx);
  const speedIcon = getSpeedIcon(center.speed);

  return (
    <View style={[styles.centerCard, center.isUserCenter && styles.centerCardHighlighted]}>
      <View style={styles.centerHeader}>
        <View style={styles.centerNameContainer}>
          <Text style={styles.centerName}>{center.name}</Text>
          {center.isUserCenter && (
            <View style={styles.userCenterBadge}>
              <Text style={styles.userCenterBadgeText}>{tx('intelligence.userCenter', 'Tu centro')}</Text>
            </View>
          )}
        </View>
        <View style={[styles.speedBadge, { backgroundColor: `${speedColor}15` }]}>
          <Text style={styles.speedIconText}>{speedIcon}</Text>
          <Text style={[styles.speedLabel, { color: speedColor }]}>{speedLabel}</Text>
        </View>
      </View>
      <Text style={styles.processingTime}>
        <Text style={styles.processingTimeValue}>{center.averageWeeks}</Text>
        <Text style={styles.processingTimeUnit}>{` ${tx('intelligence.weeksAverage', 'semanas promedio')}`}</Text>
      </Text>
      <View style={styles.speedBarBackground}>
        <View
          style={[
            styles.speedBarFill,
            {
              backgroundColor: speedColor,
              width: center.speed === 'accelerating' ? '85%' : center.speed === 'stable' ? '50%' : '25%',
            },
          ]}
        />
      </View>
    </View>
  );
};

const USMapVisualization: React.FC<{ centers: ServiceCenterData[]; tx: CasesTranslate }> = ({ centers, tx }) => {
  const centerPositions: Record<string, { x: number; y: number }> = {
    'Nebraska': { x: 140, y: 55 },
    'Texas': { x: 130, y: 100 },
    'California': { x: 45, y: 70 },
    'NBC': { x: 200, y: 60 },
    'Vermont': { x: 230, y: 35 },
    'Potomac': { x: 210, y: 65 },
  };

  return (
    <View style={styles.mapContainer}>
      <Svg width={280} height={140} viewBox="0 0 280 140">
        <Path
          d="M20,30 L60,25 L100,20 L140,22 L180,20 L220,25 L260,35 L265,60 L260,90 L240,100 L200,110 L160,115 L120,115 L80,110 L40,100 L25,80 L20,50 Z"
          fill={`${colors.pro}10`}
          stroke={colors.border.light}
          strokeWidth={1}
        />
        {centers.map((center) => {
          const pos = centerPositions[center.name];
          if (!pos) return null;
          const speedColor = getSpeedColor(center.speed);
          return (
            <React.Fragment key={center.name}>
              {center.isUserCenter && (
                <Circle cx={pos.x} cy={pos.y} r={14} fill="none" stroke={colors.pro} strokeWidth={2} strokeDasharray="4,2" />
              )}
              <Circle cx={pos.x} cy={pos.y} r={8} fill={speedColor} />
              <SvgText x={pos.x} y={pos.y + 20} fontSize={8} fill={colors.text.secondary} textAnchor="middle">
                {center.name.substring(0, 3).toUpperCase()}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>{tx('intelligence.legend.accelerating', 'Acelerando')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.legendText}>{tx('intelligence.legend.stable', 'Estable')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={styles.legendText}>{tx('intelligence.legend.slow', 'Lento')}</Text>
        </View>
      </View>
    </View>
  );
};

const getMovementIndicator = (movement: VisaBulletinData['movement'], tx: CasesTranslate) => {
  switch (movement) {
    case 'forward': return { icon: '↑', color: colors.success, label: tx('intelligence.movement.forward', 'Avanzando') };
    case 'backward': return { icon: '↓', color: colors.error, label: tx('intelligence.movement.backward', 'Retrocediendo') };
    case 'stable': return { icon: '→', color: colors.warning, label: tx('intelligence.movement.stable', 'Sin cambios') };
    default: return { icon: '•', color: colors.text.secondary, label: movement };
  }
};

export const IntelligenceTab: React.FC<IntelligenceTabProps> = ({
  serviceCenters,
  visaBulletin,
  userWaitComparison,
  style,
}) => {
  const { t } = useViewTranslation('cases');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const movement = getMovementIndicator(visaBulletin.movement, tx);

  return (
    <View style={[styles.container, style]}>
      <GlassCard style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <IntelIcon size={28} color={colors.pro} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{tx('intelligence.headerTitle', 'Inteligencia USCIS')}</Text>
            <Text style={styles.headerSubtitle}>{tx('intelligence.headerSubtitle', 'Datos de procesamiento en tiempo real')}</Text>
          </View>
        </View>
      </GlassCard>

      <GlassCard style={styles.mapCard}>
        <Text style={styles.sectionTitle}>{tx('intelligence.processingMap', 'Mapa de procesamiento')}</Text>
        <Text style={styles.sectionSubtitle}>{tx('intelligence.processingMapSubtitle', 'Velocidad por centro de servicio')}</Text>
        <USMapVisualization centers={serviceCenters} tx={tx} />
      </GlassCard>

      <View style={styles.centersSection}>
        <Text style={styles.sectionTitle}>{tx('intelligence.serviceCenters', 'Centros de servicio')}</Text>
        {serviceCenters.map((center) => (
          <ServiceCenterCard key={center.name} center={center} tx={tx} />
        ))}
      </View>

      <GlassCard style={styles.bulletinCard}>
        <View style={styles.bulletinHeader}>
          <Text style={styles.bulletinTitle}>{`📊 ${tx('intelligence.bulletinTitle', 'Visa Bulletin Predictor')}`}</Text>
          <View style={[styles.movementBadge, { backgroundColor: `${movement.color}15` }]}>
            <Text style={[styles.movementIcon, { color: movement.color }]}>{movement.icon}</Text>
            <Text style={[styles.movementLabel, { color: movement.color }]}>{movement.label}</Text>
          </View>
        </View>
        <View style={styles.bulletinRow}>
          <View style={styles.bulletinItem}>
            <Text style={styles.bulletinItemLabel}>{tx('intelligence.priorityDate', 'Tu fecha de prioridad')}</Text>
            <Text style={styles.bulletinItemValue}>{visaBulletin.priorityDate}</Text>
          </View>
          <View style={styles.bulletinDivider} />
          <View style={styles.bulletinItem}>
            <Text style={styles.bulletinItemLabel}>{tx('intelligence.currentBulletinDate', 'Fecha actual del boletin')}</Text>
            <Text style={styles.bulletinItemValue}>{visaBulletin.currentDate}</Text>
          </View>
        </View>
        <View style={styles.estimatedWaitContainer}>
          <Text style={styles.estimatedWaitLabel}>{tx('intelligence.estimatedWait', 'Tiempo estimado de espera')}</Text>
          <Text style={styles.estimatedWaitValue}>{visaBulletin.estimatedWait}</Text>
        </View>
        <View style={styles.comparisonContainer}>
          <Text style={styles.comparisonLabel}>{tx('intelligence.averageComparison', 'Comparacion con promedio')}</Text>
          <Text style={styles.comparisonValue}>{userWaitComparison}</Text>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.base },
  headerCard: { padding: spacing.lg, marginBottom: spacing.md },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  headerIconContainer: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: `${colors.pro}15`,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.text.primary, marginBottom: spacing.xs },
  headerSubtitle: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  sectionTitle: { fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.semibold, color: colors.text.primary, marginBottom: spacing.xs },
  sectionSubtitle: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md },
  mapCard: { padding: spacing.lg, marginBottom: spacing.md },
  mapContainer: { alignItems: 'center' },
  mapLegend: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md, gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.xs },
  legendText: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  centersSection: { marginBottom: spacing.md },
  centerCard: {
    backgroundColor: colors.background.secondary, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border.light,
  },
  centerCardHighlighted: { borderColor: colors.pro, borderWidth: 2, backgroundColor: `${colors.pro}05` },
  centerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  centerNameContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  centerName: { fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.semibold, color: colors.text.primary },
  userCenterBadge: { backgroundColor: `${colors.pro}15`, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 10, marginLeft: spacing.sm },
  userCenterBadgeText: { fontSize: typography.fontSize.xs, color: colors.pro, fontFamily: typography.fontFamily.medium },
  speedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 12 },
  speedIconText: { fontSize: 12, marginRight: 4 },
  speedLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  processingTime: { fontSize: typography.fontSize.sm, marginBottom: spacing.sm },
  processingTimeValue: { fontFamily: typography.fontFamily.bold, color: colors.text.primary },
  processingTimeUnit: { color: colors.text.secondary },
  speedBarBackground: { height: 4, backgroundColor: colors.background.tertiary, borderRadius: 2, overflow: 'hidden' },
  speedBarFill: { height: '100%', borderRadius: 2 },
  bulletinCard: { padding: spacing.lg },
  bulletinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  bulletinTitle: { fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.semibold, color: colors.text.primary },
  movementBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 12 },
  movementIcon: { fontSize: 14, fontFamily: typography.fontFamily.bold, marginRight: 4 },
  movementLabel: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  bulletinRow: { flexDirection: 'row', marginBottom: spacing.md },
  bulletinItem: { flex: 1 },
  bulletinDivider: { width: 1, backgroundColor: colors.border.light, marginHorizontal: spacing.md },
  bulletinItemLabel: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginBottom: spacing.xs },
  bulletinItemValue: { fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.semibold, color: colors.text.primary },
  estimatedWaitContainer: { backgroundColor: colors.background.secondary, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md },
  estimatedWaitLabel: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginBottom: spacing.xs },
  estimatedWaitValue: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold, color: colors.pro },
  comparisonContainer: { borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: spacing.md },
  comparisonLabel: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginBottom: spacing.xs },
  comparisonValue: { fontSize: typography.fontSize.sm, color: colors.text.primary },
});

export default IntelligenceTab;
