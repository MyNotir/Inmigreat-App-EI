/**
 * MessageBubble — Emotional Intelligence redesign.
 *
 * Same API as before (ChatMessage + onCasePress + onSuggestedActionPress).
 * Visual layer is now warm and tone-aware:
 *   - User bubble: clay fill normally, warmer (peach + ink) when stress
 *     keywords detected ('miedo', 'detuvieron', 'deport', 'ICE', etc.)
 *   - Assistant bubble: cream WarmCard surface with paper grain feel
 *   - CaseContextCard: warm sand surface with clay accent + sage progress
 *   - Suggested action: clay outline button
 */

import React, { useMemo } from "react"
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"
import Animated from "react-native-reanimated"

import { InmigreatLogo } from "../../icons"
import type { ChatMessage, ChatSuggestedAction } from "../../types/user"
import type { Case } from "../../types/case"
import { borderRadius, colors, spacing, typography } from "../../styles/theme"
import { useFadeUp } from "../../styles/animations"

const ELEVATED_KEYWORDS = [
  "miedo", "asusta", "preocupa", "ansie", "nervios",
  "scared", "afraid", "worried", "anxious",
  "perdid", "tarda", "demora",
]

const ACUTE_KEYWORDS = [
  "ICE", "deport", "detuv", "detained", "arrest",
  "negar", "negada", "denied", "negación", "negación",
  "NTA", "audiencia mañana", "hoy", "tomorrow", "today",
]

function detectStressLevel(text?: string): "calm" | "elevated" | "acute" {
  if (!text) return "calm"
  const lower = text.toLowerCase()
  for (const k of ACUTE_KEYWORDS) {
    if (lower.includes(k.toLowerCase())) return "acute"
  }
  for (const k of ELEVATED_KEYWORDS) {
    if (lower.includes(k.toLowerCase())) return "elevated"
  }
  return "calm"
}

export interface MessageBubbleProps {
  message: ChatMessage
  onCasePress?: (caseData: Case) => void
  onSuggestedActionPress?: (action: ChatSuggestedAction) => void
  viewDetailsLabel?: string
  formatTimestamp?: (timestamp: string) => string
  style?: ViewStyle
}

interface CaseContextCardProps {
  caseData: Case
  onPress?: () => void
  viewDetailsLabel?: string
}

const CaseContextCard: React.FC<CaseContextCardProps> = ({ caseData, onPress, viewDetailsLabel }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.caseCard, pressed && styles.caseCardPressed]}
    >
      <View style={styles.caseHeader}>
        <View
          style={[styles.caseDot, { backgroundColor: caseData.accentColor || colors.accent }]}
        />
        <Text style={styles.caseType}>{caseData.type}</Text>
        <Text style={styles.caseForm}>{caseData.formNumber}</Text>
      </View>
      <Text style={styles.caseDetail}>
        {caseData.serviceCenter} · {caseData.receiptNumber}
      </Text>
      <View style={styles.caseProgressRow}>
        <View style={styles.caseProgressBar}>
          <View
            style={[
              styles.caseProgressFill,
              {
                width: `${caseData.completionPercentage}%`,
                backgroundColor: caseData.accentColor || colors.success,
              },
            ]}
          />
        </View>
        <Text style={styles.casePercent}>{caseData.completionPercentage}%</Text>
      </View>
      <View style={styles.caseFooter}>
        <View style={[styles.caseStatus, { backgroundColor: caseData.status.backgroundColor }]}>
          <Text style={[styles.caseStatusText, { color: caseData.status.color }]}>
            {caseData.status.label}
          </Text>
        </View>
        <Text style={styles.caseTap}>{viewDetailsLabel ?? "Ver detalles"} →</Text>
      </View>
    </Pressable>
  )
}

