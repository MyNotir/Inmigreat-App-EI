/**
 * PostCard Component
 * 
 * Displays a community post with author info, content, and engagement metrics.
 * Validates: Requirements 11.7, 11.8, 11.10
 */

import React from 'react';
import { Platform, View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassCard } from '../common/GlassCard';
import { StatusPill } from '../common/StatusPill';
import { useViewTranslation } from '../../i18n';
import type { Post } from '../../types/community';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { usePressAnimation } from '../../styles/animations';
import { getCommunityModerationPresentation } from '../../utils/communityModeration';
import {
  createColoredGlassBackground,
  createGlassBorder,
  mixHexWithWhite,
} from '../../styles/glassmorphism';

export interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onLike?: () => void;
  onReport?: () => void;
  isLiked?: boolean;
  canReport?: boolean;
  style?: ViewStyle;
}

const ROLE_BADGES: Record<string, { backgroundColor: string; textColor: string }> = {
  // EI warm role palette — see ThreadView.tsx for rationale.
  'Moderador': { backgroundColor: colors.warm.clay, textColor: colors.warm.cream },
  'Pro': { backgroundColor: colors.warm.sand, textColor: colors.warm.clay },
  'Admin': { backgroundColor: colors.status.urgentWarm, textColor: colors.warm.cream },
  'Experto': { backgroundColor: colors.warm.sage, textColor: colors.warm.cream },
};

const TAG_STYLES: Record<string, { backgroundColor: string; textColor: string }> = {
  // EI: warm tag palette — sand+clay for routine tags, peach+urgentWarm
  // for crisis tags. Cool brand-blue tags read as 'cold catalog UI' on
  // a peer-support thread.
  'Pregunta': { backgroundColor: colors.warm.sand, textColor: colors.warm.clay },
  'Experiencia': { backgroundColor: 'rgba(184, 201, 185, 0.32)', textColor: '#5A7660' },
  'Consejo': { backgroundColor: colors.warm.sand, textColor: colors.warm.ink },
  'Noticia': { backgroundColor: colors.warm.cream, textColor: colors.warm.clay },
  'Alerta': { backgroundColor: colors.warm.peach, textColor: colors.status.urgentWarm },
};

type CommunityTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

function normalizeCommunityLabel(value: string | undefined): string {
  return value
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') ?? '';
}

function translateRoleLabel(role: string, tx: CommunityTranslate): string {
  const normalized = normalizeCommunityLabel(role);

  switch (normalized) {
    case 'moderador':
    case 'moderator':
      return tx('threadView.roles.moderator', 'Moderador');
    case 'pro':
      return tx('threadView.roles.pro', 'Pro');
    case 'admin':
      return tx('threadView.roles.admin', 'Admin');
    case 'experto':
    case 'expert':
    case 'especialista':
      return tx('threadView.roles.expert', 'Experto');
    default:
      return role;
  }
}

