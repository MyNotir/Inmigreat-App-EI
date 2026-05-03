import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GlassCard } from '../common/GlassCard';
import { useViewTranslation } from '../../i18n';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';

interface ChatInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const SendIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = colors.text.inverse,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  disabled = false,
  placeholder,
}) => {
  const { t } = useViewTranslation('chat');
  const resolvedPlaceholder = placeholder ?? t('input.placeholder', { defaultValue: 'Escribe tu pregunta...' });
  const hasText = value.trim().length > 0;

  return (
    <View style={styles.inputContainer}>
      <GlassCard style={styles.inputCard} opacity={0.9} blurIntensity={20}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={colors.text.tertiary}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={onSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!hasText || disabled) && styles.sendButtonDisabled,
            ]}
            onPress={onSend}
            disabled={!hasText || disabled}
            activeOpacity={0.7}
          >
            <SendIcon
              size={20}
              color={hasText && !disabled ? colors.text.inverse : colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
  inputCard: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.tertiary,
  },
});

export default ChatInput;