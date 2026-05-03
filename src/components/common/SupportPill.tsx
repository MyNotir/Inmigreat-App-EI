/**
 * SupportPill — persistent crisis off-ramp.
 *
 * Floating warm-cream pill that sits in the bottom-right of any screen
 * where the user might be in stress. Tapping opens a ToneAware panel
 * offering: free Lexi chat, verified human attorney, AILA hotline for
 * actual immigration emergencies.
 *
 * EI rule: this is the single most important affordance for at-risk
 * users. Should be visible from minute one, never gated, never sold.
 */

import { useState } from "react"
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { borderRadius, colors, spacing, typography } from "@/styles/theme"
import { WarmCard } from "./WarmCard"

const AILA_HOTLINE = "1-800-954-0254"

type Props = {
  /** Override label, e.g. "¿Necesitas ayuda?" or "Crisis support" */
  label?: string
}

export function SupportPill({ label = "¿Necesitas hablar?" }: Props) {
  const [open, setOpen] = useState(false)
  const navigation = useNavigation<{ navigate: (s: string) => void }>()

  const goToLexi = () => {
    setOpen(false)
    navigation.navigate("Chat")
  }

  const callAILA = () => {
    Linking.openURL(`tel:${AILA_HOTLINE.replace(/-/g, "")}`)
  }

  return (
    <>
      <View style={styles.pillContainer} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <View style={styles.pill}>
            <View style={styles.pulse}>
              <View style={styles.pulseDot} />
            </View>
            <Text style={styles.pillLabel}>{label}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={styles.sheetWrap}
          >
            <WarmCard intensity="elevated" style={styles.sheet}>
              <Text style={styles.eyebrow}>Estamos contigo</Text>
              <Text style={styles.headline}>¿En qué te podemos ayudar ahora?</Text>
              <Text style={styles.body}>
                Si te sientes perdida o esto te abruma, está bien. Empieza
                chateando con Lexi (gratis, en español, 24/7) o conecta con un
                abogado verificado.
              </Text>

              <TouchableOpacity onPress={goToLexi} style={styles.ctaPrimary}>
                <Text style={styles.ctaPrimaryText}>Hablar con Lexi gratis</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setOpen(false)
                  // Navigate to Resources tab and open the AttorneyDirectory inside.
                  // Using 'any' typing here because SupportPill is mounted at root
                  // and doesn't know which navigator wraps it.
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ;(navigation as any).navigate("Resources", { screen: "AttorneyDirectory" })
                }}
                style={styles.ctaSecondary}
              >
                <Text style={styles.ctaSecondaryText}>Buscar abogado humano</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                onPress={callAILA}
                style={styles.crisisRow}
                accessibilityRole="button"
                accessibilityLabel="Llamar a la línea AILA en caso de emergencia migratoria"
              >
                <Text style={styles.crisisLabel}>Emergencia migratoria</Text>
                <Text style={styles.crisisHint}>
                  Si estás detenida por ICE o enfrentas deportación inminente,
                  llama ahora: {AILA_HOTLINE}
                </Text>
              </TouchableOpacity>
            </WarmCard>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  pillContainer: {
    position: "absolute",
    right: spacing.base,
    bottom: spacing["5xl"] + spacing.lg, // sit above FloatingTabBar
    zIndex: 50,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warm.cream,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.warm,
    shadowColor: colors.warm.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
    gap: spacing.sm,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warm.sage,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
    color: colors.warm.ink,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 21, 48, 0.45)",
    justifyContent: "flex-end",
  },
  sheetWrap: {
    padding: spacing.base,
  },
  sheet: {
    width: "100%",
  },
  eyebrow: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.warm.clay,
  },
  headline: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 18,
    color: colors.warm.ink,
    marginTop: spacing.xs,
  },
  body: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.warm.inkSoft,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  ctaPrimary: {
    backgroundColor: colors.warm.clay,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  ctaPrimaryText: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 13,
    color: colors.warm.cream,
    letterSpacing: 0.4,
  },
  ctaSecondary: {
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.warm,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  ctaSecondaryText: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 13,
    color: colors.warm.ink,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.warm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  crisisRow: {
    paddingVertical: spacing.sm,
  },
  crisisLabel: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.status.urgentWarm,
  },
  crisisHint: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.warm.inkSoft,
    marginTop: spacing.xs,
    lineHeight: 17,
  },
})
