/**
 * Push Notification Service - Expo notifications integration
 * Validates: Requirements 16.1, 16.2, 16.7
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api';
import { getItem, removeItem, setItem, STORAGE_KEYS } from './storage';
import { colors } from '../styles/theme';
import type { NotificationType, PushNotification } from '../types/user';

// Expo Go no soporta push notifications desde SDK 53
const isExpoGo = Constants.appOwnership === 'expo';

// ============================================================================
// Types
// ============================================================================

/**
 * Notification categories supported by the app
 */
export const NOTIFICATION_CATEGORIES = {
  CASE_UPDATE: 'case_update',
  COMMUNITY: 'community',
  PRO_ALERT: 'pro_alert',
  NEWS: 'news',
} as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

/**
 * Result of permission request
 */
export interface PermissionResult {
  /** Whether permission was granted */
  granted: boolean;
  /** Whether permission can be requested (not permanently denied) */
  canAskAgain: boolean;
  /** The current permission status */
  status: 'granted' | 'denied' | 'undetermined';
}

/**
 * Result of push token registration
 */
export interface PushTokenResult {
  /** Whether registration was successful */
  success: boolean;
  /** The Expo push token if successful */
  token?: string;
  /** Error message if registration failed */
  error?: string;
}

/**
 * Notification listener subscription
 */
export interface NotificationSubscription {
  /** Remove the listener */
  remove: () => void;
}

/**
 * Notification received callback
 */
export type NotificationReceivedCallback = (notification: PushNotification) => void;

/**
 * Notification response callback (when user taps notification)
 */
export type NotificationResponseCallback = (
  notification: PushNotification,
  actionIdentifier: string
) => void;

export interface ActiveNotificationContext {
  routeName: string | null;
  routeParams?: Record<string, unknown>;
}

let activeNotificationContext: ActiveNotificationContext = { routeName: null };

function getCommunityEvent(data: Record<string, unknown> | undefined): string | null {
  const event = data?.event;
  return typeof event === 'string' ? event : null;
}

function getStringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function shouldSuppressForegroundNotification(notification: Notifications.Notification): boolean {
  const data = notification.request.content.data as Record<string, unknown> | undefined;

  if (data?.type !== NOTIFICATION_CATEGORIES.COMMUNITY) {
    return false;
  }

  const event = getCommunityEvent(data);
  const routeName = activeNotificationContext.routeName;
  const routeGroupId = getStringValue(activeNotificationContext.routeParams?.groupId);
  const routePostId = getStringValue(activeNotificationContext.routeParams?.postId);
  const payloadGroupId = getStringValue(data.groupId);
  const payloadPostId = getStringValue(data.postId);

  if (event === 'moderation_case_opened') {
    return routeName === 'GroupDetail' && routeGroupId === payloadGroupId;
  }

  if (
    event === 'moderation_post_approved' ||
    event === 'moderation_post_rejected' ||
    event === 'moderation_comment_approved' ||
    event === 'moderation_comment_rejected'
  ) {
    return routeName === 'ThreadView' && routePostId === payloadPostId;
  }

  return false;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configure notification handler for foreground notifications
 */
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const suppressForegroundAlert = shouldSuppressForegroundNotification(notification);

      return {
        shouldShowAlert: !suppressForegroundAlert,
        shouldPlaySound: !suppressForegroundAlert,
        shouldSetBadge: true,
        shouldShowBanner: !suppressForegroundAlert,
        shouldShowList: !suppressForegroundAlert,
      };
    },
  });
}

export function setActiveNotificationContext(context: ActiveNotificationContext): void {
  activeNotificationContext = context;
}

export function getActiveNotificationContext(): ActiveNotificationContext {
  return activeNotificationContext;
}

// ============================================================================
// Permission Management
// ============================================================================

/**
 * Request notification permissions from the user
 * @returns Permission result with granted status
 */
export async function requestPermissions(): Promise<PermissionResult> {
  try {
    // Check if running on a physical device
    if (!Device.isDevice) {
      console.log('[Notifications] Must use physical device for push notifications');
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }

    // Get current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      return {
        granted: true,
        canAskAgain: true,
        status: 'granted',
      };
    }

    // Request permission if not already granted
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();

    return {
      granted: status === 'granted',
      canAskAgain,
      status: status as 'granted' | 'denied' | 'undetermined',
    };
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    return {
      granted: false,
      canAskAgain: false,
      status: 'denied',
    };
  }
}

/**
 * Check current notification permission status
 * @returns Current permission status
 */
export async function getPermissionStatus(): Promise<PermissionResult> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain,
      status: status as 'granted' | 'denied' | 'undetermined',
    };
  } catch (error) {
    console.error('[Notifications] Error getting permission status:', error);
    return {
      granted: false,
      canAskAgain: false,
      status: 'denied',
    };
  }
}

// ============================================================================
// Push Token Registration
// ============================================================================

/**
 * Get the Expo push token for this device
 * @returns Push token result
 */
export async function getExpoPushToken(): Promise<PushTokenResult> {
  try {
    // Push tokens no funcionan en Expo Go desde SDK 53
    if (isExpoGo) {
      return { success: false, error: 'Push notifications not supported in Expo Go' };
    }

    // Check if running on a physical device
    if (!Device.isDevice) {
      return {
        success: false,
        error: 'Must use physical device for push notifications',
      };
    }

    // Ensure permissions are granted
    const permission = await requestPermissions();
    if (!permission.granted) {
      return {
        success: false,
        error: 'Notification permissions not granted',
      };
    }

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: colors.accent,
      });
    }

    // Get the push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Will use the projectId from app.json
    });

    return {
      success: true,
      token: tokenData.data,
    };
  } catch (error) {
    console.error('[Notifications] Error getting push token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get push token',
    };
  }
}

