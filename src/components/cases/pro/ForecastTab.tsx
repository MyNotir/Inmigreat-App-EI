/**
 * ForecastTab Component
 * 
 * Displays Pro forecast features including:
 * - Estimated approval date range
 * - Confidence percentage with visual indicator
 * - Sparkline chart with probability curve
 * - Velocity indicator (faster/slower than average)
 * - Risk factors list
 * - Weeks remaining estimate
 * - Similar cases count and approval rate
 * 
 * Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';

import { GlassCard } from '../../common/GlassCard';
import { ForecastIcon } from '../../../icons/ProIcons';
import { useViewTranslation } from '../../../i18n';
import { colors, spacing, typography } from '../../../styles/theme';
import type { ForecastData } from '../../../types/case';

type CasesTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

export interface ForecastTabProps {
  /** Forecast data to display */
  data: ForecastData;
  /** Optional style overrides */
  style?: ViewStyle;
}

interface SparklinePoint {
  month: string;
  probability: number;
}

interface SparklineProps {
  data: SparklinePoint[];
  todayIndex: number;
  peakIndex: number;
  tx: CasesTranslate;
  width?: number;
  height?: number;
}

/**
 * Sparkline Chart Component
 * 
 * Displays a probability curve with markers for "today" and "peak probability"
 * Validates: Requirements 7.4, 7.5
 */
const SparklineChart: React.FC<SparklineProps> = ({
  data,
  todayIndex,
  peakIndex,
  tx,
  width = 280,
  height = 100,
}) => {
  const padding = { top: 20, right: 20, bottom: 30, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { pathD, points } = useMemo(() => {
    const maxProb = Math.max(...data.map((d) => d.probability));
    const minProb = Math.min(...data.map((d) => d.probability));
    const range = maxProb - minProb || 1;

    const pts = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((d.probability - minProb) / range) * chartHeight,
    }));

    // Create smooth curve using quadratic bezier
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpX = (prev.x + curr.x) / 2;
      path += ` Q ${cpX} ${prev.y} ${cpX} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${cpX} ${curr.y} ${curr.x} ${curr.y}`;
    }

    return { pathD: path, points: pts };
  }, [data, chartWidth, chartHeight, padding.left, padding.top]);

  const todayPoint = points[todayIndex];
  const peakPoint = points[peakIndex];

  return (
    <Svg width={width} height={height}>
      {/* Gradient area under curve */}
      <Path
        d={`${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`}
        fill={`${colors.pro}15`}
      />
      
      {/* Main curve */}
      <Path
        d={pathD}
        stroke={colors.pro}
        strokeWidth={2}
        fill="none"
      />

      {/* Today marker */}
      {todayPoint && (
        <>
          <Line
            x1={todayPoint.x}
            y1={todayPoint.y}
            x2={todayPoint.x}
            y2={padding.top + chartHeight}
            stroke={colors.text.tertiary}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          <Circle
            cx={todayPoint.x}
            cy={todayPoint.y}
            r={4}
            fill={colors.background.primary}
            stroke={colors.text.secondary}
            strokeWidth={2}
          />
          <SvgText
            x={todayPoint.x}
            y={padding.top + chartHeight + 15}
            fontSize={10}
            fill={colors.text.secondary}
            textAnchor="middle"
          >
            {tx('forecast.today', 'Hoy')}
          </SvgText>
        </>
      )}

      {/* Peak probability marker */}
      {peakPoint && (
        <>
          <Circle
            cx={peakPoint.x}
            cy={peakPoint.y}
            r={5}
            fill={colors.pro}
          />
          <SvgText
            x={peakPoint.x}
            y={peakPoint.y - 10}
            fontSize={10}
            fill={colors.pro}
            textAnchor="middle"
            fontWeight="600"
          >
            {tx('forecast.peak', 'Pico')}
          </SvgText>
        </>
      )}

      {/* Month labels */}
      {data.map((d, i) => {
        // Only show every other label to avoid crowding
        if (i % 2 !== 0 && i !== data.length - 1) return null;
        return (
          <SvgText
            key={d.month}
            x={points[i].x}
            y={height - 5}
            fontSize={9}
            fill={colors.text.tertiary}
            textAnchor="middle"
          >
            {d.month}
          </SvgText>
        );
      })}
    </Svg>
  );
};

/**
 * Confidence Indicator Component
 * 
 * Visual progress bar showing confidence percentage
 * Validates: Requirement 7.3
 */
