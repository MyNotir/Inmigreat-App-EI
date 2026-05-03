/**
 * EIPreviewScreen — Live showcase of the Emotional Intelligence redesign.
 *
 * Standalone screen accessible from Splash without auth. Renders every
 * EI primitive (WarmCard at all 3 intensities, StressBanner elevated +
 * acute, ToneAwareMessageBubble across all stress tiers, SupportPill
 * persistent in the corner) populated with realistic mock case data so
 * stakeholders can feel the redesign on a real device before any wiring
 * to live data.
 */

import { useState } from "react"
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useNavigation } from "@react-navigation/native"
import { borderRadius, colors, spacing, typography } from "../styles/theme"
import { WarmCard } from "../components/common/WarmCard"
import { StressBanner } from "../components/common/StressBanner"
import { SupportPill } from "../components/common/SupportPill"
import { ToneAwareMessageBubble } from "../components/common/ToneAwareMessageBubble"
import { WarmButton } from "../components/common/WarmButton"
import { WarmInput } from "../components/common/WarmInput"
import { WarmListItem } from "../components/common/WarmListItem"
import { WarmHeader } from "../components/common/WarmHeader"
import { WarmDivider } from "../components/common/WarmDivider"

const SECTION_GAP = spacing["2xl"]

function SectionLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionEyebrow}>EI · {title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  )
}

