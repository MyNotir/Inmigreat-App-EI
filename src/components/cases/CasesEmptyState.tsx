import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GlassCard } from '../common/GlassCard';
import { useViewTranslation } from '../../i18n';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';

interface CasesEmptyStateProps {
  onAddCase: () => void;
}

const ArrowRightIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12h14M13 5l7 7-7 7"
      stroke={colors.accent}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AddCaseGlyph: React.FC<{ color?: string }> = ({ color = colors.text.inverse }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M16.5 19.72h-12V7.5h7v-2h-7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-7h-2v7.22Z"
      fill={color}
    />
    <Path
      d="M18.5 2.5h-2v3h-3v2h3v2.99h2V7.5h3v-2h-3v-3Z"
      fill={color}
    />
    <Path d="M14.5 9.5h-8v2h8v-2Z" fill={color} />
    <Path d="M6.5 12.5v2h8v-2h-8Z" fill={color} />
    <Path d="M14.5 15.5h-8v2h8v-2Z" fill={color} />
  </Svg>
);

const StatueBackdrop: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <Svg
    width={width}
    height={height}
    viewBox="0 0 474 537.2"
    fill="none"
    preserveAspectRatio="xMidYMid meet"
  >
    <Path
      fill={colors.background.primary}
      fillOpacity={0.42}
      d="M51.076 385.051c-8.394-1.142-21.98 3.373-27.201-4.114 4.789-5.533 13.39-3.959 19.93-3.939 27.87 4.114 42.568-20.713 64.753-34.093-12.36-2.499-84.086 4.494-83.86-5.029-.175-.802 1.927-2.828 3.255-3.085 29.52-2.253 59.398.298 89.03-.268 14.42-5.502 26.44-17.556 39.633-25.773 1.494-1.08 1.978-3.548 3.441-6.345-50.366-4.114-100.04-6.572-150.375-10.141-3.688-.236-8.971.916-9.64-4.494-.711-5.78 4.82-5.831 8.59-6.778 47.892-10.953 94.684-26.462 143.164-34.411-41.291-35.78-87.69-66.778-130.332-101.231-4.531-5.07-1.555-11.549 5.295-8.299 46.08 16.558 91.09 38.783 137.891 51.978C-3.399-26.946 55.072 44.171 214.449 165.24c-5.572-52.924-11.113-104.83-16.407-157.65-.186-7.117 6.746-11.22 10.124-3.086 30.446 57.14 60.624 114.045 91.224 171.155 82.222-212.231 65.321-188.392 65.794 17.134 32.691-44.995 65.238-88.57 98.094-133.246 1.411-3.332 6.015-4.72 8.94-4.114 1.164.411 2.163 4.258 1.597 6.037-19.765 53.86-41.199 107.164-61.51 160.808-.556 4.032-4.799 6.407-8.24 5.79-3.584-2.056-3.161-7.62-1.029-11.086 14.81-40.645 33.226-80.579 46.224-121.584l-85.765 114.467c11.701 5.842 24.276 14.121 35.081 22.112 2.739 1.974 4.171 4.864 1.771 8.001-2.399 3.136-5.345 2.581-8.178.483-54.495-39.729-120.639-56.03-186.825-61.162-42.228-1.861-54.186 61.8-34.102 90.339 61.376-55.68 156.781-39.143 226.407-8.731 2.873 1.748 4.779 4.196 3.162 7.703-1.72 3.692-4.862 3.98-8.291 2.653-39.448-18.193-81.131-29.321-124.956-26.986 45.586 24.94 49.253 85.258 88.886 116.214 7.519 5.945 15.584 10.614 25.327 11.745 3.162 0 4.12 3.764 6.025 5.708-7.642 9.081-21.876 0-29.961-4.69-52.374-30.493-50.17-132.227-123.967-125.717 13.081 22.831 30.508 42.824 56.916 45.694 5.15.483 8.023 2.674 7.694 6.325-.33 3.651-3.43 5.533-8.683 4.977-30.126-4.268-50.932-26.307-64.022-53.777-23.03 7.117-48.409 17.309-53.486 44.12-5.737 24.683-11.248 49.181-9.62 74.625 4.511 82.872 67.843 75.94 128.745 54.178 7.076-1.162 17.201-8.227 22.32-.257 2.286 3.836-.752 6.325-3.389 8.629-32.135 27.614-63.642 56.009-96.137 83.181-5.366 4.72-13.812-2.211-8.94-7.96 5.15-8.639 9.96-16.373 15.089-25.218-57.781-1.861-115.562-2.211-173.374-3.589-7.375-.607-15.511 1.141-21.578-4.052 1.803-1.152 3.564-3.24 5.397-3.301 63.683-.895 127.397 1.028 191.09 1.46 7.436 1.172 14.007-18.43 19.404-24.776-23.885 3.281-47.45 1.286-65.629-16.043-42.661-4.855-87.743 0-131.166-1.492-7.756-.966-17.51 2.109-23.319-4.113 4.44-4.752 11.186-3.312 17.057-3.816 43.454-.216 85.332-.483 129.034-.452-12.36-20.24-15.532-41.344-15.45-64.011-36.873 15.838-73.024 32.91-109.68 49.17-2.782 1.841-6.108-.411-9.157-.638.618-10.428 11.803-13.781 18.467-20.167l-.381-1.183Zm240.486-202.924L211.74 32.149l-.947.309c4.727 46.218 9.455 92.426 14.12 138.007l66.649 11.662Zm64.59-120.02-1.123-.246c-16.098 40.294-33.031 80.219-49.665 120.328-1.473 3.507-.587 4.762 2.74 5.965 15.295 5.502 30.342 11.54 45.658 17.011l2.39-143.058ZM38.768 284.418c39.406 3.445 78.926 5.78 118.374 8.927 8.693.658 9.053-15.787 3.872-20.98-4.119-5.441-6.066-13.833-8.569-20.251-37.563 12.671-75.877 21.156-113.677 32.304ZM203.346 168.13 91.492 79.355l-.546.555 78.72 103.184c9.527-9.328 20.187-14.275 33.68-14.964Zm-46.05 30.062L54.104 157.784l-.37.689 95.621 75.005c2.606-11.58 5.181-22.945 7.941-35.286Zm-1.637 119.968-77.474 60.874c24.472-8.69 47.481-21.34 71.469-31.532 5.284-2.386 4.161-22.564 6.005-29.321v-.021Z"
    />
    <Path
      fill={colors.pro}
      fillOpacity={0.07}
      d="M51.076 385.051c-8.394-1.142-21.98 3.373-27.201-4.114 4.789-5.533 13.39-3.959 19.93-3.939 27.87 4.114 42.568-20.713 64.753-34.093-12.36-2.499-84.086 4.494-83.86-5.029-.175-.802 1.927-2.828 3.255-3.085 29.52-2.253 59.398.298 89.03-.268 14.42-5.502 26.44-17.556 39.633-25.773 1.494-1.08 1.978-3.548 3.441-6.345-50.366-4.114-100.04-6.572-150.375-10.141-3.688-.236-8.971.916-9.64-4.494-.711-5.78 4.82-5.831 8.59-6.778 47.892-10.953 94.684-26.462 143.164-34.411-41.291-35.78-87.69-66.778-130.332-101.231-4.531-5.07-1.555-11.549 5.295-8.299 46.08 16.558 91.09 38.783 137.891 51.978C-3.399-26.946 55.072 44.171 214.449 165.24c-5.572-52.924-11.113-104.83-16.407-157.65-.186-7.117 6.746-11.22 10.124-3.086 30.446 57.14 60.624 114.045 91.224 171.155 82.222-212.231 65.321-188.392 65.794 17.134 32.691-44.995 65.238-88.57 98.094-133.246 1.411-3.332 6.015-4.72 8.94-4.114 1.164.411 2.163 4.258 1.597 6.037-19.765 53.86-41.199 107.164-61.51 160.808-.556 4.032-4.799 6.407-8.24 5.79-3.584-2.056-3.161-7.62-1.029-11.086 14.81-40.645 33.226-80.579 46.224-121.584l-85.765 114.467c11.701 5.842 24.276 14.121 35.081 22.112 2.739 1.974 4.171 4.864 1.771 8.001-2.399 3.136-5.345 2.581-8.178.483-54.495-39.729-120.639-56.03-186.825-61.162-42.228-1.861-54.186 61.8-34.102 90.339 61.376-55.68 156.781-39.143 226.407-8.731 2.873 1.748 4.779 4.196 3.162 7.703-1.72 3.692-4.862 3.98-8.291 2.653-39.448-18.193-81.131-29.321-124.956-26.986 45.586 24.94 49.253 85.258 88.886 116.214 7.519 5.945 15.584 10.614 25.327 11.745 3.162 0 4.12 3.764 6.025 5.708-7.642 9.081-21.876 0-29.961-4.69-52.374-30.493-50.17-132.227-123.967-125.717 13.081 22.831 30.508 42.824 56.916 45.694 5.15.483 8.023 2.674 7.694 6.325-.33 3.651-3.43 5.533-8.683 4.977-30.126-4.268-50.932-26.307-64.022-53.777-23.03 7.117-48.409 17.309-53.486 44.12-5.737 24.683-11.248 49.181-9.62 74.625 4.511 82.872 67.843 75.94 128.745 54.178 7.076-1.162 17.201-8.227 22.32-.257 2.286 3.836-.752 6.325-3.389 8.629-32.135 27.614-63.642 56.009-96.137 83.181-5.366 4.72-13.812-2.211-8.94-7.96 5.15-8.639 9.96-16.373 15.089-25.218-57.781-1.861-115.562-2.211-173.374-3.589-7.375-.607-15.511 1.141-21.578-4.052 1.803-1.152 3.564-3.24 5.397-3.301 63.683-.895 127.397 1.028 191.09 1.46 7.436 1.172 14.007-18.43 19.404-24.776-23.885 3.281-47.45 1.286-65.629-16.043-42.661-4.855-87.743 0-131.166-1.492-7.756-.966-17.51 2.109-23.319-4.113 4.44-4.752 11.186-3.312 17.057-3.816 43.454-.216 85.332-.483 129.034-.452-12.36-20.24-15.532-41.344-15.45-64.011-36.873 15.838-73.024 32.91-109.68 49.17-2.782 1.841-6.108-.411-9.157-.638.618-10.428 11.803-13.781 18.467-20.167l-.381-1.183Zm240.486-202.924L211.74 32.149l-.947.309c4.727 46.218 9.455 92.426 14.12 138.007l66.649 11.662Zm64.59-120.02-1.123-.246c-16.098 40.294-33.031 80.219-49.665 120.328-1.473 3.507-.587 4.762 2.74 5.965 15.295 5.502 30.342 11.54 45.658 17.011l2.39-143.058ZM38.768 284.418c39.406 3.445 78.926 5.78 118.374 8.927 8.693.658 9.053-15.787 3.872-20.98-4.119-5.441-6.066-13.833-8.569-20.251-37.563 12.671-75.877 21.156-113.677 32.304ZM203.346 168.13 91.492 79.355l-.546.555 78.72 103.184c9.527-9.328 20.187-14.275 33.68-14.964Zm-46.05 30.062L54.104 157.784l-.37.689 95.621 75.005c2.606-11.58 5.181-22.945 7.941-35.286Zm-1.637 119.968-77.474 60.874c24.472-8.69 47.481-21.34 71.469-31.532 5.284-2.386 4.161-22.564 6.005-29.321v-.021Z"
    />
  </Svg>
);

