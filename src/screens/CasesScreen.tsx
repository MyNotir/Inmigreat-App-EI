/**
 * CasesScreen — Emotional Intelligence redesign.
 *
 * The daily check-in. Warm header with WarmSectionLabel-style status, soft
 * 'agregar' button (clay primary), bell toggle that softens to cream when
 * disabled. Case list flows directly into the WarmCard-skinned CaseCards.
 * StressBanner appears at the top when any case carries elevated/acute
 * stress (RFE pending, urgent action, denial). All data fetching, EOIR
 * captcha + validation flow, and pro-tabs paywall logic preserved verbatim.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useNavigation } from "@react-navigation/native"
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"
import type { StackNavigationProp } from "@react-navigation/stack"
import Svg, { Path } from "react-native-svg"

import { WarmScreen } from "../components/common/WarmScreen"
import { WarmCard } from "../components/common/WarmCard"
import { WarmButton } from "../components/common/WarmButton"
import { StressBanner } from "../components/common/StressBanner"
import { BrandedLoadingState } from "../components/common/BrandedLoadingState"
import { AddCaseSheet } from "../components/cases/AddCaseSheet"
import { CasesEmptyState } from "../components/cases/CasesEmptyState"
import { CaseCard } from "../components/cases/CaseCard"
import { EoirCaptchaModal } from "../components/cases/EoirCaptchaModal"
import { CaseTimeline } from "../components/cases/CaseTimeline"
import { ProTabs, type ProTabId } from "../components/cases/ProTabs"
import { ForecastTab } from "../components/cases/pro/ForecastTab"
import { IntelligenceTab } from "../components/cases/pro/IntelligenceTab"
import { AcceleratorsTab } from "../components/cases/pro/AcceleratorsTab"
import { AlertsTab } from "../components/cases/pro/AlertsTab"
import { useAuth } from "../context/AuthContext"
import { useEoirCaptchaChallenge } from "../hooks/useEoirCaptchaChallenge"
import { usePremiumPaywall } from "../hooks/usePremiumPaywall"
import { useViewTranslation } from "../i18n"
import {
  casesService,
  type AddCaseInput,
  type AddEoirCaseDraftInput,
  type CaseDetailResponse,
} from "../services/cases"
import {
  EOIR_HCAPTCHA_TOKEN_SETTLE_DELAY_MS,
  normalizeEoirLanguageCode,
  validateEoirCase,
  type EoirCaseValidationResult,
} from "../services/eoir"
import { storage } from "../services/storage"
import { borderRadius, colors, spacing, typography } from "../styles/theme"
import type { Case } from "../types/case"
import type { CasesStackParamList, MainTabParamList } from "../types/navigation"

const BellIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = colors.accent }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

const BellOffIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = colors.text.tertiary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M13.73 21a2 2 0 0 1-3.46 0M18.63 13A17.89 17.89 0 0 1 18 8M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14M18 8a6 6 0 0 0-9.33-5M1 1l22 22"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

const PlusIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = colors.background.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

function detectCaseStress(caseItem: Case): "calm" | "elevated" | "acute" {
  if (caseItem.urgency === "high") return "acute"
  const label = caseItem.status?.label?.toLowerCase() ?? ""
  if (
    label.includes("rfe") ||
    label.includes("denial") ||
    label.includes("denegad") ||
    label.includes("denial") ||
    label.includes("notice")
  ) {
    return "elevated"
  }
  return "calm"
}

export const CasesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<CasesStackParamList, "CasesList">>()
  const { t } = useViewTranslation("cases")
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) })
  const { subscriptionStatus, notificationSettings, updateNotificationPreferences } = useAuth()
  const isPro = subscriptionStatus.isPro
  const { requestToken: requestEoirCaptchaToken, modalProps: eoirCaptchaModalProps } = useEoirCaptchaChallenge()
  const { openPaywall, paywallElement } = usePremiumPaywall({
    subtitle: tx("paywall.subtitle", "Herramientas avanzadas para tus casos"),
    description: tx(
      "paywall.description",
      "Desbloquea Forecast, Intel, Accelerate y Alertas Pro para analizar mejor tus casos y priorizar acciones.",
    ),
  })
  const hasFocusedOnceRef = useRef(false)
  const hasCasesRef = useRef(false)
  const alertsEnabled = notificationSettings.caseUpdates

  const [cases, setCases] = useState<Case[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null)
  const [activeProTab, setActiveProTab] = useState<ProTabId>("forecast")
  const [refreshing, setRefreshing] = useState(false)
  const [isAddCaseVisible, setIsAddCaseVisible] = useState(false)
  const [addCaseSheetInitialInput, setAddCaseSheetInitialInput] = useState<AddCaseInput | null>(null)
  const [addCaseSheetError, setAddCaseSheetError] = useState<string | null>(null)

  const loadCases = useCallback(async (mode: "blocking" | "background" = "blocking") => {
    try {
      if (mode === "blocking") setIsLoading(true)
      setError(null)
      const response = await casesService.getCases()
      setCases(response.cases)
    } catch (err) {
      console.error("[CasesScreen] Error fetching cases:", err)
      if (mode === "blocking" || !hasCasesRef.current) {
        setError(tx("feedback.loadError", "No se pudieron cargar los casos. Intenta de nuevo."))
      }
    } finally {
      if (mode === "blocking") setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    hasCasesRef.current = cases.length > 0
  }, [cases.length])

  useEffect(() => {
    void loadCases("blocking")
  }, [loadCases])

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true
        return
      }
      void loadCases("background")
    }, [loadCases]),
  )

  const handleAlertToggle = useCallback(async () => {
    try {
      await updateNotificationPreferences({
        ...notificationSettings,
        caseUpdates: !alertsEnabled,
      })
    } catch {
      // ignore
    }
  }, [alertsEnabled, notificationSettings, updateNotificationPreferences])

  const handleCasePress = useCallback(
    (caseItem: Case) => {
      navigation.navigate("CaseDetail", {
        caseId: caseItem.id,
        source: caseItem.source,
        initialCase: caseItem as CaseDetailResponse,
      })
    },
    [navigation],
  )

  const handleTimelineToggle = useCallback(
    (caseId: string, expanded: boolean) => setExpandedTimelineId(expanded ? caseId : null),
    [],
  )

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadCases("background")
    } catch (err) {
      console.error("[CasesScreen] Error refreshing cases:", err)
    } finally {
      setRefreshing(false)
    }
  }, [loadCases])

  const handlePaywall = useCallback(() => {
    openPaywall({
      title: tx("paywall.title", "InMiGreat Pro"),
      subtitle: tx("paywall.subtitle", "Herramientas avanzadas para tus casos"),
      showChatButton: true,
      chatCtaLabel: tx("paywall.chatCta", "Preguntar a Lexi"),
      onOpenChat: () => {
        navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate("Chat", {
          sourceScreen: "CasesScreen",
          sourceAction: "open_chat_from_cases_paywall",
        })
      },
    })
  }, [navigation, openPaywall, tx])

  const handleCommunity = useCallback(() => {
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate("Community")
  }, [navigation])

  const handleOpenAddCase = useCallback(() => {
    setAddCaseSheetInitialInput(null)
    setAddCaseSheetError(null)
    setIsAddCaseVisible(true)
  }, [])

  const handleOpenLoadingPreview = useCallback(() => {
    navigation.navigate("LoadingPreview")
  }, [navigation])

  const handleCloseAddCase = useCallback(() => {
    setAddCaseSheetInitialInput(null)
    setAddCaseSheetError(null)
    setIsAddCaseVisible(false)
  }, [])

  const reopenEoirAddCase = useCallback((input: AddEoirCaseDraftInput, message: string) => {
    setAddCaseSheetInitialInput(input)
    setAddCaseSheetError(message)
    setIsAddCaseVisible(true)
  }, [])

  const handleAddCase = useCallback(
    async (input: AddCaseInput) => {
      if (input.kind === "eoir") {
        setIsAddCaseVisible(false)
        setAddCaseSheetInitialInput(input)
        setAddCaseSheetError(null)

        try {
          let captchaToken = ""
          try {
            captchaToken = await requestEoirCaptchaToken()
            await new Promise((resolve) => setTimeout(resolve, EOIR_HCAPTCHA_TOKEN_SETTLE_DELAY_MS))
          } catch (captchaError) {
            reopenEoirAddCase(
              input,
              captchaError instanceof Error
                ? tx("addCase.flowErrors.captchaPrefix", "Captcha: {{message}}", {
                    message: captchaError.message,
                  })
                : tx("addCase.flowErrors.captchaFallback", "Captcha: no pudimos completar la verificación."),
            )
            return
          }

          let validation: EoirCaseValidationResult
          try {
            validation = await validateEoirCase({
              alienNumber: input.alienNumber,
              nationalityCode: input.nationalityCode,
              captchaToken,
              languageCode: normalizeEoirLanguageCode(),
            })
          } catch (validationError) {
            reopenEoirAddCase(
              input,
              validationError instanceof Error
                ? tx("addCase.flowErrors.eoirPrefix", "EOIR: {{message}}", { message: validationError.message })
                : tx("addCase.flowErrors.eoirFallback", "EOIR: no pudimos validar el caso ahora."),
            )
            return
          }

          let createdCase: CaseDetailResponse
          try {
            createdCase = await casesService.addEoirCaseTracking({ draft: input, validation })
          } catch (persistenceError) {
            reopenEoirAddCase(
              input,
              persistenceError instanceof Error
                ? tx("addCase.flowErrors.backendPrefix", "Backend: {{message}}", {
                    message: persistenceError.message,
                  })
                : tx("addCase.flowErrors.backendFallback", "Backend: no pudimos guardar el caso EOIR."),
            )
            return
          }

          setCases((currentCases) => {
            const nextCases = [createdCase, ...currentCases.filter((caseItem) => caseItem.id !== createdCase.id)]
            void storage.cacheCases(nextCases)
            return nextCases
          })
          setExpandedTimelineId(null)
          setError(null)
          setAddCaseSheetInitialInput(null)
          setAddCaseSheetError(null)
          setIsAddCaseVisible(false)

          navigation.navigate("CaseDetail", {
            caseId: createdCase.id,
            source: createdCase.source,
            initialCase: createdCase,
          })
        } catch (submissionError) {
          reopenEoirAddCase(
            input,
            submissionError instanceof Error
              ? submissionError.message
              : tx("feedback.unexpectedAddError", "No pudimos agregar el caso de corte. Intenta de nuevo."),
          )
        }

        return
      }

      const createdCase = await casesService.addCase(input)
      setCases((currentCases) => {
        const nextCases = [createdCase, ...currentCases.filter((caseItem) => caseItem.id !== createdCase.id)]
        void storage.cacheCases(nextCases)
        return nextCases
      })
      setExpandedTimelineId(null)
      setError(null)
      setIsAddCaseVisible(false)
      navigation.navigate("CaseDetail", {
        caseId: createdCase.id,
        source: createdCase.source,
        initialCase: createdCase as CaseDetailResponse,
      })
    },
    [navigation, reopenEoirAddCase, requestEoirCaptchaToken, tx],
  )

  const renderProTabContent = useCallback(
    (tab: ProTabId) => {
      switch (tab) {
        case "forecast":
          return (
            <ForecastTab
              data={{
                estimatedDateRange: "Jul – Sep 2025",
                confidencePercentage: 78,
                velocityMetric: tx("demo.forecast.velocity", "15% más rápido"),
                riskFactors: 2,
                weeksRemaining: 24,
                similarCases: 1247,
              }}
            />
          )
        case "intelligence":
          return (
            <IntelligenceTab
              serviceCenters={[
                { name: "Nebraska", speed: "accelerating", averageWeeks: 18, isUserCenter: true },
                { name: "Texas", speed: "stable", averageWeeks: 22 },
              ]}
              visaBulletin={{
                priorityDate: "15 Mar 2022",
                currentDate: "01 Ene 2022",
                movement: "forward",
                estimatedWait: tx("demo.intelligence.estimatedWait", "8-12 meses"),
              }}
              userWaitComparison={tx(
                "demo.intelligence.waitComparison",
                "Tu espera es 20% menor que el promedio",
              )}
            />
          )
        case "accelerators":
          return (
            <AcceleratorsTab
              accelerators={[
                {
                  id: "1",
                  title: tx("demo.accelerators.employmentLetter.title", "Carta de empleo"),
                  description: tx("demo.accelerators.employmentLetter.description", "Fortalece tu caso"),
                  impact: "high",
                  details: tx("demo.accelerators.employmentLetter.details", "Solicita carta actualizada"),
                  actionLabel: tx("demo.accelerators.employmentLetter.action", "Ver plantilla"),
                  icon: "document",
                },
              ]}
            />
          )
        case "alerts":
          return (
            <AlertsTab
              alerts={[
                {
                  id: "1",
                  type: "approval",
                  title: tx("demo.alerts.similarApproval.title", "Caso similar aprobado"),
                  description: tx("demo.alerts.similarApproval.description", "María G. recibió aprobación"),
                  timestamp: tx("demo.alerts.similarApproval.timestamp", "hace 1h"),
                  matchedUsersCount: 15,
                },
              ]}
            />
          )
        default:
          return null
      }
    },
    [tx],
  )

  const acuteCase = useMemo(() => cases.find((c) => detectCaseStress(c) === "acute"), [cases])
  const elevatedCase = useMemo(
    () => (!acuteCase ? cases.find((c) => detectCaseStress(c) === "elevated") : undefined),
    [cases, acuteCase],
  )

  const renderEmptyState = () => <CasesEmptyState onAddCase={handleOpenAddCase} />

  const renderLoadingState = () => (
    <BrandedLoadingState
      title={tx("loading.title", "Estamos abriendo tu carpeta")}
      subtitle={tx("loading.subtitle", "Sincronizando timeline, alertas y último estado.")}
      variant="cases"
    />
  )

  const renderErrorState = () => (
    <View style={styles.errorWrap}>
      <WarmCard >
        <Text style={styles.errorTitle}>
          {tx("error.title", "Algo se cortó")}
        </Text>
        <Text style={styles.errorBody}>{error}</Text>
        <View style={{ marginTop: spacing.md }}>
          <WarmButton
            label={tx("error.retry", "Reintentar")}
            onPress={handleRefresh}
            variant="primary"
          />
        </View>
      </WarmCard>
    </View>
  )

  return (
    <WarmScreen edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.eyebrow}>{tx("header.eyebrow", "TU CARPETA")}</Text>
          <Text style={styles.headerTitle}>{tx("header.title", "Mis casos")}</Text>
          <Text style={styles.headerSubtitle}>
            {isLoading
              ? tx("header.loadingSubtitle", "Sincronizando información")
              : cases.length === 0
                ? tx("header.emptySubtitle", "Empieza agregando tu primer caso")
                : tx("header.activeCases", "{{count}} caso(s) activos · sincronizado hace un instante", {
                    count: cases.length,
                  })}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.alertBtn, alertsEnabled && styles.alertBtnActive]}
            onPress={handleAlertToggle}
            accessibilityRole="button"
            accessibilityLabel={alertsEnabled ? "Alertas activadas" : "Alertas desactivadas"}
          >
            {alertsEnabled ? <BellIcon size={18} color={colors.accent} /> : <BellOffIcon size={18} />}
          </Pressable>
          <Pressable style={styles.addBtn} onPress={handleOpenAddCase} accessibilityRole="button">
            <PlusIcon size={14} />
            <Text style={styles.addBtnText}>{tx("header.add", "Agregar")}</Text>
          </Pressable>
          {__DEV__ ? (
            <Pressable
              style={styles.devBtn}
              onPress={handleOpenLoadingPreview}
              accessibilityRole="button"
            >
              <Text style={styles.devBtnText}>{tx("header.devPreview", "Preview")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Stress banner — visible when any case is acute or elevated */}
        {acuteCase ? (
          <View style={styles.bannerWrap}>
            <StressBanner
              context={tx("banner.acuteContext", "Acción urgente · {{label}}", {
                label: acuteCase.status.label,
              })}
              headline={tx(
                "banner.acuteHeadline",
                "Hay algo que necesita atención hoy. Vamos paso por paso.",
              )}
              ctaLabel={tx("banner.acuteCta", "Ver el caso")}
              level="acute"
              onCta={() => handleCasePress(acuteCase)}
            />
          </View>
        ) : elevatedCase ? (
          <View style={styles.bannerWrap}>
            <StressBanner
              context={tx("banner.elevatedContext", "Próximo paso · {{label}}", {
                label: elevatedCase.status.label,
              })}
              headline={tx(
                "banner.elevatedHeadline",
                "Un caso necesita acción esta semana. Tienes tiempo.",
              )}
              ctaLabel={tx("banner.elevatedCta", "Ver detalles")}
              level="elevated"
              onCta={() => handleCasePress(elevatedCase)}
            />
          </View>
        ) : null}

        {isLoading ? (
          renderLoadingState()
        ) : error && cases.length === 0 ? (
          renderErrorState()
        ) : cases.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <View style={styles.casesSection}>
              {cases.map((caseItem) => (
                <View key={caseItem.id} style={styles.caseContainer}>
                  <CaseCard
                    case={caseItem}
                    isPro={isPro}
                    onPaywall={handlePaywall}
                    onCommunity={handleCommunity}
                    onPress={() => handleCasePress(caseItem)}
                  />
                  {expandedTimelineId === caseItem.id ? (
                    <CaseTimeline
                      steps={caseItem.timeline}
                      accentColor={caseItem.accentColor}
                      initialExpanded={expandedTimelineId === caseItem.id}
                      onExpandedChange={(expanded) => handleTimelineToggle(caseItem.id, expanded)}
                    />
                  ) : null}
                </View>
              ))}
            </View>

            <View style={styles.proSection}>
              <Text style={styles.sectionEyebrow}>
                {isPro ? tx("section.proEyebrow", "TUS HERRAMIENTAS PRO") : tx("section.unlockEyebrow", "PRO")}
              </Text>
              <Text style={styles.sectionTitle}>
                {isPro
                  ? tx("section.pro", "Análisis avanzado de tu caso")
                  : tx("section.unlockPro", "Desbloquea visión profunda")}
              </Text>
              <ProTabs
                isPro={isPro}
                activeTab={activeProTab}
                onTabChange={setActiveProTab}
                onPaywall={handlePaywall}
                style={styles.proTabs}
              >
                {renderProTabContent}
              </ProTabs>
            </View>
          </>
        )}
      </ScrollView>

      <AddCaseSheet
        visible={isAddCaseVisible}
        onClose={handleCloseAddCase}
        onSubmit={handleAddCase}
        initialInput={addCaseSheetInitialInput}
        externalError={addCaseSheetError}
        onExternalErrorChange={setAddCaseSheetError}
      />

      <EoirCaptchaModal {...eoirCaptchaModalProps} />
      {paywallElement}
    </WarmScreen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headerTitleContainer: { flex: 1 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.accent,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  alertBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  alertBtnActive: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.accent,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
  },
  addBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
  devBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  devBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: spacing["3xl"] },
  bannerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  casesSection: {
    paddingHorizontal: spacing.lg,
  },
  caseContainer: { marginBottom: spacing.md },
  proSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionEyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.accent,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  proTabs: { minHeight: 400 },
  errorWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  errorTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  errorBody: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.base * 1.45,
  },
})

export default CasesScreen
