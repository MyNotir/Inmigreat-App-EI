/**
 * WarmScreen — full-screen EI surface wrapper.
 *
 * Renders a warm vertical gradient (cream → sand → cream) with safe-area
 * insets and optional scroll. Use as the root of any screen that should
 * feel warm-minimal: onboarding, chat, cases under stress, support flows.
 *
 * For routine-state screens that should keep the cool brand spine, use
 * AnimatedBackground with the default cool gradient instead.
 */

import { LinearGradient } from "expo-linear-gradient"
import { ScrollView, type ScrollViewProps, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { colors } from "@/styles/theme"

type Props = {
  children: React.ReactNode
  scroll?: boolean
  scrollProps?: ScrollViewProps
  style?: StyleProp<ViewStyle>
  contentContainerStyle?: StyleProp<ViewStyle>
  edges?: Array<"top" | "right" | "bottom" | "left">
  /**
   * Override the gradient. Defaults to colors.background.warmGradient.
   * Pass an "acute" preset for crisis screens (cream → peach → cream).
   */
  preset?: "default" | "acute" | "calm"
}

export function WarmScreen({
  children,
  scroll = false,
  scrollProps,
  style,
  contentContainerStyle,
  edges = ["top", "right", "left"],
  preset = "default",
}: Props) {
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
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
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
