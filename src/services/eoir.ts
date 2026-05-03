import { ApiException } from './api';
import { getItem, setItem, STORAGE_KEYS } from './storage';
import { EOIR_NATIONALITIES_FALLBACK } from './eoir-nationalities-fallback';

const EOIR_NATIONALITIES_URL = 'https://acis.eoir.justice.gov/page-data/sq/d/1791802679.json';
const EOIR_CASE_INFO_URL = 'https://eoir-ws.eoir.justice.gov/api/Case/GetCaseInfo';
const EOIR_NATIONALITIES_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const EOIR_NATIONALITIES_FETCH_TIMEOUT_MS = 8000;
const EOIR_CASE_INFO_FETCH_TIMEOUT_MS = 15000;
export const EOIR_HCAPTCHA_TOKEN_SETTLE_DELAY_MS = 250;
const DEFAULT_EOIR_HCAPTCHA_LANGUAGE_CODE = 'es';
const DEFAULT_EOIR_LANGUAGE_CODE = 'EN';
const DEFAULT_EOIR_HCAPTCHA_SITE_KEY = '5e28069e-3532-4d77-a479-a3939690e810';
const DEFAULT_EOIR_HCAPTCHA_JS_SRC = 'https://hcaptcha.com/1/api.js';
const DEFAULT_EOIR_HCAPTCHA_LEGACY_JS_SRC = 'https://js.hcaptcha.com/1/api.js';
const DEFAULT_EOIR_HCAPTCHA_BASE_URL = 'https://hcaptcha.com';

function buildDefaultEoirHcaptchaHost(siteKey: string): string {
  return `${siteKey}.react-native.hcaptcha.com`;
}

function normalizeHcaptchaHost(value?: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    return buildDefaultEoirHcaptchaHost(EOIR_HCAPTCHA_SITE_KEY);
  }

  try {
    const parsed = new URL(normalized.includes('://') ? normalized : `https://${normalized}`);
    return parsed.hostname || buildDefaultEoirHcaptchaHost(EOIR_HCAPTCHA_SITE_KEY);
  } catch {
    const withoutScheme = normalized.replace(/^https?:\/\//i, '');
    const hostname = withoutScheme.split('/')[0]?.trim();
    return hostname || buildDefaultEoirHcaptchaHost(EOIR_HCAPTCHA_SITE_KEY);
  }
}

export const EOIR_HCAPTCHA_SITE_KEY =
  process.env.EXPO_PUBLIC_EOIR_HCAPTCHA_SITE_KEY?.trim() || DEFAULT_EOIR_HCAPTCHA_SITE_KEY;
export const EOIR_HCAPTCHA_JS_SRC =
  process.env.EXPO_PUBLIC_EOIR_HCAPTCHA_JS_SRC?.trim() || DEFAULT_EOIR_HCAPTCHA_JS_SRC;
export const EOIR_HCAPTCHA_LEGACY_JS_SRC =
  process.env.EXPO_PUBLIC_EOIR_HCAPTCHA_LEGACY_JS_SRC?.trim() || DEFAULT_EOIR_HCAPTCHA_LEGACY_JS_SRC;
export const EOIR_HCAPTCHA_BASE_URL =
  process.env.EXPO_PUBLIC_EOIR_HCAPTCHA_BASE_URL?.trim() || DEFAULT_EOIR_HCAPTCHA_BASE_URL;
export const EOIR_HCAPTCHA_HOST = normalizeHcaptchaHost(process.env.EXPO_PUBLIC_EOIR_HCAPTCHA_HOST);
export const EOIR_HCAPTCHA_ORIGIN = EOIR_HCAPTCHA_BASE_URL;
export const EOIR_HCAPTCHA_LOAD_TIMEOUT_MS = 15000;

function buildEoirHcaptchaApiUrlForSource(
  scriptSource: string,
  languageCode = DEFAULT_EOIR_HCAPTCHA_LANGUAGE_CODE,
): string {
  try {
    const url = new URL(scriptSource);
    url.searchParams.set('render', 'explicit');
    url.searchParams.set('host', EOIR_HCAPTCHA_HOST);
    url.searchParams.set('hl', languageCode.trim() || DEFAULT_EOIR_HCAPTCHA_LANGUAGE_CODE);
    return url.toString();
  } catch {
    const fallbackLanguageCode = languageCode.trim() || DEFAULT_EOIR_HCAPTCHA_LANGUAGE_CODE;
    return `${scriptSource}?render=explicit&host=${encodeURIComponent(EOIR_HCAPTCHA_HOST)}&hl=${encodeURIComponent(fallbackLanguageCode)}`;
  }
}

