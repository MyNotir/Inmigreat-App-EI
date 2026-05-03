/**
 * MessageBubble Component
 * 
 * Displays chat messages with proper alignment based on role:
 * - User messages: right-aligned
 * - Assistant messages: left-aligned with InMiGreat avatar
 * 
 * Also displays case context cards when relevant to the conversation.
 * 
 * Validates: Requirements 13.3, 13.4, 13.8
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassCard } from '../common/GlassCard';
import { InmigreatLogo } from '../../icons';
import type { ChatMessage, ChatSuggestedAction } from '../../types/user';
import type { Case } from '../../types/case';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { useFadeUp } from '../../styles/animations';

/**
 * Props interface for MessageBubble component
 */
export interface MessageBubbleProps {
  /** The chat message to display */
  message: ChatMessage;
  /** Callback when case context card is tapped */
  onCasePress?: (caseData: Case) => void;
  /** Callback when a suggested action CTA is pressed */
  onSuggestedActionPress?: (action: ChatSuggestedAction) => void;
  /** Optional localized label for the case CTA */
  viewDetailsLabel?: string;
  /** Optional localized timestamp formatter */
  formatTimestamp?: (timestamp: string) => string;
  /** Additional styles for the container */
  style?: ViewStyle;
}

/**
 * Props interface for CaseContextCard component
 */
interface CaseContextCardProps {
  /** The case data to display */
  caseData: Case;
  /** Callback when the card is pressed */
  onPress?: () => void;
  /** Localized label for the case CTA */
  viewDetailsLabel?: string;
}

/**
 * CaseContextCard - Compact case card for chat context
 * 
 * Displays a simplified case card within the chat interface.
 * Validates: Requirement 13.8
 */
const CaseContextCard: React.FC<CaseContextCardProps> = ({
  caseData,
  onPress,
  viewDetailsLabel,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.caseContextCard}>
        <View style={styles.caseContextHeader}>
          <View
            style={[
              styles.caseContextDot,
              { backgroundColor: caseData.accentColor || colors.accent },
            ]}
          />
          <Text style={styles.caseContextType}>{caseData.type}</Text>
          <Text style={styles.caseContextForm}>{caseData.formNumber}</Text>
        </View>
        <View style={styles.caseContextDetails}>
          <Text style={styles.caseContextLabel}>
            {caseData.serviceCenter} • {caseData.receiptNumber}
          </Text>
        </View>
        <View style={styles.caseContextProgress}>
          <View style={styles.caseContextProgressBar}>
            <View
              style={[
                styles.caseContextProgressFill,
                {
                  width: `${caseData.completionPercentage}%`,
                  backgroundColor: caseData.accentColor || colors.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.caseContextPercentage}>
            {caseData.completionPercentage}%
          </Text>
        </View>
        <View style={styles.caseContextFooter}>
          <View
            style={[
              styles.caseContextStatus,
              { backgroundColor: caseData.status.backgroundColor },
            ]}
          >
            <Text
              style={[
                styles.caseContextStatusText,
                { color: caseData.status.color },
              ]}
            >
              {caseData.status.label}
            </Text>
          </View>
          <Text style={styles.caseContextTap}>{viewDetailsLabel ?? 'Ver detalles'} →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Avatar component for assistant messages
 */
const AssistantAvatar: React.FC = () => (
  <View style={styles.avatar}>
    <InmigreatLogo size={20} strokeWidth={2} />
  </View>
);

/**
 * MessageBubble Component
 * 
 * Renders a chat message bubble with proper alignment:
 * - User messages are right-aligned with accent color background
 * - Assistant messages are left-aligned with glass background and avatar
 * 
 * @example
 * ```tsx
 * <MessageBubble
 *   message={{
 *     id: '1',
 *     role: 'user',
 *     content: 'What is the status of my case?',
 *     timestamp: '2024-01-15T10:30:00Z',
 *   }}
 * />
 * 
 * <MessageBubble
 *   message={{
 *     id: '2',
 *     role: 'assistant',
 *     content: 'Here is your case information:',
 *     timestamp: '2024-01-15T10:30:05Z',
 *     caseContext: caseData,
 *   }}
 *   onCasePress={(caseData) => navigateToCaseDetail(caseData.id)}
 * />
 * ```
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCasePress,
  onSuggestedActionPress,
  viewDetailsLabel,
  formatTimestamp,
  style,
}) => {
  const { animatedStyle } = useFadeUp({ autoStart: true, distance: 10 });
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const handleCasePress = () => {
    if (message.caseContext && onCasePress) {
      onCasePress(message.caseContext);
    }
  };

  const handleSuggestedActionPress = () => {
    if (message.suggestedAction && onSuggestedActionPress) {
      onSuggestedActionPress(message.suggestedAction);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.containerUser : styles.containerAssistant,
        animatedStyle,
        style,
      ]}
    >
      {/* Assistant Avatar - Requirement 13.4 */}
      {isAssistant && <AssistantAvatar />}

      <View
        style={[
          styles.bubbleWrapper,
          isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAssistant,
        ]}
      >
        {/* Message Bubble */}
        {isUser ? (
          <View style={[styles.bubble, styles.bubbleUser]}>
            <Text style={styles.messageTextUser}>{message.content}</Text>
          </View>
        ) : (
          <GlassCard
            style={styles.bubbleAssistant}
            opacity={0.85}
            blurIntensity={20}
          >
            <Text style={styles.messageTextAssistant}>{message.content}</Text>
          </GlassCard>
        )}

        {/* Case Context Card - Requirement 13.8 */}
        {isAssistant && message.caseContext && (
          <CaseContextCard
            caseData={message.caseContext}
            onPress={handleCasePress}
            viewDetailsLabel={viewDetailsLabel}
          />
        )}

        {isAssistant && message.suggestedAction && onSuggestedActionPress ? (
          <TouchableOpacity
            style={styles.suggestedActionButton}
            onPress={handleSuggestedActionPress}
            activeOpacity={0.8}
          >
            <Text style={styles.suggestedActionText}>{message.suggestedAction.label}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Timestamp */}
        <Text
          style={[
            styles.timestamp,
            isUser ? styles.timestampUser : styles.timestampAssistant,
          ]}
        >
          {formatTimestamp ? formatTimestamp(message.timestamp) : formatTimestampLabel(message.timestamp)}
        </Text>
      </View>
    </Animated.View>
  );
};

/**
 * Format timestamp for display
 */
function formatTimestampLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Ahora';
  } else if (diffMins < 60) {
    return `hace ${diffMins}m`;
  } else if (diffHours < 24) {
    return `hace ${diffHours}h`;
  } else if (diffDays < 7) {
    return `hace ${diffDays}d`;
  } else {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  }
}

