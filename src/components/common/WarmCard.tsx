/**
 * WarmCard — Emotional Intelligence surface.
 *
 * Use for any panel that should feel like a hand on the shoulder:
 * RFE arrival, hearing day, denial, document upload prompts, post-stress
 * acknowledgements. Cream→sand vertical gradient, soft clay border, paper
 * grain overlay, generous internal spacing.
 *
 * Pair with `<SupportPill />` for crisis escalation when stress is acute.
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
   * intensity controls the stress level visual:
   *   - "calm": flat cream
   *   - "elevated": cream→sand gradient (default)
   *   - "acute": cream→peach with stronger clay border + extra padding
   */
  intensity?: "calm" | "elevated" | "acute"
}

export function WarmCard({ children, style, intensity = "elevated" }: Props) {
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
