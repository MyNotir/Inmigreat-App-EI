/**
 * ChatInput — Emotional Intelligence redesign.
 *
 * Cream surface, soft clay border that warms on focus, clay send button
 * (peach when disabled). No glass blur — paper-feel keeps the moment calm
 * even when the user is mid-crisis writing 'me detuvieron'.
 */

import React, { useState } from "react"
import { Pressable, StyleSheet, TextInput, View } from "react-native"
import Svg, { Path } from "react-native-svg"

import { useViewTranslation } from "../../i18n"
import { borderRadius, colors, spacing, typography } from "../../styles/theme"

interface ChatInputProps {
  value: string
  onChangeText: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
}

const SendIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = colors.warm.cream }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  disabled = false,
  placeholder,
}) => {
  const { t } = useViewTranslation("chat")
  const [focused, setFocused] = useState(false)
  const resolvedPlaceholder = placeholder ?? t("input.placeholder", { defaultValue: "Escribe tu pregunta..." })
  const hasText = value.trim().length > 0
  const canSend = hasText && !disabled

  const borderColor = focused ? colors.warm.clay : colors.border.warm

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { borderColor, borderWidth: focused ? 1.5 : 1 }]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={resolvedPlaceholder}
          placeholderTextColor={colors.warm.inkFaint}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={onSend}
          blurOnSubmit={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <Pressable
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
        >
          <SendIcon size={18} color={canSend ? colors.warm.cream : colors.warm.inkFaint} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: "transparent",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.warm.cream,
    borderRadius: borderRadius["2xl"],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    shadowColor: colors.warm.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    maxHeight: 110,
    minHeight: 40,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.warm.clay,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
  },
  sendBtnDisabled: {
    backgroundColor: colors.warm.peach,
  },
})

export default ChatInput
