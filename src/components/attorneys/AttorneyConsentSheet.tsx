/**
 * AttorneyConsentSheet — opt-in flow for sharing user data with an attorney.
 *
 * EI rule: nothing leaves the user's device until they explicitly opt in.
 * Each piece of data is its own toggle (name, email, phone, case type,
 * case summary). Plain language: "Le compartes esto?" not "Authorize the
 * disclosure of personally identifiable information."
 *
 * The sheet is a Modal anchored to the bottom; the user can close at any
 * time and nothing is sent until they tap the final CTA.
 */

import { useMemo, useState } from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native"

import { WarmCard } from "@/components/common/WarmCard"
import { WarmButton } from "@/components/common/WarmButton"
import { WarmInput } from "@/components/common/WarmInput"
import { borderRadius, colors, spacing, typography } from "@/styles/theme"
import type {
  Attorney,
  CaseTypeMatch,
  ContactConsent,
  ContactPreference,
  TimeWindow,
} from "@/types/attorney"

type Props = {
  visible: boolean
  attorney: Attorney
  onClose: () => void
  onConfirm: (consent: ContactConsent, urgent: boolean) => Promise<void> | void
  /** Pre-filled values from the user's profile, all optional. */
  defaults?: {
    name?: string
    email?: string
    phone?: string
    caseType?: CaseTypeMatch
  }
}

const PREFERENCES: Array<{ value: ContactPreference; label: string; hint: string }> = [
  { value: "phone", label: "Llamada", hint: "Más rápido para temas urgentes" },
  { value: "email", label: "Correo", hint: "Tienes la respuesta por escrito" },
  { value: "video", label: "Video", hint: "Tipo Zoom · 15 min" },
]

const WINDOWS: Array<{ value: TimeWindow; label: string }> = [
  { value: "morning", label: "Mañanas" },
  { value: "afternoon", label: "Tardes" },
  { value: "evening", label: "Noches" },
  { value: "any", label: "Cuando puedas" },
]

