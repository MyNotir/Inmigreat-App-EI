/**
 * Community Types - Groups, posts, and social features type definitions
 * Validates: Requirements 11.1, 11.7
 */

export interface PinnedPost {
  text: string;
  author: string;
  timestamp: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  activeCount: number;
  type: 'free' | 'paid';
  price?: number;
  period?: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  tags: string[];
  trending: boolean;
  growth: string;
  pinnedPost?: PinnedPost | null;
  isMember?: boolean;
  viewerCanModerate?: boolean;
  viewerCanManageRoles?: boolean;
  viewerRole?: string;
  moderationOpenCount?: number;
}

export interface Post {
  id: string;
  groupId?: string;
  authorId?: string;
  authorAvatar: string;
  authorColor: string;
  authorName: string;
  authorRole: string;
  text: string;
  timestamp: string;
  likes: number;
  comments: number;
  tag?: string;
  isLiked?: boolean;
  isPending?: boolean;
  status?: string;
  moderationState?: string;
  moderationSummary?: string | null;
}

export interface Comment {
  id: string;
  postId?: string;
  parentCommentId?: string | null;
  authorId?: string;
  authorAvatar: string;
  authorColor: string;
  authorName: string;
  authorRole: string;
  text: string;
  timestamp: string;
  likes: number;
  replies?: Comment[];
  isLiked?: boolean;
  isPending?: boolean;
  moderationState?: string;
  moderationSummary?: string | null;
}

export interface ModerationReportReasonCount {
  reasonCode: string;
  count: number;
}

export interface ModerationReportSummary {
  totalCount: number;
  reasons: ModerationReportReasonCount[];
}

export interface ModerationHit {
  id: string;
  ruleKey: string;
  source: string;
  score?: number | null;
  summary?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ModerationCase {
  id: string;
  groupId: string;
  contentType: 'POST' | 'COMMENT';
  status: string;
  priority: string;
  source: string;
  summary?: string | null;
  openedAt: string;
  lastEvaluatedAt?: string;
  postId?: string | null;
  commentId?: string | null;
  resolution?: string | null;
  resolutionReasonCode?: string | null;
  resolutionNote?: string | null;
  assignedModeratorName?: string | null;
  reviewedByName?: string | null;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  authorColor: string;
  post?: Post | null;
  comment?: Comment | null;
  reportSummary?: ModerationReportSummary | null;
  hits: ModerationHit[];
}

export interface ModerationStats {
  backlogCount: number;
  escalatedCount: number;
  highPriorityCount: number;
  inReviewCount: number;
  openCount: number;
  resolvedTodayCount: number;
  oldestOpenAt?: string;
}

export interface GroupMember {
  userId: string;
  name: string;
  role: string;
  avatarUrl?: string;
  avatarColor: string;
  joinedAt: string;
  grantedAt: string;
  grantedByName?: string | null;
  isMuted: boolean;
  mutedAt?: string;
  mutedByName?: string | null;
}

export type PostType = 'Post' | 'Video' | 'Document' | 'Alert';

export interface LinkPreview {
  url: string;
  title: string;
  siteName: string;
  thumbnail?: string;
}

export interface VideoPreview {
  url: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
}

export interface ComposeData {
  type: PostType;
  text: string;
  attachments?: string[];
  linkPreview?: LinkPreview;
  videoPreview?: VideoPreview;
  audience: 'all' | 'segment';
}
