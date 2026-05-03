/**
 * Case Types - Immigration case tracking type definitions
 * Validates: Requirements 6.2, 6.3
 */

export type CaseType = 'I-485' | 'I-765' | 'EOIR' | 'I-130' | 'I-140';
export type CaseSource = 'uscis' | 'eoir';

export interface CaseStatus {
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
}

export interface TimelineStep {
  label: string;
  date: string;
  state: 'done' | 'current' | 'future';
}

export interface EoirHearingInfo {
  scheduledAt?: string;
  date?: string;
  time?: string;
  type?: string;
  medium?: string;
  calendarType?: string;
  scheduleType?: string;
  judgeName?: string;
  location?: string;
  locationCode?: string;
  contactAddress?: string;
  contactPhone?: string;
}

export interface EoirProceedingInfo {
  caseType?: string;
  decisionCode?: string;
  decisionLabel?: string;
  decisionSummary?: string;
  completedAt?: string;
  appealDueAt?: string;
  judgeName?: string;
  hearingLocation?: string;
  hearingLocationCode?: string;
  contactAddress?: string;
  contactPhone?: string;
  releaseInfo?: string;
}

export interface EoirAppealInfo {
  exists?: boolean;
  pendingAtBia?: boolean;
  filedAt?: string;
  appealType?: string;
  decisionCode?: string;
  decisionLabel?: string;
  decisionSummary?: string;
  decisionAt?: string;
  alienBriefDueAt?: string;
  alienBriefFiledAt?: string;
  dhsBriefDueAt?: string;
  dhsBriefFiledAt?: string;
  alienBriefStatus?: string;
  dhsBriefStatus?: string;
}

export interface EoirMotionInfo {
  mtrDecisionLabel?: string;
  mtrDecisionAt?: string;
  mtrAppealFiledAt?: string;
  mtrBiaAppeal?: string;
  mtrBiaType?: string;
  reopenExists?: boolean;
  reopenDecisionLabel?: string;
  reopenDecisionSummary?: string;
  reopenDecisionAt?: string;
  reopenMotionReceivedAt?: string;
}

export interface EoirOperationalInfo {
  validAlienNumber?: boolean;
  clockStatus?: string;
  docketDate?: string;
  elapsedDays?: number;
  latestCalendarType?: string;
  oscDate?: string;
  caseContactInfo?: string;
  caseContactAddress?: string;
  caseContactPhone?: string;
}

export interface EoirCaseInfo {
  trackingId: string;
  eoirCaseId: string;
  alias?: string;
  notes?: string;
  sourceCaseKey?: string;
  alienNumber?: string;
  caseNumber?: string;
  courtCode?: string;
  courtName?: string;
  judgeName?: string;
  hearingLocation?: string;
  hearingType?: string;
  nextHearingAt?: string;
  nextHearingDate?: string;
  nextHearingTime?: string;
  statusLabel?: string;
  lastCheckedAt?: string;
  syncStatus: string;
  syncError?: string;
  snapshotCount: number;
  lastSnapshotAt?: string;
  personName?: string;
  appealDecision?: string;
  proceedingDecision?: string;
  nationality?: string;
  nationalityCode?: string;
  nationalityLabel?: string;
  hasLawyer?: boolean;
  hearing?: EoirHearingInfo;
  proceeding?: EoirProceedingInfo;
  appeal?: EoirAppealInfo;
  motions?: EoirMotionInfo;
  operational?: EoirOperationalInfo;
}

export interface Case {
  id: string;
  source: CaseSource;
  type: CaseType;
  formNumber: string;
  serviceCenter: string;
  receiptNumber: string;
  category: string;
  completionPercentage: number;
  status: CaseStatus;
  daysSinceUpdate: number;
  lastCheckedAt?: string;
  urgency: 'normal' | 'high';
  timeline: TimelineStep[];
  accentColor: string;
  createdAt?: string;
  updatedAt?: string;
  eoir?: EoirCaseInfo;
}

// Pro Features - Forecast
export interface ForecastData {
  estimatedDateRange: string;
  confidencePercentage: number;
  velocityMetric: string;
  riskFactors: number;
  weeksRemaining: number;
  similarCases: number;
}

// Pro Features - Intelligence
export interface ServiceCenterSpeed {
  name: string;
  speed: 'accelerating' | 'stable' | 'slow';
  averageWeeks: number;
  isUserCenter: boolean;
}

export interface VisaBulletinStatus {
  priorityDate: string;
  currentDate: string;
  movement: 'forward' | 'backward' | 'stable';
  estimatedWait: string;
}

export interface IntelligenceData {
  serviceCenters: ServiceCenterSpeed[];
  visaBulletin: VisaBulletinStatus;
  userWaitComparison: string;
}

export interface CaseDetail extends Case {
  forecast?: ForecastData;
  intelligence?: IntelligenceData;
}
