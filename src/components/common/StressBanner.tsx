/**
 * StressBanner — context-aware acknowledgement banner.
 *
 * Shows above the screen content when the user is in an elevated or
 * acute stress state (RFE arrived, denial, hearing day, document
 * overdue). Validates the user's emotion before delivering information,
 * and routes to support if needed.
 *
 * Tone is the whole point. Never "Action required." Always: "We see
 * what just happened. Here's what to do. We're with you."
 */

import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { borderRadius, colors, spacing, typography } from "@/styles/theme"

type Props = {
  /** Short label like "RFE recibido" or "Audiencia mañana" */
  context: string
  /** Headline that acknowledges the user's emotion first */
  headline: string
  /** Optional action button label */
  ctaLabel?: string
  onCta?: () => void
  /** "elevated" = clay accent, "acute" = burnt orange + larger spacing */
  level?: "elevated" | "acute"
}

export function StressBanner({
  context,
  headline,
  ctaLabel,
  onCta,
  level = "elevated",
}: Props) {
  const accentColor =
    level === "acute" ? colors.status.urgentWarm : colors.warm.clay
  const padding = level === "acute" ? spacing.lg : spacing.base

  return (
    <View
      style={[
        styles.banner,
        {
          padding,
          borderColor: accentColor,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: accentColor }]} />
      <View style={styles.text}>
        <Text style={[styles.context, { color: accentColor }]}>{context}</Text>
        <Text style={styles.headline}>{headline}</Text>
        {ctaLabel && onCta && (
          <TouchableOpacity onPress={onCta} style={styles.cta}>
            <Text style={[styles.ctaText, { color: accentColor }]}>
              {ctaLabel} →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    backgroundColor: colors.warm.cream,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
    alignItems: "flex-start",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  context: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  headline: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 15,
    color: colors.warm.ink,
    lineHeight: 21,
  },
  cta: {
    marginTop: spacing.xs,
  },
  ctaText: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 13,
  },
})
