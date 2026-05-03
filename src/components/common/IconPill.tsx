/**
 * IconPill Component
 * 
 * A wrapper component that renders an icon inside a colored circular/pill background.
 * Used throughout the app for displaying icons with colored backgrounds.
 * 
 * Validates: Requirements 5.10
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import type { IconProps } from '../../icons';

/**
 * Size presets for the IconPill component
 */
export type IconPillSize = 'small' | 'medium' | 'large';

/**
 * Props interface for IconPill component
 */
export interface IconPillProps {
  /** The icon component to render */
  Icon: React.ComponentType<IconProps>;
  /** Color of the icon */
  color: string;
  /** Background color of the pill */
  backgroundColor: string;
  /** Size of the icon (default: 20) */
  size?: number;
  /** Stroke width of the icon (default: 1.8) */
  strokeWidth?: number;
  /** Border radius of the pill (default: full/circular) */
  borderRadius?: number;
  /** Preset size: 'small' | 'medium' | 'large' */
  preset?: IconPillSize;
  /** Additional styles for the container */
  style?: ViewStyle;
}

/**
 * Size preset configurations
 */
const SIZE_PRESETS: Record<IconPillSize, { iconSize: number; padding: number }> = {
  small: { iconSize: 16, padding: 6 },
  medium: { iconSize: 20, padding: 8 },
  large: { iconSize: 28, padding: 12 },
};

/**
 * Default values
 */
const DEFAULT_SIZE = 20;
const DEFAULT_STROKE_WIDTH = 1.8;

/**
 * IconPill Component
 * 
 * Renders an icon inside a colored circular/pill background.
 * Supports custom sizes, colors, and border radius.
 * 
 * @example
 * ```tsx
 * <IconPill
 *   Icon={GreenCardIcon}
 *   color={theme.colors.success}
 *   backgroundColor="rgba(34, 197, 94, 0.1)"
 * />
 * ```
 */
export const IconPill: React.FC<IconPillProps> = ({
  Icon,
  color,
  backgroundColor,
  size,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  borderRadius,
  preset,
  style,
}) => {
  // Determine icon size and padding based on preset or custom size
  const presetConfig = preset ? SIZE_PRESETS[preset] : null;
  const iconSize = size ?? (presetConfig?.iconSize ?? DEFAULT_SIZE);
  const padding = presetConfig?.padding ?? 8; // Default padding of 8

  // Calculate container size based on icon size and padding
  const containerSize = iconSize + padding * 2;

  // Use full border radius (circular) by default
  const finalBorderRadius = borderRadius ?? containerSize / 2;

  const containerStyle: ViewStyle = {
    width: containerSize,
    height: containerSize,
    borderRadius: finalBorderRadius,
    backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      <Icon size={iconSize} color={color} strokeWidth={strokeWidth} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default IconPill;
