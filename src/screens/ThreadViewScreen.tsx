import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { AnimatedBackground } from '../components/common/AnimatedBackground';
import { BrandedLoadingState } from '../components/common/BrandedLoadingState';
import { GlassCard } from '../components/common/GlassCard';
import { ReportContentSheet } from '../components/community/ReportContentSheet';
import { ThreadView } from '../components/community/ThreadView';
import { useAppAlert } from '../context/AppAlertContext';
import { useAuth } from '../context/AuthContext';
import { useViewTranslation } from '../i18n';
import { communityService } from '../services/community';
import { borderRadius, colors, spacing, typography } from '../styles/theme';
import type { Comment, Post } from '../types/community';
import type { CommunityStackParamList } from '../types/navigation';
import {
  resolveCommunityInteractionErrorIssue,
  resolveDisabledCommunityInteractionIssue,
} from '../utils/communityInteractionAlerts';
import {
  COMMUNITY_REPORT_REASON_OPTIONS,
  resolveCommunityReportErrorAlert,
} from '../utils/communityReports';

type ThreadViewRouteProp = RouteProp<CommunityStackParamList, 'ThreadView'>;
type ThreadViewNavigationProp = StackNavigationProp<CommunityStackParamList>;

type ReportTarget =
  | { type: 'POST'; post: Post }
  | { type: 'COMMENT'; comment: Comment };

function collectLikedCommentIds(comments: Comment[]): Set<string> {
  const liked = new Set<string>();

  const visit = (items: Comment[]) => {
    for (const item of items) {
      if (item.isLiked) {
        liked.add(item.id);
      }

      if (item.replies?.length) {
        visit(item.replies);
      }
    }
  };

  visit(comments);
  return liked;
}

function countComments(comments: Comment[]): number {
  return comments.reduce(
    (total, comment) => total + 1 + countComments(comment.replies ?? []),
    0,
  );
}

function updateCommentTree(
  comments: Comment[],
  targetId: string,
  update: (comment: Comment) => Comment,
): Comment[] {
  return comments.map((comment) => {
    if (comment.id === targetId) {
      return update(comment);
    }

    return comment.replies?.length
      ? { ...comment, replies: updateCommentTree(comment.replies, targetId, update) }
      : comment;
  });
}

function appendReply(
  comments: Comment[],
  parentId: string | null,
  nextComment: Comment,
): Comment[] {
  if (!parentId) {
    return [...comments, nextComment];
  }

  return comments.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [...(comment.replies ?? []), nextComment],
      };
    }

    return comment.replies?.length
      ? { ...comment, replies: appendReply(comment.replies, parentId, nextComment) }
      : comment;
  });
}

