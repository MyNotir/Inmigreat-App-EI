/**
 * Card primitive for the EI redesign.
 *
 * Default is BRAND COOL: white glass surface with subtle navy border, used
 * for routine state (cases, chat, community, resources, profile).
 * Opt into WARM intensity for stress contexts (RFE arrival, denial, ICE
 * detention, attorney directory). Pair with `<SupportPill />` for crisis
 * escalation when stress is acute.
 */

import { LinearGradient } from "expo-linear-gradient"
import { ImageBackground, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native"
import { borderRadius, colors, spacing } from "@/styles/theme"

const PAPER_GRAIN_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='3' seed='7'/><feColorMatrix values='0 0 0 0 0.85 0 0 0 0 0.78 0 0 0 0 0.68 0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(#p)' opacity='0.6'/></svg>`,
  )

type Props = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /**
   * Surface treatment. Default is "brand" — clean glass + navy border for
   * routine state. Use elevated/acute for stress contexts (warm cream →
   * sand → peach gradient with paper grain).
   */
  intensity?: "brand" | "calm" | "elevated" | "acute"
}

export function WarmCard({ children, style, intensity = "brand" }: Props) {
  // Brand cool: clean white glass surface, navy-tinted border, no paper grain.
  if (intensity === "brand") {
    return (
      <View style={[styles.brandOuter, style]}>
        <View style={styles.brandInner}>{children}</View>
      </View>
    )
  }

  const gradient =
    intensity === "calm"
      ? [colors.warm.cream, colors.warm.cream]
      : intensity === "acute"
        ? [colors.warm.cream, colors.warm.peach]
        : [colors.warm.cream, colors.warm.sand]

  const borderColor =
    intensity === "acute" ? colors.border.warmStrong : colors.border.warm
  const padding = intensity === "acute" ? spacing.xl : spacing.lg

  return (
    <View style={[styles.outer, { borderColor }, style]}>
      <LinearGradient
        colors={gradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <ImageBackground
          source={{ uri: PAPER_GRAIN_URI }}
          imageStyle={styles.paper}
          resizeMode="cover"
          style={[styles.inner, { padding }]}
        >
          {children}
        </ImageBackground>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  brandOuter: {
    borderRadius: borderRadius["2xl"],
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: "hidden",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  brandInner: {
    padding: spacing.lg,
  },
  outer: {
    borderRadius: borderRadius["2xl"],
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: colors.warm.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  gradient: {
    borderRadius: borderRadius["2xl"],
  },
  paper: {
    opacity: 0.5,
    borderRadius: borderRadius["2xl"],
  },
  inner: {
    borderRadius: borderRadius["2xl"],
  },
})
