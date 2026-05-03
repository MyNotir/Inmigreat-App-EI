/**
 * GroupRow Component
 * 
 * Displays a community group row with:
 * - Group icon and name
 * - Description (truncated)
 * - Member count and active members
 * - Growth indicator (e.g., "+12 esta semana")
 * - Pinned post preview if available
 * - Different styling for free vs paid groups (paid shows lock icon or Pro badge)
 * 
 * Validates: Requirements 11.1, 11.2, 11.3
 */

import React from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassCard } from '../common/GlassCard';
import { IconPill } from '../common/IconPill';
import {
  GroupFamilyIcon,
  GroupClassIcon,
  GroupDacaIcon,
  MasterclassIcon,
  GroupUsaIcon,
} from '../../icons';
import type { IconProps } from '../../icons';
import type { Group } from '../../types/community';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { usePressAnimation } from '../../styles/animations';
import {
  createColoredGlassBackground,
  createGlassBorder,
  mixHexWithWhite,
} from '../../styles/glassmorphism';
import { useViewTranslation } from '../../i18n';

type CommunityTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

function translateGroupPeriod(period: string | undefined, tx: CommunityTranslate): string {
  const normalized = period?.trim().toLowerCase();

  if (normalized === 'mes' || normalized === 'month') {
    return tx('groupRow.periods.month', 'mes');
  }

  if (normalized === 'ano' || normalized === 'año' || normalized === 'year') {
    return tx('groupRow.periods.year', 'ano');
  }

  return tx('groupRow.periods.month', 'mes');
}

/**
 * Props interface for GroupRow component
 */
export interface GroupRowProps {
  /** The group data to display */
  group: Group;
  /** Callback when the row is pressed */
  onPress?: () => void;
  /** Callback when join button is pressed (for free groups) */
  onJoin?: () => void;
  /** Whether the viewer is already a member */
  isJoined?: boolean;
  /** Whether the join action is currently running */
  isJoining?: boolean;
  /** Optional action label override */
  actionLabel?: string;
  /** Additional styles for the container */
  style?: ViewStyle;
}

/**
 * Map of icon names to their components
 */
const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  'family': GroupFamilyIcon,
  'class': GroupClassIcon,
  'daca': GroupDacaIcon,
  'masterclass': MasterclassIcon,
  'usa': GroupUsaIcon,
  // Default fallback
  'default': GroupFamilyIcon,
};

/**
 * Get the icon component for a group based on its icon property
 */
const getGroupIcon = (iconName: string): React.ComponentType<IconProps> => {
  return ICON_MAP[iconName.toLowerCase()] || ICON_MAP['default'];
};

/**
 * GroupRow Component
 * 
 * Renders a group row with all relevant information.
 */
