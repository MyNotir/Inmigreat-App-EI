/**
 * ConfirmRegistrationScreen — Emotional Intelligence redesign.
 *
 * Warm screen for entering the Cognito 6-digit verification code. Shows the
 * email pinned in a sand-tinted readonly chip, then accepts the code +
 * password. All Cognito confirm + resend logic preserved.
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
import { borderRadius, colors, spacing, typography } from "../../styles/theme"
import type { OnboardingStackParamList } from "../../types/navigation"
import { useViewTranslation } from "../../i18n"

type ConfirmRegistrationScreenProps = StackScreenProps<OnboardingStackParamList, "ConfirmRegistration">

const MailIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = colors.accent }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="4" width="20" height="16" rx="2" />
    <Path d="M22 6l-10 7L2 6" />
  </Svg>
)

const LockIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = colors.accent }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
)

export const ConfirmRegistrationScreen: React.FC<ConfirmRegistrationScreenProps> = ({ navigation, route }) => {
  const { email } = route.params
  const { t } = useViewTranslation("onboarding")
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) })

  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [codeError, setCodeError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const { confirmRegistration, resendRegistrationCode, userName, language } = useAuth()
  const { showAlert, showError } = useAppAlert()

  const { animatedStyle: headerStyle, fadeIn: headerFadeIn } = useFadeUp({ duration: 420, delay: 100, distance: 18 })
  const { animatedStyle: formStyle, fadeIn: formFadeIn } = useFadeUp({ duration: 460, delay: 220, distance: 16 })

  useEffect(() => {
    headerFadeIn()
    formFadeIn()
  }, [formFadeIn, headerFadeIn])

  const validateCode = (value: string): boolean => {
    if (!value.trim()) {
      setCodeError(tx("confirmRegistration.validation.codeRequired", "Ingresa el código que llegó por correo."))
      return false
    }
    if (value.trim().length < 6) {
      setCodeError(tx("confirmRegistration.validation.codeLength", "El código debe tener 6 caracteres."))
      return false
    }
    setCodeError(null)
    return true
  }

  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError(tx("confirmRegistration.validation.passwordRequired", "Ingresa la contraseña que registraste."))
      return false
    }
    setPasswordError(null)
    return true
  }

  const handleConfirm = async () => {
    Keyboard.dismiss()
    const isCodeValid = validateCode(code)
    const isPasswordValid = validatePassword(password)
    if (!isCodeValid || !isPasswordValid) return

    setIsLoading(true)
    setInfoMessage(null)

    try {
      await confirmRegistration({
        email,
        code: code.trim(),
        password,
        name: userName ?? undefined,
        language,
      })
      navigation.navigate("Biometric")
    } catch (error) {
      if (error instanceof ApiException) {
        if (error.details?.code?.[0]) {
          setCodeError(error.details.code[0])
        } else if (error.details?.password?.[0]) {
          setPasswordError(error.details.password[0])
        } else if (error.type === "network_error") {
          setInfoMessage(tx("confirmRegistration.validation.offline", "Sin conexión. Verifica tu internet e intenta de nuevo."))
          showError(error, { title: tx("confirmRegistration.alert.networkTitle", "Sin conexión") })
        } else {
          setPasswordError(error.message)
          showError(error, {
            title: tx("confirmRegistration.alert.confirmFailed", "No pudimos confirmar tu cuenta"),
            preferInlineValidation: true,
          })
        }
      } else {
        setInfoMessage(tx("confirmRegistration.validation.genericConfirmFailure", "No fue posible confirmar tu cuenta."))
        showError(error, {
          title: tx("confirmRegistration.alert.confirmFailed", "No pudimos confirmar tu cuenta"),
          fallbackMessage: tx(
            "confirmRegistration.validation.genericConfirmFailure",
            "No fue posible confirmar tu cuenta.",
          ),
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsResending(true)
    setInfoMessage(null)

    try {
      await resendRegistrationCode(email)
      setInfoMessage(tx("confirmRegistration.resentMessage", "Enviamos un nuevo código a {{email}}.", { email }))
      showAlert({
        title: tx("confirmRegistration.alert.resentTitle", "Código reenviado"),
        message: tx("confirmRegistration.resentMessage", "Enviamos un nuevo código a {{email}}.", { email }),
        tone: "success",
      })
    } catch (error) {
      if (error instanceof ApiException) {
        setInfoMessage(error.message)
        showError(error, { title: tx("confirmRegistration.alert.resendFailed", "No pudimos reenviar el código") })
      } else {
        setInfoMessage(tx("confirmRegistration.validation.genericResendFailure", "No fue posible reenviar el código."))
        showError(error, {
          title: tx("confirmRegistration.alert.resendFailed", "No pudimos reenviar el código"),
          fallbackMessage: tx(
            "confirmRegistration.validation.genericResendFailure",
            "No fue posible reenviar el código.",
          ),
        })
      }
    } finally {
      setIsResending(false)
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
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={12}
            >
              <Text style={styles.backChevron}>←</Text>
            </Pressable>

            <Animated.View style={headerStyle}>
              <Text style={styles.eyebrow}>
                {tx("confirmRegistration.eyebrow", "ÚLTIMO PASO")}
              </Text>
              <Text style={styles.title}>
                {tx("confirmRegistration.title", "Confirmemos que eres tú.")}
              </Text>
              <Text style={styles.subtitle}>
                {tx(
                  "confirmRegistration.subtitle",
                  "Mandamos un código de 6 caracteres a tu correo. Pégalo aquí y entras directo a la app.",
                )}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.cardWrap, formStyle]}>
              <WarmCard >
                {infoMessage ? (
                  <View style={styles.notice}>
                    <Text style={styles.noticeText}>{infoMessage}</Text>
                  </View>
                ) : null}

                <View style={styles.emailChip}>
                  <MailIcon size={14} />
                  <Text style={styles.emailChipText} numberOfLines={1}>
                    {email}
                  </Text>
                </View>

                <View style={styles.fieldGap}>
                  <WarmInput
                    label={tx("confirmRegistration.codeLabel", "Código de verificación")}
                    placeholder="123 456"
                    value={code}
                    onChangeText={(text) => {
                      setCode(text)
                      if (codeError) validateCode(text)
                    }}
                    onBlur={() => validateCode(code)}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!isLoading}
                    error={codeError ?? undefined}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.fieldGap}>
                  <WarmInput
                    label={tx("confirmRegistration.passwordLabel", "Tu contraseña")}
                    placeholder={tx("confirmRegistration.passwordPlaceholder", "La que registraste")}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text)
                      if (passwordError) validatePassword(text)
                    }}
                    onBlur={() => validatePassword(password)}
                    secureTextEntry
                    editable={!isLoading}
                    returnKeyType="done"
                    onSubmitEditing={handleConfirm}
                    error={passwordError ?? undefined}
                    leadingIcon={<LockIcon color={passwordError ? colors.error : colors.accent} />}
                  />
                </View>

                <View style={styles.btnWrap}>
                  <WarmButton
                    label={tx("confirmRegistration.confirmAndEnter", "Confirmar y entrar")}
                    onPress={handleConfirm}
                    variant="primary"
                    fullWidth
                    disabled={!code.trim() || !password || isLoading}
                    trailingIcon={
                      isLoading ? <ActivityIndicator color={colors.background.primary} size="small" /> : undefined
                    }
                  />
                </View>

                <Pressable onPress={handleResendCode} disabled={isResending || isLoading} style={styles.resendWrap}>
                  <Text style={styles.resendText}>
                    {isResending
                      ? tx("confirmRegistration.resendingCode", "Reenviando código...")
                      : tx("confirmRegistration.resendCode", "¿No te llegó? Reenviar")}
                  </Text>
                </Pressable>
              </WarmCard>
            </Animated.View>
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
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  backChevron: {
    fontSize: typography.fontSize.lg,
    color: colors.accent,
    fontFamily: typography.fontFamily.bold,
    marginTop: -2,
  },
  eyebrow: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.accent,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.4,
    lineHeight: typography.fontSize["2xl"] * 1.2,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.md * 1.45,
    marginTop: spacing.md,
  },
  cardWrap: {
    marginTop: spacing.xl,
  },
  notice: {
    backgroundColor: "rgba(184, 201, 185, 0.25)",
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: borderRadius.large,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  emailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    alignSelf: "flex-start",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  emailChipText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    maxWidth: 240,
  },
  fieldGap: {
    marginBottom: spacing.md,
  },
  btnWrap: {
    marginTop: spacing.sm,
  },
  resendWrap: {
    alignItems: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
  },
  resendText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.accent,
  },
})

export default ConfirmRegistrationScreen
