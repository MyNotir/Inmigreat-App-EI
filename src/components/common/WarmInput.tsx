/**
 * Input primitive for the EI redesign.
 *
 * Default is BRAND COOL: white surface, navy focus ring, brand-blue label,
 * subtle red error (kept restrained — no alarm). Used everywhere by default.
 * Pass `tone="warm"` for stress contexts (forms inside attorney consent
 * sheet, RFE response form, etc).
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
  tone?: "brand" | "warm"
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
  tone = "brand",
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false)

  const isBrand = tone === "brand"

  const focusBorderColor = isBrand ? colors.accent : colors.warm.clay
  const baseBorderColor = isBrand ? colors.border.medium : colors.border.warm
  const errorBorderColor = isBrand ? colors.error : colors.status.urgentWarm
  const labelColor = isBrand ? colors.text.secondary : colors.warm.inkSoft
  const inputColor = isBrand ? colors.text.primary : colors.warm.ink
  const placeholderColor = isBrand ? colors.text.tertiary : colors.warm.inkFaint
  const surfaceColor = isBrand ? colors.background.primary : colors.warm.cream
  const helperColor = isBrand ? colors.text.tertiary : colors.warm.inkFaint

  const borderColor = error ? errorBorderColor : focused ? focusBorderColor : baseBorderColor

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}
      <View
        style={[
          styles.fieldRow,
          {
            borderColor,
            backgroundColor: surfaceColor,
            borderWidth: focused || error ? 1.5 : 1,
          },
        ]}
      >
        {leadingIcon ? <View style={styles.iconLeading}>{leadingIcon}</View> : null}
        <TextInput
          {...rest}
          placeholderTextColor={placeholderColor}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          style={[styles.input, { color: inputColor }, style]}
        />
        {trailingIcon ? <View style={styles.iconTrailing}>{trailingIcon}</View> : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: errorBorderColor }]}>{error}</Text>
      ) : helper ? (
        <Text style={[styles.helper, { color: helperColor }]}>{helper}</Text>
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
    marginBottom: spacing.xs + 2,
    letterSpacing: 0.2,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
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
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  error: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
})
