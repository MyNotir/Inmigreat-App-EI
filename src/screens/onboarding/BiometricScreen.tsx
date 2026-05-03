/**
 * BiometricScreen — Emotional Intelligence redesign.
 *
 * Final onboarding consent screen. Frames Face ID / Touch ID as a calm
 * convenience ('Tu cara, tu llave') rather than a security threat. Two
 * sage check rows for benefits, primary clay button to activate, ghost
 * button to skip. Biometric availability + auth logic preserved.
 */

import React, { useEffect, useState } from "react"
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native"
import Animated from "react-native-reanimated"
import Svg, { Path, Rect } from "react-native-svg"
import type { StackNavigationProp } from "@react-navigation/stack"

import { WarmScreen } from "../../components/common/WarmScreen"
import { WarmCard } from "../../components/common/WarmCard"
import { WarmButton } from "../../components/common/WarmButton"
import { useFadeUp, usePopIn } from "../../styles/animations"
import { colors, spacing, typography } from "../../styles/theme"
import type { OnboardingStackParamList } from "../../types/navigation"
import { useAuth } from "../../context/AuthContext"
import {
  authenticateWithBiometric,
  checkBiometricAvailability,
  type BiometricAvailability,
} from "../../services/biometric"
import { useViewTranslation } from "../../i18n"

interface BiometricScreenProps {
  navigation: StackNavigationProp<OnboardingStackParamList, "Biometric">
}

const FaceIdIcon: React.FC<{ size?: number; color?: string }> = ({ size = 70, color = colors.warm.clay }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M9 9v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M15 9v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M12 11v2.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M9 16c.5 1 1.5 1.5 3 1.5s2.5-.5 3-1.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
)

const FingerprintIcon: React.FC<{ size?: number; color?: string }> = ({ size = 70, color = colors.warm.clay }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C9.24 2 7 4.24 7 7v4c0 2.76 2.24 5 5 5s5-2.24 5-5V7c0-2.76-2.24-5-5-5z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M12 5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      fill="none"
    />
    <Path d="M4 12c0 4.42 3.58 8 8 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    <Path d="M20 12c0 4.42-3.58 8-8 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    <Path d="M12 22v-2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
)

const ShieldCheckIcon: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = colors.warm.sage }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

