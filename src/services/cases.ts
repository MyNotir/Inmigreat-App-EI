/**
 * Cases Service - Immigration case management via GraphQL
 * Validates: Requirements 5.1-5.6, 6.1-6.5
 */

import { ApiException } from './api';
import { query, mutation, GraphQLException, type GraphQLExceptionPayload } from './graphql';
import { storage } from './storage';
import type { EoirCaseValidationResult } from './eoir';
import type {
  Case,
  CaseDetail,
  CaseSource,
  EoirCaseInfo,
  ForecastData,
  IntelligenceData,
} from '../types/case';
import { colors } from '../styles/theme';

// ============================================================================
// Types
// ============================================================================

export interface CaseListResponse {
  cases: Case[];
  total: number;
}

export type CaseDetailResponse = CaseDetail;

export interface CaseUpdateEvent {
  type: 'case_updated';
  caseId: string;
  changes: Partial<Case>;
  timestamp: string;
}

export type CaseUpdateCallback = (event: CaseUpdateEvent) => void;

export type AddCaseSource = CaseSource;

export interface AddUscisCaseInput {
  kind: 'uscis';
  receiptNumber: string;
  alias?: string;
}

export interface AddEoirCaseDraftInput {
  kind: 'eoir';
  alienNumber: string;
  alias?: string;
  nationalityCode: string;
  nationalityLabel?: string;
  hasLawyer: boolean;
}

export type AddCaseInput = AddUscisCaseInput | AddEoirCaseDraftInput;

export interface AddEoirCaseTrackingRequest {
  draft: AddEoirCaseDraftInput;
  validation: EoirCaseValidationResult;
}

interface EoirPayloadContext {
  alienNumber: string;
  alias?: string;
  nationalityCode?: string;
  nationalityLabel?: string;
  hasLawyer?: boolean;
}

export interface RefreshEoirCaseTrackingRequest {
  trackingId: string;
  context: EoirPayloadContext;
  validation: EoirCaseValidationResult;
}

interface TrackedUscisCase {
  id: string;
  alias?: string | null;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  uscisCase: {
    type: string;
    receiptNumber: string;
    serviceCenter?: string | null;
    completionPercentage: number;
    statusLabel?: string | null;
    statusColor?: string | null;
    daysSinceUpdate: number;
    lastCheckedAt?: string | null;
    urgency: 'NORMAL' | 'HIGH';
    timeline?: Array<{
      label: string;
      date?: string | null;
      state: 'DONE' | 'CURRENT' | 'FUTURE';
      sortOrder: number;
    }> | null;
    forecast?: {
      estimatedDateRange?: string | null;
      confidencePercentage: number;
      velocityMetric?: string | null;
      riskFactors?: string[] | null;
      weeksRemaining?: number | null;
    } | null;
    intelligence?: {
      userWaitComparison?: string | null;
      visaBulletin?: unknown;
      serviceCenters?: Array<{
        name: string;
        speed: 'ACCELERATING' | 'STABLE' | 'SLOW';
        averageWeeks?: number | null;
        isUserCenter: boolean;
      }> | null;
    } | null;
  };
}

interface TrackedEoirCaseSnapshot {
  id: string;
  snapshotType: string;
  statusLabel?: string | null;
  nextHearingAt?: string | null;
  capturedAt: string;
}

interface TrackedEoirCase {
  id: string;
  eoirCaseId: string;
  alias?: string | null;
  category?: string | null;
  nationality?: string | null;
  isPrimary: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  eoirCase: {
    id: string;
    sourceCaseKey?: string | null;
    alienNumber?: string | null;
    caseNumber?: string | null;
    courtCode?: string | null;
    courtName?: string | null;
    judgeName?: string | null;
    hearingLocation?: string | null;
    hearingType?: string | null;
    nextHearingAt?: string | null;
    statusLabel?: string | null;
    lastCheckedAt?: string | null;
    rawData?: unknown;
    syncStatus: string;
    syncError?: string | null;
    snapshots?: TrackedEoirCaseSnapshot[] | null;
  };
}

interface ParsedEoirRawPayload {
  personName?: string;
  caseId?: string;
  nextHearingDate?: string;
  nextHearingTime?: string;
  judgeName?: string;
  hearingLocation?: string;
  hearingType?: string;
  proceedingDecision?: string;
  appealDecision?: string;
  nationalityCode?: string;
  nationalityLabel?: string;
  hasLawyer?: boolean;
  hearing?: EoirCaseInfo['hearing'];
  proceeding?: EoirCaseInfo['proceeding'];
  appeal?: EoirCaseInfo['appeal'];
  motions?: EoirCaseInfo['motions'];
  operational?: EoirCaseInfo['operational'];
  dominantStatusLabel?: string;
}

type TrackedTimelineState = 'DONE' | 'CURRENT' | 'FUTURE';

const CASE_TYPE_MAP: Record<string, Case['type']> = {
  I_485: 'I-485',
  I_765: 'I-765',
  I_130: 'I-130',
  I_140: 'I-140',
};

const ACCENT_COLOR_MAP: Record<Case['type'], string> = {
  'I-485': colors.caseAccent.greenCard,
  'I-765': colors.caseAccent.workPermit,
  EOIR: colors.caseAccent.asylum,
  'I-130': colors.caseAccent.citizenship,
  'I-140': colors.caseAccent.visa,
};

const STATUS_COLOR_MAP: Record<string, { color: string; backgroundColor: string; borderColor: string }> = {
  green: {
    color: colors.success,
    backgroundColor: 'rgba(52, 199, 89, 0.14)',
    borderColor: 'rgba(52, 199, 89, 0.28)',
  },
  red: {
    color: colors.error,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderColor: 'rgba(220, 38, 38, 0.24)',
  },
  orange: {
    color: colors.warning,
    backgroundColor: 'rgba(201, 122, 0, 0.12)',
    borderColor: 'rgba(201, 122, 0, 0.24)',
  },
  blue: {
    color: colors.status.inProgress,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.24)',
  },
};

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asOptionalString(value: unknown): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || undefined;
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asOptionalBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeLegacyEoirAddress(value: unknown): string | undefined {
  const normalized = asOptionalString(value);
  if (!normalized) {
    return undefined;
  }

  if (!normalized.includes('|')) {
    return normalized;
  }

  const parts = normalized.split('|').map((part) => part.trim()).filter(Boolean);
  return parts.slice(1).join(', ') || normalized;
}

function formatLegacyPhoneNumber(value?: string): string | undefined {
  const normalized = value?.replace(/\D/g, '');
  if (!normalized) {
    return undefined;
  }

  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }

  return value?.trim() || undefined;
}

