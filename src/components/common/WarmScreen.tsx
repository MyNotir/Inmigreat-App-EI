/**
 * Screen wrapper for the EI redesign.
 *
 * Default is BRAND COOL: brand cool gradient via AnimatedBackground.
 * `preset="acute"` switches to warm cream → peach → cream for crisis screens.
 * `preset="warm"` for general warm contexts.
 */

import { ScrollView, type ScrollViewProps, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { AnimatedBackground, ONBOARDING_GRADIENT_COLORS } from "./AnimatedBackground"
import { LinearGradient } from "expo-linear-gradient"
import { colors } from "@/styles/theme"

type Props = {
  children: React.ReactNode
  scroll?: boolean
  scrollProps?: ScrollViewProps
  style?: StyleProp<ViewStyle>
  contentContainerStyle?: StyleProp<ViewStyle>
  edges?: Array<"top" | "right" | "bottom" | "left">
  /**
   * Default "brand": cool brand gradient (white → soft → day).
   * "warm": cream → sand → cream for general warm screens.
   * "acute": cream → peach → cream for crisis screens.
   * "calm": flat cream surface.
   */
  preset?: "brand" | "warm" | "acute" | "calm"
}

export function WarmScreen({
  children,
  scroll = false,
  scrollProps,
  style,
  contentContainerStyle,
  edges = ["top", "right", "left"],
  preset = "brand",
}: Props) {
  const Body = (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          {...scrollProps}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.staticContent, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  )

  if (preset === "brand") {
    return (
      <AnimatedBackground colors={ONBOARDING_GRADIENT_COLORS}>
        <View style={[styles.flex, style]}>{Body}</View>
      </AnimatedBackground>
    )
  }

  const gradient =
    preset === "acute"
      ? [colors.warm.cream, colors.warm.peach, colors.warm.cream]
      : preset === "calm"
        ? [colors.warm.cream, colors.warm.cream]
        : colors.background.warmGradient

  return (
    <LinearGradient
      colors={gradient as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.gradient, style]}
    >
      {Body}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  staticContent: {
    flex: 1,
  },
})
