/**
 * Community Service - Groups, posts, comments, and likes management
 */

import { mutation, query, subscribe } from './graphql';
import { queuePendingAction, getIsConnected } from './sync';
import type {
  Comment,
  Group,
  GroupMember,
  ModerationCase,
  ModerationHit,
  ModerationStats,
  Post,
  PostType,
} from '../types/community';

const AUTHOR_COLOR_PALETTE = ['#0F766E', '#2563EB', '#B45309', '#C2410C', '#BE123C', '#7C3AED'];

export interface CreatePostRequest {
  groupId: string;
  type: PostType;
  text: string;
  attachments?: string[];
}

export interface CreateCommentRequest {
  postId: string;
  text: string;
  parentCommentId?: string;
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  type: Group['type'];
  price?: number;
  period?: string;
  icon?: string;
  iconColor?: string;
  backgroundColor?: string;
  tags?: string[];
}

export interface PostsResponse {
  posts: Post[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface GroupDetailResponse extends Group {
  isMember: boolean;
  posts: Post[];
}

export interface PostDetailResponse extends Omit<Post, 'comments'> {
  comments: Comment[];
}

interface CommunityAuthorResponse {
  id: string;
  name: string;
  avatarUrl?: string | null;
  roleLabel: string;
}

interface CommunityPinnedPostResponse {
  text: string;
  authorName: string;
  createdAt: string;
}

interface CommunityGroupResponse {
  id: string;
  name: string;
  description?: string | null;
  memberCount: number;
  activeCount: number;
  type: string;
  price?: number | null;
  period?: string | null;
  icon?: string | null;
  iconColor?: string | null;
  backgroundColor?: string | null;
  tags: string[];
  trending: boolean;
  growth: string;
  isMember: boolean;
  viewerCanModerate: boolean;
  viewerCanManageRoles: boolean;
  viewerRole?: string | null;
  pinnedPost?: CommunityPinnedPostResponse | null;
}

interface CommunityPostResponse {
  id: string;
  groupId: string;
  type: string;
  text?: string | null;
  attachments: string[];
  tag?: string | null;
  status: string;
  createdAt: string;
  moderationState: string;
  moderationSummary?: string | null;
  author: CommunityAuthorResponse;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
}

interface CommunityCommentResponse {
  id: string;
  postId: string;
  parentCommentId?: string | null;
  text: string;
  createdAt: string;
  moderationState: string;
  moderationSummary?: string | null;
  author: CommunityAuthorResponse;
  likeCount: number;
  viewerHasLiked: boolean;
  replies?: CommunityCommentResponse[];
}

interface CommunityGroupMemberResponse {
  userId: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  joinedAt: string;
  grantedAt: string;
  grantedByName?: string | null;
  isMuted: boolean;
  mutedAt?: string | null;
  mutedByName?: string | null;
}

interface CommunityModerationHitResponse {
  id: string;
  ruleKey: string;
  source: string;
  score?: number | null;
  summary?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

interface CommunityModerationReportReasonCountResponse {
  reasonCode: string;
  count: number;
}

interface CommunityModerationReportSummaryResponse {
  totalCount: number;
  reasons?: CommunityModerationReportReasonCountResponse[];
}

interface CommunityModerationCaseResponse {
  id: string;
  groupId: string;
  contentType: string;
  status: string;
  priority: string;
  source: string;
  summary?: string | null;
  openedAt: string;
  lastEvaluatedAt?: string | null;
  postId?: string | null;
  commentId?: string | null;
  resolution?: string | null;
  resolutionReasonCode?: string | null;
  resolutionNote?: string | null;
  assignedModeratorName?: string | null;
  reviewedByName?: string | null;
  author: CommunityAuthorResponse;
  post?: CommunityPostResponse | null;
  comment?: CommunityCommentResponse | null;
  hits?: CommunityModerationHitResponse[];
  reportSummary?: CommunityModerationReportSummaryResponse | null;
}

interface CommunityModerationStatsResponse {
  backlogCount: number;
  escalatedCount: number;
  highPriorityCount: number;
  inReviewCount: number;
  openCount: number;
  resolvedTodayCount: number;
  oldestOpenAt?: string | null;
}

interface CommunityChangeEventResponse {
  entityId: string;
  groupId?: string | null;
  kind: string;
  occurredAt: string;
  postId?: string | null;
}

const COMMUNITY_AUTHOR_FIELDS = /* GraphQL */ `
  id
  name
  avatarUrl
  roleLabel
`;

const COMMUNITY_PINNED_POST_FIELDS = /* GraphQL */ `
  text
  authorName
  createdAt
`;

const COMMUNITY_GROUP_FIELDS = /* GraphQL */ `
  id
  name
  description
  memberCount
  activeCount
  type
  price
  period
  icon
  iconColor
  backgroundColor
  tags
  trending
  growth
  isMember
  viewerCanModerate
  viewerCanManageRoles
  viewerRole
  pinnedPost {
    ${COMMUNITY_PINNED_POST_FIELDS}
  }
`;

const COMMUNITY_POST_FIELDS = /* GraphQL */ `
  id
  groupId
  type
  text
  attachments
  tag
  status
  createdAt
  moderationState
  moderationSummary
  likeCount
  commentCount
  viewerHasLiked
  author {
    ${COMMUNITY_AUTHOR_FIELDS}
  }
`;

function buildCommentFields(depth: number): string {
  const base = `
    id
    postId
    parentCommentId
    text
    createdAt
    moderationState
    moderationSummary
    likeCount
    viewerHasLiked
    author {
      ${COMMUNITY_AUTHOR_FIELDS}
    }
  `;

  if (depth <= 0) {
    return base;
  }

  return `${base}
    replies {
      ${buildCommentFields(depth - 1)}
    }
  `;
}

const COMMUNITY_COMMENT_FIELDS = buildCommentFields(4);

const COMMUNITY_GROUPS_QUERY = /* GraphQL */ `
  query CommunityGroups {
    communityGroups {
      ${COMMUNITY_GROUP_FIELDS}
    }
  }
`;

const COMMUNITY_GROUP_QUERY = /* GraphQL */ `
  query CommunityGroup($groupId: ID!) {
    communityGroup(groupId: $groupId) {
      ${COMMUNITY_GROUP_FIELDS}
    }
  }
`;

const COMMUNITY_POSTS_QUERY = /* GraphQL */ `
  query CommunityPosts($groupId: ID!, $cursor: String, $limit: Int) {
    communityPosts(groupId: $groupId, cursor: $cursor, limit: $limit) {
      items {
        ${COMMUNITY_POST_FIELDS}
      }
      nextCursor
    }
  }
`;

const COMMUNITY_POST_QUERY = /* GraphQL */ `
  query CommunityPost($postId: ID!) {
    communityPost(postId: $postId) {
      post {
        ${COMMUNITY_POST_FIELDS}
      }
      comments {
        ${COMMUNITY_COMMENT_FIELDS}
      }
    }
  }
`;

const COMMUNITY_GROUP_MEMBER_FIELDS = /* GraphQL */ `
  userId
  name
  role
  avatarUrl
  joinedAt
  grantedAt
  grantedByName
  isMuted
  mutedAt
  mutedByName
`;

const COMMUNITY_MODERATION_HIT_FIELDS = /* GraphQL */ `
  id
  ruleKey
  source
  score
  summary
  payload
  createdAt
`;

const COMMUNITY_MODERATION_REPORT_SUMMARY_FIELDS = /* GraphQL */ `
  totalCount
  reasons {
    reasonCode
    count
  }
`;

const COMMUNITY_MODERATION_COMMENT_FIELDS = /* GraphQL */ `
  id
  postId
  parentCommentId
  text
  createdAt
  moderationState
  moderationSummary
  likeCount
  viewerHasLiked
  author {
    ${COMMUNITY_AUTHOR_FIELDS}
  }
`;

const COMMUNITY_MODERATION_CASE_FIELDS = /* GraphQL */ `
  id
  groupId
  contentType
  status
  priority
  source
  summary
  openedAt
  lastEvaluatedAt
  postId
  commentId
  resolution
  resolutionReasonCode
  resolutionNote
  assignedModeratorName
  reviewedByName
  author {
    ${COMMUNITY_AUTHOR_FIELDS}
  }
  post {
    ${COMMUNITY_POST_FIELDS}
  }
  comment {
    ${COMMUNITY_MODERATION_COMMENT_FIELDS}
  }
  hits {
    ${COMMUNITY_MODERATION_HIT_FIELDS}
  }
  reportSummary {
    ${COMMUNITY_MODERATION_REPORT_SUMMARY_FIELDS}
  }
`;

const COMMUNITY_GROUP_MEMBERS_QUERY = /* GraphQL */ `
  query CommunityGroupMembers($groupId: ID!) {
    communityGroupMembers(groupId: $groupId) {
      ${COMMUNITY_GROUP_MEMBER_FIELDS}
    }
  }
`;

const COMMUNITY_MODERATION_QUEUE_QUERY = /* GraphQL */ `
  query CommunityModerationQueue($groupId: ID!, $status: ModerationCaseStatus) {
    communityModerationQueue(groupId: $groupId, status: $status, limit: 25) {
      items {
        ${COMMUNITY_MODERATION_CASE_FIELDS}
      }
      nextCursor
    }
  }
`;

const COMMUNITY_MODERATION_CASE_QUERY = /* GraphQL */ `
  query CommunityModerationCase($caseId: ID!) {
    communityModerationCase(caseId: $caseId) {
      ${COMMUNITY_MODERATION_CASE_FIELDS}
    }
  }
`;

const COMMUNITY_MODERATION_STATS_QUERY = /* GraphQL */ `
  query CommunityModerationStats($groupId: ID!) {
    communityModerationStats(groupId: $groupId) {
      backlogCount
      escalatedCount
      highPriorityCount
      inReviewCount
      openCount
      resolvedTodayCount
      oldestOpenAt
    }
  }
`;

const JOIN_GROUP_MUTATION = /* GraphQL */ `
  mutation JoinCommunityGroup($groupId: ID!) {
    joinCommunityGroup(groupId: $groupId)
  }
`;

const LEAVE_GROUP_MUTATION = /* GraphQL */ `
  mutation LeaveCommunityGroup($groupId: ID!) {
    leaveCommunityGroup(groupId: $groupId)
  }
`;

const CREATE_POST_MUTATION = /* GraphQL */ `
  mutation CreateCommunityPost($input: CreatePostInput!) {
    createCommunityPost(input: $input) {
      ${COMMUNITY_POST_FIELDS}
    }
  }
`;

const CREATE_GROUP_MUTATION = /* GraphQL */ `
  mutation CreateCommunityGroup($input: CreateGroupInput!) {
    createCommunityGroup(input: $input) {
      ${COMMUNITY_GROUP_FIELDS}
    }
  }
`;

const DELETE_POST_MUTATION = /* GraphQL */ `
  mutation DeleteCommunityPost($postId: ID!) {
    deleteCommunityPost(postId: $postId)
  }
`;

const CREATE_COMMENT_MUTATION = /* GraphQL */ `
  mutation CreateCommunityComment($input: CreateCommentInput!) {
    createCommunityComment(input: $input) {
      ${COMMUNITY_COMMENT_FIELDS}
    }
  }
`;

const DELETE_COMMENT_MUTATION = /* GraphQL */ `
  mutation DeleteCommunityComment($commentId: ID!) {
    deleteCommunityComment(commentId: $commentId)
  }
`;

const TOGGLE_LIKE_MUTATION = /* GraphQL */ `
  mutation ToggleCommunityLike($input: ToggleLikeInput!) {
    toggleCommunityLike(input: $input)
  }
`;

const REVIEW_POST_MUTATION = /* GraphQL */ `
  mutation ReviewCommunityPost($input: ReviewCommunityPostInput!) {
    reviewCommunityPost(input: $input) {
      ${COMMUNITY_MODERATION_CASE_FIELDS}
    }
  }
`;

const REVIEW_COMMENT_MUTATION = /* GraphQL */ `
  mutation ReviewCommunityComment($input: ReviewCommunityCommentInput!) {
    reviewCommunityComment(input: $input) {
      ${COMMUNITY_MODERATION_CASE_FIELDS}
    }
  }
`;

const REPORT_POST_MUTATION = /* GraphQL */ `
  mutation ReportCommunityPost($input: ReportCommunityPostInput!) {
    reportCommunityPost(input: $input) {
      ${COMMUNITY_MODERATION_CASE_FIELDS}
    }
  }
`;

const REPORT_COMMENT_MUTATION = /* GraphQL */ `
  mutation ReportCommunityComment($input: ReportCommunityCommentInput!) {
    reportCommunityComment(input: $input) {
      ${COMMUNITY_MODERATION_CASE_FIELDS}
    }
  }
`;

const ASSIGN_MODERATOR_MUTATION = /* GraphQL */ `
  mutation AssignCommunityModerator($groupId: ID!, $userId: ID!) {
    assignCommunityModerator(groupId: $groupId, userId: $userId)
  }
`;

const REVOKE_MODERATOR_MUTATION = /* GraphQL */ `
  mutation RevokeCommunityModerator($groupId: ID!, $userId: ID!) {
    revokeCommunityModerator(groupId: $groupId, userId: $userId)
  }
`;

const TRANSFER_OWNERSHIP_MUTATION = /* GraphQL */ `
  mutation TransferCommunityOwnership($groupId: ID!, $userId: ID!) {
    transferCommunityOwnership(groupId: $groupId, userId: $userId)
  }
`;

const EXPEL_MEMBER_MUTATION = /* GraphQL */ `
  mutation ExpelCommunityMember($groupId: ID!, $userId: ID!) {
    expelCommunityMember(groupId: $groupId, userId: $userId)
  }
`;

const MUTE_MEMBER_MUTATION = /* GraphQL */ `
  mutation MuteCommunityMember($groupId: ID!, $userId: ID!) {
    muteCommunityMember(groupId: $groupId, userId: $userId)
  }
`;

const UNMUTE_MEMBER_MUTATION = /* GraphQL */ `
  mutation UnmuteCommunityMember($groupId: ID!, $userId: ID!) {
    unmuteCommunityMember(groupId: $groupId, userId: $userId)
  }
`;

const COMMUNITY_CHANGE_EVENT_FIELDS = /* GraphQL */ `
  kind
  entityId
  groupId
  postId
  occurredAt
`;

const COMMUNITY_GROUPS_CHANGED_SUBSCRIPTION = /* GraphQL */ `
  subscription CommunityGroupsChanged {
    communityGroupsChanged {
      ${COMMUNITY_CHANGE_EVENT_FIELDS}
    }
  }
`;

const COMMUNITY_GROUP_CHANGED_SUBSCRIPTION = /* GraphQL */ `
  subscription CommunityGroupChanged($groupId: ID!) {
    communityGroupChanged(groupId: $groupId) {
      ${COMMUNITY_CHANGE_EVENT_FIELDS}
    }
  }
`;

const COMMUNITY_POST_CHANGED_SUBSCRIPTION = /* GraphQL */ `
  subscription CommunityPostChanged($postId: ID!) {
    communityPostChanged(postId: $postId) {
      ${COMMUNITY_CHANGE_EVENT_FIELDS}
    }
  }
`;

const COMMUNITY_MODERATION_QUEUE_CHANGED_SUBSCRIPTION = /* GraphQL */ `
  subscription CommunityModerationQueueChanged($groupId: ID!) {
    communityModerationQueueChanged(groupId: $groupId) {
      ${COMMUNITY_CHANGE_EVENT_FIELDS}
    }
  }
`;

const COMMUNITY_MODERATION_CASE_CHANGED_SUBSCRIPTION = /* GraphQL */ `
  subscription CommunityModerationCaseChanged($caseId: ID!) {
    communityModerationCaseChanged(caseId: $caseId) {
      ${COMMUNITY_CHANGE_EVENT_FIELDS}
    }
  }
`;

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getAuthorColor(authorId: string): string {
  return AUTHOR_COLOR_PALETTE[hashString(authorId) % AUTHOR_COLOR_PALETTE.length];
}

function formatRelativeTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Ahora';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes <= 1) return 'Ahora';
  if (diffMinutes < 60) return `hace ${diffMinutes}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;

  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function toGraphQLPostType(value: PostType): string {
  switch (value) {
    case 'Video':
      return 'VIDEO';
    case 'Document':
      return 'DOCUMENT';
    case 'Alert':
      return 'ALERT';
    case 'Post':
    default:
      return 'POST';
  }
}

function toGraphQLGroupType(value: Group['type']): string {
  return value === 'paid' ? 'PAID' : 'FREE';
}

function normalizeGroupPeriod(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'monthly' || normalized === 'month' || normalized === 'mes') {
    return 'mes';
  }

  if (normalized === 'yearly' || normalized === 'annual' || normalized === 'year' || normalized === 'año') {
    return 'año';
  }

  return value;
}

function normalizeGroupType(value: string): 'free' | 'paid' {
  return value === 'paid' ? 'paid' : 'free';
}

function inferGroupIcon(group: Pick<CommunityGroupResponse, 'icon' | 'name' | 'tags' | 'type'>): string {
  if (group.icon?.trim()) {
    return group.icon;
  }

  const haystack = `${group.name} ${group.tags.join(' ')}`.toLowerCase();
  if (group.type === 'paid') return 'masterclass';
  if (haystack.includes('daca') || haystack.includes('dreamer')) return 'daca';
  if (haystack.includes('ciudad') || haystack.includes('clase')) return 'class';
  if (haystack.includes('green') || haystack.includes('residen') || haystack.includes('usa')) return 'usa';
  return 'family';
}

function mapPinnedPost(
  pinnedPost?: CommunityPinnedPostResponse | null,
): Group['pinnedPost'] {
  if (!pinnedPost) {
    return null;
  }

  return {
    text: pinnedPost.text,
    author: pinnedPost.authorName,
    timestamp: formatRelativeTimestamp(pinnedPost.createdAt),
  };
}

function mapGroup(response: CommunityGroupResponse): Group {
  const iconColor = response.iconColor ?? '#2563EB';

  return {
    id: response.id,
    name: response.name,
    description: response.description ?? '',
    memberCount: response.memberCount,
    activeCount: response.activeCount,
    type: normalizeGroupType(response.type),
    price: response.price ?? undefined,
    period: normalizeGroupPeriod(response.period),
    icon: inferGroupIcon(response),
    iconColor,
    backgroundColor: response.backgroundColor ?? `${iconColor}20`,
    tags: response.tags ?? [],
    trending: response.trending,
    growth: response.growth || '+0',
    pinnedPost: mapPinnedPost(response.pinnedPost),
    isMember: response.isMember,
    viewerCanModerate: response.viewerCanModerate,
    viewerCanManageRoles: response.viewerCanManageRoles,
    viewerRole: response.viewerRole ?? undefined,
  };
}

function mapPost(response: CommunityPostResponse): Post {
  return {
    id: response.id,
    groupId: response.groupId,
    authorId: response.author.id,
    authorAvatar: response.author.avatarUrl ?? '',
    authorColor: getAuthorColor(response.author.id),
    authorName: response.author.name,
    authorRole: response.author.roleLabel,
    text: response.text ?? '',
    timestamp: formatRelativeTimestamp(response.createdAt),
    likes: response.likeCount,
    comments: response.commentCount,
    tag: response.tag ?? (response.type === 'Alert' ? 'Alerta' : undefined),
    isLiked: response.viewerHasLiked,
    status: response.status,
    moderationState: response.moderationState,
    moderationSummary: response.moderationSummary ?? null,
  };
}

function mapComment(response: CommunityCommentResponse): Comment {
  return {
    id: response.id,
    postId: response.postId,
    parentCommentId: response.parentCommentId ?? null,
    authorId: response.author.id,
    authorAvatar: response.author.avatarUrl ?? '',
    authorColor: getAuthorColor(response.author.id),
    authorName: response.author.name,
    authorRole: response.author.roleLabel,
    text: response.text,
    timestamp: formatRelativeTimestamp(response.createdAt),
    likes: response.likeCount,
    replies: (response.replies ?? []).map(mapComment),
    isLiked: response.viewerHasLiked,
    moderationState: response.moderationState,
    moderationSummary: response.moderationSummary ?? null,
  };
}

function mapGroupMember(response: CommunityGroupMemberResponse): GroupMember {
  return {
    userId: response.userId,
    name: response.name,
    role: response.role,
    avatarUrl: response.avatarUrl ?? undefined,
    avatarColor: getAuthorColor(response.userId),
    joinedAt: formatRelativeTimestamp(response.joinedAt),
    grantedAt: formatRelativeTimestamp(response.grantedAt),
    grantedByName: response.grantedByName ?? null,
    isMuted: response.isMuted,
    mutedAt: response.mutedAt ? formatRelativeTimestamp(response.mutedAt) : undefined,
    mutedByName: response.mutedByName ?? null,
  };
}

function mapModerationHit(response: CommunityModerationHitResponse): ModerationHit {
  return {
    id: response.id,
    ruleKey: response.ruleKey,
    source: response.source,
    score: response.score ?? null,
    summary: response.summary ?? null,
    payload: response.payload ?? null,
    createdAt: formatRelativeTimestamp(response.createdAt),
  };
}

function mapModerationCase(response: CommunityModerationCaseResponse): ModerationCase {
  return {
    id: response.id,
    groupId: response.groupId,
    contentType: response.contentType === 'COMMENT' ? 'COMMENT' : 'POST',
    status: response.status,
    priority: response.priority,
    source: response.source,
    summary: response.summary ?? null,
    openedAt: formatRelativeTimestamp(response.openedAt),
    lastEvaluatedAt: response.lastEvaluatedAt
      ? formatRelativeTimestamp(response.lastEvaluatedAt)
      : undefined,
    postId: response.postId ?? null,
    commentId: response.commentId ?? null,
    resolution: response.resolution ?? null,
    resolutionReasonCode: response.resolutionReasonCode ?? null,
    resolutionNote: response.resolutionNote ?? null,
    assignedModeratorName: response.assignedModeratorName ?? null,
    reviewedByName: response.reviewedByName ?? null,
    authorName: response.author.name,
    authorRole: response.author.roleLabel,
    authorAvatar: response.author.avatarUrl ?? '',
    authorColor: getAuthorColor(response.author.id),
    post: response.post ? mapPost(response.post) : null,
    comment: response.comment ? mapComment(response.comment) : null,
    reportSummary: response.reportSummary
      ? {
          totalCount: response.reportSummary.totalCount,
          reasons: (response.reportSummary.reasons ?? []).map((reason) => ({
            reasonCode: reason.reasonCode,
            count: reason.count,
          })),
        }
      : null,
    hits: (response.hits ?? []).map(mapModerationHit),
  };
}

function mapCommunityChangeEvent(response: CommunityChangeEventResponse) {
  return {
    entityId: response.entityId,
    groupId: response.groupId ?? undefined,
    kind: response.kind,
    occurredAt: response.occurredAt,
    postId: response.postId ?? undefined,
  };
}

export async function getGroups(): Promise<Group[]> {
  const response = await query<{ communityGroups: CommunityGroupResponse[] }>(COMMUNITY_GROUPS_QUERY, {
    operationName: 'CommunityGroups',
  });

  return response.data.communityGroups.map(mapGroup);
}

export async function getGroupById(groupId: string): Promise<GroupDetailResponse> {
  const response = await query<{ communityGroup: CommunityGroupResponse }>(COMMUNITY_GROUP_QUERY, {
    operationName: 'CommunityGroup',
    variables: { groupId },
  });

  const group = mapGroup(response.data.communityGroup);
  return {
    ...group,
    isMember: Boolean(group.isMember),
    posts: [],
  };
}

export async function joinGroup(groupId: string): Promise<void> {
  if (!getIsConnected()) {
    await queuePendingAction('join_group', { groupId });
    return;
  }

  await mutation<{ joinCommunityGroup: boolean }>(JOIN_GROUP_MUTATION, {
    operationName: 'JoinCommunityGroup',
    variables: { groupId },
  });
}

export async function createGroup(data: CreateGroupRequest): Promise<Group> {
  const response = await mutation<{ createCommunityGroup: CommunityGroupResponse }>(CREATE_GROUP_MUTATION, {
    operationName: 'CreateCommunityGroup',
    variables: {
      input: {
        name: data.name,
        description: data.description,
        type: toGraphQLGroupType(data.type),
        price: data.type === 'paid' ? data.price : undefined,
        period: data.type === 'paid' ? data.period : undefined,
        icon: data.icon,
        iconColor: data.iconColor,
        backgroundColor: data.backgroundColor,
        tags: data.tags ?? [],
      },
    },
  });

  return mapGroup(response.data.createCommunityGroup);
}

export async function leaveGroup(groupId: string): Promise<void> {
  await mutation<{ leaveCommunityGroup: boolean }>(LEAVE_GROUP_MUTATION, {
    operationName: 'LeaveCommunityGroup',
    variables: { groupId },
  });
}

export async function getGroupPosts(groupId: string, cursor?: string): Promise<PostsResponse> {
  const response = await query<{
    communityPosts: {
      items: CommunityPostResponse[];
      nextCursor?: string | null;
    };
  }>(COMMUNITY_POSTS_QUERY, {
    operationName: 'CommunityPosts',
    variables: { groupId, cursor, limit: 20 },
  });

  const page = response.data.communityPosts;
  return {
    posts: page.items.map(mapPost),
    nextCursor: page.nextCursor ?? undefined,
    hasMore: Boolean(page.nextCursor),
  };
}

export async function getPostById(postId: string): Promise<PostDetailResponse> {
  const response = await query<{
    communityPost: {
      post: CommunityPostResponse;
      comments: CommunityCommentResponse[];
    };
  }>(COMMUNITY_POST_QUERY, {
    operationName: 'CommunityPost',
    variables: { postId },
  });

  return {
    ...mapPost(response.data.communityPost.post),
    comments: response.data.communityPost.comments.map(mapComment),
  };
}

export async function createPost(data: CreatePostRequest): Promise<Post> {
  if (!getIsConnected()) {
    await queuePendingAction('create_post', data as unknown as Record<string, unknown>);

    return {
      id: `temp_${Date.now()}`,
      groupId: data.groupId,
      authorAvatar: '',
      authorColor: '#2563EB',
      authorName: 'Tú',
      authorRole: 'Miembro',
      text: data.text,
      timestamp: 'Ahora',
      likes: 0,
      comments: 0,
      isLiked: false,
      isPending: true,
      tag: data.type === 'Alert' ? 'Alerta' : undefined,
    };
  }

  const response = await mutation<{ createCommunityPost: CommunityPostResponse }>(CREATE_POST_MUTATION, {
    operationName: 'CreateCommunityPost',
    variables: {
      input: {
        groupId: data.groupId,
        type: toGraphQLPostType(data.type),
        text: data.text,
        attachments: data.attachments ?? [],
      },
    },
  });

  return mapPost(response.data.createCommunityPost);
}

export async function deletePost(postId: string): Promise<void> {
  await mutation<{ deleteCommunityPost: boolean }>(DELETE_POST_MUTATION, {
    operationName: 'DeleteCommunityPost',
    variables: { postId },
  });
}

export async function createComment(data: CreateCommentRequest): Promise<Comment> {
  if (!getIsConnected()) {
    await queuePendingAction('create_comment', data as unknown as Record<string, unknown>);

    return {
      id: `temp_${Date.now()}`,
      authorAvatar: '',
      authorColor: '#2563EB',
      authorName: 'Tú',
      authorRole: 'Miembro',
      text: data.text,
      timestamp: 'Ahora',
      likes: 0,
      isLiked: false,
      isPending: true,
      replies: [],
    };
  }

  const response = await mutation<{ createCommunityComment: CommunityCommentResponse }>(CREATE_COMMENT_MUTATION, {
    operationName: 'CreateCommunityComment',
    variables: {
      input: {
        postId: data.postId,
        text: data.text,
        parentCommentId: data.parentCommentId,
      },
    },
  });

  return mapComment(response.data.createCommunityComment);
}

export async function deleteComment(commentId: string): Promise<void> {
  await mutation<{ deleteCommunityComment: boolean }>(DELETE_COMMENT_MUTATION, {
    operationName: 'DeleteCommunityComment',
    variables: { commentId },
  });
}

async function toggleLike(input: { postId?: string; commentId?: string }): Promise<boolean> {
  const response = await mutation<{ toggleCommunityLike: boolean }>(TOGGLE_LIKE_MUTATION, {
    operationName: 'ToggleCommunityLike',
    variables: { input },
  });

  return response.data.toggleCommunityLike;
}

export async function likePost(postId: string): Promise<void> {
  if (!getIsConnected()) {
    await queuePendingAction('like_post', { postId });
    return;
  }

  await toggleLike({ postId });
}

export async function unlikePost(postId: string): Promise<void> {
  await toggleLike({ postId });
}

export async function likeComment(commentId: string): Promise<void> {
  await toggleLike({ commentId });
}

export async function unlikeComment(commentId: string): Promise<void> {
  await toggleLike({ commentId });
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const response = await query<{ communityGroupMembers: CommunityGroupMemberResponse[] }>(
    COMMUNITY_GROUP_MEMBERS_QUERY,
    {
      operationName: 'CommunityGroupMembers',
      variables: { groupId },
    },
  );

  return response.data.communityGroupMembers.map(mapGroupMember);
}

export async function getModerationQueue(
  groupId: string,
  status?: 'OPEN' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED',
): Promise<ModerationCase[]> {
  const response = await query<{
    communityModerationQueue: {
      items: CommunityModerationCaseResponse[];
    };
  }>(COMMUNITY_MODERATION_QUEUE_QUERY, {
    operationName: 'CommunityModerationQueue',
    variables: { groupId, status },
  });

  return (response.data.communityModerationQueue.items ?? []).map(mapModerationCase);
}

export async function getModerationCase(caseId: string): Promise<ModerationCase> {
  const response = await query<{ communityModerationCase: CommunityModerationCaseResponse }>(
    COMMUNITY_MODERATION_CASE_QUERY,
    {
      operationName: 'CommunityModerationCase',
      variables: { caseId },
    },
  );

  return mapModerationCase(response.data.communityModerationCase);
}

export async function getModerationStats(groupId: string): Promise<ModerationStats> {
  const response = await query<{ communityModerationStats: CommunityModerationStatsResponse }>(
    COMMUNITY_MODERATION_STATS_QUERY,
    {
      operationName: 'CommunityModerationStats',
      variables: { groupId },
    },
  );

  return {
    backlogCount: response.data.communityModerationStats.backlogCount,
    escalatedCount: response.data.communityModerationStats.escalatedCount,
    highPriorityCount: response.data.communityModerationStats.highPriorityCount,
    inReviewCount: response.data.communityModerationStats.inReviewCount,
    openCount: response.data.communityModerationStats.openCount,
    resolvedTodayCount: response.data.communityModerationStats.resolvedTodayCount,
    oldestOpenAt: response.data.communityModerationStats.oldestOpenAt
      ? formatRelativeTimestamp(response.data.communityModerationStats.oldestOpenAt)
      : undefined,
  };
}

export async function reviewPost(
  caseId: string,
  decision: 'APPROVE' | 'REJECT' | 'REMOVE',
  reasonCode?: string,
): Promise<ModerationCase> {
  const response = await mutation<{ reviewCommunityPost: CommunityModerationCaseResponse }>(
    REVIEW_POST_MUTATION,
    {
      operationName: 'ReviewCommunityPost',
      variables: {
        input: {
          caseId,
          decision,
          reasonCode,
        },
      },
    },
  );

  return mapModerationCase(response.data.reviewCommunityPost);
}

export async function reviewComment(
  caseId: string,
  decision: 'APPROVE' | 'REJECT' | 'REMOVE',
  reasonCode?: string,
): Promise<ModerationCase> {
  const response = await mutation<{ reviewCommunityComment: CommunityModerationCaseResponse }>(
    REVIEW_COMMENT_MUTATION,
    {
      operationName: 'ReviewCommunityComment',
      variables: {
        input: {
          caseId,
          decision,
          reasonCode,
        },
      },
    },
  );

  return mapModerationCase(response.data.reviewCommunityComment);
}

export async function reportPost(
  postId: string,
  reasonCode: string,
  note?: string,
): Promise<void> {
  await mutation<{ reportCommunityPost: CommunityModerationCaseResponse }>(REPORT_POST_MUTATION, {
    operationName: 'ReportCommunityPost',
    variables: {
      input: {
        postId,
        reasonCode,
        note,
      },
    },
  });
}

export async function reportComment(
  commentId: string,
  reasonCode: string,
  note?: string,
): Promise<void> {
  await mutation<{ reportCommunityComment: CommunityModerationCaseResponse }>(REPORT_COMMENT_MUTATION, {
    operationName: 'ReportCommunityComment',
    variables: {
      input: {
        commentId,
        reasonCode,
        note,
      },
    },
  });
}

export async function assignModerator(groupId: string, userId: string): Promise<void> {
  await mutation<{ assignCommunityModerator: boolean }>(ASSIGN_MODERATOR_MUTATION, {
    operationName: 'AssignCommunityModerator',
    variables: { groupId, userId },
  });
}

export async function revokeModerator(groupId: string, userId: string): Promise<void> {
  await mutation<{ revokeCommunityModerator: boolean }>(REVOKE_MODERATOR_MUTATION, {
    operationName: 'RevokeCommunityModerator',
    variables: { groupId, userId },
  });
}

export async function transferOwnership(groupId: string, userId: string): Promise<void> {
  await mutation<{ transferCommunityOwnership: boolean }>(TRANSFER_OWNERSHIP_MUTATION, {
    operationName: 'TransferCommunityOwnership',
    variables: { groupId, userId },
  });
}

export async function expelMember(groupId: string, userId: string): Promise<void> {
  await mutation<{ expelCommunityMember: boolean }>(EXPEL_MEMBER_MUTATION, {
    operationName: 'ExpelCommunityMember',
    variables: { groupId, userId },
  });
}

export async function muteMember(groupId: string, userId: string): Promise<void> {
  await mutation<{ muteCommunityMember: boolean }>(MUTE_MEMBER_MUTATION, {
    operationName: 'MuteCommunityMember',
    variables: { groupId, userId },
  });
}

export async function unmuteMember(groupId: string, userId: string): Promise<void> {
  await mutation<{ unmuteCommunityMember: boolean }>(UNMUTE_MEMBER_MUTATION, {
    operationName: 'UnmuteCommunityMember',
    variables: { groupId, userId },
  });
}

export function subscribeToGroupsFeedChanges(
  onChange: (event: ReturnType<typeof mapCommunityChangeEvent>) => void,
): () => void {
  return subscribe<{ communityGroupsChanged: CommunityChangeEventResponse }>(
    COMMUNITY_GROUPS_CHANGED_SUBSCRIPTION,
    { operationName: 'CommunityGroupsChanged' },
    {
      next: (data) => {
        onChange(mapCommunityChangeEvent(data.communityGroupsChanged));
      },
      error: (error) => {
        console.error('[Community] Groups subscription error:', error);
      },
    },
  );
}

export function subscribeToGroupChanges(
  groupId: string,
  onChange: (event: ReturnType<typeof mapCommunityChangeEvent>) => void,
): () => void {
  return subscribe<{ communityGroupChanged: CommunityChangeEventResponse }>(
    COMMUNITY_GROUP_CHANGED_SUBSCRIPTION,
    {
      operationName: 'CommunityGroupChanged',
      variables: { groupId },
    },
    {
      next: (data) => {
        onChange(mapCommunityChangeEvent(data.communityGroupChanged));
      },
      error: (error) => {
        console.error('[Community] Group subscription error:', error);
      },
    },
  );
}

export function subscribeToPostChanges(
  postId: string,
  onChange: (event: ReturnType<typeof mapCommunityChangeEvent>) => void,
): () => void {
  return subscribe<{ communityPostChanged: CommunityChangeEventResponse }>(
    COMMUNITY_POST_CHANGED_SUBSCRIPTION,
    {
      operationName: 'CommunityPostChanged',
      variables: { postId },
    },
    {
      next: (data) => {
        onChange(mapCommunityChangeEvent(data.communityPostChanged));
      },
      error: (error) => {
        console.error('[Community] Post subscription error:', error);
      },
    },
  );
}

export function subscribeToModerationQueueChanges(
  groupId: string,
  onChange: (event: ReturnType<typeof mapCommunityChangeEvent>) => void,
): () => void {
  return subscribe<{ communityModerationQueueChanged: CommunityChangeEventResponse }>(
    COMMUNITY_MODERATION_QUEUE_CHANGED_SUBSCRIPTION,
    {
      operationName: 'CommunityModerationQueueChanged',
      variables: { groupId },
    },
    {
      next: (data) => {
        onChange(mapCommunityChangeEvent(data.communityModerationQueueChanged));
      },
      error: (error) => {
        console.error('[Community] Moderation queue subscription error:', error);
      },
    },
  );
}

export function subscribeToModerationCaseChanges(
  caseId: string,
  onChange: (event: ReturnType<typeof mapCommunityChangeEvent>) => void,
): () => void {
  return subscribe<{ communityModerationCaseChanged: CommunityChangeEventResponse }>(
    COMMUNITY_MODERATION_CASE_CHANGED_SUBSCRIPTION,
    {
      operationName: 'CommunityModerationCaseChanged',
      variables: { caseId },
    },
    {
      next: (data) => {
        onChange(mapCommunityChangeEvent(data.communityModerationCaseChanged));
      },
      error: (error) => {
        console.error('[Community] Moderation case subscription error:', error);
      },
    },
  );
}

export const communityService = {
  getGroups,
  getGroupById,
  createGroup,
  joinGroup,
  leaveGroup,
  getGroupPosts,
  getPostById,
  createPost,
  deletePost,
  createComment,
  deleteComment,
  likePost,
  unlikePost,
  likeComment,
  unlikeComment,
  getGroupMembers,
  getModerationQueue,
  getModerationCase,
  getModerationStats,
  reviewPost,
  reviewComment,
  reportPost,
  reportComment,
  assignModerator,
  revokeModerator,
  transferOwnership,
  expelMember,
  muteMember,
  unmuteMember,
  subscribeToGroupsFeedChanges,
  subscribeToGroupChanges,
  subscribeToPostChanges,
  subscribeToModerationQueueChanges,
  subscribeToModerationCaseChanges,
};

export default communityService;