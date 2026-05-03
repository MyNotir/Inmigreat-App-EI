/**
 * User Types - User, authentication, and notification type definitions
 * Validates: Requirements 11.1, 11.7
 */

export type Language = 'ES' | 'EN' | 'PT';

export interface User {
  id: string;
  name: string;
  email: string;
  language: Language;
  isPro: boolean;
  subscriptionExpiry?: string;
  biometricEnabled: boolean;
  notificationSettings: NotificationSettings;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

// Notifications
export type NotificationType = 'case_update' | 'community' | 'pro_alert' | 'news';

export interface PushNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface NotificationSettings {
  caseUpdates: boolean;
  community: boolean;
  proAlerts: boolean;
  news: boolean;
}

// Chat
export type ChatSuggestedActionKind = 'navigate';

export type ChatSuggestedActionTargetTab = 'Cases' | 'Community' | 'Resources';

export type ChatSuggestedActionCaseSource = 'uscis' | 'eoir';

export interface ChatSuggestedAction {
  kind: ChatSuggestedActionKind;
  label: string;
  targetTab: ChatSuggestedActionTargetTab;
  targetCaseId?: string;
  targetCaseSource?: ChatSuggestedActionCaseSource;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  conversationId?: string;
  caseContext?: import('./case').Case;
  suggestedAction?: ChatSuggestedAction;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
}
