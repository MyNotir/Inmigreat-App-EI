/**
 * PlatformBottomSheet Component
 * 
 * A platform-specific bottom sheet component that adapts its behavior and styling
 * based on the platform:
 * - Android: Material Design bottom sheet with drag handle, rounded corners, and elevation
 * - iOS: iOS-style sheet with different visual styling
 * 
 * Validates: Requirement 18.6 - WHEN running on Android, THE App SHALL use Material Design bottom sheet behavior
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { isAndroid, isIOS, getPlatformShadow, hapticLight } from '../../utils/platform';

// ============================================================================
// Types
// ============================================================================

export interface PlatformBottomSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Callback when the sheet should be closed */
  onClose: () => void;
  /** Sheet content */
  children: React.ReactNode;
  /** Optional title for the sheet header */
  title?: string;
  /** Optional height as percentage of screen (0-1), defaults to auto */
  heightPercent?: number;
  /** Whether to show the drag handle (Android Material Design) */
  showDragHandle?: boolean;
  /** Whether to allow dismissing by tapping the backdrop */
  dismissOnBackdropPress?: boolean;
  /** Whether to allow dismissing by dragging down */
  dismissOnDrag?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// Constants
// ============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAG_THRESHOLD = 100;
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

// ============================================================================
// Material Design Drag Handle Component (Android)
// ============================================================================

const MaterialDragHandle: React.FC = () => (
  <View style={styles.dragHandleContainer}>
    <View style={styles.dragHandle} />
  </View>
);

// ============================================================================
// iOS Close Button Component
// ============================================================================

interface IOSCloseButtonProps {
  onPress: () => void;
}

const IOSCloseButton: React.FC<IOSCloseButtonProps> = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.iosCloseButton}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <Text style={styles.iosCloseButtonText}>✕</Text>
  </TouchableOpacity>
);

// ============================================================================
// Sheet Header Component
// ============================================================================

interface SheetHeaderProps {
  title?: string;
  onClose: () => void;
  showDragHandle: boolean;
}

const SheetHeader: React.FC<SheetHeaderProps> = ({ title, onClose, showDragHandle }) => {
  if (isAndroid && showDragHandle) {
    return (
      <View style={styles.headerAndroid}>
        <MaterialDragHandle />
        {title && (
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>{title}</Text>
          </View>
        )}
      </View>
    );
  }

  // iOS header
  return (
    <View style={styles.headerIOS}>
      {title && <Text style={styles.titleText}>{title}</Text>}
      <IOSCloseButton onPress={onClose} />
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const PlatformBottomSheet: React.FC<PlatformBottomSheetProps> = ({
  visible,
  onClose,
  children,
  title,
  heightPercent,
  showDragHandle = isAndroid, // Default to true on Android for Material Design
  dismissOnBackdropPress = true,
  dismissOnDrag = true,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const isClosing = useRef(false);

  // Calculate sheet height
  const sheetHeight = heightPercent
    ? SCREEN_HEIGHT * heightPercent
    : undefined;

  // Handle close with animation
  const handleClose = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;

    hapticLight();
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
      runOnJS(onClose)();
    });
    backdropOpacity.value = withTiming(0, { duration: 200 });
  }, [onClose, translateY, backdropOpacity]);

  // Handle open animation
  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      translateY.value = withSpring(0, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
    }
  }, [visible, translateY, backdropOpacity]);

  // Gesture handler for drag-to-dismiss (Material Design behavior)
  const panGesture = Gesture.Pan()
    .enabled(dismissOnDrag)
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Only allow dragging down
      const newY = context.value.y + event.translationY;
      translateY.value = Math.max(0, newY);
    })
    .onEnd((event) => {
      if (event.translationY > DRAG_THRESHOLD || event.velocityY > 500) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  // Animated styles
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      backdropOpacity.value,
      [0, 1],
      [0, 0.5],
      Extrapolation.CLAMP
    ),
  }));

  // Platform-specific sheet styles
  const platformSheetStyle = isAndroid
    ? styles.sheetAndroid
    : styles.sheetIOS;

  const platformShadow = getPlatformShadow(isAndroid ? 16 : 8);
  const shouldUseHeaderDrag = isAndroid && showDragHandle;

  if (!visible) return null;

  const sheetBody = (
    <Animated.View
      style={[
        styles.sheet,
        platformSheetStyle,
        platformShadow,
        sheetAnimatedStyle,
        sheetHeight ? { height: sheetHeight } : undefined,
        { paddingBottom: insets.bottom + spacing.md },
      ]}
    >
      {shouldUseHeaderDrag ? (
        <GestureDetector gesture={panGesture}>
          <View style={styles.dragHeaderRegion}>
            <SheetHeader
              title={title}
              onClose={handleClose}
              showDragHandle={showDragHandle}
            />
          </View>
        </GestureDetector>
      ) : (
        <SheetHeader
          title={title}
          onClose={handleClose}
          showDragHandle={showDragHandle}
        />
      )}
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
      testID={testID}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        {/* Backdrop */}
        <TouchableWithoutFeedback
          onPress={dismissOnBackdropPress ? handleClose : undefined}
        >
          <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        {shouldUseHeaderDrag ? (
          sheetBody
        ) : (
          <GestureDetector gesture={panGesture}>
            {sheetBody}
          </GestureDetector>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheet: {
    backgroundColor: colors.background.secondary,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  // Android Material Design styles
  sheetAndroid: {
    borderTopLeftRadius: 28, // Material Design 3 large component radius
    borderTopRightRadius: 28,
    elevation: 16,
  },
  // iOS styles
  sheetIOS: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  // Drag handle (Material Design)
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  dragHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.medium,
  },
  // Headers
  headerAndroid: {
    paddingHorizontal: spacing.lg,
  },
  dragHeaderRegion: {
    zIndex: 1,
  },
  headerIOS: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  titleContainer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  titleText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    textAlign: isAndroid ? 'left' : 'center',
    flex: isIOS ? 1 : undefined,
  },
  // iOS close button
  iosCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosCloseButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
  },
  // Content
  content: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.lg,
  },
});

export default PlatformBottomSheet;