const styles = StyleSheet.create({
  // Container styles
  container: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  containerUser: {
    justifyContent: 'flex-end', // Right-align - Requirement 13.3
  },
  containerAssistant: {
    justifyContent: 'flex-start', // Left-align - Requirement 13.4
  },

  // Avatar styles
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  // Bubble wrapper styles
  bubbleWrapper: {
    maxWidth: '75%',
  },
  bubbleWrapperUser: {
    alignItems: 'flex-end',
  },
  bubbleWrapperAssistant: {
    alignItems: 'flex-start',
  },

  // Bubble styles
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: borderRadius.small,
  },
  bubbleAssistant: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomLeftRadius: borderRadius.small,
  },

  // Message text styles
  messageTextUser: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    color: colors.text.inverse,
  },
  messageTextAssistant: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    color: colors.text.primary,
  },

  // Timestamp styles
  timestamp: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  timestampUser: {
    color: colors.text.tertiary,
    textAlign: 'right',
  },
  timestampAssistant: {
    color: colors.text.tertiary,
    textAlign: 'left',
  },

  // Case context card styles - Requirement 13.8
  caseContextCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.large,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  caseContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  caseContextDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  caseContextType: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  caseContextForm: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  caseContextDetails: {
    marginBottom: spacing.xs,
  },
  caseContextLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  caseContextProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  caseContextProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  caseContextProgressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  caseContextPercentage: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    minWidth: 32,
    textAlign: 'right',
  },
  caseContextFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caseContextStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  caseContextStatusText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
  },
  caseContextTap: {
    fontSize: typography.fontSize.xs,
    color: colors.text.link,
  },
  suggestedActionButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.background.primary,
    alignSelf: 'flex-start',
  },
  suggestedActionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.accent,
  },
});

export default MessageBubble;
