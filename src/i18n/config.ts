import { getLocales } from 'expo-localization';
import i18n, { type TOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Language } from '../types/user';
import { authTranslations } from './resources/auth';
import { chatTranslations } from './resources/chat';
import { caseDetailTranslations } from './resources/case-detail';
import { casesTranslations } from './resources/cases';
import { communityTranslations } from './resources/community';
import { commonTranslations } from './resources/common';
import { loadingPreviewTranslations } from './resources/loading-preview';
import { onboardingTranslations } from './resources/onboarding';
import { premiumTranslations } from './resources/premium';
import { profileTranslations } from './resources/profile';
import { resourcesTranslations } from './resources/resources';
import { rootNavigationTranslations } from './resources/root-navigation';
import {
  APP_LOCALES,
  FALLBACK_LANGUAGE,
  type AppLocale,
  type NamespaceTranslations,
  type TranslationNamespace,
} from './types';

const DEFAULT_NAMESPACE: TranslationNamespace = 'common';

const languageToLocaleMap: Record<Language, AppLocale> = {
  ES: 'es',
  EN: 'en',
  PT: 'pt',
};

const localeToLanguageMap: Record<AppLocale, Language> = {
  es: 'ES',
  en: 'EN',
  pt: 'PT',
};

const namespaceLoaders: Record<TranslationNamespace, () => Promise<NamespaceTranslations>> = {
  common: async () => commonTranslations,
  auth: async () => authTranslations,
  'case-detail': async () => caseDetailTranslations,
  cases: async () => casesTranslations,
  chat: async () => chatTranslations,
  community: async () => communityTranslations,
  'loading-preview': async () => loadingPreviewTranslations,
  onboarding: async () => onboardingTranslations,
  premium: async () => premiumTranslations,
  profile: async () => profileTranslations,
  resources: async () => resourcesTranslations,
  'root-navigation': async () => rootNavigationTranslations,
};

const loadedNamespaces = new Set<TranslationNamespace>(['common', 'auth']);

let initializationPromise: Promise<typeof i18n> | null = null;

function getDeviceLocale(): AppLocale {
  const candidate = getLocales()[0]?.languageCode?.toLowerCase();

  if (candidate && APP_LOCALES.includes(candidate as AppLocale)) {
    return candidate as AppLocale;
  }

  return languageToLocaleMap[FALLBACK_LANGUAGE];
}

function buildInitialResources() {
  return {
    es: {
      common: commonTranslations.es,
      auth: authTranslations.es,
    },
    en: {
      common: commonTranslations.en,
      auth: authTranslations.en,
    },
    pt: {
      common: commonTranslations.pt,
      auth: authTranslations.pt,
    },
  };
}

export function resolveLocale(language?: Language | null): AppLocale {
  if (!language) {
    return getDeviceLocale();
  }

  return languageToLocaleMap[language] ?? getDeviceLocale();
}

export function resolveLanguage(locale?: string | null): Language {
  const normalizedLocale = locale?.toLowerCase();

  if (normalizedLocale && APP_LOCALES.includes(normalizedLocale as AppLocale)) {
    return localeToLanguageMap[normalizedLocale as AppLocale];
  }

  return FALLBACK_LANGUAGE;
}

export function initializeI18n(): Promise<typeof i18n> {
  if (!initializationPromise) {
    initializationPromise = i18n
      .use(initReactI18next)
      .init({
        compatibilityJSON: 'v4',
        lng: getDeviceLocale(),
        fallbackLng: languageToLocaleMap[FALLBACK_LANGUAGE],
        defaultNS: DEFAULT_NAMESPACE,
        ns: ['common', 'auth'],
        interpolation: {
          escapeValue: false,
        },
        resources: buildInitialResources(),
        returnNull: false,
      })
      .then(() => i18n);
  }

  return initializationPromise;
}

export async function ensureNamespacesLoaded(
  namespaces: TranslationNamespace | readonly TranslationNamespace[],
): Promise<void> {
  await initializeI18n();

  const namespaceList: TranslationNamespace[] = Array.from(
    new Set<TranslationNamespace>(Array.isArray(namespaces) ? [...namespaces] : [namespaces]),
  );

  await Promise.all(
    namespaceList.map(async (namespace) => {
      if (loadedNamespaces.has(namespace)) {
        return;
      }

      const translations = await namespaceLoaders[namespace]();

      APP_LOCALES.forEach((locale) => {
        i18n.addResourceBundle(locale, namespace, translations[locale], true, true);
      });

      loadedNamespaces.add(namespace);
    }),
  );
}

export async function setAppLanguage(language?: Language | null): Promise<void> {
  await initializeI18n();

  const nextLocale = resolveLocale(language);

  if (i18n.language !== nextLocale) {
    await i18n.changeLanguage(nextLocale);
  }
}

export function getCurrentLanguage(): Language {
  return resolveLanguage(i18n.resolvedLanguage ?? i18n.language);
}

export function translate(
  key: string,
  options?: TOptions & { ns?: TranslationNamespace },
): string {
  return i18n.t(key, options);
}

void initializeI18n();

export { i18n };
