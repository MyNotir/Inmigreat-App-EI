/**
 * AttorneyProfileScreen — full attorney profile with consent-gated contact.
 *
 * EI ordering of the page (mission first, money last):
 *   1. Hero: warm initial avatar + name + bar-verified shield + accepting indicator
 *   2. Mission statement (in the attorney's own voice) — humanizes
 *   3. Bio (full)
 *   4. Specialties + languages
 *   5. Reviews from migrants (anonymized, case-type only)
 *   6. Rates — flat fees if available + sliding scale + payment plan
 *   7. CTA: "Pedir contacto" → opens AttorneyConsentSheet
 *
 * On consent confirm, calls attorneysService.createContactRequest, then
 * shows a sage success toast inline before letting the user back out.
 */

import { useEffect, useState } from "react"
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"

import { WarmScreen } from "@/components/common/WarmScreen"
import { WarmCard } from "@/components/common/WarmCard"
import { WarmButton } from "@/components/common/WarmButton"
import { WarmDivider } from "@/components/common/WarmDivider"
import { AttorneyConsentSheet } from "@/components/attorneys/AttorneyConsentSheet"
import { attorneysService } from "@/services/attorneys"
import { useAuth } from "@/context/AuthContext"
import { borderRadius, colors, spacing, typography } from "@/styles/theme"
import type {
  Attorney,
  AttorneySpecialty,
  ContactConsent,
  Language,
} from "@/types/attorney"
import type { ResourcesStackParamList } from "@/types/navigation"

type Nav = StackNavigationProp<ResourcesStackParamList, "AttorneyDetail">
type Route = RouteProp<ResourcesStackParamList, "AttorneyDetail">

const SPECIALTY_LABELS: Record<AttorneySpecialty, string> = {
  family: "Familia",
  employment: "Empleo",
  asylum: "Asilo",
  removal: "Defensa en corte (EOIR)",
  naturalization: "Ciudadanía",
  humanitarian: "Humanitaria (U / T / VAWA)",
  daca: "DACA",
  citizenship: "Ciudadanía derivada",
}

const LANG_LABELS: Record<Language, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  ht: "Kreyòl",
  fr: "Français",
  ar: "العربية",
  zh: "中文",
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() ?? "?"
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
}

