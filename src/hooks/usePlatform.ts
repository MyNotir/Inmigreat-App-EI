/**
 * Platform Hooks
 * 
 * React hooks for platform-specific features including safe areas,
 * keyboard handling, font scaling, and haptic feedback.
 * 
 * Validates: Requirements 18.1, 18.2, 18.3, 18.4
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Dimensions, Keyboard, KeyboardEvent, Platform, PixelRatio } from 'react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import {
  isIOS,
  isAndroid,
  getKeyboardConfig,
  getKeyboardBehavior,
  getKeyboardVerticalOffset,
  getFontScale,
  getFontScaleConfig,
  scaleFontSize,
  triggerHaptic,
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSelection,
  hapticSuccess,
  hapticWarning,
  hapticError,
  hasNotch,
  hasHomeIndicator,
  isTablet,
  type HapticFeedbackType,
  type KeyboardConfig,
  type FontScaleConfig,
} from '../utils/platform';

// ============================================================================
// SAFE AREA HOOK
// Requirement 18.1: Platform-specific safe area insets for notch and home indicator
// ============================================================================

/**
 * Extended safe area insets with additional platform info
 */
export interface SafeAreaInfo extends EdgeInsets {
  /** Whether device has a notch */
  hasNotch: boolean;
  /** Whether device has a home indicator */
  hasHomeIndicator: boolean;
  /** Whether device is a tablet */
  isTablet: boolean;
}

/**
 * Hook for safe area handling with platform-specific adaptations
 * 
 * @returns Safe area insets and platform info
 * 
 * @example
 * ```tsx
 * const { top, bottom, hasNotch } = useSafeArea();
 * 
 * return (
 *   <View style={{ paddingTop: top, paddingBottom: bottom }}>
 *     {hasNotch && <NotchSpacer />}
 *     <Content />
 *   </View>
 * );
 * ```
 */
export const useSafeArea = (): SafeAreaInfo => {
  const insets = useSafeAreaInsets();
  
  return useMemo(() => ({
    ...insets,
    hasNotch: hasNotch(),
    hasHomeIndicator: hasHomeIndicator(),
    isTablet: isTablet(),
  }), [insets]);
};

// ============================================================================
// KEYBOARD HOOK
// Requirement 18.2: Platform-specific keyboard avoiding behavior
// ============================================================================

/**
 * Keyboard state information
 */
export interface KeyboardState {
  /** Whether keyboard is visible */
  isVisible: boolean;
  /** Keyboard height in pixels */
  height: number;
  /** Animation duration in ms */
  animationDuration: number;
  /** Platform-specific keyboard config */
  config: KeyboardConfig;
}

/**
 * Hook for keyboard handling with platform-specific behavior
 * 
 * @param headerHeight - Optional header height to account for
 * @returns Keyboard state and configuration
 * 
 * @example
 * ```tsx
 * const { isVisible, height, config } = useKeyboard();
 * 
 * return (
 *   <KeyboardAvoidingView
 *     behavior={config.behavior}
 *     keyboardVerticalOffset={config.keyboardVerticalOffset}
 *   >
 *     <Content />
 *   </KeyboardAvoidingView>
 * );
 * ```
 */
