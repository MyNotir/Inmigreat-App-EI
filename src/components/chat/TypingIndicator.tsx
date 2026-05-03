/**
 * TypingIndicator — Emotional Intelligence redesign.
 *
 * Warm bubble, three clay dots breathing slowly (no jerky bounce). The
 * pacing matters — fast pulsing reads as anxiety. Lexi pondering should
 * read as 'taking care to answer right.'
 */

import React, { useEffect } from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"

import { InmigreatLogo } from "../../icons"
import { borderRadius, colors, spacing } from "../../styles/theme"

export interface TypingIndicatorProps {
  isVisible?: boolean
  style?: ViewStyle
}

const DOT_DURATION = 580
const STAGGER = 200
const DOT_SIZE = 7

const AnimatedDot: React.FC<{ delay: number }> = ({ delay }) => {
  const opacity = useSharedValue(0.3)
  const translateY = useSharedValue(0)

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: DOT_DURATION / 2, easing: Easing.out(Easing.quad) }),
          withTiming(0.3, { duration: DOT_DURATION / 2, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    )
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: DOT_DURATION / 2, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: DOT_DURATION / 2, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    )
  }, [delay, opacity, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return <Animated.View style={[styles.dot, animatedStyle]} />
}

const AssistantAvatar: React.FC = () => (
  <View style={styles.avatar}>
    <InmigreatLogo size={18} strokeWidth={2} />
  </View>
)

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible = true, style }) => {
  if (!isVisible) return null

  return (
    <View style={[styles.container, style]}>
      <AssistantAvatar />
      <View style={styles.bubble}>
        <View style={styles.dotsRow}>
          <AnimatedDot delay={0} />
          <AnimatedDot delay={STAGGER} />
          <AnimatedDot delay={STAGGER * 2} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  bubble: {
    backgroundColor: colors.background.primary,
    borderColor: colors.border.light,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: 6,
    minHeight: 36,
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.accent,
  },
})

export default TypingIndicator
