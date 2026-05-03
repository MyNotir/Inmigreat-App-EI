/**
 * CasesEmptyState — Emotional Intelligence redesign.
 *
 * Warm welcome for users with no cases yet. Acknowledges the moment
 * ('Empezar puede dar miedo') before the action. Cream WarmCard CTA with
 * clay icon bubble and a gentle reassurance line below the button.
 */

import React from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import Svg, { Path } from "react-native-svg"

import { WarmCard } from "../common/WarmCard"
import { useViewTranslation } from "../../i18n"
import { borderRadius, colors, spacing, typography } from "../../styles/theme"

interface CasesEmptyStateProps {
  onAddCase: () => void
}

const ArrowRightIcon: React.FC<{ color?: string }> = ({ color = colors.accent }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12h14M13 5l7 7-7 7"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

const PaperFolderIcon: React.FC<{ size?: number; color?: string }> = ({ size = 28, color = colors.accent }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path d="M8 13h8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M8 16h5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
)

export const CasesEmptyState: React.FC<CasesEmptyStateProps> = ({ onAddCase }) => {
  const { t } = useViewTranslation("cases")
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) })
  const { height } = useWindowDimensions()
  const minHeight = Math.max(420, Math.min(height * 0.6, 540))

  return (
    <View style={[styles.scene, { minHeight }]}>
      <View style={styles.iconWrap}>
        <View style={styles.iconBg}>
          <PaperFolderIcon size={44} color={colors.accent} />
        </View>
      </View>

      <Text style={styles.eyebrow}>{tx("empty.eyebrow", "TU PRIMER CASO")}</Text>
      <Text style={styles.title}>
        {tx("empty.title", "Empezar puede dar miedo. Aquí lo hacemos juntos.")}
      </Text>
      <Text style={styles.description}>
        {tx(
          "empty.description",
          "Conecta tu caso de USCIS o EOIR con un número de recibo o A-Number. Te armamos el timeline completo, te avisamos cuando algo cambia, y Lexi se queda contigo 24/7.",
        )}
      </Text>

      <WarmCard  style={styles.ctaCardWrap}>
        <Pressable style={styles.ctaInner} onPress={onAddCase}>
          <View style={styles.ctaIconBubble}>
            <PaperFolderIcon size={22} color={colors.background.primary} />
          </View>
          <View style={styles.ctaCopy}>
            <Text style={styles.ctaTitle}>{tx("empty.ctaTitle", "Agregar mi primer caso")}</Text>
            <Text style={styles.ctaSubtitle}>
              {tx("empty.ctaSubtitle", "Receipt number o A-Number — toma 30 segundos.")}
            </Text>
          </View>
          <View style={styles.ctaArrow}>
            <ArrowRightIcon />
          </View>
        </Pressable>
      </WarmCard>

      <Text style={styles.reassurance}>
        {tx(
          "empty.reassurance",
          "No tienes el número a mano? Empieza con tu nombre y te ayudamos a buscarlo.",
        )}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  scene: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  iconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    textAlign: "center",
    letterSpacing: -0.4,
    lineHeight: typography.fontSize["2xl"] * 1.2,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: typography.fontSize.md * 1.45,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  ctaCardWrap: {
    marginHorizontal: 0,
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  ctaIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  ctaCopy: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  ctaArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  reassurance: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.tertiary,
    textAlign: "center",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    lineHeight: typography.fontSize.sm * 1.45,
  },
})

export default CasesEmptyState