export const GroupRow: React.FC<GroupRowProps> = ({
  group,
  onPress,
  onJoin,
  isJoined = false,
  isJoining = false,
  actionLabel,
  style,
}) => {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();
  const { t } = useViewTranslation('community');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const isAndroid = Platform.OS === 'android';
  const GroupIcon = getGroupIcon(group.icon);
  const isPaid = group.type === 'paid';
  const accentColor = group.iconColor || colors.accent;
  const cardStyle: ViewStyle = {
    ...styles.card,
    backgroundColor: isAndroid
      ? mixHexWithWhite(accentColor, 0.94)
      : createColoredGlassBackground(colors.background.secondary, 0.82),
    borderColor: isAndroid
      ? mixHexWithWhite(accentColor, 0.72)
      : createColoredGlassBackground(accentColor, 0.1),
    shadowColor: accentColor,
  };
  const nestedSurfaceStyle: ViewStyle | null = isAndroid
    ? {
        backgroundColor: mixHexWithWhite(accentColor, 0.97),
        borderColor: mixHexWithWhite(accentColor, 0.84),
      }
    : null;
  const tagSurfaceStyle: ViewStyle | null = isAndroid
    ? {
        backgroundColor: mixHexWithWhite(accentColor, 0.985),
        borderColor: mixHexWithWhite(accentColor, 0.9),
      }
    : null;
  const trendingTagSurfaceStyle: ViewStyle | null = isAndroid
    ? {
        backgroundColor: mixHexWithWhite(colors.accent, 0.88),
        borderColor: mixHexWithWhite(colors.accent, 0.74),
      }
    : null;
  const iconBackgroundColor = isAndroid
    ? mixHexWithWhite(accentColor, 0.82)
    : group.backgroundColor || createColoredGlassBackground(accentColor, 0.15);
  
  // Truncate description to 2 lines worth of characters (approximately 80 chars)
  const truncatedDescription = group.description.length > 80
    ? `${group.description.substring(0, 77)}...`
    : group.description;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      disabled={!onPress}
    >
      <Animated.View style={[animatedStyle, style]}>
        <GlassCard style={cardStyle} blurIntensity={isAndroid ? 0 : 6}>
          {/* Header Row: Icon, Name, Pro Badge */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <IconPill
                Icon={GroupIcon}
                color={group.iconColor}
                backgroundColor={iconBackgroundColor}
                preset="medium"
              />
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group.name}
                  </Text>
                  {group.viewerCanModerate && (group.moderationOpenCount ?? 0) > 0 && (
                    <View style={styles.reviewBadge}>
                      <Text style={styles.reviewBadgeText}>
                        {tx('groupRow.pendingCount', '{{count}} pendientes', {
                          count: group.moderationOpenCount ?? 0,
                        })}
                      </Text>
                    </View>
                  )}
                  {/* Pro Badge for paid groups - Requirement 11.2 */}
                  {isPaid && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                {/* Description - truncated */}
                <Text style={styles.description} numberOfLines={2}>
                  {truncatedDescription}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Row: Member count, Active count, Growth */}
          <View style={[styles.statsRow, nestedSurfaceStyle]}>
            {/* Member Count */}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatNumber(group.memberCount)}
              </Text>
              <Text style={styles.statLabel}>{tx('groupRow.members', 'miembros')}</Text>
            </View>

            {/* Divider */}
            <View style={styles.statDivider} />

            {/* Active Count */}
            <View style={styles.statItem}>
              <View style={styles.activeIndicator}>
                <View style={styles.activeDot} />
                <Text style={styles.statValue}>
                  {formatNumber(group.activeCount)}
                </Text>
              </View>
              <Text style={styles.statLabel}>{tx('groupRow.active', 'activos')}</Text>
            </View>

            {/* Divider */}
            <View style={styles.statDivider} />

            {/* Growth Indicator */}
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.growthValue]}>
                {group.growth}
              </Text>
              <Text style={styles.statLabel}>{tx('groupRow.thisWeek', 'esta semana')}</Text>
            </View>
          </View>

          {/* Pinned Post Preview */}
          {group.pinnedPost && (
            <View style={[styles.pinnedPostContainer, nestedSurfaceStyle]}>
              <View style={styles.pinnedPostHeader}>
                <View style={styles.pinIcon}>
                  <Text style={styles.pinIconText}>📌</Text>
                </View>
                <Text style={styles.pinnedPostLabel}>{tx('groupRow.recentActivity', 'Actividad reciente')}</Text>
              </View>
              <Text style={styles.pinnedPostText} numberOfLines={2}>
                "{group.pinnedPost.text}"
              </Text>
              <View style={styles.pinnedPostMeta}>
                <Text style={styles.pinnedPostAuthor}>
                  — {group.pinnedPost.author}
                </Text>
                <Text style={styles.pinnedPostTimestamp}>
                  {group.pinnedPost.timestamp}
                </Text>
              </View>
            </View>
          )}

          {/* Tags Row */}
          {group.tags && group.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {group.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={[styles.tag, tagSurfaceStyle]}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {group.trending && (
                <View style={[styles.tag, styles.trendingTag, tagSurfaceStyle, trendingTagSurfaceStyle]}>
                  <Text style={[styles.tagText, styles.trendingTagText]}>
                    {`🔥 ${tx('groupRow.trending', 'Trending')}`}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action Row: Join button or Price */}
          <View style={styles.actionRow}>
            {isPaid ? (
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>
                  ${group.price}/{translateGroupPeriod(group.period, tx)}
                </Text>
                <TouchableOpacity
                  style={styles.joinButtonPaid}
                  onPress={onJoin}
                  disabled={isJoining}
                  activeOpacity={0.7}
                >
                  <Text style={styles.joinButtonPaidText}>
                    {isJoining
                      ? tx('groupRow.joining', 'Uniendo...')
                      : isJoined
                        ? tx('groupRow.openGroup', 'Abrir grupo')
                        : actionLabel || tx('groupRow.joinPro', 'Unirse Pro')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.joinButtonFree}
                onPress={onJoin}
                disabled={isJoining}
                activeOpacity={0.7}
              >
                <Text style={styles.joinButtonFreeText}>
                  {isJoining
                    ? tx('groupRow.joining', 'Uniendo...')
                    : isJoined
                      ? tx('groupRow.openGroup', 'Abrir grupo')
                      : actionLabel || tx('groupRow.joinFree', 'Unirse gratis')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * Format large numbers with K suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return num.toString();
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  headerInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  groupName: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    flex: 1,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  
  // Pro badge styles - Requirement 11.2
  proBadge: {
    backgroundColor: colors.pro,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
    marginLeft: spacing.sm,
  },
  reviewBadge: {
    backgroundColor: `${colors.warning}16`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
    marginLeft: spacing.sm,
  },
  proBadgeText: {
    color: colors.warm.cream,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  reviewBadgeText: {
    color: colors.warning,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.3,
  },
  
  // Stats row styles
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: createColoredGlassBackground(colors.background.primary, 0.34),
    borderRadius: borderRadius.medium,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: createGlassBorder(0.08),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.warm.inkSoft,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border.light,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warm.sage,
    marginRight: spacing.xs,
  },
  growthValue: {
    color: "#5A7660",
  },
  
  // Pinned post styles
  pinnedPostContainer: {
    backgroundColor: createColoredGlassBackground(colors.background.primary, 0.34),
    borderRadius: borderRadius.medium,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: createGlassBorder(0.08),
  },
  pinnedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pinIcon: {
    marginRight: spacing.xs,
  },
  pinIconText: {
    fontSize: typography.fontSize.xs,
  },
  pinnedPostLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warm.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pinnedPostText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.ink,
    fontStyle: 'italic',
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    marginBottom: spacing.xs,
  },
  pinnedPostMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinnedPostAuthor: {
    fontSize: typography.fontSize.xs,
    color: colors.warm.inkSoft,
    fontFamily: typography.fontFamily.medium,
  },
  pinnedPostTimestamp: {
    fontSize: typography.fontSize.xs,
    color: colors.warm.inkFaint,
  },
  
  // Tags row styles
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: createColoredGlassBackground(colors.background.primary, 0.28),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: createGlassBorder(0.06),
  },
  tagText: {
    fontSize: typography.fontSize.xs,
    color: colors.warm.inkSoft,
  },
  trendingTag: {
    backgroundColor: `${colors.accent}10`,
  },
  trendingTagText: {
    color: colors.accent,
  },
  
  // Action row styles
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.pro,
    marginRight: spacing.sm,
  },
  joinButtonFree: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
  },
  joinButtonFreeText: {
    color: colors.warm.cream,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
  },
  joinButtonPaid: {
    backgroundColor: colors.pro,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
  },
  joinButtonPaidText: {
    color: colors.warm.cream,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
  },
});

export default GroupRow;
