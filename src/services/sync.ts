/**
 * Sync Service - Offline action queuing and data synchronization
 * 
 * Handles queuing of pending actions when offline and syncing/refreshing
 * data when the device reconnects to the network.
 * 
 * Validates: Requirements 17.6
 */

import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from './storage';
import { apiClient, ApiException } from './api';
import { mutation } from './graphql';
import { updateNotificationPreferences, updateProfile } from './auth';
import type { ChatAppContext } from './chat';
import type { Case } from '../types/case';

// ============================================================================
// Types
// ============================================================================

/**
 * Types of actions that can be queued for sync
 */
export type PendingActionType = 
  | 'create_post'
  | 'like_post'
  | 'create_comment'
  | 'update_profile'
  | 'toggle_notification'
  | 'join_group'
  | 'send_message';

/**
 * A pending action that needs to be synced when online
 */
export interface PendingAction {
  /** Unique identifier for the action */
  id: string;
  /** Type of action to perform */
  type: PendingActionType;
  /** Action payload data */
  payload: Record<string, unknown>;
  /** Timestamp when the action was created */
  createdAt: string;
  /** Number of retry attempts */
  retryCount: number;
  /** Maximum number of retries before giving up */
  maxRetries: number;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Whether the sync was successful */
  success: boolean;
  /** Number of actions successfully synced */
  syncedCount: number;
  /** Number of actions that failed */
  failedCount: number;
  /** Error message if sync failed */
  error?: string;
}

/**
 * Callback for sync events
 */
export type SyncEventCallback = (event: SyncEvent) => void;

/**
 * Sync event types
 */
export type SyncEvent = 
  | { type: 'sync_started' }
  | { type: 'sync_completed'; result: SyncResult }
  | { type: 'sync_failed'; error: string }
  | { type: 'action_synced'; action: PendingAction }
  | { type: 'action_failed'; action: PendingAction; error: string }
  | { type: 'connection_changed'; isConnected: boolean }
  | { type: 'data_refreshed' };

// ============================================================================
// Constants
// ============================================================================

/**
 * Storage key for pending actions queue
 */
const PENDING_ACTIONS_KEY = '@inmigreat/pending_actions';

/**
 * Default maximum retries for failed actions
 */
const DEFAULT_MAX_RETRIES = 3;

/**
 * Delay between sync attempts in milliseconds
 */
const SYNC_DELAY_MS = 1000;

const SYNC_CREATE_COMMUNITY_POST_MUTATION = /* GraphQL */ `
  mutation SyncCreateCommunityPost($input: CreatePostInput!) {
    createCommunityPost(input: $input) {
      id
    }
  }
`;

const SYNC_CREATE_COMMUNITY_COMMENT_MUTATION = /* GraphQL */ `
  mutation SyncCreateCommunityComment($input: CreateCommentInput!) {
    createCommunityComment(input: $input) {
      id
    }
  }
`;

const SYNC_TOGGLE_COMMUNITY_LIKE_MUTATION = /* GraphQL */ `
  mutation SyncToggleCommunityLike($input: ToggleLikeInput!) {
    toggleCommunityLike(input: $input)
  }
`;

const SYNC_JOIN_COMMUNITY_GROUP_MUTATION = /* GraphQL */ `
  mutation SyncJoinCommunityGroup($groupId: ID!) {
    joinCommunityGroup(groupId: $groupId)
  }
`;

function toGraphQLPostType(value: unknown): string {
  if (value === 'Video') return 'VIDEO';
  if (value === 'Document') return 'DOCUMENT';
  if (value === 'Alert') return 'ALERT';
  return 'POST';
}

// ============================================================================
// State
// ============================================================================

/** Current network connection state */
let isConnected = true;

/** Network state subscription */
let netInfoSubscription: NetInfoSubscription | null = null;

/** Sync event listeners */
const eventListeners: Set<SyncEventCallback> = new Set();

/** Flag to prevent concurrent syncs */
let isSyncing = false;

/** Data refresh callbacks */
const refreshCallbacks: Set<() => Promise<void>> = new Set();

// ============================================================================
// Event Management
// ============================================================================

/**
 * Subscribe to sync events
 * @param callback - Function to call when sync events occur
 * @returns Unsubscribe function
 */
export function addSyncEventListener(callback: SyncEventCallback): () => void {
  eventListeners.add(callback);
  return () => {
    eventListeners.delete(callback);
  };
}