export function buildEoirHcaptchaApiUrl(
  languageCode = DEFAULT_EOIR_HCAPTCHA_LANGUAGE_CODE,
): string {
  return buildEoirHcaptchaApiUrlForSource(EOIR_HCAPTCHA_JS_SRC, languageCode);
}

export function buildEoirHcaptchaApiUrls(
  languageCode = DEFAULT_EOIR_HCAPTCHA_LANGUAGE_CODE,
): string[] {
  const urls = [
    buildEoirHcaptchaApiUrlForSource(EOIR_HCAPTCHA_JS_SRC, languageCode),
    buildEoirHcaptchaApiUrlForSource(EOIR_HCAPTCHA_LEGACY_JS_SRC, languageCode),
  ];

  return urls.filter((url, index) => urls.indexOf(url) === index);
}

interface EoirNationalityCache {
  fetchedAt: string;
  items: EoirNationality[];
}

interface EoirCountriesPayload {
  data?: {
    countries?: {
      countries?: Array<{
        Code?: unknown;
        Name?: unknown;
        IsActive?: unknown;
      }>;
    };
  };
}

interface EoirCaseInfoPayload {
  message?: unknown;
  Data?: {
    ValidAlienNumber?: unknown;
    AlienName?: unknown;
    CaseID?: unknown;
    LatestHearingDate?: unknown;
    LatestHearingTime?: unknown;
    LatestCalType?: unknown;
    AppealDecisionString?: unknown;
    CaseDecisionString?: unknown;
    DocketDate?: unknown;
    CaseContactInfo?: unknown;
  };
  Appeal?: {
    BIADecision?: unknown;
    BIADecisionDate?: unknown;
    AppealType?: unknown;
    FiledDate?: unknown;
  };
  Proceeding?: {
    IJName?: unknown;
    HearingLocationAddress?: unknown;
    DecisionCode?: unknown;
    ContactAddress?: unknown;
  };
  Schedule?: {
    AdjDate?: unknown;
    AdjTime?: unknown;
    IJ_Name?: unknown;
    HearingLocationAddress?: unknown;
    ContactAddress?: unknown;
    ScheduleType?: unknown;
  };
}

export interface EoirNationality {
  code: string;
  label: string;
}

export interface EoirCaseValidationInput {
  alienNumber: string;
  nationalityCode: string;
  captchaToken: string;
  languageCode?: string;
}

export type EoirRequestLanguageCode = 'ES' | 'EN';

export interface EoirCaseValidationResult {
  alienNumber: string;
  nationalityCode: string;
  personName?: string;
  caseId?: string;
  nextHearingDate?: string;
  nextHearingTime?: string;
  judgeName?: string;
  hearingLocation?: string;
  hearingType?: string;
  caseDecision?: string;
  appealDecision?: string;
  rawResponse: EoirCaseInfoPayload;
}

interface CachedNationalitiesResult {
  items: EoirNationality[];
  isFresh: boolean;
}

interface EoirErrorResponsePayload {
  message?: unknown;
}

function normalizeNationalities(payload: EoirCountriesPayload): EoirNationality[] {
  const rawCountries = payload.data?.countries?.countries ?? [];

  return rawCountries
    .filter((country) => country?.IsActive)
    .map((country) => ({
      code: String(country?.Code ?? '').trim().toUpperCase(),
      label: String(country?.Name ?? '').trim(),
    }))
    .filter((country) => country.code.length >= 2 && country.label.length > 0)
    .sort((left, right) => left.label.localeCompare(right.label));
}

