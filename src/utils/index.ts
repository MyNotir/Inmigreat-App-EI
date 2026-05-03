/**
 * Utils Exports
 * 
 * Central export point for all utility functions.
 */

// Platform utilities
export {
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
  type KeyboardConfig,
  
  // Font scaling
  getFontScale,
  isFontScalingEnabled,
  scaleFontSize,
  getBoundedFontSize,
  getFontScaleConfig,
  createScaledTypography,
  type FontScaleConfig,
  
  // Haptics
  triggerHaptic,
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
  hapticError,
  type HapticFeedbackType,
  
  // Platform styles
  getPlatformShadow,
  platformSelect,
  
  // Device info
  getScreenDimensions,
  getWindowDimensions,
  isTablet,
  getPixelRatio,
} from './platform';