/**
 * Emit a sync event to all listeners
 * @param event - The event to emit
 */
function emitEvent(event: SyncEvent): void {
  eventListeners.forEach(callback => {
    try {
      callback(event);
    } catch (error) {
      console.error('[Sync] Error in event listener:', error);
    }
  });
}

// ============================================================================
// Pending Actions Queue
// ============================================================================

/**
 * Generate a unique ID for pending actions
 */
function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get all pending actions from storage
 * @returns Array of pending actions
 */
export async function getPendingActions(): Promise<PendingAction[]> {
  try {
    const json = await AsyncStorage.getItem(PENDING_ACTIONS_KEY);
    if (!json) {
      return [];
    }
    return JSON.parse(json) as PendingAction[];
  } catch (error) {
    console.error('[Sync] Error getting pending actions:', error);
    return [];
  }
}

/**
 * Save pending actions to storage
 * @param actions - Array of pending actions to save
 */
async function savePendingActions(actions: PendingAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
  } catch (error) {
    console.error('[Sync] Error saving pending actions:', error);
    throw error;
  }
}

/**
 * Queue a pending action for sync when online
 * @param type - Type of action
 * @param payload - Action payload data
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns The created pending action
 */
export async function queuePendingAction(
  type: PendingActionType,
  payload: Record<string, unknown>,
  maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<PendingAction> {
  const action: PendingAction = {
    id: generateActionId(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries,
  };

  const actions = await getPendingActions();
  actions.push(action);
  await savePendingActions(actions);

  // If we're online, trigger sync immediately
  if (isConnected && !isSyncing) {
    // Use setTimeout to avoid blocking the caller
    setTimeout(() => syncPendingActions(), 0);
  }

  return action;
}

/**
 * Remove a pending action from the queue
 * @param actionId - ID of the action to remove
 */
export async function removePendingAction(actionId: string): Promise<void> {
  const actions = await getPendingActions();
  const filtered = actions.filter(a => a.id !== actionId);
  await savePendingActions(filtered);
}

/**
 * Clear all pending actions
 */
export async function clearPendingActions(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_ACTIONS_KEY);
}

/**
 * Get the count of pending actions
 * @returns Number of pending actions
 */
export async function getPendingActionCount(): Promise<number> {
  const actions = await getPendingActions();
  return actions.length;
}

// ============================================================================
// Action Execution
// ============================================================================

/** Callback for notifying user of failed actions */
let onActionFailed: ((action: PendingAction, error: string) => void) | null = null;

/**
 * Set callback for action failure notifications
 * @param callback - Function to call when an action fails after max retries
 */
export function setOnActionFailed(callback: (action: PendingAction, error: string) => void): void {
  onActionFailed = callback;
}

/**
 * Execute a single pending action via real API calls
 * @param action - The action to execute
 * @returns Whether the action was successful
 */
async function executeAction(action: PendingAction): Promise<boolean> {
  try {
    switch (action.type) {
      case 'create_post': {
        const { groupId, type, attachments } = action.payload as {
          groupId: string;
          type?: string;
          attachments?: string[];
        };
        const text =
          typeof action.payload.text === 'string'
            ? action.payload.text
            : typeof action.payload.content === 'string'
              ? action.payload.content
              : '';

        await mutation(SYNC_CREATE_COMMUNITY_POST_MUTATION, {
          operationName: 'SyncCreateCommunityPost',
          variables: {
            input: {
              groupId,
              type: toGraphQLPostType(type),
              text,
              attachments: attachments ?? [],
            },
          },
        });
        console.log('[Sync] Successfully created post');
        break;
      }
      
      case 'like_post': {
        const { postId } = action.payload as { postId: string };
        await mutation(SYNC_TOGGLE_COMMUNITY_LIKE_MUTATION, {
          operationName: 'SyncToggleCommunityLike',
          variables: {
            input: { postId },
          },
        });
        console.log('[Sync] Successfully liked post:', postId);
        break;
      }
      
      case 'create_comment': {
        const { postId, parentCommentId } = action.payload as {
          postId: string;
          parentCommentId?: string;
        };
        const text =
          typeof action.payload.text === 'string'
            ? action.payload.text
            : typeof action.payload.content === 'string'
              ? action.payload.content
              : '';

        await mutation(SYNC_CREATE_COMMUNITY_COMMENT_MUTATION, {
          operationName: 'SyncCreateCommunityComment',
          variables: {
            input: {
              postId,
              text,
              parentCommentId,
            },
          },
        });
        console.log('[Sync] Successfully created comment');
        break;
      }
      
      case 'update_profile': {
        const profileData = action.payload;
        await updateProfile(profileData);
        console.log('[Sync] Successfully updated profile');
        break;
      }
      
      case 'toggle_notification': {
        const notificationSettings = action.payload;
        await updateNotificationPreferences(notificationSettings);
        console.log('[Sync] Successfully updated notification settings');
        break;
      }
      
      case 'join_group': {
        const { groupId } = action.payload as { groupId: string };
        await mutation(SYNC_JOIN_COMMUNITY_GROUP_MUTATION, {
          operationName: 'SyncJoinCommunityGroup',
          variables: { groupId },
        });
        console.log('[Sync] Successfully joined group:', groupId);
        break;
      }
      
      case 'send_message': {
        const {
          message,
          conversationId,
          userUscisCaseId,
          userEoirCaseId,
          appContext,
        } = action.payload as {
          message: string;
          conversationId?: string;
          userUscisCaseId?: string;
          userEoirCaseId?: string;
          appContext?: ChatAppContext;
        };

        if (!conversationId) {
          throw new Error('Queued chat messages require a conversationId');
        }

        await apiClient.post('/chat', {
          message,
          conversationId,
          userUscisCaseId,
          userEoirCaseId,
          appContext,
        });
        console.log('[Sync] Successfully sent message');
        break;
      }
      
      default:
        console.warn('[Sync] Unknown action type:', action.type);
        return false;
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof ApiException 
      ? error.message 
      : error instanceof Error 
        ? error.message 
        : 'Unknown error';
    
    console.error(`[Sync] Failed to execute ${action.type}:`, errorMessage);
    throw error;
  }
}

/**
 * Retry a specific failed action manually
 * @param actionId - ID of the action to retry
 * @returns Whether the retry was successful
 */
export async function retryFailedAction(actionId: string): Promise<boolean> {
  const actions = await getPendingActions();
  const action = actions.find(a => a.id === actionId);
  
  if (!action) {
    console.warn('[Sync] Action not found for retry:', actionId);
    return false;
  }
  
  if (!isConnected) {
    console.log('[Sync] Cannot retry while offline');
    return false;
  }
  
  try {
    const success = await executeAction(action);
    if (success) {
      await removePendingAction(actionId);
      emitEvent({ type: 'action_synced', action });
      return true;
    }
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    emitEvent({ type: 'action_failed', action, error: errorMessage });
    return false;
  }
}

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Sync all pending actions with the server
 * @returns Sync result with success/failure counts
 */
export async function syncPendingActions(): Promise<SyncResult> {
  if (isSyncing) {
    return { success: false, syncedCount: 0, failedCount: 0, error: 'Sync already in progress' };
  }

  if (!isConnected) {
    return { success: false, syncedCount: 0, failedCount: 0, error: 'Device is offline' };
  }

  isSyncing = true;
  emitEvent({ type: 'sync_started' });

  let syncedCount = 0;
  let failedCount = 0;

  try {
    const actions = await getPendingActions();
    const remainingActions: PendingAction[] = [];

    for (const action of actions) {
      try {
        const success = await executeAction(action);
        
        if (success) {
          syncedCount++;
          emitEvent({ type: 'action_synced', action });
        } else {
          throw new Error('Action execution returned false');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Increment retry count
        action.retryCount++;
        
        if (action.retryCount < action.maxRetries) {
          // Keep action for retry
          remainingActions.push(action);
          emitEvent({ type: 'action_failed', action, error: errorMessage });
        } else {
          // Max retries reached, discard action and notify user
          failedCount++;
          emitEvent({ type: 'action_failed', action, error: `Max retries reached: ${errorMessage}` });
          console.error('[Sync] Action failed after max retries:', action);
          
          // Notify user of permanent failure
          if (onActionFailed) {
            onActionFailed(action, `La acción no pudo completarse después de ${action.maxRetries} intentos: ${errorMessage}`);
          }
        }
      }

      // Small delay between actions to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, SYNC_DELAY_MS));
    }

    // Save remaining actions (those that need retry)
    await savePendingActions(remainingActions);

    const result: SyncResult = {
      success: failedCount === 0,
      syncedCount,
      failedCount,
    };

    emitEvent({ type: 'sync_completed', result });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    emitEvent({ type: 'sync_failed', error: errorMessage });
    return { success: false, syncedCount, failedCount, error: errorMessage };
  } finally {
    isSyncing = false;
  }
}

// ============================================================================
// Data Refresh
// ============================================================================

/**
 * Register a callback to be called when data should be refreshed
 * @param callback - Async function to refresh data
 * @returns Unsubscribe function
 */
export function registerRefreshCallback(callback: () => Promise<void>): () => void {
  refreshCallbacks.add(callback);
  return () => {
    refreshCallbacks.delete(callback);
  };
}

/**
 * Refresh all registered data sources
 */
export async function refreshData(): Promise<void> {
  if (!isConnected) {
    console.log('[Sync] Cannot refresh data while offline');
    return;
  }

  console.log('[Sync] Refreshing data...');
  
  const refreshPromises = Array.from(refreshCallbacks).map(async callback => {
    try {
      await callback();
    } catch (error) {
      console.error('[Sync] Error in refresh callback:', error);
    }
  });

  await Promise.all(refreshPromises);
  emitEvent({ type: 'data_refreshed' });
}

/**
 * Refresh cases data and update cache
 * This is a placeholder - in a real implementation, this would fetch from API
 * @returns Updated cases array
 */
export async function refreshCases(): Promise<Case[]> {
  if (!isConnected) {
    // Return cached data when offline
    const cached = await storage.getCachedCases();
    return cached || [];
  }

  try {
    // In a real implementation, this would fetch from the API:
    // const cases = await api.getCases();
    // await storage.cacheCases(cases);
    // return cases;
    
    console.log('[Sync] Refreshing cases from server...');
    
    // For now, return cached data
    const cached = await storage.getCachedCases();
    return cached || [];
  } catch (error) {
    console.error('[Sync] Error refreshing cases:', error);
    // Fall back to cached data on error
    const cached = await storage.getCachedCases();
    return cached || [];
  }
}

// ============================================================================
// Network State Management
// ============================================================================

/**
 * Handle network state changes
 * @param state - New network state
 */
async function handleNetworkChange(state: NetInfoState): Promise<void> {
  const wasConnected = isConnected;
  isConnected = state.isConnected ?? false;

  emitEvent({ type: 'connection_changed', isConnected });

  // If we just reconnected, sync pending actions and refresh data
  if (!wasConnected && isConnected) {
    console.log('[Sync] Connection restored, syncing...');
    
    // Sync pending actions first
    await syncPendingActions();
    
    // Then refresh data
    await refreshData();
  }
}

/**
 * Get current connection status
 * @returns Whether the device is connected
 */
export function getIsConnected(): boolean {
  return isConnected;
}

/**
 * Check if a sync is currently in progress
 * @returns Whether sync is in progress
 */
export function getIsSyncing(): boolean {
  return isSyncing;
}

// ============================================================================
// Service Initialization
// ============================================================================

/**
 * Initialize the sync service
 * Sets up network state monitoring and checks initial state
 */
export async function initializeSyncService(): Promise<void> {
  // Get initial network state
  const state = await NetInfo.fetch();
  isConnected = state.isConnected ?? true;

  // Subscribe to network state changes
  netInfoSubscription = NetInfo.addEventListener(handleNetworkChange);

  console.log('[Sync] Service initialized, connected:', isConnected);

  // If we're online and have pending actions, sync them
  if (isConnected) {
    const pendingCount = await getPendingActionCount();
    if (pendingCount > 0) {
      console.log(`[Sync] Found ${pendingCount} pending actions, syncing...`);
      await syncPendingActions();
    }
  }
}

/**
 * Cleanup the sync service
 * Removes network state subscription
 */
export function cleanupSyncService(): void {
  if (netInfoSubscription) {
    netInfoSubscription();
    netInfoSubscription = null;
  }
  eventListeners.clear();
  refreshCallbacks.clear();
  console.log('[Sync] Service cleaned up');
}

// ============================================================================
// Default Export
// ============================================================================

export const sync = {
  // Initialization
  initialize: initializeSyncService,
  cleanup: cleanupSyncService,
  
  // Pending actions
  queueAction: queuePendingAction,
  getPendingActions,
  removePendingAction,
  clearPendingActions,
  getPendingActionCount,
  retryFailedAction,
  
  // Sync operations
  syncPendingActions,
  refreshData,
  refreshCases,
  
  // State
  getIsConnected,
  getIsSyncing,
  
  // Events
  addEventListener: addSyncEventListener,
  registerRefreshCallback,
  setOnActionFailed,
};

export default sync;
