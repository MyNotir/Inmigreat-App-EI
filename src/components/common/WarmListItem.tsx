/**
 * List row primitive for the EI redesign.
 *
 * Default brand cool. Pass `tone="warm"` for stress contexts.
 * Pass `attention=true` to flag a row that needs the user's eye.
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
  attention?: boolean
  tone?: "brand" | "warm"
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
  tone = "brand",
  accessibilityLabel,
}: Props) {
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const isBrand = tone === "brand"
  const bg = attention
    ? (isBrand ? `${colors.accent}10` : colors.warm.peach)
    : (isBrand ? colors.background.primary : colors.warm.cream)
  const borderColor = attention
    ? (isBrand ? colors.accent : colors.border.warmStrong)
    : (isBrand ? colors.border.light : colors.border.warm)
  const titleColor = isBrand ? colors.text.primary : colors.warm.ink
  const subtitleColor = isBrand ? colors.text.secondary : colors.warm.inkSoft
  const metaColor = isBrand ? colors.text.tertiary : colors.warm.inkFaint

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
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {meta ? <Text style={[styles.meta, { color: metaColor }]}>{meta}</Text> : null}
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
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
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
    marginRight: spacing.sm,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
})
