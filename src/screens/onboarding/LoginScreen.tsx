/**
 * LoginScreen — Emotional Intelligence redesign.
 *
 * Warm-minimalism auth surface. Same Cognito + social flow as before, just
 * wearing the EI skin: cream WarmCard with WarmInput fields, WarmButton CTAs,
 * and a soft sage notice instead of cold success-green. Errors use urgentWarm
 * (burnt orange) inline — never alarmist red.
 *
 * Auth logic, validation, error mapping, and OAuth handlers are preserved
 * verbatim from the previous implementation.
 */

import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
import { WarmDivider } from "../../components/common/WarmDivider"
import { useAuth } from "../../context/AuthContext"
import { useAppAlert } from "../../context/AppAlertContext"
import { ApiException } from "../../services/api"
import { useFadeUp } from "../../styles/animations"
import { borderRadius, colors, spacing, typography } from "../../styles/theme"
import type { OnboardingStackParamList } from "../../types/navigation"
import { getKeyboardBehavior, getKeyboardVerticalOffset, isIOS } from "../../utils/platform"
import { useViewTranslation } from "../../i18n"

type LoginScreenProps = StackScreenProps<OnboardingStackParamList, "Login">
type ScreenMode = "login" | "register"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
)

const AppleIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = "#FFFFFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </Svg>
)

const MailIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = colors.warm.clay }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="4" width="20" height="16" rx="2" />
    <Path d="M22 6l-10 7L2 6" />
  </Svg>
)

const LockIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = colors.warm.clay }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
)

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const { loginWithCredentials, registerUser, loginWithSocial, userName, language } = useAuth()
  const { showAlert, showError } = useAppAlert()
  const { t } = useViewTranslation("onboarding")

  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) })

  const [mode, setMode] = useState<ScreenMode>("login")
  const [email, setEmail] = useState(route.params?.email ?? "")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [notice, setNotice] = useState<string | null>(route.params?.notice ?? null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null)

  const passwordInputRef = useRef<TextInput>(null)
  const confirmPasswordInputRef = useRef<TextInput>(null)

  const { animatedStyle: titleStyle, fadeIn: titleFadeIn } = useFadeUp({ duration: 420, delay: 100, distance: 18 })
  const { animatedStyle: subtitleStyle, fadeIn: subtitleFadeIn } = useFadeUp({ duration: 420, delay: 180, distance: 14 })
  const { animatedStyle: formStyle, fadeIn: formFadeIn } = useFadeUp({ duration: 460, delay: 260, distance: 16 })
  const { animatedStyle: footerStyle, fadeIn: footerFadeIn } = useFadeUp({ duration: 420, delay: 360, distance: 12 })

  useEffect(() => {
    titleFadeIn()
    subtitleFadeIn()
    formFadeIn()
    footerFadeIn()
  }, [footerFadeIn, formFadeIn, subtitleFadeIn, titleFadeIn])

  useEffect(() => {
    if (route.params?.email) setEmail(route.params.email)
    if (route.params?.notice) setNotice(route.params.notice)
  }, [route.params?.email, route.params?.notice])

  const headerTitle = useMemo(() => {
    if (mode === "register") {
      return userName
        ? tx("login.title.createWithName", "Crea tu cuenta, {{name}}", { name: userName })
        : tx("login.title.create", "Crea tu cuenta")
    }
    return userName
      ? tx("login.title.welcomeWithName", "Bienvenido, {{name}}", { name: userName })
      : tx("login.title.welcome", "Bienvenido")
  }, [mode, t, userName])

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(tx("login.validation.emailRequired", "El correo electrónico es requerido."))
      return false
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      setEmailError(tx("login.validation.emailInvalid", "Ingresa un correo electrónico válido."))
      return false
    }
    setEmailError(null)
    return true
  }

  const validatePassword = (value: string, currentMode: ScreenMode): boolean => {
    if (!value) {
      setPasswordError(tx("login.validation.passwordRequired", "La contraseña es requerida."))
      return false
    }
    if (currentMode === "register" && !STRONG_PASSWORD_REGEX.test(value)) {
      setPasswordError(
        tx(
          "login.validation.strongPassword",
          "Usa al menos 8 caracteres, una mayúscula, una minúscula y un número.",
        ),
      )
      return false
    }
    setPasswordError(null)
    return true
  }

  const validateConfirmPassword = (value: string, sourcePassword: string): boolean => {
    if (mode !== "register") {
      setConfirmPasswordError(null)
      return true
    }
    if (!value) {
      setConfirmPasswordError(tx("login.validation.confirmPasswordRequired", "Confirma tu contraseña."))
      return false
    }
    if (value !== sourcePassword) {
      setConfirmPasswordError(tx("login.validation.confirmPasswordMismatch", "Las contraseñas no coinciden."))
      return false
    }
    setConfirmPasswordError(null)
    return true
  }

  const handleModeChange = (nextMode: ScreenMode) => {
    setMode(nextMode)
    setPassword("")
    setConfirmPassword("")
    setPasswordError(null)
    setConfirmPasswordError(null)
    setNotice(null)
  }

  const applyApiError = (error: unknown, normalizedEmail: string) => {
    if (!(error instanceof ApiException)) {
      const fallbackMessage = tx("login.alert.authFallback", "No fue posible completar la autenticación. Intenta de nuevo.")
      setPasswordError(fallbackMessage)
      showError(error, {
        title:
          mode === "login"
            ? tx("login.alert.loginFailed", "No pudimos iniciar sesión")
            : tx("login.alert.registerFailed", "No pudimos crear tu cuenta"),
        fallbackMessage,
      })
      return
    }

    const normalizedMessage = error.message.toLowerCase()

    if (error.details?.email?.[0]) setEmailError(error.details.email[0])
    if (error.details?.password?.[0]) setPasswordError(error.details.password[0])

    if (error.type === "auth_error" && normalizedMessage.includes("confirmar tu correo")) {
      showAlert({
        title: tx("login.alert.confirmEmailTitle", "Confirma tu correo"),
        message: tx(
          "login.alert.confirmEmailMessage",
          "Necesitamos verificar tu correo antes de iniciar sesión. Te llevaremos al siguiente paso.",
        ),
        tone: "info",
        actions: [
          {
            label: tx("login.alert.continue", "Continuar"),
            onPress: () => navigation.navigate("ConfirmRegistration", { email: normalizedEmail }),
          },
        ],
      })
      return
    }

    if (error.code === 428) {
      if (!userName?.trim()) {
        showAlert({
          title: tx("login.alert.completeProfileTitle", "Completa tu perfil"),
          message: tx(
            "login.alert.completeProfileMessage",
            "Necesitamos tu nombre para terminar de crear tu perfil en Inmigreat.",
          ),
          tone: "info",
          actions: [
            {
              label: tx("login.alert.continue", "Continuar"),
              onPress: () =>
                navigation.navigate("Name", {
                  email: normalizedEmail,
                  notice: tx(
                    "login.alert.completeProfileMessage",
                    "Necesitamos tu nombre para terminar de crear tu perfil en Inmigreat.",
                  ),
                  completePendingProvisioning: true,
                }),
            },
          ],
        })
        return
      } else {
        setNotice(error.message)
      }
      setPasswordError(error.message)
      showError(error, { title: tx("login.alert.completeProfileTitle", "Completa tu perfil") })
      return
    }

    if (normalizedMessage.includes("no encontramos una cuenta")) {
      setEmailError(error.message)
    } else if (!error.details?.password?.[0]) {
      setPasswordError(error.message)
    }

    showError(error, {
      title:
        mode === "login"
          ? tx("login.alert.loginFailed", "No pudimos iniciar sesión")
          : tx("login.alert.registerFailed", "No pudimos crear tu cuenta"),
      preferInlineValidation: true,
    })
  }

  const handleSubmit = async () => {
    Keyboard.dismiss()
    const normalizedEmail = email.trim().toLowerCase()
    const isEmailValid = validateEmail(normalizedEmail)
    const isPasswordValid = validatePassword(password, mode)
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword, password)

    if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid) return

    setIsLoading(true)
    setNotice(null)

    try {
      if (mode === "login") {
        await loginWithCredentials({ email: normalizedEmail, password })
        navigation.navigate("Biometric")
        return
      }

      const registrationName = userName?.trim() || normalizedEmail.split("@")[0]
      const result = await registerUser({
        email: normalizedEmail,
        password,
        name: registrationName,
        language,
      })

      if (result.userConfirmed) {
        await loginWithCredentials({ email: normalizedEmail, password })
        navigation.navigate("Biometric")
        return
      }

      navigation.navigate("ConfirmRegistration", { email: normalizedEmail })
    } catch (error) {
      applyApiError(error, normalizedEmail)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocial = async (provider: "google" | "apple") => {
    setSocialLoading(provider)
    try {
      await loginWithSocial({ provider })
      navigation.navigate("Biometric")
    } catch (error) {
      if (error instanceof ApiException && error.code === 499) return

      if (error instanceof ApiException && error.code === 428) {
        const noticeMessage = tx(
          "login.alert.completeProfileMessage",
          "Necesitamos tu nombre para terminar de crear tu perfil en Inmigreat.",
        )
        if (!userName?.trim()) {
          showAlert({
            title: tx("login.alert.completeProfileTitle", "Completa tu perfil"),
            message: noticeMessage,
            tone: "info",
            actions: [
              {
                label: tx("login.alert.continue", "Continuar"),
                onPress: () =>
                  navigation.navigate("Name", {
                    notice: noticeMessage,
                    completePendingProvisioning: true,
                  }),
              },
            ],
          })
          return
        }
        setNotice(error.message)
      }

      if (error instanceof ApiException) setPasswordError(error.message)
      showError(error, {
        title:
          provider === "google"
            ? tx("login.alert.googleFailed", "No pudimos iniciar sesión con Google")
            : tx("login.alert.appleFailed", "No pudimos iniciar sesión con Apple"),
      })
    } finally {
      setSocialLoading(null)
    }
  }

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword", {
      email: email.trim() ? email.trim().toLowerCase() : undefined,
    })
  }

  const isFormValid = Boolean(
    email.trim() &&
      password &&
      (mode === "login" || confirmPassword) &&
      !emailError &&
      !passwordError &&
      !confirmPasswordError,
  )
  const isAnyLoading = isLoading || socialLoading !== null

  return (
    <WarmScreen scroll edges={["top", "right", "left"]}>
      <KeyboardAvoidingView
        style={styles.kb}
        behavior={getKeyboardBehavior()}
        keyboardVerticalOffset={getKeyboardVerticalOffset()}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <Animated.View style={titleStyle}>
              <Text style={styles.eyebrow}>
                {mode === "login"
                  ? tx("login.eyebrow.welcome", "BIENVENIDO DE VUELTA")
                  : tx("login.eyebrow.create", "EMPECEMOS")}
              </Text>
              <Text style={styles.title}>{headerTitle}</Text>
            </Animated.View>

            <Animated.View style={subtitleStyle}>
              <Text style={styles.subtitle}>
                {mode === "login"
                  ? tx(
                      "login.subtitle.login",
                      "Tu caso, tus pasos, tus avances — todo donde lo dejaste.",
                    )
                  : tx(
                      "login.subtitle.register",
                      "Tu correo y una contraseña — eso es todo lo que necesitamos para empezar.",
                    )}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.formWrap, formStyle]}>
              <WarmCard intensity="elevated">
                <View style={styles.modeRow}>
                  <Pressable
                    style={[styles.modeChip, mode === "login" && styles.modeChipActive]}
                    onPress={() => handleModeChange("login")}
                    disabled={isLoading}
                  >
                    <Text style={[styles.modeChipText, mode === "login" && styles.modeChipTextActive]}>
                      {tx("login.mode.login", "Iniciar sesión")}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modeChip, mode === "register" && styles.modeChipActive]}
                    onPress={() => handleModeChange("register")}
                    disabled={isLoading}
                  >
                    <Text style={[styles.modeChipText, mode === "register" && styles.modeChipTextActive]}>
                      {tx("login.mode.register", "Crear cuenta")}
                    </Text>
                  </Pressable>
                </View>

                {notice ? (
                  <View style={styles.notice}>
                    <Text style={styles.noticeText}>{notice}</Text>
                  </View>
                ) : null}

                <View style={styles.fieldGap}>
                  <WarmInput
                    label={tx("login.field.emailLabel", "Correo electrónico")}
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
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    editable={!isAnyLoading}
                    error={emailError ?? undefined}
                    leadingIcon={<MailIcon color={emailError ? colors.status.urgentWarm : colors.warm.clay} />}
                  />
                </View>

                <View style={styles.fieldGap}>
                  <WarmInput
                    label={tx("login.field.passwordLabel", "Contraseña")}
                    placeholder={
                      mode === "login"
                        ? tx("login.field.passwordPlaceholder", "Tu contraseña")
                        : tx("login.field.securePasswordPlaceholder", "Crea una segura")
                    }
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text)
                      if (passwordError) validatePassword(text, mode)
                      if (confirmPasswordError) validateConfirmPassword(confirmPassword, text)
                    }}
                    onBlur={() => validatePassword(password, mode)}
                    secureTextEntry
                    returnKeyType={mode === "register" ? "next" : "done"}
                    onSubmitEditing={() => {
                      if (mode === "register") {
                        confirmPasswordInputRef.current?.focus()
                        return
                      }
                      handleSubmit()
                    }}
                    editable={!isAnyLoading}
                    error={passwordError ?? undefined}
                    leadingIcon={<LockIcon color={passwordError ? colors.status.urgentWarm : colors.warm.clay} />}
                    helper={
                      mode === "register"
                        ? tx("login.helper.passwordPolicy", "Mín. 8 caracteres, mayúscula, minúscula, número.")
                        : undefined
                    }
                  />
                </View>

                {mode === "register" ? (
                  <View style={styles.fieldGap}>
                    <WarmInput
                      label={tx("login.field.confirmPasswordLabel", "Confirma tu contraseña")}
                      placeholder={tx("login.field.confirmPasswordPlaceholder", "Una vez más")}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text)
                        if (confirmPasswordError) validateConfirmPassword(text, password)
                      }}
                      onBlur={() => validateConfirmPassword(confirmPassword, password)}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                      editable={!isAnyLoading}
                      error={confirmPasswordError ?? undefined}
                      leadingIcon={
                        <LockIcon color={confirmPasswordError ? colors.status.urgentWarm : colors.warm.clay} />
                      }
                    />
                  </View>
                ) : null}

                <View style={styles.submitWrap}>
                  <WarmButton
                    label={
                      mode === "login"
                        ? tx("login.action.login", "Entrar")
                        : tx("login.action.register", "Continuar con registro")
                    }
                    onPress={handleSubmit}
                    variant="primary"
                    fullWidth
                    disabled={!isFormValid || isAnyLoading}
                    trailingIcon={
                      isLoading ? <ActivityIndicator color={colors.warm.cream} size="small" /> : undefined
                    }
                  />
                </View>

                {mode === "login" ? (
                  <Pressable
                    onPress={handleForgotPassword}
                    disabled={isAnyLoading}
                    style={styles.forgotWrap}
                  >
                    <Text style={[styles.forgotText, isAnyLoading && styles.forgotDisabled]}>
                      {tx("login.helper.forgotPassword", "¿Olvidaste tu contraseña?")}
                    </Text>
                  </Pressable>
                ) : null}
              </WarmCard>

              {mode === "login" ? (
                <View style={styles.socialBlock}>
                  <WarmDivider label={tx("login.helper.divider", "o continúa con")} />
                  <View style={styles.socialRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleSocial("google")}
                      disabled={isAnyLoading}
                      style={[styles.socialBtn, isAnyLoading && styles.socialBtnDisabled]}
                    >
                      {socialLoading === "google" ? (
                        <ActivityIndicator color={colors.warm.ink} size="small" />
                      ) : (
                        <>
                          <GoogleIcon size={18} />
                          <Text style={styles.socialText}>Google</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {isIOS ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => handleSocial("apple")}
                        disabled={isAnyLoading}
                        style={[
                          styles.socialBtn,
                          styles.appleBtn,
                          isAnyLoading && styles.socialBtnDisabled,
                        ]}
                      >
                        {socialLoading === "apple" ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <>
                            <AppleIcon size={18} color="#FFFFFF" />
                            <Text style={[styles.socialText, styles.appleText]}>Apple</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <Animated.View style={[styles.footerWrap, footerStyle]}>
                <Pressable
                  onPress={() => handleModeChange(mode === "login" ? "register" : "login")}
                  disabled={isAnyLoading}
                >
                  <Text style={styles.footerText}>
                    {mode === "login"
                      ? tx("login.helper.footerCreate", "¿Todavía no tienes cuenta?  ")
                      : tx("login.helper.footerLogin", "¿Ya tienes cuenta?  ")}
                    <Text style={styles.footerLink}>
                      {mode === "login"
                        ? tx("login.helper.footerCreateAction", "Crear cuenta")
                        : tx("login.helper.footerLoginAction", "Iniciar sesión")}
                    </Text>
                  </Text>
                </Pressable>
              </Animated.View>
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
    paddingTop: spacing["2xl"],
    paddingBottom: spacing["2xl"],
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
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.md * 1.45,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  formWrap: {
    width: "100%",
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.warm.sand,
    padding: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  modeChip: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
    borderRadius: borderRadius.full,
  },
  modeChipActive: {
    backgroundColor: colors.warm.cream,
    shadowColor: colors.warm.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  modeChipText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
  },
  modeChipTextActive: {
    color: colors.warm.clay,
    fontFamily: typography.fontFamily.extrabold,
  },
  notice: {
    backgroundColor: "rgba(184, 201, 185, 0.25)",
    borderColor: colors.warm.sage,
    borderWidth: 1,
    borderRadius: borderRadius.large,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.warm.ink,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  fieldGap: {
    marginBottom: spacing.md,
  },
  submitWrap: {
    marginTop: spacing.sm,
  },
  forgotWrap: {
    alignItems: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
  },
  forgotText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.clay,
  },
  forgotDisabled: {
    opacity: 0.4,
  },
  socialBlock: {
    marginTop: spacing.xl,
  },
  socialRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warm.cream,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.warm,
    gap: spacing.sm,
    minHeight: 48,
  },
  socialBtnDisabled: {
    opacity: 0.6,
  },
  appleBtn: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  socialText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  appleText: {
    color: "#FFFFFF",
  },
  footerWrap: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    textAlign: "center",
  },
  footerLink: {
    color: colors.warm.clay,
    fontFamily: typography.fontFamily.extrabold,
  },
})

export default LoginScreen