export function AttorneyConsentSheet({ visible, attorney, onClose, onConfirm, defaults }: Props) {
  const [shareName, setShareName] = useState(true)
  const [shareEmail, setShareEmail] = useState(Boolean(defaults?.email))
  const [sharePhone, setSharePhone] = useState(Boolean(defaults?.phone))
  const [shareCaseType, setShareCaseType] = useState(Boolean(defaults?.caseType))
  const [shareCaseSummary, setShareCaseSummary] = useState(false)
  const [preferredContact, setPreferredContact] = useState<ContactPreference>("phone")
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("any")
  const [note, setNote] = useState("")
  const [urgent, setUrgent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const summaryItems = useMemo(() => {
    const items: string[] = []
    if (shareName && defaults?.name) items.push(`Tu nombre: ${defaults.name}`)
    if (shareEmail && defaults?.email) items.push(`Correo: ${defaults.email}`)
    if (sharePhone && defaults?.phone) items.push(`Teléfono: ${defaults.phone}`)
    if (shareCaseType && defaults?.caseType) items.push(`Tipo de caso: ${defaults.caseType}`)
    if (shareCaseSummary) items.push("Resumen breve de tu caso")
    if (note.trim()) items.push("Tu mensaje")
    if (items.length === 0) {
      items.push("Solo tu preferencia de contacto (sin tu nombre)")
    }
    return items
  }, [shareName, shareEmail, sharePhone, shareCaseType, shareCaseSummary, note, defaults])

  const canSubmit = !submitting

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await onConfirm(
        {
          shareName,
          shareEmail,
          sharePhone,
          shareCaseType,
          shareCaseSummary,
          preferredContact,
          timeWindow,
          note: note.trim() || undefined,
        },
        urgent,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheetWrap}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
          >
            <View style={styles.sheet}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.eyebrow}>CONTACTAR · {attorney.firm.toUpperCase()}</Text>
                <Text style={styles.title}>¿Qué le dejas saber a {attorney.name.split(" ")[0]}?</Text>
                <Text style={styles.subtitle}>
                  Tú decides qué compartimos. Nada sale de aquí hasta que tú toques "Mandar petición".
                </Text>

                {/* Granular consent toggles */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>QUÉ COMPARTIR</Text>
                  <ConsentRow
                    label="Mi nombre"
                    hint={defaults?.name ? defaults.name : "Sin nombre, vas como anónimo"}
                    value={shareName}
                    onChange={setShareName}
                    disabled={!defaults?.name}
                  />
                  <ConsentRow
                    label="Mi correo"
                    hint={defaults?.email ?? "Sin correo, no podemos pasar tu correo"}
                    value={shareEmail}
                    onChange={setShareEmail}
                    disabled={!defaults?.email}
                  />
                  <ConsentRow
                    label="Mi teléfono"
                    hint={defaults?.phone ?? "Sin teléfono guardado en tu perfil"}
                    value={sharePhone}
                    onChange={setSharePhone}
                    disabled={!defaults?.phone}
                  />
                  <ConsentRow
                    label="Tipo de caso"
                    hint={defaults?.caseType ?? "Le ayuda al abogado preparar la primera llamada"}
                    value={shareCaseType}
                    onChange={setShareCaseType}
                    disabled={!defaults?.caseType}
                  />
                  <ConsentRow
                    label="Resumen breve del caso"
                    hint="Lo escribes tú · ahorra tiempo en la primera llamada"
                    value={shareCaseSummary}
                    onChange={setShareCaseSummary}
                  />
                </View>

                {/* Contact preference */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>¿CÓMO QUIERES QUE TE CONTACTE?</Text>
                  <View style={styles.optionGrid}>
                    {PREFERENCES.map((p) => (
                      <Pressable
                        key={p.value}
                        onPress={() => setPreferredContact(p.value)}
                        style={[
                          styles.optionCard,
                          preferredContact === p.value && styles.optionCardActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionLabel,
                            preferredContact === p.value && styles.optionLabelActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                        <Text style={styles.optionHint}>{p.hint}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Time window */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>MEJOR HORARIO</Text>
                  <View style={styles.windowRow}>
                    {WINDOWS.map((w) => (
                      <Pressable
                        key={w.value}
                        onPress={() => setTimeWindow(w.value)}
                        style={[
                          styles.windowChip,
                          timeWindow === w.value && styles.windowChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.windowChipText,
                            timeWindow === w.value && styles.windowChipTextActive,
                          ]}
                        >
                          {w.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Optional note */}
                {shareCaseSummary ? (
                  <View style={styles.section}>
                    <WarmInput
                      label="Cuéntale en 1-2 oraciones lo más importante"
                      placeholder="Ej. Recibí RFE hace 5 días y no sé qué responder."
                      value={note}
                      onChangeText={setNote}
                      multiline
                      numberOfLines={3}
                      maxLength={300}
                      helper={`${300 - note.length} caracteres restantes`}
                    />
                  </View>
                ) : null}

                {/* Urgent toggle */}
                {attorney.availability.emergencyAvailable ? (
                  <View style={styles.section}>
                    <Pressable
                      onPress={() => setUrgent((v) => !v)}
                      style={[styles.urgentRow, urgent && styles.urgentRowActive]}
                    >
                      <View style={styles.urgentBody}>
                        <Text style={styles.urgentLabel}>¿Es urgente?</Text>
                        <Text style={styles.urgentHint}>
                          ICE me detuvo · audiencia mañana · NTA recibido. {attorney.name.split(" ")[0]} puede responder en horas, no días.
                        </Text>
                      </View>
                      <View style={[styles.urgentToggle, urgent && styles.urgentToggleActive]}>
                        {urgent ? <Text style={styles.urgentToggleText}>SÍ</Text> : null}
                      </View>
                    </Pressable>
                  </View>
                ) : null}

                {/* Summary preview */}
                <WarmCard intensity="calm" style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Esto es lo que mandamos</Text>
                  {summaryItems.map((item) => (
                    <View key={item} style={styles.summaryRow}>
                      <Text style={styles.summaryDot}>·</Text>
                      <Text style={styles.summaryItem}>{item}</Text>
                    </View>
                  ))}
                  <Text style={styles.summaryFooter}>
                    No compartimos tu dirección, fecha de nacimiento, A-Number, ni documentos.
                  </Text>
                </WarmCard>

                {/* Actions */}
                <View style={styles.actions}>
                  <WarmButton
                    label={submitting ? "Enviando..." : "Mandar petición"}
                    onPress={handleConfirm}
                    variant="primary"
                    fullWidth
                    disabled={!canSubmit}
                  />
                  <View style={{ height: spacing.sm }} />
                  <WarmButton
                    label="Cancelar"
                    onPress={onClose}
                    variant="ghost"
                    fullWidth
                    disabled={submitting}
                  />
                </View>

                <View style={{ height: spacing["3xl"] }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function ConsentRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string
  hint: string
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <View style={[styles.consentRow, disabled && styles.consentRowDisabled]}>
      <View style={styles.consentBody}>
        <Text style={styles.consentLabel}>{label}</Text>
        <Text style={styles.consentHint}>{hint}</Text>
      </View>
      <Switch
        value={value && !disabled}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.warm.sand, true: colors.warm.sage }}
        thumbColor={colors.warm.cream}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(59, 46, 42, 0.55)",
    justifyContent: "flex-end",
  },
  sheetWrap: {
    width: "100%",
  },
  sheet: {
    backgroundColor: colors.warm.cream,
    borderTopLeftRadius: borderRadius["3xl"],
    borderTopRightRadius: borderRadius["3xl"],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    maxHeight: "92%",
  },
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: -0.4,
    lineHeight: typography.fontSize.xl * 1.2,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * 1.45,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.clay,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.warm,
  },
  consentRowDisabled: {
    opacity: 0.5,
  },
  consentBody: {
    flex: 1,
    paddingRight: spacing.md,
  },
  consentLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  consentHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkFaint,
    marginTop: 2,
    lineHeight: typography.fontSize.xs * 1.4,
  },
  optionGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  optionCard: {
    flex: 1,
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm + 2,
  },
  optionCardActive: {
    backgroundColor: colors.warm.sand,
    borderColor: colors.warm.clay,
  },
  optionLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
  },
  optionLabelActive: {
    color: colors.warm.clay,
  },
  optionHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkFaint,
    marginTop: 2,
    lineHeight: typography.fontSize.xs * 1.4,
  },
  windowRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  windowChip: {
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  windowChipActive: {
    backgroundColor: colors.warm.clay,
    borderColor: colors.warm.clay,
  },
  windowChipText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
  },
  windowChipTextActive: {
    color: colors.warm.cream,
  },
  urgentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warm.cream,
    borderWidth: 1,
    borderColor: colors.border.warm,
    borderRadius: borderRadius.large,
    padding: spacing.md,
  },
  urgentRowActive: {
    backgroundColor: colors.warm.peach,
    borderColor: colors.status.urgentWarm,
  },
  urgentBody: {
    flex: 1,
    paddingRight: spacing.md,
  },
  urgentLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
  },
  urgentHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    marginTop: 2,
    lineHeight: typography.fontSize.xs * 1.45,
  },
  urgentToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.warm.sand,
    borderWidth: 1,
    borderColor: colors.border.warm,
    alignItems: "center",
    justifyContent: "center",
  },
  urgentToggleActive: {
    backgroundColor: colors.status.urgentWarm,
    borderColor: colors.status.urgentWarm,
  },
  urgentToggleText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.cream,
    letterSpacing: 0.5,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.warm.ink,
    letterSpacing: 0.3,
  },
  summaryRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  summaryDot: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.warm.clay,
    marginRight: spacing.sm,
    lineHeight: 18,
  },
  summaryItem: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.ink,
    lineHeight: typography.fontSize.sm * 1.45,
  },
  summaryFooter: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkFaint,
    marginTop: spacing.md,
    lineHeight: typography.fontSize.xs * 1.5,
  },
  actions: {
    marginTop: spacing.lg,
  },
})

export default AttorneyConsentSheet