export const AttorneyProfileScreen: React.FC = () => {
  const route = useRoute<Route>()
  const navigation = useNavigation<Nav>()
  const { userName } = useAuth()
  const [attorney, setAttorney] = useState<Attorney | null>(null)
  const [loading, setLoading] = useState(true)
  const [consentVisible, setConsentVisible] = useState(false)
  const [successTicket, setSuccessTicket] = useState<string | null>(null)

  const { attorneyId } = route.params

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    attorneysService.getAttorney(attorneyId).then((found) => {
      if (cancelled) return
      setAttorney(found)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [attorneyId])

  const handleConfirmConsent = async (consent: ContactConsent, urgent: boolean) => {
    if (!attorney) return
    const result = await attorneysService.createContactRequest({
      attorneyId: attorney.id,
      consent,
      requestedAt: new Date().toISOString(),
      urgent,
    })
    setConsentVisible(false)
    setSuccessTicket(result.ticketId)
  }

  if (loading) {
    return (
      <WarmScreen edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Abriendo perfil...</Text>
        </View>
      </WarmScreen>
    )
  }

  if (!attorney) {
    return (
      <WarmScreen edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>No encontramos este abogado.</Text>
          <View style={{ height: spacing.lg }} />
          <WarmButton label="Volver" onPress={() => navigation.goBack()} variant="primary" />
        </View>
      </WarmScreen>
    )
  }

  const { rates, reviews, availability } = attorney

  return (
    <WarmScreen edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text style={styles.backChevron}>←</Text>
          </Pressable>
          <View style={styles.acceptingPill}>
            <View
              style={[
                styles.acceptingDot,
                availability.acceptingClients ? styles.acceptingDotOk : styles.acceptingDotOff,
              ]}
            />
            <Text style={styles.acceptingText}>
              {availability.acceptingClients ? "Aceptando clientes" : "Cupo lleno"}
            </Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(attorney.name)}</Text>
            </View>
            {attorney.barVerified ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedCheck}>✓</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.name}>{attorney.name}</Text>
          {attorney.pronouns ? <Text style={styles.pronouns}>{attorney.pronouns}</Text> : null}
          <Text style={styles.firm}>{attorney.firm}</Text>
          <Text style={styles.metaLine}>
            {attorney.location} · {attorney.yearsExperience} años · {attorney.casesCompleted} casos
          </Text>
          {attorney.barVerified && attorney.barNumbers?.length ? (
            <Text style={styles.barLine}>
              Verificado:{" "}
              {attorney.barNumbers.map((b) => `${b.state} #${b.number}`).join(" · ")}
            </Text>
          ) : null}
        </View>

        {/* Success state */}
        {successTicket ? (
          <WarmCard intensity="calm" style={styles.successCard}>
            <Text style={styles.successEyebrow}>✓ PETICIÓN ENVIADA</Text>
            <Text style={styles.successTitle}>Listo. {attorney.name.split(" ")[0]} la recibió.</Text>
            <Text style={styles.successBody}>
              Te contactará por la vía que elegiste. Puedes ver el estado en tu perfil. Ticket #
              {successTicket.slice(-8)}.
            </Text>
          </WarmCard>
        ) : null}

        {/* Mission */}
        {attorney.mission ? (
          <WarmCard intensity="elevated" style={styles.section}>
            <Text style={styles.sectionEyebrow}>SU MISIÓN</Text>
            <Text style={styles.missionText}>"{attorney.mission}"</Text>
          </WarmCard>
        ) : null}

        {/* Bio */}
        <WarmCard intensity="calm" style={styles.section}>
          <Text style={styles.sectionEyebrow}>SOBRE {attorney.name.split(" ")[0].toUpperCase()}</Text>
          <Text style={styles.bioText}>{attorney.bio}</Text>
        </WarmCard>

        {/* Specialties + languages */}
        <WarmCard intensity="calm" style={styles.section}>
          <Text style={styles.sectionEyebrow}>ESPECIALIDADES</Text>
          <View style={styles.tagRow}>
            {attorney.specialties.map((sp) => (
              <View key={sp} style={styles.specialtyChip}>
                <Text style={styles.specialtyText}>{SPECIALTY_LABELS[sp]}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: spacing.md }} />
          <Text style={styles.sectionEyebrow}>IDIOMAS</Text>
          <View style={styles.tagRow}>
            {attorney.languages.map((lang) => (
              <View key={lang} style={styles.langChip}>
                <Text style={styles.langChipText}>{LANG_LABELS[lang] ?? lang}</Text>
              </View>
            ))}
          </View>
        </WarmCard>

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrowOuter}>QUÉ DICE LA GENTE</Text>
          <View style={styles.reviewsHeader}>
            <Text style={styles.bigRating}>★ {attorney.rating.toFixed(1)}</Text>
            <Text style={styles.reviewsCount}>{reviews.length} reseñas verificadas</Text>
          </View>
          {reviews.map((r) => (
            <WarmCard key={r.id} intensity="calm" style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewStars}>{"★".repeat(r.rating)}</Text>
                <Text style={styles.reviewMeta}>
                  {r.reviewerCaseType} · {formatRelativeDate(r.postedAt)}
                </Text>
              </View>
              <Text style={styles.reviewBody}>"{r.body}"</Text>
            </WarmCard>
          ))}
        </View>

        {/* Rates */}
        <WarmCard intensity="elevated" style={styles.section}>
          <Text style={styles.sectionEyebrow}>HONORARIOS · TRANSPARENCIA TOTAL</Text>
          <View style={styles.rateBlock}>
            <Text style={styles.rateLabel}>Primera consulta</Text>
            <Text style={styles.rateValue}>
              {rates.firstConsultFree
                ? "Gratis · 15-30 min"
                : `$${rates.consultLow}–$${rates.consultHigh} / hora`}
            </Text>
          </View>

          {rates.flatFees && Object.keys(rates.flatFees).length > 0 ? (
            <>
              <WarmDivider />
              <Text style={styles.flatFeesLabel}>TARIFAS FIJAS</Text>
              {Object.entries(rates.flatFees).map(([form, price]) => (
                <View key={form} style={styles.flatFeeRow}>
                  <Text style={styles.flatFeeForm}>{form}</Text>
                  <Text style={styles.flatFeePrice}>${price.toLocaleString()}</Text>
                </View>
              ))}
            </>
          ) : null}

          <WarmDivider />
          <View style={styles.accessGrid}>
            {rates.slidingScale ? (
              <View style={styles.accessBadge}>
                <Text style={styles.accessBadgeText}>Sliding scale disponible</Text>
              </View>
            ) : null}
            {rates.paymentPlan ? (
              <View style={styles.accessBadge}>
                <Text style={styles.accessBadgeText}>Plan de pago aceptado</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.transparencyNote}>
            Este abogado se compromete a no cobrar más de lo cotizado en la consulta inicial sin
            avisarte primero. Si lo hace, repórtalo desde tu perfil — tomamos esto en serio.
          </Text>
        </WarmCard>

        {/* Availability */}
        <WarmCard intensity="calm" style={styles.section}>
          <Text style={styles.sectionEyebrow}>RESPUESTA</Text>
          <View style={styles.availabilityRow}>
            <Text style={styles.availLabel}>Tiempo promedio de respuesta</Text>
            <Text style={styles.availValue}>
              {availability.averageResponseHours
                ? `~${availability.averageResponseHours} h`
                : "Sin datos"}
            </Text>
          </View>
          <View style={styles.availabilityRow}>
            <Text style={styles.availLabel}>Casos urgentes (ICE / hearing / NTA)</Text>
            <Text
              style={[
                styles.availValue,
                availability.emergencyAvailable ? styles.availValueOk : styles.availValueOff,
              ]}
            >
              {availability.emergencyAvailable ? "Sí, los toma" : "No los toma"}
            </Text>
          </View>
        </WarmCard>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <WarmButton
            label={successTicket ? "Petición enviada ✓" : "Pedir contacto"}
            onPress={() => setConsentVisible(true)}
            variant="primary"
            tone={availability.emergencyAvailable ? "default" : "default"}
            fullWidth
            disabled={Boolean(successTicket) || !availability.acceptingClients}
          />
          <Text style={styles.ctaHint}>
            Tú decides qué compartir. Nada se envía hasta que apruebes en la siguiente pantalla.
          </Text>
        </View>

        <View style={{ height: spacing["3xl"] }} />
      </ScrollView>

      <AttorneyConsentSheet
        visible={consentVisible}
        attorney={attorney}
        onClose={() => setConsentVisible(false)}
        onConfirm={handleConfirmConsent}
        defaults={{
          name: userName ?? undefined,
        }}
      />
    </WarmScreen>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing["3xl"],
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["3xl"],
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  backBtn: {
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
  acceptingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  acceptingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  acceptingDotOk: {
    backgroundColor: colors.warm.sage,
  },
  acceptingDotOff: {
    backgroundColor: colors.warm.inkFaint,
  },
  acceptingText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: 0.4,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.warm.sand,
    borderWidth: 2,
    borderColor: colors.warm.clay,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.warm.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  avatarText: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 1,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warm.sage,
    borderWidth: 3,
    borderColor: colors.warm.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedCheck: {
    fontSize: 14,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.cream,
  },
  name: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  pronouns: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkFaint,
    marginTop: 2,
  },
  firm: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.clay,
    marginTop: spacing.sm,
  },
  metaLine: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  barLine: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkFaint,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  successCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: "rgba(184, 201, 185, 0.25)",
    borderColor: colors.warm.sage,
  },
  successEyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: "#5A7660",
    letterSpacing: 1.4,
  },
  successTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    marginTop: spacing.xs,
    letterSpacing: -0.3,
  },
  successBody: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    marginTop: spacing.sm,
    lineHeight: typography.fontSize.sm * 1.45,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionEyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  sectionEyebrowOuter: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  missionText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    lineHeight: typography.fontSize.md * 1.45,
    fontStyle: "italic",
  },
  bioText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.ink,
    lineHeight: typography.fontSize.base * 1.5,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
  },
  specialtyChip: {
    backgroundColor: colors.warm.sand,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  specialtyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  langChip: {
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  langChipText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  bigRating: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: -0.5,
  },
  reviewsCount: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    marginLeft: spacing.md,
  },
  reviewCard: {
    marginBottom: spacing.sm,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  reviewStars: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.clay,
    letterSpacing: 2,
  },
  reviewMeta: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkFaint,
    letterSpacing: 0.3,
  },
  reviewBody: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.ink,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  rateBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: spacing.sm,
  },
  rateLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
    flex: 1,
  },
  rateValue: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
  },
  flatFeesLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 1.2,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  flatFeeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.warm,
  },
  flatFeeForm: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  flatFeePrice: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
  },
  accessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  accessBadge: {
    backgroundColor: "rgba(184, 201, 185, 0.32)",
    borderWidth: 1,
    borderColor: colors.warm.sage,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  accessBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: "#5A7660",
    letterSpacing: 0.4,
  },
  transparencyNote: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkFaint,
    marginTop: spacing.lg,
    lineHeight: typography.fontSize.xs * 1.5,
  },
  availabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.warm,
  },
  availLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
  },
  availValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
  },
  availValueOk: {
    color: "#5A7660",
  },
  availValueOff: {
    color: colors.warm.inkFaint,
  },
  ctaWrap: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  ctaHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkFaint,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: typography.fontSize.xs * 1.5,
  },
})

export default AttorneyProfileScreen
