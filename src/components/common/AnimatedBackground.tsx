/**
 * AnimatedBackground Component
 * 
 * A full-screen animated gradient background component.
 * Uses expo-linear-gradient for the gradient and react-native-reanimated
 * for smooth color animations.
 * 
 * Validates: Requirements 4.3, 4.4
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors as themeColors } from '../../styles/theme';

/**
 * Type for gradient colors - must have at least 2 colors
 */
type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

/**
 * Default gradient colors — warm-minimalism EI palette.
 * Cream → sand → cream cycle gives surfaces a paper-feel.
 */
export const DEFAULT_GRADIENT_COLORS: GradientColors = [
  themeColors.warm.cream,
  themeColors.warm.sand,
  themeColors.warm.cream,
  themeColors.warm.peach,
] as const;

export const ONBOARDING_GRADIENT_COLORS: GradientColors = [
  themeColors.warm.cream,
  themeColors.warm.sand,
  themeColors.warm.cream,
  themeColors.warm.peach,
] as const;

/**
 * Animation duration for color transitions (in milliseconds)
 */
const ANIMATION_DURATION = 8000;

export interface AnimatedBackgroundProps {
  /** Custom gradient colors array (minimum 2 colors). Defaults to the spec colors. */
  colors?: GradientColors;
  /** Children to render on top of the background */
  children?: React.ReactNode;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * AnimatedBackground - Full-screen animated gradient background
 * 
 * Implements an animated gradient background with smooth color transitions.
 * The gradient colors shift through the provided color array creating a
 * subtle, continuous animation effect.
 * 
 * @example
 * ```tsx
 * // Default colors
 * <AnimatedBackground>
 *   <YourContent />
 * </AnimatedBackground>
 * 
 * // Custom colors
 * <AnimatedBackground colors={['#ff0000', '#00ff00', '#0000ff']}>
 *   <YourContent />
 * </AnimatedBackground>
 * ```
 */
export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  colors = DEFAULT_GRADIENT_COLORS,
  children,
}) => {
  const progress = useSharedValue(0);
  const baseBackgroundColor = typeof colors[0] === 'string' ? colors[0] : undefined;

  useEffect(() => {
    // Start the continuous animation
    progress.value = withRepeat(
      withTiming(1, {
        duration: ANIMATION_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repeat
      true // Reverse on each iteration for smooth back-and-forth
    );
  }, [progress]);

  // Create animated styles for the first gradient layer
  const animatedStyle1 = useAnimatedStyle(() => {
    return {
      opacity: 1 - progress.value * 0.3,
    };
  });

  // Create animated styles for the second gradient layer (shifted colors)
  const animatedStyle2 = useAnimatedStyle(() => {
    return {
      opacity: progress.value * 0.5 + 0.5,
    };
  });

  // Shift colors for the second layer to create animation effect
  // Ensure we maintain the tuple type with at least 2 colors
  const shiftedColors = useMemo((): GradientColors => {
    const colorsArray = [...colors];
    const shifted = [...colorsArray.slice(2), ...colorsArray.slice(0, 2)];
    // Ensure we have at least 2 colors for the gradient
    if (shifted.length < 2) {
      return [shifted[0] || colors[0], shifted[0] || colors[0]] as GradientColors;
    }
    return shifted as unknown as GradientColors;
  }, [colors]);

  return (
    <View style={[styles.container, baseBackgroundColor ? { backgroundColor: baseBackgroundColor } : null]}>
      {/* Base gradient layer */}
      <AnimatedLinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, animatedStyle1]}
      />
      
      {/* Animated overlay gradient layer */}
      <AnimatedLinearGradient
        colors={shiftedColors}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.gradient, styles.overlay, animatedStyle2]}
      />
      
      {/* Content container */}
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  overlay: {
    zIndex: 1,
  },
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 2,
  },
});

export default AnimatedBackground;
