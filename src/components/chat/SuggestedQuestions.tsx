/**
 * SuggestedQuestions Component
 * 
 * Displays tappable question chips for the chat interface.
 * Used in the welcome state to help users start conversations
 * with common immigration-related questions.
 * 
 * Validates: Requirements 13.2
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

import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { usePressAnimation, useStaggeredFadeUp } from '../../styles/animations';

/**
 * Props interface for a single suggested question
 */
export interface SuggestedQuestion {
  /** Unique identifier for the question */
  id: string;
  /** The question text to display */
  text: string;
  /** Optional icon name or emoji */
  icon?: string;
}

/**
 * Props interface for SuggestedQuestions component
 */
export interface SuggestedQuestionsProps {
  /** Array of suggested questions to display */
  questions: SuggestedQuestion[];
  /** Callback when a question chip is tapped */
  onQuestionPress: (question: SuggestedQuestion) => void;
  /** Optional title to display above the questions */
  title?: string;
  /** Additional styles for the container */
  style?: ViewStyle;
}

/**
 * Props interface for QuestionChip component
 */
interface QuestionChipProps {
  /** The question to display */
  question: SuggestedQuestion;
  /** Callback when the chip is pressed */
  onPress: () => void;
  /** Index for staggered animation */
  index: number;
}

/**
 * QuestionChip - Individual tappable question chip
 * 
 * Displays a single question as a tappable chip with press animation.
 */
const QuestionChip: React.FC<QuestionChipProps> = ({
  question,
  onPress,
  index,
}) => {
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressAnimation();
  const { animatedStyle: fadeStyle } = useStaggeredFadeUp(index, {
    baseDelay: 80,
    distance: 15,
  });

  return (
    <Animated.View style={[fadeStyle, pressStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={styles.chipTouchable}
      >
        <View style={styles.chip}>
          {question.icon && (
            <Text style={styles.chipIcon}>{question.icon}</Text>
          )}
          <Text style={styles.chipText} numberOfLines={2}>
            {question.text}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * SuggestedQuestions Component
 * 
 * Renders a list of suggested questions as tappable chips.
 * Used in the chat welcome state to help users start conversations.
 * 
 * @example
 * ```tsx
 * const questions = [
 *   { id: '1', text: '¿Cuánto tiempo tarda el proceso I-485?', icon: '⏱️' },
 *   { id: '2', text: '¿Qué documentos necesito para mi caso?', icon: '📄' },
 *   { id: '3', text: '¿Cómo puedo acelerar mi caso?', icon: '🚀' },
 * ];
 * 
 * <SuggestedQuestions
 *   questions={questions}
 *   onQuestionPress={(q) => sendMessage(q.text)}
 *   title="Preguntas frecuentes"
 * />
 * ```
 */
export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  questions,
  onQuestionPress,
  title,
  style,
}) => {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
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
  );
};

/**
 * Default suggested questions for the chat interface
 */
export const DEFAULT_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    id: 'processing-time',
    text: '¿Cuánto tiempo tarda el proceso de mi caso?',
    icon: '⏱️',
  },
  {
    id: 'documents',
    text: '¿Qué documentos necesito preparar?',
    icon: '📄',
  },
  {
    id: 'status',
    text: '¿Cómo puedo verificar el estado de mi caso?',
    icon: '🔍',
  },
  {
    id: 'accelerate',
    text: '¿Hay formas de acelerar mi proceso?',
    icon: '🚀',
  },
  {
    id: 'interview',
    text: '¿Cómo me preparo para la entrevista?',
    icon: '💬',
  },
  {
    id: 'rfe',
    text: '¿Qué hago si recibo un RFE?',
    icon: '📬',
  },
];

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chipTouchable: {
    maxWidth: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    maxWidth: 280,
  },
  chipIcon: {
    fontSize: typography.fontSize.base,
    marginRight: spacing.sm,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.medium,
    flexShrink: 1,
  },
});

export default SuggestedQuestions;