export const BiometricScreen: React.FC<BiometricScreenProps> = ({ navigation: _navigation }) => {
  const { t } = useViewTranslation("onboarding")
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) })

  const [isLoading, setIsLoading] = useState(false)
  const [biometricInfo, setBiometricInfo] = useState<BiometricAvailability | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { setBiometricAuth } = useAuth()

  const { animatedStyle: iconStyle, popIn: iconPopIn } = usePopIn({ initialScale: 0.55, duration: 520, delay: 100 })
  const { animatedStyle: titleStyle, fadeIn: titleFadeIn } = useFadeUp({ duration: 420, delay: 220, distance: 18 })
  const { animatedStyle: subtitleStyle, fadeIn: subtitleFadeIn } = useFadeUp({ duration: 420, delay: 320, distance: 14 })
  const { animatedStyle: cardStyle, fadeIn: cardFadeIn } = useFadeUp({ duration: 460, delay: 420, distance: 16 })
  const { animatedStyle: btnStyle, fadeIn: btnFadeIn } = useFadeUp({ duration: 420, delay: 540, distance: 12 })

  useEffect(() => {
    checkBiometricAvailability().then(setBiometricInfo)
    iconPopIn()
    titleFadeIn()
    subtitleFadeIn()
    cardFadeIn()
    btnFadeIn()
  }, [iconPopIn, titleFadeIn, subtitleFadeIn, cardFadeIn, btnFadeIn])

  const handleEnableBiometric = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const authResult = await authenticateWithBiometric({
        promptMessage: tx("biometric.prompt.setup", "Configura {{biometricName}}", {
          biometricName: biometricInfo?.biometricName || "biometría",
        }),
        cancelLabel: tx("biometric.prompt.cancel", "Cancelar"),
      })

      if (!authResult.success) {
        if (authResult.cancelled) {
          setIsLoading(false)
          return
        }
        setError(authResult.error || tx("biometric.error.setup", "Error al configurar biometría"))
        setIsLoading(false)
        return
      }
      await setBiometricAuth(true)
    } catch (err) {
      console.error("[BiometricScreen] Error enabling biometric:", err)
      setError(tx("biometric.error.enable", "Error al configurar la autenticación biométrica"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = async () => {
    setIsLoading(true)
    try {
      await setBiometricAuth(false)
    } catch (err) {
      console.error("[BiometricScreen] Error skipping biometric:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const BiometricIcon = Platform.OS === "ios" ? FaceIdIcon : FingerprintIcon
  const biometricName = biometricInfo?.biometricName || (Platform.OS === "ios" ? "Face ID" : "Touch ID")
  const isBiometricAvailable = biometricInfo?.hasHardware && biometricInfo?.isEnrolled

  return (
    <WarmScreen edges={["top", "right", "left", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Animated.View style={[styles.iconWrap, iconStyle]}>
            <View style={styles.iconBg}>
              <BiometricIcon size={64} color={colors.warm.clay} />
            </View>
          </Animated.View>

          <Animated.View style={titleStyle}>
            <Text style={styles.eyebrow}>
              {tx("biometric.eyebrow", "ÚLTIMO PASO")}
            </Text>
            <Text style={styles.title}>
              {tx("biometric.title", "Tu cara, tu llave.")}
            </Text>
          </Animated.View>

          <Animated.View style={subtitleStyle}>
            <Text style={styles.subtitle}>
              {tx(
                "biometric.subtitle",
                "Activa {{biometricName}} y entras al app sin escribir tu contraseña cada vez.",
                { biometricName },
              )}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.cardWrap, cardStyle]}>
            <WarmCard intensity="calm">
              <View style={styles.benefitRow}>
                <ShieldCheckIcon size={22} color={colors.warm.sage} />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>
                    {tx("biometric.benefit.secureTitle", "Solo tú entras")}
                  </Text>
                  <Text style={styles.benefitDescription}>
                    {tx(
                      "biometric.benefit.secureDescription",
                      "Tu rostro o huella son la única manera de abrir tu caso.",
                    )}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.benefitRow}>
                <ShieldCheckIcon size={22} color={colors.warm.sage} />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>
                    {tx("biometric.benefit.fastTitle", "Acceso en 1 segundo")}
                  </Text>
                  <Text style={styles.benefitDescription}>
                    {tx(
                      "biometric.benefit.fastDescription",
                      "Abre el app, mira la cámara, y ya estás dentro. Sin teclear nada.",
                    )}
                  </Text>
                </View>
              </View>
            </WarmCard>
          </Animated.View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!isBiometricAvailable ? (
            <View style={styles.unavailable}>
              <Text style={styles.unavailableText}>
                {biometricInfo?.hasHardware
                  ? tx(
                      "biometric.unavailable.configured",
                      "{{biometricName}} no está configurado en este dispositivo.",
                      { biometricName },
                    )
                  : tx(
                      "biometric.unavailable.unsupported",
                      "Este dispositivo no soporta autenticación biométrica.",
                    )}
              </Text>
            </View>
          ) : null}
        </View>

        <Animated.View style={[styles.btnBlock, btnStyle]}>
          {isBiometricAvailable ? (
            <WarmButton
              label={tx("biometric.action.activate", "Activar {{biometricName}}", { biometricName })}
              onPress={handleEnableBiometric}
              variant="primary"
              fullWidth
              disabled={isLoading}
              trailingIcon={
                isLoading ? <ActivityIndicator color={colors.warm.cream} size="small" /> : undefined
              }
            />
          ) : null}
          <View style={{ height: spacing.sm }} />
          <WarmButton
            label={
              isBiometricAvailable
                ? tx("biometric.action.notNow", "Ahora no")
                : tx("biometric.action.continue", "Continuar")
            }
            onPress={handleSkip}
            variant="ghost"
            fullWidth
            disabled={isLoading}
          />
        </Animated.View>
      </View>
    </WarmScreen>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.xl,
    justifyContent: "space-between",
  },
  top: {
    alignItems: "center",
  },
  iconWrap: {
    marginBottom: spacing.xl,
  },
  iconBg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.warm.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  eyebrow: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.warm.clay,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.md * 1.45,
    textAlign: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  cardWrap: {
    width: "100%",
    marginTop: spacing.xl,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  benefitText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  benefitTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  benefitDescription: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    marginTop: spacing.xs,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.warm,
    marginVertical: spacing.md,
  },
  errorBox: {
    backgroundColor: "rgba(167, 90, 63, 0.12)",
    borderWidth: 1,
    borderColor: colors.status.urgentWarm,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.status.urgentWarm,
    textAlign: "center",
  },
  unavailable: {
    backgroundColor: colors.warm.sand,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
  unavailableText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    textAlign: "center",
  },
  btnBlock: {
    width: "100%",
    marginTop: spacing.lg,
  },
})

export default BiometricScreen
