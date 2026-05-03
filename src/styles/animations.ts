/**
 * Animation Utilities
 * 
 * Reusable animation utilities for the InMiGreat React Native app.
 * Uses react-native-reanimated for performant, native-driven animations.
 * 
 * Validates: Requirements 4.6, 4.7, 4.9
 */

import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useCallback, useEffect } from 'react';

/**
 * Animation Constants
 */
export const ANIMATION_CONSTANTS = {
  /** Press feedback scale value - Requirement 4.9 */
  PRESS_FEEDBACK_SCALE: 0.96,
  /** Default animation duration in ms */
  DEFAULT_DURATION: 300,
  /** Fast animation duration in ms */
  FAST_DURATION: 150,
  /** Slow animation duration in ms */
  SLOW_DURATION: 500,
  /** Shimmer animation duration in ms */
  SHIMMER_DURATION: 1500,
  /** Ping animation duration in ms */
  PING_DURATION: 1000,
} as const;

/**
 * Spring Configuration Presets
 */
export const springConfigs = {
  /** Default spring config */
  default: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  /** Bouncy spring for pop effects */
  bouncy: {
    damping: 10,
    stiffness: 180,
    mass: 1,
  },
  /** Gentle spring for subtle animations */
  gentle: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },
  /** Snappy spring for quick responses */
  snappy: {
    damping: 20,
    stiffness: 250,
    mass: 0.8,
  },
} as const;

/**
 * Timing Configuration Presets
 */
export const timingConfigs = {
  /** Default timing config */
  default: {
    duration: ANIMATION_CONSTANTS.DEFAULT_DURATION,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  /** Fast timing config */
  fast: {
    duration: ANIMATION_CONSTANTS.FAST_DURATION,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  /** Slow timing config */
  slow: {
    duration: ANIMATION_CONSTANTS.SLOW_DURATION,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  /** Ease out timing */
  easeOut: {
    duration: ANIMATION_CONSTANTS.DEFAULT_DURATION,
    easing: Easing.out(Easing.cubic),
  },
  /** Ease in timing */
  easeIn: {
    duration: ANIMATION_CONSTANTS.DEFAULT_DURATION,
    easing: Easing.in(Easing.cubic),
  },
} as const;

// ============================================================================
// FADE UP ANIMATION
// Requirement 4.6: Implement fadeUp animation
// ============================================================================

/**
 * Hook for fade up animation - fade in while moving up
 * 
 * @param options - Animation options
 * @returns Animated style and trigger function
 */
export const useFadeUp = (options?: {
  duration?: number;
  delay?: number;
  distance?: number;
  autoStart?: boolean;
}) => {
  const {
    duration = ANIMATION_CONSTANTS.DEFAULT_DURATION,
    delay = 0,
    distance = 20,
    autoStart = false,
  } = options || {};

  const progress = useSharedValue(autoStart ? 0 : 1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        {
          translateY: interpolate(progress.value, [0, 1], [distance, 0]),
        },
      ],
    };
  });

  const fadeIn = useCallback(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, duration, progress]);

  const fadeOut = useCallback(() => {
    progress.value = withTiming(0, { duration, easing: Easing.in(Easing.cubic) });
  }, [duration, progress]);

  const reset = useCallback(() => {
    progress.value = 0;
  }, [progress]);

  useEffect(() => {
    if (autoStart) {
      fadeIn();
    }
  }, [autoStart, fadeIn]);

  return {
    animatedStyle,
    fadeIn,
    fadeOut,
    reset,
    progress,
  };
};

// ============================================================================
// SLIDE UP ANIMATION
// Requirement 4.6: Implement slideUp animation
// ============================================================================

/**
 * Hook for slide up animation - slide up from bottom
 * 
 * @param options - Animation options
 * @returns Animated style and trigger functions
 */
