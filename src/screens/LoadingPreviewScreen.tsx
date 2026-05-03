import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  BrandedLoadingState,
  type BrandedLoadingStateVariant,
} from '../components/common/BrandedLoadingState';
import { AnimatedBackground } from '../components/common/AnimatedBackground';
import { GlassCard } from '../components/common/GlassCard';
import { useViewTranslation } from '../i18n';
import { getMainTabAccent } from '../navigation/tabAccents';
import { borderRadius, colors, spacing, typography } from '../styles/theme';
import type { CasesStackParamList } from '../types/navigation';

type LoadingPreviewNavigationProp = StackNavigationProp<CasesStackParamList, 'LoadingPreview'>;
type AccentOptionId = 'cases' | 'community' | 'resources' | 'chat';
type LoadingPreviewTranslate = (key: string, fallback: string) => string;

const buildVariantOptions = (tx: LoadingPreviewTranslate): Array<{
  id: BrandedLoadingStateVariant;
  label: string;
  title: string;
  subtitle: string;
}> => [
  {
    id: 'cases',
    label: tx('variants.cases.label', 'Casos'),
    title: tx('variants.cases.title', 'Cargando tus casos'),
    subtitle: tx('variants.cases.subtitle', 'Sincronizando timeline, alertas y ultimo estado.'),
  },
  {
    id: 'community',
    label: tx('variants.community.label', 'Comunidad'),
    title: tx('variants.community.title', 'Cargando tu comunidad'),
    subtitle: tx('variants.community.subtitle', 'Preparando grupos, actividad y conversaciones clave.'),
  },
];

const buildAccentOptions = (tx: LoadingPreviewTranslate): Array<{ id: AccentOptionId; label: string; color: string }> => [
  { id: 'cases', label: tx('accents.cases', 'Casos'), color: getMainTabAccent('Cases') },
  { id: 'community', label: tx('accents.community', 'Comunidad'), color: getMainTabAccent('Community') },
  { id: 'resources', label: tx('accents.resources', 'Recursos'), color: getMainTabAccent('Resources') },
  { id: 'chat', label: tx('accents.chat', 'Chat'), color: getMainTabAccent('Chat') },
];

export const LoadingPreviewScreen: React.FC = () => {
  const navigation = useNavigation<LoadingPreviewNavigationProp>();
  const { t } = useViewTranslation('loading-preview');
  const tx = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [variant, setVariant] = useState<BrandedLoadingStateVariant>('cases');
  const [accentId, setAccentId] = useState<AccentOptionId>('cases');
  const variantOptions = useMemo(() => buildVariantOptions(tx), [tx]);
  const accentOptions = useMemo(() => buildAccentOptions(tx), [tx]);

  const selectedVariant = useMemo(
    () => variantOptions.find((option) => option.id === variant) ?? variantOptions[0],
    [variant, variantOptions],
  );
  const selectedAccent = useMemo(
    () => accentOptions.find((option) => option.id === accentId) ?? accentOptions[0],
    [accentId, accentOptions],
  );

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>{tx('header.back', 'Volver')}</Text>
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>{tx('header.eyebrow', 'Preview')}</Text>
            <Text style={styles.headerTitle}>{tx('header.title', 'Loading State')}</Text>
            <Text style={styles.headerSubtitle}>
              {tx(
                'header.subtitle',
                'Esta vista monta el componente real para ajustar color, copy y proporciones.',
              )}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <GlassCard style={styles.controlsCard}>
            <Text style={styles.controlLabel}>{tx('controls.variant', 'Variante')}</Text>
            <View style={styles.controlRow}>
              {variantOptions.map((option) => {
                const selected = option.id === variant;

                return (
                  <TouchableOpacity
                    key={option.id}
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    onPress={() => setVariant(option.id)}
                    style={[
                      styles.controlPill,
                      selected && styles.controlPillSelected,
                      selected && { borderColor: selectedAccent.color },
                    ]}
                  >
                    <Text
                      style={[
                        styles.controlPillText,
                        selected && { color: selectedAccent.color },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.controlLabel}>{tx('controls.accent', 'Acento')}</Text>
            <View style={styles.controlRow}>
              {accentOptions.map((option) => {
                const selected = option.id === accentId;

                return (
                  <TouchableOpacity
                    key={option.id}
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    onPress={() => setAccentId(option.id)}
                    style={[
                      styles.colorPill,
                      selected && styles.controlPillSelected,
                      selected && { borderColor: option.color },
                    ]}
                  >
                    <View style={[styles.colorDot, { backgroundColor: option.color }]} />
                    <Text
                      style={[
                        styles.controlPillText,
                        selected && { color: option.color },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{tx('controls.current', 'Actual')}</Text>
              <Text style={styles.metaValue}>
                {selectedVariant.label} · {selectedAccent.label}
              </Text>
            </View>
          </GlassCard>

          <BrandedLoadingState
            title={selectedVariant.title}
            subtitle={selectedVariant.subtitle}
            variant={selectedVariant.id}
            accentColor={selectedAccent.color}
            style={styles.loadingPreview}
          />
        </ScrollView>
      </SafeAreaView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warm.sand,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  backButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  headerCopy: {
    gap: spacing.xs,
  },
  headerEyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.warm.ink,
  },
  headerSubtitle: {
    maxWidth: 320,
    fontSize: typography.fontSize.base,
    lineHeight: 20,
    color: colors.warm.inkSoft,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  controlsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius['3xl'],
    gap: spacing.md,
  },
  controlLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.inkSoft,
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  controlPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warm.sand,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  controlPillSelected: {
    backgroundColor: colors.warm.cream,
  },
  colorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warm.sand,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  controlPillText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.warm,
  },
  metaLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
  },
  metaValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  loadingPreview: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
});

export default LoadingPreviewScreen;