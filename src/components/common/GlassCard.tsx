/**
 * GlassCard Component
 * 
 * A glassmorphism card component with semi-transparent background and blur effect.
 * Uses expo-blur for the backdrop blur effect.
 * 
 * Validates: Requirements 4.1, 4.2
 */

import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GLASS_CONSTANTS,
  createGlassBackground,
  createGlassBorder,
} from '../../styles/glassmorphism';
import { shadows } from '../../styles/theme';

export interface GlassCardProps {
  /** Content to render inside the card */
  children: React.ReactNode;
  /** Background opacity (0-1). Default: 0.74 per Requirement 4.1 */
  opacity?: number;
  /** Blur intensity (0-100). Default: 28 per Requirement 4.2 */
  blurIntensity?: number;
  /** Border radius. Default: 18 */
  borderRadius?: number;
  /** Additional styles to apply to the card */
  style?: StyleProp<ViewStyle>;
  /** Additional styles to apply to the inner content wrapper */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * GlassCard - A glassmorphism container component
 * 
 * Implements the glassmorphism design pattern with:
 * - Semi-transparent background (rgba(255,255,255,0.74) by default)
 * - Backdrop blur effect using expo-blur (intensity 28 by default)
 * - Configurable border radius (18 by default)
 * - Subtle border for glass edge effect
 * 
 * @example
 * ```tsx
 * <GlassCard>
 *   <Text>Content inside glass card</Text>
 * </GlassCard>
 * 
 * <GlassCard opacity={0.6} blurIntensity={40} borderRadius={24}>
 *   <Text>Custom glass card</Text>
 * </GlassCard>
 * ```
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  opacity = GLASS_CONSTANTS.DEFAULT_OPACITY,
  blurIntensity = GLASS_CONSTANTS.DEFAULT_BLUR_INTENSITY,
  borderRadius = GLASS_CONSTANTS.DEFAULT_BORDER_RADIUS,
  style,
  contentStyle,
}) => {
  const shouldRenderBlur = blurIntensity > 0;

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          backgroundColor: createGlassBackground(opacity),
          borderColor: createGlassBorder(GLASS_CONSTANTS.BORDER_OPACITY),
        },
        style,
      ]}
    >
      {shouldRenderBlur ? (
        <BlurView
          intensity={blurIntensity}
          tint="light"
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 1,
    ...shadows.md,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});

export default GlassCard;
