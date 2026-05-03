/**
 * SplashScreen — Emotional Intelligence redesign.
 *
 * Warm-minimalism welcome moment. The first thing the user sees: a hand on
 * the shoulder, not a sales page. Auto-navigates to Language screen unless
 * the user taps the EI Preview pill (used to demo the redesign without auth).
 */

import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Animated from "react-native-reanimated"
import type { StackNavigationProp } from "@react-navigation/stack"

import { WarmScreen } from "../../components/common/WarmScreen"
import { InmigreatLogo } from "../../icons/BrandIcons"
import { useFadeUp, usePopIn, getStaggerDelay } from "../../styles/animations"
import { borderRadius, colors, spacing, typography } from "../../styles/theme"
import type { OnboardingStackParamList } from "../../types/navigation"
import { useViewTranslation } from "../../i18n"
import { useAuth } from "../../context/AuthContext"

const AUTO_NAVIGATE_DELAY = 2500

interface SplashScreenProps {
  navigation: StackNavigationProp<OnboardingStackParamList, "Splash">
}

interface ReassuranceItemProps {
  text: string
  index: number
}

const ReassuranceItem: React.FC<ReassuranceItemProps> = ({ text, index }) => {
  const delay = getStaggerDelay(index, 130) + 800
  const { animatedStyle, fadeIn } = useFadeUp({ duration: 420, delay, distance: 14 })

  useEffect(() => {
    fadeIn()
  }, [fadeIn])

  return (
    <Animated.View style={[styles.reassureRow, animatedStyle]}>
      <View style={styles.reassureDot} />
      <Text style={styles.reassureText}>{text}</Text>
    </Animated.View>
  )
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { t } = useViewTranslation("onboarding")
  const { __devBypassAuth } = useAuth()
  const [autoNavigate, setAutoNavigate] = useState(true)

  const reassurances = [
    t("splash.reassure.r1", { defaultValue: "Tu caso, sin jerga legal." }),
    t("splash.reassure.r2", { defaultValue: "Lexi gratis, 24/7." }),
    t("splash.reassure.r3", { defaultValue: "Abogados humanos cuando los necesites." }),
  ]

  const { animatedStyle: logoStyle, popIn } = usePopIn({
    initialScale: 0.7,
    duration: 520,
    delay: 200,
  })

  const { animatedStyle: titleStyle, fadeIn: titleFadeIn } = useFadeUp({
    duration: 460,
    delay: 480,
    distance: 18,
  })

  const { animatedStyle: subtitleStyle, fadeIn: subtitleFadeIn } = useFadeUp({
    duration: 460,
    delay: 600,
    distance: 14,
  })

  useEffect(() => {
    popIn()
    titleFadeIn()
    subtitleFadeIn()
  }, [popIn, titleFadeIn, subtitleFadeIn])

  useEffect(() => {
    if (!autoNavigate) return
    const timer = setTimeout(() => {
      navigation.replace("Language")
    }, AUTO_NAVIGATE_DELAY)
    return () => clearTimeout(timer)
  }, [navigation, autoNavigate])

  return (
    <WarmScreen edges={["top", "right", "left", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.center}>
          <Animated.View style={[styles.logoOuter, logoStyle]}>
            <View style={styles.logoInner}>
              <InmigreatLogo size={68} strokeWidth={2} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.titleBlock, titleStyle]}>
            <Text style={styles.eyebrow}>
              {t("splash.eyebrow", { defaultValue: "MIGRACIÓN, CON CALMA" })}
            </Text>
            <Text style={styles.title}>InMiGreat</Text>
          </Animated.View>

          <Animated.View style={subtitleStyle}>
            <Text style={styles.subtitle}>
              {t("splash.subtitle", {
                defaultValue: "Estamos contigo. Paso por paso, sin perderte.",
              })}
            </Text>
          </Animated.View>

          <View style={styles.reassureBlock}>
            {reassurances.map((line, i) => (
              <ReassuranceItem key={line} text={line} index={i} />
            ))}
          </View>
        </View>

        <View style={styles.bottomActions}>
          <Pressable
            style={styles.previewBtn}
            onPress={() => {
              setAutoNavigate(false)
              navigation.navigate("EIPreview")
            }}
            accessibilityRole="button"
            accessibilityLabel="Open Emotional Intelligence design preview"
          >
            <Text style={styles.previewLabel}>Preview · EI Redesign →</Text>
          </Pressable>

          {__devBypassAuth ? (
            <Pressable
              style={styles.demoBtn}
              onPress={() => {
                setAutoNavigate(false)
                __devBypassAuth()
              }}
              accessibilityRole="button"
              accessibilityLabel="Demo login — entrar sin password"
            >
              <Text style={styles.demoLabel}>Demo Login (sin password) →</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </WarmScreen>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["2xl"],
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoOuter: {
    marginBottom: spacing["2xl"],
  },
  logoInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  titleBlock: {
    alignItems: "center",
    marginBottom: spacing.base,
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
    fontSize: typography.fontSize["4xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: typography.fontSize.md * 1.45,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing["2xl"],
  },
  reassureBlock: {
    alignSelf: "stretch",
    paddingHorizontal: spacing.base,
    gap: spacing.sm + 2,
  },
  reassureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reassureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: spacing.md,
  },
  reassureText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    lineHeight: typography.fontSize.base * 1.4,
  },
  bottomActions: {
    alignItems: "center",
    gap: spacing.sm,
  },
  previewBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  previewLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.accent,
    letterSpacing: 0.4,
  },
  demoBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
  },
  demoLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.inverse,
    letterSpacing: 0.4,
  },
})

export default SplashScreen