const AssistantAvatar: React.FC = () => (
  <View style={styles.avatar}>
    <InmigreatLogo size={18} strokeWidth={2} />
  </View>
)

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCasePress,
  onSuggestedActionPress,
  viewDetailsLabel,
  formatTimestamp,
  style,
}) => {
  const { animatedStyle } = useFadeUp({ autoStart: true, distance: 8 })
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const stress = useMemo(() => detectStressLevel(isUser ? message.content : undefined), [isUser, message.content])

  const handleCasePress = () => {
    if (message.caseContext && onCasePress) onCasePress(message.caseContext)
  }

  const handleSuggestedActionPress = () => {
    if (message.suggestedAction && onSuggestedActionPress) onSuggestedActionPress(message.suggestedAction)
  }

  const userBubbleColor =
    stress === "acute"
      ? colors.warm.peach
      : stress === "elevated"
        ? colors.background.secondary
        : colors.accent
  const userTextColor = stress === "calm" ? colors.background.primary : colors.text.primary
  const userBorder = stress === "acute" ? colors.error : "transparent"

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.containerUser : styles.containerAssistant,
        animatedStyle,
        style,
      ]}
    >
      {isAssistant ? <AssistantAvatar /> : null}

      <View
        style={[
          styles.bubbleWrapper,
          isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAssistant,
        ]}
      >
        {isUser ? (
          <View
            style={[
              styles.bubble,
              styles.bubbleUser,
              {
                backgroundColor: userBubbleColor,
                borderColor: userBorder,
                borderWidth: stress === "acute" ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.messageTextUser, { color: userTextColor }]}>{message.content}</Text>
          </View>
        ) : (
          <View style={styles.bubbleAssistant}>
            <Text style={styles.messageTextAssistant}>{message.content}</Text>
          </View>
        )}

        {isAssistant && message.caseContext ? (
          <CaseContextCard
            caseData={message.caseContext}
            onPress={handleCasePress}
            viewDetailsLabel={viewDetailsLabel}
          />
        ) : null}

        {isAssistant && message.suggestedAction && onSuggestedActionPress ? (
          <Pressable
            onPress={handleSuggestedActionPress}
            style={({ pressed }) => [styles.suggestedAction, pressed && styles.suggestedActionPressed]}
          >
            <Text style={styles.suggestedActionText}>{message.suggestedAction.label} →</Text>
          </Pressable>
        ) : null}

        <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAssistant]}>
          {formatTimestamp ? formatTimestamp(message.timestamp) : formatTimestampLabel(message.timestamp)}
        </Text>
      </View>
    </Animated.View>
  )
}

function formatTimestampLabel(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Ahora"
  if (diffMins < 60) return `hace ${diffMins}m`
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays < 7) return `hace ${diffDays}d`
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  containerUser: { justifyContent: "flex-end" },
  containerAssistant: { justifyContent: "flex-start" },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },

  bubbleWrapper: { maxWidth: "78%" },
  bubbleWrapperUser: { alignItems: "flex-end" },
  bubbleWrapperAssistant: { alignItems: "flex-start" },

  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
  },
  bubbleUser: {
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    backgroundColor: colors.background.primary,
    borderColor: colors.border.light,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: 6,
  },

  messageTextUser: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    lineHeight: typography.fontSize.base * 1.4,
  },
  messageTextAssistant: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    lineHeight: typography.fontSize.base * 1.45,
    color: colors.text.primary,
  },

  timestamp: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    marginTop: spacing.xs,
    color: colors.text.tertiary,
  },
  timestampUser: { textAlign: "right" },
  timestampAssistant: { textAlign: "left" },

  caseCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.large,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  caseCardPressed: {
    backgroundColor: colors.warm.peach,
  },
  caseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  caseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs + 2,
  },
  caseType: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  caseForm: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
  },
  caseDetail: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  caseProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  caseProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.full,
    overflow: "hidden",
    marginRight: spacing.sm,
  },
  caseProgressFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  casePercent: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
    minWidth: 32,
    textAlign: "right",
  },
  caseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  caseStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  caseStatusText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
  },
  caseTap: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.accent,
    letterSpacing: 0.4,
  },

  suggestedAction: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.25,
    borderColor: colors.accent,
    backgroundColor: colors.background.primary,
    alignSelf: "flex-start",
  },
  suggestedActionPressed: {
    backgroundColor: colors.background.secondary,
  },
  suggestedActionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.accent,
    letterSpacing: 0.3,
  },
})

export default MessageBubble