function parseEoirCaseContactInfo(value: unknown): { address?: string; phone?: string } {
  const normalized = asOptionalString(value);
  if (!normalized) {
    return {};
  }

  const parts = normalized.split('|').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    const maybePhone = formatLegacyPhoneNumber(parts[0]);
    return maybePhone && maybePhone !== parts[0]
      ? { phone: maybePhone }
      : { address: parts[0] };
  }

  const phone = formatLegacyPhoneNumber(parts[parts.length - 1]);
  const address = parts.slice(0, -1).join(', ') || undefined;

  return {
    address,
    phone,
  };
}

function formatEoirTextDate(value?: string): string | undefined {
  const normalized = asOptionalString(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parsed.getDate()} ${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

function buildEoirAlienBriefStatus(filedAt?: string): string | undefined {
  const filedText = formatEoirTextDate(filedAt);
  return filedText ? `Brief del migrante recibido el ${filedText}.` : undefined;
}

function buildEoirDhsBriefStatus(dueAt?: string, filedAt?: string): string | undefined {
  const dueValue = asOptionalString(dueAt);
  if (!dueValue) {
    return undefined;
  }

  const parsedDueDate = new Date(dueValue);
  const isExpired = !Number.isNaN(parsedDueDate.getTime()) && Date.now() > parsedDueDate.getTime();
  const filingState = filedAt ? 'DHS presentó su brief.' : 'DHS no ha presentado brief.';

  return isExpired
    ? `El calendario de briefing venció. ${filingState}`
    : `El calendario de briefing sigue abierto. ${filingState}`;
}

function hasDefinedFieldValue(value: unknown): boolean {
  return value !== undefined && value !== null && !(typeof value === 'string' && value.trim().length === 0);
}

function buildDefinedSection<T extends Record<string, unknown>>(section: T): T | undefined {
  return Object.values(section).some(hasDefinedFieldValue) ? section : undefined;
}

function hasRawEoirSections(payload: Record<string, unknown>): boolean {
  return Boolean(
    payload.Data ||
    payload.Appeal ||
    payload.Proceeding ||
    payload.Schedule ||
    payload.MTR ||
    payload.Reopen,
  );
}

function resolveEoirRawResponse(root?: Record<string, unknown>): Record<string, unknown> | undefined {
  const nestedRawResponse = asObject(root?.rawResponse);
  if (nestedRawResponse) {
    return nestedRawResponse;
  }

  return root && hasRawEoirSections(root) ? root : undefined;
}

function getEoirProceedingDecisionLabel(
  decisionCode?: string,
  decisionSummary?: string,
): string | undefined {
  const normalizedCode = decisionCode?.trim().toUpperCase();

  switch (normalizedCode) {
    case 'T':
      return 'Procedimiento terminado';
    case 'U':
    case 'X':
      return 'Caso desestimado';
    case 'R':
      return 'Solicitud concedida';
    default:
      return decisionSummary ?? (normalizedCode ? `Decision ${normalizedCode}` : undefined);
  }
}

function getEoirAppealDecisionLabel(
  decisionCode?: string,
  decisionSummary?: string,
  pendingAtBia?: boolean,
): string | undefined {
  const normalizedCode = decisionCode?.trim().toUpperCase();

  if (pendingAtBia) {
    return 'Pendiente ante BIA';
  }

  switch (normalizedCode) {
    case 'SUD':
      return 'Apelacion desestimada';
    case 'ABC':
      return 'Apelacion cerrada administrativamente';
    case 'SDG':
      return 'Orden de expulsión emitida';
    default:
      return decisionSummary ?? (normalizedCode ? `Estado BIA ${normalizedCode}` : undefined);
  }
}

function buildEoirDominantStatusLabel(payload: ParsedEoirRawPayload): string | undefined {
  if (payload.hearing?.date || payload.hearing?.scheduledAt) {
    return 'Audiencia programada';
  }

  if (payload.appeal?.pendingAtBia) {
    return 'Pendiente ante BIA';
  }

  if (payload.appeal?.decisionLabel) {
    return payload.appeal.decisionLabel;
  }

  if (payload.appeal?.filedAt) {
    return 'Apelacion presentada';
  }

  if (payload.proceeding?.decisionLabel) {
    return payload.proceeding.decisionLabel;
  }

  if (payload.motions?.reopenDecisionLabel) {
    return payload.motions.reopenDecisionLabel;
  }

  if (payload.motions?.mtrDecisionLabel) {
    return payload.motions.mtrDecisionLabel;
  }

  return undefined;
}

function isCurrentOrUpcomingEoirHearing(date?: string, time?: string): boolean {
  const scheduledAt = buildEoirNextHearingAt(date, time);
  if (!scheduledAt) {
    return false;
  }

  const parsed = new Date(scheduledAt);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const now = new Date();
  const todayStartUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return parsed.getTime() >= todayStartUtc;
}

function parseEoirRawPayload(rawData: unknown): ParsedEoirRawPayload {
  const root = asObject(rawData);
  const normalizedResult = asObject(root?.normalizedResult);
  const appInput = asObject(root?.appInput);
  const rawResponse = resolveEoirRawResponse(root);
  const data = asObject(rawResponse?.Data);
  const appealSection = asObject(rawResponse?.Appeal);
  const proceedingSection = asObject(rawResponse?.Proceeding);
  const scheduleSection = asObject(rawResponse?.Schedule);
  const motionSection = asObject(rawResponse?.MTR);
  const reopenSection = asObject(rawResponse?.Reopen);
  const hasRawResponse = Boolean(rawResponse);
  const caseContact = parseEoirCaseContactInfo(data?.CaseContactInfo);
  const scheduleContact = parseEoirCaseContactInfo(scheduleSection?.ContactAddress);
  const proceedingContact = parseEoirCaseContactInfo(proceedingSection?.ContactAddress);

  const scheduledHearingDate =
    asOptionalString(scheduleSection?.AdjDate) ??
    (!hasRawResponse ? asOptionalString(normalizedResult?.nextHearingDate) : undefined);
  const scheduledHearingTime =
    asOptionalString(scheduleSection?.AdjTime) ??
    (!hasRawResponse ? asOptionalString(normalizedResult?.nextHearingTime) : undefined);
  const hasUpcomingScheduledHearing = isCurrentOrUpcomingEoirHearing(
    scheduledHearingDate,
    scheduledHearingTime,
  );
  const nextHearingDate = hasUpcomingScheduledHearing ? scheduledHearingDate : undefined;
  const nextHearingTime = hasUpcomingScheduledHearing ? scheduledHearingTime : undefined;
  const hearingType = hasUpcomingScheduledHearing
    ? (
      asOptionalString(scheduleSection?.ScheduleType) ??
      asOptionalString(scheduleSection?.CalType) ??
      (!hasRawResponse ? asOptionalString(normalizedResult?.hearingType) : undefined)
    )
    : undefined;
  const judgeName =
    asOptionalString(normalizedResult?.judgeName) ??
    asOptionalString(scheduleSection?.IJ_Name) ??
    asOptionalString(proceedingSection?.IJName);
  const hearingLocation =
    asOptionalString(normalizedResult?.hearingLocation) ??
    normalizeLegacyEoirAddress(scheduleSection?.HearingLocationAddress) ??
    normalizeLegacyEoirAddress(proceedingSection?.HearingLocationAddress) ??
    scheduleContact.address ??
    proceedingContact.address ??
    caseContact.address;

  const proceedingDecisionCode = asOptionalString(proceedingSection?.DecisionCode);
  const proceedingDecisionSummary = asOptionalString(data?.CaseDecisionString);
  const proceedingDecisionLabel = getEoirProceedingDecisionLabel(
    proceedingDecisionCode,
    proceedingDecisionSummary,
  );

  const appealFiledFlag = asOptionalBooleanLike(data?.AppealFiled);
  const caseAppealExistsFlag = asOptionalBooleanLike(data?.CaseAppealExists);
  const appealFlowSuppressed = appealFiledFlag === false || caseAppealExistsFlag === false;
  const pendingAtBia = asOptionalBooleanLike(data?.PendingAtBIA);
  const appealDecisionCode = asOptionalString(appealSection?.BIADecision);
  const appealDecisionSummary = asOptionalString(data?.AppealDecisionString);
  const appealDecisionLabel = getEoirAppealDecisionLabel(
    appealDecisionCode,
    appealDecisionSummary,
    pendingAtBia,
  );
  const appealFiledAt = asOptionalString(appealSection?.FiledDate);
  const appealType = asOptionalString(appealSection?.AppealType);
  const alienBriefDueAt = asOptionalString(appealSection?.AlienBriefDue);
  const alienBriefFiledAt = asOptionalString(appealSection?.AlienBriefFiled);
  const dhsBriefDueAt = asOptionalString(appealSection?.DHSBriefDue);
  const dhsBriefFiledAt = asOptionalString(appealSection?.DHSBriefFiled);

  const hearing = hasUpcomingScheduledHearing
    ? buildDefinedSection({
      scheduledAt: buildEoirNextHearingAt(nextHearingDate, nextHearingTime),
      date: nextHearingDate,
      time: nextHearingTime,
      type: hearingType,
      medium: asOptionalString(scheduleSection?.HearingMedium),
      calendarType:
        asOptionalString(scheduleSection?.CalType) ?? asOptionalString(data?.LatestCalType),
      scheduleType: asOptionalString(scheduleSection?.ScheduleType),
      judgeName,
      location: hearingLocation,
      locationCode:
        asOptionalString(scheduleSection?.HearingLocationCode) ??
        asOptionalString(proceedingSection?.HearingLocationCode),
      contactAddress:
        scheduleContact.address ??
        proceedingContact.address ??
        caseContact.address,
      contactPhone:
        scheduleContact.phone ??
        proceedingContact.phone ??
        caseContact.phone,
    })
    : undefined;

  const proceeding = buildDefinedSection({
    caseType: asOptionalString(proceedingSection?.CaseType),
    decisionCode: proceedingDecisionCode,
    decisionLabel: proceedingDecisionLabel,
    decisionSummary: proceedingDecisionSummary,
    completedAt: asOptionalString(proceedingSection?.CompDate),
    appealDueAt: asOptionalString(proceedingSection?.DateAppealDue),
    judgeName: asOptionalString(proceedingSection?.IJName) ?? judgeName,
    hearingLocation: normalizeLegacyEoirAddress(proceedingSection?.HearingLocationAddress),
    hearingLocationCode: asOptionalString(proceedingSection?.HearingLocationCode),
    contactAddress: proceedingContact.address,
    contactPhone: proceedingContact.phone,
    releaseInfo: asOptionalString(proceedingSection?.ReleaseInfo),
  });

  const hasAppealSignals = Boolean(
    appealFiledAt ||
      appealType ||
      appealDecisionCode,
  );
  const appeal = buildDefinedSection({
    exists:
      !appealFlowSuppressed &&
      (caseAppealExistsFlag === true || appealFiledFlag === true || pendingAtBia || hasAppealSignals)
        ? true
        : undefined,
    pendingAtBia: pendingAtBia ? true : undefined,
    filedAt: appealFiledAt,
    appealType,
    decisionCode: appealDecisionCode,
    decisionLabel: appealDecisionLabel,
    decisionSummary: appealDecisionSummary,
    decisionAt: asOptionalString(appealSection?.BIADecisionDate),
    alienBriefDueAt,
    alienBriefFiledAt,
    dhsBriefDueAt,
    dhsBriefFiledAt,
    alienBriefStatus: buildEoirAlienBriefStatus(alienBriefFiledAt),
    dhsBriefStatus: buildEoirDhsBriefStatus(dhsBriefDueAt, dhsBriefFiledAt),
  });

  const combinedCaseContactInfo = [caseContact.address, caseContact.phone].filter(Boolean).join(' · ') || undefined;

  const motions = buildDefinedSection({
    mtrDecisionLabel:
      asOptionalString(motionSection?.MTRDecision) ?? asOptionalString(data?.MTRDecisionString),
    mtrDecisionAt: asOptionalString(motionSection?.MTRDecisionDate),
    mtrAppealFiledAt: asOptionalString(motionSection?.MTRAppealFiledDate),
    mtrBiaAppeal: asOptionalString(data?.MTR_BIA_Appeal),
    mtrBiaType: asOptionalString(data?.MTR_BIA_Type),
    reopenExists: asOptionalBooleanLike(data?.ReopenExists) ? true : undefined,
    reopenDecisionLabel:
      asOptionalString(reopenSection?.Decision) ?? asOptionalString(data?.ReopenDecisionString),
    reopenDecisionSummary: asOptionalString(data?.ReopenDecisionString),
    reopenDecisionAt: asOptionalString(reopenSection?.CompDate),
    reopenMotionReceivedAt: asOptionalString(reopenSection?.MotionReceivedDate),
  });

  const operational = buildDefinedSection({
    validAlienNumber: asOptionalBooleanLike(data?.ValidAlienNumber),
    clockStatus: asOptionalString(data?.ClockStatus),
    docketDate: asOptionalString(data?.DocketDate),
    elapsedDays: asOptionalNumber(data?.ElapsedDays),
    latestCalendarType: asOptionalString(data?.LatestCalType),
    oscDate: asOptionalString(data?.OSC_Date),
    caseContactInfo: combinedCaseContactInfo,
    caseContactAddress: caseContact.address,
    caseContactPhone: caseContact.phone,
  });

  const parsedPayload: ParsedEoirRawPayload = {
    personName: asOptionalString(normalizedResult?.personName) ?? asOptionalString(data?.AlienName),
    caseId: asOptionalString(normalizedResult?.caseId) ?? asOptionalString(data?.CaseID),
    nextHearingDate,
    nextHearingTime,
    judgeName,
    hearingLocation,
    hearingType,
    proceedingDecision: proceedingDecisionLabel,
    appealDecision: appealDecisionLabel,
    nationalityCode: asOptionalString(appInput?.nationalityCode),
    nationalityLabel: asOptionalString(appInput?.nationalityLabel),
    hasLawyer: asOptionalBoolean(appInput?.hasLawyer),
    hearing,
    proceeding,
    appeal,
    motions,
    operational,
  };

  return {
    ...parsedPayload,
    dominantStatusLabel: buildEoirDominantStatusLabel(parsedPayload),
  };
}

function calculateDaysSince(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  const diffMs = Date.now() - parsed.getTime();
  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

function getEoirUrgency(nextHearingAt?: string | null): Case['urgency'] {
  if (!nextHearingAt) {
    return 'normal';
  }

  const parsed = new Date(nextHearingAt);
  if (Number.isNaN(parsed.getTime())) {
    return 'normal';
  }

  const diffDays = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 14 ? 'high' : 'normal';
}

function getEoirStatusColor(syncStatus: string) {
  switch (syncStatus) {
    case 'SYNCED':
      return STATUS_COLOR_MAP.green;
    case 'FAILED':
      return STATUS_COLOR_MAP.red;
    case 'MANUAL_REQUIRED':
      return STATUS_COLOR_MAP.orange;
    default:
      return STATUS_COLOR_MAP.blue;
  }
}

function isAddCaseHandledPayload(
  error: Pick<GraphQLExceptionPayload, 'message' | 'errors'>,
): boolean {
  const normalizedMessage = error.message.trim().toLowerCase();
  const extensionCode = error.errors?.[0]?.extensions?.code;
  const extensionStatus = error.errors?.[0]?.extensions?.status;

  return (
    normalizedMessage.includes('valid uscis receipt number') ||
    normalizedMessage.includes('already tracking') ||
    normalizedMessage.includes('not supported for tracking') ||
    normalizedMessage.includes('uscis case not found') ||
    normalizedMessage.includes('service timed out') ||
    normalizedMessage.includes('service is not available') ||
    normalizedMessage.includes('rate limit reached') ||
    normalizedMessage.includes('authentication failed') ||
    (extensionCode === 'NOT_FOUND' && extensionStatus === 404)
  );
}

function normalizeAddCaseError(error: unknown): Error {
  if (error instanceof ApiException) {
    return error;
  }

  if (!(error instanceof GraphQLException)) {
    return new ApiException({
      type: 'server_error',
      code: 500,
      message: 'No pudimos agregar el caso. Intenta de nuevo.',
      requestId: `case_${Date.now()}`,
    });
  }

  const normalizedMessage = error.message.trim().toLowerCase();

  if (normalizedMessage.includes('valid uscis receipt number')) {
    return new ApiException({
      type: 'validation_error',
      code: 400,
      message: 'Ingresa un numero de recibo USCIS valido, por ejemplo MSC2590039073.',
      details: {
        receiptNumber: ['Ingresa un numero de recibo USCIS valido.'],
      },
      requestId: error.requestId,
    });
  }

  if (normalizedMessage.includes('already tracking')) {
    return new ApiException({
      type: 'validation_error',
      code: 409,
      message: 'Ya estas siguiendo ese caso en tu cuenta.',
      details: {
        receiptNumber: ['Ese caso ya esta agregado.'],
      },
      requestId: error.requestId,
    });
  }

  if (normalizedMessage.includes('not supported for tracking')) {
    return new ApiException({
      type: 'validation_error',
      code: 400,
      message: 'Ese tipo de caso USCIS todavia no esta soportado en Inmigreat.',
      requestId: error.requestId,
    });
  }

  if (normalizedMessage.includes('uscis case not found')) {
    return new ApiException({
      type: 'validation_error',
      code: 404,
      message: 'No encontramos ese numero de recibo en USCIS. Revisa que este bien escrito.',
      details: {
        receiptNumber: ['No encontramos ese numero de recibo en USCIS.'],
      },
      requestId: error.requestId,
    });
  }

  if (normalizedMessage.includes('service timed out')) {
    return new ApiException({
      type: 'timeout_error',
      code: 504,
      message: 'USCIS tardo demasiado en responder. Intenta otra vez en unos minutos.',
      requestId: error.requestId,
    });
  }

  if (normalizedMessage.includes('rate limit reached')) {
    return new ApiException({
      type: 'server_error',
      code: 503,
      message: 'USCIS esta limitando consultas en este momento. Intenta de nuevo en unos minutos.',
      requestId: error.requestId,
    });
  }

  if (
    normalizedMessage.includes('service is not available') ||
    normalizedMessage.includes('authentication failed')
  ) {
    return new ApiException({
      type: 'server_error',
      code: 503,
      message: 'No pudimos consultar USCIS ahora mismo. Intenta de nuevo en unos minutos.',
      requestId: error.requestId,
    });
  }

  if (error.type === 'network_error' || error.type === 'timeout_error' || error.type === 'auth_error') {
    return new ApiException({
      type: error.type,
      code: error.code || 0,
      message: error.message,
      requestId: error.requestId,
    });
  }

  return new ApiException({
    type: 'server_error',
    code: error.code === 200 ? 500 : error.code,
    message: 'No pudimos agregar el caso. Intenta de nuevo.',
    requestId: error.requestId,
  });
}

function isAddEoirCaseHandledPayload(
  error: Pick<GraphQLExceptionPayload, 'message' | 'errors'>,
): boolean {
  const normalizedMessage = error.message.trim().toLowerCase();

  return (
    normalizedMessage.includes('already tracking that eoir case') ||
    normalizedMessage.includes('provide sourcecasekey') ||
    normalizedMessage.includes('identify the eoir case') ||
    normalizedMessage.includes('nexthearingat must be a valid iso date string')
  );
}

function normalizeAddEoirCaseError(error: unknown): Error {
  if (error instanceof ApiException) {
    return error;
  }

  if (!(error instanceof GraphQLException)) {
    return new ApiException({
      type: 'server_error',
      code: 500,
      message: 'No pudimos guardar el caso EOIR. Intenta de nuevo.',
      requestId: `eoir_case_${Date.now()}`,
    });
  }

  const normalizedMessage = error.message.trim().toLowerCase();

  if (normalizedMessage.includes('already tracking that eoir case')) {
    return new ApiException({
      type: 'validation_error',
      code: 409,
      message: 'Ya estas siguiendo ese caso de corte en tu cuenta.',
      details: {
        alienNumber: ['Ese caso ya esta agregado.'],
      },
      requestId: error.requestId,
    });
  }

  if (
    normalizedMessage.includes('provide sourcecasekey') ||
    normalizedMessage.includes('identify the eoir case')
  ) {
    return new ApiException({
      type: 'validation_error',
      code: 400,
      message: 'No pudimos identificar el caso EOIR validado. Intenta de nuevo.',
      requestId: error.requestId,
    });
  }

  if (normalizedMessage.includes('nexthearingat must be a valid iso date string')) {
    return new ApiException({
      type: 'server_error',
      code: 500,
      message: 'No pudimos normalizar la audiencia EOIR para guardarla. Intenta de nuevo.',
      requestId: error.requestId,
    });
  }

  if (error.type === 'network_error' || error.type === 'timeout_error' || error.type === 'auth_error') {
    return new ApiException({
      type: error.type,
      code: error.code || 0,
      message: error.message,
      requestId: error.requestId,
    });
  }

  return new ApiException({
    type: 'server_error',
    code: error.code === 200 ? 500 : error.code,
    message: 'No pudimos guardar el caso EOIR. Intenta de nuevo.',
    requestId: error.requestId,
  });
}

function normalizeTrackedCaseActionError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof ApiException) {
    return error;
  }

  if (error instanceof GraphQLException) {
    if (error.type === 'network_error' || error.type === 'timeout_error' || error.type === 'auth_error') {
      return new ApiException({
        type: error.type,
        code: error.code || 0,
        message: error.message,
        requestId: error.requestId,
      });
    }

    return new ApiException({
      type: 'server_error',
      code: error.code === 200 ? 500 : error.code,
      message: fallbackMessage,
      requestId: error.requestId,
    });
  }

  return new ApiException({
    type: 'server_error',
    code: 500,
    message: fallbackMessage,
    requestId: `tracked_case_${Date.now()}`,
  });
}

function trimToUndefined(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildEoirPersistedPayload(
  context: EoirPayloadContext,
  validation: EoirCaseValidationResult,
) {
  return {
    provider: 'EOIR',
    validationSource: 'mobile_app',
    validatedAt: new Date().toISOString(),
    normalizedResult: {
      personName: validation.personName ?? null,
      caseId: validation.caseId ?? null,
      nextHearingDate: validation.nextHearingDate ?? null,
      nextHearingTime: validation.nextHearingTime ?? null,
      judgeName: validation.judgeName ?? null,
      hearingLocation: validation.hearingLocation ?? null,
      hearingType: validation.hearingType ?? null,
      caseDecision: validation.caseDecision ?? null,
      appealDecision: validation.appealDecision ?? null,
    },
    appInput: {
      alienNumber: context.alienNumber,
      alias: context.alias ?? null,
      nationalityCode: context.nationalityCode ?? null,
      nationalityLabel: context.nationalityLabel ?? null,
      hasLawyer: context.hasLawyer ?? null,
    },
    rawResponse: validation.rawResponse,
  };
}

function parseEoirDateParts(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const slashMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);

    if (year < 100) {
      year += 2000;
    }

    if (!Number.isNaN(month) && !Number.isNaN(day) && !Number.isNaN(year)) {
      return { year, month, day };
    }
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
}

function parseEoirTimeParts(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*([AP]M)?$/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  const meridiem = match[3]?.toUpperCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null;
    }

    if (hours === 12) {
      hours = meridiem === 'AM' ? 0 : 12;
    } else if (meridiem === 'PM') {
      hours += 12;
    }
  } else if (hours > 23) {
    return null;
  }

  return { hours, minutes };
}

