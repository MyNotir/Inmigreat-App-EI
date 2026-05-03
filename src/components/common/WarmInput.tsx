/**
 * WarmInput — Emotional Intelligence text field.
 *
 * Cream surface, soft clay border, clay focus ring. Optional label rendered
 * above (warm-ink, soft), optional helper or error text below. Designed to
 * sit on warm screens during high-emotion moments (login after denial,
 * password reset under deadline) where a stark cool form would feel cold.
 *
 * No harsh red on error — uses urgentWarm (burnt orange) so the user reads
 * "this needs attention" not "you failed."
 */

import { useState } from "react"
import {
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native"

import { borderRadius, colors, spacing, typography } from "@/styles/theme"

type Props = TextInputProps & {
  label?: string
  helper?: string
  error?: string
  containerStyle?: StyleProp<ViewStyle>
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
}

export function WarmInput({
  label,
  helper,
  error,
  containerStyle,
  leadingIcon,
  trailingIcon,
  onFocus,
  onBlur,
  style,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false)

  const borderColor = error
    ? colors.status.urgentWarm
    : focused
      ? colors.warm.clay
      : colors.border.warm

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.fieldRow,
          {
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
          },
        ]}
      >
        {leadingIcon ? <View style={styles.iconLeading}>{leadingIcon}</View> : null}
        <TextInput
          {...rest}
          placeholderTextColor={colors.warm.inkFaint}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          style={[styles.input, style]}
        />
        {trailingIcon ? <View style={styles.iconTrailing}>{trailingIcon}</View> : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
    marginBottom: spacing.xs + 2,
    letterSpacing: 0.2,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warm.cream,
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.ink,
    paddingVertical: spacing.xs,
  },
  iconLeading: {
    marginRight: spacing.sm,
  },
  iconTrailing: {
    marginLeft: spacing.sm,
  },
  helper: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkFaint,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  error: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.status.urgentWarm,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
})