export const useSlideUp = (options?: {
  duration?: number;
  delay?: number;
  distance?: number;
  useSpring?: boolean;
}) => {
  const {
    duration = ANIMATION_CONSTANTS.DEFAULT_DURATION,
    delay = 0,
    distance = 100,
    useSpring: shouldUseSpring = false,
  } = options || {};

  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(progress.value, [0, 1], [distance, 0]),
        },
      ],
    };
  });

  const slideIn = useCallback(() => {
    progress.value = 0;
    if (shouldUseSpring) {
      progress.value = withDelay(delay, withSpring(1, springConfigs.default));
    } else {
      progress.value = withDelay(
        delay,
        withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [delay, duration, progress, shouldUseSpring]);

  const slideOut = useCallback(() => {
    if (shouldUseSpring) {
      progress.value = withSpring(0, springConfigs.default);
    } else {
      progress.value = withTiming(0, { duration, easing: Easing.in(Easing.cubic) });
    }
  }, [duration, progress, shouldUseSpring]);

  const reset = useCallback(() => {
    progress.value = 0;
  }, [progress]);

  return {
    animatedStyle,
    slideIn,
    slideOut,
    reset,
    progress,
  };
};

// ============================================================================
// POP IN ANIMATION
// Requirement 4.6: Implement popIn animation
// ============================================================================

/**
 * Hook for pop in animation - scale up with bounce
 * 
 * @param options - Animation options
 * @returns Animated style and trigger functions
 */
export const usePopIn = (options?: {
  initialScale?: number;
  duration?: number;
  delay?: number;
}) => {
  const {
    initialScale = 0.8,
    duration = ANIMATION_CONSTANTS.DEFAULT_DURATION,
    delay = 0,
  } = options || {};

  const scale = useSharedValue(initialScale);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  const popIn = useCallback(() => {
    scale.value = initialScale;
    opacity.value = 0;
    
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: duration * 0.5 })
    );
    
    scale.value = withDelay(
      delay,
      withSpring(1, {
        ...springConfigs.bouncy,
        overshootClamping: false,
      })
    );
  }, [delay, duration, initialScale, opacity, scale]);

  const popOut = useCallback(() => {
    opacity.value = withTiming(0, { duration: duration * 0.5 });
    scale.value = withTiming(initialScale, { duration: duration * 0.5 });
  }, [duration, initialScale, opacity, scale]);

  const reset = useCallback(() => {
    scale.value = initialScale;
    opacity.value = 0;
  }, [initialScale, opacity, scale]);

  return {
    animatedStyle,
    popIn,
    popOut,
    reset,
    scale,
    opacity,
  };
};

// ============================================================================
// SHIMMER ANIMATION
// Requirement 4.7: Implement shimmer loading animation
// ============================================================================

/**
 * Hook for shimmer loading animation
 * Creates a sweeping highlight effect for skeleton loading states
 * 
 * @param options - Animation options
 * @returns Animated style for shimmer effect
 */
export const useShimmer = (options?: {
  duration?: number;
  autoStart?: boolean;
}) => {
  const {
    duration = ANIMATION_CONSTANTS.SHIMMER_DURATION,
    autoStart = true,
  } = options || {};

  const translateX = useSharedValue(-1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(translateX.value, [-1, 1], [-100, 100]),
        },
      ],
    };
  });

  const startShimmer = useCallback(() => {
    translateX.value = -1;
    translateX.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1, // Infinite repeat
      false // Don't reverse
    );
  }, [duration, translateX]);

  const stopShimmer = useCallback(() => {
    translateX.value = -1;
  }, [translateX]);

  useEffect(() => {
    if (autoStart) {
      startShimmer();
    }
    return () => {
      stopShimmer();
    };
  }, [autoStart, startShimmer, stopShimmer]);

  return {
    animatedStyle,
    startShimmer,
    stopShimmer,
    translateX,
  };
};

/**
 * Shimmer gradient colors for skeleton loading
 */
export const shimmerColors = {
  light: ['#E5E7EB', '#F3F4F6', '#E5E7EB'],
  dark: ['#374151', '#4B5563', '#374151'],
} as const;

// ============================================================================
// PRESS FEEDBACK ANIMATION
// Requirement 4.9: Implement press feedback with scale(0.96)
// ============================================================================

/**
 * Hook for press feedback animation
 * Scales element to 0.96 on press as per Requirement 4.9
 * 
 * @param options - Animation options
 * @returns Animated style and press handlers
 */
export const usePressAnimation = (options?: {
  scale?: number;
  duration?: number;
}) => {
  const {
    scale = ANIMATION_CONSTANTS.PRESS_FEEDBACK_SCALE,
    duration = ANIMATION_CONSTANTS.FAST_DURATION,
  } = options || {};

  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    };
  });

  const onPressIn = useCallback(() => {
    scaleValue.value = withTiming(scale, { duration });
  }, [duration, scale, scaleValue]);

  const onPressOut = useCallback(() => {
    scaleValue.value = withSpring(1, springConfigs.snappy);
  }, [scaleValue]);

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
    scaleValue,
  };
};

// ============================================================================
// PING ANIMATION
// Requirement 4.6: Implement ping animation for alerts
// ============================================================================

/**
 * Hook for ping animation - pulsing effect for alerts
 * 
 * @param options - Animation options
 * @returns Animated style and control functions
 */
export const usePing = (options?: {
  duration?: number;
  maxScale?: number;
  autoStart?: boolean;
}) => {
  const {
    duration = ANIMATION_CONSTANTS.PING_DURATION,
    maxScale = 1.5,
    autoStart = false,
  } = options || {};

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const startPing = useCallback(() => {
    scale.value = 1;
    opacity.value = 1;
    
    scale.value = withRepeat(
      withTiming(maxScale, { duration, easing: Easing.out(Easing.cubic) }),
      -1, // Infinite repeat
      false // Don't reverse
    );
    
    opacity.value = withRepeat(
      withTiming(0, { duration, easing: Easing.out(Easing.cubic) }),
      -1,
      false
    );
  }, [duration, maxScale, opacity, scale]);

  const stopPing = useCallback(() => {
    scale.value = 1;
    opacity.value = 1;
  }, [opacity, scale]);

  const pingOnce = useCallback(() => {
    scale.value = 1;
    opacity.value = 1;
    
    scale.value = withTiming(maxScale, { duration, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration, easing: Easing.out(Easing.cubic) });
  }, [duration, maxScale, opacity, scale]);

  useEffect(() => {
    if (autoStart) {
      startPing();
    }
    return () => {
      stopPing();
    };
  }, [autoStart, startPing, stopPing]);

  return {
    animatedStyle,
    startPing,
    stopPing,
    pingOnce,
    scale,
    opacity,
  };
};

