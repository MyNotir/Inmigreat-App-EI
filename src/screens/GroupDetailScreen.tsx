/**
 * GroupDetailScreen
 * 
 * Displays a group's feed with posts and resources section.
 * - Display group feed with PostCard components
 * - Display resources section
 * - Add compose button to create posts
 * 
 * Validates: Requirements 8.1, 8.2, 8.4, 11.6, 11.11
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { AnimatedBackground } from '../components/common/AnimatedBackground';
import { BrandedLoadingState } from '../components/common/BrandedLoadingState';
import { GlassCard } from '../components/common/GlassCard';
import { PushToast } from '../components/common/PushToast';
import { PostCard } from '../components/community/PostCard';
import { ComposeSheet } from '../components/community/ComposeSheet';
import { ReportContentSheet } from '../components/community/ReportContentSheet';
import { useAppAlert } from '../context/AppAlertContext';
import { useAuth } from '../context/AuthContext';
import { useViewTranslation } from '../i18n';
import { getMainTabAccent } from '../navigation/tabAccents';
import { communityService } from '../services/community';
import { GraphQLException } from '../services/graphql';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';
import { mixHexWithWhite } from '../styles/glassmorphism';
import type {
  ComposeData,
  Group,
  GroupMember,
  ModerationCase,
  ModerationStats,
  Post,
} from '../types/community';
import type { CommunityStackParamList } from '../types/navigation';
import {
  getRemovedMemberInteractionNotice,
  resolveCommunityInteractionErrorIssue,
  resolveDisabledCommunityInteractionIssue,
} from '../utils/communityInteractionAlerts';
import {
  COMMUNITY_REPORT_REASON_OPTIONS,
  resolveCommunityReportErrorAlert,
} from '../utils/communityReports';
import {
  getReviewReasonOptions,
  REVIEW_REASON_OPTIONS,
  formatHumanLabel,
  formatReasonCode,
  getCaseExcerpt,
  getCaseReportReasonChips,
  getCaseSignalChips,
  getCaseVisibleSummary,
} from '../utils/communityModerationReview';

type GroupDetailRouteProp = RouteProp<CommunityStackParamList, 'GroupDetail'>;
type GroupDetailNavigationProp = StackNavigationProp<CommunityStackParamList>;

const COMMUNITY_ACCENT = getMainTabAccent('Community');
const IS_ANDROID = Platform.OS === 'android';
const COMMUNITY_ANDROID_BLUR_INTENSITY = Platform.OS === 'android' ? 0 : undefined;

type GroupDetailTab = 'feed' | 'review';
type ModerationStatusFilter = 'ALL' | 'OPEN' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED';
type ModerationPriorityFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH';
type ModerationSourceFilter = 'ALL' | 'RULE_ENGINE' | 'AUTO_MODEL' | 'USER_REPORT' | 'MANUAL';
type ModerationContentTypeFilter = 'ALL' | 'POST' | 'COMMENT';
type ReviewDecision = 'APPROVE' | 'REJECT' | 'REMOVE';

interface ReviewToastState {
  title: string;
  body: string;
}

type CommunityTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

const REVIEW_SKELETON_ITEMS = [0, 1, 2] as const;

const getCaseSourceLabel = (source: string, tx: CommunityTranslate): string => {
  switch (source) {
    case 'RULE_ENGINE':
      return tx('groupDetail.options.source.ruleEngine', 'Reglas');
    case 'AUTO_MODEL':
      return tx('groupDetail.options.source.autoModel', 'AWS');
    case 'USER_REPORT':
      return tx('groupDetail.options.source.userReport', 'Reportes');
    case 'MANUAL':
      return tx('groupDetail.options.source.manual', 'Manual');
    default:
      return source;
  }
};

const getCaseStatusLabel = (status: string, tx: CommunityTranslate): string => {
  switch (status) {
    case 'OPEN':
      return tx('groupDetail.options.status.open', 'Abierto');
    case 'IN_REVIEW':
      return tx('groupDetail.options.status.inReview', 'En revision');
    case 'ESCALATED':
      return tx('groupDetail.options.status.escalated', 'Escalado');
    case 'RESOLVED':
      return tx('groupDetail.options.status.resolved', 'Resuelto');
    default:
      return status;
  }
};

const getContentTypeLabel = (contentType: string, tx: CommunityTranslate): string => {
  switch (contentType) {
    case 'POST':
      return tx('groupDetail.options.contentType.post', 'Post');
    case 'COMMENT':
      return tx('groupDetail.options.contentType.comment', 'Comentario');
    default:
      return contentType;
  }
};

const normalizeCommunityLabel = (value?: string | null): string => value?.trim().toUpperCase() ?? '';

const getCommunityRoleLabel = (role: string | null | undefined, tx: CommunityTranslate): string => {
  switch (normalizeCommunityLabel(role)) {
    case 'OWNER':
      return tx('groupDetail.roles.owner', 'Owner');
    case 'MODERATOR':
      return tx('groupDetail.roles.moderator', 'Moderador');
    case 'MEMBER':
      return tx('groupDetail.roles.member', 'Miembro');
    case 'ADMIN':
      return tx('groupDetail.roles.admin', 'Admin');
    default:
      return role ?? '';
  }
};

const getModerationPriorityLabel = (priority: string, tx: CommunityTranslate): string => {
  switch (normalizeCommunityLabel(priority)) {
    case 'HIGH':
      return tx('groupDetail.options.priority.high', 'Alta');
    case 'MEDIUM':
      return tx('groupDetail.options.priority.medium', 'Media');
    case 'LOW':
      return tx('groupDetail.options.priority.low', 'Baja');
    default:
      return priority;
  }
};

const createAndroidCardSurface = (tintColor: string, backgroundRatio = 0.94, borderRatio = 0.74) => (
  IS_ANDROID
    ? {
        backgroundColor: mixHexWithWhite(tintColor, backgroundRatio),
        borderColor: mixHexWithWhite(tintColor, borderRatio),
      }
    : null
);

const PRIORITY_STYLES: Record<string, { backgroundColor: string; textColor: string }> = {
  LOW: { backgroundColor: `${colors.success}15`, textColor: colors.success },
  MEDIUM: { backgroundColor: `${colors.warning}16`, textColor: colors.warning },
  HIGH: { backgroundColor: `${colors.error}16`, textColor: colors.error },
};

const STATUS_STYLES: Record<string, { backgroundColor: string; textColor: string }> = {
  OPEN: { backgroundColor: `${colors.warning}14`, textColor: colors.warning },
  IN_REVIEW: { backgroundColor: `${COMMUNITY_ACCENT}14`, textColor: COMMUNITY_ACCENT },
  ESCALATED: { backgroundColor: `${colors.error}14`, textColor: colors.error },
  RESOLVED: { backgroundColor: `${colors.success}14`, textColor: colors.success },
};

const getModerationStatusOptions = (tx: CommunityTranslate): Array<{ value: ModerationStatusFilter; label: string }> => [
  { value: 'OPEN', label: tx('groupDetail.options.status.openPlural', 'Abiertos') },
  { value: 'IN_REVIEW', label: tx('groupDetail.options.status.inReviewPlural', 'En revision') },
  { value: 'ESCALATED', label: tx('groupDetail.options.status.escalatedPlural', 'Escalados') },
  { value: 'RESOLVED', label: tx('groupDetail.options.status.resolvedPlural', 'Resueltos') },
  { value: 'ALL', label: tx('groupDetail.options.all', 'Todos') },
];

const getModerationPriorityOptions = (tx: CommunityTranslate): Array<{ value: ModerationPriorityFilter; label: string }> => [
  { value: 'ALL', label: tx('groupDetail.options.priority.all', 'Todas') },
  { value: 'HIGH', label: tx('groupDetail.options.priority.high', 'Alta') },
  { value: 'MEDIUM', label: tx('groupDetail.options.priority.medium', 'Media') },
  { value: 'LOW', label: tx('groupDetail.options.priority.low', 'Baja') },
];

const getModerationSourceOptions = (tx: CommunityTranslate): Array<{ value: ModerationSourceFilter; label: string }> => [
  { value: 'ALL', label: tx('groupDetail.options.all', 'Todos') },
  { value: 'RULE_ENGINE', label: tx('groupDetail.options.source.ruleEngine', 'Reglas') },
  { value: 'AUTO_MODEL', label: tx('groupDetail.options.source.autoModel', 'AWS') },
  { value: 'USER_REPORT', label: tx('groupDetail.options.source.userReport', 'Reportes') },
  { value: 'MANUAL', label: tx('groupDetail.options.source.manual', 'Manual') },
];

const getModerationContentTypeOptions = (tx: CommunityTranslate): Array<{ value: ModerationContentTypeFilter; label: string }> => [
  { value: 'ALL', label: tx('groupDetail.options.contentType.all', 'Todo') },
  { value: 'POST', label: tx('groupDetail.options.contentType.posts', 'Posts') },
  { value: 'COMMENT', label: tx('groupDetail.options.contentType.comments', 'Comentarios') },
];

const resolveModerationConflictMessage = (error: unknown, tx: CommunityTranslate): string | null => {
  const message = error instanceof GraphQLException || error instanceof Error
    ? error.message.toLowerCase()
    : '';

  if (message.includes('already been resolved')) {
    return tx(
      'groupDetail.review.conflict.resolved',
      'Otro moderador ya resolvio este caso. La bandeja se actualizo con el estado mas reciente.',
    );
  }

  if (message.includes('moderation case not found')) {
    return tx(
      'groupDetail.review.conflict.notFound',
      'Este caso ya no esta disponible. La bandeja se actualizo con el estado mas reciente.',
    );
  }

  return null;
};

const resolveModerationActionErrorMessage = (error: unknown, tx: CommunityTranslate): string => {
  if (error instanceof GraphQLException) {
    if (error.type === 'network_error') {
      return tx(
        'groupDetail.review.errors.network',
        'No pudimos guardar la decision por un problema de conexion. Reintenta cuando la red este estable.',
      );
    }

    if (error.type === 'timeout_error') {
      return tx(
        'groupDetail.review.errors.timeout',
        'La accion tardo demasiado en responder. Reintenta en unos segundos.',
      );
    }
  }

  return tx(
    'groupDetail.review.errors.default',
    'No pudimos guardar la decision todavia. Puedes reintentar este caso desde aqui.',
  );
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
};

const MEMBER_ROLE_ORDER: Record<string, number> = {
  OWNER: 0,
  MODERATOR: 1,
  MEMBER: 2,
};

const getMemberRoleOrder = (role: string): number => MEMBER_ROLE_ORDER[role] ?? 99;

const getModerationContentLabels = (
  caseItem: Pick<ModerationCase, 'contentType'> | null | undefined,
  tx: CommunityTranslate,
) => {
  const isComment = caseItem?.contentType === 'COMMENT';

  return {
    noun: isComment
      ? tx('groupDetail.caseLabels.commentNoun', 'comentario')
      : tx('groupDetail.caseLabels.postNoun', 'publicacion'),
    nounUpper: isComment
      ? tx('groupDetail.caseLabels.commentNounUpper', 'Comentario')
      : tx('groupDetail.caseLabels.postNounUpper', 'Publicacion'),
    surface: isComment
      ? tx('groupDetail.caseLabels.commentSurface', 'hilo')
      : tx('groupDetail.caseLabels.postSurface', 'grupo'),
    stateTitle: isComment
      ? tx('groupDetail.caseLabels.commentStateTitle', 'Comentario reportado')
      : tx('groupDetail.caseLabels.postStateTitle', 'Publicacion en revision'),
  };
};

const getMemberModerationStatus = (
  member: GroupMember,
  tx: CommunityTranslate,
): { label: string; detail: string } => {
  if (member.role === 'OWNER') {
    return {
      label: tx('groupDetail.member.status.ownerLabel', 'Gestion total del grupo'),
      detail: tx('groupDetail.member.status.ownerDetail', 'Owner actual del grupo'),
    };
  }

  if (member.role === 'MODERATOR') {
    return {
      label: tx('groupDetail.member.status.moderatorLabel', 'Moderacion asignada'),
      detail: member.grantedByName
        ? tx('groupDetail.member.status.moderatorDetailWithGrantor', 'Asignado {{date}} por {{name}}', {
            date: member.grantedAt,
            name: member.grantedByName,
          })
        : tx('groupDetail.member.status.moderatorDetail', 'Asignado {{date}}', {
            date: member.grantedAt,
          }),
    };
  }

  if (member.isMuted) {
    return {
      label: tx('groupDetail.member.status.mutedLabel', 'Silenciado manualmente'),
      detail: member.mutedByName
        ? tx('groupDetail.member.status.mutedDetailWithAuthor', 'Sin publicar ni comentar desde {{date}} por {{name}}', {
            date: member.mutedAt ?? tx('groupDetail.member.status.now', 'ahora'),
            name: member.mutedByName,
          })
        : tx('groupDetail.member.status.mutedDetail', 'Sin publicar ni comentar desde {{date}}', {
            date: member.mutedAt ?? tx('groupDetail.member.status.now', 'ahora'),
          }),
    };
  }

  return {
    label: tx('groupDetail.member.status.noneLabel', 'Sin moderacion asignada'),
    detail: tx('groupDetail.member.status.noneDetail', 'Miembro desde {{date}}', {
      date: member.joinedAt,
    }),
  };
};

/**
 * GroupHeader - Displays group info at the top
 */
const GroupHeader: React.FC<{
  group: Group;
  tx: CommunityTranslate;
}> = ({ group, tx }) => {
  return (
    <GlassCard
      style={[
        styles.groupHeader,
        createAndroidCardSurface(group.iconColor || COMMUNITY_ACCENT, 0.93, 0.72),
      ]}
      blurIntensity={COMMUNITY_ANDROID_BLUR_INTENSITY}
    >
      <View style={styles.groupHeaderContent}>
        <View style={[styles.groupIconContainer, { backgroundColor: group.backgroundColor }]}>
          <Text style={styles.groupIconText}>👥</Text>
        </View>
        <View style={styles.groupHeaderInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupDescription} numberOfLines={2}>
            {group.description}
          </Text>
          <View style={styles.groupStats}>
            <Text style={styles.groupStatText}>
              {group.memberCount.toLocaleString()} {tx('groupDetail.header.members', 'miembros')}
            </Text>
            <Text style={styles.groupStatDot}>•</Text>
            <Text style={styles.groupStatText}>
              {group.activeCount} {tx('groupDetail.header.active', 'activos')}
            </Text>
            <Text style={styles.groupStatDot}>•</Text>
            <Text style={[styles.groupStatText, styles.groupGrowth]}>
              {group.growth} {tx('groupDetail.header.thisWeek', 'esta semana')}
            </Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
};

/**
 * ComposeButton - Floating action button to create posts
 */
const ComposeButton: React.FC<{
  onPress: () => void;
}> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.composeButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.composeButtonIcon}>✏️</Text>
    </TouchableOpacity>
  );
};