/**
 * Register push token with the backend
 * @param token - The Expo push token
 * @returns Whether registration was successful
 */
export async function registerPushToken(token: string): Promise<boolean> {
  try {
    await apiClient.post('/users/me/push-tokens', {
      token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });

    await setItem(STORAGE_KEYS.PUSH_TOKEN, token);

    console.log('[Notifications] Push token registered:', token.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('[Notifications] Error registering push token:', error);
    return false;
  }
}

/**
 * Unregister push token from the backend (e.g., on logout)
 * @param token - The Expo push token to unregister
 * @returns Whether unregistration was successful
 */
export async function unregisterPushToken(token: string): Promise<boolean> {
  try {
    await apiClient.delete(`/users/me/push-tokens/${encodeURIComponent(token)}`);

    await removeItem(STORAGE_KEYS.PUSH_TOKEN);

    console.log('[Notifications] Push token unregistered');
    return true;
  } catch (error) {
    console.error('[Notifications] Error unregistering push token:', error);
    return false;
  }
}

export async function getRegisteredPushToken(): Promise<string | null> {
  return getItem<string>(STORAGE_KEYS.PUSH_TOKEN);
}

// ============================================================================
// Notification Listeners
// ============================================================================

/**
 * Convert Expo notification to our PushNotification type
 */
function convertNotification(notification: Notifications.Notification): PushNotification {
  const { request } = notification;
  const { content, identifier } = request;
  const data = content.data as Record<string, unknown> | undefined;
  
  return {
    id: identifier,
    type: (data?.type as NotificationType) || 'news',
    title: content.title || '',
    body: content.body || '',
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Add listener for notifications received while app is in foreground
 * @param callback - Function to call when notification is received
 * @returns Subscription object with remove method
 */
export function addNotificationReceivedListener(
  callback: NotificationReceivedCallback
): NotificationSubscription {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const pushNotification = convertNotification(notification);
    callback(pushNotification);
  });

  return {
    remove: () => subscription.remove(),
  };
}

/**
 * Add listener for notification responses (when user taps notification)
 * @param callback - Function to call when user interacts with notification
 * @returns Subscription object with remove method
 */
export function addNotificationResponseListener(
  callback: NotificationResponseCallback
): NotificationSubscription {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const pushNotification = convertNotification(response.notification);
    const actionIdentifier = response.actionIdentifier;
    callback(pushNotification, actionIdentifier);
  });

  return {
    remove: () => subscription.remove(),
  };
}

/**
 * Get the last notification response (if app was opened from notification)
 * @returns The notification that opened the app, or null
 */
export async function getLastNotificationResponse(): Promise<PushNotification | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) {
      return null;
    }
    return convertNotification(response.notification);
  } catch (error) {
    console.error('[Notifications] Error getting last notification response:', error);
    return null;
  }
}

// ============================================================================
// Notification Categories
// ============================================================================

/**
 * Check if a notification type is valid
 * @param type - The notification type to check
 * @returns Whether the type is a valid notification category
 */
export function isValidNotificationCategory(type: string): type is NotificationCategory {
  return Object.values(NOTIFICATION_CATEGORIES).includes(type as NotificationCategory);
}

/**
 * Get display name for notification category
 * @param category - The notification category
 * @returns Human-readable category name
 */
export function getCategoryDisplayName(category: NotificationCategory): string {
  switch (category) {
    case NOTIFICATION_CATEGORIES.CASE_UPDATE:
      return 'Actualizaciones de caso';
    case NOTIFICATION_CATEGORIES.COMMUNITY:
      return 'Comunidad';
    case NOTIFICATION_CATEGORIES.PRO_ALERT:
      return 'Alertas Pro';
    case NOTIFICATION_CATEGORIES.NEWS:
      return 'Noticias';
    default:
      return 'Notificación';
  }
}

// ============================================================================
// Badge Management
// ============================================================================

/**
 * Set the app badge count
 * @param count - Badge count to display
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('[Notifications] Error setting badge count:', error);
  }
}

/**
 * Clear the app badge
 */
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}

/**
 * Get current badge count
 * @returns Current badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('[Notifications] Error getting badge count:', error);
    return 0;
  }
}

// ============================================================================
// Local Notifications (for testing)
// ============================================================================

/**
 * Schedule a local notification (useful for testing)
 * @param notification - Notification content
 * @param trigger - When to show the notification (null for immediate)
 * @returns Notification identifier
 */
export async function scheduleLocalNotification(
  notification: {
    title: string;
    body: string;
    type?: NotificationType;
    data?: Record<string, unknown>;
  },
  trigger: Notifications.NotificationTriggerInput = null
): Promise<string> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: {
          type: notification.type || 'news',
          ...notification.data,
        },
      },
      trigger,
    });
    return identifier;
  } catch (error) {
    console.error('[Notifications] Error scheduling notification:', error);
    throw error;
  }
}

/**
 * Cancel a scheduled notification
 * @param identifier - Notification identifier to cancel
 */
export async function cancelNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('[Notifications] Error canceling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Error canceling all notifications:', error);
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const notifications = {
  // Categories
  NOTIFICATION_CATEGORIES,
  isValidNotificationCategory,
  getCategoryDisplayName,
  // Permissions
  requestPermissions,
  getPermissionStatus,
  // Push token
  getExpoPushToken,
  registerPushToken,
  unregisterPushToken,
  getRegisteredPushToken,
  // Listeners
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponse,
  // Badge
  setBadgeCount,
  clearBadge,
  getBadgeCount,
  // Local notifications
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
};

export default notifications;