export const CasesEmptyState: React.FC<CasesEmptyStateProps> = ({ onAddCase }) => {
  const { t } = useViewTranslation('cases');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const { width, height } = useWindowDimensions();
  const artworkWidth = Math.max(width * 1.14, 420);
  const artworkHeight = Math.max(320, Math.min(height * 0.58, 520));
  const sceneMinHeight = Math.max(420, Math.min(height * 0.6, 540));

  return (
    <View style={[styles.scene, { minHeight: sceneMinHeight }]}> 
      <View pointerEvents="none" style={styles.artworkLayer}>
        <StatueBackdrop width={artworkWidth} height={artworkHeight} />
      </View>

      <GlassCard
        opacity={0}
        blurIntensity={0}
        style={styles.heroCard}
      >
        <Text style={styles.eyebrow}>{tx('empty.eyebrow', 'Comienza aqui')}</Text>
        <Text style={styles.title}>{tx('empty.title', 'Agrega tu primer caso')}</Text>
        <Text style={styles.description}>
          {tx(
            'empty.description',
            'Conecta un caso de USCIS o EOIR para seguir tu timeline, recibir alertas y activar las herramientas principales de esta seccion.',
          )}
        </Text>

        <TouchableOpacity style={styles.ctaCard} onPress={onAddCase} activeOpacity={0.86}>
          <View style={styles.iconBubble}>
            <AddCaseGlyph color={colors.accent} />
          </View>

          <View style={styles.ctaCopy}>
            <Text style={styles.ctaTitle}>{tx('empty.ctaTitle', 'Agregar caso')}</Text>
            <Text style={styles.ctaSubtitle}>
              {tx('empty.ctaSubtitle', 'Empieza con tu numero de receipt o tu A-Number')}
            </Text>
          </View>

          <View style={styles.arrowBubble}>
            <ArrowRightIcon />
          </View>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  scene: {
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['2xl'],
  },
  artworkLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.52,
  },
  heroCard: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.xl,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(255,255,255,0.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(255,255,255,0.84)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    textShadowColor: 'rgba(255,255,255,0.68)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  ctaCard: {
    marginTop: spacing.xl,
    borderRadius: borderRadius['3xl'],
    backgroundColor: Platform.OS === 'android' ? `${colors.accent}10` : colors.glass.background,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: Platform.OS === 'android' ? `${colors.accent}26` : colors.border.medium,
    ...(Platform.OS === 'android' ? shadows.none : shadows.sm),
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: Platform.OS === 'android' ? `${colors.accent}12` : `${colors.accent}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCopy: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  arrowBubble: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: Platform.OS === 'android' ? `${colors.background.primary}F2` : colors.background.primary,
    borderWidth: 1,
    borderColor: Platform.OS === 'android' ? `${colors.accent}20` : colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CasesEmptyState;