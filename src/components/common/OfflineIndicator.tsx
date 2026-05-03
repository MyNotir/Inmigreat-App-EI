/**
 * OfflineIndicator Component
 * 
 * A banner component that displays when the device is offline.
 * Shows a visual indicator that cached data is being displayed.
 * Uses @react-native-community/netinfo for network state detection.
 * 
 * Validates: Requirements 17.5
 */

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useViewTranslation } from '../../i18n';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { createColoredGlassBackground } from '../../styles/glassmorphism';
import { ANIMATION_CONSTANTS, springConfigs } from '../../styles/animations';

/**
 * Animation duration for slide in/out
 */
const SLIDE_DURATION = 300;

/**
 * Banner height offset for slide animation (slides from above)
 */
const BANNER_SLIDE_OFFSET = -60;

/**
 * Props interface for OfflineIndicator component
 */
export interface OfflineIndicatorProps {
  /** Optional custom message to display when offline */
  message?: string;
  /** Optional callback when network state changes */
  onNetworkChange?: (isConnected: boolean) => void;
  /** Whether to show the indicator (can be controlled externally) */
  forceShow?: boolean;
}

/**
 * OfflineIndicator Component
 * 
 * Displays a banner at the top of the screen when the device is offline.
 * Features:
 * - Automatic network state detection using NetInfo
 * - Slide-down animation when shown
 * - Warning color scheme to indicate offline state
 * - Safe area insets for notch devices
 * - Displays message about cached data being shown
 * 
 * @example
 * ```tsx
 * // Basic usage - automatically detects network state
 * <OfflineIndicator />
 * 
 * // With custom message
 * <OfflineIndicator message="No internet connection. Showing saved data." />
 * 
 * // With network change callback
 * <OfflineIndicator onNetworkChange={(isConnected) => console.log(isConnected)} />
 * ```
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  message,
  onNetworkChange,
  forceShow,
}) => {
  const { t } = useViewTranslation('common');
  const resolvedMessage = message ?? t('offline.banner', { defaultValue: 'Sin conexion. Mostrando datos guardados.' });
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const translateY = useSharedValue(BANNER_SLIDE_OFFSET);
  const opacity = useSharedValue(0);

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      setIsOffline(!connected);
      
      if (onNetworkChange) {
        onNetworkChange(connected);
      }
    });

    // Check initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      setIsOffline(!connected);
      
      if (onNetworkChange) {
        onNetworkChange(connected);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onNetworkChange]);

  // Determine if banner should be visible
  const shouldShow = forceShow !== undefined ? forceShow : isOffline;

  // Handle visibility animation
  useEffect(() => {
    if (shouldShow) {
      // Slide in from top
      translateY.value = withSpring(0, {
        ...springConfigs.snappy,
        overshootClamping: false,
      });
      opacity.value = withTiming(1, {
        duration: SLIDE_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      // Slide out to top
      translateY.value = withTiming(BANNER_SLIDE_OFFSET, {
        duration: SLIDE_DURATION,
        easing: Easing.in(Easing.cubic),
      });
      opacity.value = withTiming(0, {
        duration: SLIDE_DURATION,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [shouldShow, translateY, opacity]);

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  // Don't render if not visible and animation complete
  if (!shouldShow && opacity.value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top },
        animatedContainerStyle,
      ]}
      pointerEvents={shouldShow ? 'auto' : 'none'}
      accessibilityRole="alert"
      accessibilityLabel={resolvedMessage}
    >
      <View style={styles.banner}>
        {/* Offline icon */}
        <View style={styles.iconContainer}>
          <View style={styles.offlineIcon}>
            <View style={styles.iconLine} />
          </View>
        </View>
        
        {/* Message text */}
        <Text style={styles.message} numberOfLines={1}>
          {resolvedMessage}
        </Text>
      </View>
    </Animated.View>
  );
};

/**
 * Hook to get current network connectivity status
 * 
 * @returns Object with isConnected boolean and isLoading state
 * 
 * @example
 * ```tsx
 * const { isConnected, isLoading } = useNetworkStatus();
 * 
 * if (!isConnected) {
 *   return <CachedDataView />;
 * }
 * ```
 */
export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected);
      setIsLoading(false);
    });

    // Check initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsConnected(state.isConnected);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected: isConnected ?? true,
    isOffline: isConnected === false,
    isLoading,
  };
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9998, // Below PushToast (9999)
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: createColoredGlassBackground(colors.warning, 0.95),
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  offlineIcon: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.warm.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLine: {
    width: 10,
    height: 2,
    backgroundColor: colors.background.primary,
    transform: [{ rotate: '45deg' }],
  },
  message: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.cream,
    textAlign: 'center',
  },
});

export default OfflineIndicator;
