/**
 * Attorney domain types — directory + profile + consent flow.
 *
 * EI rule: never expose more PII than the attorney chose to publish, never
 * share more user data than the user explicitly opted into.
 */

export type AttorneySpecialty =
  | 'family'         // I-130, K-1, marriage-based
  | 'employment'     // H-1B, EB-2, EB-3, NIW, PERM
  | 'asylum'         // I-589, withholding, CAT
  | 'removal'        // EOIR defense, NTA response, BIA appeals
  | 'naturalization' // N-400, N-600
  | 'humanitarian'   // U-visa, T-visa, VAWA, SIJ
  | 'daca'           // DACA renewals + initial
  | 'citizenship';   // Derivative citizenship

export type CaseTypeMatch =
  | 'I-485'
  | 'I-765'
  | 'EOIR'
  | 'I-130'
  | 'I-140'
  | 'I-589'
  | 'N-400'
  | 'DACA'
  | 'U-visa'
  | 'T-visa';

export type Language = 'es' | 'en' | 'pt' | 'ht' | 'fr' | 'ar' | 'zh';

export type ContactPreference = 'phone' | 'email' | 'video';
export type TimeWindow = 'morning' | 'afternoon' | 'evening' | 'any';

export type RateModel = {
  /** Lower bound of consultation rate in USD per hour. 0 means free. */
  consultLow: number;
  /** Upper bound of consultation rate in USD per hour. */
  consultHigh: number;
  /** True if the first 15-30 min consult is free. EI: surface this first. */
  firstConsultFree: boolean;
  /** True if firm offers sliding scale for low-income immigrants. */
  slidingScale: boolean;
  /** Optional flat-fee menu, e.g. { "I-485": 3500, "N-400": 1200 } */
  flatFees?: Record<string, number>;
  /** True if accepts payment plans. */
  paymentPlan: boolean;
};

export type AttorneyReview = {
  id: string;
  /** Anonymized — case type only, never name. */
  reviewerCaseType: CaseTypeMatch;
  /** 1-5 stars. */
  rating: number;
  /** Short body, written by migrant. */
  body: string;
  /** ISO date when posted. */
  postedAt: string;
  /** Optional language used during the case. */
  languageUsed?: Language;
};

export type AttorneyAvailability = {
  /** True if attorney is currently accepting new clients. */
  acceptingClients: boolean;
  /** Average response time in hours (self-reported). */
  averageResponseHours?: number;
  /** True if can take crisis cases (ICE detention, NTA filed, hearing in days). */
  emergencyAvailable: boolean;
};

export type Attorney = {
  id: string;
  name: string;
  /** Optional preferred pronouns or honorific. */
  pronouns?: string;
  firm: string;
  /** Optional photo URL. EI: if null, render warm clay initial badge. */
  photoUrl?: string;
  /** Bar verification — never show 'unverified' attorneys to users in crisis. */
  barVerified: boolean;
  /** Bar number(s) if displayed. */
  barNumbers?: Array<{ state: string; number: string }>;
  /** Years practicing immigration law. */
  yearsExperience: number;
  /** Languages the attorney speaks fluently for client work. */
  languages: Language[];
  /** Areas of practice. Order matters — first is primary. */
  specialties: AttorneySpecialty[];
  /** Optional case-type tags driving search/match. */
  caseTypeTags: CaseTypeMatch[];
  /** City + state, e.g. 'Miami, FL'. Optional. */
  location: string;
  /** True if accepts remote consultations (most do, surface for clarity). */
  remoteOK: boolean;
  /** Self-written bio in attorney's voice. Limit ~500 chars in card preview. */
  bio: string;
  /** Personal mission statement, surfaced first in profile. */
  mission?: string;
  /** Rate model (see RateModel doc above). */
  rates: RateModel;
  /** Aggregated rating from reviews (0-5). */
  rating: number;
  /** Number of completed cases visible to public (helps trust). */
  casesCompleted: number;
  reviews: AttorneyReview[];
  availability: AttorneyAvailability;
  /** Public contact for verified attorneys. EI: never default-render this — only after consent. */
  publicContact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
};

/** What the user opts in to share when they request contact. */
export type ContactConsent = {
  shareName: boolean;
  shareEmail: boolean;
  sharePhone: boolean;
  shareCaseType: boolean;
  shareCaseSummary: boolean;
  preferredContact: ContactPreference;
  timeWindow: TimeWindow;
  /** Optional 1-2 sentence message the user wants to include. */
  note?: string;
};

export type ContactRequest = {
  attorneyId: string;
  consent: ContactConsent;
  caseId?: string;
  caseType?: CaseTypeMatch;
  /** ISO timestamp when request was sent. */
  requestedAt: string;
  /** EI: if user marked the case as urgent in flow, true. */
  urgent: boolean;
};
