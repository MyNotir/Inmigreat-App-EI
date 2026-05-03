/**
 * AttorneyDirectoryScreen — search + filter immigration attorneys.
 *
 * EI moments:
 *   1. Top eyebrow + headline acknowledges the user is in a hard place
 *      ("Encontrar al abogado correcto no debería sumar más estrés").
 *   2. Crisis fast-path StressBanner pinned at top routes ICE/detention/NTA
 *      cases to the AILA hotline directly — no attorney search latency.
 *   3. Filters surface free consult / sliding scale / emergencies before
 *      "rate". Money is the last conversation.
 *   4. Empty results aren't a wall: gentle copy plus a "Hablar con Lexi"
 *      fallback so the user never hits a dead end.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"

import { WarmScreen } from "@/components/common/WarmScreen"
import { WarmInput } from "@/components/common/WarmInput"
import { WarmCard } from "@/components/common/WarmCard"
import { WarmButton } from "@/components/common/WarmButton"
import { StressBanner } from "@/components/common/StressBanner"
import { AttorneyCard } from "@/components/attorneys/AttorneyCard"
import { attorneysService, type AttorneyFilter } from "@/services/attorneys"
import { borderRadius, colors, spacing, typography } from "@/styles/theme"
import type { Attorney, AttorneySpecialty, Language } from "@/types/attorney"
import type { ResourcesStackParamList } from "@/types/navigation"

const SPECIALTIES: Array<{ value: AttorneySpecialty; label: string }> = [
  { value: "asylum", label: "Asilo" },
  { value: "removal", label: "Defensa en corte" },
  { value: "family", label: "Familia" },
  { value: "employment", label: "Empleo" },
  { value: "naturalization", label: "Ciudadanía" },
  { value: "humanitarian", label: "Humanitaria" },
  { value: "daca", label: "DACA" },
]

const ACCESS_FILTERS = [
  { key: "freeConsultOnly" as const, label: "Consulta gratis" },
  { key: "slidingScaleOnly" as const, label: "Sliding scale" },
  { key: "emergencyOnly" as const, label: "Emergencias" },
]

const AILA_HOTLINE = "1-800-954-0254"

type Nav = StackNavigationProp<ResourcesStackParamList>

export const AttorneyDirectoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>()
  const [attorneys, setAttorneys] = useState<Attorney[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [specialty, setSpecialty] = useState<AttorneySpecialty | undefined>()
  const [language, setLanguage] = useState<Language | undefined>()
  const [accessFlags, setAccessFlags] = useState<{
    freeConsultOnly: boolean
    slidingScaleOnly: boolean
    emergencyOnly: boolean
  }>({ freeConsultOnly: false, slidingScaleOnly: false, emergencyOnly: false })

  const filter = useMemo<AttorneyFilter>(
    () => ({
      query: query.trim() || undefined,
      specialty,
      language,
      ...accessFlags,
    }),
    [query, specialty, language, accessFlags],
  )

  const loadAttorneys = useCallback(async () => {
    setLoading(true)
    try {
      const result = await attorneysService.getAttorneys(filter)
      setAttorneys(result)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void loadAttorneys()
  }, [loadAttorneys])

  const callAILA = () => {
    Linking.openURL(`tel:${AILA_HOTLINE.replace(/-/g, "")}`)
  }

  const handlePressAttorney = (attorney: Attorney) => {
    navigation.navigate("AttorneyDetail", { attorneyId: attorney.id })
  }

  const toggleAccess = (key: keyof typeof accessFlags) => {
    setAccessFlags((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const clearFilters = () => {
    setQuery("")
    setSpecialty(undefined)
    setLanguage(undefined)
    setAccessFlags({ freeConsultOnly: false, slidingScaleOnly: false, emergencyOnly: false })
  }

  return (
    <WarmScreen edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text style={styles.backChevron}>←</Text>
          </Pressable>
          <Text style={styles.eyebrow}>RED DE ABOGADOS · INMIGRACIÓN</Text>
          <Text style={styles.title}>
            Encontrar abogado no debería sumar más estrés.
          </Text>
          <Text style={styles.subtitle}>
            Aquí solo verás abogados verificados con su colegio. Tú decides qué compartirles
            cuando los contactes — nada sale antes.
          </Text>
        </View>

        {/* Crisis fast-path */}
        <View style={styles.bannerWrap}>
          <StressBanner
            context="EMERGENCIA · ICE / DETENCIÓN / NTA"
            headline="Si esto es ahora — ICE te detuvo, audiencia mañana, NTA recibido — llama AILA antes de buscar más."
            ctaLabel={`Llamar AILA · ${AILA_HOTLINE}`}
            level="acute"
            onCta={callAILA}
          />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <WarmInput
            placeholder="Busca por nombre, firma o especialidad..."
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Specialty chips */}
        <Text style={styles.sectionLabel}>ESPECIALIDAD</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          <Pressable
            onPress={() => setSpecialty(undefined)}
            style={[styles.chip, !specialty && styles.chipActive]}
          >
            <Text style={[styles.chipText, !specialty && styles.chipTextActive]}>Todas</Text>
          </Pressable>
          {SPECIALTIES.map((s) => (
            <Pressable
              key={s.value}
              onPress={() => setSpecialty(specialty === s.value ? undefined : s.value)}
              style={[styles.chip, specialty === s.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, specialty === s.value && styles.chipTextActive]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Access filters */}
        <Text style={styles.sectionLabel}>ACCESO</Text>
        <View style={styles.accessRow}>
          {ACCESS_FILTERS.map((f) => {
            const active = accessFlags[f.key]
            return (
              <Pressable
                key={f.key}
                onPress={() => toggleAccess(f.key)}
                style={[styles.accessChip, active && styles.accessChipActive]}
              >
                <View style={[styles.accessDot, active && styles.accessDotActive]}>
                  {active ? <Text style={styles.accessCheck}>✓</Text> : null}
                </View>
                <Text style={[styles.accessText, active && styles.accessTextActive]}>{f.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {/* Language chip row */}
        <Text style={styles.sectionLabel}>IDIOMA QUE NECESITAS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {(["es", "en", "pt", "ht", "fr"] as Language[]).map((lang) => (
            <Pressable
              key={lang}
              onPress={() => setLanguage(language === lang ? undefined : lang)}
              style={[styles.chip, language === lang && styles.chipActive]}
            >
              <Text style={[styles.chipText, language === lang && styles.chipTextActive]}>
                {lang.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Result count + clear */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {loading ? "Buscando..." : `${attorneys.length} abogado(s) coinciden`}
          </Text>
          <Pressable onPress={clearFilters}>
            <Text style={styles.clearLink}>Limpiar filtros</Text>
          </Pressable>
        </View>

        {/* Empty state — not a wall */}
        {!loading && attorneys.length === 0 ? (
          <WarmCard intensity="elevated" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No vimos coincidencias con esos filtros.</Text>
            <Text style={styles.emptyBody}>
              Prueba con menos filtros, o pídele a Lexi (gratis, en español) que te ayude a entender
              qué tipo de abogado necesitas según tu caso.
            </Text>
            <View style={{ height: spacing.md }} />
            <WarmButton
              label="Limpiar filtros"
              onPress={clearFilters}
              variant="secondary"
            />
          </WarmCard>
        ) : null}

        {/* Results list */}
        <View style={styles.listWrap}>
          {attorneys.map((attorney) => (
            <AttorneyCard
              key={attorney.id}
              attorney={attorney}
              onPress={() => handlePressAttorney(attorney)}
            />
          ))}
        </View>

        <View style={{ height: spacing["3xl"] }} />
      </ScrollView>
    </WarmScreen>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing["3xl"],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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
    marginBottom: spacing.lg,
  },
  backChevron: {
    fontSize: typography.fontSize.lg,
    color: colors.warm.clay,
    fontFamily: typography.fontFamily.bold,
    marginTop: -2,
  },
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: -0.4,
    lineHeight: typography.fontSize["2xl"] * 1.2,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.md * 1.45,
    marginTop: spacing.md,
  },
  bannerWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.warm.clay,
    borderColor: colors.warm.clay,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
  },
  chipTextActive: {
    color: colors.warm.cream,
    fontFamily: typography.fontFamily.extrabold,
  },
  accessRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  accessChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderRadius: borderRadius.full,
    paddingLeft: 4,
    paddingRight: spacing.base,
    paddingVertical: 4,
  },
  accessChipActive: {
    backgroundColor: "rgba(184, 201, 185, 0.32)",
    borderColor: colors.warm.sage,
  },
  accessDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.warm.sand,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  accessDotActive: {
    backgroundColor: colors.warm.sage,
  },
  accessCheck: {
    fontSize: 12,
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.cream,
  },
  accessText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
  },
  accessTextActive: {
    color: "#5A7660",
    fontFamily: typography.fontFamily.extrabold,
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  countText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  clearLink: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 0.3,
  },
  listWrap: {
    paddingHorizontal: spacing.lg,
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * 1.45,
    marginTop: spacing.sm,
  },
})

export default AttorneyDirectoryScreen