function buildEoirNextHearingAt(date?: string, time?: string): string | undefined {
  const dateParts = parseEoirDateParts(date);
  if (!dateParts) {
    return undefined;
  }

  const timeParts = parseEoirTimeParts(time);
  const hours = timeParts?.hours ?? 12;
  const minutes = timeParts?.minutes ?? 0;

  return new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, hours, minutes, 0, 0),
  ).toISOString();
}

function buildEoirStatusLabel(validation: EoirCaseValidationResult): string {
  return (
    trimToUndefined(validation.caseDecision) ??
    trimToUndefined(validation.appealDecision) ??
    'Caso EOIR validado'
  );
}

function buildEoirTrackingMutationInput(request: AddEoirCaseTrackingRequest) {
  const { draft, validation } = request;

  return {
    sourceCaseKey: trimToUndefined(validation.caseId),
    alienNumber: trimToUndefined(validation.alienNumber),
    caseNumber: trimToUndefined(validation.caseId),
    judgeName: trimToUndefined(validation.judgeName),
    hearingLocation: trimToUndefined(validation.hearingLocation),
    hearingType: trimToUndefined(validation.hearingType),
    nextHearingAt: buildEoirNextHearingAt(validation.nextHearingDate, validation.nextHearingTime),
    statusLabel: buildEoirStatusLabel(validation),
    alias: trimToUndefined(draft.alias),
    nationality: trimToUndefined(draft.nationalityLabel) ?? draft.nationalityCode,
    payload: buildEoirPersistedPayload(draft, validation),
  };
}

