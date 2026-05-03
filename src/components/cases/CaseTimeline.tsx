/**
 * CaseTimeline Component
 * 
 * Displays a timeline of case steps with:
 * - Completed steps: checkmark icon and completed styling
 * - Expand/collapse toggle to open or close the full timeline
 * - Step date and description
 * - Animated transitions when expanding/collapsing
 * 
 * Validates: Requirements 6.7, 6.8
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useViewTranslation } from '../../i18n';
import type { TimelineStep } from '../../types/case';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { ANIMATION_CONSTANTS, springConfigs } from '../../styles/animations';

/**
 * Props interface for CaseTimeline component
 */
export interface CaseTimelineProps {
  /** Array of timeline steps to display */
  steps: TimelineStep[];
  /** Accent color for the timeline (matches case accent) */
  accentColor?: string;
  /** Initial expanded state */
  initialExpanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
}

/**
 * Icon component for checkmark (done state)
 */
const CheckIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Icon component for chevron (expand/collapse)
 */
const ChevronIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9L12 15L18 9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Individual timeline step component
 */
interface TimelineStepItemProps {
  step: TimelineStep;
  isFirst: boolean;
  isLast: boolean;
  accentColor: string;
}

const TimelineStepItem: React.FC<TimelineStepItemProps> = ({
  step,
  isFirst,
  isLast,
  accentColor,
}) => {
  const getStepStyles = useCallback(() => {
    switch (step.state) {
      case 'done':
      case 'current':
        return {
          dotBackground: colors.warm.sage,
          dotBorder: colors.warm.sage,
          lineColor: colors.warm.sage,
          textColor: colors.warm.ink,
          dateColor: colors.warm.inkSoft,
          showCheck: true,
        };
      case 'future':
      default:
        return {
          dotBackground: colors.warm.cream,
          dotBorder: colors.border.warm,
          lineColor: colors.border.warm,
          textColor: colors.warm.inkFaint,
          dateColor: colors.warm.inkFaint,
          showCheck: false,
        };
    }
  }, [step.state]);

  const stepStyles = getStepStyles();

  return (
    <View style={styles.stepContainer}>
      {/* Timeline indicator column */}
      <View style={styles.indicatorColumn}>
        {/* Top line (hidden for first item) */}
        {!isFirst && (
          <View
            style={[
              styles.lineTop,
              { backgroundColor: step.state === 'done' ? accentColor : colors.border.light },
            ]}
          />
        )}

        {/* Dot indicator */}
        <View style={styles.dotContainer}>
          {/* Main dot */}
          <View
            style={[
              styles.dot,
              {
                backgroundColor: stepStyles.dotBackground,
                borderColor: stepStyles.dotBorder,
              },
            ]}
          >
            {stepStyles.showCheck && (
              <CheckIcon size={12} color={colors.warm.cream} />
            )}
          </View>
        </View>

        {/* Bottom line (hidden for last item) */}
        {!isLast && (
          <View
            style={[
              styles.lineBottom,
              { backgroundColor: stepStyles.lineColor },
            ]}
          />
        )}
      </View>

      {/* Content column */}
      <View style={styles.contentColumn}>
        <Text
          style={[
            styles.stepLabel,
            { color: stepStyles.textColor },
          ]}
        >
          {step.label}
        </Text>
        <Text
          style={[
            styles.stepDate,
            { color: stepStyles.dateColor },
          ]}
        >
          {step.date}
        </Text>
      </View>
    </View>
  );
};

/**
 * CaseTimeline Component
 * 
 * Renders a timeline of case steps with accordion-style expand/collapse functionality.
 */
export const CaseTimeline: React.FC<CaseTimelineProps> = ({
  steps,
  accentColor = colors.accent,
  initialExpanded = false,
  onExpandedChange,
}) => {
  const { t } = useViewTranslation('cases');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const rotationValue = useSharedValue(initialExpanded ? 1 : 0);

  const displaySteps = useMemo<TimelineStep[]>(
    () => steps.map((step, index) => ({
      ...step,
      state: step.state === 'future' ? 'done' : 'done',
    })),
    [steps],
  );

  const visibleSteps = useMemo(() => (isExpanded ? displaySteps : []), [displaySteps, isExpanded]);

  // Animated chevron rotation
  const chevronAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      rotationValue.value,
      [0, 1],
      [0, 180],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    // Configure layout animation
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        ANIMATION_CONSTANTS.DEFAULT_DURATION,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    rotationValue.value = withSpring(newExpanded ? 1 : 0, springConfigs.snappy);
    onExpandedChange?.(newExpanded);
  }, [isExpanded, rotationValue, onExpandedChange]);

  if (displaySteps.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Timeline header with toggle */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={isExpanded
          ? tx('timeline.collapse', 'Colapsar linea de tiempo')
          : tx('timeline.expand', 'Expandir linea de tiempo')}
        accessibilityState={{ expanded: isExpanded }}
      >
        <Text style={styles.headerTitle}>{tx('timeline.title', 'Linea de tiempo')}</Text>
        <View style={styles.headerRight}>
          {!isExpanded && (
            <Text style={styles.hiddenCount}>
              {tx('timeline.steps', '{{count}} pasos', { count: displaySteps.length })}
            </Text>
          )}
          <Animated.View style={chevronAnimatedStyle}>
            <ChevronIcon size={20} color={colors.warm.inkSoft} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Timeline steps */}
      {isExpanded && (
        <View style={styles.stepsContainer}>
          {visibleSteps.map((step, index) => {
            const actualIndex = displaySteps.findIndex(
              (timelineStep) => timelineStep.label === step.label && timelineStep.date === step.date,
            );

            return (
              <TimelineStepItem
                key={`${step.label}-${step.date}-${actualIndex}`}
                step={step}
                isFirst={index === 0}
                isLast={index === visibleSteps.length - 1}
                accentColor={accentColor}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warm.cream,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.warm,
    marginTop: spacing.sm,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hiddenCount: {
    fontSize: typography.fontSize.xs,
    color: colors.warm.inkFaint,
    marginRight: spacing.xs,
  },

  // Steps container
  stepsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },

  // Individual step styles
  stepContainer: {
    flexDirection: 'row',
    minHeight: 48,
  },

  // Indicator column (dots and lines)
  indicatorColumn: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  lineTop: {
    width: 2,
    flex: 1,
    minHeight: 8,
  },
  lineBottom: {
    width: 2,
    flex: 1,
    minHeight: 8,
  },
  dotContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content column
  contentColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  stepLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    marginBottom: 2,
  },
  stepDate: {
    fontSize: typography.fontSize.xs,
  },
});

export default CaseTimeline;
