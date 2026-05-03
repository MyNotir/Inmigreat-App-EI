import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard } from './GlassCard';
import { useViewTranslation } from '../../i18n';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';
import type { AppAlertAction, AppAlertConfig, AppAlertTone } from '../../types/alerts';

export interface AppAlertModalProps {
  visible: boolean;
  alert: AppAlertConfig | null;
  onDismiss: () => void;
  onActionPress: (action?: AppAlertAction) => void;
}

const buildToneStyles = (tx: (key: string, fallback: string) => string): Record<AppAlertTone, {
  glyph: string;
  label: string;
  color: string;
  background: string;
  border: string;
}> => ({
  info: {
    glyph: 'i',
    label: tx('alert.tone.info', 'Aviso'),
    color: colors.accent,
    background: `${colors.accent}15`,
    border: `${colors.accent}30`,
  },
  success: {
    glyph: '✓',
    label: tx('alert.tone.success', 'Listo'),
    color: colors.success,
    background: `${colors.success}15`,
    border: `${colors.success}30`,
  },
  warning: {
    glyph: '!',
    label: tx('alert.tone.warning', 'Atencion'),
    color: colors.warning,
    background: `${colors.warning}18`,
    border: `${colors.warning}30`,
  },
  error: {
    glyph: '!',
    label: tx('alert.tone.error', 'Error'),
    color: colors.error,
    background: `${colors.error}14`,
    border: `${colors.error}26`,
  },
});

export const AppAlertModal: React.FC<AppAlertModalProps> = ({
  visible,
  alert,
  onDismiss,
  onActionPress,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useViewTranslation('common');
  const tx = (key: string, fallback: string) => t(key, { defaultValue: fallback });

  if (!alert) {
    return null;
  }

  const tone = buildToneStyles(tx)[alert.tone || 'info'];
  const actions = alert.actions?.length ? alert.actions : [{ label: tx('alert.actions.acknowledge', 'Entendido') }];
  const stackActions = actions.length > 2;
  const primaryActionColor = tone.color;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={alert.dismissible === false ? undefined : onDismiss}
        />
        <View
          style={[
            styles.contentWrap,
            {
              paddingTop: insets.top + spacing.xl,
              paddingBottom: insets.bottom + spacing.xl,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.cardWrap}>
            <GlassCard style={styles.card} borderRadius={borderRadius['3xl']} opacity={0.86} blurIntensity={30}>
              <View style={[styles.cardGlow, styles.cardGlowPrimary, { backgroundColor: `${tone.color}15` }]} />
              <View style={[styles.cardGlow, styles.cardGlowSecondary, { backgroundColor: `${colors.accent}10` }]} />

              <View style={styles.headerRow}>
                <View style={[styles.iconShell, { borderColor: `${tone.color}18`, backgroundColor: `${tone.color}10` }]}>
                  <View style={[styles.iconBadge, { backgroundColor: tone.background, borderColor: tone.border }]}> 
                    <Text style={[styles.iconGlyph, { color: tone.color }]}>{tone.glyph}</Text>
                  </View>
                </View>

                <View style={styles.headerCopy}>
                  <View style={[styles.tonePill, { backgroundColor: tone.background, borderColor: tone.border }]}> 
                    <View style={[styles.tonePillDot, { backgroundColor: tone.color }]} />
                    <Text style={[styles.tonePillText, { color: tone.color }]}>{tone.label}</Text>
                  </View>

                  <Text style={styles.title}>{alert.title}</Text>
                </View>
              </View>

              <View style={styles.bodyContent}>
                <Text style={styles.message}>{alert.message}</Text>

                <View style={[styles.actions, stackActions && styles.actionsStacked]}>
                  {actions.map((action, index) => {
                    const actionStyle = action.style || 'default';
                    const isCancel = actionStyle === 'cancel';
                    const isDestructive = actionStyle === 'destructive';
                    return (
                      <TouchableOpacity
                        key={`${action.label}_${index}`}
                        style={[
                          styles.actionButton,
                          stackActions ? styles.actionButtonStacked : styles.actionButtonInline,
                          isCancel
                            ? styles.actionButtonCancel
                            : [
                                styles.actionButtonPrimary,
                                {
                                  backgroundColor: isDestructive ? colors.error : primaryActionColor,
                                  borderColor: isDestructive ? `${colors.error}60` : `${primaryActionColor}48`,
                                },
                              ],
                        ]}
                        onPress={() => onActionPress(action)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.actionButtonText,
                            isCancel && styles.actionButtonTextCancel,
                          ]}
                        >
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </GlassCard>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.34)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  contentWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 1,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 430,
  },
  card: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
    borderColor: 'rgba(255,255,255,0.52)',
    ...shadows['2xl'],
  },
  cardGlow: {
    position: 'absolute',
    borderRadius: borderRadius.full,
  },
  cardGlowPrimary: {
    width: 168,
    height: 168,
    top: -80,
    right: -36,
  },
  cardGlowSecondary: {
    width: 120,
    height: 120,
    bottom: -54,
    left: -24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  iconShell: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: spacing.base,
  },
  iconBadge: {
    width: 58,
    height: 58,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconGlyph: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.extrabold,
  },
  headerCopy: {
    flex: 1,
  },
  tonePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  tonePillDot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  tonePillText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.tight,
  },
  bodyContent: {
    paddingLeft: 92,
  },
  message: {
    fontSize: typography.fontSize.md,
    lineHeight: typography.fontSize.md * typography.lineHeight.normal,
    color: colors.text.secondary,
  },
  actions: {
    marginTop: spacing.xl,
    flexDirection: 'column',
    gap: spacing.sm,
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  actionButton: {
    minHeight: 50,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    width: '100%',
  },
  actionButtonPrimary: {
    borderWidth: 1,
    ...shadows.md,
  },
  actionButtonInline: {
    width: '100%',
  },
  actionButtonStacked: {
    width: '100%',
  },
  actionButtonCancel: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  actionButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.wide,
  },
  actionButtonTextCancel: {
    color: colors.text.primary,
  },
});

export default AppAlertModal;