function buildEoirRefreshMutationInput(request: RefreshEoirCaseTrackingRequest) {
  const { context, validation } = request;

  return {
    alienNumber: trimToUndefined(validation.alienNumber) ?? trimToUndefined(context.alienNumber),
    caseNumber: trimToUndefined(validation.caseId),
    judgeName: trimToUndefined(validation.judgeName),
    hearingLocation: trimToUndefined(validation.hearingLocation),
    hearingType: trimToUndefined(validation.hearingType),
    nextHearingAt: buildEoirNextHearingAt(validation.nextHearingDate, validation.nextHearingTime),
    payload: buildEoirPersistedPayload(context, validation),
    snapshotType: 'EOIR_SYNC',
    statusLabel: buildEoirStatusLabel(validation),
  };
}

// ============================================================================
// GraphQL Documents
// ============================================================================

const CASE_FIELDS = /* GraphQL */ `
  fragment TrackedUscisCaseFields on TrackedUscisCase {
    id
    alias
    category
    uscisCase {
      type
      receiptNumber
      serviceCenter
      completionPercentage
      statusLabel
      statusColor
      daysSinceUpdate
      lastCheckedAt
      urgency
      forecast {
        estimatedDateRange
        confidencePercentage
        velocityMetric
        riskFactors
        weeksRemaining
      }
      intelligence {
        userWaitComparison
        visaBulletin
        serviceCenters {
          name
          speed
          averageWeeks
          isUserCenter
        }
      }
      timeline {
        label
        date
        state
        sortOrder
      }
    }
    createdAt
    updatedAt
  }
`;

