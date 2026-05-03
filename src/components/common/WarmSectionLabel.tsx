/**
 * WarmSectionLabel — small uppercase label for warm-screen sections.
 *
 * Use above grouped lists or content blocks ("Tu caso", "Soporte",
 * "Documentos pendientes"). Letter-spaced, clay-faded, NOT a hard divider.
 */

import { StyleSheet, Text, View } from "react-native"

import { colors, spacing, typography } from "@/styles/theme"

type Props = {
  label: string
  trailing?: React.ReactNode
}

export function WarmSectionLabel({ label, trailing }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  trailing: {
    marginLeft: spacing.sm,
  },
})
