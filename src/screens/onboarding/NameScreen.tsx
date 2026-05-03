/**
 * NameScreen — Emotional Intelligence redesign.
 *
 * Warm welcome screen that asks for the user's first name. Cream WarmCard
 * surface with WarmInput, soft sage notice strip when arriving with a notice
 * (provisioning continuation), WarmButton CTA. Auth + provisioning logic
 * preserved verbatim.
 */

import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native"
import Animated from "react-native-reanimated"
import type { StackScreenProps } from "@react-navigation/stack"

import { WarmScreen } from "../../components/common/WarmScreen"
import { WarmCard } from "../../components/common/WarmCard"
import { WarmInput } from "../../components/common/WarmInput"
import { WarmButton } from "../../components/common/WarmButton"
import { useFadeUp } from "../../styles/animations"
import { borderRadius, colors, spacing, typography } from "../../styles/theme"
import type { OnboardingStackParamList } from "../../types/navigation"
import { useAuth } from "../../context/AuthContext"
import { ApiException } from "../../services/api"
import { useViewTranslation } from "../../i18n"

type NameScreenProps = StackScreenProps<OnboardingStackParamList, "Name">

export const NameScreen: React.FC<NameScreenProps> = ({ navigation, route }) => {
  const { completePendingProvisioning, setUserName, userName } = useAuth()
  const { t } = useViewTranslation("onboarding")

  const [name, setName] = useState(userName ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isProvisioningContinuation = route.params?.completePendingProvisioning === true
  const actionLabel = isProvisioningContinuation
    ? t("name.completeProfile", { defaultValue: "Completar perfil" })
    : t("name.continue", { defaultValue: "Continuar" })

  const { animatedStyle: titleStyle, fadeIn: titleFadeIn } = useFadeUp({ duration: 420, delay: 100, distance: 18 })
  const { animatedStyle: subtitleStyle, fadeIn: subtitleFadeIn } = useFadeUp({ duration: 420, delay: 200, distance: 14 })
  const { animatedStyle: cardStyle, fadeIn: cardFadeIn } = useFadeUp({ duration: 460, delay: 300, distance: 16 })
  const { animatedStyle: btnStyle, fadeIn: btnFadeIn } = useFadeUp({ duration: 420, delay: 400, distance: 12 })

  useEffect(() => {
    titleFadeIn()
    subtitleFadeIn()
    cardFadeIn()
    btnFadeIn()
  }, [titleFadeIn, subtitleFadeIn, cardFadeIn, btnFadeIn])

  const isNameValid = name.trim().length > 0

  const handleContinue = async () => {
    if (!isNameValid) {
      setError(t("name.requiredError", { defaultValue: "Por favor, ingresa tu nombre" }))
      return
    }

    const trimmedName = name.trim()

    try {
      setIsSubmitting(true)
      await setUserName(trimmedName)

      if (isProvisioningContinuation) {
        await completePendingProvisioning(trimmedName)
        return
      }

      navigation.navigate("Login", {
        email: route.params?.email,
        notice:
          route.params?.notice ??
          t("name.defaultLoginNotice", {
            defaultValue: "Continúa con tu acceso para entrar a Inmigreat.",
          }),
      })
    } catch (err) {
      if (err instanceof ApiException) {
        if (isProvisioningContinuation && err.code === 401) {
          navigation.replace("Login", {
            email: route.params?.email,
            notice: err.message,
          })
          return
        }
        setError(err.message)
        return
      }
      console.error("[NameScreen] Error saving name:", err)
      setError(t("name.saveError", { defaultValue: "Error al guardar tu nombre. Intenta de nuevo." }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <WarmScreen scroll edges={["top", "right", "left"]}>
      <KeyboardAvoidingView
        style={styles.kb}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <Animated.View style={titleStyle}>
              <Text style={styles.eyebrow}>
                {t("name.eyebrow", { defaultValue: "MUCHO GUSTO" })}
              </Text>
              <Text style={styles.title}>
                {t("name.title", { defaultValue: "Hola, ¿cómo te llamas?" })}
              </Text>
            </Animated.View>

            <Animated.View style={subtitleStyle}>
              <Text style={styles.subtitle}>
                {isProvisioningContinuation
                  ? t("name.provisioningSubtitle", {
                      defaultValue:
                        "Solo falta tu nombre para crear tu perfil y entrar a la app. Tomará 5 segundos.",
                    })
                  : t("name.subtitle", {
                      defaultValue:
                        "Lexi y los recursos van a usar tu nombre para hablarte directo, sin sentirse robóticos.",
                    })}
              </Text>
            </Animated.View>

            {route.params?.notice ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>{route.params.notice}</Text>
              </View>
            ) : null}

            <Animated.View style={[styles.cardWrap, cardStyle]}>
              <WarmCard >
                <WarmInput
                  label={t("name.inputLabel", { defaultValue: "Tu nombre" })}
                  placeholder={t("name.placeholder", { defaultValue: "Ej. María" })}
                  value={name}
                  onChangeText={(text) => {
                    setName(text)
                    if (error) setError(null)
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                  maxLength={50}
                  editable={!isSubmitting}
                  error={error ?? undefined}
                  helper={
                    error
                      ? undefined
                      : t("name.helper", { defaultValue: "Solo el primer nombre — lo cambias después si quieres." })
                  }
                />
              </WarmCard>
            </Animated.View>

            <Animated.View style={[styles.btnWrap, btnStyle]}>
              <WarmButton
                label={actionLabel}
                onPress={handleContinue}
                variant="primary"
                fullWidth
                disabled={!isNameValid || isSubmitting}
                trailingIcon={isSubmitting ? <ActivityIndicator color={colors.background.primary} size="small" /> : undefined}
              />
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
    color: colors.accent,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.md * 1.45,
    marginTop: spacing.md,
  },
  notice: {
    backgroundColor: "rgba(184, 201, 185, 0.25)",
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: borderRadius.large,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  noticeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  cardWrap: {
    marginTop: spacing.xl,
  },
  btnWrap: {
    marginTop: spacing.xl,
  },
})

export default NameScreen