const ConfidenceIndicator: React.FC<{ percentage: number; tx: CasesTranslate }> = ({ percentage, tx }) => {
  const getConfidenceColor = (pct: number) => {
    if (pct >= 80) return colors.success;
    if (pct >= 60) return colors.warning;
    return colors.error;
  };

  const color = getConfidenceColor(percentage);

  return (
    <View style={styles.confidenceContainer}>
      <View style={styles.confidenceHeader}>
        <Text style={styles.confidenceLabel}>{tx('forecast.confidence', 'Confianza')}</Text>
        <Text style={[styles.confidenceValue, { color }]}>{percentage}%</Text>
      </View>
      <View style={styles.confidenceBarBackground}>
        <View
          style={[
            styles.confidenceBarFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

/**
 * Metric Card Component
 * 
 * Displays a single metric with icon, label, and value
 */
const MetricCard: React.FC<{
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}> = ({ icon, label, value, subtext, color = colors.text.primary }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricIcon}>{icon}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    {subtext && <Text style={styles.metricSubtext}>{subtext}</Text>}
  </View>
);

/**
 * ForecastTab Component
 * 
 * Main component displaying all forecast information
 */
export const ForecastTab: React.FC<ForecastTabProps> = ({ data, style }) => {
  const { t } = useViewTranslation('cases');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  // Sample sparkline data - in production this would come from the API
  const sparklineData: SparklinePoint[] = useMemo(() => [
    { month: tx('forecast.months.mar', 'Mar'), probability: 5 },
    { month: tx('forecast.months.apr', 'Abr'), probability: 12 },
    { month: tx('forecast.months.may', 'May'), probability: 25 },
    { month: tx('forecast.months.jun', 'Jun'), probability: 45 },
    { month: tx('forecast.months.jul', 'Jul'), probability: 72 },
    { month: tx('forecast.months.aug', 'Ago'), probability: 85 },
    { month: tx('forecast.months.sep', 'Sep'), probability: 68 },
    { month: tx('forecast.months.oct', 'Oct'), probability: 40 },
  ], [tx]);

  // Determine velocity indicator styling
  const getVelocityStyle = (velocity: string) => {
    const lowerVelocity = velocity.toLowerCase();
    if (
      lowerVelocity.includes('rap') ||
      lowerVelocity.includes('faster') ||
      lowerVelocity.includes('mais rapido') ||
      lowerVelocity.includes('mais rapido')
    ) {
      return { color: colors.success, icon: '⚡' };
    }
    if (
      lowerVelocity.includes('lento') ||
      lowerVelocity.includes('slower') ||
      lowerVelocity.includes('devagar')
    ) {
      return { color: colors.warning, icon: '🐢' };
    }
    return { color: colors.text.secondary, icon: '➡️' };
  };

  const velocityStyle = getVelocityStyle(data.velocityMetric);

  return (
    <View style={[styles.container, style]}>
      {/* Date Range Card */}
      <GlassCard style={styles.dateRangeCard}>
        <View style={styles.dateRangeContent}>
          <View style={styles.dateRangeIconContainer}>
            <ForecastIcon size={28} color={colors.pro} />
          </View>
          <View style={styles.dateRangeTextContainer}>
            <Text style={styles.dateRangeLabel}>{tx('forecast.estimatedApprovalDate', 'Fecha estimada de aprobacion')}</Text>
            <Text style={styles.dateRangeValue}>{data.estimatedDateRange}</Text>
          </View>
        </View>
        <ConfidenceIndicator percentage={data.confidencePercentage} tx={tx} />
      </GlassCard>

      {/* Sparkline Chart Card */}
      <GlassCard style={styles.chartCard}>
        <Text style={styles.chartTitle}>{tx('forecast.probabilityCurveTitle', 'Curva de probabilidad')}</Text>
        <Text style={styles.chartSubtitle}>
          {tx('forecast.probabilityCurveSubtitle', 'Probabilidad de aprobacion por mes')}
        </Text>
        <View style={styles.chartContainer}>
          <SparklineChart
            data={sparklineData}
            todayIndex={2}
            peakIndex={5}
            tx={tx}
            width={300}
            height={120}
          />
        </View>
      </GlassCard>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {/* Velocity */}
        <GlassCard style={styles.metricCardContainer}>
          <MetricCard
            icon={velocityStyle.icon}
            label={tx('forecast.velocity', 'Velocidad')}
            value={data.velocityMetric}
            color={velocityStyle.color}
          />
        </GlassCard>

        {/* Risk Factors */}
        <GlassCard style={styles.metricCardContainer}>
          <MetricCard
            icon="⚠️"
            label={tx('forecast.riskFactors', 'Factores de riesgo')}
            value={data.riskFactors}
            subtext={tx('forecast.detected', 'detectados')}
            color={data.riskFactors > 0 ? colors.warning : colors.success}
          />
        </GlassCard>

        {/* Weeks Remaining */}
        <GlassCard style={styles.metricCardContainer}>
          <MetricCard
            icon="📅"
            label={tx('forecast.remainingTime', 'Tiempo restante')}
            value={data.weeksRemaining}
            subtext={tx('forecast.weeks', 'semanas')}
            color={colors.pro}
          />
        </GlassCard>

        {/* Similar Cases */}
        <GlassCard style={styles.metricCardContainer}>
          <MetricCard
            icon="👥"
            label={tx('forecast.similarCases', 'Casos similares')}
            value={data.similarCases}
            subtext={tx('forecast.sameStage', 'en misma etapa')}
            color={colors.text.primary}
          />
        </GlassCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.base,
  },
  
  // Date Range Card
  dateRangeCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  dateRangeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateRangeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.pro}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  dateRangeTextContainer: {
    flex: 1,
  },
  dateRangeLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  dateRangeValue: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },

  // Confidence Indicator
  confidenceContainer: {
    marginTop: spacing.sm,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  confidenceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  confidenceValue: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
  },
  confidenceBarBackground: {
    height: 6,
    backgroundColor: colors.background.primary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Chart Card
  chartCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  chartSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  metricCardContainer: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  metricCard: {
    padding: spacing.md,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  metricSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default ForecastTab;
