/**
 * StatusPill Component
 * 
 * A pill-shaped badge component for displaying status indicators.
 * Supports custom colors for text, background, and border, with optional icon.
 * 
 * Validates: Requirements 6.5
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import type { IconProps } from '../../icons';
import { spacing, borderRadius, typography } from '../../styles/theme';

/**
 * Props interface for StatusPill component
 */
export interface StatusPillProps {
  /** Text label to display in the pill */
  label: string;
  /** Color of the text */
  color: string;
  /** Background color of the pill */
  backgroundColor: string;
  /** Border color of the pill */
  borderColor: string;
  /** Optional icon component to display before the label */
  icon?: React.ComponentType<IconProps>;
  /** Additional styles for the container */
  style?: ViewStyle;
  /** Additional styles for the label text */
  labelStyle?: TextStyle;
}

/**
 * Default icon size for the status pill
 */
const ICON_SIZE = 12;
const ICON_STROKE_WIDTH = 2;

/**
 * StatusPill Component
 * 
 * Renders a pill-shaped badge with text label and optional icon.
 * Used for displaying case status, tags, and other status indicators.
 * 
 * @example
 * ```tsx
 * <StatusPill
 *   label="En revisión"
 *   color="#C97A00"
 *   backgroundColor="rgba(201, 122, 0, 0.1)"
 *   borderColor="rgba(201, 122, 0, 0.3)"
 * />
 * 
 * <StatusPill
 *   label="Aprobado"
 *   color="#34C759"
 *   backgroundColor="rgba(34, 197, 89, 0.1)"
 *   borderColor="rgba(34, 197, 89, 0.3)"
 *   icon={CheckIcon}
 * />
 * ```
 */
export const StatusPill: React.FC<StatusPillProps> = ({
  label,
  color,
  backgroundColor,
  borderColor,
  icon: Icon,
  style,
  labelStyle,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {Icon && (
        <View style={styles.iconContainer}>
          <Icon size={ICON_SIZE} color={color} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
      )}
      <Text style={[styles.label, { color }, labelStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
  },
});

export default StatusPill;
