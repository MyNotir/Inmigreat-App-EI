/**
 * CaseDetailScreen
 *
 * Full detail view for a single immigration case.
 * Shows case info, expanded timeline, and Pro tools.
 *
 * Validates: Requirements 6.2, 6.3, 6.7, 6.8
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Svg, { Path } from 'react-native-svg';

import { WarmScreen } from '../components/common/WarmScreen';
import { BrandedLoadingState } from '../components/common/BrandedLoadingState';
import { GlassCard } from '../components/common/GlassCard';
import { StressBanner } from '../components/common/StressBanner';
import { WarmCard } from '../components/common/WarmCard';
import { WarmButton } from '../components/common/WarmButton';
import { CaseCard } from '../components/cases/CaseCard';
import { EoirCaptchaModal } from '../components/cases/EoirCaptchaModal';
import { CaseTimeline } from '../components/cases/CaseTimeline';
import { ProTabs, type ProTabId } from '../components/cases/ProTabs';
import { ForecastTab } from '../components/cases/pro/ForecastTab';
import { IntelligenceTab } from '../components/cases/pro/IntelligenceTab';
import { AcceleratorsTab } from '../components/cases/pro/AcceleratorsTab';
import { AlertsTab } from '../components/cases/pro/AlertsTab';
import { useAuth } from '../context/AuthContext';
import { useAppAlert } from '../context/AppAlertContext';
import { useEoirCaptchaChallenge } from '../hooks/useEoirCaptchaChallenge';
import { usePremiumPaywall } from '../hooks/usePremiumPaywall';
import { useViewTranslation } from '../i18n';
import { casesService } from '../services/cases';
import {
  EOIR_HCAPTCHA_TOKEN_SETTLE_DELAY_MS,
  normalizeEoirLanguageCode,
  validateEoirCase,
} from '../services/eoir';
import { colors, spacing, typography } from '../styles/theme';
import type { CaseDetail, CaseSource } from '../types/case';
import type { CasesStackParamList, MainTabParamList } from '../types/navigation';

type CaseDetailRouteProp = RouteProp<CasesStackParamList, 'CaseDetail'>;
type CaseDetailNavProp = StackNavigationProp<CasesStackParamList, 'CaseDetail'>;

type CaseDetailTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

const BackIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = colors.warm.ink,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M12 19l-7-7 7-7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

function formatCaseDate(value: string | undefined, locale: string | undefined): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale ?? 'es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function formatOptionalCaseDate(value: string | null | undefined, locale: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return formatCaseDate(value, locale);
}

function getEoirSyncStatusLabel(status: string | undefined, tx: CaseDetailTranslate): string {
  switch (status) {
    case 'SYNCED':
      return tx('status.synced', 'Sincronizado');
    case 'PENDING':
      return tx('status.pending', 'Pendiente');
    case 'FAILED':
      return tx('status.failed', 'Con error');
    case 'MANUAL_REQUIRED':
      return tx('status.manualRequired', 'Alta inicial guardada');
    default:
      return status ?? '-';
  }
}

function formatBooleanLabel(value: boolean | undefined, tx: CaseDetailTranslate): string {
  if (value === undefined) {
    return '-';
  }

  return value ? tx('status.yes', 'Si') : tx('status.no', 'No');
}

function formatOptionalNumber(value: number | undefined, locale: string | undefined): string | undefined {
  return typeof value === 'number' ? new Intl.NumberFormat(locale ?? 'es').format(value) : undefined;
}

export const CaseDetailScreen: React.FC = () => {
  const navigation = useNavigation<CaseDetailNavProp>();
  const route = useRoute<CaseDetailRouteProp>();
  const { caseId, initialCase } = route.params;
  const caseSource: CaseSource =
    route.params.source ?? initialCase?.source ?? (initialCase?.type === 'EOIR' ? 'eoir' : 'uscis');
  const { subscriptionStatus } = useAuth();
  const { showAlert } = useAppAlert();
  const isPro = subscriptionStatus.isPro;
  const { t, i18n } = useViewTranslation('case-detail');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const locale = i18n.resolvedLanguage ?? 'es';
  const { requestToken: requestEoirCaptchaToken, modalProps: eoirCaptchaModalProps } = useEoirCaptchaChallenge();
  const { openPaywall, paywallElement } = usePremiumPaywall({
    subtitle: tx('paywall.subtitle', 'Desbloquea el analisis Pro del caso'),
    description: tx(
      'paywall.description',
      'Accede a predicciones, inteligencia, aceleradores y alertas premium para entender mejor el contexto de este caso.',
    ),
  });

  const [caseData, setCaseData] = useState<CaseDetail | null>(initialCase ?? null);
  const [isLoading, setIsLoading] = useState(initialCase === undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isManualRefreshRunning, setIsManualRefreshRunning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeProTab, setActiveProTab] = useState<ProTabId>('forecast');
  const caseDataRef = useRef<CaseDetail | null>(initialCase ?? null);
  const hasFocusedOnceRef = useRef(false);

  useEffect(() => {
    caseDataRef.current = caseData;
  }, [caseData]);

  const fetchCase = useCallback(async (mode: 'blocking' | 'background' = 'blocking') => {
    try {
      if (mode === 'blocking') {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);
      const nextCase = await casesService.getCaseById(caseId, caseSource);
      caseDataRef.current = nextCase;
      setCaseData(nextCase);
    } catch {
      if (!caseDataRef.current) {
        setError(tx('feedback.loadError', 'No se pudo cargar el caso. Intenta de nuevo.'));
      }
    } finally {
      if (mode === 'blocking') {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, [caseId, caseSource, tx]);

  useFocusEffect(
    useCallback(() => {
      const shouldUseBackgroundRefresh = hasFocusedOnceRef.current || caseDataRef.current !== null;
      hasFocusedOnceRef.current = true;
      void fetchCase(shouldUseBackgroundRefresh ? 'background' : 'blocking');
    }, [fetchCase]),
  );

  const handlePaywall = useCallback(() => {
    const currentCase = caseDataRef.current;

    openPaywall({
      title: tx('paywall.title', 'InMiGreat Pro'),
      subtitle: tx('paywall.subtitle', 'Desbloquea el analisis Pro del caso'),
      showChatButton: true,
      chatCtaLabel: tx('paywall.chatCta', 'Preguntar a la AI'),
      onOpenChat: () => {
        if (!currentCase) {
          return;
        }

        navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Chat', {
          caseId: currentCase.id,
          caseSource,
          userUscisCaseId: caseSource === 'uscis' ? currentCase.id : undefined,
          userEoirCaseId: caseSource === 'eoir' ? currentCase.id : undefined,
          sourceScreen: 'CaseDetail',
          sourceAction: caseSource === 'eoir'
            ? 'open_chat_from_eoir_case_paywall'
            : 'open_chat_from_uscis_case_paywall',
        });
      },
    });
  }, [caseSource, navigation, openPaywall, tx]);

  const handleCommunity = useCallback(() => {
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Community');
  }, [navigation]);

  const handleAskAiAboutCase = useCallback(() => {
    const currentCase = caseDataRef.current;
    if (!currentCase) {
      return;
    }

    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Chat', {
      caseId: currentCase.id,
      caseSource,
      userUscisCaseId: caseSource === 'uscis' ? currentCase.id : undefined,
      userEoirCaseId: caseSource === 'eoir' ? currentCase.id : undefined,
      sourceScreen: 'CaseDetail',
      sourceAction: caseSource === 'eoir' ? 'ask_about_eoir_case' : 'ask_about_uscis_case',
    });
  }, [caseSource, navigation]);

  const handleDeleteTrackedCase = useCallback(async () => {
    if (!caseData) {
      return;
    }

    setIsDeleting(true);
    setActionError(null);

    try {
      await casesService.deleteCase(caseData.id, caseSource);
      navigation.goBack();
    } catch (deleteError) {
      console.error('[CaseDetail] Delete failed', deleteError);
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : tx('feedback.deleteError', 'No pudimos eliminar el caso. Intenta de nuevo.'),
      );
    } finally {
      setIsDeleting(false);
    }
  }, [caseData, caseSource, navigation, tx]);

  const confirmDeleteTrackedCase = useCallback(() => {
    showAlert({
      title: tx('confirmDelete.title', 'Eliminar seguimiento'),
      message: tx('confirmDelete.message', 'Esta accion dejara de seguir este caso en tu cuenta actual.'),
      tone: 'warning',
      actions: [
        { label: tx('confirmDelete.cancel', 'Cancelar'), style: 'cancel' },
        {
          label: tx('confirmDelete.confirm', 'Eliminar'),
          style: 'destructive',
          onPress: () => {
            void handleDeleteTrackedCase();
          },
        },
      ],
    });
  }, [handleDeleteTrackedCase, showAlert, tx]);

  const handleManualEoirRefresh = useCallback(async () => {
    const currentCase = caseDataRef.current;
    if (!currentCase?.eoir) {
      return;
    }

    const alienNumber = currentCase.eoir.alienNumber ?? currentCase.receiptNumber;
    const nationalityCode = currentCase.eoir.nationalityCode;

    if (!alienNumber || !nationalityCode) {
      setActionError(tx('feedback.missingEoirData', 'Faltan datos del caso EOIR para volver a consultarlo.'));
      return;
    }

    setIsManualRefreshRunning(true);
    setActionError(null);

    try {
      const captchaToken = await requestEoirCaptchaToken();

      await new Promise((resolve) => {
        setTimeout(resolve, EOIR_HCAPTCHA_TOKEN_SETTLE_DELAY_MS);
      });

      const validation = await validateEoirCase({
        alienNumber,
        nationalityCode,
        captchaToken,
        languageCode: normalizeEoirLanguageCode(),
      });

      const updatedCase = await casesService.refreshEoirCaseTracking({
        trackingId: currentCase.id,
        context: {
          alienNumber,
          alias: currentCase.eoir.alias ?? currentCase.category,
          nationalityCode: currentCase.eoir.nationalityCode,
          nationalityLabel: currentCase.eoir.nationalityLabel ?? currentCase.eoir.nationality,
          hasLawyer: currentCase.eoir.hasLawyer,
        },
        validation,
      });

      caseDataRef.current = updatedCase;
      setCaseData(updatedCase);
    } catch (refreshError) {
      console.error('[CaseDetail] EOIR refresh failed', refreshError);
      setActionError(
        refreshError instanceof Error
          ? refreshError.message
          : tx('feedback.refreshEoirError', 'No pudimos actualizar el caso EOIR. Intenta de nuevo.'),
      );
    } finally {
      setIsManualRefreshRunning(false);
    }
  }, [requestEoirCaptchaToken, tx]);

  const renderUnavailableCard = useCallback((title: string, description: string) => (
    <GlassCard style={styles.unavailableCard}>
      <Text style={styles.unavailableTitle}>{title}</Text>
      <Text style={styles.unavailableDescription}>{description}</Text>
    </GlassCard>
  ), []);

  const renderProTabContent = useCallback(
    (tab: ProTabId) => {
      switch (tab) {
        case 'forecast':
          return caseData?.forecast
            ? <ForecastTab data={caseData.forecast} />
            : renderUnavailableCard(
              tx('unavailable.forecastTitle', 'Pronostico no disponible'),
              tx('unavailable.forecastDescription', 'Todavia no hay suficientes datos para calcular un pronostico para este caso.'),
            );
        case 'intelligence':
          return caseData?.intelligence
            ? (
              <IntelligenceTab
                serviceCenters={caseData.intelligence.serviceCenters}
                visaBulletin={caseData.intelligence.visaBulletin}
                userWaitComparison={caseData.intelligence.userWaitComparison}
              />
            )
            : renderUnavailableCard(
              tx('unavailable.intelligenceTitle', 'Inteligencia no disponible'),
              tx('unavailable.intelligenceDescription', 'Aun no tenemos comparativas ni lectura de boletin para este caso.'),
            );
        case 'accelerators':
          return (
            <AcceleratorsTab
              accelerators={[
                {
                  id: '1',
                  title: tx('demo.accelerators.employmentLetter.title', 'Carta de empleo'),
                  description: tx('demo.accelerators.employmentLetter.description', 'Fortalece tu caso'),
                  impact: 'high',
                  details: tx('demo.accelerators.employmentLetter.details', 'Solicita carta actualizada'),
                  actionLabel: tx('demo.accelerators.employmentLetter.action', 'Ver plantilla'),
                  icon: 'document',
                },
              ]}
            />
          );
        case 'alerts':
          return (
            <AlertsTab
              alerts={[
                {
                  id: '1',
                  type: 'approval',
                  title: tx('demo.alerts.similarApproval.title', 'Caso similar aprobado'),
                  description: tx('demo.alerts.similarApproval.description', 'Maria G. recibio aprobacion'),
                  timestamp: tx('demo.alerts.similarApproval.timestamp', 'hace 1h'),
                  matchedUsersCount: 15,
                },
              ]}
            />
          );
        default:
          return null;
      }
    },
    [caseData?.forecast, caseData?.intelligence, renderUnavailableCard, tx]
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <BrandedLoadingState
          title={tx('loading.title', 'Cargando tu caso')}
          subtitle={tx('loading.subtitle', 'Sincronizando timeline, estatus y herramientas relacionadas.')}
          variant="cases"
          style={styles.loadingState}
        />
      );
    }

    const renderInfoRow = (label: string, value?: string) => (
      <View style={styles.infoRow} key={label}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} selectable>
          {value?.trim() ? value : '-'}
        </Text>
      </View>
    );

    const hasDisplayValue = (value?: string) => Boolean(value?.trim());

    const renderOptionalInfoRow = (label: string, value?: string) => {
      return hasDisplayValue(value) ? renderInfoRow(label, value) : null;
    };

    const renderSectionEmptyState = (message: string) => (
      <Text style={styles.emptySectionText}>{message}</Text>
    );

    if (error || !caseData) {
      return (
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>{tx('error.title', 'Error')}</Text>
          <Text style={styles.errorDescription}>{error ?? tx('error.notFound', 'Caso no encontrado.')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void fetchCase('blocking')}>
            <Text style={styles.retryButtonText}>{tx('error.retry', 'Reintentar')}</Text>
          </TouchableOpacity>
        </GlassCard>
      );
    }

    if (caseData.type === 'EOIR' && caseData.eoir) {
      const eoir = caseData.eoir;
      const hearing = eoir.hearing;
      const proceeding = eoir.proceeding;
      const appeal = eoir.appeal;
      const motions = eoir.motions;
      const operational = eoir.operational;
      const hasHearingDetails = Boolean(
        hearing ||
        eoir.nextHearingAt ||
        eoir.nextHearingDate ||
        eoir.nextHearingTime ||
        eoir.hearingType ||
        eoir.judgeName ||
        eoir.hearingLocation,
      );
      const hasProceedingDetails = Boolean(
        proceeding || eoir.proceedingDecision || eoir.statusLabel,
      );
      const hasAppealDetails = Boolean(
        appeal || eoir.appealDecision,
      );
      const hasMotionOrOperationalDetails = Boolean(
        motions || operational,
      );

      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <CaseCard
              case={caseData}
              isPro={isPro}
              onPaywall={handlePaywall}
              onCommunity={handleCommunity}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryActionButton, isManualRefreshRunning && styles.actionButtonDisabled]}
                onPress={() => void handleManualEoirRefresh()}
                disabled={isManualRefreshRunning || isDeleting}
              >
                <Text style={styles.primaryActionButtonText}>
                  {isManualRefreshRunning
                    ? tx('actions.refreshingEoir', 'Actualizando...')
                    : tx('actions.refreshEoir', 'Actualizar EOIR')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionButton, isDeleting && styles.actionButtonDisabled]}
                onPress={confirmDeleteTrackedCase}
                disabled={isDeleting || isManualRefreshRunning}
              >
                <Text style={styles.secondaryActionButtonText}>
                  {isDeleting ? tx('actions.deleting', 'Eliminando...') : tx('actions.delete', 'Eliminar')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.chatActionButton}
              onPress={handleAskAiAboutCase}
              activeOpacity={0.75}
              disabled={isDeleting || isManualRefreshRunning}
            >
              <Text style={styles.chatActionButtonText}>{tx('actions.askAi', 'Preguntar a la AI sobre este caso')}</Text>
            </TouchableOpacity>

            {actionError ? (
              <GlassCard style={styles.inlineErrorCard}>
                <Text style={styles.inlineErrorText} selectable>
                  {actionError}
                </Text>
              </GlassCard>
            ) : null}

            {eoir.syncError ? (
              <GlassCard style={styles.inlineWarningCard}>
                <Text style={styles.inlineWarningTitle}>{tx('notices.syncErrorTitle', 'Ultimo error de sincronizacion')}</Text>
                <Text style={styles.inlineWarningText} selectable>
                  {eoir.syncError}
                </Text>
              </GlassCard>
            ) : null}
          </View>

          <View style={styles.section}>
            <GlassCard style={styles.infoNoticeCard}>
              <Text style={styles.infoNoticeTitle}>{tx('notices.sourceTitle', 'Fuente EOIR / ACIS')}</Text>
              <Text style={styles.infoNoticeText}>
                {tx(
                  'notices.sourceDescription',
                  'EOIR muestra informacion basica y puede tardar en reflejar cambios recientes. Los notices oficiales del tribunal y de BIA siguen siendo la fuente principal del caso.',
                )}
              </Text>
            </GlassCard>
          </View>

          <View style={styles.section}>
            <GlassCard style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{tx('sections.tracking', 'Seguimiento')}</Text>
              {renderInfoRow(tx('fields.alienNumber', 'Alien Number'), eoir.alienNumber ?? caseData.receiptNumber)}
              {renderOptionalInfoRow(tx('fields.person', 'Persona'), eoir.personName)}
              {renderOptionalInfoRow(tx('fields.caseId', 'Case ID'), eoir.caseNumber ?? eoir.sourceCaseKey)}
              {renderInfoRow(tx('fields.court', 'Corte'), eoir.courtName ?? caseData.serviceCenter)}
              {renderInfoRow(tx('fields.primaryStatus', 'Estado principal'), caseData.status.label)}
              {renderInfoRow(tx('fields.nationality', 'Nacionalidad'), eoir.nationalityLabel ?? eoir.nationality ?? eoir.nationalityCode)}
              {renderInfoRow(tx('fields.hasLawyer', 'Tiene abogado'), formatBooleanLabel(eoir.hasLawyer, tx))}
              {renderInfoRow(tx('fields.syncStatus', 'Estado sync'), getEoirSyncStatusLabel(eoir.syncStatus, tx))}
              {renderInfoRow(tx('fields.lastReview', 'Ultima revision'), formatCaseDate(eoir.lastCheckedAt, locale))}
              {renderInfoRow(tx('fields.lastSnapshot', 'Ultimo snapshot'), formatCaseDate(eoir.lastSnapshotAt, locale))}
              {renderInfoRow(tx('fields.savedSnapshots', 'Snapshots guardados'), formatOptionalNumber(eoir.snapshotCount, locale))}
              {renderOptionalInfoRow(tx('fields.trackingId', 'Tracking ID'), eoir.trackingId)}
            </GlassCard>
          </View>

          <View style={styles.section}>
            <GlassCard style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{tx('sections.nextHearing', 'Proxima audiencia')}</Text>
              {hasHearingDetails ? (
                <>
                  {renderOptionalInfoRow(tx('fields.date', 'Fecha'), hearing?.date ?? eoir.nextHearingDate ?? formatOptionalCaseDate(eoir.nextHearingAt, locale))}
                  {renderOptionalInfoRow(tx('fields.time', 'Hora'), hearing?.time ?? eoir.nextHearingTime)}
                  {renderOptionalInfoRow(tx('fields.type', 'Tipo'), hearing?.type ?? eoir.hearingType)}
                  {renderOptionalInfoRow(tx('fields.medium', 'Medio'), hearing?.medium)}
                  {renderOptionalInfoRow(tx('fields.calendar', 'Calendario'), hearing?.calendarType)}
                  {renderOptionalInfoRow(tx('fields.schedule', 'Agenda'), hearing?.scheduleType)}
                  {renderOptionalInfoRow(tx('fields.judge', 'Juez'), hearing?.judgeName ?? eoir.judgeName)}
                  {renderOptionalInfoRow(tx('fields.location', 'Lugar'), hearing?.location ?? eoir.hearingLocation)}
                  {renderOptionalInfoRow(tx('fields.contactAddress', 'Direccion de contacto'), hearing?.contactAddress)}
                  {renderOptionalInfoRow(tx('fields.contactPhone', 'Telefono de contacto'), hearing?.contactPhone)}
                </>
              ) : (
                renderSectionEmptyState(tx('empty.noHearings', 'No hay audiencias futuras reportadas en EOIR.'))
              )}
            </GlassCard>
          </View>

          <View style={styles.section}>
            <GlassCard style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{tx('sections.proceeding', 'Proceeding y decision')}</Text>
              {hasProceedingDetails ? (
                <>
                  {renderInfoRow(tx('fields.currentStatus', 'Estado actual'), caseData.status.label)}
                  {renderOptionalInfoRow(tx('fields.decision', 'Decision'), proceeding?.decisionLabel ?? eoir.proceedingDecision ?? eoir.statusLabel)}
                  {renderOptionalInfoRow(tx('fields.summary', 'Resumen'), proceeding?.decisionSummary)}
                  {renderOptionalInfoRow(tx('fields.caseType', 'Tipo de caso'), proceeding?.caseType)}
                  {renderOptionalInfoRow(tx('fields.decisionDate', 'Fecha de decision'), formatOptionalCaseDate(proceeding?.completedAt, locale))}
                  {renderOptionalInfoRow(tx('fields.appealDeadline', 'Fecha limite de apelacion'), formatOptionalCaseDate(proceeding?.appealDueAt, locale))}
                  {renderOptionalInfoRow(tx('fields.judge', 'Juez'), proceeding?.judgeName ?? eoir.judgeName)}
                  {renderOptionalInfoRow(tx('fields.hearingLocation', 'Lugar de audiencia'), proceeding?.hearingLocation)}
                  {renderOptionalInfoRow(tx('fields.contactAddress', 'Direccion de contacto'), proceeding?.contactAddress)}
                  {renderOptionalInfoRow(tx('fields.contactPhone', 'Telefono de contacto'), proceeding?.contactPhone)}
                  {renderOptionalInfoRow(tx('fields.releaseInfo', 'Informacion de liberacion'), proceeding?.releaseInfo)}
                </>
              ) : (
                renderSectionEmptyState(tx('empty.noProceeding', 'EOIR no reporta una decision principal o cierre de proceeding para este caso.'))
              )}
            </GlassCard>
          </View>

          <View style={styles.section}>
            <GlassCard style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{tx('sections.appeal', 'Apelacion BIA')}</Text>
              {hasAppealDetails ? (
                <>
                  {renderOptionalInfoRow(tx('fields.appealStatus', 'Estado de apelacion'), appeal?.decisionLabel ?? eoir.appealDecision)}
                  {renderOptionalInfoRow(tx('fields.summary', 'Resumen'), appeal?.decisionSummary)}
                  {renderOptionalInfoRow(tx('fields.pendingBia', 'Pendiente ante BIA'), appeal?.pendingAtBia ? tx('status.yes', 'Si') : undefined)}
                  {renderOptionalInfoRow(tx('fields.appealFiled', 'Apelacion presentada'), formatOptionalCaseDate(appeal?.filedAt, locale))}
                  {renderOptionalInfoRow(tx('fields.appealType', 'Tipo de apelacion'), appeal?.appealType)}
                  {renderOptionalInfoRow(tx('fields.biaDecisionDate', 'Fecha de decision BIA'), formatOptionalCaseDate(appeal?.decisionAt, locale))}
                  {renderOptionalInfoRow(tx('fields.alienBriefDue', 'Brief del migrante vence'), formatOptionalCaseDate(appeal?.alienBriefDueAt, locale))}
                  {renderOptionalInfoRow(tx('fields.alienBriefFiled', 'Brief del migrante presentado'), formatOptionalCaseDate(appeal?.alienBriefFiledAt, locale))}
                  {renderOptionalInfoRow(tx('fields.alienBriefStatus', 'Estado brief migrante'), appeal?.alienBriefStatus)}
                  {renderOptionalInfoRow(tx('fields.dhsBriefDue', 'Brief DHS vence'), formatOptionalCaseDate(appeal?.dhsBriefDueAt, locale))}
                  {renderOptionalInfoRow(tx('fields.dhsBriefFiled', 'Brief DHS presentado'), formatOptionalCaseDate(appeal?.dhsBriefFiledAt, locale))}
                  {renderOptionalInfoRow(tx('fields.dhsBriefStatus', 'Estado briefing DHS'), appeal?.dhsBriefStatus)}
                </>
              ) : (
                renderSectionEmptyState(tx('empty.noAppeal', 'No hay informacion de apelacion BIA reportada para este caso.'))
              )}
            </GlassCard>
          </View>

          <View style={styles.section}>
            <GlassCard style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{tx('sections.motions', 'Motions y senales operativas')}</Text>
              {hasMotionOrOperationalDetails ? (
                <>
                  {renderOptionalInfoRow(tx('fields.mtrDecision', 'Decision MTR'), motions?.mtrDecisionLabel)}
                  {renderOptionalInfoRow(tx('fields.mtrDecisionDate', 'Fecha decision MTR'), formatOptionalCaseDate(motions?.mtrDecisionAt, locale))}
                  {renderOptionalInfoRow(tx('fields.mtrAppealFiled', 'Apelacion MTR presentada'), formatOptionalCaseDate(motions?.mtrAppealFiledAt, locale))}
                  {renderOptionalInfoRow(tx('fields.mtrBiaAppeal', 'Apelacion BIA de MTR'), motions?.mtrBiaAppeal)}
                  {renderOptionalInfoRow(tx('fields.mtrBiaType', 'Tipo MTR BIA'), motions?.mtrBiaType)}
                  {renderOptionalInfoRow(tx('fields.motionToReopen', 'Motion to reopen'), motions?.reopenExists ? tx('status.reported', 'Reportada') : undefined)}
                  {renderOptionalInfoRow(tx('fields.reopenDecision', 'Decision reopen'), motions?.reopenDecisionLabel)}
                  {renderOptionalInfoRow(tx('fields.reopenSummary', 'Resumen reopen'), motions?.reopenDecisionSummary)}
                  {renderOptionalInfoRow(tx('fields.reopenDecisionDate', 'Fecha decision reopen'), formatOptionalCaseDate(motions?.reopenDecisionAt, locale))}
                  {renderOptionalInfoRow(tx('fields.reopenReceived', 'Motion reopen recibida'), formatOptionalCaseDate(motions?.reopenMotionReceivedAt, locale))}
                  {renderOptionalInfoRow(tx('fields.clockStatus', 'Estado del clock'), operational?.clockStatus)}
                  {renderOptionalInfoRow(tx('fields.docketDate', 'Fecha de docket'), formatOptionalCaseDate(operational?.docketDate, locale))}
                  {renderOptionalInfoRow(tx('fields.elapsedDays', 'Dias transcurridos'), formatOptionalNumber(operational?.elapsedDays, locale))}
                  {renderOptionalInfoRow(tx('fields.latestCalendarType', 'Ultimo tipo de calendario'), operational?.latestCalendarType)}
                  {renderOptionalInfoRow(tx('fields.oscDate', 'Fecha OSC'), formatOptionalCaseDate(operational?.oscDate, locale))}
                  {renderOptionalInfoRow(tx('fields.caseContactAddress', 'Direccion de contacto del caso'), operational?.caseContactAddress)}
                  {renderOptionalInfoRow(tx('fields.caseContactPhone', 'Telefono de contacto del caso'), operational?.caseContactPhone)}
                  {!operational?.caseContactAddress && !operational?.caseContactPhone
                    ? renderOptionalInfoRow(tx('fields.caseContactInfo', 'Contacto del caso'), operational?.caseContactInfo)
                    : null}
                </>
              ) : (
                renderSectionEmptyState(tx('empty.noMotions', 'No hay motions ni senales operativas adicionales reportadas por EOIR.'))
              )}
            </GlassCard>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Case card (non-interactive in detail view) */}
        <View style={styles.section}>
          <CaseCard
            case={caseData}
            isPro={isPro}
            onPaywall={handlePaywall}
            onCommunity={handleCommunity}
          />
        </View>

        {/* Expanded timeline */}
        <View style={styles.section}>
          <CaseTimeline
            steps={caseData.timeline}
            accentColor={caseData.accentColor}
            initialExpanded
          />
        </View>

        {/* Pro tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isPro
              ? tx('sections.proTools', 'Herramientas Pro')
              : tx('sections.unlockPro', 'Desbloquea Pro')}
          </Text>
          {isRefreshing ? <Text style={styles.refreshingText}>{tx('notices.refreshingCase', 'Actualizando datos del caso...')}</Text> : null}
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

        <View style={styles.section}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.chatActionButton}
              onPress={handleAskAiAboutCase}
              activeOpacity={0.75}
              disabled={isDeleting || isRefreshing}
            >
              <Text style={styles.chatActionButtonText}>{tx('actions.askAi', 'Preguntar a la AI sobre este caso')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionButton, isDeleting && styles.actionButtonDisabled]}
              onPress={confirmDeleteTrackedCase}
              disabled={isDeleting || isRefreshing}
            >
              <Text style={styles.secondaryActionButtonText}>
                {isDeleting
                  ? tx('actions.deleting', 'Eliminando...')
                  : tx('actions.deleteTracking', 'Eliminar seguimiento')}
              </Text>
            </TouchableOpacity>
          </View>

          {actionError ? (
            <GlassCard style={styles.inlineErrorCard}>
              <Text style={styles.inlineErrorText} selectable>
                {actionError}
              </Text>
            </GlassCard>
          ) : null}
        </View>
      </ScrollView>
    );
  };

  // Detect stress level for the case to drive optional StressBanner.
  const caseStressLevel: 'calm' | 'elevated' | 'acute' = (() => {
    if (!caseData) return 'calm';
    if (caseData.urgency === 'high') return 'acute';
    const label = caseData.status?.label?.toLowerCase() ?? '';
    if (label.includes('rfe') || label.includes('denial') || label.includes('denegad') || label.includes('notice')) {
      return 'elevated';
    }
    return 'calm';
  })();

  const handleFindAttorney = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation as any).getParent()?.navigate('Resources', { screen: 'AttorneyDirectory' });
  };

  return (
    <WarmScreen edges={['top']}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <BackIcon size={20} color={colors.warm.clay} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerEyebrow}>TU CASO</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {caseData
                ? caseData.type === 'EOIR'
                  ? caseData.formNumber
                  : `${caseData.formNumber} — ${caseData.category}`
                : tx('header.fallbackTitle', 'Detalle del caso')}
            </Text>
            {caseData && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {caseData.type === 'EOIR'
                  ? caseData.eoir?.alienNumber ?? caseData.receiptNumber
                  : caseData.receiptNumber}
              </Text>
            )}
          </View>
        </View>

        {/* Stress-aware top banner: surfaces the right action for the moment. */}
        {caseData && caseStressLevel === 'acute' ? (
          <View style={styles.stressBannerWrap}>
            <StressBanner
              context={`${caseData.status.label} · ${caseData.formNumber}`}
              headline="Esto necesita atención hoy. Vamos paso por paso, contigo."
              ctaLabel="Hablar con un abogado verificado"
              level="acute"
              onCta={handleFindAttorney}
            />
          </View>
        ) : caseData && caseStressLevel === 'elevated' ? (
          <View style={styles.stressBannerWrap}>
            <StressBanner
              context={`${caseData.status.label}`}
              headline="Acción esta semana. Tienes tiempo, y aquí están tus opciones."
              ctaLabel="Ver opciones"
              level="elevated"
              onCta={handleFindAttorney}
            />
          </View>
        ) : null}

        {renderContent()}
        <EoirCaptchaModal {...eoirCaptchaModalProps} />
        {paywallElement}
    </WarmScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.warm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.warm.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  headerTitleContainer: { flex: 1 },
  headerEyebrow: {
    fontSize: typography.fontSize.xs - 1,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  stressBannerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },
  section: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryActionButton: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  primaryActionButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.cream,
  },
  secondaryActionButton: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.warm.sand,
    borderWidth: 1,
    borderColor: colors.border.warm,
    alignItems: 'center',
  },
  secondaryActionButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  chatActionButton: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: `${colors.pro}14`,
    borderWidth: 1,
    borderColor: `${colors.pro}35`,
    alignItems: 'center',
  },
  chatActionButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.pro,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  refreshingText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    marginBottom: spacing.md,
  },
  proTabs: { minHeight: 400 },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
  },
  errorCard: {
    margin: spacing.base,
    padding: spacing.xl,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.sm,
  },
  errorDescription: {
    fontSize: typography.fontSize.base,
    color: colors.warm.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 999,
  },
  retryButtonText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.cream,
  },
  unavailableCard: {
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  unavailableTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.sm,
  },
  unavailableDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  inlineErrorCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  inlineErrorText: {
    fontSize: typography.fontSize.sm,
    color: colors.status.urgentWarm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  inlineWarningCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(201, 122, 0, 0.08)',
    borderColor: 'rgba(201, 122, 0, 0.18)',
  },
  inlineWarningTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.xs,
  },
  inlineWarningText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  infoNoticeCard: {
    padding: spacing.md,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.18)',
  },
  infoNoticeTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.xs,
  },
  infoNoticeText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  infoCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoCardTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.warm,
  },
  infoLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
  },
  infoValue: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    textAlign: 'right',
  },
  emptySectionText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
});

export default CaseDetailScreen;