export const useKeyboard = (headerHeight: number = 0): KeyboardState => {
  const [isVisible, setIsVisible] = useState(false);
  const [height, setHeight] = useState(0);
  const [animationDuration, setAnimationDuration] = useState(250);
  
  const config = useMemo(() => getKeyboardConfig(headerHeight), [headerHeight]);
  
  useEffect(() => {
    const showEvent = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const handleShow = (event: KeyboardEvent) => {
      setIsVisible(true);
      setHeight(event.endCoordinates.height);
      setAnimationDuration(event.duration || 250);
    };
    
    const handleHide = (event: KeyboardEvent) => {
      setIsVisible(false);
      setHeight(0);
      setAnimationDuration(event.duration || 250);
    };
    
    const showSubscription = Keyboard.addListener(showEvent, handleShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleHide);
    
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  
  return {
    isVisible,
    height,
    animationDuration,
    config,
  };
};

/**
 * Hook for keyboard avoiding view props
 * Returns props that can be spread directly onto KeyboardAvoidingView
 * 
 * @param headerHeight - Optional header height
 * @returns Props for KeyboardAvoidingView
 * 
 * @example
 * ```tsx
 * const keyboardProps = useKeyboardAvoidingProps();
 * 
 * return (
 *   <KeyboardAvoidingView {...keyboardProps}>
 *     <Content />
 *   </KeyboardAvoidingView>
 * );
 * ```
 */
export const useKeyboardAvoidingProps = (headerHeight: number = 0) => {
  return useMemo(() => ({
    behavior: getKeyboardBehavior(),
    keyboardVerticalOffset: getKeyboardVerticalOffset(headerHeight),
    enabled: true,
  }), [headerHeight]);
};

// ============================================================================
// FONT SCALING HOOK
// Requirement 18.3: Support iOS Dynamic Type and Android font scaling
// ============================================================================

/**
 * Hook for font scaling with accessibility support
 * 
 * @returns Font scale configuration and scaling utilities
 * 
 * @example
 * ```tsx
 * const { scale, scaledSize, isLargeText } = useFontScaling();
 * 
 * return (
 *   <Text style={{ fontSize: scaledSize(16) }}>
 *     {isLargeText ? 'Large text mode' : 'Normal text'}
 *   </Text>
 * );
 * ```
 */
export const useFontScaling = () => {
  const [config, setConfig] = useState<FontScaleConfig>(getFontScaleConfig());
  
  useEffect(() => {
    // Listen for dimension changes which may indicate font scale changes
    const subscription = Dimensions.addEventListener('change', () => {
      setConfig(getFontScaleConfig());
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  const scaledSize = useCallback((fontSize: number, maxScale: number = 1.5) => {
    return scaleFontSize(fontSize, maxScale);
  }, []);
  
  const boundedSize = useCallback((
    fontSize: number,
    minSize: number,
    maxSize: number
  ) => {
    const scaled = scaleFontSize(fontSize);
    return Math.max(minSize, Math.min(maxSize, scaled));
  }, []);
  
  return {
    ...config,
    scaledSize,
    boundedSize,
  };
};

/**
 * Hook that returns scaled typography values
 * 
 * @param baseSizes - Object with base font sizes
 * @param maxScale - Maximum scale factor
 * @returns Object with scaled font sizes
 * 
 * @example
 * ```tsx
 * const typography = useScaledTypography({
 *   small: 12,
 *   medium: 16,
 *   large: 24,
 * });
 * 
 * return <Text style={{ fontSize: typography.medium }}>Hello</Text>;
 * ```
 */
export const useScaledTypography = <T extends Record<string, number>>(
  baseSizes: T,
  maxScale: number = 1.5
): T => {
  const { scale } = useFontScaling();
  
  return useMemo(() => {
    const scaled = {} as T;
    const clampedScale = Math.min(scale, maxScale);
    
    for (const key in baseSizes) {
      (scaled as Record<string, number>)[key] = Math.round(baseSizes[key] * clampedScale);
    }
    
    return scaled;
  }, [baseSizes, scale, maxScale]);
};

// ============================================================================
// HAPTIC FEEDBACK HOOK
// Requirement 18.4: Platform-appropriate haptic feedback on interactions
// ============================================================================

/**
 * Haptic feedback functions
 */
export interface HapticFeedback {
  /** Trigger haptic feedback by type */
  trigger: (type: HapticFeedbackType) => Promise<void>;
  /** Light impact feedback */
  light: () => Promise<void>;
  /** Medium impact feedback */
  medium: () => Promise<void>;
  /** Heavy impact feedback */
  heavy: () => Promise<void>;
  /** Selection feedback */
  selection: () => Promise<void>;
  /** Success notification feedback */
  success: () => Promise<void>;
  /** Warning notification feedback */
  warning: () => Promise<void>;
  /** Error notification feedback */
  error: () => Promise<void>;
}

/**
 * Hook for haptic feedback
 * 
 * @returns Haptic feedback functions
 * 
 * @example
 * ```tsx
 * const haptic = useHaptic();
 * 
 * const handlePress = () => {
 *   haptic.light();
 *   // ... handle press
 * };
 * 
 * const handleSuccess = () => {
 *   haptic.success();
 *   // ... handle success
 * };
 * ```
 */
export const useHaptic = (): HapticFeedback => {
  return useMemo(() => ({
    trigger: triggerHaptic,
    light: hapticLight,
    medium: hapticMedium,
    heavy: hapticHeavy,
    selection: hapticSelection,
    success: hapticSuccess,
    warning: hapticWarning,
    error: hapticError,
  }), []);
};

/**
 * Hook that returns a press handler with haptic feedback
 * 
 * @param onPress - Press handler function
 * @param hapticType - Type of haptic feedback (default: 'light')
 * @returns Press handler with haptic feedback
 * 
 * @example
 * ```tsx
 * const handlePress = useHapticPress(() => {
 *   navigation.navigate('Details');
 * }, 'medium');
 * 
 * return <TouchableOpacity onPress={handlePress}>...</TouchableOpacity>;
 * ```
 */
export const useHapticPress = (
  onPress: () => void,
  hapticType: HapticFeedbackType = 'light'
) => {
  return useCallback(() => {
    triggerHaptic(hapticType);
    onPress();
  }, [onPress, hapticType]);
};

// ============================================================================
// COMBINED PLATFORM HOOK
// ============================================================================

/**
 * Combined platform information and utilities
 */
export interface PlatformInfo {
  /** Platform name */
  platform: 'ios' | 'android';
  /** Whether running on iOS */
  isIOS: boolean;
  /** Whether running on Android */
  isAndroid: boolean;
  /** Whether device is a tablet */
  isTablet: boolean;
  /** Whether device has a notch */
  hasNotch: boolean;
  /** Safe area insets */
  safeArea: SafeAreaInfo;
  /** Keyboard state and config */
  keyboard: KeyboardState;
  /** Font scaling info */
  fontScaling: FontScaleConfig & {
    scaledSize: (fontSize: number, maxScale?: number) => number;
    boundedSize: (fontSize: number, minSize: number, maxSize: number) => number;
  };
  /** Haptic feedback functions */
  haptic: HapticFeedback;
}

/**
 * Comprehensive hook for all platform-specific features
 * 
 * @param headerHeight - Optional header height for keyboard offset
 * @returns Combined platform information and utilities
 * 
 * @example
 * ```tsx
 * const platform = usePlatform();
 * 
 * return (
 *   <SafeAreaView style={{ paddingTop: platform.safeArea.top }}>
 *     <KeyboardAvoidingView {...platform.keyboard.config}>
 *       <TouchableOpacity onPress={() => {
 *         platform.haptic.light();
 *         handlePress();
 *       }}>
 *         <Text style={{ fontSize: platform.fontScaling.scaledSize(16) }}>
 *           Press me
 *         </Text>
 *       </TouchableOpacity>
 *     </KeyboardAvoidingView>
 *   </SafeAreaView>
 * );
 * ```
 */
export const usePlatform = (headerHeight: number = 0): PlatformInfo => {
  const safeArea = useSafeArea();
  const keyboard = useKeyboard(headerHeight);
  const fontScaling = useFontScaling();
  const haptic = useHaptic();
  
  return useMemo(() => ({
    platform: Platform.OS as 'ios' | 'android',
    isIOS,
    isAndroid,
    isTablet: safeArea.isTablet,
    hasNotch: safeArea.hasNotch,
    safeArea,
    keyboard,
    fontScaling,
    haptic,
  }), [safeArea, keyboard, fontScaling, haptic]);
};

// ============================================================================
// DIMENSION HOOKS
// ============================================================================

/**
 * Hook for responsive dimensions that updates on orientation change
 * 
 * @returns Current window dimensions
 */
export const useDimensions = () => {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  return dimensions;
};

/**
 * Hook for detecting orientation
 * 
 * @returns Current orientation ('portrait' | 'landscape')
 */
export const useOrientation = () => {
  const { width, height } = useDimensions();
  return width < height ? 'portrait' : 'landscape';
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  useSafeArea,
  useKeyboard,
  useKeyboardAvoidingProps,
  useFontScaling,
  useScaledTypography,
  useHaptic,
  useHapticPress,
  usePlatform,
  useDimensions,
  useOrientation,
};