// ============================================================================
// ADDITIONAL UTILITY ANIMATIONS
// ============================================================================

/**
 * Hook for fade animation
 * 
 * @param options - Animation options
 * @returns Animated style and control functions
 */
export const useFade = (options?: {
  duration?: number;
  initialOpacity?: number;
}) => {
  const {
    duration = ANIMATION_CONSTANTS.DEFAULT_DURATION,
    initialOpacity = 0,
  } = options || {};

  const opacity = useSharedValue(initialOpacity);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const fadeIn = useCallback(() => {
    opacity.value = withTiming(1, { duration });
  }, [duration, opacity]);

  const fadeOut = useCallback(() => {
    opacity.value = withTiming(0, { duration });
  }, [duration, opacity]);

  const fadeTo = useCallback((value: number) => {
    opacity.value = withTiming(value, { duration });
  }, [duration, opacity]);

  return {
    animatedStyle,
    fadeIn,
    fadeOut,
    fadeTo,
    opacity,
  };
};

/**
 * Hook for scale animation
 * 
 * @param options - Animation options
 * @returns Animated style and control functions
 */
export const useScale = (options?: {
  initialScale?: number;
  useSpring?: boolean;
}) => {
  const {
    initialScale = 1,
    useSpring: shouldUseSpring = true,
  } = options || {};

  const scale = useSharedValue(initialScale);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const scaleTo = useCallback((value: number) => {
    if (shouldUseSpring) {
      scale.value = withSpring(value, springConfigs.default);
    } else {
      scale.value = withTiming(value, timingConfigs.default);
    }
  }, [scale, shouldUseSpring]);

  const reset = useCallback(() => {
    scale.value = shouldUseSpring
      ? withSpring(initialScale, springConfigs.default)
      : withTiming(initialScale, timingConfigs.default);
  }, [initialScale, scale, shouldUseSpring]);

  return {
    animatedStyle,
    scaleTo,
    reset,
    scale,
  };
};

/**
 * Hook for rotation animation
 * 
 * @param options - Animation options
 * @returns Animated style and control functions
 */
export const useRotate = (options?: {
  duration?: number;
  continuous?: boolean;
}) => {
  const {
    duration = ANIMATION_CONSTANTS.SLOW_DURATION,
    continuous = false,
  } = options || {};

  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const rotateTo = useCallback((degrees: number) => {
    rotation.value = withTiming(degrees, { duration });
  }, [duration, rotation]);

  const startContinuous = useCallback(() => {
    rotation.value = 0;
    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [duration, rotation]);

  const stop = useCallback(() => {
    rotation.value = withTiming(0, { duration: duration / 2 });
  }, [duration, rotation]);

  useEffect(() => {
    if (continuous) {
      startContinuous();
    }
  }, [continuous, startContinuous]);

  return {
    animatedStyle,
    rotateTo,
    startContinuous,
    stop,
    rotation,
  };
};

// ============================================================================
// STAGGERED ANIMATIONS
// ============================================================================

/**
 * Creates staggered animation delays for list items
 * 
 * @param index - Item index in the list
 * @param baseDelay - Base delay between items (default: 50ms)
 * @param maxDelay - Maximum total delay (default: 500ms)
 * @returns Delay in milliseconds
 */
export const getStaggerDelay = (
  index: number,
  baseDelay: number = 50,
  maxDelay: number = 500
): number => {
  return Math.min(index * baseDelay, maxDelay);
};

/**
 * Hook for staggered fade up animation
 * Useful for animating list items
 * 
 * @param index - Item index for stagger calculation
 * @param options - Animation options
 * @returns Animated style
 */
export const useStaggeredFadeUp = (
  index: number,
  options?: {
    baseDelay?: number;
    duration?: number;
    distance?: number;
  }
) => {
  const {
    baseDelay = 50,
    duration = ANIMATION_CONSTANTS.DEFAULT_DURATION,
    distance = 20,
  } = options || {};

  const delay = getStaggerDelay(index, baseDelay);
  
  return useFadeUp({
    duration,
    delay,
    distance,
    autoStart: true,
  });
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SpringConfig = typeof springConfigs[keyof typeof springConfigs];
export type TimingConfig = typeof timingConfigs[keyof typeof timingConfigs];
export type AnimationConstants = typeof ANIMATION_CONSTANTS;

export default {
  ANIMATION_CONSTANTS,
  springConfigs,
  timingConfigs,
  shimmerColors,
  getStaggerDelay,
  // Hooks are exported individually
};
