/**
 * TypingIndicator Component
 * 
 * Displays animated dots during AI response generation.
 * Shows a left-aligned bubble with the InMiGreat avatar and three
 * bouncing dots to indicate the AI is typing.
 * 
 * Validates: Requirements 13.5
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { GlassCard } from '../common/GlassCard';
import { InmigreatLogo } from '../../icons';
import { colors, spacing, borderRadius } from '../../styles/theme';

/**
 * Props interface for TypingIndicator component
 */
export interface TypingIndicatorProps {
  /** Whether the typing indicator is visible */
  isVisible?: boolean;
  /** Additional styles for the container */
  style?: ViewStyle;
}

/**
 * Animation constants for the typing dots
 */
const DOT_ANIMATION = {
  /** Duration of one bounce cycle in ms */
  DURATION: 400,
  /** Delay between each dot's animation start */
  STAGGER_DELAY: 150,
  /** Maximum vertical translation for bounce */
  BOUNCE_HEIGHT: -6,
  /** Dot size */
  DOT_SIZE: 8,
  /** Gap between dots */
  DOT_GAP: 4,
} as const;

/**
 * Single animated dot component
 */
interface AnimatedDotProps {
  /** Delay before starting animation */
  delay: number;
}

const AnimatedDot: React.FC<AnimatedDotProps> = ({ delay }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    // Start the bouncing animation with staggered delay
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(DOT_ANIMATION.BOUNCE_HEIGHT, {
            duration: DOT_ANIMATION.DURATION / 2,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(0, {
            duration: DOT_ANIMATION.DURATION / 2,
            easing: Easing.in(Easing.cubic),
          })
        ),
        -1, // Infinite repeat
        false // Don't reverse
      )
    );

    // Animate opacity for a subtle pulse effect
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: DOT_ANIMATION.DURATION / 2,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(0.4, {
            duration: DOT_ANIMATION.DURATION / 2,
            easing: Easing.in(Easing.cubic),
          })
        ),
        -1,
        false
      )
    );
  }, [delay, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

/**
 * Avatar component for the typing indicator
 */
const AssistantAvatar: React.FC = () => (
  <View style={styles.avatar}>
    <InmigreatLogo size={20} strokeWidth={2} />
  </View>
);

/**
 * TypingIndicator Component
 * 
 * Displays a typing indicator with animated dots when the AI is generating
 * a response. The indicator appears left-aligned with the InMiGreat avatar,
 * matching the style of assistant messages.
 * 
 * @example
 * ```tsx
 * // Show typing indicator while AI is generating response
 * {isLoading && <TypingIndicator isVisible={true} />}
 * 
 * // With custom styling
 * <TypingIndicator 
 *   isVisible={isGenerating} 
 *   style={{ marginTop: 8 }} 
 * />
 * ```
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isVisible = true,
  style,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <AssistantAvatar />
      <GlassCard
        style={styles.bubble}
        opacity={0.85}
        blurIntensity={20}
      >
        <View style={styles.dotsContainer}>
          <AnimatedDot delay={0} />
          <AnimatedDot delay={DOT_ANIMATION.STAGGER_DELAY} />
          <AnimatedDot delay={DOT_ANIMATION.STAGGER_DELAY * 2} />
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomLeftRadius: borderRadius.small,
    minHeight: 40,
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DOT_ANIMATION.DOT_GAP,
    height: DOT_ANIMATION.DOT_SIZE + Math.abs(DOT_ANIMATION.BOUNCE_HEIGHT),
    paddingTop: Math.abs(DOT_ANIMATION.BOUNCE_HEIGHT),
  },
  dot: {
    width: DOT_ANIMATION.DOT_SIZE,
    height: DOT_ANIMATION.DOT_SIZE,
    borderRadius: DOT_ANIMATION.DOT_SIZE / 2,
    backgroundColor: colors.text.secondary,
  },
});

export default TypingIndicator;
