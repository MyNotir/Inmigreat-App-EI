/**
 * ForgotPasswordScreen — Emotional Intelligence redesign.
 *
 * Warm screen for password reset. Acknowledges the small frustration ('Le
 * pasa a todos') before asking for the email. Cognito reset request logic
 * preserved.
 */

import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native"
import Animated from "react-native-reanimated"
import type { StackScreenProps } from "@react-navigation/stack"
import Svg, { Path, Rect } from "react-native-svg"

import { WarmScreen } from "../../components/common/WarmScreen"
import { WarmCard } from "../../components/common/WarmCard"
import { WarmInput } from "../../components/common/WarmInput"
import { WarmButton } from "../../components/common/WarmButton"
import { useAuth } from "../../context/AuthContext"
import { useAppAlert } from "../../context/AppAlertContext"
import { ApiException } from "../../services/api"
import { useFadeUp } from "../../styles/animations"
import { colors, spacing, typography } from "../../styles/theme"
import type { OnboardingStackParamList } from "../../types/navigation"
import { useViewTranslation } from "../../i18n"

type ForgotPasswordScreenProps = StackScreenProps<OnboardingStackParamList, "ForgotPassword">

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MailIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = colors.warm.clay }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="4" width="20" height="16" rx="2" />
    <Path d="M22 6l-10 7L2 6" />
  </Svg>
)

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation, route }) => {
  const { t } = useViewTranslation("onboarding")
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) })

  const [email, setEmail] = useState(route.params?.email ?? "")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { requestPasswordReset } = useAuth()
  const { showError } = useAppAlert()

  const { animatedStyle: headerStyle, fadeIn: headerFadeIn } = useFadeUp({ duration: 420, delay: 100, distance: 18 })
  const { animatedStyle: formStyle, fadeIn: formFadeIn } = useFadeUp({ duration: 460, delay: 220, distance: 16 })

  useEffect(() => {
    headerFadeIn()
    formFadeIn()
  }, [formFadeIn, headerFadeIn])

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(tx("forgotPassword.validation.emailRequired", "El correo electrónico es requerido."))
      return false
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      setEmailError(tx("forgotPassword.validation.emailInvalid", "Ingresa un correo electrónico válido."))
      return false
    }
    setEmailError(null)
    return true
  }

  const handleSubmit = async () => {
    Keyboard.dismiss()
    const normalizedEmail = email.trim().toLowerCase()
    if (!validateEmail(normalizedEmail)) return

    setIsLoading(true)

    try {
      await requestPasswordReset(normalizedEmail)
      navigation.navigate("ResetPassword", { email: normalizedEmail })
    } catch (error) {
      if (error instanceof ApiException && error.type === "network_error") {
        setEmailError(tx("forgotPassword.validation.offline", "Sin conexión. Verifica tu internet e intenta de nuevo."))
        showError(error, { title: tx("forgotPassword.networkTitle", "Sin conexión") })
      } else {
        navigation.navigate("ResetPassword", { email: normalizedEmail })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <WarmScreen scroll edges={["top", "right", "left"]}>
      <KeyboardAvoidingView style={styles.kb} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <Pressable
              style={styles.back}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={12}
            >
              <Text style={styles.backChevron}>←</Text>
            </Pressable>

            <Animated.View style={headerStyle}>
              <Text style={styles.eyebrow}>
                {tx("forgotPassword.eyebrow", "TU PASSWORD")}
              </Text>
              <Text style={styles.title}>
                {tx("forgotPassword.title", "Te lo recuperamos en un minuto.")}
              </Text>
              <Text style={styles.subtitle}>
                {tx(
                  "forgotPassword.subtitle",
                  "Le pasa a todos. Mándanos tu correo y te enviamos un código para elegir una nueva.",
                )}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.cardWrap, formStyle]}>
              <WarmCard intensity="elevated">
                <WarmInput
                  label={tx("forgotPassword.emailLabel", "Tu correo")}
                  placeholder="tu@email.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text)
                    if (emailError) validateEmail(text)
                  }}
                  onBlur={() => validateEmail(email)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  error={emailError ?? undefined}
                  leadingIcon={<MailIcon color={emailError ? colors.status.urgentWarm : colors.warm.clay} />}
                  helper={
                    emailError
                      ? undefined
                      : tx(
                          "forgotPassword.helper",
                          "Si la cuenta existe, recibirás un código en menos de 1 minuto.",
                        )
                  }
                />

                <View style={styles.btnWrap}>
                  <WarmButton
                    label={tx("forgotPassword.sendCode", "Enviar código")}
                    onPress={handleSubmit}
                    variant="primary"
                    fullWidth
                    disabled={!email.trim() || isLoading}
                    trailingIcon={
                      isLoading ? <ActivityIndicator color={colors.warm.cream} size="small" /> : undefined
                    }
                  />
                </View>
              </WarmCard>
            </Animated.View>

            <Pressable
              style={styles.support}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
            >
              <Text style={styles.supportText}>
                {tx("forgotPassword.rememberedIt", "¿Ya te acordaste?")}{" "}
                <Text style={styles.supportLink}>
                  {tx("forgotPassword.backToLogin", "Volver al login")}
                </Text>
              </Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </WarmScreen>
  )
}

const styles = StyleSheet.create({
  kb: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing["2xl"],
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  backChevron: {
    fontSize: typography.fontSize.lg,
    color: colors.warm.clay,
    fontFamily: typography.fontFamily.bold,
    marginTop: -2,
  },
  eyebrow: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.warm.clay,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: -0.4,
    lineHeight: typography.fontSize["2xl"] * 1.2,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.md * 1.45,
    marginTop: spacing.md,
  },
  cardWrap: {
    marginTop: spacing.xl,
  },
  btnWrap: {
    marginTop: spacing.lg,
  },
  support: {
    alignItems: "center",
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  supportText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
  },
  supportLink: {
    color: colors.warm.clay,
    fontFamily: typography.fontFamily.extrabold,
  },
})

export default ForgotPasswordScreen
