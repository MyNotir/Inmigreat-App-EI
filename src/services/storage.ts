/**
 * Storage Service - AsyncStorage wrapper with typed methods
 * Validates: Requirements 17.1, 17.2, 17.3, 17.4
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Language } from '../types/user';
import type { Case } from '../types/case';

// SecureStore keys (sensitive credentials only)
const SECURE_KEYS = {
  SESSION: 'inmigreat_session',
  AUTH_TOKEN: 'inmigreat_auth_token',
  USER_DATA: 'inmigreat_user_data',
  PENDING_PROVISIONING_SESSION: 'inmigreat_pending_provisioning_session',
  LEGACY_BIOMETRIC_CREDENTIALS: 'inmigreat_biometric_credentials',
} as const;

/**
 * Storage keys for AsyncStorage
 */
export const STORAGE_KEYS = {
  USER_NAME: '@inmigreat/user_name',
  LANGUAGE: '@inmigreat/language',
  REFRESH_TOKEN: '@inmigreat/refresh_token',
  TOKEN_EXPIRY: '@inmigreat/token_expiry',
  PUSH_TOKEN: '@inmigreat/push_token',
  CASES_CACHE: '@inmigreat/cases_cache',
  EOIR_NATIONALITIES_CACHE: '@inmigreat/eoir_nationalities_cache',
  NAVIGATION_STATE: '@inmigreat/navigation_state',
  // Legacy key kept only so logout and state resets can remove old persisted values.
  NOTIFICATION_SETTINGS: '@inmigreat/notification_settings',
  BIOMETRIC_ENABLED: '@inmigreat/biometric_enabled',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Navigation state type for persistence
 */
export interface NavigationState {
  routes: Array<{
    name: string;
    key?: string;
    params?: Record<string, unknown>;
    state?: NavigationState;
  }>;
  index: number;
  key?: string;
  routeNames?: string[];
  type?: string;
  stale?: boolean;
}

// ============================================================================
// Generic Storage Methods
// ============================================================================

/**
 * Set an item in AsyncStorage with JSON serialization
 * @param key - Storage key
 * @param value - Value to store (will be JSON serialized)
 */
export async function setItem<T>(key: StorageKey, value: T): Promise<void> {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`[Storage] Error setting item ${key}:`, error);
    throw error;
  }
}

/**
 * Get an item from AsyncStorage with JSON deserialization
 * @param key - Storage key
 * @returns Parsed value or null if not found
 */
export async function getItem<T>(key: StorageKey): Promise<T | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue === null) {
      return null;
    }
    return JSON.parse(jsonValue) as T;
  } catch (error) {
    console.error(`[Storage] Error getting item ${key}:`, error);
    throw error;
  }
}

/**
 * Remove an item from AsyncStorage
 * @param key - Storage key
 */
export async function removeItem(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[Storage] Error removing item ${key}:`, error);
    throw error;
  }
}

/**
 * Clear all app storage
 */
export async function clearAll(): Promise<void> {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
    // Also clear secure storage
    await SecureStore.deleteItemAsync(SECURE_KEYS.SESSION).catch(() => {});
    await SecureStore.deleteItemAsync(SECURE_KEYS.AUTH_TOKEN).catch(() => {});
    await SecureStore.deleteItemAsync(SECURE_KEYS.USER_DATA).catch(() => {});
    await SecureStore.deleteItemAsync(SECURE_KEYS.PENDING_PROVISIONING_SESSION).catch(() => {});
    await SecureStore.deleteItemAsync(SECURE_KEYS.LEGACY_BIOMETRIC_CREDENTIALS).catch(() => {});
  } catch (error) {
    console.error('[Storage] Error clearing all items:', error);
    throw error;
  }
}

// ============================================================================
// Language Methods (Requirement 17.3)
// ============================================================================

/**
 * Save user's language preference
 * @param language - Language code (ES, EN, PT)
 */
export async function setLanguage(language: Language): Promise<void> {
  await setItem(STORAGE_KEYS.LANGUAGE, language);
}

/**
 * Get user's language preference
 * @returns Language code or null if not set
 */
export async function getLanguage(): Promise<Language | null> {
  return getItem<Language>(STORAGE_KEYS.LANGUAGE);
}

// ============================================================================
// Case Cache Methods (Requirement 17.2)
// ============================================================================

/**
 * Cache cases for offline viewing
 * @param cases - Array of cases to cache
 */
export async function cacheCases(cases: Case[]): Promise<void> {
  await setItem(STORAGE_KEYS.CASES_CACHE, cases);
}

/**
 * Get cached cases
 * @returns Array of cached cases or null if not cached
 */
export async function getCachedCases(): Promise<Case[] | null> {
  return getItem<Case[]>(STORAGE_KEYS.CASES_CACHE);
}

/**
 * Clear cached cases
 */
export async function clearCachedCases(): Promise<void> {
  await removeItem(STORAGE_KEYS.CASES_CACHE);
}

// ============================================================================
// Navigation State Methods (Requirement 17.4)
// ============================================================================

/**
 * Save navigation state for app resume
 * @param state - Navigation state object
 */
export async function saveNavigationState(state: NavigationState): Promise<void> {
  await setItem(STORAGE_KEYS.NAVIGATION_STATE, state);
}

/**
 * Get saved navigation state
 * @returns Navigation state or null if not saved
 */
export async function getNavigationState(): Promise<NavigationState | null> {
  return getItem<NavigationState>(STORAGE_KEYS.NAVIGATION_STATE);
}

/**
 * Clear navigation state
 */
export async function clearNavigationState(): Promise<void> {
  await removeItem(STORAGE_KEYS.NAVIGATION_STATE);
}

// ============================================================================
// Biometric Settings Methods
// ============================================================================

/**
 * Save biometric enabled state
 * @param enabled - Whether biometric auth is enabled
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled);
}

/**
 * Get biometric enabled state
 * @returns Whether biometric auth is enabled or null if not set
 */
export async function getBiometricEnabled(): Promise<boolean | null> {
  return getItem<boolean>(STORAGE_KEYS.BIOMETRIC_ENABLED);
}

// ============================================================================
// User Name Methods (Requirement 3.5)
// ============================================================================

/**
 * Save user's name for personalization
 * @param name - User's first name
 */
export async function setUserName(name: string): Promise<void> {
  await setItem(STORAGE_KEYS.USER_NAME, name);
}

/**
 * Get user's name
 * @returns User's name or null if not set
 */
export async function getUserName(): Promise<string | null> {
  return getItem<string>(STORAGE_KEYS.USER_NAME);
}

// ============================================================================
// Default Export
// ============================================================================

export const storage = {
  // Generic methods
  setItem,
  getItem,
  removeItem,
  clearAll,
  // Language
  setLanguage,
  getLanguage,
  // Cases
  cacheCases,
  getCachedCases,
  clearCachedCases,
  // Navigation
  saveNavigationState,
  getNavigationState,
  clearNavigationState,
  // Biometric
  setBiometricEnabled,
  getBiometricEnabled,
  // User Name
  setUserName,
  getUserName,
};

export default storage;
