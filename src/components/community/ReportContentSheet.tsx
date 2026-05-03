import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard } from '../common/GlassCard';
import { useViewTranslation } from '../../i18n';
import {
  COMMUNITY_REPORT_NOTE_MAX_LENGTH,
  COMMUNITY_REPORT_REASON_OPTIONS,
  getCommunityReportReasonLabel,
} from '../../utils/communityReports';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';

export interface ReportContentSheetProps {
  title: string;
  subtitle: string;
  selectedReasonCode: string;
  note: string;
  onSelectReason: (reasonCode: string) => void;
  onNoteChange: (note: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const ReportContentSheet: React.FC<ReportContentSheetProps> = ({
  title,
  subtitle,
  selectedReasonCode,
  note,
  onSelectReason,
  onNoteChange,
  onCancel,
  onSubmit,
  isSubmitting = false,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useViewTranslation('community');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <GlassCard
        style={styles.sheetCard}
        contentStyle={styles.sheetCardContent}
        opacity={1}
        blurIntensity={0}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View
            style={[
              styles.headerRow,
              Platform.OS === 'ios'
                ? { paddingTop: Math.max(insets.top, spacing.base) + spacing.sm }
                : null,
            ]}
          >
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{tx('reportSheet.eyebrow', 'Moderacion')}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.closeButton}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>{tx('reportSheet.sections.reason', 'Motivo principal')}</Text>
          <View style={styles.reasonOptionsWrap}>
            {COMMUNITY_REPORT_REASON_OPTIONS.map((reason) => {
              const isSelected = selectedReasonCode === reason.code;

              return (
                <TouchableOpacity
                  key={reason.code}
                  style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                  onPress={() => onSelectReason(reason.code)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextSelected]}>
                    {getCommunityReportReasonLabel(reason.code, tx)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.noteHeaderRow}>
            <Text style={styles.sectionTitle}>{tx('reportSheet.sections.note', 'Nota opcional')}</Text>
            <Text style={styles.noteCounter}>{note.length}/{COMMUNITY_REPORT_NOTE_MAX_LENGTH}</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder={tx('reportSheet.notePlaceholder', 'Anade contexto si ayuda a la revision...')}
            placeholderTextColor={colors.text.tertiary}
            value={note}
            onChangeText={onNoteChange}
            multiline
            maxLength={COMMUNITY_REPORT_NOTE_MAX_LENGTH}
            textAlignVertical="top"
          />
          <Text style={styles.noteHint}>
            {tx('reportSheet.noteHint', 'La nota es breve y opcional. Solo se comparte con moderacion.')}
          </Text>
        </ScrollView>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>{tx('reportSheet.buttons.cancel', 'Cancelar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={onSubmit}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting
                  ? tx('reportSheet.buttons.submitting', 'Enviando...')
                  : tx('reportSheet.buttons.submit', 'Enviar reporte')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GlassCard>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  sheetCard: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: colors.background.primary,
  },
  sheetCardContent: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.base,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  headerCopy: {
    flex: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
  },
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  reasonOptionsWrap: {
    gap: spacing.sm,
  },
  reasonOption: {
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reasonOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}10`,
  },
  reasonOptionText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  reasonOptionTextSelected: {
    color: colors.accent,
    fontFamily: typography.fontFamily.semibold,
  },
  noteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  noteCounter: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  noteInput: {
    minHeight: 110,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  noteHint: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xs,
    lineHeight: 18,
    color: colors.text.tertiary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.md,
  },
  cancelButton: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
  },
  submitButton: {
    backgroundColor: colors.error,
  },
  submitButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.cream,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ReportContentSheet;