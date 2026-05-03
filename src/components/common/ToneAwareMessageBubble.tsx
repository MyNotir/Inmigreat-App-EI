/**
 * ToneAwareMessageBubble — Lexi message renderer with EI behavior.
 *
 * Detects high-stress keywords ("ICE", "deportación", "miedo", "perdida",
 * "negaron", "denied", "scared") in the user's last message and shifts
 * Lexi's bubble to a softer, warmer treatment with explicit acknowledgement
 * before the answer. When the keyword is in the crisis tier, also surfaces
 * an inline "talk to a human" affordance.
 *
 * This is the EI design upgrade to the original MessageBubble:
 *   - normal: same neutral cool palette as before
 *   - elevated: warm cream bubble with clay accent, slower entrance
 *   - acute: warm peach bubble with burnt-orange accent + crisis CTA
 */

import { useMemo } from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { borderRadius, colors, spacing, typography } from "@/styles/theme"

const ELEVATED_KEYWORDS = [
  "miedo",
  "perdid",
  "asustad",
  "ansios",
  "no sé",
  "confundid",
  "abrumad",
  "scared",
  "anxious",
  "lost",
  "confused",
]

const ACUTE_KEYWORDS = [
  "ice",
  "deport",
  "detuvier",
  "detained",
  "arresto",
  "negaron",
  "denied",
  "removal",
  "emergencia",
]

type Tone = "neutral" | "elevated" | "acute"

function detectTone(userText: string | undefined): Tone {
  if (!userText) return "neutral"
  const lower = userText.toLowerCase()
  if (ACUTE_KEYWORDS.some((k) => lower.includes(k))) return "acute"
  if (ELEVATED_KEYWORDS.some((k) => lower.includes(k))) return "elevated"
  return "neutral"
}

type Props = {
  role: "user" | "lexi"
  text: string
  /** Last user message — used to detect stress level for Lexi replies */
  contextUserText?: string
  onEscalate?: () => void
}

export function ToneAwareMessageBubble({
  role,
  text,
  contextUserText,
  onEscalate,
}: Props) {
  const tone = useMemo<Tone>(
    () => (role === "lexi" ? detectTone(contextUserText) : "neutral"),
    [role, contextUserText],
  )

  if (role === "user") {
    return (
      <View style={[styles.row, styles.rowRight]}>
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={styles.userText}>{text}</Text>
        </View>
      </View>
    )
  }

  // Lexi side
  const wrapStyle =
    tone === "acute"
      ? styles.acuteBubble
      : tone === "elevated"
        ? styles.elevatedBubble
        : styles.neutralBubble
  const textStyle =
    tone === "neutral" ? styles.lexiTextNeutral : styles.lexiTextWarm

  return (
    <View style={[styles.row, styles.rowLeft]}>
      <View style={[styles.bubble, wrapStyle]}>
        {tone !== "neutral" && (
          <Text style={styles.acknowledge}>
            {tone === "acute"
              ? "Te oigo. Vamos paso a paso."
              : "Sé que esto da miedo. Estoy aquí."}
          </Text>
        )}
        <Text style={textStyle}>{text}</Text>
        {tone === "acute" && onEscalate && (
          <TouchableOpacity onPress={onEscalate} style={styles.escalate}>
            <Text style={styles.escalateText}>Hablar con un humano →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: spacing.xs,
  },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  userBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: borderRadius.small,
  },
  userText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.text.inverse,
    lineHeight: 21,
  },
  neutralBubble: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: colors.border.light,
    borderBottomLeftRadius: borderRadius.small,
  },
  elevatedBubble: {
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderBottomLeftRadius: borderRadius.small,
  },
  acuteBubble: {
    backgroundColor: colors.warm.peach,
    borderWidth: 1,
    borderColor: colors.border.warmStrong,
    borderBottomLeftRadius: borderRadius.small,
    paddingVertical: spacing.lg, // generous spacing in acute moments
  },
  acknowledge: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 12,
    letterSpacing: 0.3,
    color: colors.warm.clay,
    marginBottom: spacing.xs,
  },
  lexiTextNeutral: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 21,
  },
  lexiTextWarm: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.warm.ink,
    lineHeight: 22,
  },
  escalate: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.warm.clay,
  },
  escalateText: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 12,
    color: colors.text.inverse,
  },
})
