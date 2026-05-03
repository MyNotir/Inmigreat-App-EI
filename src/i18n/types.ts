import type { Language } from '../types/user';

export const APP_LOCALES = ['es', 'en', 'pt'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export type TranslationNamespace = 'common' | 'root-navigation' | 'auth' | 'onboarding' | 'profile' | 'resources' | 'cases' | 'case-detail' | 'community' | 'chat' | 'premium' | 'loading-preview';

export type TranslationTree = {
  [key: string]: string | TranslationTree;
};

export type NamespaceTranslations = Record<AppLocale, TranslationTree>;

export const FALLBACK_LANGUAGE: Language = 'ES';
