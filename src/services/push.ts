/**
 * Push Service - Push notification token registration with backend
 * Validates: Requirements 10.1-10.5
 */

import { Platform } from 'react-native';
import { apiClient, ApiException } from './api';
import { getExpoPushToken } from './notifications';

// ============================================================================
// Types
// ============================================================================

/**
 * Push token registration payload
 */
export interface PushTokenRegistration {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// ============================================================================
// State
// ============================================================================

/** Currently registered token */
let registeredToken: string | null = null;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current platform
 */
function getPlatform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

// ============================================================================
// Registration Methods
// ============================================================================

/**
 * Register push token with the backend
 * Implements retry with exponential backoff
 * @param registration - Token registration data
 */
export async function registerToken(registration: PushTokenRegistration): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      await apiClient.post('/push/register', registration);
      registeredToken = registration.token;
      console.log('[Push] Token registered successfully');
      return;
    } catch (error) {
      lastError = error as Error;
      console.error(`[Push] Registration attempt ${attempt + 1} failed:`, error);
      
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`[Push] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  console.error('[Push] All registration attempts failed');
  throw lastError;
}

/**
 * Unregister push token from the backend
 * @param token - Token to unregister
 */
export async function unregisterToken(token: string): Promise<void> {
  try {
    await apiClient.delete('/push/register', {
      params: { token },
    });
    
    if (registeredToken === token) {
      registeredToken = null;
    }
    
    console.log('[Push] Token unregistered successfully');
  } catch (error) {
    console.error('[Push] Error unregistering token:', error);
    throw error;
  }
}

/**
 * Update push token (when token changes)
 * @param oldToken - Previous token
 * @param newToken - New token
 */
export async function updateToken(oldToken: string, newToken: string): Promise<void> {
  try {
    // Unregister old token
    await unregisterToken(oldToken);
  } catch (error) {
    // Continue even if unregister fails
    console.log('[Push] Old token unregister failed, continuing with new registration');
  }
  
  // Register new token
  await registerToken({
    token: newToken,
    platform: getPlatform(),
  });
}

// ============================================================================
// High-Level Methods
// ============================================================================

/**
 * Initialize push notifications and register token
 * Call this after user grants notification permissions
 */
export async function initializePush(): Promise<void> {
  try {
    const tokenResult = await getExpoPushToken();
    
    if (!tokenResult.success || !tokenResult.token) {
      console.log('[Push] Could not get push token:', tokenResult.error);
      return;
    }
    
    // Check if token changed
    if (registeredToken && registeredToken !== tokenResult.token) {
      await updateToken(registeredToken, tokenResult.token);
    } else if (!registeredToken) {
      await registerToken({
        token: tokenResult.token,
        platform: getPlatform(),
      });
    }
  } catch (error) {
    console.error('[Push] Error initializing push:', error);
    // Don't throw - push is not critical for app functionality
  }
}

/**
 * Cleanup push registration (call on logout)
 */
export async function cleanupPush(): Promise<void> {
  if (registeredToken) {
    try {
      await unregisterToken(registeredToken);
    } catch (error) {
      console.error('[Push] Error cleaning up push:', error);
      // Don't throw - we're logging out anyway
    }
  }
}

/**
 * Get the currently registered token
 */
export function getRegisteredToken(): string | null {
  return registeredToken;
}

// ============================================================================
// Default Export
// ============================================================================

export const pushService = {
  registerToken,
  unregisterToken,
  updateToken,
  initializePush,
  cleanupPush,
  getRegisteredToken,
};

export default pushService;
