/**
 * WarmDivider — soft horizontal separator for warm surfaces.
 *
 * 1px clay-tinted line with optional inset and optional center label
 * ("o" / "or" / "más opciones"). Pair with cream backgrounds.
 */

import { StyleSheet, Text, View } from "react-native"

import { colors, spacing, typography } from "@/styles/theme"

type Props = {
  label?: string
  inset?: boolean
}

export function WarmDivider({ label, inset }: Props) {
  if (label) {
    return (
      <View style={[styles.labelRow, inset && styles.inset]}>
        <View style={styles.line} />
        <Text style={styles.label}>{label}</Text>
        <View style={styles.line} />
      </View>
    )
  }
  return <View style={[styles.solid, inset && styles.inset]} />
}

const styles = StyleSheet.create({
  solid: {
    height: 1,
    backgroundColor: colors.border.warm,
  },
  inset: {
    marginHorizontal: spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.warm,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkFaint,
    marginHorizontal: spacing.md,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
})