function translateTagLabel(tag: string, tx: CommunityTranslate): string {
  const normalized = normalizeCommunityLabel(tag);

  switch (normalized) {
    case 'pregunta':
    case 'question':
      return tx('threadView.tags.question', 'Pregunta');
    case 'experiencia':
    case 'experience':
      return tx('threadView.tags.experience', 'Experiencia');
    case 'consejo':
    case 'advice':
      return tx('threadView.tags.advice', 'Consejo');
    case 'noticia':
    case 'news':
      return tx('threadView.tags.news', 'Noticia');
    case 'alerta':
    case 'alert':
      return tx('threadView.tags.alert', 'Alerta');
    default:
      return tag;
  }
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPress,
  onLike,
  onReport,
  isLiked = false,
  canReport = false,
  style,
}) => {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();
  const { t } = useViewTranslation('community');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const isAndroid = Platform.OS === 'android';
  const initials = getInitials(post.authorName);
  const roleBadge = ROLE_BADGES[post.authorRole];
  const tagStyle = post.tag ? TAG_STYLES[post.tag] || TAG_STYLES['Pregunta'] : null;
  const moderationStyle = getCommunityModerationPresentation(post.moderationState, tx);
  const accentColor = post.authorColor || colors.accent;
  const roleLabel = translateRoleLabel(post.authorRole, tx);
  const tagLabel = post.tag ? translateTagLabel(post.tag, tx) : null;
  const cardStyle: ViewStyle = {
    ...styles.card,
    // EI: warm cream surface, soft clay border. Author accent shows up in
    // the avatar circle only — surface stays calm even when the post is hot.
    backgroundColor: colors.warm.cream,
    borderColor: colors.border.warm,
    shadowColor: colors.warm.ink,
  };

  return (
    <TouchableOpacity activeOpacity={1} onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress} disabled={!onPress}>
      <Animated.View style={[animatedStyle, style]}>
        <GlassCard style={cardStyle} blurIntensity={isAndroid ? 0 : 6}>
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: post.authorColor || colors.accent }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.authorInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName} numberOfLines={1}>{post.authorName}</Text>
                {roleBadge && (
                  <View style={[styles.roleBadge, { backgroundColor: roleBadge.backgroundColor }]}>
                    <Text style={[styles.roleBadgeText, { color: roleBadge.textColor }]}>{roleLabel}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.timestamp}>{post.timestamp}</Text>
            </View>
          </View>
          <Text style={styles.postText}>{post.text}</Text>
          {post.tag && tagStyle && (
            <View style={styles.tagContainer}>
              <View style={[styles.tag, { backgroundColor: tagStyle.backgroundColor }]}>
                <Text style={[styles.tagText, { color: tagStyle.textColor }]}>{tagLabel}</Text>
              </View>
            </View>
          )}
          {moderationStyle && (
            <View style={styles.moderationWrap}>
              <StatusPill
                label={moderationStyle.label}
                color={moderationStyle.textColor}
                backgroundColor={moderationStyle.backgroundColor}
                borderColor={moderationStyle.borderColor}
              />
              {post.moderationSummary ? (
                <Text style={styles.moderationSummary}>{post.moderationSummary}</Text>
              ) : null}
            </View>
          )}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.actionButton} onPress={onLike} activeOpacity={0.7}>
              <Text style={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</Text>
              <Text style={[styles.actionCount, isLiked && styles.likedCount]}>{post.likes}</Text>
            </TouchableOpacity>
            <View style={styles.actionButton}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionCount}>{post.comments}</Text>
            </View>
            {canReport ? (
              <TouchableOpacity style={styles.actionButton} onPress={onReport} activeOpacity={0.7}>
                <Text style={styles.reportActionText}>{tx('threadView.actions.report', 'Reportar')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </GlassCard>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { padding: spacing.base },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.warm.cream, fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semibold },
  authorInfo: { marginLeft: spacing.sm, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  authorName: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semibold, color: colors.warm.ink, marginRight: spacing.xs },
  roleBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.small },
  roleBadgeText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bold, letterSpacing: 0.3 },
  timestamp: { fontSize: typography.fontSize.sm, color: colors.warm.inkFaint, marginTop: 2 },
  postText: { fontSize: typography.fontSize.base, color: colors.warm.ink, lineHeight: typography.fontSize.base * typography.lineHeight.normal, marginBottom: spacing.md },
  tagContainer: { flexDirection: 'row', marginBottom: spacing.md },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  tagText: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.medium },
  moderationWrap: { marginBottom: spacing.md, gap: spacing.xs },
  moderationSummary: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: createGlassBorder(0.1),
    paddingTop: spacing.md,
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.lg },
  actionIcon: { fontSize: typography.fontSize.md, marginRight: spacing.xs },
  actionCount: { fontSize: typography.fontSize.sm, color: colors.warm.inkSoft, fontFamily: typography.fontFamily.medium },
  likedCount: { color: colors.status.urgentWarm },
  reportActionText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    fontFamily: typography.fontFamily.medium,
  },
});

export default PostCard;