export const ThreadViewScreen: React.FC = () => {
  const navigation = useNavigation<ThreadViewNavigationProp>();
  const route = useRoute<ThreadViewRouteProp>();
  const { postId, groupId, isMember, hadMembership } = route.params;
  const { showAlert, showError } = useAppAlert();
  const { currentUser } = useAuth();
  const { t } = useViewTranslation('community');
  const tx = useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      t(key, { defaultValue, ...(options ?? {}) }),
    [t],
  );
  const nonMemberMessage = tx(
    'threadScreen.nonMember.message',
    'Necesitas ser miembro del grupo para reaccionar o comentar en este hilo.',
  );

  const [isLoading, setIsLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [canInteract, setCanInteract] = useState(Boolean(isMember));
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [selectedReportReason, setSelectedReportReason] = useState<string>(
    COMMUNITY_REPORT_REASON_OPTIONS[0].code,
  );
  const [reportNote, setReportNote] = useState('');
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const hasEverBeenMemberRef = useRef(Boolean(isMember || hadMembership));

  const interactionIssue = resolveDisabledCommunityInteractionIssue({
    hasActiveMembership: canInteract,
    hadMembership: hasEverBeenMemberRef.current,
    nonMemberTitle: tx('threadScreen.nonMember.title', 'Unete al grupo'),
    nonMemberMessage,
  });

  const loadThread = useCallback(async () => {
    try {
      const detail = await communityService.getPostById(postId);
      let resolvedIsMember = isMember;
      const resolvedGroupId = groupId ?? detail.groupId;

      if (typeof resolvedIsMember !== 'boolean' && resolvedGroupId) {
        try {
          const group = await communityService.getGroupById(resolvedGroupId);
          resolvedIsMember = Boolean(group.isMember);
        } catch (membershipError) {
          console.error('[ThreadViewScreen] Error resolving group membership:', membershipError);
          resolvedIsMember = false;
        }
      }

      if (resolvedIsMember) {
        hasEverBeenMemberRef.current = true;
      }

      setComments(detail.comments);
      setPost({
        ...detail,
        comments: countComments(detail.comments),
      });
      setLikedCommentIds(collectLikedCommentIds(detail.comments));
      setCanInteract(Boolean(resolvedIsMember));
    } catch (error) {
      console.error('[ThreadViewScreen] Error loading post thread:', error);
      setPost(null);
      setComments([]);
      setLikedCommentIds(new Set());
      setCanInteract(false);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, isMember, postId]);

  useEffect(() => {
    setIsLoading(true);
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    return communityService.subscribeToPostChanges(postId, () => {
      void loadThread();
    });
  }, [loadThread, postId]);

  const handleLikePost = useCallback(async (targetPostId: string) => {
    if (!canInteract) {
      if (interactionIssue) {
        showAlert(interactionIssue.alert);
      }
      return;
    }

    if (!post) return;

    const wasLiked = Boolean(post.isLiked);
    setPost((current) =>
      current
        ? {
            ...current,
            isLiked: !wasLiked,
            likes: wasLiked ? current.likes - 1 : current.likes + 1,
          }
        : current,
    );

    try {
      if (wasLiked) {
        await communityService.unlikePost(targetPostId);
      } else {
        await communityService.likePost(targetPostId);
      }
    } catch (error) {
      console.error('[ThreadViewScreen] Error toggling post like:', error);
      setPost((current) =>
        current
          ? {
              ...current,
              isLiked: wasLiked,
              likes: wasLiked ? current.likes + 1 : current.likes - 1,
            }
          : current,
      );

        const accessIssue = resolveCommunityInteractionErrorIssue(error);
        if (accessIssue) {
          showAlert(accessIssue.alert);
          void loadThread();
          return;
        }

      showError(error, {
        title: tx('threadScreen.feedback.reactionErrorTitle', 'No se pudo actualizar tu reaccion'),
        fallbackMessage: tx('threadScreen.feedback.reactionErrorMessage', 'No se pudo actualizar tu reaccion.'),
      });
    }
    }, [canInteract, interactionIssue, loadThread, post, showAlert, showError, tx]);

  const handleLikeComment = useCallback(async (commentId: string) => {
    if (!canInteract) {
      if (interactionIssue) {
        showAlert(interactionIssue.alert);
      }
      return;
    }

    const wasLiked = likedCommentIds.has(commentId);

    setLikedCommentIds((current) => {
      const next = new Set(current);
      if (wasLiked) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });

    setComments((current) =>
      updateCommentTree(current, commentId, (comment) => ({
        ...comment,
        isLiked: !wasLiked,
        likes: wasLiked ? comment.likes - 1 : comment.likes + 1,
      })),
    );

    try {
      if (wasLiked) {
        await communityService.unlikeComment(commentId);
      } else {
        await communityService.likeComment(commentId);
      }
    } catch (error) {
      console.error('[ThreadViewScreen] Error toggling comment like:', error);
      setLikedCommentIds((current) => {
        const next = new Set(current);
        if (wasLiked) {
          next.add(commentId);
        } else {
          next.delete(commentId);
        }
        return next;
      });
      setComments((current) =>
        updateCommentTree(current, commentId, (comment) => ({
          ...comment,
          isLiked: wasLiked,
          likes: wasLiked ? comment.likes + 1 : comment.likes - 1,
        })),
      );

      const accessIssue = resolveCommunityInteractionErrorIssue(error);
      if (accessIssue) {
        showAlert(accessIssue.alert);
        void loadThread();
        return;
      }

      showError(error, {
        title: tx('threadScreen.feedback.reactionErrorTitle', 'No se pudo actualizar tu reaccion'),
        fallbackMessage: tx('threadScreen.feedback.reactionErrorMessage', 'No se pudo actualizar tu reaccion.'),
      });
    }
  }, [canInteract, interactionIssue, likedCommentIds, loadThread, showAlert, showError, tx]);

  const handleReply = useCallback(async (parentId: string | null, text: string) => {
    if (!canInteract) {
      if (interactionIssue) {
        showAlert(interactionIssue.alert);
      }
      return;
    }

    try {
      const createdComment = await communityService.createComment({
        postId,
        text,
        parentCommentId: parentId ?? undefined,
      });

      setComments((current) => appendReply(current, parentId, createdComment));
      setLikedCommentIds((current) => {
        const next = new Set(current);
        if (createdComment.isLiked) {
          next.add(createdComment.id);
        }
        return next;
      });
      setPost((current) =>
        current
          ? {
              ...current,
              comments: current.comments + 1,
            }
          : current,
      );
    } catch (error) {
      console.error('[ThreadViewScreen] Error creating comment:', error);

      const accessIssue = resolveCommunityInteractionErrorIssue(error);
      if (accessIssue) {
        showAlert(accessIssue.alert);
        void loadThread();
        return;
      }

      showError(error, {
        title: tx('threadScreen.feedback.commentErrorTitle', 'No se pudo publicar tu comentario'),
        fallbackMessage: tx('threadScreen.feedback.commentErrorMessage', 'No se pudo publicar tu comentario.'),
      });
    }
  }, [canInteract, interactionIssue, loadThread, postId, showAlert, showError, tx]);

  const handleCloseReportSheet = useCallback(() => {
    if (isReportSubmitting) {
      return;
    }

    setReportSheetVisible(false);
    setReportTarget(null);
    setSelectedReportReason(COMMUNITY_REPORT_REASON_OPTIONS[0].code);
    setReportNote('');
  }, [isReportSubmitting]);

  const handleOpenPostReport = useCallback((targetPost: Post) => {
    setReportTarget({ type: 'POST', post: targetPost });
    setSelectedReportReason(COMMUNITY_REPORT_REASON_OPTIONS[0].code);
    setReportNote('');
    setReportSheetVisible(true);
  }, []);

  const handleOpenCommentReport = useCallback((targetComment: Comment) => {
    setReportTarget({ type: 'COMMENT', comment: targetComment });
    setSelectedReportReason(COMMUNITY_REPORT_REASON_OPTIONS[0].code);
    setReportNote('');
    setReportSheetVisible(true);
  }, []);

  const submitReport = useCallback(async () => {
    if (!reportTarget) {
      return;
    }

    const trimmedNote = reportNote.trim() || undefined;

    try {
      setIsReportSubmitting(true);

      if (reportTarget.type === 'POST') {
        await communityService.reportPost(reportTarget.post.id, selectedReportReason, trimmedNote);
      } else {
        await communityService.reportComment(reportTarget.comment.id, selectedReportReason, trimmedNote);
      }

      setReportSheetVisible(false);
      setReportTarget(null);
      setSelectedReportReason(COMMUNITY_REPORT_REASON_OPTIONS[0].code);
      setReportNote('');
      await loadThread();

      showAlert({
        title: tx('threadScreen.feedback.reportSuccessTitle', 'Reporte enviado'),
        message:
          reportTarget.type === 'POST'
            ? tx('threadScreen.feedback.reportSuccessMessagePost', 'Gracias. El equipo revisara esta publicacion.')
            : tx('threadScreen.feedback.reportSuccessMessageComment', 'Gracias. El equipo revisara este comentario.'),
        tone: 'success',
      });
    } catch (error) {
      console.error('[ThreadViewScreen] Error reporting content:', error);
      const reportAlert = resolveCommunityReportErrorAlert(
        error,
        reportTarget.type === 'POST' ? 'post' : 'comment',
        tx,
      );

      if (reportAlert) {
        showAlert(reportAlert);
        return;
      }

      showError(error, {
        title: tx('threadScreen.feedback.reportErrorTitle', 'No se pudo enviar el reporte'),
        fallbackMessage:
          reportTarget.type === 'POST'
            ? tx('threadScreen.feedback.reportErrorMessagePost', 'No pudimos enviar tu reporte de esta publicacion.')
            : tx('threadScreen.feedback.reportErrorMessageComment', 'No pudimos enviar tu reporte de este comentario.'),
      });
    } finally {
      setIsReportSubmitting(false);
    }
  }, [loadThread, reportNote, reportTarget, selectedReportReason, showAlert, showError, tx]);

  if (isLoading) {
    return (
      <AnimatedBackground>
        <SafeAreaView style={styles.container} edges={['top']}>
          <BrandedLoadingState
            title={tx('threadScreen.loading.title', 'Cargando hilo')}
            subtitle={tx('threadScreen.loading.subtitle', 'Recuperando la publicacion y la conversacion asociada.')}
            variant="community"
          />
        </SafeAreaView>
      </AnimatedBackground>
    );
  }

  if (!post) {
    return (
      <AnimatedBackground>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.errorContainer}>
            <GlassCard style={styles.errorCard}>
              <Text style={styles.errorTitle}>{tx('threadScreen.errorState.title', 'No se pudo abrir el hilo')}</Text>
              <Text style={styles.errorText}>
                {tx('threadScreen.errorState.subtitle', 'Intenta recargar o vuelve a la lista del grupo.')}
              </Text>
              <View style={styles.errorActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
                  <Text style={styles.secondaryButtonText}>{tx('threadScreen.errorState.back', 'Volver')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={loadThread}>
                  <Text style={styles.primaryButtonText}>{tx('threadScreen.errorState.retry', 'Reintentar')}</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </SafeAreaView>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ThreadView
          post={post}
          comments={comments}
          onDismiss={() => navigation.goBack()}
          onLikePost={handleLikePost}
          onLikeComment={handleLikeComment}
          onReply={handleReply}
          onReportPost={handleOpenPostReport}
          onReportComment={handleOpenCommentReport}
          isPostLiked={Boolean(post.isLiked)}
          likedCommentIds={likedCommentIds}
          canInteract={canInteract}
          currentUserId={currentUser?.id}
          interactionNotice={interactionIssue?.alert.message}
        />

        <Modal
          visible={reportSheetVisible}
          transparent
          animationType="slide"
          presentationStyle="overFullScreen"
          onRequestClose={handleCloseReportSheet}
        >
          <View style={styles.reportModalOverlay}>
            <ReportContentSheet
              title={reportTarget?.type === 'COMMENT'
                ? tx('threadScreen.report.titleComment', 'Reportar comentario')
                : tx('threadScreen.report.titlePost', 'Reportar publicacion')}
              subtitle={tx('threadScreen.report.subtitle', 'Elige el motivo principal. Tu identidad no se mostrara al grupo.')}
              selectedReasonCode={selectedReportReason}
              note={reportNote}
              onSelectReason={setSelectedReportReason}
              onNoteChange={setReportNote}
              onCancel={handleCloseReportSheet}
              onSubmit={() => {
                void submitReport();
              }}
              isSubmitting={isReportSubmitting}
            />
          </View>
        </Modal>
      </SafeAreaView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.base,
  },
  errorCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.large,
  },
  errorTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    marginBottom: spacing.md,
  },
  errorActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.medium,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
    padding: spacing.base,
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
  },
});

export default ThreadViewScreen;