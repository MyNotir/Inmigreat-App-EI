/**
 * LanguageScreen — Emotional Intelligence redesign.
 *
 * Warm-minimalism language picker. Each row uses WarmListItem with the flag
 * as leading icon, the language code as meta, and a clay checkmark when
 * selected. No flashy animation — just calm, decisive.
 */

import { useEffect } from "react"
import { StyleSheet, Text, View } from "react-native"
import Animated from "react-native-reanimated"
import type { StackNavigationProp } from "@react-navigation/stack"

import { WarmScreen } from "../../components/common/WarmScreen"
import { WarmListItem } from "../../components/common/WarmListItem"
import { FlagES, FlagUS, FlagBR } from "../../icons/FlagIcons"
import { useFadeUp } from "../../styles/animations"
import { colors, spacing, typography } from "../../styles/theme"
import type { OnboardingStackParamList } from "../../types/navigation"
import { useAuth } from "../../context/AuthContext"
import type { Language } from "../../types/user"
import { useViewTranslation } from "../../i18n"

const LANGUAGE_OPTIONS: Array<{
  code: Language
  nativeName: string
  Flag: React.FC<{ size?: number }>
}> = [
  { code: "ES", nativeName: "Español", Flag: FlagES },
  { code: "EN", nativeName: "English", Flag: FlagUS },
  { code: "PT", nativeName: "Português", Flag: FlagBR },
]

interface LanguageScreenProps {
  navigation: StackNavigationProp<OnboardingStackParamList, "Language">
}

export const LanguageScreen: React.FC<LanguageScreenProps> = ({ navigation }) => {
  const { language: currentLanguage, setLanguage } = useAuth()
  const { t } = useViewTranslation("onboarding")

  const { animatedStyle: titleStyle, fadeIn: titleFadeIn } = useFadeUp({
    duration: 420,
    delay: 100,
    distance: 18,
  })
  const { animatedStyle: subtitleStyle, fadeIn: subtitleFadeIn } = useFadeUp({
    duration: 420,
    delay: 200,
    distance: 14,
  })
  const { animatedStyle: listStyle, fadeIn: listFadeIn } = useFadeUp({
    duration: 460,
    delay: 280,
    distance: 16,
  })

  useEffect(() => {
    titleFadeIn()
    subtitleFadeIn()
    listFadeIn()
  }, [titleFadeIn, subtitleFadeIn, listFadeIn])

  const handleSelect = async (code: Language) => {
    try {
      await setLanguage(code)
      navigation.navigate("Name")
    } catch (error) {
      console.error("[LanguageScreen] Error setting language:", error)
    }
  }

  return (
    <WarmScreen scroll>
      <View style={styles.content}>
        <Animated.View style={titleStyle}>
          <Text style={styles.eyebrow}>
            {t("language.eyebrow", { defaultValue: "TU IDIOMA" })}
          </Text>
          <Text style={styles.title}>
            {t("language.title", { defaultValue: "¿En qué idioma quieres conversar?" })}
          </Text>
        </Animated.View>

        <Animated.View style={subtitleStyle}>
          <Text style={styles.subtitle}>
            {t("language.subtitle", {
              defaultValue: "Lo cambias después si quieres. Lexi y los recursos se adaptan al tiro.",
            })}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.list, listStyle]}>
          {LANGUAGE_OPTIONS.map(({ code, nativeName, Flag }) => {
            const selected = currentLanguage === code
            return (
              <WarmListItem
                key={code}
                title={nativeName}
                subtitle={
                  code === "ES"
                    ? "Tu app, en español. Como en casa."
                    : code === "EN"
                      ? "English — full UI, all chats, all guides."
                      : "Português — toda a interface traduzida."
                }
                meta={code}
                onPress={() => handleSelect(code)}
                attention={selected}
                leading={
                  <View style={styles.flagWrap}>
                    <Flag size={36} />
                  </View>
                }
                trailing={
                  selected ? (
                    <View style={styles.check}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  ) : (
                    <Text style={styles.chev}>›</Text>
                  )
                }
              />
            )
          })}
        </Animated.View>

        <Text style={styles.footer}>
          {t("language.footer", {
            defaultValue: "Más idiomas vienen pronto — tu feedback nos guía.",
          })}
        </Text>
      </View>
    </WarmScreen>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing["3xl"],
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
    lineHeight: typography.fontSize["2xl"] * 1.2,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.md * 1.45,
    marginTop: spacing.md,
    marginBottom: spacing["2xl"],
  },
  list: {
    gap: spacing.sm + 2,
  },
  flagWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.warm.sand,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warm.clay,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    color: colors.warm.cream,
    fontSize: 14,
    fontFamily: typography.fontFamily.bold,
  },
  chev: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
    color: colors.warm.inkFaint,
  },
  footer: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.warm.inkFaint,
    textAlign: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 17,
  },
})

export default LanguageScreen
