/**
 * ThreadView Component
 * 
 * Displays a post with comments and nested replies.
 * Implements visual indentation for nesting and like functionality.
 * 
 * Validates: Requirements 11.8, 11.9, 11.10
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard } from '../common/GlassCard';
import { StatusPill } from '../common/StatusPill';
import { useViewTranslation } from '../../i18n';
import type { Post, Comment } from '../../types/community';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { usePressAnimation, useFadeUp } from '../../styles/animations';
import { getCommunityModerationPresentation } from '../../utils/communityModeration';
import { mixHexWithWhite } from '../../styles/glassmorphism';

export interface ThreadViewProps {
  /** The main post to display */
  post: Post;
  /** Comments on the post */
  comments: Comment[];
  /** Callback when the post is liked */
  onLikePost?: (postId: string) => void;
  /** Callback when a comment is liked */
  onLikeComment?: (commentId: string) => void;
  /** Callback when a reply is submitted */
  onReply?: (parentId: string | null, text: string) => void;
  /** Callback when the main post is reported */
  onReportPost?: (post: Post) => void;
  /** Callback when a comment is reported */
  onReportComment?: (comment: Comment) => void;
  /** Callback when the view is dismissed */
  onDismiss?: () => void;
  /** Whether the post is liked by the current user */
  isPostLiked?: boolean;
  /** Set of comment IDs that are liked by the current user */
  likedCommentIds?: Set<string>;
  /** Whether the current user can like and reply in this thread */
  canInteract?: boolean;
  /** Current viewer id used to show author-facing moderation state */
  currentUserId?: string;
  /** Explanation displayed when interaction is disabled */
  interactionNotice?: string;
  /** Additional styles */
  style?: ViewStyle;
}

/** Maximum nesting depth for visual indentation */
const MAX_NESTING_DEPTH = 4;

/** Indentation width per nesting level */
const INDENT_WIDTH = 16;

type CommunityTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

/** Role badge styles */
const ROLE_BADGES: Record<string, { backgroundColor: string; textColor: string }> = {
  'Moderador': { backgroundColor: colors.accent, textColor: colors.warm.cream },
  'Pro': { backgroundColor: colors.pro, textColor: colors.warm.cream },
  'Admin': { backgroundColor: colors.status.urgentWarm, textColor: colors.warm.cream },
  'Experto': { backgroundColor: colors.warm.sage, textColor: colors.warm.cream },
};

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

/**
 * Get initials from a name
 */
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

/**
 * AuthorAvatar - Displays author avatar with initials
 */
const AuthorAvatar: React.FC<{
  name: string;
  color: string;
  size?: 'small' | 'medium';
}> = ({ name, color, size = 'medium' }) => {
  const initials = getInitials(name);
  const avatarSize = size === 'small' ? 32 : 40;
  
  return (
    <View
      style={[
        styles.avatar,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          backgroundColor: color || colors.accent,
        },
      ]}
    >
      <Text style={[styles.avatarText, size === 'small' && styles.avatarTextSmall]}>
        {initials}
      </Text>
    </View>
  );
};

/**
 * AuthorInfo - Displays author name, role badge, and timestamp
 */
