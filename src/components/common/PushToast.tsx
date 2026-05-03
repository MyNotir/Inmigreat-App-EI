/**
 * PushToast Component
 * 
 * A toast notification component that displays at the top of the screen
 * when push notifications are received while the app is in the foreground.
 * Features glassmorphism styling and slide-down animation.
 * 
 * Validates: Requirements 16.4, 16.5
 */

import React, { useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import type { IconProps } from '../../icons';
import {
  GLASS_CONSTANTS,
  createGlassBackground,
  createGlassBorder,
} from '../../styles/glassmorphism';
import { colors, spacing, borderRadius, typography, shadows } from '../../styles/theme';
import { ANIMATION_CONSTANTS, springConfigs } from '../../styles/animations';

/**
 * Default auto-dismiss timeout in milliseconds
 */
const DEFAULT_AUTO_DISMISS_MS = 5000;

/**
 * Animation duration for slide in/out
 */
const SLIDE_DURATION = 300;

/**
 * Toast height offset for slide animation (slides from above screen)
 */
const TOAST_SLIDE_OFFSET = -150;

/**
 * Props interface for PushToast component
 */
export interface PushToastProps {
  /** Whether the toast is visible */
  visible: boolean;
  /** Optional icon component to display */
  icon?: React.ComponentType<IconProps>;
  /** Title text for the notification */
  title: string;
  /** Body text for the notification */
  body: string;
  /** Callback when toast is dismissed */
  onDismiss: () => void;
  /** Optional callback when toast is pressed */
  onPress?: () => void;
  /** Auto-dismiss timeout in milliseconds. Default: 5000. Set to 0 to disable. */
  autoDismissMs?: number;
}

/**
 * PushToast Component
 * 
 * Displays a toast notification at the top of the screen with:
 * - Icon, title, body text, and dismiss button (Requirement 16.5)
 * - Glassmorphism styling with blur effect
 * - Slide-down animation when shown
 * - Auto-dismiss after timeout
 * - Safe area insets for notch devices
 * 
 * @example
 * ```tsx
 * <PushToast
 *   visible={showToast}
 *   icon={AlertApprovedIcon}
 *   title="Case Update"
 *   body="Your I-485 status has been updated"
 *   onDismiss={() => setShowToast(false)}
 *   onPress={() => navigateToCase()}
 * />
 * ```
 */
export const PushToast: React.FC<PushToastProps> = ({
  visible,
  icon: Icon,
  title,
  body,
  onDismiss,
  onPress,
  autoDismissMs = DEFAULT_AUTO_DISMISS_MS,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(TOAST_SLIDE_OFFSET);
  const opacity = useSharedValue(0);

  // Handle auto-dismiss
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    if (visible && autoDismissMs > 0) {
      timeoutId = setTimeout(() => {
        onDismiss();
      }, autoDismissMs);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [visible, autoDismissMs, onDismiss]);

  // Handle visibility animation
  useEffect(() => {
    if (visible) {
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
      translateY.value = withTiming(TOAST_SLIDE_OFFSET, {
        duration: SLIDE_DURATION,
        easing: Easing.in(Easing.cubic),
      });
      opacity.value = withTiming(0, {
        duration: SLIDE_DURATION,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible, translateY, opacity]);

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  // Handle press on toast content
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    }
  }, [onPress]);

  // Handle dismiss button press
  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // Don't render if not visible and animation complete
  if (!visible && opacity.value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.sm },
        animatedContainerStyle,
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.toastWrapper,
          pressed && onPress && styles.toastPressed,
        ]}
        disabled={!onPress}
      >
        <View style={styles.toast}>
          {/* Blur background */}
          <BlurView
            intensity={GLASS_CONSTANTS.DEFAULT_BLUR_INTENSITY}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
          
          {/* Content overlay */}
          <View style={styles.content}>
            {/* Icon */}
            {Icon && (
              <View style={styles.iconContainer}>
                <Icon size={24} color={colors.accent} strokeWidth={1.8} />
              </View>
            )}
            
            {/* Text content */}
            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.body} numberOfLines={2}>
                {body}
              </Text>
            </View>
            
            {/* Dismiss button */}
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.dismissButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Dismiss notification"
              accessibilityRole="button"
            >
              <View style={styles.dismissIcon}>
                <Text style={styles.dismissText}>×</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: spacing.md,
  },
  toastWrapper: {
    width: '100%',
  },
  toastPressed: {
    transform: [{ scale: ANIMATION_CONSTANTS.PRESS_FEEDBACK_SCALE }],
  },
  toast: {
    backgroundColor: createGlassBackground(0.85),
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: createGlassBorder(0.3),
    overflow: 'hidden',
    ...shadows.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    position: 'relative',
    zIndex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.large,
    backgroundColor: createGlassBackground(0.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.xs / 2,
  },
  body: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.normal,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  dismissIcon: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default PushToast;
