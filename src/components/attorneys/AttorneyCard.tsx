/**
 * AttorneyCard — directory list row.
 *
 * EI rule: surface trust signals before pricing. Order in the card:
 *   1. Bar-verified + photo or warm initial badge
 *   2. Name + firm + years experience
 *   3. Specialty chips (sand) + language flags
 *   4. Free 15-min consult badge (sage) — most important affordance
 *   5. Sliding scale badge if applicable (sage)
 *   6. Emergency-available badge (peach + clay) if available
 *   7. Rate range — last, in inkSoft, smaller font
 *
 * Pressing the card navigates to AttorneyProfileScreen for full context.
 */

import { Pressable, StyleSheet, Text, View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { borderRadius, colors, spacing, typography } from "@/styles/theme"
import type { Attorney, AttorneySpecialty, Language } from "@/types/attorney"

const SPECIALTY_LABELS: Record<AttorneySpecialty, string> = {
  family: "Familia",
  employment: "Empleo",
  asylum: "Asilo",
  removal: "Defensa en corte",
  naturalization: "Ciudadanía",
  humanitarian: "Humanitaria",
  daca: "DACA",
  citizenship: "Ciudadanía derivada",
}

const LANGUAGE_FLAGS: Record<Language, string> = {
  es: "🇪🇸",
  en: "🇺🇸",
  pt: "🇧🇷",
  ht: "🇭🇹",
  fr: "🇫🇷",
  ar: "🇸🇦",
  zh: "🇨🇳",
}

function formatRateRange(attorney: Attorney): string {
  const { rates } = attorney
  if (rates.firstConsultFree) {
    return "Consulta gratis 15 min"
  }
  if (rates.consultLow === 0 && rates.consultHigh === 0) {
    return "Sliding scale"
  }
  return `$${rates.consultLow}–$${rates.consultHigh}/h`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() ?? "?"
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}

const PressableAnimated = Animated.createAnimatedComponent(Pressable)

type Props = {
  attorney: Attorney
  onPress: () => void
}

export function AttorneyCard({ attorney, onPress }: Props) {
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <PressableAnimated
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.985, { duration: 120 })
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 180 })
      }}
      style={[styles.card, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${attorney.name}`}
    >
      {/* Top row: photo / initial + name block + arrow */}
      <View style={styles.topRow}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(attorney.name)}</Text>
          </View>
          {attorney.barVerified ? (
            <View style={styles.verifiedBadge} accessibilityLabel="Verificado por colegio de abogados">
              <Text style={styles.verifiedCheck}>✓</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {attorney.name}
          </Text>
          <Text style={styles.firm} numberOfLines={1}>
            {attorney.firm} · {attorney.yearsExperience} años
          </Text>
          <Text style={styles.location} numberOfLines={1}>
            {attorney.location}
            {attorney.remoteOK ? " · acepta remoto" : ""}
          </Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </View>

      {/* Specialty chips + languages */}
      <View style={styles.tagRow}>
        {attorney.specialties.slice(0, 3).map((sp) => (
          <View key={sp} style={styles.specialtyChip}>
            <Text style={styles.specialtyText}>{SPECIALTY_LABELS[sp]}</Text>
          </View>
        ))}
        <View style={styles.langSpacer} />
        {attorney.languages.slice(0, 4).map((lang) => (
          <Text key={lang} style={styles.langFlag} accessibilityLabel={`Habla ${lang}`}>
            {LANGUAGE_FLAGS[lang] ?? lang.toUpperCase()}
          </Text>
        ))}
      </View>

      {/* Trust + access badges */}
      <View style={styles.badgeRow}>
        {attorney.rates.firstConsultFree ? (
          <View style={[styles.badge, styles.badgeSage]}>
            <Text style={[styles.badgeText, styles.badgeSageText]}>15 min gratis</Text>
          </View>
        ) : null}
        {attorney.rates.slidingScale ? (
          <View style={[styles.badge, styles.badgeSage]}>
            <Text style={[styles.badgeText, styles.badgeSageText]}>Sliding scale</Text>
          </View>
        ) : null}
        {attorney.rates.paymentPlan ? (
          <View style={[styles.badge, styles.badgeSand]}>
            <Text style={[styles.badgeText, styles.badgeSandText]}>Plan de pago</Text>
          </View>
        ) : null}
        {attorney.availability.emergencyAvailable ? (
          <View style={[styles.badge, styles.badgePeach]}>
            <Text style={[styles.badgeText, styles.badgePeachText]}>Emergencias</Text>
          </View>
        ) : null}
      </View>

      {/* Footer: rating + cases + rate range */}
      <View style={styles.footer}>
        <Text style={styles.rating}>
          ★ {attorney.rating.toFixed(1)}{" "}
          <Text style={styles.casesCount}>· {attorney.casesCompleted} casos</Text>
        </Text>
        <Text style={styles.rate}>{formatRateRange(attorney)}</Text>
      </View>
    </PressableAnimated>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.warm.cream,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.warm,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.warm.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    position: "relative",
    marginRight: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.warm.sand,
    borderWidth: 1,
    borderColor: colors.warm.clay,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.warm.sage,
    borderWidth: 2,
    borderColor: colors.warm.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedCheck: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.cream,
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: -0.2,
  },
  firm: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
    marginTop: 2,
  },
  location: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkFaint,
    marginTop: 2,
  },
  chev: {
    fontSize: 24,
    color: colors.warm.clay,
    fontFamily: typography.fontFamily.bold,
    marginLeft: spacing.sm,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
    marginTop: spacing.md,
  },
  specialtyChip: {
    backgroundColor: colors.warm.sand,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  specialtyText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    letterSpacing: 0.2,
  },
  langSpacer: {
    flex: 1,
  },
  langFlag: {
    fontSize: 16,
    marginLeft: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
    marginTop: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    letterSpacing: 0.5,
  },
  badgeSage: {
    backgroundColor: "rgba(184, 201, 185, 0.32)",
    borderColor: colors.warm.sage,
  },
  badgeSageText: {
    color: "#5A7660",
  },
  badgeSand: {
    backgroundColor: colors.warm.sand,
    borderColor: colors.border.warm,
  },
  badgeSandText: {
    color: colors.warm.inkSoft,
  },
  badgePeach: {
    backgroundColor: colors.warm.peach,
    borderColor: colors.warm.clay,
  },
  badgePeachText: {
    color: colors.status.urgentWarm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.warm,
  },
  rating: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 0.3,
  },
  casesCount: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkFaint,
  },
  rate: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
  },
})

export default AttorneyCard