const CASE_DETAIL_QUERY = /* GraphQL */ `
  ${CASE_FIELDS}
  query UscisTrackedCase($id: ID!) {
    uscisTrackedCase(id: $id) {
      ...TrackedUscisCaseFields
    }
  }
`;

const ADD_CASE_MUTATION = /* GraphQL */ `
  ${CASE_FIELDS}
  mutation AddUscisCaseTracking($input: AddUscisCaseTrackingInput!) {
    addUscisCaseTracking(input: $input) {
      ...TrackedUscisCaseFields
    }
  }
`;

const DELETE_CASE_MUTATION = /* GraphQL */ `
  mutation DeleteUscisCaseTracking($id: ID!) {
    deleteUscisCaseTracking(id: $id)
  }
`;

const EOIR_TRACKING_FIELDS = /* GraphQL */ `
  fragment TrackedEoirCaseFields on UserEoirCase {
    id
    eoirCaseId
    alias
    category
    nationality
    isPrimary
    notes
    createdAt
    updatedAt
    eoirCase {
      id
      sourceCaseKey
      alienNumber
      caseNumber
      courtCode
      courtName
      judgeName
      hearingLocation
      hearingType
      nextHearingAt
      statusLabel
      lastCheckedAt
      rawData
      syncStatus
      syncError
      snapshots {
        id
        snapshotType
        statusLabel
        nextHearingAt
        capturedAt
      }
    }
  }
`;

