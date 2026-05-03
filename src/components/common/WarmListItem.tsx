/**
 * WarmListItem — Emotional Intelligence list row.
 *
 * Cream surface row with optional leading icon, two-line title+subtitle,
 * trailing chevron or status pill. Soft pressed state. Use for lists where
 * tapping leads into a stress-relevant detail (case row, resource row,
 * attorney row, settings row).
 */

import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { borderRadius, colors, spacing, typography } from "@/styles/theme"

type Props = {
  title: string
  subtitle?: string
  meta?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  /** When true, row uses peach-tinted bg to gently flag attention. */
  attention?: boolean
  accessibilityLabel?: string
}

const PressableAnimated = Animated.createAnimatedComponent(Pressable)

export function WarmListItem({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onPress,
  style,
  attention,
  accessibilityLabel,
}: Props) {
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const bg = attention ? colors.warm.peach : colors.warm.cream
  const borderColor = attention ? colors.border.warmStrong : colors.border.warm

  return (
    <PressableAnimated
      onPress={onPress}
      onPressIn={() => {
        if (onPress) scale.value = withTiming(0.985, { duration: 120 })
      }}
      onPressOut={() => {
        if (onPress) scale.value = withTiming(1, { duration: 180 })
      }}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      style={[
        styles.row,
        { backgroundColor: bg, borderColor },
        animatedStyle,
        style,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {trailing}
      </View>
    </PressableAnimated>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  leading: {
    marginRight: spacing.base,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    marginTop: 2,
    lineHeight: typography.fontSize.sm * 1.45,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: spacing.sm,
  },
  meta: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkFaint,
    marginRight: spacing.sm,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
})
