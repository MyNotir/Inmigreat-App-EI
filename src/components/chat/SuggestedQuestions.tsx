/**
 * SuggestedQuestions — Emotional Intelligence redesign.
 *
 * Warm chips on cream/sand bg with clay border. Used in the empty Lexi
 * state to give users a calm starting point — three tier emoji + concise
 * label. Stagger-fade in so it feels like a hand reaching out, not a wall
 * of options.
 */

import React from "react"
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"
import Animated from "react-native-reanimated"

import { borderRadius, colors, spacing, typography } from "../../styles/theme"
import { useStaggeredFadeUp } from "../../styles/animations"

export interface SuggestedQuestion {
  id: string
  text: string
  icon?: string
}

export interface SuggestedQuestionsProps {
  questions: SuggestedQuestion[]
  onQuestionPress: (question: SuggestedQuestion) => void
  title?: string
  style?: ViewStyle
}

interface QuestionChipProps {
  question: SuggestedQuestion
  onPress: () => void
  index: number
}

const QuestionChip: React.FC<QuestionChipProps> = ({ question, onPress, index }) => {
  const { animatedStyle } = useStaggeredFadeUp(index, { baseDelay: 90, distance: 12 })

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={question.text}
        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      >
        {question.icon ? <Text style={styles.chipIcon}>{question.icon}</Text> : null}
        <Text style={styles.chipText} numberOfLines={2}>
          {question.text}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  questions,
  onQuestionPress,
  title,
  style,
}) => {
  if (!questions || questions.length === 0) return null

  return (
    <View style={[styles.container, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.chipsContainer}>
        {questions.map((question, index) => (
          <QuestionChip
            key={question.id}
            question={question}
            onPress={() => onQuestionPress(question)}
            index={index}
          />
        ))}
      </View>
    </View>
  )
}

export const DEFAULT_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { id: "processing-time", text: "¿Cuánto tarda mi caso?", icon: "⏱️" },
  { id: "documents", text: "¿Qué documentos necesito?", icon: "📄" },
  { id: "status", text: "¿Cómo verifico mi estado?", icon: "🔍" },
  { id: "accelerate", text: "¿Hay forma de acelerarlo?", icon: "🚀" },
  { id: "interview", text: "¿Cómo me preparo para la entrevista?", icon: "💬" },
  { id: "rfe", text: "Recibí un RFE — ¿qué hago?", icon: "📬" },
]

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    marginBottom: spacing.md,
    textAlign: "center",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warm.cream,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border.warm,
    maxWidth: 280,
    shadowColor: colors.warm.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  chipPressed: {
    backgroundColor: colors.warm.sand,
    borderColor: colors.warm.clay,
  },
  chipIcon: {
    fontSize: typography.fontSize.base,
    marginRight: spacing.sm,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.ink,
    fontFamily: typography.fontFamily.semibold,
    flexShrink: 1,
  },
})

export default SuggestedQuestions
