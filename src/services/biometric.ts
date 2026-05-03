/**
 * Biometric Service - Face ID / Touch ID authentication
 * Validates: Requirements 3.11, 3.12
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { storage } from './storage';
import { getSession } from './session';

/**
 * Biometric authentication types
 */
export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

/**
 * Result of biometric availability check
 */
export interface BiometricAvailability {
  /** Whether the device has biometric hardware */
  hasHardware: boolean;
  /** Whether the user has enrolled biometrics */
  isEnrolled: boolean;
  /** The type of biometric available */
  biometricType: BiometricType;
  /** Human-readable name for the biometric type */
  biometricName: string;
}

/**
 * Result of biometric authentication attempt
 */
export interface BiometricAuthResult {
  /** Whether authentication was successful */
  success: boolean;
  /** Error message if authentication failed */
  error?: string;
  /** Whether the user cancelled the authentication */
  cancelled?: boolean;
}

/**
 * Secure storage keys for biometric credentials
 */
const SECURE_KEYS = {
  LEGACY_BIOMETRIC_CREDENTIALS: 'inmigreat_biometric_credentials',
} as const;

/**
 * Stored biometric credentials structure
 */
interface BiometricCredentials {
  email: string;
  token: string;
}

// ============================================================================
// Biometric Availability
// ============================================================================

/**
 * Map LocalAuthentication types to our BiometricType
 */
function mapAuthenticationType(types: LocalAuthentication.AuthenticationType[]): BiometricType {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'facial';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }
  return 'none';
}

/**
 * Get human-readable name for biometric type
 */
function getBiometricName(type: BiometricType): string {
  switch (type) {
    case 'facial':
      return 'Face ID';
    case 'fingerprint':
      return 'Touch ID';
    case 'iris':
      return 'Iris';
    default:
      return 'Biometric';
  }
}

/**
 * Check if biometric authentication is available on the device
 * @returns Biometric availability information
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    // Check if device has biometric hardware
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    
    if (!hasHardware) {
      return {
        hasHardware: false,
        isEnrolled: false,
        biometricType: 'none',
        biometricName: 'Biometric',
      };
    }

    // Check if user has enrolled biometrics
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    // Get supported authentication types
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const biometricType = mapAuthenticationType(supportedTypes);
    const biometricName = getBiometricName(biometricType);

    return {
      hasHardware,
      isEnrolled,
      biometricType,
      biometricName,
    };
  } catch (error) {
    console.error('[Biometric] Error checking availability:', error);
    return {
      hasHardware: false,
      isEnrolled: false,
      biometricType: 'none',
      biometricName: 'Biometric',
    };
  }
}

// ============================================================================
// Biometric Authentication
// ============================================================================

/**
 * Default authentication prompt messages
 */
const DEFAULT_PROMPTS = {
  promptMessage: 'Autenticación biométrica',
  cancelLabel: 'Cancelar',
  fallbackLabel: 'Usar contraseña',
};

/**
 * Authenticate user with biometrics (Face ID / Touch ID)
 * @param promptMessage - Custom prompt message to display
 * @param cancelLabel - Custom cancel button label
 * @param fallbackLabel - Custom fallback button label
 * @returns Authentication result
 */
export async function authenticateWithBiometric(options?: {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
}): Promise<BiometricAuthResult> {
  try {
    // First check if biometrics are available
    const availability = await checkBiometricAvailability();
    
    if (!availability.hasHardware) {
      return {
        success: false,
        error: 'Este dispositivo no tiene hardware biométrico',
      };
    }

    if (!availability.isEnrolled) {
      return {
        success: false,
        error: `No hay ${availability.biometricName} configurado en este dispositivo`,
      };
    }

    // Perform authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options?.promptMessage ?? DEFAULT_PROMPTS.promptMessage,
      cancelLabel: options?.cancelLabel ?? DEFAULT_PROMPTS.cancelLabel,
      fallbackLabel: options?.fallbackLabel ?? DEFAULT_PROMPTS.fallbackLabel,
      disableDeviceFallback: options?.disableDeviceFallback ?? false,
    });

    if (result.success) {
      return { success: true };
    }

    const errorCode = 'error' in result ? result.error : undefined;

    // Handle different error types
    if (errorCode === 'user_cancel') {
      return {
        success: false,
        cancelled: true,
        error: 'Autenticación cancelada',
      };
    }

    if (errorCode === 'user_fallback') {
      return {
        success: false,
        error: 'Usuario eligió usar contraseña',
      };
    }

    if (errorCode === 'lockout') {
      return {
        success: false,
        error: 'Demasiados intentos fallidos. Intente más tarde.',
      };
    }

    return {
      success: false,
      error: errorCode || 'Autenticación fallida',
    };
  } catch (error) {
    console.error('[Biometric] Authentication error:', error);
    return {
      success: false,
      error: 'Error durante la autenticación biométrica',
    };
  }
}

// ============================================================================
// Credential Storage (Keychain)
// ============================================================================

/**
 * Retrieve stored biometric credentials from keychain
 * @returns Stored credentials or null if not found
 */
export async function getBiometricCredentials(): Promise<BiometricCredentials | null> {
  try {
    const biometricEnabled = await storage.getBiometricEnabled();
    const session = await getSession();

    if (!biometricEnabled || !session) {
      return null;
    }

    return {
      email: session.user.email,
      token: session.accessToken,
    };
  } catch (error) {
    console.error('[Biometric] Error retrieving credentials:', error);
    return null;
  }
}

/**
 * Remove stored biometric credentials from keychain
 * @returns Whether removal was successful
 */
export async function removeBiometricCredentials(): Promise<boolean> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_KEYS.LEGACY_BIOMETRIC_CREDENTIALS).catch(() => {}),
      storage.setBiometricEnabled(false),
    ]);
    return true;
  } catch (error) {
    console.error('[Biometric] Error removing credentials:', error);
    return false;
  }
}

/**
 * Check if biometric credentials are stored
 * @returns Whether credentials exist
 */
export async function hasBiometricCredentials(): Promise<boolean> {
  try {
    const biometricEnabled = await storage.getBiometricEnabled();
    const session = await getSession();
    return biometricEnabled === true && session !== null;
  } catch {
    return false;
  }
}

// ============================================================================
// Combined Authentication Flow
// ============================================================================

/**
 * Perform biometric login - authenticate and retrieve stored credentials
 * @param promptMessage - Custom prompt message
 * @returns Credentials if authentication successful, null otherwise
 */
export async function biometricLogin(
  promptMessage?: string
): Promise<BiometricCredentials | null> {
  // First check if we have stored credentials
  const hasCredentials = await hasBiometricCredentials();
  
  if (!hasCredentials) {
    console.log('[Biometric] No stored credentials found');
    return null;
  }

  // Authenticate with biometrics
  const authResult = await authenticateWithBiometric({
    promptMessage: promptMessage ?? 'Inicia sesión con biometría',
  });

  if (!authResult.success) {
    console.log('[Biometric] Authentication failed:', authResult.error);
    return null;
  }

  // Return stored credentials
  return getBiometricCredentials();
}

// ============================================================================
// Default Export
// ============================================================================

export const biometric = {
  // Availability
  checkBiometricAvailability,
  // Authentication
  authenticateWithBiometric,
  // Credential storage
  getBiometricCredentials,
  removeBiometricCredentials,
  hasBiometricCredentials,
  // Combined flow
  biometricLogin,
};

export default biometric;
