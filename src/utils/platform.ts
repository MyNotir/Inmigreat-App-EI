/**
 * Platform-Specific Utilities
 * 
 * Provides platform-specific utilities for iOS and Android adaptations.
 * Handles safe areas, keyboard behavior, font scaling, and haptic feedback.
 * 
 * Validates: Requirements 18.1, 18.2, 18.3, 18.4
 */

import { Platform, Dimensions, PixelRatio, StatusBar } from 'react-native';
import * as Haptics from 'expo-haptics';

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/**
 * Platform detection utilities
 */
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

/**
 * Get the current platform
 */
export const getPlatform = (): 'ios' | 'android' => Platform.OS as 'ios' | 'android';

// ============================================================================
// SAFE AREA UTILITIES
// Requirement 18.1: Platform-specific safe area insets for notch and home indicator
// ============================================================================

/**
 * Default safe area insets for platforms
 * These are fallback values when SafeAreaContext is not available
 */
export const defaultSafeAreaInsets = {
  ios: {
    top: 44, // Status bar + notch
    bottom: 34, // Home indicator
    left: 0,
    right: 0,
  },
  android: {
    top: StatusBar.currentHeight || 24,
    bottom: 0,
    left: 0,
    right: 0,
  },
};

/**
 * Get default safe area insets for the current platform
 */
export const getDefaultSafeAreaInsets = () => {
  return isIOS ? defaultSafeAreaInsets.ios : defaultSafeAreaInsets.android;
};

/**
 * Check if device has a notch (iPhone X and later)
 */
export const hasNotch = (): boolean => {
  if (!isIOS) return false;
  
  const { height, width } = Dimensions.get('window');
  const aspectRatio = height / width;
  
  // iPhone X and later have aspect ratio > 2
  return aspectRatio > 2;
};

/**
 * Check if device has a home indicator (iPhone X and later)
 */
export const hasHomeIndicator = (): boolean => {
  return hasNotch();
};

// ============================================================================
// KEYBOARD UTILITIES
// Requirement 18.2: Platform-specific keyboard avoiding behavior
// ============================================================================

/**
 * Keyboard avoiding behavior configuration
 */
export interface KeyboardConfig {
  /** Behavior for KeyboardAvoidingView */
  behavior: 'padding' | 'height' | 'position';
  /** Vertical offset for keyboard */
  keyboardVerticalOffset: number;
  /** Whether to enable keyboard avoiding */
  enabled: boolean;
}

/**
 * Get platform-specific keyboard configuration
 * 
 * @param headerHeight - Optional header height to account for
 * @returns KeyboardConfig for the current platform
 */
export const getKeyboardConfig = (headerHeight: number = 0): KeyboardConfig => {
  if (isIOS) {
    return {
      behavior: 'padding',
      keyboardVerticalOffset: headerHeight,
      enabled: true,
    };
  }
  
  return {
    behavior: 'height',
    keyboardVerticalOffset: headerHeight + 20,
    enabled: true,
  };
};

/**
 * Get keyboard avoiding behavior for the current platform
 */
export const getKeyboardBehavior = (): 'padding' | 'height' | 'position' => {
  return isIOS ? 'padding' : 'height';
};

/**
 * Get keyboard vertical offset for the current platform
 * 
 * @param additionalOffset - Additional offset to add
 */
export const getKeyboardVerticalOffset = (additionalOffset: number = 0): number => {
  return isIOS ? additionalOffset : additionalOffset + 20;
};

// ============================================================================
// FONT SCALING UTILITIES
// Requirement 18.3: Support iOS Dynamic Type and Android font scaling
// ============================================================================

/**
 * Get the current font scale factor
 * This reflects the user's accessibility settings for text size
 */
export const getFontScale = (): number => {
  return PixelRatio.getFontScale();
};

/**
 * Check if font scaling is enabled (scale != 1)
 */
export const isFontScalingEnabled = (): boolean => {
  return getFontScale() !== 1;
};

/**
 * Scale a font size according to user's accessibility settings
 * 
 * @param fontSize - Base font size
 * @param maxScale - Maximum scale factor (default: 1.5)
 * @returns Scaled font size
 */
export const scaleFontSize = (fontSize: number, maxScale: number = 1.5): number => {
  const scale = Math.min(getFontScale(), maxScale);
  return Math.round(fontSize * scale);
};

/**
 * Get a font size that respects accessibility settings with bounds
 * 
 * @param fontSize - Base font size
 * @param minSize - Minimum font size
 * @param maxSize - Maximum font size
 * @returns Bounded scaled font size
 */
export const getBoundedFontSize = (
  fontSize: number,
  minSize: number,
  maxSize: number
): number => {
  const scaled = scaleFontSize(fontSize);
  return Math.max(minSize, Math.min(maxSize, scaled));
};

/**
 * Font scaling configuration
 */
export interface FontScaleConfig {
  /** Current font scale factor */
  scale: number;
  /** Whether scaling is enabled */
  isEnabled: boolean;
  /** Whether large text is enabled (scale > 1.2) */
  isLargeText: boolean;
  /** Whether extra large text is enabled (scale > 1.5) */
  isExtraLargeText: boolean;
}

