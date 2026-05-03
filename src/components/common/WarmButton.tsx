/**
 * Button primitive for the EI redesign.
 *
 * Default is BRAND COOL: navy primary, light secondary, brand-tinted ghost.
 * Pass `tone="urgent"` for stress action (urgent burnt-orange), `tone="sage"`
 * for calm success.
 */

import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { borderRadius, colors, spacing, typography } from "@/styles/theme"

type Variant = "primary" | "secondary" | "ghost"
type Tone = "default" | "brand" | "urgent" | "sage" | "pro"
type Size = "sm" | "md" | "lg"

type Props = {
  label: string
  onPress: () => void
  variant?: Variant
  tone?: Tone
  size?: Size
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  fullWidth?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
}

const PressableAnimated = Animated.createAnimatedComponent(Pressable)

export function WarmButton({
  label,
  onPress,
  variant = "primary",
  tone = "brand",
  size = "md",
  leadingIcon,
  trailingIcon,
  disabled,
  style,
  fullWidth,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  const accent =
    tone === "urgent"
      ? colors.status.urgentWarm
      : tone === "sage"
        ? colors.warm.sage
        : tone === "pro"
          ? colors.pro
          : tone === "default"
            ? colors.warm.clay
            : colors.accent

  const labelColor =
    variant === "primary" ? '#FFFFFF' : accent

  const fillColor =
    variant === "primary"
      ? accent
      : variant === "secondary"
        ? colors.background.primary
        : "transparent"

  const borderColor =
    variant === "secondary"
      ? accent
      : variant === "primary"
        ? accent
        : "transparent"

  const padV =
    size === "sm" ? spacing.sm : size === "lg" ? spacing.base : spacing.md
  const padH =
    size === "sm" ? spacing.base : size === "lg" ? spacing.xl : spacing.lg
  const fontSize =
    size === "sm"
      ? typography.fontSize.sm
      : size === "lg"
        ? typography.fontSize.md
        : typography.fontSize.base

  return (
    <PressableAnimated
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 120 })
        opacity.value = withTiming(0.85, { duration: 120 })
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 180 })
        opacity.value = withTiming(1, { duration: 180 })
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        {
          backgroundColor: fillColor,
          borderColor,
          paddingVertical: padV,
          paddingHorizontal: padH,
        },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      <View style={styles.row}>
        {leadingIcon ? <View style={styles.iconLeading}>{leadingIcon}</View> : null}
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: labelColor,
              fontSize,
            },
          ]}
        >
          {label}
        </Text>
        {trailingIcon ? <View style={styles.iconTrailing}>{trailingIcon}</View> : null}
      </View>
    </PressableAnimated>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.full,
    borderWidth: 1.25,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.3,
  },
  iconLeading: {
    marginRight: spacing.sm,
  },
  iconTrailing: {
    marginLeft: spacing.sm,
  },
})
