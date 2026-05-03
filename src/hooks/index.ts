/**
 * Hooks Exports
 * 
 * Central export point for all custom hooks.
 */

// Platform hooks
export {
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
  type SafeAreaInfo,
  type KeyboardState,
  type HapticFeedback,
  type PlatformInfo,
} from './usePlatform';

export { useEoirCaptchaChallenge } from './useEoirCaptchaChallenge';
export type { EoirCaptchaModalControllerProps } from './useEoirCaptchaChallenge';
