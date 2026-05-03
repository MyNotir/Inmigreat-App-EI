/**
 * Theme Configuration
 * 
 * Comprehensive theme object for the InMiGreat React Native app.
 * Includes color palette, spacing scale, border radii, typography, and shadows.
 * 
 * Validates: Requirements 4.5
 */

const brandFontFamily = {
  light: 'NunitoLight',
  normal: 'NunitoRegular',
  regular: 'NunitoRegular',
  medium: 'NunitoMedium',
  semibold: 'NunitoSemiBold',
  bold: 'NunitoBold',
  extrabold: 'NunitoExtraBold',
  display: 'UnifrakturCook',
  script: 'SquarePegRegular',
} as const;

/**
 * Color Palette
 *
 * Inmigreat App — Emotional Intelligence design system.
 *
 * Pulls the Pro brand spine (navy #153480 / purple #634ECC / gold #C97A00)
 * and overlays a warm-minimalism EI palette (cream / clay / sand / sage)
 * for surfaces that carry emotional weight: case stress, denial, RFE,
 * hearing day, support escalation. Cool blues stay for routine state;
 * warm tones take over when the user is in crisis or under load.
 *
 * Reference: warm minimalism + 2026 emotionally-intelligent UX trend
 * (Tubik 2026, UX Collective 2026, Free the Birds aesthetics-of-feeling).
 */
export const colors = {
  // Brand spine
  accent: '#153480',
  accentDeep: '#054179',
  pro: '#634ECC',
  proSoft: '#9581FF',
  gold: '#C97A00',
  goldSoft: '#FFD27A',

  // Semantic
  success: '#34C759',
  successDeep: '#1F8A4D',
  warning: '#FF9500',
  error: '#B00020',

  // EI warm palette — the soul of the redesign
  warm: {
    cream: '#FBF6EE',  // empathetic surface bg
    sand: '#EDE4D3',   // secondary warm surface
    peach: '#F4D8C8',  // gentle accent
    clay: '#C99B7E',   // earth-tone border / icon color
    sage: '#B8C9B9',   // calm success / on-track
    ink: '#3B2E2A',    // warm-tone text
    inkSoft: 'rgba(59, 46, 42, 0.72)',
    inkFaint: 'rgba(59, 46, 42, 0.55)',
    border: 'rgba(201, 155, 126, 0.25)', // clay 25%
  },

  // Background colors (cool, default)
  background: {
    primary: '#FFFFFF',
    secondary: '#F3F8FC',
    tertiary: '#F4F5F9',
    gradient: ['#FFFFFF', '#F3F8FC', '#F4F5F9', '#F8F7FF'],
    // EI warm gradient — used for screens in stress contexts
    warmGradient: ['#FBF6EE', '#EDE4D3', '#FBF6EE'],
  },

  // Text colors
  text: {
    primary: '#0A1530',
    secondary: '#2C3E66',
    tertiary: '#5A6B8C',
    quaternary: '#8A99B8',
    inverse: '#FFFFFF',
    link: '#445D99',
    warm: '#3B2E2A',          // for content on warm cards
    warmSoft: 'rgba(59, 46, 42, 0.72)',
  },

  // Border colors
  border: {
    light: '#15348024',
    medium: '#15348038',
    dark: '#15348066',
    focus: '#7B61FF',
    warm: 'rgba(201, 155, 126, 0.25)',
    warmStrong: 'rgba(201, 155, 126, 0.45)',
  },

  // Glassmorphism colors
  glass: {
    background: 'rgba(255, 255, 255, 0.88)',
    backgroundDark: 'rgba(21, 52, 128, 0.54)',
    border: 'rgba(21, 52, 128, 0.18)',
  },

  // Status colors — EI-aware variants for case state
  // The warm variants are used inside WarmCard contexts; the cool ones
  // are for the cool-toned default UI.
  status: {
    pending: '#FF9500',
    inProgress: '#445D99',
    completed: '#34C759',
    urgent: '#B00020',
    // EI-aware — softer, less alarmist, used when the user is already stressed
    pendingWarm: '#C99B7E',     // clay
    onTrackWarm: '#B8C9B9',     // sage
    actionRequiredWarm: '#C97A00', // gold (kept warm not red)
    urgentWarm: '#A75A3F',      // burnt orange — less alarming than red, still serious
  },

  // Case type accent colors
  caseAccent: {
    greenCard: '#445D99',
    workPermit: '#054179',
    asylum: '#7B61FF',
    citizenship: '#634ECC',
    visa: '#9581FF',
    daca: '#153480',
  },
} as const;

/**
 * Stress level — drives EI surface selection.
 * Rule of thumb:
 *   - calm: routine state (case received, biometrics scheduled). Cool palette.
 *   - elevated: action required soon (RFE arrived, document due, hearing in 14d).
 *               Warm cream surface + clay accents.
 *   - acute: imminent or post-bad-news (denial, hearing tomorrow, NTA filed).
 *            Warm cream surface + larger spacing + visible support escalation.
 */
export type StressLevel = 'calm' | 'elevated' | 'acute';

/**
 * Spacing Scale
 * 
 * Consistent spacing values for margins, paddings, and gaps.
 * Based on a 4px base unit.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// Numeric spacing array for direct access
export const spacingScale = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;

/**
 * Border Radii
 * 
 * Consistent border radius values for rounded corners.
 */
export const borderRadius = {
  none: 0,
  small: 6,
  medium: 10,
  large: 14,
  xl: 18,
  '2xl': 24,
  '3xl': 30,
  full: 9999,
} as const;

/**
 * Typography
 * 
 * Font sizes, weights, and line heights for consistent text styling.
 */
export const typography = {
  // Font sizes
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 22,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
    '5xl': 56,
  },

  // Font weights (React Native uses string values)
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Font families loaded at runtime in App.tsx
  fontFamily: brandFontFamily,

  // Line heights
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
  },
} as const;

/**
 * Shadow Styles
 * 
 * Elevation shadows for iOS and Android.
 * Uses both shadow properties (iOS) and elevation (Android).
 */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;

/**
 * Glassmorphism Constants
 * 
 * Default values for glassmorphism effects.
 */
export const glassmorphism = {
  defaultOpacity: 0.74,
  defaultBlurIntensity: 28,
  defaultBorderRadius: 24,
} as const;

/**
 * Animation Constants
 * 
 * Default values for animations.
 */
export const animation = {
  pressFeedbackScale: 0.96,
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

/**
 * Combined Theme Object
 * 
 * Single export containing all theme values.
 */
export const theme = {
  colors,
  spacing,
  spacingScale,
  borderRadius,
  typography,
  shadows,
  glassmorphism,
  animation,
} as const;

// Type exports for TypeScript support
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type SpacingScale = typeof spacingScale;
export type BorderRadius = typeof borderRadius;
export type Typography = typeof typography;
export type Shadows = typeof shadows;
export type Glassmorphism = typeof glassmorphism;
export type Animation = typeof animation;
export type Theme = typeof theme;

export default theme;