const ADD_EOIR_CASE_MUTATION = /* GraphQL */ `
  ${EOIR_TRACKING_FIELDS}
  mutation AddEoirCaseTracking($input: AddEoirCaseTrackingInput!) {
    addEoirCaseTracking(input: $input) {
      ...TrackedEoirCaseFields
    }
  }
`;

const EOIR_CASE_DETAIL_QUERY = /* GraphQL */ `
  ${EOIR_TRACKING_FIELDS}
  query EoirTrackedCase($id: ID!) {
    eoirTrackedCase(id: $id) {
      ...TrackedEoirCaseFields
    }
  }
`;

const UPDATE_EOIR_CASE_MUTATION = /* GraphQL */ `
  ${EOIR_TRACKING_FIELDS}
  mutation UpdateEoirCaseTracking($id: ID!, $input: UpdateEoirCaseTrackingInput!) {
    updateEoirCaseTracking(id: $id, input: $input) {
      ...TrackedEoirCaseFields
    }
  }
`;

const DELETE_EOIR_CASE_MUTATION = /* GraphQL */ `
  mutation DeleteEoirCaseTracking($id: ID!) {
    deleteEoirCaseTracking(id: $id)
  }
`;

const TRACKED_CASES_QUERY = /* GraphQL */ `
  ${CASE_FIELDS}
  ${EOIR_TRACKING_FIELDS}
  query TrackedCases {
    uscisTrackedCases {
      ...TrackedUscisCaseFields
    }
    eoirTrackedCases {
      ...TrackedEoirCaseFields
    }
  }
`;

const TRACKED_USCIS_CASES_COMPAT_QUERY = /* GraphQL */ `
  ${CASE_FIELDS}
  query TrackedUscisCasesCompat {
    uscisTrackedCases {
      ...TrackedUscisCaseFields
    }
  }
`;

