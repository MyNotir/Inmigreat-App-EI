/**
 * CasesScreen
 * 
 * Main screen for displaying and managing immigration cases.
 * Validates: Requirements 5.1, 6.1, 6.4, 6.9
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { CasesStackParamList, MainTabParamList } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AnimatedBackground } from '../components/common/AnimatedBackground';
import { BrandedLoadingState } from '../components/common/BrandedLoadingState';
import { GlassCard } from '../components/common/GlassCard';
import { AddCaseSheet } from '../components/cases/AddCaseSheet';
import { CasesEmptyState } from '../components/cases/CasesEmptyState';
import { CaseCard } from '../components/cases/CaseCard';
import { EoirCaptchaModal } from '../components/cases/EoirCaptchaModal';
import { CaseTimeline } from '../components/cases/CaseTimeline';
import { ProTabs, type ProTabId } from '../components/cases/ProTabs';
import { ForecastTab } from '../components/cases/pro/ForecastTab';
import { IntelligenceTab } from '../components/cases/pro/IntelligenceTab';
import { AcceleratorsTab } from '../components/cases/pro/AcceleratorsTab';
import { AlertsTab } from '../components/cases/pro/AlertsTab';
import { useAuth } from '../context/AuthContext';
import { useEoirCaptchaChallenge } from '../hooks/useEoirCaptchaChallenge';
import { usePremiumPaywall } from '../hooks/usePremiumPaywall';
import { useViewTranslation } from '../i18n';
import {
  casesService,
  type AddCaseInput,
  type AddEoirCaseDraftInput,
  type CaseDetailResponse,
} from '../services/cases';
import {
  EOIR_HCAPTCHA_TOKEN_SETTLE_DELAY_MS,
  normalizeEoirLanguageCode,
  validateEoirCase,
  type EoirCaseValidationResult,
} from '../services/eoir';
import { storage } from '../services/storage';
import { colors, spacing, typography, borderRadius } from '../styles/theme';
import type { Case } from '../types/case';

const BellIcon: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = colors.warm.ink }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BellOffIcon: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = colors.warm.ink }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M13.73 21a2 2 0 0 1-3.46 0M18.63 13A17.89 17.89 0 0 1 18 8M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14M18 8a6 6 0 0 0-9.33-5M1 1l22 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PlusIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = colors.warm.cream }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CasesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<CasesStackParamList, 'CasesList'>>();
  const { t } = useViewTranslation('cases');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const { subscriptionStatus, notificationSettings, updateNotificationPreferences } = useAuth();
  const isPro = subscriptionStatus.isPro;
  const { requestToken: requestEoirCaptchaToken, modalProps: eoirCaptchaModalProps } = useEoirCaptchaChallenge();
  const { openPaywall, paywallElement } = usePremiumPaywall({
    subtitle: tx('paywall.subtitle', 'Herramientas avanzadas para tus casos'),
    description: tx(
      'paywall.description',
      'Desbloquea Forecast, Intel, Accelerate y Alertas Pro para analizar mejor tus casos y priorizar acciones.',
    ),
  });
  const hasFocusedOnceRef = useRef(false);
  const hasCasesRef = useRef(false);
  const alertsEnabled = notificationSettings.caseUpdates;

  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [activeProTab, setActiveProTab] = useState<ProTabId>('forecast');
  const [refreshing, setRefreshing] = useState(false);
  const [isAddCaseVisible, setIsAddCaseVisible] = useState(false);
  const [addCaseSheetInitialInput, setAddCaseSheetInitialInput] = useState<AddCaseInput | null>(null);
  const [addCaseSheetError, setAddCaseSheetError] = useState<string | null>(null);

  const loadCases = useCallback(async (mode: 'blocking' | 'background' = 'blocking') => {
    try {
      if (mode === 'blocking') {
        setIsLoading(true);
      }

      setError(null);
      const response = await casesService.getCases();
      setCases(response.cases);
    } catch (err) {
      console.error('[CasesScreen] Error fetching cases:', err);
      if (mode === 'blocking' || !hasCasesRef.current) {
        setError(tx('feedback.loadError', 'No se pudieron cargar los casos. Intenta de nuevo.'));
      }
    } finally {
      if (mode === 'blocking') {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    hasCasesRef.current = cases.length > 0;
  }, [cases.length]);

  useEffect(() => {
    void loadCases('blocking');
  }, [loadCases]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      void loadCases('background');
    }, [loadCases]),
  );

  const handleAlertToggle = useCallback(async () => {
    try {
      await updateNotificationPreferences({
        ...notificationSettings,
        caseUpdates: !alertsEnabled,
      });
    } catch {
      // Keep the previous derived value from context if the request fails.
    }
  }, [alertsEnabled, notificationSettings, updateNotificationPreferences]);

  const handleCasePress = useCallback((caseItem: Case) => {
    navigation.navigate('CaseDetail', {
      caseId: caseItem.id,
      source: caseItem.source,
      initialCase: caseItem as CaseDetailResponse,
    });
  }, [navigation]);
  const handleTimelineToggle = useCallback((caseId: string, expanded: boolean) => setExpandedTimelineId(expanded ? caseId : null), []);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCases('background');
    } catch (err) {
      console.error('[CasesScreen] Error refreshing cases:', err);
    } finally {
      setRefreshing(false);
    }
  }, [loadCases]);
  const handlePaywall = useCallback(() => {
    openPaywall({
      title: tx('paywall.title', 'InMiGreat Pro'),
      subtitle: tx('paywall.subtitle', 'Herramientas avanzadas para tus casos'),
      showChatButton: true,
      chatCtaLabel: tx('paywall.chatCta', 'Preguntar a la AI'),
      onOpenChat: () => {
        navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Chat', {
          sourceScreen: 'CasesScreen',
          sourceAction: 'open_chat_from_cases_paywall',
        });
      },
    });
  }, [navigation, openPaywall, tx]);
  const handleCommunity = useCallback(() => {
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Community');
  }, [navigation]);
  const handleOpenAddCase = useCallback(() => {
    setAddCaseSheetInitialInput(null);
    setAddCaseSheetError(null);
    setIsAddCaseVisible(true);
  }, []);
  const handleOpenLoadingPreview = useCallback(() => {
    navigation.navigate('LoadingPreview');
  }, [navigation]);
  const handleCloseAddCase = useCallback(() => {
    setAddCaseSheetInitialInput(null);
    setAddCaseSheetError(null);
    setIsAddCaseVisible(false);
  }, []);

  const reopenEoirAddCase = useCallback((input: AddEoirCaseDraftInput, message: string) => {
    setAddCaseSheetInitialInput(input);
    setAddCaseSheetError(message);
    setIsAddCaseVisible(true);
  }, []);

  const handleAddCase = useCallback(async (input: AddCaseInput) => {
    if (input.kind === 'eoir') {
      setIsAddCaseVisible(false);
      setAddCaseSheetInitialInput(input);
      setAddCaseSheetError(null);

      try {
        console.log('[EOIR] Starting add-case flow', {
          alienNumberLength: input.alienNumber.length,
          nationalityCode: input.nationalityCode,
          languageCode: normalizeEoirLanguageCode(),
          hasAlias: Boolean(input.alias?.trim()),
          hasLawyer: input.hasLawyer,
        });

        let captchaToken = '';
        try {
          captchaToken = await requestEoirCaptchaToken();
          console.log('[EOIR] Captcha token acquired', {
            tokenLength: captchaToken.length,
          });

          await new Promise((resolve) => {
            setTimeout(resolve, EOIR_HCAPTCHA_TOKEN_SETTLE_DELAY_MS);
          });
        } catch (captchaError) {
          console.error('[EOIR] Captcha step failed', captchaError);
          reopenEoirAddCase(
            input,
            captchaError instanceof Error
              ? tx('addCase.flowErrors.captchaPrefix', 'Captcha: {{message}}', { message: captchaError.message })
              : tx('addCase.flowErrors.captchaFallback', 'Captcha: no pudimos completar la verificacion humana.'),
          );
          return;
        }

        let validation: EoirCaseValidationResult;
        try {
          validation = await validateEoirCase({
            alienNumber: input.alienNumber,
            nationalityCode: input.nationalityCode,
            captchaToken,
            languageCode: normalizeEoirLanguageCode(),
          });
          console.log('[EOIR] EOIR validation completed', {
            caseId: validation.caseId ?? null,
            hasPersonName: Boolean(validation.personName),
            hasNextHearing: Boolean(validation.nextHearingDate),
          });
        } catch (validationError) {
          console.error('[EOIR] EOIR validation failed', validationError);
          reopenEoirAddCase(
            input,
            validationError instanceof Error
              ? tx('addCase.flowErrors.eoirPrefix', 'EOIR: {{message}}', { message: validationError.message })
              : tx('addCase.flowErrors.eoirFallback', 'EOIR: no pudimos validar el caso en este momento.'),
          );
          return;
        }

        let createdCase: CaseDetailResponse;
        try {
          createdCase = await casesService.addEoirCaseTracking({
            draft: input,
            validation,
          });
          console.log('[EOIR] Backend persistence completed', {
            trackingId: createdCase.id,
            syncStatus: createdCase.eoir?.syncStatus,
          });
        } catch (persistenceError) {
          console.error('[EOIR] Backend persistence failed', persistenceError);
          reopenEoirAddCase(
            input,
            persistenceError instanceof Error
              ? tx('addCase.flowErrors.backendPrefix', 'Backend: {{message}}', { message: persistenceError.message })
              : tx('addCase.flowErrors.backendFallback', 'Backend: no pudimos guardar el caso EOIR.'),
          );
          return;
        }

        setCases((currentCases) => {
          const nextCases = [createdCase, ...currentCases.filter((caseItem) => caseItem.id !== createdCase.id)];
          void storage.cacheCases(nextCases);
          return nextCases;
        });
        setExpandedTimelineId(null);
        setError(null);
        setAddCaseSheetInitialInput(null);
        setAddCaseSheetError(null);
        setIsAddCaseVisible(false);

        navigation.navigate('CaseDetail', {
          caseId: createdCase.id,
          source: createdCase.source,
          initialCase: createdCase,
        });
      } catch (submissionError) {
        console.error('[EOIR] Unexpected add-case failure', submissionError);
        reopenEoirAddCase(
          input,
          submissionError instanceof Error
            ? submissionError.message
            : tx('feedback.unexpectedAddError', 'No pudimos agregar el caso de corte. Intenta de nuevo.'),
        );
      }

      return;
    }

    const createdCase = await casesService.addCase(input);

    setCases((currentCases) => {
      const nextCases = [createdCase, ...currentCases.filter((caseItem) => caseItem.id !== createdCase.id)];
      void storage.cacheCases(nextCases);
      return nextCases;
    });

    setExpandedTimelineId(null);
    setError(null);
    setIsAddCaseVisible(false);
    navigation.navigate('CaseDetail', {
      caseId: createdCase.id,
      source: createdCase.source,
      initialCase: createdCase as CaseDetailResponse,
    });
  }, [navigation, reopenEoirAddCase, requestEoirCaptchaToken, tx]);

  const renderProTabContent = useCallback((tab: ProTabId) => {
    switch (tab) {
      case 'forecast':
        return <ForecastTab data={{ estimatedDateRange: 'Jul – Sep 2025', confidencePercentage: 78, velocityMetric: tx('demo.forecast.velocity', '15% mas rapido'), riskFactors: 2, weeksRemaining: 24, similarCases: 1247 }} />;
      case 'intelligence':
        return <IntelligenceTab serviceCenters={[{ name: 'Nebraska', speed: 'accelerating', averageWeeks: 18, isUserCenter: true }, { name: 'Texas', speed: 'stable', averageWeeks: 22 }]} visaBulletin={{ priorityDate: '15 Mar 2022', currentDate: '01 Ene 2022', movement: 'forward', estimatedWait: tx('demo.intelligence.estimatedWait', '8-12 meses') }} userWaitComparison={tx('demo.intelligence.waitComparison', 'Tu espera es 20% menor que el promedio')} />;
      case 'accelerators':
        return <AcceleratorsTab accelerators={[{ id: '1', title: tx('demo.accelerators.employmentLetter.title', 'Carta de empleo'), description: tx('demo.accelerators.employmentLetter.description', 'Fortalece tu caso'), impact: 'high', details: tx('demo.accelerators.employmentLetter.details', 'Solicita carta actualizada'), actionLabel: tx('demo.accelerators.employmentLetter.action', 'Ver plantilla'), icon: 'document' }]} />;
      case 'alerts':
        return <AlertsTab alerts={[{ id: '1', type: 'approval', title: tx('demo.alerts.similarApproval.title', 'Caso similar aprobado'), description: tx('demo.alerts.similarApproval.description', 'Maria G. recibio aprobacion'), timestamp: tx('demo.alerts.similarApproval.timestamp', 'hace 1h'), matchedUsersCount: 15 }]} />;
      default:
        return null;
    }
  }, [tx]);

  const renderEmptyState = () => (
    <CasesEmptyState onAddCase={handleOpenAddCase} />
  );

  const renderLoadingState = () => (
    <BrandedLoadingState
      title={tx('loading.title', 'Cargando tus casos')}
      subtitle={tx('loading.subtitle', 'Sincronizando timeline, alertas y ultimo estado.')}
      variant="cases"
    />
  );

  const renderErrorState = () => (
    <GlassCard style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{tx('error.title', 'Error')}</Text>
      <Text style={styles.emptyDescription}>{error}</Text>
      <TouchableOpacity style={styles.addCaseButton} onPress={handleRefresh}>
        <Text style={styles.addCaseButtonText}>{tx('error.retry', 'Reintentar')}</Text>
      </TouchableOpacity>
    </GlassCard>
  );

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{tx('header.title', 'Mis casos')}</Text>
            <Text style={styles.headerSubtitle}>
              {isLoading
                ? tx('header.loadingSubtitle', 'Sincronizando informacion')
                : tx('header.activeCases', '{{count}} casos activos', { count: cases.length })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.addHeaderButton} onPress={handleOpenAddCase}>
              <PlusIcon />
              <Text style={styles.addHeaderButtonText}>{tx('header.add', 'Agregar')}</Text>
            </TouchableOpacity>
            {__DEV__ ? (
              <TouchableOpacity style={styles.devPreviewButton} onPress={handleOpenLoadingPreview}>
                <Text style={styles.devPreviewButtonText}>{tx('header.devPreview', 'Preview')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.alertButton, alertsEnabled && styles.alertButtonActive]} onPress={handleAlertToggle}>
              {alertsEnabled ? <BellIcon size={20} color={colors.accent} /> : <BellOffIcon size={20} color={colors.warm.inkFaint} />}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}>
          {isLoading ? renderLoadingState() : error && cases.length === 0 ? renderErrorState() : cases.length === 0 ? renderEmptyState() : (
            <>
              {cases.length > 0 ? (
                <View style={styles.casesSection}>
                  {cases.map((caseItem) => (
                    <View key={caseItem.id} style={styles.caseContainer}>
                      <CaseCard case={caseItem} isPro={isPro} onPaywall={handlePaywall} onCommunity={handleCommunity} onPress={() => handleCasePress(caseItem)} />
                      {expandedTimelineId === caseItem.id && (
                        <CaseTimeline steps={caseItem.timeline} accentColor={caseItem.accentColor} initialExpanded={expandedTimelineId === caseItem.id} onExpandedChange={(expanded) => handleTimelineToggle(caseItem.id, expanded)} />
                      )}
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.proSection}>
                <Text style={styles.sectionTitle}>
                  {isPro
                    ? tx('section.pro', 'Herramientas Pro')
                    : tx('section.unlockPro', 'Desbloquea Pro')}
                </Text>
                <ProTabs isPro={isPro} activeTab={activeProTab} onTabChange={setActiveProTab} onPaywall={handlePaywall} style={styles.proTabs}>{renderProTabContent}</ProTabs>
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
      </SafeAreaView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  headerTitleContainer: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSize['2xl'], fontFamily: typography.fontFamily.bold, color: colors.warm.ink },
  headerSubtitle: { fontSize: typography.fontSize.sm, color: colors.warm.inkSoft, marginTop: spacing.xs },
  addHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
  },
  addHeaderButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.cream,
  },
  devPreviewButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warm.sand,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  devPreviewButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  alertButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.warm.sand, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.warm },
  alertButtonActive: { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}30` },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },
  casesSection: { paddingHorizontal: spacing.base },
  caseContainer: { marginBottom: spacing.md },
  proSection: { marginTop: spacing.lg, paddingHorizontal: spacing.base },
  sectionTitle: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.semibold, color: colors.warm.ink, marginBottom: spacing.md },
  proTabs: { minHeight: 400 },
  emptyCard: { margin: spacing.base, padding: spacing.xl, alignItems: 'center' },
  emptyTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.semibold, color: colors.warm.ink, marginBottom: spacing.sm },
  emptyDescription: { fontSize: typography.fontSize.base, color: colors.warm.inkSoft, textAlign: 'center', marginBottom: spacing.lg },
  addCaseButton: { backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full },
  addCaseButtonText: { fontSize: typography.fontSize.md, fontFamily: typography.fontFamily.semibold, color: colors.warm.cream },
});

export default CasesScreen;