export function EIPreviewScreen() {
  const navigation = useNavigation<{ goBack: () => void }>()
  const [scenario, setScenario] = useState<"routine" | "rfe" | "denied">("rfe")

  return (
    <LinearGradient
      colors={colors.background.warmGradient as [string, string, string]}
      style={styles.root}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>EI Preview</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Hero intro */}
        <Text style={styles.eyebrow}>SISTEMA DE DISEÑO</Text>
        <Text style={styles.heroTitle}>
          Emotional Intelligence design,{" "}
          <Text style={styles.heroAccent}>en vivo</Text>.
        </Text>
        <Text style={styles.heroLead}>
          Esta pantalla muestra cada primitivo del redesign con datos reales
          de caso para que sientas cómo se comporta el app en un teléfono real.
          Probá el SupportPill abajo a la derecha — siempre está ahí.
        </Text>

        {/* Scenario switcher */}
        <View style={styles.switcher}>
          {[
            { key: "routine", label: "Rutina" },
            { key: "rfe", label: "RFE" },
            { key: "denied", label: "Negación" },
          ].map((s) => {
            const active = scenario === s.key
            return (
              <TouchableOpacity
                key={s.key}
                onPress={() => setScenario(s.key as typeof scenario)}
                style={[styles.switchPill, active && styles.switchPillActive]}
              >
                <Text
                  style={[
                    styles.switchPillText,
                    active && styles.switchPillTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* StressBanner — context-aware acknowledgement */}
        <SectionLabel
          title="StressBanner"
          subtitle="Reconoce la emoción antes de la acción"
        />
        {scenario === "rfe" && (
          <StressBanner
            context="RFE recibido · hace 2h"
            headline="Sabemos que esto asusta. Es muy común y se resuelve en 1 de cada 5 casos. Tienes 87 días."
            ctaLabel="Ver qué necesitamos"
            level="elevated"
            onCta={() => {}}
          />
        )}
        {scenario === "denied" && (
          <StressBanner
            context="Decisión USCIS · hoy"
            headline="Llegó una negación. Esto NO termina aquí — tienes 30 días para apelar y muchas se revierten."
            ctaLabel="Ver opciones de apelación"
            level="acute"
            onCta={() => {}}
          />
        )}
        {scenario === "routine" && (
          <View style={styles.calmStateNote}>
            <Text style={styles.calmStateText}>
              ✓ Caso al día. Cuando todo va bien, el banner no aparece — el silencio
              es buena señal.
            </Text>
          </View>
        )}

        {/* WarmCard — three intensities */}
        <SectionLabel
          title="WarmCard"
          subtitle="Superficie cálida con grano de papel"
        />

        <WarmCard intensity="calm" style={styles.cardSpacing}>
          <Text style={styles.cardEyebrow}>CALM · sin estrés</Text>
          <Text style={styles.cardTitle}>Tu próxima cita es en 14 días</Text>
          <Text style={styles.cardBody}>
            Biométricos · Centro USCIS Hialeah · 9:00 AM. Te recordamos 3
            días antes con todo lo que hay que llevar.
          </Text>
        </WarmCard>

        <WarmCard intensity="elevated" style={styles.cardSpacing}>
          <Text style={[styles.cardEyebrow, { color: colors.warm.clay }]}>
            ELEVATED · acción esta semana
          </Text>
          <Text style={styles.cardTitle}>Necesitamos prueba de domicilio</Text>
          <Text style={styles.cardBody}>
            USCIS pide Form I-9 actualizado. Sube una factura de luz o lease
            activo — toma 2 minutos. Vence en 4 días.
          </Text>
          <View style={styles.cardCta}>
            <Text style={styles.cardCtaText}>Subir documento →</Text>
          </View>
        </WarmCard>

        <WarmCard intensity="acute" style={styles.cardSpacing}>
          <Text
            style={[styles.cardEyebrow, { color: colors.status.urgentWarm }]}
          >
            ACUTE · vamos juntas paso a paso
          </Text>
          <Text style={styles.cardTitle}>
            Audiencia mañana · Corte de Inmigración Miami, 9:00 AM
          </Text>
          <Text style={styles.cardBody}>
            Sala 4 · Hon. R. Martínez. Llegá 30 min antes con todos tus
            originales y un traductor si no hablas inglés. Lexi tiene una
            práctica de preguntas comunes lista para esta noche.
          </Text>
          <View
            style={[
              styles.cardCta,
              { backgroundColor: colors.status.urgentWarm },
            ]}
          >
            <Text style={[styles.cardCtaText, { color: colors.text.inverse }]}>
              Preparar para mañana →
            </Text>
          </View>
        </WarmCard>

        {/* ToneAwareMessageBubble */}
        <SectionLabel
          title="ToneAwareMessageBubble"
          subtitle="Lexi ajusta su tono al estado emocional del usuario"
        />
        <View style={styles.chatPanel}>
          <ToneAwareMessageBubble
            role="user"
            text="¿Qué llevo a mi cita biométrica?"
          />
          <ToneAwareMessageBubble
            role="lexi"
            text="Necesitas tu I-797 (recibo USCIS), una identificación con foto válida (pasaporte o licencia), y el aviso de tu cita. Llega 30 min antes. ¿Quieres que te mande una checklist?"
            contextUserText="¿Qué llevo a mi cita biométrica?"
          />

          <ToneAwareMessageBubble
            role="user"
            text="Tengo miedo, no sé qué va a pasar con mi caso"
          />
          <ToneAwareMessageBubble
            role="lexi"
            text="Tu caso está en revisión activa con USCIS — hoy en día el tiempo promedio para casos como el tuyo es de 4-6 meses desde biométricos. Eso significa que probablemente tendrás respuesta entre febrero y abril. ¿Quieres que te avise cada vez que cambie algo?"
            contextUserText="Tengo miedo, no sé qué va a pasar con mi caso"
          />

          <ToneAwareMessageBubble
            role="user"
            text="ICE me detuvo en el trabajo, ¿qué hago ahora?"
          />
          <ToneAwareMessageBubble
            role="lexi"
            text="Esto requiere un abogado humano AHORA, no esta IA. Pide hablar con tu abogado antes de firmar nada. Tienes derecho a permanecer en silencio. Te conecto ahora con la línea AILA — son abogados de inmigración disponibles 24/7."
            contextUserText="ICE me detuvo en el trabajo, ¿qué hago ahora?"
            onEscalate={() => {}}
          />
        </View>

        {/* Primitives v2 — atomic building blocks */}
        <SectionLabel
          title="Primitives nuevos"
          subtitle="Atómicos que componen todas las pantallas del redesign"
        />

        <WarmCard intensity="calm" style={styles.cardSpacing}>
          <Text style={styles.primTitle}>WarmHeader</Text>
          <Text style={styles.primSub}>
            Header de pantalla con back, título, soporte y trailing slot.
          </Text>
          <View style={styles.primDemoBox}>
            <WarmHeader
              title="Tu caso"
              supporting="I-485 · Hialeah · próximo paso en 14 días"
              onBack={() => {}}
              intensity="elevated"
            />
          </View>
        </WarmCard>

        <WarmCard intensity="calm" style={styles.cardSpacing}>
          <Text style={styles.primTitle}>WarmInput</Text>
          <Text style={styles.primSub}>
            Tres estados — neutral, foco, error. Sin rojo agresivo.
          </Text>
          <View style={{ gap: spacing.md, marginTop: spacing.base }}>
            <WarmInput
              label="Correo electrónico"
              placeholder="tu@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <WarmInput
              label="A-Number"
              placeholder="A-123 456 789"
              helper="Opcional · 9 dígitos después de la A"
            />
            <WarmInput
              label="Contraseña"
              placeholder="••••••••"
              secureTextEntry
              error="Esa contraseña no coincide. Probemos otra vez."
            />
          </View>
        </WarmCard>

        <WarmCard intensity="calm" style={styles.cardSpacing}>
          <Text style={styles.primTitle}>WarmButton</Text>
          <Text style={styles.primSub}>
            Variantes primary, secondary, ghost. Tonos default, urgent, sage.
          </Text>
          <View style={styles.btnRow}>
            <WarmButton label="Continuar" onPress={() => {}} variant="primary" />
            <WarmButton label="Más tarde" onPress={() => {}} variant="secondary" />
            <WarmButton label="Saltar" onPress={() => {}} variant="ghost" size="sm" />
          </View>
          <WarmDivider label="acción urgente" />
          <View style={styles.btnRow}>
            <WarmButton
              label="Hablar con un humano"
              onPress={() => {}}
              variant="primary"
              tone="urgent"
              fullWidth
            />
          </View>
          <View style={styles.btnRow}>
            <WarmButton
              label="Caso al día"
              onPress={() => {}}
              variant="secondary"
              tone="sage"
            />
          </View>
        </WarmCard>

        <WarmCard intensity="calm" style={styles.cardSpacing}>
          <Text style={styles.primTitle}>WarmListItem</Text>
          <Text style={styles.primSub}>
            Filas para casos, recursos, abogados, settings. attention=true tinte peach.
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
            <WarmListItem
              title="I-485 · Ajuste de Estatus"
              subtitle="Biométricos completados · próximo paso en 14 días"
              meta="ON TRACK"
              onPress={() => {}}
              trailing={<Text style={styles.chev}>›</Text>}
            />
            <WarmListItem
              title="Subir prueba de domicilio"
              subtitle="USCIS pidió Form I-9 actualizado · vence en 4 días"
              meta="ATENCIÓN"
              onPress={() => {}}
              attention
              trailing={<Text style={styles.chev}>›</Text>}
            />
            <WarmListItem
              title="Audiencia · Corte Miami"
              subtitle="Mañana 9:00 AM · Hon. R. Martínez · Sala 4"
              meta="MAÑANA"
              onPress={() => {}}
              attention
              trailing={<Text style={styles.chev}>›</Text>}
            />
          </View>
        </WarmCard>

        {/* Closing block */}
        <View style={styles.closing}>
          <Text style={styles.closingTitle}>El SupportPill siempre está ahí</Text>
          <Text style={styles.closingBody}>
            Mira la esquina inferior derecha → ese pill aparece en cualquier
            pantalla del app. Tap para abrir Lexi gratis, encontrar abogado
            humano, o llamar a la línea AILA en una emergencia migratoria
            real.
          </Text>
        </View>

        <View style={{ height: spacing["5xl"] }} />
      </ScrollView>

      <SupportPill />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["3xl"],
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  back: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: colors.warm.ink,
  },
  topTitle: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.warm.clay,
  },
  eyebrow: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.warm.clay,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 28,
    color: colors.warm.ink,
    marginTop: spacing.sm,
    lineHeight: 34,
  },
  heroAccent: {
    fontFamily: typography.fontFamily.script,
    color: colors.warm.clay,
    fontSize: 32,
  },
  heroLead: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
    color: colors.warm.inkSoft,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  switcher: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 999,
    padding: 4,
    alignSelf: "flex-start",
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  switchPill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  switchPillActive: {
    backgroundColor: colors.warm.clay,
  },
  switchPillText: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 12,
    color: colors.warm.inkSoft,
  },
  switchPillTextActive: {
    color: colors.text.inverse,
  },
  sectionLabel: {
    marginTop: SECTION_GAP,
    marginBottom: spacing.md,
  },
  sectionEyebrow: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.warm.clay,
  },
  sectionSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.warm.inkSoft,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  calmStateNote: {
    backgroundColor: "rgba(184, 201, 185, 0.25)",
    borderColor: colors.warm.sage,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
  },
  calmStateText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.warm.ink,
    lineHeight: 19,
  },
  cardSpacing: { marginBottom: spacing.md },
  cardEyebrow: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.warm.sage,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 18,
    color: colors.warm.ink,
    marginTop: spacing.xs,
    lineHeight: 24,
  },
  cardBody: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.warm.inkSoft,
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  cardCta: {
    backgroundColor: colors.warm.clay,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginTop: spacing.base,
  },
  cardCtaText: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 12,
    color: colors.text.inverse,
  },
  chatPanel: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: colors.border.warm,
    borderWidth: 1,
    borderRadius: borderRadius["2xl"],
    padding: spacing.base,
    gap: spacing.xs,
  },
  closing: {
    marginTop: SECTION_GAP,
    padding: spacing.lg,
    backgroundColor: "rgba(184, 201, 185, 0.15)",
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(184, 201, 185, 0.45)",
  },
  closingTitle: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 15,
    color: colors.warm.ink,
  },
  closingBody: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.warm.inkSoft,
    marginTop: spacing.sm,
    lineHeight: 19,
  },
  primTitle: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 17,
    color: colors.warm.ink,
  },
  primSub: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.warm.inkSoft,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  primDemoBox: {
    marginTop: spacing.base,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  btnRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
    alignItems: "center",
  },
  chev: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
    color: colors.warm.clay,
  },
})

export default EIPreviewScreen