/**
 * GroupDetailScreen Component
 * Validates: Requirements 11.6, 11.11
 */
export const GroupDetailScreen: React.FC = () => {
  const navigation = useNavigation<GroupDetailNavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;
  const { showAlert, showError } = useAppAlert();
  const { currentUser } = useAuth();
  const { t } = useViewTranslation('community');
  const tx = useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      t(key, { defaultValue, ...(options ?? {}) }),
    [t],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [composeVisible, setComposeVisible] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<GroupDetailTab>('feed');
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([]);
  const [moderationStats, setModerationStats] = useState<ModerationStats | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [isModerationLoading, setIsModerationLoading] = useState(false);
  const [moderationStatusFilter, setModerationStatusFilter] = useState<ModerationStatusFilter>('OPEN');
  const [moderationPriorityFilter, setModerationPriorityFilter] = useState<ModerationPriorityFilter>('ALL');
  const [moderationSourceFilter, setModerationSourceFilter] = useState<ModerationSourceFilter>('ALL');
  const [moderationContentTypeFilter, setModerationContentTypeFilter] = useState<ModerationContentTypeFilter>('ALL');
  const [selectedCase, setSelectedCase] = useState<ModerationCase | null>(null);
  const [moderationSheetVisible, setModerationSheetVisible] = useState(false);
  const [groupMenuVisible, setGroupMenuVisible] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMemberUserId, setSelectedMemberUserId] = useState<string | null>(null);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isCaseLoading, setIsCaseLoading] = useState(false);
  const [isDecisionSubmitting, setIsDecisionSubmitting] = useState(false);
  const [roleMutationUserId, setRoleMutationUserId] = useState<string | null>(null);
  const [reviewToast, setReviewToast] = useState<ReviewToastState | null>(null);
  const [pendingFocusedCaseIndex, setPendingFocusedCaseIndex] = useState<number | null>(null);
  const [highlightedCaseId, setHighlightedCaseId] = useState<string | null>(null);
  const [decisionErrorMessage, setDecisionErrorMessage] = useState<string | null>(null);
  const [lastDecisionAttempt, setLastDecisionAttempt] = useState<ReviewDecision | null>(null);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>(
    REVIEW_REASON_OPTIONS[0].code,
  );
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [reportTargetPost, setReportTargetPost] = useState<Post | null>(null);
  const [selectedReportReason, setSelectedReportReason] = useState<string>(
    COMMUNITY_REPORT_REASON_OPTIONS[0].code,
  );
  const [reportNote, setReportNote] = useState('');
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const hasCompletedInitialLoadRef = useRef(false);
  const moderationStatusFilterRef = useRef<ModerationStatusFilter>('OPEN');
  const scrollViewRef = useRef<ScrollView | null>(null);
  const caseCardLayoutsRef = useRef<Record<string, number>>({});
  const focusClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasEverBeenMemberRef = useRef(false);
  const lostGroupMembership = Boolean(group && !group.isMember && hasEverBeenMemberRef.current);
  const moderationStatusOptions = getModerationStatusOptions(tx);
  const moderationPriorityOptions = getModerationPriorityOptions(tx);
  const moderationSourceOptions = getModerationSourceOptions(tx);
  const moderationContentTypeOptions = getModerationContentTypeOptions(tx);
  const reviewReasonOptions = getReviewReasonOptions(tx);

  const fetchModerationData = useCallback(async (targetGroup: Group | null) => {
    if (!targetGroup?.viewerCanModerate) {
      setModerationCases([]);
      setModerationStats(null);
      setModerationError(null);
      return;
    }

    try {
      setModerationError(null);
      setIsModerationLoading(true);
      const statusFilter = moderationStatusFilterRef.current === 'ALL'
        ? undefined
        : moderationStatusFilterRef.current;

      const [queueData, statsData] = await Promise.all([
        communityService.getModerationQueue(groupId, statusFilter),
        communityService.getModerationStats(groupId),
      ]);

      setModerationCases(queueData);
      setModerationStats(statsData);
    } catch (err) {
      console.error('[GroupDetailScreen] Error fetching moderation data:', err);
      setModerationError(tx('groupDetail.review.errors.load', 'No se pudo cargar la bandeja de revision.'));
    } finally {
      setIsModerationLoading(false);
    }
  }, [groupId, tx]);

  useEffect(() => {
    moderationStatusFilterRef.current = moderationStatusFilter;
  }, [moderationStatusFilter]);

  const fetchGroupMembers = useCallback(async () => {
    if (!group?.viewerCanManageRoles) {
      setGroupMembers([]);
      return;
    }

    try {
      setIsMembersLoading(true);
      const members = await communityService.getGroupMembers(groupId);
      setGroupMembers(members);
    } catch (err) {
      console.error('[GroupDetailScreen] Error fetching group members:', err);
      showError(err, {
        title: tx('groupDetail.member.errors.loadTitle', 'No pudimos cargar los miembros'),
        fallbackMessage: tx('groupDetail.member.errors.loadMessage', 'Intenta de nuevo para administrar moderadores.'),
      });
    } finally {
      setIsMembersLoading(false);
    }
  }, [group?.viewerCanManageRoles, groupId, showError, tx]);

  /**
   * Fetch group details and initial posts
   */
  const fetchGroupData = useCallback(async () => {
    try {
      setError(null);
      const [groupData, postsData] = await Promise.all([
        communityService.getGroupById(groupId),
        communityService.getGroupPosts(groupId),
      ]);

      if (groupData.isMember) {
        hasEverBeenMemberRef.current = true;
      }
      
      setGroup(groupData);
      setPosts(postsData.posts);
      setLikedPosts(new Set(postsData.posts.filter((post) => post.isLiked).map((post) => post.id)));
      setNextCursor(postsData.nextCursor);
      setHasMore(postsData.hasMore);
      await fetchModerationData(groupData);
      return true;
    } catch (err) {
      console.error('[GroupDetailScreen] Error fetching group data:', err);

      setError(tx('groupDetail.errors.groupLoad', 'No se pudo cargar el grupo. Intenta de nuevo.'));

      return false;
    }
  }, [fetchModerationData, groupId, tx]);

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchGroupData();
      setIsLoading(false);
      hasCompletedInitialLoadRef.current = true;
    };
    loadData();
  }, [fetchGroupData]);

  useFocusEffect(
    useCallback(() => {
      if (!hasCompletedInitialLoadRef.current) {
        return undefined;
      }

      void fetchGroupData();
      return undefined;
    }, [fetchGroupData]),
  );

  useEffect(() => {
    return communityService.subscribeToGroupChanges(groupId, () => {
      void fetchGroupData();
    });
  }, [fetchGroupData, groupId]);

  useEffect(() => {
    if (!group?.viewerCanModerate) {
      return undefined;
    }

    return communityService.subscribeToModerationQueueChanges(groupId, () => {
      void fetchModerationData(group);
    });
  }, [fetchModerationData, group, group?.viewerCanModerate, groupId]);

  useEffect(() => {
    if (!group?.viewerCanModerate || !selectedCase?.id) {
      return undefined;
    }

    return communityService.subscribeToModerationCaseChanges(selectedCase.id, () => {
      void fetchModerationData(group);

      void communityService
        .getModerationCase(selectedCase.id)
        .then((updatedCase) => {
          setSelectedCase(updatedCase);
        })
        .catch((error) => {
          console.error('[GroupDetailScreen] Error refreshing moderation case:', error);
        });
    });
  }, [fetchModerationData, group, group?.viewerCanModerate, selectedCase?.id]);

  useEffect(() => {
    if (activeTab === 'review' && !group?.viewerCanModerate) {
      setActiveTab('feed');
    }
  }, [activeTab, group?.viewerCanModerate]);

  useEffect(() => {
    if (activeTab !== 'review' || !group?.viewerCanModerate) {
      return;
    }

    void fetchModerationData(group);
  }, [activeTab, fetchModerationData, group, moderationStatusFilter]);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroupData();
    setRefreshing(false);
  }, [fetchGroupData]);

  const handleRetry = useCallback(async () => {
    setIsLoading(true);
    await fetchGroupData();
    setIsLoading(false);
  }, [fetchGroupData]);

  const handleSelectTab = useCallback((nextTab: GroupDetailTab) => {
    if (nextTab === 'review' && !group?.viewerCanModerate) {
      return;
    }

    setActiveTab(nextTab);
  }, [group?.viewerCanModerate]);

  const handleResetModerationFilters = useCallback(() => {
    setModerationStatusFilter('OPEN');
    setModerationPriorityFilter('ALL');
    setModerationSourceFilter('ALL');
    setModerationContentTypeFilter('ALL');
  }, []);

  const handleDismissReviewToast = useCallback(() => {
    setReviewToast(null);
  }, []);

  const handleOpenGroupMenu = useCallback(() => {
    if (!group?.viewerCanManageRoles) {
      return;
    }

    setGroupMenuVisible(true);
  }, [group?.viewerCanManageRoles]);

  const handleCloseGroupMenu = useCallback(() => {
    setGroupMenuVisible(false);
  }, []);

  const focusModerationCaseInList = useCallback((caseId: string) => {
    const targetY = caseCardLayoutsRef.current[caseId];

    if (typeof targetY === 'number') {
      scrollViewRef.current?.scrollTo({
        y: Math.max(targetY - 220, 0),
        animated: true,
      });
    }

    setHighlightedCaseId(caseId);

    if (focusClearTimeoutRef.current) {
      clearTimeout(focusClearTimeoutRef.current);
    }

    focusClearTimeoutRef.current = setTimeout(() => {
      setHighlightedCaseId((current) => (current === caseId ? null : current));
    }, 2200);
  }, []);

  /**
   * Load more posts (pagination)
   */
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;
    
    setIsLoadingMore(true);
    try {
      const postsData = await communityService.getGroupPosts(groupId, nextCursor);
      setPosts(prev => [...prev, ...postsData.posts]);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        for (const post of postsData.posts) {
          if (post.isLiked) {
            next.add(post.id);
          }
        }
        return next;
      });
      setNextCursor(postsData.nextCursor);
      setHasMore(postsData.hasMore);
    } catch (err) {
      console.error('[GroupDetailScreen] Error loading more posts:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [groupId, hasMore, isLoadingMore, nextCursor]);

  /**
   * Handle post press - navigate to thread view
   * Validates: Requirement 11.6
   */
  const handlePostPress = useCallback(
    (post: Post) => {
      navigation.navigate('ThreadView', {
        postId: post.id,
        groupId,
        isMember: Boolean(group?.isMember),
        hadMembership: hasEverBeenMemberRef.current,
      });
    },
    [group?.isMember, groupId, navigation]
  );

  /**
   * Handle post like
   * Validates: Requirement 8.4
   */
  const handleLikePost = useCallback(async (postId: string) => {
    const interactionIssue = resolveDisabledCommunityInteractionIssue({
      hasActiveMembership: Boolean(group?.isMember),
      hadMembership: hasEverBeenMemberRef.current,
      nonMemberTitle: tx('groupDetail.interaction.joinTitle', 'Unete al grupo'),
      nonMemberMessage: tx(
        'groupDetail.interaction.reactMessage',
        'Necesitas ser miembro para reaccionar a las publicaciones.',
      ),
      tx,
    });

    if (interactionIssue) {
      showAlert(interactionIssue.alert);
      return;
    }

    const isCurrentlyLiked = likedPosts.has(postId);
    
    // Optimistic update
    setLikedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });

    // Update post likes count optimistically
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              likes: isCurrentlyLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );

    // Call API
    try {
      if (isCurrentlyLiked) {
        await communityService.unlikePost(postId);
      } else {
        await communityService.likePost(postId);
      }
    } catch (err) {
      console.error('[GroupDetailScreen] Error toggling like:', err);
      // Revert on error
      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlyLiked) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: isCurrentlyLiked ? post.likes + 1 : post.likes - 1,
              }
            : post
        )
      );

      const interactionIssue = resolveCommunityInteractionErrorIssue(err, tx);
      if (interactionIssue) {
        showAlert(interactionIssue.alert);
        void fetchGroupData();
      }
    }
  }, [fetchGroupData, group?.isMember, likedPosts, showAlert, tx]);

  /**
   * Handle compose button press
   */
  const handleComposePress = useCallback(() => {
    const interactionIssue = resolveDisabledCommunityInteractionIssue({
      hasActiveMembership: Boolean(group?.isMember),
      hadMembership: hasEverBeenMemberRef.current,
      nonMemberTitle: tx('groupDetail.interaction.joinTitle', 'Unete al grupo'),
      nonMemberMessage: tx(
        'groupDetail.interaction.composeMessage',
        'Necesitas ser miembro para publicar en este grupo.',
      ),
      tx,
    });

    if (interactionIssue) {
      showAlert(interactionIssue.alert);
      return;
    }

    setComposeVisible(true);
  }, [group?.isMember, showAlert, tx]);

  /**
   * Handle compose dismiss
   */
  const handleComposeDismiss = useCallback(() => {
    setComposeVisible(false);
  }, []);

  const handleOpenModerationCase = useCallback(async (caseItem: ModerationCase) => {
    setSelectedCase(caseItem);
    setSelectedRejectReason(REVIEW_REASON_OPTIONS[0].code);
    setDecisionErrorMessage(null);
    setLastDecisionAttempt(null);
    setModerationSheetVisible(true);

    try {
      setIsCaseLoading(true);
      const resolvedCase = await communityService.getModerationCase(caseItem.id);
      setSelectedCase(resolvedCase);
    } catch (err) {
      console.error('[GroupDetailScreen] Error loading moderation case detail:', err);
      showError(err, {
        title: tx('groupDetail.review.errors.openCaseTitle', 'No pudimos abrir el caso'),
        fallbackMessage: tx(
          'groupDetail.review.errors.openCaseMessage',
          'Vuelve a intentarlo para revisar este caso.',
        ),
      });
    } finally {
      setIsCaseLoading(false);
    }
  }, [showError, tx]);

  const handleCloseModerationCase = useCallback(() => {
    if (isDecisionSubmitting) {
      return;
    }

    setModerationSheetVisible(false);
    setSelectedCase(null);
    setDecisionErrorMessage(null);
    setLastDecisionAttempt(null);
  }, [isDecisionSubmitting]);

  const submitReviewDecision = useCallback(async (decision: ReviewDecision) => {
    if (!selectedCase) {
      return;
    }

    const currentCaseIndex = moderationCases
      .filter((item) => {
        if (moderationStatusFilter !== 'ALL' && item.status !== moderationStatusFilter) {
          return false;
        }

        if (moderationPriorityFilter !== 'ALL' && item.priority !== moderationPriorityFilter) {
          return false;
        }

        if (moderationSourceFilter !== 'ALL' && item.source !== moderationSourceFilter) {
          return false;
        }

        if (moderationContentTypeFilter !== 'ALL' && item.contentType !== moderationContentTypeFilter) {
          return false;
        }

        return true;
      })
      .findIndex((item) => item.id === selectedCase.id);
    const contentLabels = getModerationContentLabels(selectedCase, tx);

    try {
      setIsDecisionSubmitting(true);
      setDecisionErrorMessage(null);
      setLastDecisionAttempt(decision);
      if (selectedCase.contentType === 'COMMENT') {
        await communityService.reviewComment(
          selectedCase.id,
          decision,
          decision === 'APPROVE' ? undefined : selectedRejectReason,
        );
      } else {
        await communityService.reviewPost(
          selectedCase.id,
          decision,
          decision === 'APPROVE' ? undefined : selectedRejectReason,
        );
      }
      await fetchGroupData();
      setModerationSheetVisible(false);
      setSelectedCase(null);
      setDecisionErrorMessage(null);
      setLastDecisionAttempt(null);
      setPendingFocusedCaseIndex(currentCaseIndex >= 0 ? currentCaseIndex : 0);
      setReviewToast({
        title:
          decision === 'APPROVE'
            ? tx('groupDetail.review.toast.approvedTitle', '{{content}} aprobada', {
                content: contentLabels.nounUpper,
              })
            : decision === 'REMOVE'
              ? tx('groupDetail.review.toast.removedTitle', '{{content}} removida', {
                  content: contentLabels.nounUpper,
                })
              : tx('groupDetail.review.toast.rejectedTitle', '{{content}} rechazada', {
                  content: contentLabels.nounUpper,
                }),
        body:
          decision === 'APPROVE'
            ? tx(
                'groupDetail.review.toast.approvedBody',
                'La {{content}} ya vuelve a estar visible en el {{surface}}.',
                { content: contentLabels.noun, surface: contentLabels.surface },
              )
            : decision === 'REMOVE'
              ? tx(
                  'groupDetail.review.toast.removedBody',
                  'La {{content}} quedo oculta del {{surface}} con motivo visible para el autor.',
                  { content: contentLabels.noun, surface: contentLabels.surface },
                )
              : tx(
                  'groupDetail.review.toast.rejectedBody',
                  'La {{content}} quedo rechazada con un motivo visible para el autor.',
                  { content: contentLabels.noun },
                ),
      });
    } catch (err) {
      console.error('[GroupDetailScreen] Error reviewing moderation case:', err);
      const concurrencyMessage = resolveModerationConflictMessage(err, tx);

      if (concurrencyMessage) {
        await fetchGroupData();
        setModerationSheetVisible(false);
        setSelectedCase(null);
        setDecisionErrorMessage(null);
        setLastDecisionAttempt(null);
        setPendingFocusedCaseIndex(currentCaseIndex >= 0 ? currentCaseIndex : 0);
        setReviewToast({
          title: tx('groupDetail.review.toast.updatedTitle', 'Caso ya actualizado'),
          body: concurrencyMessage,
        });
        return;
      }

      setDecisionErrorMessage(resolveModerationActionErrorMessage(err, tx));
    } finally {
      setIsDecisionSubmitting(false);
    }
  }, [
    fetchGroupData,
    moderationCases,
    moderationContentTypeFilter,
    moderationPriorityFilter,
    moderationSourceFilter,
    moderationStatusFilter,
    selectedCase,
    selectedRejectReason,
    tx,
  ]);

  const handleRetryDecision = useCallback(() => {
    if (!lastDecisionAttempt) {
      return;
    }

    void submitReviewDecision(lastDecisionAttempt);
  }, [lastDecisionAttempt, submitReviewDecision]);

  const handleApproveCase = useCallback(() => {
    if (!selectedCase) {
      return;
    }

    const contentLabels = getModerationContentLabels(selectedCase, tx);

    showAlert({
      title: tx('groupDetail.review.actions.approveTitle', 'Aprobar {{content}}', {
        content: contentLabels.noun,
      }),
      message: tx(
        'groupDetail.review.actions.approveMessage',
        'La {{content}} volvera a estar visible en el {{surface}} de inmediato.',
        { content: contentLabels.noun, surface: contentLabels.surface },
      ),
      tone: 'info',
      actions: [
        { label: tx('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          label: tx('groupDetail.review.actions.approveButton', 'Aprobar'),
          onPress: () => {
            void submitReviewDecision('APPROVE');
          },
        },
      ],
    });
  }, [selectedCase, showAlert, submitReviewDecision, tx]);

  const handleRejectCase = useCallback(() => {
    if (!selectedCase) {
      return;
    }

    const contentLabels = getModerationContentLabels(selectedCase, tx);

    showAlert({
      title: tx('groupDetail.review.actions.rejectTitle', 'Rechazar {{content}}', {
        content: contentLabels.noun,
      }),
      message: tx(
        'groupDetail.review.actions.rejectMessage',
        'Se guardara el motivo visible seleccionado para el autor.',
      ),
      tone: 'warning',
      actions: [
        { label: tx('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          label: tx('groupDetail.review.actions.rejectButton', 'Rechazar'),
          style: 'destructive',
          onPress: () => {
            void submitReviewDecision('REJECT');
          },
        },
      ],
    });
  }, [selectedCase, showAlert, submitReviewDecision, tx]);

  const handleRemoveCase = useCallback(() => {
    if (!selectedCase) {
      return;
    }

    const contentLabels = getModerationContentLabels(selectedCase, tx);

    showAlert({
      title: tx('groupDetail.review.actions.removeTitle', 'Remover {{content}}', {
        content: contentLabels.noun,
      }),
      message: tx(
        'groupDetail.review.actions.removeMessage',
        'Esta decision oculta el contenido del {{surface}} y debe usarse cuando no deba volver a mostrarse tal como esta.',
        { surface: contentLabels.surface },
      ),
      tone: 'error',
      actions: [
        { label: tx('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          label: tx('groupDetail.review.actions.removeButton', 'Remover'),
          style: 'destructive',
          onPress: () => {
            if (selectedCase && selectedCase.status !== 'RESOLVED') {
              void submitReviewDecision('REMOVE');
            }
          },
        },
      ],
    });
  }, [selectedCase, showAlert, submitReviewDecision, tx]);

  const handleOpenMembers = useCallback(() => {
    setGroupMenuVisible(false);
    setMembersVisible(true);
    void fetchGroupMembers();
  }, [fetchGroupMembers]);

  const handleCloseMembers = useCallback(() => {
    if (roleMutationUserId) {
      return;
    }

    setMembersVisible(false);
    setMemberSearchQuery('');
    setSelectedMemberUserId(null);
  }, [roleMutationUserId]);

  const handleOpenMemberDetail = useCallback((member: GroupMember) => {
    setSelectedMemberUserId(member.userId);
  }, []);

  const handleCloseMemberDetail = useCallback(() => {
    if (roleMutationUserId) {
      return;
    }

    setSelectedMemberUserId(null);
  }, [roleMutationUserId]);

  const mutateModeratorRole = useCallback(async (member: GroupMember, makeModerator: boolean) => {
    try {
      setRoleMutationUserId(member.userId);

      if (makeModerator) {
        await communityService.assignModerator(groupId, member.userId);
      } else {
        await communityService.revokeModerator(groupId, member.userId);
      }

      await Promise.all([fetchGroupMembers(), fetchGroupData()]);
      setSelectedMemberUserId(null);

      showAlert({
        title: makeModerator
          ? tx('groupDetail.member.alerts.assignedTitle', 'Moderador asignado')
          : tx('groupDetail.member.alerts.revokedTitle', 'Moderador revocado'),
        message: makeModerator
          ? tx(
              'groupDetail.member.alerts.assignedMessage',
              '{{name}} ya puede revisar publicaciones de este grupo.',
              { name: member.name },
            )
          : tx(
              'groupDetail.member.alerts.revokedMessage',
              '{{name}} volvio a rol de miembro dentro del grupo.',
              { name: member.name },
            ),
        tone: 'success',
      });
    } catch (err) {
      console.error('[GroupDetailScreen] Error updating moderator role:', err);
      showError(err, {
        title: tx('groupDetail.member.errors.roleTitle', 'No se pudo actualizar el rol'),
        fallbackMessage: tx(
          'groupDetail.member.errors.roleMessage',
          'Intenta de nuevo para administrar moderadores.',
        ),
      });
    } finally {
      setRoleMutationUserId(null);
    }
  }, [fetchGroupData, fetchGroupMembers, groupId, showAlert, showError, tx]);

  const handlePromoteMember = useCallback((member: GroupMember) => {
    showAlert({
      title: tx('groupDetail.member.actions.promoteTitle', 'Promover a moderador'),
      message: tx(
        'groupDetail.member.actions.promoteMessage',
        '{{name}} podra revisar publicaciones y ver la bandeja del grupo.',
        { name: member.name },
      ),
      tone: 'info',
      actions: [
        { label: tx('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          label: tx('groupDetail.member.actions.promoteButton', 'Promover'),
          onPress: () => {
            void mutateModeratorRole(member, true);
          },
        },
      ],
    });
  }, [mutateModeratorRole, showAlert, tx]);

  const handleRevokeModerator = useCallback((member: GroupMember) => {
    showAlert({
      title: tx('groupDetail.member.actions.revokeTitle', 'Revocar moderacion'),
      message: tx(
        'groupDetail.member.actions.revokeMessage',
        '{{name}} perdera acceso a la bandeja y a las decisiones de revision.',
        { name: member.name },
      ),
      tone: 'warning',
      actions: [
        { label: tx('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          label: tx('groupDetail.member.actions.revokeButton', 'Revocar'),
          style: 'destructive',
          onPress: () => {
            void mutateModeratorRole(member, false);
          },
        },
      ],
    });
  }, [mutateModeratorRole, showAlert, tx]);

  const transferGroupOwnership = useCallback(async (member: GroupMember) => {
    try {
      setRoleMutationUserId(member.userId);
      await communityService.transferOwnership(groupId, member.userId);
      setMembersVisible(false);
      setSelectedMemberUserId(null);
      setGroupMembers([]);
      setMemberSearchQuery('');
      await fetchGroupData();

      showAlert({
        title: tx('groupDetail.member.alerts.transferSuccessTitle', 'Ownership transferido'),
        message: tx(
          'groupDetail.member.alerts.transferSuccessMessage',
          '{{name}} ahora es el owner del grupo. Tu pasaste a moderador y tu acceso de gestion se actualizo.',
          { name: member.name },
        ),
        tone: 'success',
      });
    } catch (err) {
      console.error('[GroupDetailScreen] Error transferring group ownership:', err);
      showError(err, {
        title: tx('groupDetail.member.errors.transferTitle', 'No se pudo transferir el ownership'),
        fallbackMessage: tx(
          'groupDetail.member.errors.transferMessage',
          'Intenta de nuevo para completar el cambio de owner.',
        ),
      });
    } finally {
      setRoleMutationUserId(null);
    }
  }, [fetchGroupData, groupId, showAlert, showError, tx]);

  const handleTransferOwnership = useCallback((member: GroupMember) => {
    showAlert({
      title: tx('groupDetail.member.actions.transferTitle', 'Transferir ownership'),
      message: tx(
        'groupDetail.member.actions.transferMessage',
        'Vas a transferir el ownership de {{group}} a {{name}} ({{role}}). Esta persona ya debe ser moderadora activa. Tu dejaras de ser owner y pasaras a moderador de inmediato.',
        {
          group: group?.name ?? tx('groupDetail.member.actions.thisGroup', 'este grupo'),
          name: member.name,
          role: member.role,
        },
      ),
      tone: 'warning',
      actions: [
        { label: tx('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          label: tx('groupDetail.member.actions.transferButton', 'Transferir a {{name}}', {
            name: member.name,
          }),
          style: 'destructive',
          onPress: () => {
            void transferGroupOwnership(member);
          },
        },
      ],
    });
  }, [group?.name, showAlert, transferGroupOwnership, tx]);

  const muteGroupMember = useCallback(async (member: GroupMember) => {
    try {
      setRoleMutationUserId(member.userId);
      await communityService.muteMember(groupId, member.userId);
      await Promise.all([fetchGroupMembers(), fetchGroupData()]);
      setSelectedMemberUserId(member.userId);

      showAlert({
        title: tx('groupDetail.member.alerts.mutedTitle', 'Miembro silenciado'),
        message: tx(
          'groupDetail.member.alerts.mutedMessage',
          '{{name}} ya no puede publicar ni comentar en este grupo hasta que retires el silencio.',
          { name: member.name },
        ),
        tone: 'success',
      });
    } catch (err) {
      console.error('[GroupDetailScreen] Error silencing group member:', err);
      showError(err, {
        title: tx('groupDetail.member.errors.muteTitle', 'No se pudo silenciar al miembro'),
        fallbackMessage: tx(
          'groupDetail.member.errors.muteMessage',
          'Intenta de nuevo para actualizar el acceso del miembro.',
        ),
      });
    } finally {
      setRoleMutationUserId(null);
    }
  }, [fetchGroupData, fetchGroupMembers, groupId, showAlert, showError, tx]);

  const unmuteGroupMember = useCallback(async (member: GroupMember) => {
    try {
      setRoleMutationUserId(member.userId);
      await communityService.unmuteMember(groupId, member.userId);
      await Promise.all([fetchGroupMembers(), fetchGroupData()]);
      setSelectedMemberUserId(member.userId);

      showAlert({
        title: tx('groupDetail.member.alerts.unmutedTitle', 'Silencio retirado'),
        message: tx(
          'groupDetail.member.alerts.unmutedMessage',
          '{{name}} vuelve a poder publicar y comentar en este grupo.',
          { name: member.name },
        ),
        tone: 'success',
      });
    } catch (err) {
      console.error('[GroupDetailScreen] Error unsilencing group member:', err);
      showError(err, {
        title: tx('groupDetail.member.errors.unmuteTitle', 'No se pudo retirar el silencio'),
        fallbackMessage: tx(
          'groupDetail.member.errors.unmuteMessage',
          'Intenta de nuevo para restaurar el acceso del miembro.',
        ),
      });
    } finally {
      setRoleMutationUserId(null);
    }
  }, [fetchGroupData, fetchGroupMembers, groupId, showAlert, showError, tx]);

  const expelGroupMember = useCallback(async (member: GroupMember) => {
    try {
      setRoleMutationUserId(member.userId);
      await communityService.expelMember(groupId, member.userId);
      await Promise.all([fetchGroupMembers(), fetchGroupData()]);
      setSelectedMemberUserId(null);

      showAlert({
        title: tx('groupDetail.member.alerts.expelledTitle', 'Miembro expulsado'),
        message: tx(
          'groupDetail.member.alerts.expelledMessage',
          '{{name}} salio del grupo y perdio el acceso inmediato.',
          { name: member.name },
        ),
        tone: 'success',
      });
    } catch (err) {
      console.error('[GroupDetailScreen] Error expelling group member:', err);
      showError(err, {
        title: tx('groupDetail.member.errors.expelTitle', 'No se pudo expulsar al miembro'),
        fallbackMessage: tx(
          'groupDetail.member.errors.expelMessage',
          'Intenta de nuevo para sacar a esta persona del grupo.',
        ),
      });
    } finally {
      setRoleMutationUserId(null);
    }
  }, [fetchGroupData, fetchGroupMembers, groupId, showAlert, showError, tx]);

  const handleMuteMember = useCallback((member: GroupMember) => {
    showAlert({
      title: tx('groupDetail.member.actions.muteTitle', 'Silenciar miembro'),
      message: tx(
        member.role === 'MODERATOR'
          ? 'groupDetail.member.actions.muteModeratorMessage'
          : 'groupDetail.member.actions.muteMessage',
        member.role === 'MODERATOR'
          ? '{{name}} no podra crear posts ni comentar hasta que retires el silencio. Tambien perdera la moderacion automaticamente.'
          : '{{name}} no podra crear posts ni comentar hasta que retires el silencio.',
        { name: member.name },
      ),
      tone: 'warning',
      actions: [
        { label: tx('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          label: tx('groupDetail.member.actions.muteButton', 'Silenciar'),
          style: 'destructive',
          onPress: () => {
            void muteGroupMember(member);
          },
        },
      ],
    });
  }, [muteGroupMember, showAlert, tx]);

  const handleUnmuteMember = useCallback((member: GroupMember) => {
    showAlert({
      title: tx('groupDetail.member.actions.unmuteTitle', 'Retirar silencio'),
      message: tx(
        'groupDetail.member.actions.unmuteMessage',
        '{{name}} recuperara la capacidad de publicar y comentar en este grupo.',
        { name: member.name },
      ),
      tone: 'info',
      actions: [
        { label: tx('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          label: tx('groupDetail.member.actions.unmuteButton', 'Quitar silencio'),
          onPress: () => {
            void unmuteGroupMember(member);
          },
        },
      ],
    });
  }, [showAlert, tx, unmuteGroupMember]);

  const handleExpelMember = useCallback((member: GroupMember) => {
    showAlert({
      title: tx('groupDetail.member.actions.expelTitle', 'Expulsar del grupo'),
      message: tx(
        member.role === 'MODERATOR'
          ? 'groupDetail.member.actions.expelModeratorMessage'
          : 'groupDetail.member.actions.expelMessage',
        member.role === 'MODERATOR'
          ? '{{name}} saldra del grupo y perdera el acceso de inmediato. Su moderacion se revocara automaticamente.'
          : '{{name}} saldra del grupo y perdera el acceso de inmediato.',
        { name: member.name },
      ),
      tone: 'error',
      actions: [
        { label: tx('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          label: tx('groupDetail.member.actions.expelButton', 'Expulsar'),
          style: 'destructive',
          onPress: () => {
            void expelGroupMember(member);
          },
        },
      ],
    });
  }, [expelGroupMember, showAlert, tx]);

  const handleCloseReportSheet = useCallback(() => {
    if (isReportSubmitting) {
      return;
    }

    setReportSheetVisible(false);
    setReportTargetPost(null);
    setSelectedReportReason(COMMUNITY_REPORT_REASON_OPTIONS[0].code);
    setReportNote('');
  }, [isReportSubmitting]);

  const handleOpenPostReport = useCallback((post: Post) => {
    setReportTargetPost(post);
    setSelectedReportReason(COMMUNITY_REPORT_REASON_OPTIONS[0].code);
    setReportNote('');
    setReportSheetVisible(true);
  }, []);

  const submitPostReport = useCallback(async () => {
    if (!reportTargetPost) {
      return;
    }

    try {
      setIsReportSubmitting(true);
      await communityService.reportPost(
        reportTargetPost.id,
        selectedReportReason,
        reportNote.trim() || undefined,
      );
      setReportSheetVisible(false);
      setReportTargetPost(null);
      setReportNote('');
      setSelectedReportReason(COMMUNITY_REPORT_REASON_OPTIONS[0].code);

      if (group?.viewerCanModerate) {
        void fetchGroupData();
      }

      showAlert({
        title: tx('groupDetail.report.successTitle', 'Reporte enviado'),
        message: tx(
          'groupDetail.report.successMessage',
          'Gracias. El equipo revisara esta publicacion.',
        ),
        tone: 'success',
      });
    } catch (err) {
      console.error('[GroupDetailScreen] Error reporting post:', err);
      const reportAlert = resolveCommunityReportErrorAlert(err, 'post', tx);

      if (reportAlert) {
        showAlert(reportAlert);
        return;
      }

      showError(err, {
        title: tx('groupDetail.report.errorTitle', 'No se pudo enviar el reporte'),
        fallbackMessage: tx(
          'groupDetail.report.errorMessage',
          'No pudimos enviar tu reporte de esta publicacion.',
        ),
      });
    } finally {
      setIsReportSubmitting(false);
    }
  }, [fetchGroupData, group?.viewerCanModerate, reportNote, reportTargetPost, selectedReportReason, showAlert, showError, tx]);

  /**
   * Handle post submission
   * Validates: Requirement 8.2
   */
  const handlePostSubmit = useCallback(async (data: ComposeData) => {
    try {
      const newPost = await communityService.createPost({
        groupId,
        type: data.type,
        text: data.text,
      });

      setPosts((prev) => [newPost, ...prev]);
      setComposeVisible(false);
    } catch (err) {
      console.error('[GroupDetailScreen] Error creating post:', err);

      const interactionIssue = resolveCommunityInteractionErrorIssue(err, tx);
      if (interactionIssue) {
        if (interactionIssue.kind === 'removed') {
          setComposeVisible(false);
        }

        showAlert(interactionIssue.alert);
        void fetchGroupData();
        return;
      }

      showError(err, {
        title: tx('groupDetail.compose.errorTitle', 'No se pudo publicar'),
        fallbackMessage: tx(
          'groupDetail.compose.errorMessage',
          'La publicacion no se guardo. Verifica tu acceso al grupo e intenta de nuevo.',
        ),
      });
    }
  }, [fetchGroupData, groupId, showAlert, showError, tx]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const filteredModerationCases = moderationCases.filter((item) => {
    if (moderationStatusFilter !== 'ALL' && item.status !== moderationStatusFilter) {
      return false;
    }

    if (moderationPriorityFilter !== 'ALL' && item.priority !== moderationPriorityFilter) {
      return false;
    }

    if (moderationSourceFilter !== 'ALL' && item.source !== moderationSourceFilter) {
      return false;
    }

    if (moderationContentTypeFilter !== 'ALL' && item.contentType !== moderationContentTypeFilter) {
      return false;
    }

    return true;
  });

  const filteredGroupMembers = [...groupMembers]
    .sort((left, right) => {
      const roleDifference = getMemberRoleOrder(left.role) - getMemberRoleOrder(right.role);

      if (roleDifference !== 0) {
        return roleDifference;
      }

      return left.name.localeCompare(right.name, 'es', { sensitivity: 'base' });
    })
    .filter((member) => {
      const normalizedQuery = memberSearchQuery.trim().toLocaleLowerCase();

      if (!normalizedQuery) {
        return true;
      }

      return member.name.toLocaleLowerCase().includes(normalizedQuery);
    });

  const selectedMember = selectedMemberUserId
    ? groupMembers.find((member) => member.userId === selectedMemberUserId) ?? null
    : null;

  const hasActiveModerationFilters =
    moderationStatusFilter !== 'OPEN' ||
    moderationPriorityFilter !== 'ALL' ||
    moderationSourceFilter !== 'ALL' ||
    moderationContentTypeFilter !== 'ALL';

  const selectedCaseRuleHits = selectedCase?.hits.filter((hit) => hit.source === 'RULE_ENGINE') ?? [];
  const selectedCaseAwsHits = selectedCase?.hits.filter((hit) => hit.source === 'AUTO_MODEL') ?? [];
  const selectedCaseReportReasons = selectedCase?.reportSummary?.reasons ?? [];
  const selectedCaseVisibleSummary = selectedCase ? getCaseVisibleSummary(selectedCase) : null;
  const selectedCaseCanBeReviewed = Boolean(
    selectedCase && selectedCase.contentType === 'POST' && selectedCase.status !== 'RESOLVED',
  );

  const selectedMemberModerationStatus = selectedMember
    ? getMemberModerationStatus(selectedMember, tx)
    : null;

  const selectedMemberCanTransferOwnership = Boolean(
    selectedMember && selectedMember.role === 'MODERATOR' && !selectedMember.isMuted,
  );

  useEffect(() => {
    return () => {
      if (focusClearTimeoutRef.current) {
        clearTimeout(focusClearTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pendingFocusedCaseIndex === null || activeTab !== 'review' || isModerationLoading) {
      return;
    }

    if (filteredModerationCases.length === 0) {
      setPendingFocusedCaseIndex(null);
      return;
    }

    const nextIndex = Math.min(pendingFocusedCaseIndex, filteredModerationCases.length - 1);
    const nextCase = filteredModerationCases[nextIndex];

    const frameId = requestAnimationFrame(() => {
      focusModerationCaseInList(nextCase.id);
      setPendingFocusedCaseIndex(null);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [activeTab, filteredModerationCases, focusModerationCaseInList, isModerationLoading, pendingFocusedCaseIndex]);

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
            <Text style={styles.backButton}>← {tx('common.back', 'Volver')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {group?.name || tx('groupDetail.header.fallbackTitle', 'Comunidad')}
          </Text>
          {group?.viewerCanManageRoles ? (
            <TouchableOpacity
              style={styles.headerMenuButton}
              onPress={handleOpenGroupMenu}
              activeOpacity={0.8}
            >
              <Text style={styles.headerMenuButtonText}>⋯</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {isLoading ? (
          <BrandedLoadingState
            title={tx('groupDetail.loading.title', 'Cargando grupo')}
            subtitle={tx(
              'groupDetail.loading.subtitle',
              'Reuniendo publicaciones, recursos y actividad reciente.',
            )}
            variant="community"
            style={styles.loadingState}
          />
        ) : error && !group ? (
          <View style={styles.errorStateContainer}>
            <GlassCard style={styles.errorCard}>
              <View style={styles.errorBadge}>
                <View style={styles.errorBadgeDot} />
                <Text style={styles.errorBadgeText}>
                  {tx('groupDetail.errors.unavailableBadge', 'Grupo no disponible')}
                </Text>
              </View>

              <View style={styles.errorIconWrap}>
                <Text style={styles.errorIconGlyph}>!</Text>
              </View>

              <Text style={styles.errorTitle}>
                {tx('groupDetail.errors.openTitle', 'No pudimos abrir este grupo')}
              </Text>
              <Text style={styles.errorBodyText}>{error}</Text>

              <View style={styles.errorMetaRow}>
                <View style={styles.errorMetaPill}>
                  <Text style={styles.errorMetaText}>
                    {tx('groupDetail.errors.realContent', 'Contenido real')}
                  </Text>
                </View>
                <View style={styles.errorMetaPill}>
                  <Text style={styles.errorMetaText}>
                    {tx('groupDetail.errors.noFallback', 'Sin fallback')}
                  </Text>
                </View>
              </View>

              <View style={styles.errorActionsRow}>
                <TouchableOpacity
                  style={styles.secondaryActionButton}
                  onPress={handleBack}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryActionText}>{tx('common.back', 'Volver')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.85}>
                  <Text style={styles.retryButtonText}>{tx('common.retry', 'Reintentar')}</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        ) : group ? (
          <>
            {/* Content */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={COMMUNITY_ACCENT}
                />
              }
              onScroll={activeTab === 'feed'
                ? ({ nativeEvent }) => {
                    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                    const isCloseToBottom =
                      layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
                    if (isCloseToBottom) {
                      handleLoadMore();
                    }
                  }
                : undefined}
              scrollEventThrottle={400}
            >
              {/* Group Header */}
              <GroupHeader group={group} tx={tx} />

              {group.viewerCanModerate && (
                <GlassCard
                  style={[
                    styles.moderationTabsCard,
                    createAndroidCardSurface(COMMUNITY_ACCENT, 0.96, 0.82),
                  ]}
                  blurIntensity={COMMUNITY_ANDROID_BLUR_INTENSITY}
                >
                  <TouchableOpacity
                    style={[
                      styles.moderationTabButton,
                      activeTab === 'feed' && styles.moderationTabButtonActive,
                    ]}
                    onPress={() => handleSelectTab('feed')}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.moderationTabText,
                        activeTab === 'feed' && styles.moderationTabTextActive,
                      ]}
                    >
                      {tx('groupDetail.tabs.feed', 'Publicaciones')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.moderationTabButton,
                      activeTab === 'review' && styles.moderationTabButtonActive,
                    ]}
                    onPress={() => handleSelectTab('review')}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.moderationTabText,
                        activeTab === 'review' && styles.moderationTabTextActive,
                      ]}
                    >
                      {tx('groupDetail.tabs.review', 'Revisar')}
                    </Text>
                    {(moderationStats?.openCount ?? moderationCases.length) > 0 && (
                      <View style={styles.moderationTabBadge}>
                        <Text style={styles.moderationTabBadgeText}>
                          {moderationStats?.openCount ?? moderationCases.length}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </GlassCard>
              )}

              {/* Feed Section - Requirement 8.1 */}
              <View style={styles.feedSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderCopy}>
                    <Text style={styles.feedTitle}>
                      {activeTab === 'feed'
                        ? tx('groupDetail.tabs.feed', 'Publicaciones')
                        : tx('groupDetail.tabs.reviewInbox', 'Bandeja de revision')}
                    </Text>
                    {activeTab === 'review' && (
                      <Text style={styles.sectionSubtitle}>
                        {moderationStats?.oldestOpenAt
                          ? tx(
                              'groupDetail.review.subtitleWithDate',
                              'Casos abiertos desde {{date}}',
                              { date: moderationStats.oldestOpenAt },
                            )
                          : tx(
                              'groupDetail.review.subtitle',
                              'Revisa y resuelve las publicaciones pendientes del grupo.',
                            )}
                      </Text>
                    )}
                  </View>

                </View>

                {activeTab === 'feed' && lostGroupMembership ? (
                  <GlassCard
                    style={[
                      styles.memberAccessNoticeCard,
                      createAndroidCardSurface(colors.warning, 0.95, 0.78),
                    ]}
                    blurIntensity={COMMUNITY_ANDROID_BLUR_INTENSITY}
                  >
                    <Text style={styles.memberAccessNoticeTitle}>
                      {tx('groupDetail.feed.removedTitle', 'Ya no formas parte del grupo')}
                    </Text>
                    <Text style={styles.memberAccessNoticeText}>
                      {getRemovedMemberInteractionNotice(tx)}
                    </Text>
                  </GlassCard>
                ) : null}

                {activeTab === 'feed' ? (
                  posts.length === 0 ? (
                    <GlassCard
                      style={[
                        styles.emptyCard,
                        createAndroidCardSurface(COMMUNITY_ACCENT, 0.97, 0.86),
                      ]}
                      blurIntensity={COMMUNITY_ANDROID_BLUR_INTENSITY}
                    >
                      <Text style={styles.emptyIcon}>📝</Text>
                      <Text style={styles.emptyTitle}>
                        {tx('groupDetail.feed.emptyTitle', 'Sin publicaciones')}
                      </Text>
                      <Text style={styles.emptyDescription}>
                        {tx(
                          'groupDetail.feed.emptyDescription',
                          'Se el primero en publicar algo en este grupo.',
                        )}
                      </Text>
                    </GlassCard>
                  ) : (
                    <>
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          onPress={() => handlePostPress(post)}
                          onLike={() => handleLikePost(post.id)}
                          onReport={() => handleOpenPostReport(post)}
                          isLiked={likedPosts.has(post.id)}
                          canReport={Boolean(group.isMember && currentUser?.id && post.authorId !== currentUser.id)}
                          style={styles.postCard}
                        />
                      ))}
                      {isLoadingMore && (
                        <View style={styles.loadingMoreContainer}>
                          <ActivityIndicator size="small" color={COMMUNITY_ACCENT} />
                        </View>
                      )}
                    </>
                  )
                ) : (
                  <>
                    {moderationStats && (
                      <GlassCard style={styles.moderationStatsCard}>
                        <View style={styles.moderationStatsGrid}>
                          <View style={styles.moderationStatItem}>
                            <Text style={styles.moderationStatValue}>{moderationStats.openCount}</Text>
                            <Text style={styles.moderationStatLabel}>
                              {tx('groupDetail.review.stats.open', 'Abiertos')}
                            </Text>
                          </View>
                          <View style={styles.moderationStatItem}>
                            <Text style={styles.moderationStatValue}>{moderationStats.highPriorityCount}</Text>
                            <Text style={styles.moderationStatLabel}>
                              {tx('groupDetail.review.stats.highPriority', 'Alta prioridad')}
                            </Text>
                          </View>
                          <View style={styles.moderationStatItem}>
                            <Text style={styles.moderationStatValue}>{moderationStats.resolvedTodayCount}</Text>
                            <Text style={styles.moderationStatLabel}>
                              {tx('groupDetail.review.stats.resolvedToday', 'Resueltos hoy')}
                            </Text>
                          </View>
                        </View>
                      </GlassCard>
                    )}

                    <GlassCard style={styles.filtersCard}>
                      <View style={styles.filtersHeaderRow}>
                        <Text style={styles.filtersTitle}>
                          {tx('groupDetail.review.filters.title', 'Filtros de revision')}
                        </Text>
                        <Text style={styles.filtersSummaryText}>
                          {tx(
                            filteredModerationCases.length === 1
                              ? 'groupDetail.review.filters.summary_one'
                              : 'groupDetail.review.filters.summary_other',
                            filteredModerationCases.length === 1 ? '{{count}} caso' : '{{count}} casos',
                            { count: filteredModerationCases.length },
                          )}
                        </Text>
                      </View>

                      <View style={styles.filterSection}>
                        <Text style={styles.filterSectionLabel}>
                          {tx('groupDetail.review.filters.status', 'Estado')}
                        </Text>
                        <View style={styles.filterChipWrap}>
                          {moderationStatusOptions.map((option) => {
                            const isSelected = moderationStatusFilter === option.value;

                            return (
                              <TouchableOpacity
                                key={option.value}
                                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                                onPress={() => setModerationStatusFilter(option.value)}
                                activeOpacity={0.85}
                              >
                                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                                  {option.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.filterSection}>
                        <Text style={styles.filterSectionLabel}>
                          {tx('groupDetail.review.filters.priority', 'Prioridad')}
                        </Text>
                        <View style={styles.filterChipWrap}>
                          {moderationPriorityOptions.map((option) => {
                            const isSelected = moderationPriorityFilter === option.value;

                            return (
                              <TouchableOpacity
                                key={option.value}
                                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                                onPress={() => setModerationPriorityFilter(option.value)}
                                activeOpacity={0.85}
                              >
                                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                                  {option.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.filterSection}>
                        <Text style={styles.filterSectionLabel}>
                          {tx('groupDetail.review.filters.source', 'Origen')}
                        </Text>
                        <View style={styles.filterChipWrap}>
                          {moderationSourceOptions.map((option) => {
                            const isSelected = moderationSourceFilter === option.value;

                            return (
                              <TouchableOpacity
                                key={option.value}
                                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                                onPress={() => setModerationSourceFilter(option.value)}
                                activeOpacity={0.85}
                              >
                                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                                  {option.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.filterSection}>
                        <Text style={styles.filterSectionLabel}>
                          {tx('groupDetail.review.filters.type', 'Tipo')}
                        </Text>
                        <View style={styles.filterChipWrap}>
                          {moderationContentTypeOptions.map((option) => {
                            const isSelected = moderationContentTypeFilter === option.value;

                            return (
                              <TouchableOpacity
                                key={option.value}
                                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                                onPress={() => setModerationContentTypeFilter(option.value)}
                                activeOpacity={0.85}
                              >
                                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                                  {option.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </GlassCard>

                    {isModerationLoading ? (
                      <View style={styles.reviewSkeletonStack}>
                        {REVIEW_SKELETON_ITEMS.map((item) => (
                          <GlassCard key={item} style={styles.reviewSkeletonCard}>
                            <View style={styles.reviewSkeletonHeaderRow}>
                              <View style={styles.reviewSkeletonAvatar} />
                              <View style={styles.reviewSkeletonHeaderCopy}>
                                <View style={[styles.reviewSkeletonLine, styles.reviewSkeletonTitleLine]} />
                                <View style={[styles.reviewSkeletonLine, styles.reviewSkeletonMetaLine]} />
                              </View>
                              <View style={styles.reviewSkeletonPill} />
                            </View>
                            <View style={styles.reviewSkeletonChipsRow}>
                              <View style={styles.reviewSkeletonChip} />
                              <View style={styles.reviewSkeletonChip} />
                              <View style={[styles.reviewSkeletonChip, styles.reviewSkeletonChipShort]} />
                            </View>
                            <View style={[styles.reviewSkeletonLine, styles.reviewSkeletonBodyLine]} />
                            <View style={[styles.reviewSkeletonLine, styles.reviewSkeletonBodyLineShort]} />
                            <View style={styles.reviewSkeletonSignalsRow}>
                              <View style={styles.reviewSkeletonSignalChip} />
                              <View style={styles.reviewSkeletonSignalChip} />
                            </View>
                          </GlassCard>
                        ))}
                      </View>
                    ) : moderationError ? (
                      <GlassCard style={styles.reviewStateCard}>
                        <Text style={styles.reviewStateTitle}>
                          {tx('groupDetail.review.states.loadErrorTitle', 'No pudimos cargar la revision')}
                        </Text>
                        <Text style={styles.reviewStateDescription}>{moderationError}</Text>
                        <TouchableOpacity
                          style={styles.retryModerationButton}
                          onPress={() => {
                            void fetchModerationData(group);
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.retryModerationButtonText}>
                            {tx('common.retry', 'Reintentar')}
                          </Text>
                        </TouchableOpacity>
                      </GlassCard>
                    ) : filteredModerationCases.length === 0 ? (
                      <GlassCard style={styles.reviewStateCard}>
                        <Text style={styles.emptyIcon}>{hasActiveModerationFilters ? '🔎' : '✅'}</Text>
                        <Text style={styles.reviewStateTitle}>
                          {hasActiveModerationFilters
                            ? tx('groupDetail.review.states.emptyFilteredTitle', 'Sin resultados con estos filtros')
                            : tx('groupDetail.review.states.emptyTitle', 'Sin casos pendientes')}
                        </Text>
                        <Text style={styles.reviewStateDescription}>
                          {hasActiveModerationFilters
                            ? tx(
                                'groupDetail.review.states.emptyFilteredDescription',
                                'No encontramos casos que coincidan con la combinacion actual. Puedes limpiar filtros o volver al feed.',
                              )
                            : tx(
                                'groupDetail.review.states.emptyDescription',
                                'No hay publicaciones abiertas para revisar en este momento. Puedes volver al feed del grupo.',
                              )}
                        </Text>

                        <View style={styles.reviewStateActionsRow}>
                          {hasActiveModerationFilters && (
                            <TouchableOpacity
                              style={styles.reviewStateSecondaryButton}
                              onPress={handleResetModerationFilters}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.reviewStateSecondaryButtonText}>
                                {tx('groupDetail.review.filters.clear', 'Limpiar filtros')}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.retryModerationButton}
                            onPress={() => handleSelectTab('feed')}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.retryModerationButtonText}>
                              {tx('groupDetail.review.states.backToFeed', 'Volver al feed')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </GlassCard>
                    ) : (
                      filteredModerationCases.map((item) => {
                        const priorityStyle = PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.MEDIUM;
                        const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.OPEN;
                        const signalChips = getCaseSignalChips(item, tx);
                        const reportReasonChips = getCaseReportReasonChips(item, tx);
                        const visibleSignalChips = signalChips.slice(0, 2);
                        const hiddenSignalCount = signalChips.length - visibleSignalChips.length;
                        const visibleReportChips = reportReasonChips.slice(0, 2);
                        const hiddenReportCount = reportReasonChips.length - visibleReportChips.length;

                        return (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.9}
                            onLayout={(event) => {
                              caseCardLayoutsRef.current[item.id] = event.nativeEvent.layout.y;
                            }}
                            onPress={() => {
                              void handleOpenModerationCase(item);
                            }}
                          >
                            <GlassCard style={[styles.caseCard, highlightedCaseId === item.id && styles.caseCardFocused]}>
                              <View style={styles.caseHeaderRow}>
                                <View style={styles.caseAuthorRow}>
                                  <View style={[styles.memberAvatar, { backgroundColor: item.authorColor }]}> 
                                    <Text style={styles.memberAvatarText}>{getInitials(item.authorName)}</Text>
                                  </View>
                                  <View style={styles.caseAuthorInfo}>
                                    <Text style={styles.caseAuthorName}>{item.authorName}</Text>
                                    <Text style={styles.caseMetaText}>{item.openedAt}</Text>
                                  </View>
                                </View>

                                <View style={[styles.casePriorityPill, { backgroundColor: priorityStyle.backgroundColor }]}> 
                                  <Text style={[styles.casePriorityText, { color: priorityStyle.textColor }]}> 
                                    {getModerationPriorityLabel(item.priority, tx)}
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.caseChipRow}>
                                <View style={styles.caseChip}>
                                  <Text style={styles.caseChipText}>
                                    {getContentTypeLabel(item.contentType, tx)}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.caseStatusChip,
                                    { backgroundColor: statusStyle.backgroundColor },
                                  ]}
                                >
                                  <Text style={[styles.caseStatusChipText, { color: statusStyle.textColor }]}>
                                    {getCaseStatusLabel(item.status, tx)}
                                  </Text>
                                </View>
                                <View style={styles.caseChip}>
                                  <Text style={styles.caseChipText}>
                                    {getCaseSourceLabel(item.source, tx)}
                                  </Text>
                                </View>
                                {item.reportSummary?.totalCount ? (
                                  <View style={styles.caseChip}>
                                    <Text style={styles.caseChipText}>
                                      {tx('groupDetail.review.caseCard.reports', '{{count}} reportes', {
                                        count: item.reportSummary.totalCount,
                                      })}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>

                              <Text style={styles.caseExcerpt} numberOfLines={3}>
                                {getCaseExcerpt(item, tx)}
                              </Text>

                              {item.summary ? (
                                <Text style={styles.caseSummary} numberOfLines={2}>
                                  {item.summary}
                                </Text>
                              ) : null}

                              {signalChips.length > 0 ? (
                                <View style={styles.caseSignalBlock}>
                                  <Text style={styles.caseSignalLabel}>
                                    {tx('groupDetail.review.caseCard.signals', 'Senales')}
                                  </Text>
                                  <View style={styles.caseSignalRow}>
                                    {visibleSignalChips.map((chip) => (
                                      <View key={chip} style={styles.caseSignalChip}>
                                        <Text style={styles.caseSignalChipText}>{chip}</Text>
                                      </View>
                                    ))}
                                    {hiddenSignalCount > 0 ? (
                                      <View style={styles.caseSignalOverflowChip}>
                                        <Text style={styles.caseSignalOverflowText}>+{hiddenSignalCount}</Text>
                                      </View>
                                    ) : null}
                                  </View>
                                </View>
                              ) : null}

                              {item.reportSummary?.totalCount ? (
                                <View style={styles.caseSignalBlock}>
                                  <Text style={styles.caseSignalLabel}>
                                    {tx('groupDetail.review.caseCard.manualReports', 'Reportes manuales')}
                                  </Text>
                                  {visibleReportChips.length > 0 ? (
                                    <View style={styles.caseSignalRow}>
                                      {visibleReportChips.map((chip) => (
                                        <View key={chip} style={styles.caseReportChip}>
                                          <Text style={styles.caseReportChipText}>{chip}</Text>
                                        </View>
                                      ))}
                                      {hiddenReportCount > 0 ? (
                                        <View style={styles.caseSignalOverflowChip}>
                                          <Text style={styles.caseSignalOverflowText}>+{hiddenReportCount}</Text>
                                        </View>
                                      ) : null}
                                    </View>
                                  ) : (
                                    <Text style={styles.caseSummary}>
                                      {tx(
                                        'groupDetail.review.caseCard.manualReportsFallback',
                                        'Reportes agregados sin detalle publico adicional.',
                                      )}
                                    </Text>
                                  )}
                                </View>
                              ) : null}

                              <Text style={styles.caseFooterHint}>
                                {tx('groupDetail.review.caseCard.openDetail', 'Toca para abrir el detalle tecnico')}
                              </Text>
                            </GlassCard>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </>
                )}
              </View>
            </ScrollView>

            {/* Compose Button */}
            {group.isMember && activeTab === 'feed' && <ComposeButton onPress={handleComposePress} />}
          </>
        ) : null}

        {/* Compose Sheet Modal */}
        <Modal
          visible={composeVisible}
          transparent
          animationType="slide"
          onRequestClose={handleComposeDismiss}
        >
          <View style={styles.modalOverlay}>
            <ComposeSheet
              onSubmit={handlePostSubmit}
              onDismiss={handleComposeDismiss}
              groupId={groupId}
            />
          </View>
        </Modal>

        <Modal
          visible={reportSheetVisible}
          transparent
          animationType="slide"
          presentationStyle="overFullScreen"
          onRequestClose={handleCloseReportSheet}
        >
          <View style={styles.reportModalOverlay}>
            <ReportContentSheet
              title={tx('groupDetail.report.sheetTitle', 'Reportar publicacion')}
              subtitle={tx(
                'groupDetail.report.sheetSubtitle',
                'Elige el motivo principal. Tu identidad no se mostrara al grupo.',
              )}
              selectedReasonCode={selectedReportReason}
              note={reportNote}
              onSelectReason={setSelectedReportReason}
              onNoteChange={setReportNote}
              onCancel={handleCloseReportSheet}
              onSubmit={() => {
                void submitPostReport();
              }}
              isSubmitting={isReportSubmitting}
            />
          </View>
        </Modal>

        <Modal
          visible={groupMenuVisible}
          transparent
          animationType="slide"
          onRequestClose={handleCloseGroupMenu}
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.groupMenuSheetCard}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>{tx('groupDetail.menu.eyebrow', 'Grupo')}</Text>
              <Text style={styles.sheetTitle}>{tx('groupDetail.menu.title', 'Acciones rapidas')}</Text>
              <Text style={styles.sheetSubtitle}>
                {tx(
                  'groupDetail.menu.subtitle',
                  'Accede a la gestion del grupo sin salir de esta pantalla.',
                )}
              </Text>

              <TouchableOpacity
                style={styles.groupMenuAction}
                onPress={handleOpenMembers}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.groupMenuActionTitle}>
                    {tx('groupDetail.menu.membersTitle', 'Miembros del grupo')}
                  </Text>
                  <Text style={styles.groupMenuActionSubtitle}>
                    {tx(
                      'groupDetail.menu.membersSubtitle',
                      'Revisa roles, busca miembros y ajusta moderadores.',
                    )}
                  </Text>
                </View>
                <Text style={styles.groupMenuActionArrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.groupMenuDismissButton}
                onPress={handleCloseGroupMenu}
                activeOpacity={0.85}
              >
                <Text style={styles.groupMenuDismissButtonText}>{tx('common.close', 'Cerrar')}</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>

        <Modal
          visible={moderationSheetVisible}
          transparent
          animationType="slide"
          onRequestClose={handleCloseModerationCase}
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.bottomSheetCard}>
              <View style={styles.sheetHandle} />
              <ScrollView
                style={styles.sheetScrollView}
                contentContainerStyle={styles.sheetContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sheetEyebrow}>{tx('groupDetail.review.sheetEyebrow', 'Revision')}</Text>
                <Text style={styles.sheetTitle}>
                  {getModerationContentLabels(selectedCase, tx).stateTitle}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {selectedCase?.summary
                    || tx(
                      'groupDetail.review.sheetSubtitle',
                      'Verifica el contexto y decide si el contenido debe seguir visible.',
                    )}
                </Text>

                {isCaseLoading ? (
                  <View style={styles.sheetLoadingState}>
                    <ActivityIndicator size="small" color={COMMUNITY_ACCENT} />
                    <Text style={styles.reviewStateDescription}>
                      {tx('groupDetail.review.loadingCase', 'Abriendo detalle del caso...')}
                    </Text>
                  </View>
                ) : selectedCase ? (
                  <>
                    <View style={styles.caseChipRow}>
                      <View style={styles.caseChip}>
                        <Text style={styles.caseChipText}>
                          {getContentTypeLabel(selectedCase.contentType, tx)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.caseStatusChip,
                          {
                            backgroundColor: (STATUS_STYLES[selectedCase.status] ?? STATUS_STYLES.OPEN).backgroundColor,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.caseStatusChipText,
                            { color: (STATUS_STYLES[selectedCase.status] ?? STATUS_STYLES.OPEN).textColor },
                          ]}
                        >
                          {getCaseStatusLabel(selectedCase.status, tx)}
                        </Text>
                      </View>
                      <View style={styles.caseChip}>
                        <Text style={styles.caseChipText}>
                          {getCaseSourceLabel(selectedCase.source, tx)}
                        </Text>
                      </View>
                      <View style={styles.caseChip}>
                        <Text style={styles.caseChipText}>{selectedCase.openedAt}</Text>
                      </View>
                    </View>

                    <GlassCard style={styles.caseDetailCard}>
                      <Text style={styles.caseSectionTitle}>
                        {tx('groupDetail.review.sections.content', 'Contenido y contexto')}
                      </Text>
                      <View style={styles.caseHeaderRow}>
                        <View style={styles.caseAuthorRow}>
                          <View style={[styles.memberAvatar, { backgroundColor: selectedCase.authorColor }]}> 
                            <Text style={styles.memberAvatarText}>{getInitials(selectedCase.authorName)}</Text>
                          </View>
                          <View style={styles.caseAuthorInfo}>
                            <Text style={styles.caseAuthorName}>{selectedCase.authorName}</Text>
                            <Text style={styles.caseMetaText}>
                              {getCommunityRoleLabel(selectedCase.authorRole, tx)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.caseHeaderMetaRow}>
                        <View
                          style={[
                            styles.casePriorityPill,
                            {
                              backgroundColor: (PRIORITY_STYLES[selectedCase.priority] ?? PRIORITY_STYLES.MEDIUM).backgroundColor,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.casePriorityText,
                              { color: (PRIORITY_STYLES[selectedCase.priority] ?? PRIORITY_STYLES.MEDIUM).textColor },
                            ]}
                          >
                            {getModerationPriorityLabel(selectedCase.priority, tx)}
                          </Text>
                        </View>
                        {selectedCase.lastEvaluatedAt ? (
                          <Text style={styles.caseMetaText}>
                            {tx('groupDetail.review.lastEvaluated', 'Ultima evaluacion {{date}}', {
                              date: selectedCase.lastEvaluatedAt,
                            })}
                          </Text>
                        ) : null}
                      </View>

                      <Text style={styles.caseDetailText}>
                        {getCaseExcerpt(selectedCase, tx)}
                      </Text>

                      {selectedCase.contentType === 'COMMENT' && selectedCase.post?.text ? (
                        <View style={styles.relatedContentCard}>
                          <Text style={styles.relatedContentLabel}>
                            {tx('groupDetail.review.parentPost', 'Post padre')}
                          </Text>
                          <Text style={styles.relatedContentText} numberOfLines={4}>
                            {selectedCase.post.text}
                          </Text>
                        </View>
                      ) : null}

                      {selectedCaseVisibleSummary ? (
                        <View style={styles.caseInsightBlock}>
                          <Text style={styles.caseInsightTitle}>
                            {tx('groupDetail.review.currentReason', 'Motivo actual')}
                          </Text>
                          <Text style={styles.caseInsightText}>{selectedCaseVisibleSummary}</Text>
                        </View>
                      ) : null}

                      <View style={styles.caseContextGrid}>
                        <View style={styles.caseContextItem}>
                          <Text style={styles.caseContextLabel}>{tx('groupDetail.review.opened', 'Abierto')}</Text>
                          <Text style={styles.caseContextValue}>{selectedCase.openedAt}</Text>
                        </View>
                        {selectedCase.assignedModeratorName ? (
                          <View style={styles.caseContextItem}>
                            <Text style={styles.caseContextLabel}>{tx('groupDetail.review.assigned', 'Asignado')}</Text>
                            <Text style={styles.caseContextValue}>{selectedCase.assignedModeratorName}</Text>
                          </View>
                        ) : null}
                        {selectedCase.reviewedByName ? (
                          <View style={styles.caseContextItem}>
                            <Text style={styles.caseContextLabel}>
                              {tx('groupDetail.review.reviewedBy', 'Revisado por')}
                            </Text>
                            <Text style={styles.caseContextValue}>{selectedCase.reviewedByName}</Text>
                          </View>
                        ) : null}
                        {selectedCase.resolutionReasonCode ? (
                          <View style={styles.caseContextItem}>
                            <Text style={styles.caseContextLabel}>
                              {tx('groupDetail.review.visibleReason', 'Motivo visible')}
                            </Text>
                            <Text style={styles.caseContextValue}>
                              {formatReasonCode(selectedCase.resolutionReasonCode, tx)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </GlassCard>

                    <GlassCard style={styles.caseDetailCard}>
                      <Text style={styles.caseSectionTitle}>{tx('groupDetail.review.sections.rules', 'Reglas')}</Text>
                      {selectedCaseRuleHits.length > 0 ? (
                        selectedCaseRuleHits.map((hit) => (
                          <View key={hit.id} style={styles.caseInsightBlock}>
                            <View style={styles.caseSignalHeaderRow}>
                              <Text style={styles.caseInsightTitle}>{formatHumanLabel(hit.ruleKey)}</Text>
                              {hit.score ? (
                                <Text style={styles.caseSignalScore}>
                                  {tx('groupDetail.review.score', 'Score {{score}}', { score: hit.score })}
                                </Text>
                              ) : null}
                            </View>
                            <Text style={styles.caseInsightText}>
                              {hit.summary
                                || tx(
                                  'groupDetail.review.ruleFallback',
                                  'Se disparo una regla del motor sin resumen adicional.',
                                )}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.caseSectionEmpty}>
                          {tx('groupDetail.review.sections.rulesEmpty', 'Sin senales de reglas para este caso.')}
                        </Text>
                      )}
                    </GlassCard>

                    <GlassCard style={styles.caseDetailCard}>
                      <Text style={styles.caseSectionTitle}>{tx('groupDetail.review.sections.aws', 'AWS')}</Text>
                      {selectedCaseAwsHits.length > 0 ? (
                        selectedCaseAwsHits.map((hit) => (
                          <View key={hit.id} style={styles.caseInsightBlock}>
                            <View style={styles.caseSignalHeaderRow}>
                              <Text style={styles.caseInsightTitle}>{formatHumanLabel(hit.ruleKey)}</Text>
                              {hit.score ? (
                                <Text style={styles.caseSignalScore}>
                                  {tx('groupDetail.review.score', 'Score {{score}}', { score: hit.score })}
                                </Text>
                              ) : null}
                            </View>
                            <Text style={styles.caseInsightText}>
                              {hit.summary
                                || tx(
                                  'groupDetail.review.awsFallback',
                                  'El analisis automatico detecto una senal relevante.',
                                )}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.caseSectionEmpty}>
                          {tx(
                            'groupDetail.review.sections.awsEmpty',
                            'Sin senales automaticas de AWS para este caso.',
                          )}
                        </Text>
                      )}
                    </GlassCard>

                    <GlassCard style={styles.caseDetailCard}>
                      <Text style={styles.caseSectionTitle}>
                        {tx('groupDetail.review.sections.manualReports', 'Reportes manuales')}
                      </Text>
                      {selectedCase.reportSummary?.totalCount ? (
                        <>
                          <Text style={styles.caseInsightText}>
                            {tx(
                              'groupDetail.review.manualReportsSummary',
                              '{{count}} reportes agregados sin exponer la identidad de quien reporto.',
                              { count: selectedCase.reportSummary.totalCount },
                            )}
                          </Text>
                          <View style={styles.caseReportsList}>
                            {selectedCaseReportReasons.map((reason) => (
                              <View key={reason.reasonCode} style={styles.caseReportRow}>
                                <Text style={styles.caseReportReason}>
                                  {formatReasonCode(reason.reasonCode, tx)}
                                </Text>
                                <View style={styles.caseReportCountPill}>
                                  <Text style={styles.caseReportCountText}>{reason.count}</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        </>
                      ) : (
                        <Text style={styles.caseSectionEmpty}>
                          {tx(
                            'groupDetail.review.sections.manualReportsEmpty',
                            'Sin reportes manuales asociados a este caso.',
                          )}
                        </Text>
                      )}
                    </GlassCard>

                    {selectedCaseCanBeReviewed ? (
                      <>
                        <Text style={styles.reasonChooserTitle}>
                          {tx(
                            'groupDetail.review.reasonChooser',
                            'Motivo visible si rechazas o remueves',
                          )}
                        </Text>
                        <View style={styles.reasonOptionsWrap}>
                          {reviewReasonOptions.map((reason) => {
                            const isSelected = selectedRejectReason === reason.code;

                            return (
                              <TouchableOpacity
                                key={reason.code}
                                style={[
                                  styles.reasonOption,
                                  isSelected && styles.reasonOptionSelected,
                                ]}
                                onPress={() => setSelectedRejectReason(reason.code)}
                                activeOpacity={0.85}
                              >
                                <Text
                                  style={[
                                    styles.reasonOptionText,
                                    isSelected && styles.reasonOptionTextSelected,
                                  ]}
                                >
                                  {reason.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <View style={styles.sheetActionsRow}>
                          <TouchableOpacity
                            style={[styles.sheetActionButton, styles.sheetApproveButton]}
                            onPress={handleApproveCase}
                            disabled={isDecisionSubmitting}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.sheetApproveButtonText}>
                              {isDecisionSubmitting
                                ? tx('groupDetail.review.saving', 'Guardando...')
                                : tx('groupDetail.review.actions.approveButton', 'Aprobar')}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.sheetActionButton, styles.sheetRejectButton]}
                            onPress={handleRejectCase}
                            disabled={isDecisionSubmitting}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.sheetRejectButtonText}>
                              {tx('groupDetail.review.actions.rejectButton', 'Rechazar')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={[styles.sheetActionButton, styles.sheetRemoveButton]}
                          onPress={handleRemoveCase}
                          disabled={isDecisionSubmitting}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.sheetRemoveButtonText}>
                            {tx('groupDetail.review.actions.hideAndRemove', 'Ocultar y remover')}
                          </Text>
                        </TouchableOpacity>

                        {decisionErrorMessage ? (
                          <View style={styles.decisionErrorCard}>
                            <Text style={styles.decisionErrorTitle}>
                              {tx('groupDetail.review.errors.saveTitle', 'No pudimos guardar la decision')}
                            </Text>
                            <Text style={styles.decisionErrorText}>{decisionErrorMessage}</Text>
                            <TouchableOpacity
                              style={styles.decisionRetryButton}
                              onPress={handleRetryDecision}
                              disabled={isDecisionSubmitting || !lastDecisionAttempt}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.decisionRetryButtonText}>
                                {isDecisionSubmitting
                                  ? tx('groupDetail.review.retrying', 'Reintentando...')
                                  : tx('common.retry', 'Reintentar')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </>
                    ) : (
                        <GlassCard style={styles.reviewStateCard}>
                          <Text style={styles.reviewStateTitle}>
                            {tx('groupDetail.review.resolvedTitle', 'Caso ya resuelto')}
                          </Text>
                          <Text style={styles.reviewStateDescription}>
                            {selectedCase.reviewedByName
                              ? tx(
                                  'groupDetail.review.resolvedDescriptionBy',
                                  'Este caso ya fue resuelto por {{name}}.',
                                  { name: selectedCase.reviewedByName },
                                )
                              : tx(
                                  'groupDetail.review.resolvedDescription',
                                  'Este caso ya fue resuelto y no admite nuevas decisiones desde la app.',
                                )}
                          </Text>
                        </GlassCard>
                    )}
                  </>
                ) : null}
              </ScrollView>
            </GlassCard>
          </View>
        </Modal>

        <Modal
          visible={membersVisible}
          transparent
          animationType="slide"
          onRequestClose={handleCloseMembers}
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.bottomSheetCard}>
              <View style={styles.sheetHandle} />
              <View style={styles.membersSheetHeader}>
                <View>
                  <Text style={styles.sheetEyebrow}>{tx('groupDetail.member.sheetEyebrow', 'Roles')}</Text>
                  <Text style={styles.sheetTitle}>{tx('groupDetail.member.sheetTitle', 'Moderadores del grupo')}</Text>
                </View>
                <TouchableOpacity onPress={handleCloseMembers} activeOpacity={0.75}>
                  <Text style={styles.membersCloseText}>{tx('common.close', 'Cerrar')}</Text>
                </TouchableOpacity>
              </View>

              {isMembersLoading ? (
                <View style={styles.sheetLoadingState}>
                  <ActivityIndicator size="small" color={COMMUNITY_ACCENT} />
                  <Text style={styles.reviewStateDescription}>
                    {tx('groupDetail.member.loading', 'Cargando miembros...')}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.sheetScrollView}
                  contentContainerStyle={styles.sheetContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.membersSearchCard}>
                    <Text style={styles.membersSearchLabel}>
                      {tx('groupDetail.member.searchLabel', 'Buscar por nombre')}
                    </Text>
                    <TextInput
                      value={memberSearchQuery}
                      onChangeText={setMemberSearchQuery}
                      placeholder={tx('groupDetail.member.searchPlaceholder', 'Busca un miembro')}
                      placeholderTextColor={colors.text.tertiary}
                      style={styles.membersSearchInput}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>

                  {filteredGroupMembers.length === 0 ? (
                    <GlassCard style={styles.reviewStateCard}>
                      <Text style={styles.reviewStateTitle}>
                        {tx('groupDetail.member.emptyTitle', 'Sin coincidencias')}
                      </Text>
                      <Text style={styles.reviewStateDescription}>
                        {tx(
                          'groupDetail.member.emptyDescription',
                          'No encontramos miembros con ese nombre dentro de este grupo.',
                        )}
                      </Text>
                    </GlassCard>
                  ) : filteredGroupMembers.map((member) => {
                    const isOwner = member.role === 'OWNER';
                    const isBusy = roleMutationUserId === member.userId;
                    const moderationStatus = getMemberModerationStatus(member, tx);

                    return (
                      <TouchableOpacity
                        key={member.userId}
                        style={styles.memberRow}
                        onPress={() => handleOpenMemberDetail(member)}
                        activeOpacity={0.85}
                      >
                        <View style={[styles.memberAvatar, { backgroundColor: member.avatarColor }]}> 
                          <Text style={styles.memberAvatarText}>{getInitials(member.name)}</Text>
                        </View>

                        <View style={styles.memberInfo}>
                          <View style={styles.memberNameRow}>
                            <Text style={styles.memberName}>{member.name}</Text>
                            <View style={styles.memberRolePill}>
                              <Text style={styles.memberRoleText}>{getCommunityRoleLabel(member.role, tx)}</Text>
                            </View>
                          </View>
                          <Text style={styles.memberMeta}>
                            {isOwner
                              ? tx('groupDetail.member.status.ownerDetail', 'Owner actual del grupo')
                              : tx(
                                  member.grantedByName
                                    ? 'groupDetail.member.joinedWithGrantor'
                                    : 'groupDetail.member.joined',
                                  member.grantedByName
                                    ? 'Unido {{date}} · por {{name}}'
                                    : 'Unido {{date}}',
                                  { date: member.joinedAt, name: member.grantedByName },
                                )}
                          </Text>
                          <Text style={styles.memberModerationState}>{moderationStatus.label}</Text>
                          <Text style={styles.memberModerationMeta}>{moderationStatus.detail}</Text>
                        </View>

                        <View style={styles.memberDetailButton}>
                          {isBusy ? (
                            <ActivityIndicator size="small" color={colors.text.inverse} />
                          ) : (
                            <Text style={styles.memberDetailButtonText}>
                              {isOwner
                                ? tx('groupDetail.member.view', 'Ver')
                                : tx('groupDetail.member.manage', 'Gestionar')}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </GlassCard>
          </View>
        </Modal>

        <Modal
          visible={Boolean(selectedMember)}
          transparent
          animationType="slide"
          onRequestClose={handleCloseMemberDetail}
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.bottomSheetCard}>
              <View style={styles.sheetHandle} />
              <View style={styles.membersSheetHeader}>
                <View>
                  <Text style={styles.sheetEyebrow}>{tx('groupDetail.member.detailEyebrow', 'Miembro')}</Text>
                  <Text style={styles.sheetTitle}>{tx('groupDetail.member.detailTitle', 'Detalle y gestion')}</Text>
                </View>
                <TouchableOpacity onPress={handleCloseMemberDetail} activeOpacity={0.75}>
                  <Text style={styles.membersCloseText}>{tx('common.close', 'Cerrar')}</Text>
                </TouchableOpacity>
              </View>

              {selectedMember ? (
                <ScrollView
                  style={styles.sheetScrollView}
                  contentContainerStyle={styles.sheetContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.memberDetailHero}>
                    <View style={[styles.memberDetailAvatar, { backgroundColor: selectedMember.avatarColor }]}> 
                      <Text style={styles.memberDetailAvatarText}>{getInitials(selectedMember.name)}</Text>
                    </View>
                    <Text style={styles.memberDetailName}>{selectedMember.name}</Text>
                    <View style={styles.memberRolePill}>
                      <Text style={styles.memberRoleText}>
                        {getCommunityRoleLabel(selectedMember.role, tx)}
                      </Text>
                    </View>
                  </View>

                  <GlassCard style={styles.caseDetailCard}>
                    <Text style={styles.caseSectionTitle}>
                      {tx('groupDetail.member.sections.status', 'Estado de moderacion')}
                    </Text>
                    <Text style={styles.memberDetailStatusTitle}>
                      {selectedMemberModerationStatus?.label}
                    </Text>
                    <Text style={styles.memberDetailStatusText}>
                      {selectedMemberModerationStatus?.detail}
                    </Text>

                    <View style={styles.caseContextGrid}>
                      <View style={styles.caseContextItem}>
                        <Text style={styles.caseContextLabel}>
                          {tx('groupDetail.member.sections.joinedGroup', 'Unido al grupo')}
                        </Text>
                        <Text style={styles.caseContextValue}>{selectedMember.joinedAt}</Text>
                      </View>
                      {selectedMember.grantedAt ? (
                        <View style={styles.caseContextItem}>
                          <Text style={styles.caseContextLabel}>
                            {tx('groupDetail.member.sections.lastGranted', 'Ultima asignacion')}
                          </Text>
                          <Text style={styles.caseContextValue}>{selectedMember.grantedAt}</Text>
                        </View>
                      ) : null}
                      {selectedMember.grantedByName ? (
                        <View style={styles.caseContextItem}>
                          <Text style={styles.caseContextLabel}>
                            {tx('groupDetail.member.sections.grantedBy', 'Asignado por')}
                          </Text>
                          <Text style={styles.caseContextValue}>{selectedMember.grantedByName}</Text>
                        </View>
                      ) : null}
                      {selectedMember.isMuted && selectedMember.mutedAt ? (
                        <View style={styles.caseContextItem}>
                          <Text style={styles.caseContextLabel}>
                            {tx('groupDetail.member.sections.mutedSince', 'Silenciado desde')}
                          </Text>
                          <Text style={styles.caseContextValue}>{selectedMember.mutedAt}</Text>
                        </View>
                      ) : null}
                      {selectedMember.isMuted && selectedMember.mutedByName ? (
                        <View style={styles.caseContextItem}>
                          <Text style={styles.caseContextLabel}>
                            {tx('groupDetail.member.sections.mutedBy', 'Silenciado por')}
                          </Text>
                          <Text style={styles.caseContextValue}>{selectedMember.mutedByName}</Text>
                        </View>
                      ) : null}
                    </View>
                  </GlassCard>

                  {selectedMember.role === 'OWNER' ? (
                    <GlassCard style={styles.reviewStateCard}>
                      <Text style={styles.reviewStateTitle}>
                        {tx('groupDetail.member.ownerTitle', 'Owner sin acciones de gestion')}
                      </Text>
                      <Text style={styles.reviewStateDescription}>
                        {tx(
                          'groupDetail.member.ownerDescription',
                          'El owner actual queda visible en esta vista, pero no muestra acciones destructivas ni cambios de rol en el MVP.',
                        )}
                      </Text>
                    </GlassCard>
                  ) : (
                    <View style={styles.sheetActionsStack}>
                      {!selectedMember.isMuted ? (
                        <TouchableOpacity
                          style={[
                            styles.sheetActionButton,
                            selectedMember.role === 'MODERATOR'
                              ? styles.sheetRemoveButton
                              : styles.sheetApproveButton,
                          ]}
                          onPress={() => {
                            if (selectedMember.role === 'MODERATOR') {
                              handleRevokeModerator(selectedMember);
                            } else {
                              handlePromoteMember(selectedMember);
                            }
                          }}
                          disabled={roleMutationUserId === selectedMember.userId}
                          activeOpacity={0.85}
                        >
                          {roleMutationUserId === selectedMember.userId ? (
                            <ActivityIndicator size="small" color={colors.text.inverse} />
                          ) : (
                            <Text
                              style={
                                selectedMember.role === 'MODERATOR'
                                  ? styles.sheetRemoveButtonText
                                  : styles.sheetApproveButtonText
                              }
                            >
                              {selectedMember.role === 'MODERATOR'
                                ? tx('groupDetail.member.actions.revokeTitle', 'Revocar moderacion')
                                : tx('groupDetail.member.actions.promoteTitle', 'Promover a moderador')}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={[
                          styles.sheetActionButton,
                          selectedMember.isMuted ? styles.sheetApproveButton : styles.sheetMuteButton,
                        ]}
                        onPress={() => {
                          if (selectedMember.isMuted) {
                            handleUnmuteMember(selectedMember);
                          } else {
                            handleMuteMember(selectedMember);
                          }
                        }}
                        disabled={roleMutationUserId === selectedMember.userId}
                        activeOpacity={0.85}
                      >
                        {roleMutationUserId === selectedMember.userId ? (
                          <ActivityIndicator size="small" color={colors.text.inverse} />
                        ) : (
                          <Text style={styles.sheetApproveButtonText}>
                            {selectedMember.isMuted
                              ? tx('groupDetail.member.actions.unmuteButton', 'Quitar silencio')
                              : tx('groupDetail.member.actions.muteTitle', 'Silenciar miembro')}
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.sheetActionButton, styles.sheetRejectButton]}
                        onPress={() => {
                          handleExpelMember(selectedMember);
                        }}
                        disabled={roleMutationUserId === selectedMember.userId}
                        activeOpacity={0.85}
                      >
                        {roleMutationUserId === selectedMember.userId ? (
                          <ActivityIndicator size="small" color={colors.text.inverse} />
                        ) : (
                          <Text style={styles.sheetRejectButtonText}>
                            {tx('groupDetail.member.actions.expelTitle', 'Expulsar del grupo')}
                          </Text>
                        )}
                      </TouchableOpacity>

                      {selectedMemberCanTransferOwnership ? (
                        <TouchableOpacity
                          style={[styles.sheetActionButton, styles.sheetTransferButton]}
                          onPress={() => {
                            handleTransferOwnership(selectedMember);
                          }}
                          disabled={roleMutationUserId === selectedMember.userId}
                          activeOpacity={0.85}
                        >
                          {roleMutationUserId === selectedMember.userId ? (
                            <ActivityIndicator size="small" color={colors.text.primary} />
                          ) : (
                              <Text style={styles.sheetTransferButtonText}>
                                {tx('groupDetail.member.actions.transferTitle', 'Transferir ownership')}
                              </Text>
                          )}
                        </TouchableOpacity>
                      ) : null}

                      {selectedMember.role !== 'MODERATOR' && !selectedMember.isMuted ? (
                        <Text style={styles.memberDetailHintText}>
                            {tx(
                              'groupDetail.member.transferHint',
                              'Para transferir ownership, primero debes convertir a esta persona en moderador activo.',
                            )}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </ScrollView>
              ) : null}
            </GlassCard>
          </View>
        </Modal>

        <PushToast
          visible={Boolean(reviewToast)}
          title={reviewToast?.title ?? ''}
          body={reviewToast?.body ?? ''}
          onDismiss={handleDismissReviewToast}
          autoDismissMs={2600}
        />
      </SafeAreaView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backButton: {
    fontSize: typography.fontSize.base,
    color: colors.accent,
    fontFamily: typography.fontFamily.medium,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  headerSpacer: {
    width: 60,
  },
  headerMenuButton: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  headerMenuButtonText: {
    fontSize: 28,
    lineHeight: 28,
    color: COMMUNITY_ACCENT,
    fontFamily: typography.fontFamily.semibold,
  },

  // Scroll view styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  errorStateContainer: {
    flex: 1,
    padding: spacing.base,
    justifyContent: 'center',
  },
  errorCard: {
    padding: spacing.xl,
    borderColor: `${colors.error}22`,
    backgroundColor: `${colors.error}08`,
    ...shadows.lg,
  },
  errorBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.error}12`,
    borderWidth: 1,
    borderColor: `${colors.error}18`,
    marginBottom: spacing.lg,
  },
  errorBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    marginRight: spacing.xs,
  },
  errorBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.background.primary}80`,
    borderWidth: 1,
    borderColor: `${colors.error}14`,
    marginBottom: spacing.lg,
  },
  errorIconGlyph: {
    fontSize: typography.fontSize['2xl'],
    lineHeight: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.error,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  errorBodyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    marginBottom: spacing.lg,
  },
  errorMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  errorMetaPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.background.primary}75`,
    borderWidth: 1,
    borderColor: `${colors.border.medium}50`,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorMetaText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  errorActionsRow: {
    flexDirection: 'row',
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: `${colors.text.primary}14`,
    backgroundColor: `${colors.background.primary}68`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  secondaryActionText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },

  // Group header styles
  groupHeader: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  groupIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  groupIconText: {
    fontSize: 24,
  },
  groupHeaderInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  groupDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    marginBottom: spacing.sm,
  },
  groupStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  groupStatText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  groupStatDot: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginHorizontal: spacing.xs,
  },
  groupGrowth: {
    color: colors.success,
    fontFamily: typography.fontFamily.medium,
  },

  // Resources section styles
  resourcesSection: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  resourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resourcesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourcesIcon: {
    fontSize: typography.fontSize.lg,
    marginRight: spacing.sm,
  },
  resourcesTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  resourcesBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  resourcesBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
  expandIcon: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  resourcesList: {
    marginTop: spacing.md,
  },

  // Resource card styles
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  resourceIcon: {
    fontSize: typography.fontSize.xl,
    marginRight: spacing.md,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  resourceArrow: {
    fontSize: typography.fontSize.xl,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },

  // Feed section styles
  feedSection: {
    marginTop: spacing.sm,
  },
  memberAccessNoticeCard: {
    marginBottom: spacing.base,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: `${colors.warning}22`,
    backgroundColor: `${colors.warning}0D`,
  },
  memberAccessNoticeTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  memberAccessNoticeText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionHeaderCopy: {
    flex: 1,
  },
  feedTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  sectionSubtitle: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  manageRolesButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: `${COMMUNITY_ACCENT}12`,
    borderWidth: 1,
    borderColor: `${COMMUNITY_ACCENT}28`,
  },
  manageRolesButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: COMMUNITY_ACCENT,
  },
  postCard: {
    marginBottom: spacing.md,
  },
  moderationTabsCard: {
    marginBottom: spacing.md,
    padding: spacing.xs,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  moderationTabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: `${colors.background.primary}72`,
  },
  moderationTabButtonActive: {
    backgroundColor: `${COMMUNITY_ACCENT}16`,
  },
  moderationTabText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  moderationTabTextActive: {
    color: COMMUNITY_ACCENT,
    fontFamily: typography.fontFamily.semibold,
  },
  moderationTabBadge: {
    minWidth: 22,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: COMMUNITY_ACCENT,
    alignItems: 'center',
  },
  moderationTabBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
  moderationStatsCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  filtersCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  filtersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  filtersTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  filtersSummaryText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  filterSection: {
    gap: spacing.sm,
  },
  filterSectionLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  filterChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.background.primary}70`,
    borderWidth: 1,
    borderColor: `${colors.border.light}90`,
  },
  filterChipActive: {
    backgroundColor: `${COMMUNITY_ACCENT}12`,
    borderColor: `${COMMUNITY_ACCENT}42`,
  },
  filterChipText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: COMMUNITY_ACCENT,
    fontFamily: typography.fontFamily.semibold,
  },
  moderationStatsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  moderationStatItem: {
    flex: 1,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: `${colors.background.primary}74`,
    borderWidth: 1,
    borderColor: `${colors.border.light}70`,
    alignItems: 'center',
  },
  moderationStatValue: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  moderationStatLabel: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  reviewStateCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reviewStateTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  reviewStateDescription: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  reviewStateActionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reviewStateSecondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    backgroundColor: `${colors.background.primary}78`,
    borderWidth: 1,
    borderColor: `${colors.border.medium}85`,
  },
  reviewStateSecondaryButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  reviewSkeletonStack: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  reviewSkeletonCard: {
    padding: spacing.base,
    gap: spacing.md,
  },
  reviewSkeletonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewSkeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.background.primary}88`,
  },
  reviewSkeletonHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  reviewSkeletonLine: {
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.background.primary}88`,
  },
  reviewSkeletonTitleLine: {
    width: '56%',
    height: 13,
  },
  reviewSkeletonMetaLine: {
    width: '34%',
    height: 10,
  },
  reviewSkeletonPill: {
    width: 64,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.background.primary}88`,
  },
  reviewSkeletonChipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  reviewSkeletonChip: {
    width: 78,
    height: 22,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.background.primary}88`,
  },
  reviewSkeletonChipShort: {
    width: 52,
  },
  reviewSkeletonBodyLine: {
    width: '100%',
    height: 12,
  },
  reviewSkeletonBodyLineShort: {
    width: '72%',
    height: 12,
  },
  reviewSkeletonSignalsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  reviewSkeletonSignalChip: {
    width: 110,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: `${COMMUNITY_ACCENT}12`,
  },
  retryModerationButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: COMMUNITY_ACCENT,
  },
  retryModerationButtonText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.sm,
  },
  caseCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  caseCardFocused: {
    borderWidth: 1,
    borderColor: `${COMMUNITY_ACCENT}46`,
    backgroundColor: `${COMMUNITY_ACCENT}08`,
    ...shadows.sm,
  },
  caseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  caseAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  caseAuthorInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  caseAuthorName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  caseMetaText: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  casePriorityPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  casePriorityText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
  },
  caseChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  caseChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.background.tertiary}B8`,
  },
  caseStatusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  caseStatusChipText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
  },
  caseChipText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
  },
  caseExcerpt: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  caseSummary: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  caseSignalBlock: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  caseSignalLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  caseSignalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  caseSignalChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: `${COMMUNITY_ACCENT}10`,
    borderWidth: 1,
    borderColor: `${COMMUNITY_ACCENT}1E`,
  },
  caseSignalChipText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: COMMUNITY_ACCENT,
  },
  caseReportChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.warning}12`,
    borderWidth: 1,
    borderColor: `${colors.warning}20`,
  },
  caseReportChipText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.warning,
  },
  caseSignalOverflowChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.background.primary}80`,
    borderWidth: 1,
    borderColor: `${colors.border.medium}85`,
  },
  caseSignalOverflowText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
  },
  caseFooterHint: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.xs,
    color: COMMUNITY_ACCENT,
    fontFamily: typography.fontFamily.semibold,
  },

  // Empty state styles
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: borderRadius.full,
    backgroundColor: COMMUNITY_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },

  // Compose button styles
  composeButton: {
    position: 'absolute',
    bottom: spacing['2xl'],
    right: spacing.base,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  composeButtonIcon: {
    fontSize: 24,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingMoreContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },

  // Bottom sheet styles
  bottomSheetCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    maxHeight: '88%',
  },
  groupMenuSheetCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.border.dark}66`,
    marginBottom: spacing.base,
  },
  sheetScrollView: {
    flexGrow: 0,
  },
  sheetContent: {
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  sheetEyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: COMMUNITY_ACCENT,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
  },
  sheetTitle: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  sheetSubtitle: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  sheetLoadingState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  caseDetailCard: {
    padding: spacing.base,
    gap: spacing.md,
  },
  caseSectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  caseDetailText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  caseHeaderMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  relatedContentCard: {
    borderRadius: borderRadius.large,
    padding: spacing.md,
    backgroundColor: `${colors.background.primary}74`,
    borderWidth: 1,
    borderColor: `${colors.border.light}80`,
    gap: spacing.xs,
  },
  relatedContentLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  relatedContentText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  caseContextGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  caseContextItem: {
    minWidth: '46%',
    flexGrow: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.large,
    backgroundColor: `${colors.background.primary}72`,
    borderWidth: 1,
    borderColor: `${colors.border.light}75`,
    gap: 2,
  },
  caseContextLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  caseContextValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.medium,
  },
  caseInsightBlock: {
    gap: spacing.xs,
  },
  caseInsightTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  caseInsightText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  caseInsightBullet: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  caseSignalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  caseSignalScore: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
  },
  caseSectionEmpty: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  caseReportsList: {
    gap: spacing.sm,
  },
  caseReportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  caseReportReason: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  caseReportCountPill: {
    minWidth: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.warning}14`,
    alignItems: 'center',
  },
  caseReportCountText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.warning,
  },
  reasonChooserTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  reasonOptionsWrap: {
    gap: spacing.sm,
  },
  reasonOption: {
    borderWidth: 1,
    borderColor: `${colors.border.medium}90`,
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: `${colors.background.primary}76`,
  },
  reasonOptionSelected: {
    borderColor: `${COMMUNITY_ACCENT}60`,
    backgroundColor: `${COMMUNITY_ACCENT}10`,
  },
  reasonOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  reasonOptionTextSelected: {
    color: COMMUNITY_ACCENT,
    fontFamily: typography.fontFamily.semibold,
  },
  sheetActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sheetActionButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  sheetActionsStack: {
    gap: spacing.sm,
  },
  sheetApproveButton: {
    backgroundColor: colors.success,
  },
  sheetApproveButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
  sheetRejectButton: {
    backgroundColor: colors.error,
  },
  sheetRejectButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
  sheetMuteButton: {
    backgroundColor: colors.warning,
  },
  sheetRemoveButton: {
    marginTop: spacing.sm,
    backgroundColor: '#5B1324',
  },
  sheetRemoveButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
  sheetTransferButton: {
    backgroundColor: `${colors.warning}1A`,
    borderWidth: 1,
    borderColor: `${colors.warning}42`,
  },
  sheetTransferButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warning,
  },
  memberDetailHintText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    textAlign: 'center',
  },
  decisionErrorCard: {
    marginTop: spacing.md,
    padding: spacing.base,
    borderRadius: borderRadius.large,
    backgroundColor: `${colors.error}08`,
    borderWidth: 1,
    borderColor: `${colors.error}20`,
    gap: spacing.sm,
  },
  decisionErrorTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.error,
  },
  decisionErrorText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  decisionRetryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
  },
  decisionRetryButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
  membersSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  membersSearchCard: {
    gap: spacing.xs,
    padding: spacing.base,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: `${colors.border.light}80`,
    backgroundColor: `${colors.background.primary}70`,
  },
  membersSearchLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  membersSearchInput: {
    minHeight: 44,
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.background.tertiary}C8`,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
  },
  membersCloseText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: COMMUNITY_ACCENT,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  memberName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  memberRolePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.background.tertiary}C8`,
  },
  memberRoleText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.secondary,
  },
  memberMeta: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  memberModerationState: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  memberModerationMeta: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  memberDetailButton: {
    minWidth: 92,
    minHeight: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    backgroundColor: `${colors.text.primary}E6`,
  },
  memberDetailButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
  memberDetailHero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  memberDetailAvatar: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDetailAvatarText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
  memberDetailName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  memberDetailStatusTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  memberDetailStatusText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  memberActionButton: {
    minWidth: 94,
    minHeight: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  memberActionPrimary: {
    backgroundColor: COMMUNITY_ACCENT,
  },
  memberActionDanger: {
    backgroundColor: colors.error,
  },
  memberActionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
  groupMenuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: `${COMMUNITY_ACCENT}26`,
    backgroundColor: `${COMMUNITY_ACCENT}10`,
  },
  groupMenuActionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  groupMenuActionSubtitle: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  groupMenuActionArrow: {
    fontSize: typography.fontSize.lg,
    color: COMMUNITY_ACCENT,
    fontFamily: typography.fontFamily.semibold,
  },
  groupMenuDismissButton: {
    minHeight: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.background.tertiary}D0`,
  },
  groupMenuDismissButtonText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export default GroupDetailScreen;
