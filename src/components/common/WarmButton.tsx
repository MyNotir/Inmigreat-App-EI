/**
 * WarmButton — Emotional Intelligence button.
 *
 * Three variants:
 *   - primary: clay fill, cream label. Use for the single most important action
 *     on a warm screen (e.g. "Hablar con un humano", "Subir documento").
 *   - secondary: cream fill, clay border + clay label. Use for non-critical
 *     follow-ups ("Ver detalle", "Más tarde").
 *   - ghost: no fill, clay label. Use for inline tertiary actions.
 *
 * Pressed state uses a soft scale + opacity dip (no harsh ripple) so the
 * interaction feels reassuring under stress. tone="urgent" replaces clay with
 * a burnt-orange that stays warm and serious without becoming alarmist red.
 */

import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { borderRadius, colors, spacing, typography } from "@/styles/theme"

type Variant = "primary" | "secondary" | "ghost"
type Tone = "default" | "urgent" | "sage"
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
  tone = "default",
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
        : colors.warm.clay

  const labelColor =
    variant === "primary" ? colors.warm.cream : accent

  const fillColor =
    variant === "primary"
      ? accent
      : variant === "secondary"
        ? colors.warm.cream
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
    fontFamily: typography.fontFamily.extrabold,
    letterSpacing: 0.3,
  },
  iconLeading: {
    marginRight: spacing.sm,
  },
  iconTrailing: {
    marginLeft: spacing.sm,
  },
})
