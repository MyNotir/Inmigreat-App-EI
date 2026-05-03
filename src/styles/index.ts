// Style exports
export {
  theme,
  colors,
  spacing,
  spacingScale,
  borderRadius,
  typography,
  shadows,
  glassmorphism,
  animation,
} from './theme';

export type {
  Colors,
  Spacing,
  SpacingScale,
  BorderRadius,
  Typography,
  Shadows,
  Glassmorphism,
  Animation,
  Theme,
} from './theme';

// Glassmorphism style exports
export {
  GLASS_CONSTANTS,
  createRgba,
  createGlassBackground,
  createDarkGlassBackground,
  createColoredGlassBackground,
  createGlassBorder,
  createGlassStyle,
  glassPresets,
  glassBorders,
} from './glassmorphism';

export type {
  GlassPreset,
  GlassBorder,
  GlassConstants,
} from './glassmorphism';

// Animation exports
export {
  ANIMATION_CONSTANTS,
  springConfigs,
  timingConfigs,
  shimmerColors,
  getStaggerDelay,
  // Animation hooks
  useFadeUp,
  useSlideUp,
  usePopIn,
  useShimmer,
  usePressAnimation,
  usePing,
  useFade,
  useScale,
  useRotate,
  useStaggeredFadeUp,
} from './animations';

export type {
  SpringConfig,
  TimingConfig,
  AnimationConstants,
} from './animations';