function asTrimmedString(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function createEoirApiException(
  message: string,
  type: 'validation_error' | 'network_error' | 'timeout_error' | 'server_error' = 'validation_error',
  code = 400,
  details?: Record<string, string[]>,
): ApiException {
  return new ApiException({
    type,
    code,
    message,
    details,
    requestId: `eoir_${Date.now()}`,
  });
}

function getResponseSnippet(value: string, maxLength = 220): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

export function normalizeEoirLanguageCode(value?: string): EoirRequestLanguageCode {
  void value;
  return DEFAULT_EOIR_LANGUAGE_CODE;
}

function extractEoirResponseMessage(responseText: string): string | undefined {
  const trimmedResponse = responseText.trim();

  if (!trimmedResponse.startsWith('{')) {
    return undefined;
  }

  try {
    const payload = JSON.parse(trimmedResponse) as EoirErrorResponsePayload;
    return asTrimmedString(payload.message);
  } catch {
    return undefined;
  }
}

function mapEoirNonOkResponseToApiException(
  responseStatus: number,
  responseMessage: string | undefined,
  input: Pick<EoirCaseValidationInput, 'alienNumber' | 'nationalityCode'>,
): ApiException {
  const normalizedMessage = responseMessage?.toLowerCase() ?? '';

  if (
    responseStatus === 401 ||
    responseStatus === 403 ||
    normalizedMessage.includes('invalid captcha')
  ) {
    return createEoirApiException(
      responseMessage || 'EOIR no aceptó la verificación humana. Intenta de nuevo.',
      'validation_error',
      responseStatus,
    );
  }

  if (normalizedMessage.includes('no case info found')) {
    return createEoirApiException(
      'EOIR no encontró información para ese Alien Number. Verifica el número y la nacionalidad.',
      'validation_error',
      responseStatus,
      {
        alienNumber: ['EOIR no encontró información para ese Alien Number.'],
        nationalityCode: ['Confirma que la nacionalidad seleccionada coincida con el caso.'],
      },
    );
  }

  if (responseMessage && responseStatus >= 400 && responseStatus < 500) {
    return createEoirApiException(responseMessage, 'validation_error', responseStatus);
  }

  return createEoirApiException(
    'No pudimos consultar EOIR en este momento. Intenta de nuevo.',
    responseStatus >= 500 ? 'server_error' : 'network_error',
    responseStatus,
  );
}

function buildEoirCaseInfoUrl(input: EoirCaseValidationInput): string {
  const url = new URL(EOIR_CASE_INFO_URL);
  url.searchParams.set('alienNumber', input.alienNumber);
  url.searchParams.set('languageCode', normalizeEoirLanguageCode(input.languageCode ?? DEFAULT_EOIR_LANGUAGE_CODE));
  url.searchParams.set('natCode', input.nationalityCode);
  return url.toString();
}

function normalizeEoirCaseValidation(
  payload: EoirCaseInfoPayload,
  input: Pick<EoirCaseValidationInput, 'alienNumber' | 'nationalityCode'>,
): EoirCaseValidationResult {
  return {
    alienNumber: input.alienNumber,
    nationalityCode: input.nationalityCode,
    personName: asTrimmedString(payload.Data?.AlienName),
    caseId: asTrimmedString(payload.Data?.CaseID),
    nextHearingDate: asTrimmedString(payload.Schedule?.AdjDate),
    nextHearingTime: asTrimmedString(payload.Schedule?.AdjTime),
    judgeName:
      asTrimmedString(payload.Schedule?.IJ_Name) || asTrimmedString(payload.Proceeding?.IJName),
    hearingLocation:
      asTrimmedString(payload.Schedule?.HearingLocationAddress) ||
      asTrimmedString(payload.Proceeding?.HearingLocationAddress) ||
      asTrimmedString(payload.Schedule?.ContactAddress) ||
      asTrimmedString(payload.Proceeding?.ContactAddress) ||
      asTrimmedString(payload.Data?.CaseContactInfo),
    hearingType:
      asTrimmedString(payload.Schedule?.ScheduleType) ||
      asTrimmedString(payload.Data?.LatestCalType),
    caseDecision:
      asTrimmedString(payload.Data?.CaseDecisionString) ||
      asTrimmedString(payload.Schedule?.ScheduleType) ||
      asTrimmedString(payload.Proceeding?.DecisionCode),
    appealDecision:
      asTrimmedString(payload.Data?.AppealDecisionString) ||
      asTrimmedString(payload.Appeal?.BIADecision) ||
      asTrimmedString(payload.Appeal?.AppealType),
    rawResponse: payload,
  };
}

function summarizeEoirValidationPayload(payload: EoirCaseInfoPayload) {
  const topLevelKeys = payload && typeof payload === 'object' ? Object.keys(payload) : [];

  return {
    message: asTrimmedString(payload.message) ?? null,
    validAlienNumber: payload.Data?.ValidAlienNumber ?? null,
    caseId: asTrimmedString(payload.Data?.CaseID) ?? null,
    nextHearingDate: asTrimmedString(payload.Schedule?.AdjDate) ?? null,
    nationalityContext: null,
    topLevelKeys,
  };
}

function hasRecognizedEoirPayloadShape(payload: EoirCaseInfoPayload): boolean {
  return Boolean(
    payload.message !== undefined ||
      payload.Data !== undefined ||
      payload.Appeal !== undefined ||
      payload.Proceeding !== undefined ||
      payload.Schedule !== undefined,
  );
}

async function getCachedNationalities(): Promise<CachedNationalitiesResult> {
  try {
    const cached = await getItem<EoirNationalityCache>(STORAGE_KEYS.EOIR_NATIONALITIES_CACHE);

    if (!cached?.items?.length) {
      return { items: [], isFresh: false };
    }

    const fetchedAt = new Date(cached.fetchedAt).getTime();
    const isFresh =
      Number.isFinite(fetchedAt) && Date.now() - fetchedAt < EOIR_NATIONALITIES_CACHE_TTL_MS;

    return {
      items: cached.items,
      isFresh,
    };
  } catch {
    return { items: [], isFresh: false };
  }
}

async function cacheNationalities(items: EoirNationality[]): Promise<void> {
  await setItem(STORAGE_KEYS.EOIR_NATIONALITIES_CACHE, {
    fetchedAt: new Date().toISOString(),
    items,
  } satisfies EoirNationalityCache);
}

async function fetchNationalitiesFromNetwork(): Promise<EoirNationality[]> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let didTimeout = false;

  try {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, EOIR_NATIONALITIES_FETCH_TIMEOUT_MS);

    const response = await fetch(EOIR_NATIONALITIES_URL, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (!response.ok) {
      throw new Error('EOIR nationalities request failed');
    }

    const payload = (await response.json()) as EoirCountriesPayload;
    const items = normalizeNationalities(payload);

    if (!items.length) {
      throw new Error('EOIR nationalities payload was empty');
    }

    return items;
  } catch (error) {
    if (didTimeout) {
      throw new Error('EOIR nationalities request timed out');
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function fetchEoirCaseInfoFromNetwork(
  input: EoirCaseValidationInput,
): Promise<EoirCaseInfoPayload> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let didTimeout = false;

  try {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, EOIR_CASE_INFO_FETCH_TIMEOUT_MS);

    const response = await fetch(buildEoirCaseInfoUrl(input), {
      method: 'GET',
      headers: {
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Captcha-Token': input.captchaToken,
        'User-Agent': 'Mozilla/5.0',
      },
      signal: controller.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const responseText = await response.text();
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

    if (!response.ok) {
      const responseSnippet = getResponseSnippet(responseText);
      const responseMessage = extractEoirResponseMessage(responseText);

      console.error('[EOIR] Non-OK response', {
        status: response.status,
        contentType,
        responseSnippet,
        responseMessage,
      });

      throw mapEoirNonOkResponseToApiException(
        response.status,
        responseMessage ?? responseSnippet,
        input,
      );
    }

    if (!responseText.trim()) {
      throw createEoirApiException(
        'EOIR devolvió una respuesta vacía. Intenta de nuevo.',
        'server_error',
        502,
      );
    }

    if (!contentType.includes('application/json') && !responseText.trim().startsWith('{')) {
      console.error('[EOIR] Unexpected response content', {
        contentType,
        responseSnippet: getResponseSnippet(responseText),
      });

      throw createEoirApiException(
        'EOIR devolvió una respuesta no válida. Intenta de nuevo.',
        'server_error',
        502,
      );
    }

    try {
      console.log('[EOIR] Raw 200 response snippet', {
        contentType,
        responseSnippet: getResponseSnippet(responseText),
        responseLength: responseText.length,
      });

      return JSON.parse(responseText) as EoirCaseInfoPayload;
    } catch (parseError) {
      console.error('[EOIR] Failed to parse JSON response', {
        contentType,
        responseSnippet: getResponseSnippet(responseText),
        parseError,
      });

      throw createEoirApiException(
        'EOIR devolvió una respuesta no válida. Intenta de nuevo.',
        'server_error',
        502,
      );
    }
  } catch (error) {
    if (didTimeout) {
      throw createEoirApiException('EOIR tardó demasiado en responder. Intenta de nuevo.', 'timeout_error', 504);
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function getEoirNationalities(forceRefresh = false): Promise<EoirNationality[]> {
  const cached = await getCachedNationalities();

  if (!forceRefresh && cached.isFresh) {
    return cached.items;
  }

  try {
    const items = await fetchNationalitiesFromNetwork();

    void cacheNationalities(items).catch(() => {
      // Ignore cache write failures.
    });

    return items;
  } catch (error) {
    if (cached.items.length) {
      console.warn('[EOIR] Using cached nationalities after network failure.', error);
      return cached.items;
    }

    console.warn('[EOIR] Using bundled nationalities fallback.', error);

    void cacheNationalities(EOIR_NATIONALITIES_FALLBACK).catch(() => {
      // Ignore cache write failures.
    });

    return EOIR_NATIONALITIES_FALLBACK;
  }
}

export async function validateEoirCase(
  input: EoirCaseValidationInput,
): Promise<EoirCaseValidationResult> {
  const alienNumber = input.alienNumber.replace(/[^0-9]/g, '').slice(0, 9);
  const nationalityCode = input.nationalityCode.trim();
  const captchaToken = input.captchaToken.trim();
  const languageCode = normalizeEoirLanguageCode(input.languageCode ?? DEFAULT_EOIR_LANGUAGE_CODE);

  if (alienNumber.length < 8) {
    throw createEoirApiException(
      'Ingresa un Alien Number válido de 8 o 9 dígitos.',
      'validation_error',
      400,
      { alienNumber: ['Ingresa un Alien Number válido.'] },
    );
  }

  if (nationalityCode.length < 2) {
    throw createEoirApiException(
      'Selecciona una nacionalidad EOIR válida.',
      'validation_error',
      400,
      { nationalityCode: ['Selecciona una nacionalidad válida.'] },
    );
  }

  if (!captchaToken) {
    throw createEoirApiException('Completa la verificación humana para continuar.');
  }

  try {
    console.log('[EOIR] Validation request payload', {
      alienNumber,
      nationalityCode,
      languageCode,
      requestUrl: buildEoirCaseInfoUrl({
        alienNumber,
        nationalityCode,
        captchaToken: '[redacted]',
        languageCode,
      }),
    });

    const payload = await fetchEoirCaseInfoFromNetwork({
      ...input,
      alienNumber,
      nationalityCode,
      captchaToken,
    });

    const payloadSummary = summarizeEoirValidationPayload(payload);

    console.log('[EOIR] Validation response summary', payloadSummary);

    if (!hasRecognizedEoirPayloadShape(payload)) {
      console.warn('[EOIR] EOIR returned an unrecognized payload shape', payloadSummary);
      throw createEoirApiException(
        'EOIR respondió sin datos reconocibles para este caso. Verifica el Alien Number, la nacionalidad y que el caso esté disponible en EOIR.',
        'validation_error',
        404,
        {
          alienNumber: ['EOIR no devolvió datos reconocibles para ese Alien Number.'],
          nationalityCode: ['Confirma que la nacionalidad seleccionada coincida con el caso.'],
        },
      );
    }

    const responseMessage = asTrimmedString(payload.message);

    if (responseMessage) {
      throw createEoirApiException(responseMessage);
    }

    const isValidAlienNumber =
      payload.Data?.ValidAlienNumber === true ||
      String(payload.Data?.ValidAlienNumber ?? '').trim().toLowerCase() === 'true';

    if (!isValidAlienNumber) {
      console.warn('[EOIR] EOIR marked the payload as invalid', {
        request: {
          alienNumber,
          nationalityCode,
          languageCode,
        },
        response: payloadSummary,
      });

      throw createEoirApiException(
        'No pudimos validar este caso EOIR. Verifica el Alien Number y la nacionalidad.',
        'validation_error',
        404,
        {
          alienNumber: ['No pudimos validar ese Alien Number en EOIR.'],
          nationalityCode: ['Revisa la nacionalidad seleccionada.'],
        },
      );
    }

    return normalizeEoirCaseValidation(payload, { alienNumber, nationalityCode });
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }

    console.error('[EOIR] Validation request crashed before normalization', error);

    if (error instanceof Error && error.message.toLowerCase().includes('timed out')) {
      throw createEoirApiException(
        'EOIR tardó demasiado en responder. Intenta de nuevo.',
        'timeout_error',
        504,
      );
    }

    throw createEoirApiException(
      'No pudimos consultar EOIR en este momento. Intenta de nuevo.',
      'network_error',
      0,
    );
  }
}

export default {
  getEoirNationalities,
  validateEoirCase,
};