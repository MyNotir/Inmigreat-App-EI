/**
 * WarmHeader — Emotional Intelligence screen header.
 *
 * Compact warm header with optional back chevron, title (warm-ink), optional
 * supporting line below (soft warm-ink), and optional trailing action slot.
 * No hard divider — relies on the cream surface to feel uninterrupted.
 *
 * Use at the top of warm screens (cases detail, chat header, onboarding
 * sub-screens). For onboarding splash-style heroes, render the title inline
 * inside WarmScreen instead.
 */

import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, spacing, typography } from "@/styles/theme"

type Props = {
  title: string
  supporting?: string
  onBack?: () => void
  trailing?: React.ReactNode
  /** Optional warm tone hint — adds peach underline accent for "acute" context. */
  intensity?: "calm" | "elevated" | "acute"
}

export function WarmHeader({ title, supporting, onBack, trailing, intensity = "calm" }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={styles.back}
          >
            <Text style={styles.backChevron}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {supporting ? (
            <Text style={styles.supporting} numberOfLines={2}>
              {supporting}
            </Text>
          ) : null}
        </View>
        <View style={styles.trailing}>{trailing}</View>
      </View>
      {intensity === "acute" ? <View style={styles.acuteUnderline} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
    alignItems: "center",
    justifyContent: "center",
  },
  backChevron: {
    fontSize: typography.fontSize.lg,
    color: colors.warm.clay,
    fontFamily: typography.fontFamily.bold,
    marginTop: -2,
  },
  center: {
    flex: 1,
    paddingHorizontal: spacing.base,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: -0.2,
  },
  supporting: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    marginTop: 2,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  trailing: {
    minWidth: 36,
    alignItems: "flex-end",
  },
  acuteUnderline: {
    height: 2,
    backgroundColor: colors.warm.peach,
    marginTop: spacing.sm,
    borderRadius: 1,
    alignSelf: "flex-start",
    width: 48,
    marginLeft: spacing.lg + 36 + spacing.base,
  },
})