function getGraphQLErrorMessages(error: Pick<GraphQLExceptionPayload, 'message' | 'errors'>): string[] {
  const messages = [error.message, ...(error.errors?.map((entry) => entry.message) ?? [])];
  return messages.map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function isMissingEoirTrackedCasesSchemaError(
  error: Pick<GraphQLExceptionPayload, 'message' | 'errors'>,
): boolean {
  const messages = getGraphQLErrorMessages(error);

  return messages.some(
    (message) =>
      message.includes('unknown type "usereoircase"') ||
      message.includes('cannot query field "eoirtrackedcases" on type "query"'),
  );
}

function shouldLogTrackedCasesError(error: GraphQLExceptionPayload): boolean {
  return !isMissingEoirTrackedCasesSchemaError(error);
}

async function fetchTrackedCasesWithCompatFallback(): Promise<CaseDetailResponse[]> {
  try {
    const response = await query<{
      uscisTrackedCases: TrackedUscisCase[];
      eoirTrackedCases: TrackedEoirCase[];
    }>(TRACKED_CASES_QUERY, {
      operationName: 'TrackedCases',
      shouldLogError: shouldLogTrackedCasesError,
    });

    return [
      ...response.data.uscisTrackedCases.map(mapTrackedUscisCase),
      ...response.data.eoirTrackedCases.map(mapTrackedEoirCase),
    ];
  } catch (error) {
    if (!(error instanceof GraphQLException) || !isMissingEoirTrackedCasesSchemaError(error)) {
      throw error;
    }

    const response = await query<{
      uscisTrackedCases: TrackedUscisCase[];
    }>(TRACKED_USCIS_CASES_COMPAT_QUERY, {
      operationName: 'TrackedUscisCasesCompat',
    });

    return response.data.uscisTrackedCases.map(mapTrackedUscisCase);
  }
}

function mapCaseType(type: string): Case['type'] {
  return CASE_TYPE_MAP[type] ?? 'I-485';
}

function mapStatusColor(statusColor?: string | null) {
  return STATUS_COLOR_MAP[statusColor?.toLowerCase() ?? ''] ?? STATUS_COLOR_MAP.blue;
}

function formatTimelineDate(date?: string | null): string {
  if (!date) {
    return 'Sin fecha';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parsed.getUTCDate()} ${monthNames[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

function mapTimelineState(state: TrackedTimelineState): 'done' | 'current' | 'future' {
  switch (state) {
    case 'DONE':
      return 'done';
    case 'CURRENT':
      return 'current';
    case 'FUTURE':
    default:
      return 'future';
  }
}

function mapTimeline(
  timeline?: TrackedUscisCase['uscisCase']['timeline'] | null,
): Case['timeline'] {
  return (
    timeline
      ?.slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((step, index) => ({
        label: step.label,
        date: formatTimelineDate(step.date),
        state: index === 0 ? 'current' : mapTimelineState(step.state) === 'future' ? 'future' : 'done',
      })) ?? []
  );
}

function mapForecast(forecast?: TrackedUscisCase['uscisCase']['forecast'] | null): ForecastData | undefined {
  if (!forecast) {
    return undefined;
  }

  return {
    estimatedDateRange: forecast.estimatedDateRange ?? 'Sin estimación',
    confidencePercentage: forecast.confidencePercentage,
    velocityMetric: forecast.velocityMetric ?? 'Sin dato',
    riskFactors: forecast.riskFactors?.length ?? 0,
    weeksRemaining: forecast.weeksRemaining ?? 0,
    similarCases: 0,
  };
}

function mapIntelligence(intelligence?: TrackedUscisCase['uscisCase']['intelligence'] | null): IntelligenceData | undefined {
  if (!intelligence) {
    return undefined;
  }

  const visaBulletin =
    intelligence.visaBulletin && typeof intelligence.visaBulletin === 'object'
      ? (intelligence.visaBulletin as Partial<IntelligenceData['visaBulletin']>)
      : undefined;

  return {
    userWaitComparison: intelligence.userWaitComparison ?? 'Sin comparación disponible',
    visaBulletin: {
      priorityDate: visaBulletin?.priorityDate ?? 'N/D',
      currentDate: visaBulletin?.currentDate ?? 'N/D',
      movement: visaBulletin?.movement === 'backward' || visaBulletin?.movement === 'stable' ? visaBulletin.movement : 'forward',
      estimatedWait: visaBulletin?.estimatedWait ?? 'N/D',
    },
    serviceCenters:
      intelligence.serviceCenters?.map((center) => ({
        name: center.name,
        speed: center.speed.toLowerCase() as IntelligenceData['serviceCenters'][number]['speed'],
        averageWeeks: center.averageWeeks ?? 0,
        isUserCenter: center.isUserCenter,
      })) ?? [],
  };
}

function mapTrackedUscisCase(record: TrackedUscisCase): CaseDetailResponse {
  const type = mapCaseType(record.uscisCase.type);
  const accentColor = ACCENT_COLOR_MAP[type] ?? colors.accent;
  const statusColor = mapStatusColor(record.uscisCase.statusColor);

  return {
    id: record.id,
    source: 'uscis',
    type,
    formNumber: type,
    serviceCenter: record.uscisCase.serviceCenter ?? 'Pendiente',
    receiptNumber: record.uscisCase.receiptNumber,
    category: record.category ?? record.alias ?? 'General',
    completionPercentage: record.uscisCase.completionPercentage,
    status: {
      label: record.uscisCase.statusLabel ?? 'Estado no disponible',
      color: statusColor.color,
      backgroundColor: statusColor.backgroundColor,
      borderColor: statusColor.borderColor,
    },
    daysSinceUpdate: record.uscisCase.daysSinceUpdate,
    lastCheckedAt: record.uscisCase.lastCheckedAt ?? undefined,
    urgency: record.uscisCase.urgency.toLowerCase() as Case['urgency'],
    timeline: mapTimeline(record.uscisCase.timeline),
    accentColor,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    forecast: mapForecast(record.uscisCase.forecast),
    intelligence: mapIntelligence(record.uscisCase.intelligence),
  };
}

function buildEoirTimeline(
  record: TrackedEoirCase,
  rawPayload: ParsedEoirRawPayload,
): Case['timeline'] {
  const steps: Case['timeline'] = [];

  steps.push({
    label: 'Caso agregado a Inmigreat',
    date: formatTimelineDate(record.createdAt),
    state: 'done',
  });

  if (rawPayload.appeal?.filedAt) {
    steps.push({
      label: 'Apelacion BIA registrada',
      date: formatTimelineDate(rawPayload.appeal.filedAt),
      state: 'done',
    });
  }

  if (rawPayload.motions?.reopenMotionReceivedAt) {
    steps.push({
      label: 'Motion to reopen recibida',
      date: formatTimelineDate(rawPayload.motions.reopenMotionReceivedAt),
      state: 'done',
    });
  }

  if (rawPayload.proceeding?.completedAt) {
    steps.push({
      label: rawPayload.proceeding.decisionLabel ?? 'Decision registrada',
      date: formatTimelineDate(rawPayload.proceeding.completedAt),
      state: 'done',
    });
  }

  if (record.eoirCase.lastCheckedAt) {
    steps.push({
      label: 'Ultima sincronizacion EOIR',
      date: formatTimelineDate(record.eoirCase.lastCheckedAt),
      state: 'current',
    });
  }

  if (rawPayload.hearing?.scheduledAt) {
    const nextHearingAt = rawPayload.hearing.scheduledAt;
    const parsed = nextHearingAt ? new Date(nextHearingAt) : null;
    const isFuture = parsed ? parsed.getTime() > Date.now() : false;

    steps.push({
      label: 'Proxima audiencia',
      date: formatTimelineDate(nextHearingAt),
      state: isFuture ? 'future' : 'done',
    });
  }

  return steps;
}

function mapTrackedEoirCase(record: TrackedEoirCase): CaseDetailResponse {
  const latestSnapshot = record.eoirCase.snapshots?.[0];
  const rawPayload = parseEoirRawPayload(record.eoirCase.rawData);
  const statusColor = getEoirStatusColor(record.eoirCase.syncStatus);
  const nextScheduledHearingAt = rawPayload.hearing?.scheduledAt;
  const personName = rawPayload.personName ?? record.alias ?? 'Caso EOIR';
  const dominantStatusLabel =
    rawPayload.dominantStatusLabel ??
    record.eoirCase.statusLabel ??
    latestSnapshot?.statusLabel ??
    rawPayload.proceeding?.decisionLabel ??
    rawPayload.appeal?.decisionLabel ??
    'Caso EOIR guardado';
  const serviceCenter = record.eoirCase.courtName ?? 'Corte migratoria';
  const receiptNumber =
    record.eoirCase.alienNumber ??
    record.eoirCase.caseNumber ??
    record.eoirCase.sourceCaseKey ??
    record.id;
  const eoirInfo: EoirCaseInfo = {
    trackingId: record.id,
    eoirCaseId: record.eoirCaseId,
    alias: record.alias ?? undefined,
    notes: record.notes ?? undefined,
    sourceCaseKey: record.eoirCase.sourceCaseKey ?? undefined,
    alienNumber: record.eoirCase.alienNumber ?? undefined,
    caseNumber: record.eoirCase.caseNumber ?? undefined,
    courtCode: record.eoirCase.courtCode ?? undefined,
    courtName: record.eoirCase.courtName ?? undefined,
    judgeName:
      record.eoirCase.judgeName ??
      rawPayload.hearing?.judgeName ??
      rawPayload.proceeding?.judgeName ??
      rawPayload.judgeName,
    hearingLocation:
      record.eoirCase.hearingLocation ??
      rawPayload.hearing?.location ??
      rawPayload.proceeding?.hearingLocation ??
      rawPayload.hearingLocation,
    hearingType: record.eoirCase.hearingType ?? rawPayload.hearing?.type ?? rawPayload.hearingType,
    nextHearingAt: nextScheduledHearingAt,
    nextHearingDate: rawPayload.hearing?.date,
    nextHearingTime: rawPayload.hearing?.time,
    statusLabel: dominantStatusLabel,
    lastCheckedAt: record.eoirCase.lastCheckedAt ?? undefined,
    syncStatus: record.eoirCase.syncStatus,
    syncError: record.eoirCase.syncError ?? undefined,
    snapshotCount: record.eoirCase.snapshots?.length ?? 0,
    lastSnapshotAt: latestSnapshot?.capturedAt ?? undefined,
    personName,
    appealDecision:
      rawPayload.appeal?.decisionLabel ??
      rawPayload.appeal?.decisionSummary ??
      rawPayload.appealDecision,
    proceedingDecision:
      rawPayload.proceeding?.decisionLabel ??
      rawPayload.proceeding?.decisionSummary ??
      rawPayload.proceedingDecision,
    nationality: record.nationality ?? undefined,
    nationalityCode: rawPayload.nationalityCode,
    nationalityLabel: rawPayload.nationalityLabel,
    hasLawyer: rawPayload.hasLawyer,
    hearing: rawPayload.hearing,
    proceeding: rawPayload.proceeding,
    appeal: rawPayload.appeal,
    motions: rawPayload.motions,
    operational: rawPayload.operational,
  };

  return {
    id: record.id,
    source: 'eoir',
    type: 'EOIR',
    formNumber: personName,
    serviceCenter,
    receiptNumber,
    category: record.alias ?? serviceCenter,
    completionPercentage: 0,
    status: {
      label: dominantStatusLabel,
      color: statusColor.color,
      backgroundColor: statusColor.backgroundColor,
      borderColor: statusColor.borderColor,
    },
    daysSinceUpdate: calculateDaysSince(record.eoirCase.lastCheckedAt),
    lastCheckedAt: record.eoirCase.lastCheckedAt ?? undefined,
    urgency: getEoirUrgency(nextScheduledHearingAt),
    timeline: buildEoirTimeline(record, rawPayload),
    accentColor: ACCENT_COLOR_MAP.EOIR,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    eoir: eoirInfo,
  };
}

// ============================================================================
// API Methods
// ============================================================================

export async function getCases(): Promise<CaseListResponse> {
  try {
    const cases = (await fetchTrackedCasesWithCompatFallback()).sort((left, right) => {
      const leftValue = new Date(left.updatedAt ?? left.lastCheckedAt ?? 0).getTime();
      const rightValue = new Date(right.updatedAt ?? right.lastCheckedAt ?? 0).getTime();
      return rightValue - leftValue;
    });

    await storage.cacheCases(cases);

    return { cases, total: cases.length };
  } catch (error) {
    const cachedCases = await storage.getCachedCases();

    if (cachedCases && cachedCases.length > 0) {
      console.log('[Cases] Returning cached cases due to fetch error');
      return { cases: cachedCases, total: cachedCases.length };
    }

    throw error;
  }
}

export async function getCaseById(
  caseId: string,
  source: CaseSource = 'uscis',
): Promise<CaseDetailResponse> {
  if (source === 'eoir') {
    const response = await query<{ eoirTrackedCase: TrackedEoirCase }>(EOIR_CASE_DETAIL_QUERY, {
      variables: { id: caseId },
      operationName: 'EoirTrackedCase',
    });

    return mapTrackedEoirCase(response.data.eoirTrackedCase);
  }

  const response = await query<{ uscisTrackedCase: TrackedUscisCase }>(CASE_DETAIL_QUERY, {
    variables: { id: caseId },
    operationName: 'UscisTrackedCase',
  });

  return mapTrackedUscisCase(response.data.uscisTrackedCase);
}

export async function addCase(input: AddUscisCaseInput): Promise<CaseDetailResponse> {
  try {
    const normalizedInput = {
      receiptNumber: input.receiptNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
      ...(input.alias?.trim() ? { alias: input.alias.trim() } : {}),
    };

    const response = await mutation<{ addUscisCaseTracking: TrackedUscisCase }>(ADD_CASE_MUTATION, {
      variables: { input: normalizedInput },
      operationName: 'AddUscisCaseTracking',
      shouldLogError: (error) => !isAddCaseHandledPayload(error),
    });

    return mapTrackedUscisCase(response.data.addUscisCaseTracking);
  } catch (error) {
    throw normalizeAddCaseError(error);
  }
}

export async function addEoirCaseTracking(
  request: AddEoirCaseTrackingRequest,
): Promise<CaseDetailResponse> {
  try {
    const response = await mutation<{ addEoirCaseTracking: TrackedEoirCase }>(ADD_EOIR_CASE_MUTATION, {
      variables: { input: buildEoirTrackingMutationInput(request) },
      operationName: 'AddEoirCaseTracking',
      shouldLogError: (error) => !isAddEoirCaseHandledPayload(error),
    });

    return mapTrackedEoirCase(response.data.addEoirCaseTracking);
  } catch (error) {
    throw normalizeAddEoirCaseError(error);
  }
}

export async function refreshEoirCaseTracking(
  request: RefreshEoirCaseTrackingRequest,
): Promise<CaseDetailResponse> {
  try {
    const response = await mutation<{ updateEoirCaseTracking: TrackedEoirCase }>(
      UPDATE_EOIR_CASE_MUTATION,
      {
        variables: {
          id: request.trackingId,
          input: buildEoirRefreshMutationInput(request),
        },
        operationName: 'UpdateEoirCaseTracking',
      },
    );

    return mapTrackedEoirCase(response.data.updateEoirCaseTracking);
  } catch (error) {
    throw normalizeTrackedCaseActionError(error, 'No pudimos actualizar el caso EOIR. Intenta de nuevo.');
  }
}

export async function deleteCase(caseId: string, source: CaseSource = 'uscis'): Promise<boolean> {
  try {
    if (source === 'eoir') {
      const response = await mutation<{ deleteEoirCaseTracking: boolean }>(DELETE_EOIR_CASE_MUTATION, {
        variables: { id: caseId },
        operationName: 'DeleteEoirCaseTracking',
      });

      return response.data.deleteEoirCaseTracking;
    }

    const response = await mutation<{ deleteUscisCaseTracking: boolean }>(DELETE_CASE_MUTATION, {
      variables: { id: caseId },
      operationName: 'DeleteUscisCaseTracking',
    });

    return response.data.deleteUscisCaseTracking;
  } catch (error) {
    throw normalizeTrackedCaseActionError(error, 'No pudimos eliminar el caso. Intenta de nuevo.');
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const casesService = {
  getCases,
  getCaseById,
  addCase,
  addEoirCaseTracking,
  refreshEoirCaseTracking,
  deleteCase,
};

export default casesService;
