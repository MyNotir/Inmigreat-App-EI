/**
 * ResetPasswordScreen — Emotional Intelligence redesign.
 *
 * Warm screen to enter the reset code + a fresh password. Cognito confirm
 * password reset logic preserved.
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
import { ApiException } from "../../services/api"
import { useFadeUp } from "../../styles/animations"
import { borderRadius, colors, spacing, typography } from "../../styles/theme"
import type { OnboardingStackParamList } from "../../types/navigation"
import { useViewTranslation } from "../../i18n"

type ResetPasswordScreenProps = StackScreenProps<OnboardingStackParamList, "ResetPassword">

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

const LockIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = colors.warm.clay }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
)

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ navigation, route }) => {
  const { email } = route.params
  const { t } = useViewTranslation("onboarding")
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) })

  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [codeError, setCodeError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { confirmPasswordReset } = useAuth()

  const { animatedStyle: headerStyle, fadeIn: headerFadeIn } = useFadeUp({ duration: 420, delay: 100, distance: 18 })
  const { animatedStyle: formStyle, fadeIn: formFadeIn } = useFadeUp({ duration: 460, delay: 220, distance: 16 })

  useEffect(() => {
    headerFadeIn()
    formFadeIn()
  }, [formFadeIn, headerFadeIn])

  const validateCode = (value: string): boolean => {
    if (!value.trim()) {
      setCodeError(tx("resetPassword.validation.codeRequired", "Ingresa el código que recibiste por correo."))
      return false
    }
    if (value.trim().length < 6) {
      setCodeError(tx("resetPassword.validation.codeLength", "El código debe tener 6 caracteres."))
      return false
    }
    setCodeError(null)
    return true
  }

  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError(tx("resetPassword.validation.passwordRequired", "La nueva contraseña es requerida."))
      return false
    }
    if (!STRONG_PASSWORD_REGEX.test(value)) {
      setPasswordError(
        tx(
          "resetPassword.validation.strongPassword",
          "Mín. 8 caracteres, mayúscula, minúscula y número.",
        ),
      )
      return false
    }
    setPasswordError(null)
    return true
  }

  const validateConfirmPassword = (value: string): boolean => {
    if (!value) {
      setConfirmPasswordError(tx("resetPassword.validation.confirmRequired", "Confirma tu nueva contraseña."))
      return false
    }
    if (value !== password) {
      setConfirmPasswordError(tx("resetPassword.validation.confirmMismatch", "Las contraseñas no coinciden."))
      return false
    }
    setConfirmPasswordError(null)
    return true
  }

  const handleSubmit = async () => {
    Keyboard.dismiss()
    const isCodeValid = validateCode(code)
    const isPasswordValid = validatePassword(password)
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword)
    if (!isCodeValid || !isPasswordValid || !isConfirmPasswordValid) return

    setIsLoading(true)

    try {
      await confirmPasswordReset({ email, code: code.trim(), password })
      navigation.navigate("Login", {
        email,
        notice: tx("resetPassword.updatedNotice", "Tu contraseña fue actualizada. Inicia sesión nuevamente."),
      })
    } catch (error) {
      if (error instanceof ApiException) {
        if (error.details?.code?.[0]) {
          setCodeError(error.details.code[0])
        } else if (error.details?.password?.[0]) {
          setPasswordError(error.details.password[0])
        } else {
          setPasswordError(error.message)
        }
      } else {
        setPasswordError(tx("resetPassword.validation.genericFailure", "No fue posible actualizar la contraseña."))
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
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={12}
            >
              <Text style={styles.backChevron}>←</Text>
            </Pressable>

            <Animated.View style={headerStyle}>
              <Text style={styles.eyebrow}>
                {tx("resetPassword.eyebrow", "NUEVA PASSWORD")}
              </Text>
              <Text style={styles.title}>
                {tx("resetPassword.title", "Casi listo. Define la nueva.")}
              </Text>
              <Text style={styles.subtitle}>
                {tx(
                  "resetPassword.subtitle",
                  "Pon el código que te llegó a {{email}} y elige una contraseña que recuerdes.",
                  { email },
                )}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.cardWrap, formStyle]}>
              <WarmCard intensity="elevated">
                <View style={styles.fieldGap}>
                  <WarmInput
                    label={tx("resetPassword.codeLabel", "Código")}
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
                    label={tx("resetPassword.passwordLabel", "Nueva contraseña")}
                    placeholder={tx("resetPassword.passwordPlaceholder", "Mín. 8 caracteres")}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text)
                      if (passwordError) validatePassword(text)
                      if (confirmPasswordError) validateConfirmPassword(confirmPassword)
                    }}
                    onBlur={() => validatePassword(password)}
                    secureTextEntry
                    editable={!isLoading}
                    error={passwordError ?? undefined}
                    leadingIcon={<LockIcon color={passwordError ? colors.status.urgentWarm : colors.warm.clay} />}
                    helper={
                      passwordError
                        ? undefined
                        : tx("resetPassword.helper", "Mayúscula, minúscula, número.")
                    }
                  />
                </View>

                <View style={styles.fieldGap}>
                  <WarmInput
                    label={tx("resetPassword.confirmPasswordLabel", "Confirma tu nueva contraseña")}
                    placeholder={tx("resetPassword.confirmPasswordPlaceholder", "Una vez más")}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text)
                      if (confirmPasswordError) validateConfirmPassword(text)
                    }}
                    onBlur={() => validateConfirmPassword(confirmPassword)}
                    secureTextEntry
                    editable={!isLoading}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    error={confirmPasswordError ?? undefined}
                    leadingIcon={
                      <LockIcon color={confirmPasswordError ? colors.status.urgentWarm : colors.warm.clay} />
                    }
                  />
                </View>

                <View style={styles.btnWrap}>
                  <WarmButton
                    label={tx("resetPassword.updatePassword", "Actualizar contraseña")}
                    onPress={handleSubmit}
                    variant="primary"
                    fullWidth
                    disabled={!code.trim() || !password || !confirmPassword || isLoading}
                    trailingIcon={
                      isLoading ? <ActivityIndicator color={colors.warm.cream} size="small" /> : undefined
                    }
                  />
                </View>
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
  fieldGap: {
    marginBottom: spacing.md,
  },
  btnWrap: {
    marginTop: spacing.sm,
  },
})

export default ResetPasswordScreen