const AuthorInfo: React.FC<{
  name: string;
  role: string;
  roleLabel?: string;
  timestamp: string;
  size?: 'small' | 'medium';
}> = ({ name, role, roleLabel, timestamp, size = 'medium' }) => {
  const roleBadge = ROLE_BADGES[role];
  
  return (
    <View style={styles.authorInfo}>
      <View style={styles.nameRow}>
        <Text
          style={[styles.authorName, size === 'small' && styles.authorNameSmall]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {roleBadge && (
          <View style={[styles.roleBadge, { backgroundColor: roleBadge.backgroundColor }]}>
            <Text style={[styles.roleBadgeText, { color: roleBadge.textColor }]}>
              {roleLabel ?? role}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.timestamp}>{timestamp}</Text>
    </View>
  );
};

/**
 * LikeButton - Reusable like button component
 */
const LikeButton: React.FC<{
  likes: number;
  isLiked: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium';
  disabled?: boolean;
}> = ({ likes, isLiked, onPress, size = 'medium', disabled = false }) => {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();
  
  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.likeButton, animatedStyle, disabled && styles.disabledAction]}>
        <Text style={[styles.likeIcon, size === 'small' && styles.likeIconSmall]}>
          {isLiked ? '❤️' : '🤍'}
        </Text>
        <Text style={[styles.likeCount, isLiked && styles.likedCount, size === 'small' && styles.likeCountSmall]}>
          {likes}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * ReplyButton - Button to trigger reply input
 */
const ReplyButton: React.FC<{
  label: string;
  onPress?: () => void;
  size?: 'small' | 'medium';
  disabled?: boolean;
}> = ({ label, onPress, size = 'medium', disabled = false }) => {
  return (
    <TouchableOpacity
      style={[styles.replyButton, disabled && styles.disabledAction]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.replyButtonText, size === 'small' && styles.replyButtonTextSmall]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const ReportButton: React.FC<{
  label: string;
  onPress?: () => void;
  size?: 'small' | 'medium';
}> = ({ label, onPress, size = 'medium' }) => {
  return (
    <TouchableOpacity style={styles.replyButton} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.reportButtonText, size === 'small' && styles.replyButtonTextSmall]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const COMMENT_RESUBMIT_STATE = 'REJECTED';
const IS_ANDROID = Platform.OS === 'android';

const createAndroidThreadSurface = (
  tintColor: string,
  backgroundRatio = 0.96,
  borderRatio = 0.82,
): ViewStyle | null => (
  IS_ANDROID
    ? {
        backgroundColor: mixHexWithWhite(tintColor, backgroundRatio),
        borderColor: mixHexWithWhite(tintColor, borderRatio),
      }
    : null
);

/**
 * CommentItem - Renders a single comment with optional nested replies
 * Validates: Requirement 11.9 (nested replies with visual indentation)
 */
const CommentItem: React.FC<{
  comment: Comment;
  depth: number;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string) => void;
  onResubmit?: (comment: Comment) => void;
  onReport?: (comment: Comment) => void;
  isLiked: boolean;
  likedCommentIds: Set<string>;
  canInteract: boolean;
  currentUserId?: string;
  tx: CommunityTranslate;
}> = ({
  comment,
  depth,
  onLike,
  onReply,
  onResubmit,
  onReport,
  isLiked,
  likedCommentIds,
  canInteract,
  currentUserId,
  tx,
}) => {
  const { animatedStyle } = useFadeUp({ autoStart: true, delay: depth * 50 });
  const accentColor = comment.authorColor || colors.accent;
  const commentSurfaceStyle = createAndroidThreadSurface(accentColor, 0.985, 0.9);
  const isOwnComment = Boolean(currentUserId && comment.authorId === currentUserId);
  const moderationStyle = isOwnComment
    ? getCommunityModerationPresentation(comment.moderationState, tx)
    : null;
  const canResubmitRejectedComment =
    isOwnComment &&
    canInteract &&
    comment.moderationState === COMMENT_RESUBMIT_STATE;
  const canReportComment = Boolean(canInteract && currentUserId && comment.authorId !== currentUserId);
  const roleLabel = translateRoleLabel(comment.authorRole, tx);
  
  // Calculate indentation based on depth (capped at MAX_NESTING_DEPTH)
  const effectiveDepth = Math.min(depth, MAX_NESTING_DEPTH);
  const indentation = effectiveDepth * INDENT_WIDTH;
  
  return (
    <Animated.View style={animatedStyle}>
      <View style={[styles.commentContainer, { marginLeft: indentation }]}>
        {/* Nesting indicator line - Requirement 11.9 */}
        {depth > 0 && (
          <View style={styles.nestingIndicator}>
            <View style={styles.nestingLine} />
          </View>
        )}
        
                <View style={[styles.commentContent, commentSurfaceStyle]}>
          {/* Comment header */}
          <View style={styles.commentHeader}>
            <AuthorAvatar
              name={comment.authorName}
              color={comment.authorColor}
              size="small"
            />
            <AuthorInfo
              name={comment.authorName}
              role={comment.authorRole}
              roleLabel={roleLabel}
              timestamp={comment.timestamp}
              size="small"
            />
          </View>
          
          {/* Comment text */}
          <Text style={styles.commentText}>{comment.text}</Text>

          {moderationStyle ? (
            <View style={styles.commentModerationWrap}>
              <StatusPill
                label={moderationStyle.label}
                color={moderationStyle.textColor}
                backgroundColor={moderationStyle.backgroundColor}
                borderColor={moderationStyle.borderColor}
              />
              {comment.moderationSummary ? (
                <Text style={styles.commentModerationSummary}>{comment.moderationSummary}</Text>
              ) : null}
              {canResubmitRejectedComment ? (
                <TouchableOpacity
                  style={styles.commentResubmitButton}
                  onPress={() => onResubmit?.(comment)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.commentResubmitButtonText}>
                    {tx('threadView.actions.editAndResubmit', 'Editar y reenviar')}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          
          {/* Comment actions */}
          <View style={styles.commentActions}>
            <LikeButton
              likes={comment.likes}
              isLiked={isLiked}
              onPress={() => onLike?.(comment.id)}
              size="small"
              disabled={!canInteract}
            />
            <ReplyButton
              label={tx('threadView.actions.reply', 'Responder')}
              onPress={() => onReply?.(comment.id)}
              size="small"
              disabled={!canInteract}
            />
            {canReportComment ? (
              <ReportButton
                label={tx('threadView.actions.report', 'Reportar')}
                size="small"
                onPress={() => onReport?.(comment)}
              />
            ) : null}
          </View>
        </View>
      </View>
      
      {/* Nested replies - Requirement 11.9 */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onLike={onLike}
              onReply={onReply}
              onResubmit={onResubmit}
              onReport={onReport}
              isLiked={likedCommentIds.has(reply.id)}
              likedCommentIds={likedCommentIds}
              canInteract={canInteract}
              currentUserId={currentUserId}
              tx={tx}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
};

/**
 * MainPost - Displays the main post at the top of the thread
 * Validates: Requirement 11.8 (thread view with comments)
 */
const MainPost: React.FC<{
  post: Post;
  isLiked: boolean;
  onLike?: () => void;
  onReply?: () => void;
  onReport?: () => void;
  canInteract: boolean;
  currentUserId?: string;
  tx: CommunityTranslate;
}> = ({ post, isLiked, onLike, onReply, onReport, canInteract, currentUserId, tx }) => {
  const { animatedStyle } = useFadeUp({ autoStart: true });
  const accentColor = post.authorColor || colors.accent;
  const postSurfaceStyle = createAndroidThreadSurface(accentColor, 0.94, 0.74);
  const tagSurfaceStyle = createAndroidThreadSurface(colors.caseAccent.workPermit, 0.9, 0.72);
  const canReportPost = Boolean(canInteract && currentUserId && post.authorId !== currentUserId);
  const roleLabel = translateRoleLabel(post.authorRole, tx);
  const tagLabel = post.tag ? translateTagLabel(post.tag, tx) : null;
  
  return (
    <Animated.View style={animatedStyle}>
      <GlassCard
        style={[styles.mainPostCard, postSurfaceStyle]}
        blurIntensity={IS_ANDROID ? 0 : undefined}
      >
        {/* Post header */}
        <View style={styles.postHeader}>
          <AuthorAvatar name={post.authorName} color={post.authorColor} />
          <AuthorInfo
            name={post.authorName}
            role={post.authorRole}
            roleLabel={roleLabel}
            timestamp={post.timestamp}
          />
        </View>
        
        {/* Post content */}
        <Text style={styles.postText}>{post.text}</Text>
        
        {/* Post tag */}
        {post.tag && (
          <View style={styles.tagContainer}>
            <View style={[styles.tag, tagSurfaceStyle]}>
              <Text style={styles.tagText}>{tagLabel}</Text>
            </View>
          </View>
        )}
        
        {/* Post actions - Requirement 11.10 */}
        <View style={styles.postActions}>
          <LikeButton likes={post.likes} isLiked={isLiked} onPress={onLike} disabled={!canInteract} />
          <View style={styles.commentsCount}>
            <Text style={styles.commentsIcon}>💬</Text>
            <Text style={styles.commentsCountText}>{post.comments}</Text>
          </View>
          <ReplyButton label={tx('threadView.actions.reply', 'Responder')} onPress={onReply} disabled={!canInteract} />
          {canReportPost ? <ReportButton label={tx('threadView.actions.report', 'Reportar')} onPress={onReport} /> : null}
        </View>
      </GlassCard>
    </Animated.View>
  );
};

/**
 * ReplyInput - Input field for composing replies
 */
const ReplyInput: React.FC<{
  composerMode: 'idle' | 'reply' | 'resubmit';
  replyTarget: 'post' | 'comment';
  onSubmit: (text: string) => void;
  onCancel: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  draftText?: string;
  draftVersion: number;
  tx: CommunityTranslate;
}> = ({
  composerMode,
  replyTarget,
  onSubmit,
  onCancel,
  disabled = false,
  disabledMessage,
  draftText = '',
  draftVersion,
  tx,
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const replyInputContainerStyle = {
    paddingBottom: Platform.OS === 'ios'
      ? spacing.base + Math.max(insets.bottom, spacing.base)
      : spacing.md + Math.max(insets.bottom, spacing.base),
  };

  useEffect(() => {
    setText(draftText);
  }, [draftText, draftVersion]);

  useEffect(() => {
    if (disabled || composerMode === 'idle') {
      return;
    }

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      clearTimeout(focusTimer);
    };
  }, [composerMode, disabled, draftVersion]);
  
  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  }, [text, onSubmit]);
  
  if (disabled) {
    return (
      <View
        style={[
          styles.replyInputContainer,
          replyInputContainerStyle,
        ]}
      >
        <View style={[styles.disabledInputNotice, createAndroidThreadSurface(colors.warning, 0.97, 0.84)]}>
          <Text style={styles.disabledInputNoticeText}>
            {disabledMessage || tx('threadView.composer.disabledMessage', 'Necesitas ser miembro del grupo para comentar en este hilo.')}
          </Text>
        </View>
      </View>
    );
  }

  const showComposerContext = composerMode !== 'idle';
  const composerContextLabel = composerMode === 'resubmit'
    ? tx('threadView.composer.editingRejected', 'Editando comentario rechazado...')
    : replyTarget === 'comment'
      ? tx('threadView.composer.replyingComment', 'Respondiendo al comentario...')
      : tx('threadView.composer.replyingThread', 'Respondiendo al hilo...');
  const composerPlaceholder = composerMode === 'resubmit'
    ? tx('threadView.composer.placeholderEdit', 'Edita tu comentario antes de reenviarlo...')
    : replyTarget === 'comment'
      ? tx('threadView.composer.placeholderComment', 'Escribe tu respuesta...')
      : tx('threadView.composer.placeholderThread', 'Escribe un comentario...');
  const submitLabel = composerMode === 'resubmit'
    ? tx('threadView.actions.resend', 'Reenviar')
    : tx('threadView.actions.send', 'Enviar');

  return (
    <View
      style={[
        styles.replyInputContainer,
        replyInputContainerStyle,
      ]}
    >
      {showComposerContext && (
        <View style={styles.replyingToBar}>
          <Text style={styles.replyingToText}>{composerContextLabel}</Text>
          <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelReplyText}>{tx('threadView.actions.cancel', 'Cancelar')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder={composerPlaceholder}
          placeholderTextColor={colors.warm.inkFaint}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSubmit}
          disabled={!text.trim()}
          activeOpacity={0.7}
        >
          <Text style={styles.sendButtonText}>{submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * ThreadView Component
 * 
 * Main component that displays a post with its comments and nested replies.
 * Validates: Requirements 11.8, 11.9, 11.10
 */
export const ThreadView: React.FC<ThreadViewProps> = ({
  post,
  comments,
  onLikePost,
  onLikeComment,
  onReply,
  onReportPost,
  onReportComment,
  onDismiss,
  isPostLiked = false,
  likedCommentIds = new Set(),
  canInteract = true,
  currentUserId,
  interactionNotice,
  style,
}) => {
  const { t } = useViewTranslation('community');
  const tx = useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      t(key, { defaultValue, ...(options ?? {}) }),
    [t],
  );
  const [composerParentId, setComposerParentId] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<'idle' | 'reply' | 'resubmit'>('idle');
  const [replyTarget, setReplyTarget] = useState<'post' | 'comment'>('post');
  const [composerDraftText, setComposerDraftText] = useState('');
  const [composerDraftVersion, setComposerDraftVersion] = useState(0);
  const commentsLabel = comments.length === 1
    ? tx('threadView.comments.single', 'Comentario')
    : tx('threadView.comments.plural', 'Comentarios');

  const resetComposer = useCallback(() => {
    setComposerParentId(null);
    setComposerMode('idle');
    setReplyTarget('post');
    setComposerDraftText('');
    setComposerDraftVersion((current) => current + 1);
  }, []);

  const openReplyComposer = useCallback((parentId: string | null) => {
    setComposerParentId(parentId);
    setComposerMode('reply');
    setReplyTarget(parentId ? 'comment' : 'post');
    setComposerDraftText('');
    setComposerDraftVersion((current) => current + 1);
  }, []);

  const handleResubmitComment = useCallback((comment: Comment) => {
    setComposerParentId(comment.parentCommentId ?? null);
    setComposerMode('resubmit');
    setReplyTarget(comment.parentCommentId ? 'comment' : 'post');
    setComposerDraftText(comment.text);
    setComposerDraftVersion((current) => current + 1);
  }, []);
  
  const handleLikePost = useCallback(() => {
    onLikePost?.(post.id);
  }, [post.id, onLikePost]);
  
  const handleLikeComment = useCallback((commentId: string) => {
    onLikeComment?.(commentId);
  }, [onLikeComment]);
  
  const handleReplyToPost = useCallback(() => {
    openReplyComposer(null);
  }, [openReplyComposer]);
  
  const handleReplyToComment = useCallback((commentId: string) => {
    openReplyComposer(commentId);
  }, [openReplyComposer]);
  
  const handleSubmitReply = useCallback((text: string) => {
    onReply?.(composerParentId, text);
    resetComposer();
  }, [composerParentId, onReply, resetComposer]);
  
  const handleCancelReply = useCallback(() => {
    resetComposer();
  }, [resetComposer]);
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, style]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onDismiss} activeOpacity={0.7}>
          <Text style={styles.backButton}>{`← ${tx('threadView.header.back', 'Volver')}`}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tx('threadView.header.title', 'Hilo')}</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Main post - Requirement 11.8 */}
        <MainPost
          post={post}
          isLiked={isPostLiked}
          onLike={handleLikePost}
          onReply={handleReplyToPost}
          onReport={() => onReportPost?.(post)}
          canInteract={canInteract}
          currentUserId={currentUserId}
          tx={tx}
        />

        {!canInteract && interactionNotice ? (
          <View style={[styles.interactionNoticeCard, createAndroidThreadSurface(colors.warning, 0.97, 0.84)]}>
            <Text style={styles.interactionNoticeText}>{interactionNotice}</Text>
          </View>
        ) : null}
        
        {/* Comments section */}
        {comments.length > 0 && (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsSectionTitle}>
              {comments.length} {commentsLabel}
            </Text>
            
            {/* Comments list with nested replies - Requirements 11.8, 11.9 */}
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                depth={0}
                onLike={handleLikeComment}
                onReply={handleReplyToComment}
                onResubmit={handleResubmitComment}
                onReport={onReportComment}
                isLiked={likedCommentIds.has(comment.id)}
                likedCommentIds={likedCommentIds}
                canInteract={canInteract}
                currentUserId={currentUserId}
                tx={tx}
              />
            ))}
          </View>
        )}
        
        {/* Empty state for no comments */}
        {comments.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💬</Text>
            <Text style={styles.emptyStateText}>
              {tx('threadView.comments.empty', 'Se el primero en comentar')}
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Reply input */}
      <ReplyInput
        composerMode={composerMode}
        replyTarget={replyTarget}
        onSubmit={handleSubmitReply}
        onCancel={handleCancelReply}
        disabled={!canInteract}
        disabledMessage={interactionNotice}
        draftText={composerDraftText}
        draftVersion={composerDraftVersion}
        tx={tx}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warm.sand,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.warm.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.warm,
  },
  backButton: {
    fontSize: typography.fontSize.base,
    color: colors.accent,
    fontFamily: typography.fontFamily.medium,
  },
  headerTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
  },
  headerSpacer: {
    width: 60,
  },
  
  // Scroll view styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xl,
  },
  
  // Main post styles
  mainPostCard: {
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  postText: {
    fontSize: typography.fontSize.base,
    color: colors.warm.ink,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    marginBottom: spacing.md,
  },
  tagContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: 'rgba(21, 52, 128, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.caseAccent.workPermit,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: colors.border.warm,
    paddingTop: spacing.md,
  },
  
  // Avatar styles
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.warm.cream,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
  },
  avatarTextSmall: {
    fontSize: typography.fontSize.sm,
  },
  
  // Author info styles
  authorInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginRight: spacing.xs,
  },
  authorNameSmall: {
    fontSize: typography.fontSize.sm,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
  },
  roleBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkFaint,
    marginTop: 2,
  },
  
  // Like button styles
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  disabledAction: {
    opacity: 0.45,
  },
  likeIcon: {
    fontSize: typography.fontSize.md,
    marginRight: spacing.xs,
  },
  likeIconSmall: {
    fontSize: typography.fontSize.base,
  },
  likeCount: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    fontFamily: typography.fontFamily.medium,
  },
  likeCountSmall: {
    fontSize: typography.fontSize.xs,
  },
  likedCount: {
    color: colors.status.urgentWarm,
  },
  
  // Comments count styles
  commentsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  commentsIcon: {
    fontSize: typography.fontSize.md,
    marginRight: spacing.xs,
  },
  commentsCountText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    fontFamily: typography.fontFamily.medium,
  },
  
  // Reply button styles
  replyButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  replyButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.accent,
    fontFamily: typography.fontFamily.medium,
  },
  reportButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    fontFamily: typography.fontFamily.medium,
  },
  replyButtonTextSmall: {
    fontSize: typography.fontSize.xs,
  },
  
  // Comments section styles
  commentsSection: {
    marginTop: spacing.md,
  },
  commentsSectionTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.warm.ink,
    marginBottom: spacing.md,
  },
  
  // Comment item styles
  commentContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  nestingIndicator: {
    width: 2,
    marginRight: spacing.sm,
  },
  nestingLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border.light,
    borderRadius: 1,
  },
  commentContent: {
    flex: 1,
    backgroundColor: colors.warm.cream,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  commentText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.ink,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    marginBottom: spacing.sm,
  },
  commentModerationWrap: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  commentModerationSummary: {
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
    color: colors.warm.inkSoft,
  },
  commentResubmitButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  commentResubmitButtonText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.accent,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  repliesContainer: {
    marginTop: spacing.xs,
  },
  
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.warm.inkSoft,
  },
  interactionNoticeCard: {
    marginBottom: spacing.base,
    padding: spacing.base,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border.warm,
    backgroundColor: colors.warm.cream,
  },
  interactionNoticeText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: colors.warm.inkSoft,
  },
  
  // Reply input styles
  replyInputContainer: {
    backgroundColor: colors.warm.cream,
    borderTopWidth: 1,
    borderTopColor: colors.border.warm,
    padding: spacing.md,
  },
  disabledInputNotice: {
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border.warm,
    backgroundColor: colors.warm.sand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
  },
  disabledInputNoticeText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  replyingToBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.warm,
  },
  replyingToText: {
    fontSize: typography.fontSize.sm,
    color: colors.warm.inkSoft,
    fontStyle: 'italic',
  },
  cancelReplyText: {
    fontSize: typography.fontSize.sm,
    color: colors.accent,
    fontFamily: typography.fontFamily.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.warm.sand,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.warm.ink,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.warm,
  },
  sendButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.warm.inkFaint,
  },
  sendButtonText: {
    color: colors.warm.cream,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
  },
});

export default ThreadView;