/**
 * Get font scaling configuration
 */
export const getFontScaleConfig = (): FontScaleConfig => {
  const scale = getFontScale();
  return {
    scale,
    isEnabled: scale !== 1,
    isLargeText: scale > 1.2,
    isExtraLargeText: scale > 1.5,
  };
};

/**
 * Create a scaled typography object
 * 
 * @param baseSizes - Object with base font sizes
 * @param maxScale - Maximum scale factor
 * @returns Object with scaled font sizes
 */
export const createScaledTypography = <T extends Record<string, number>>(
  baseSizes: T,
  maxScale: number = 1.5
): T => {
  const scaled = {} as T;
  for (const key in baseSizes) {
    (scaled as Record<string, number>)[key] = scaleFontSize(baseSizes[key], maxScale);
  }
  return scaled;
};

// ============================================================================
// HAPTIC FEEDBACK UTILITIES
// Requirement 18.4: Platform-appropriate haptic feedback on interactions
// ============================================================================

/**
 * Haptic feedback types
 */
export type HapticFeedbackType = 
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'success'
  | 'warning'
  | 'error';

/**
 * Trigger haptic feedback
 * 
 * @param type - Type of haptic feedback
 */
export const triggerHaptic = async (type: HapticFeedbackType = 'light'): Promise<void> => {
  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (error) {
    // Haptics may not be available on all devices/simulators
    console.debug('[Haptics] Feedback not available:', error);
  }
};

/**
 * Trigger light impact haptic feedback
 * Use for subtle interactions like button taps
 */
export const hapticLight = (): Promise<void> => triggerHaptic('light');

/**
 * Trigger medium impact haptic feedback
 * Use for standard interactions
 */
export const hapticMedium = (): Promise<void> => triggerHaptic('medium');

/**
 * Trigger heavy impact haptic feedback
 * Use for significant interactions
 */
export const hapticHeavy = (): Promise<void> => triggerHaptic('heavy');

/**
 * Trigger selection haptic feedback
 * Use for selection changes (e.g., picker, toggle)
 */
export const hapticSelection = (): Promise<void> => triggerHaptic('selection');

/**
 * Trigger success notification haptic feedback
 * Use for successful operations
 */
export const hapticSuccess = (): Promise<void> => triggerHaptic('success');

/**
 * Trigger warning notification haptic feedback
 * Use for warning states
 */
export const hapticWarning = (): Promise<void> => triggerHaptic('warning');

/**
 * Trigger error notification haptic feedback
 * Use for error states
 */
export const hapticError = (): Promise<void> => triggerHaptic('error');

// ============================================================================
// PLATFORM-SPECIFIC STYLES
// ============================================================================

/**
 * Get platform-specific shadow styles
 * iOS uses shadow properties, Android uses elevation
 */
export const getPlatformShadow = (elevation: number) => {
  if (isIOS) {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: 0.1 + (elevation * 0.02),
      shadowRadius: elevation,
    };
  }
  
  return {
    elevation,
  };
};

/**
 * Platform-specific select function
 * Similar to Platform.select but with better typing
 */
export const platformSelect = <T>(options: { ios: T; android: T; default?: T }): T => {
  if (isIOS && options.ios !== undefined) return options.ios;
  if (isAndroid && options.android !== undefined) return options.android;
  return options.default ?? options.ios;
};

// ============================================================================
// DEVICE INFO
// ============================================================================

/**
 * Get device screen dimensions
 */
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('screen');
  return { width, height };
};

/**
 * Get window dimensions (excludes status bar on Android)
 */
export const getWindowDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

/**
 * Check if device is a tablet
 */
export const isTablet = (): boolean => {
  const { width, height } = getScreenDimensions();
  const aspectRatio = height / width;
  const diagonal = Math.sqrt(width * width + height * height) / PixelRatio.get();
  
  // Tablets typically have diagonal > 7 inches and aspect ratio < 1.6
  return diagonal > 7 && aspectRatio < 1.6;
};

/**
 * Get pixel ratio for the device
 */
export const getPixelRatio = (): number => {
  return PixelRatio.get();
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Platform detection
  isIOS,
  isAndroid,
  getPlatform,
  
  // Safe area
  defaultSafeAreaInsets,
  getDefaultSafeAreaInsets,
  hasNotch,
  hasHomeIndicator,
  
  // Keyboard
  getKeyboardConfig,
  getKeyboardBehavior,
  getKeyboardVerticalOffset,
  
  // Font scaling
  getFontScale,
  isFontScalingEnabled,
  scaleFontSize,
  getBoundedFontSize,
  getFontScaleConfig,
  createScaledTypography,
  
  // Haptics
  triggerHaptic,
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
  hapticError,
  
  // Platform styles
  getPlatformShadow,
  platformSelect,
  
  // Device info
  getScreenDimensions,
  getWindowDimensions,
  isTablet,
  getPixelRatio,
};
