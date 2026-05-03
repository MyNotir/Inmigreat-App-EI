/**
 * Glassmorphism Styles
 * 
 * Reusable glassmorphism style presets for the InMiGreat React Native app.
 * Implements semi-transparent backgrounds with blur effects.
 * 
 * Validates: Requirements 4.1, 4.2
 */

import { StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, shadows } from './theme';

/**
 * Glassmorphism Constants
 * 
 * Core values for glassmorphism effects as specified in requirements.
 */
export const GLASS_CONSTANTS = {
  /** Default background opacity (rgba alpha value) - Requirement 4.1 */
  DEFAULT_OPACITY: 0.74,
  /** Default blur intensity for expo-blur - Requirement 4.2 */
  DEFAULT_BLUR_INTENSITY: 28,
  /** Default border radius for glass cards */
  DEFAULT_BORDER_RADIUS: 18,
  /** Border opacity for glass effect */
  BORDER_OPACITY: 0.2,
} as const;

/**
 * Creates an rgba color string with the specified opacity
 */
export const createRgba = (
  r: number,
  g: number,
  b: number,
  alpha: number
): string => {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Creates a glass background color with custom opacity
 * Default: softly tinted brand surface for Requirement 4.1
 */
export const createGlassBackground = (opacity: number = GLASS_CONSTANTS.DEFAULT_OPACITY): string => {
  return createRgba(255, 255, 255, opacity);
};

/**
 * Creates a dark glass background color with custom opacity
 */
export const createDarkGlassBackground = (opacity: number = 0.5): string => {
  return createRgba(0, 0, 0, opacity);
};

/**
 * Creates a colored glass background with custom color and opacity
 */
export const createColoredGlassBackground = (
  hexColor: string,
  opacity: number = GLASS_CONSTANTS.DEFAULT_OPACITY
): string => {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return createRgba(r, g, b, opacity);
};

/**
 * Mixes a hex color with white and returns an opaque rgb string.
 * Useful on Android when translucent glass surfaces create rendering artifacts.
 */
export const mixHexWithWhite = (hexColor: string, ratio: number): string => {
  const normalizedHex = hexColor.replace('#', '');
  const baseHex = normalizedHex.length >= 6
    ? normalizedHex.substring(0, 6)
    : normalizedHex.length === 3
      ? normalizedHex.split('').map((channel) => `${channel}${channel}`).join('')
      : 'FFFFFF';

  const r = parseInt(baseHex.substring(0, 2), 16);
  const g = parseInt(baseHex.substring(2, 4), 16);
  const b = parseInt(baseHex.substring(4, 6), 16);
  const mixChannel = (channel: number) => Math.round(channel + ((255 - channel) * ratio));

  return `rgb(${mixChannel(r)}, ${mixChannel(g)}, ${mixChannel(b)})`;
};

/**
 * Creates a glass border color with custom opacity
 */
export const createGlassBorder = (opacity: number = GLASS_CONSTANTS.BORDER_OPACITY): string => {
  return createRgba(21, 52, 128, opacity);
};

/**
 * Helper function to create custom glass styles
 */
export const createGlassStyle = (options: {
  opacity?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderOpacity?: number;
  includeShadow?: boolean;
}): ViewStyle => {
  const {
    opacity = GLASS_CONSTANTS.DEFAULT_OPACITY,
    borderRadius: radius = GLASS_CONSTANTS.DEFAULT_BORDER_RADIUS,
    borderWidth = 1,
    borderOpacity = GLASS_CONSTANTS.BORDER_OPACITY,
    includeShadow = true,
  } = options;

  const style: ViewStyle = {
    backgroundColor: createGlassBackground(opacity),
    borderRadius: radius,
    borderWidth,
    borderColor: createGlassBorder(borderOpacity),
    overflow: 'hidden',
  };

  if (includeShadow) {
    return { ...style, ...shadows.md };
  }

  return style;
};

/**
 * Glass Style Presets
 * 
 * Pre-configured glass styles for common use cases.
 */
export const glassPresets = StyleSheet.create({
  /**
   * Default glass card style
   * - Background: rgba(255, 255, 255, 0.74)
   * - Border radius: 18
   * - Blur intensity: 28 (applied via expo-blur component)
   */
  card: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: 'hidden',
    ...shadows.md,
  },

  /**
   * Light glass preset - more transparent
   */
  light: {
    backgroundColor: createGlassBackground(0.6),
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: createGlassBorder(0.15),
    overflow: 'hidden',
    ...shadows.sm,
  },

  /**
   * Dark glass preset - for Pro feature cards
   */
  dark: {
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: createGlassBorder(0.1),
    overflow: 'hidden',
    ...shadows.lg,
  },

  /**
   * Accent glass preset - with brand color tint
   */
  accent: {
    backgroundColor: createColoredGlassBackground(colors.accent, 0.15),
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: createColoredGlassBackground(colors.accent, 0.3),
    overflow: 'hidden',
    ...shadows.md,
  },

  /**
   * Pro glass preset - with pro color tint
   */
  pro: {
    backgroundColor: createColoredGlassBackground(colors.pro, 0.15),
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: createColoredGlassBackground(colors.pro, 0.3),
    overflow: 'hidden',
    ...shadows.md,
  },

  /**
   * Success glass preset
   */
  success: {
    backgroundColor: createColoredGlassBackground(colors.success, 0.15),
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: createColoredGlassBackground(colors.success, 0.3),
    overflow: 'hidden',
    ...shadows.md,
  },

  /**
   * Warning glass preset
   */
  warning: {
    backgroundColor: createColoredGlassBackground(colors.warning, 0.15),
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: createColoredGlassBackground(colors.warning, 0.3),
    overflow: 'hidden',
    ...shadows.md,
  },

  /**
   * Error glass preset
   */
  error: {
    backgroundColor: createColoredGlassBackground(colors.error, 0.15),
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: createColoredGlassBackground(colors.error, 0.3),
    overflow: 'hidden',
    ...shadows.md,
  },

  /**
   * Subtle glass preset - minimal effect
   */
  subtle: {
    backgroundColor: createGlassBackground(0.4),
    borderRadius: borderRadius.large,
    borderWidth: 0.5,
    borderColor: createGlassBorder(0.1),
    overflow: 'hidden',
  },

  /**
   * Pill glass preset - for small elements like badges
   */
  pill: {
    backgroundColor: createGlassBackground(0.8),
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: createGlassBorder(0.2),
    overflow: 'hidden',
  },

  /**
   * Sheet glass preset - for bottom sheets and modals
   */
  sheet: {
    backgroundColor: createGlassBackground(0.9),
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: createGlassBorder(0.2),
    overflow: 'hidden',
    ...shadows.xl,
  },

  /**
   * Input glass preset - for text inputs
   */
  input: {
    backgroundColor: createGlassBackground(0.5),
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: createGlassBorder(0.3),
    overflow: 'hidden',
  },
});

/**
 * Glass Border Styles
 * 
 * Standalone border styles for glass effects.
 */
export const glassBorders = StyleSheet.create({
  /** Standard glass border */
  standard: {
    borderWidth: 1,
    borderColor: colors.glass.border,
  },

  /** Thin glass border */
  thin: {
    borderWidth: 0.5,
    borderColor: createGlassBorder(0.15),
  },

  /** Thick glass border */
  thick: {
    borderWidth: 2,
    borderColor: createGlassBorder(0.25),
  },

  /** No border */
  none: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
});

/**
 * Type exports for TypeScript support
 */
export type GlassPreset = keyof typeof glassPresets;
export type GlassBorder = keyof typeof glassBorders;
export type GlassConstants = typeof GLASS_CONSTANTS;

export default {
  GLASS_CONSTANTS,
  createRgba,
  createGlassBackground,
  createDarkGlassBackground,
  createColoredGlassBackground,
  createGlassBorder,
  createGlassStyle,
  glassPresets,
  glassBorders,
};
