/**
 * ComposeSheet Component
 * 
 * A compose sheet for creating new posts in the community.
 * Supports post types: Post, Video, Document, Alert
 * Implements file attachment, link preview generation, and audience selection.
 * 
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard } from '../common/GlassCard';
import { useViewTranslation } from '../../i18n';
import type { PostType, LinkPreview, VideoPreview, ComposeData } from '../../types/community';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { usePressAnimation, useFadeUp } from '../../styles/animations';

type CommunityTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

export interface ComposeSheetProps {
  /** Callback when post is submitted */
  onSubmit?: (data: ComposeData) => void;
  /** Callback when sheet is dismissed */
  onDismiss?: () => void;
  /** Initial post type */
  initialType?: PostType;
  /** Group ID for the post */
  groupId?: string;
  /** Additional styles */
  style?: ViewStyle;
}

/** Post type configuration with icons and placeholders */
const POST_TYPE_META: Record<PostType, { icon: string; color: string }> = {
  Post: {
    icon: '📝',
    color: colors.accent,
  },
  Video: {
    icon: '🎬',
    color: colors.caseAccent.workPermit,
  },
  Document: {
    icon: '📄',
    color: colors.caseAccent.greenCard,
  },
  Alert: {
    icon: '🚨',
    color: colors.error,
  },
};

/** Supported file types for attachments */
const SUPPORTED_FILES = {
  Video: ['MP4', 'MOV'],
  Document: ['PDF', 'DOCX', 'IMG'],
};

type PostTypeConfig = { icon: string; placeholder: string; label: string; color: string };
type AudienceOption = { id: 'all' | 'segment'; label: string; icon: string };

const buildPostTypeConfig = (tx: CommunityTranslate): Record<PostType, PostTypeConfig> => ({
  Post: {
    ...POST_TYPE_META.Post,
    placeholder: tx('compose.post.placeholder', 'Que quieres compartir con la comunidad?'),
    label: tx('compose.post.label', 'Publicacion'),
  },
  Video: {
    ...POST_TYPE_META.Video,
    placeholder: tx('compose.video.placeholder', 'Comparte un video con la comunidad...'),
    label: tx('compose.video.label', 'Video'),
  },
  Document: {
    ...POST_TYPE_META.Document,
    placeholder: tx('compose.document.placeholder', 'Describe el documento que vas a compartir...'),
    label: tx('compose.document.label', 'Documento'),
  },
  Alert: {
    ...POST_TYPE_META.Alert,
    placeholder: tx('compose.alert.placeholder', 'Escribe una alerta importante para la comunidad...'),
    label: tx('compose.alert.label', 'Alerta'),
  },
});

const buildAudienceOptions = (tx: CommunityTranslate): AudienceOption[] => [
  { id: 'all', label: tx('compose.audience.all', 'Todos los miembros'), icon: '👥' },
  { id: 'segment', label: tx('compose.audience.segment', 'Segmento especifico'), icon: '🎯' },
];

/** YouTube URL regex pattern */
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;

/** General URL regex pattern */
const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

/**
 * PostTypeButton - Selectable post type button
 */
const PostTypeButton: React.FC<{
  config: PostTypeConfig;
  isSelected: boolean;
  onPress: () => void;
}> = ({ config, isSelected, onPress }) => {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.typeButton,
          isSelected && { backgroundColor: config.color, borderColor: config.color },
          animatedStyle,
        ]}
      >
        <Text style={styles.typeButtonIcon}>{config.icon}</Text>
        <Text style={[styles.typeButtonLabel, isSelected && styles.typeButtonLabelSelected]}>
          {config.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * AudienceSelector - Audience selection component
 */
const AudienceSelector: React.FC<{
  selected: 'all' | 'segment';
  onSelect: (audience: 'all' | 'segment') => void;
  sectionLabel: string;
  options: AudienceOption[];
}> = ({ selected, onSelect, sectionLabel, options }) => {
  return (
    <View style={styles.audienceContainer}>
      <Text style={styles.sectionLabel}>{sectionLabel}</Text>
      <View style={styles.audienceOptions}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.audienceOption,
              selected === option.id && styles.audienceOptionSelected,
            ]}
            onPress={() => onSelect(option.id as 'all' | 'segment')}
            activeOpacity={0.7}
          >
            <Text style={styles.audienceIcon}>{option.icon}</Text>
            <Text
              style={[
                styles.audienceLabel,
                selected === option.id && styles.audienceLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

/**
 * LinkPreviewCard - Displays link preview with title and site name
 * Validates: Requirement 12.7
 */
const LinkPreviewCard: React.FC<{
  preview: LinkPreview;
  onRemove: () => void;
}> = ({ preview, onRemove }) => {
  return (
    <View style={styles.linkPreviewCard}>
      <View style={styles.linkPreviewContent}>
        <Text style={styles.linkPreviewIcon}>🔗</Text>
        <View style={styles.linkPreviewInfo}>
          <Text style={styles.linkPreviewTitle} numberOfLines={1}>
            {preview.title}
          </Text>
          <Text style={styles.linkPreviewSite} numberOfLines={1}>
            {preview.siteName}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove} activeOpacity={0.7}>
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * VideoPreviewCard - Displays YouTube video preview with title, channel, and duration
 * Validates: Requirement 12.6
 */
const VideoPreviewCard: React.FC<{
  preview: VideoPreview;
  onRemove: () => void;
}> = ({ preview, onRemove }) => {
  return (
    <View style={styles.videoPreviewCard}>
      <View style={styles.videoThumbnailContainer}>
        {preview.thumbnail ? (
          <Image source={{ uri: preview.thumbnail }} style={styles.videoThumbnail} />
        ) : (
          <View style={styles.videoThumbnailPlaceholder}>
            <Text style={styles.videoThumbnailIcon}>▶️</Text>
          </View>
        )}
        <View style={styles.videoDurationBadge}>
          <Text style={styles.videoDurationText}>{preview.duration}</Text>
        </View>
      </View>
      <View style={styles.videoPreviewInfo}>
        <Text style={styles.videoPreviewTitle} numberOfLines={2}>
          {preview.title}
        </Text>
        <Text style={styles.videoPreviewChannel} numberOfLines={1}>
          {preview.channel}
        </Text>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove} activeOpacity={0.7}>
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * AttachmentItem - Displays an attached file
 */
const AttachmentItem: React.FC<{
  filename: string;
  type: 'video' | 'document';
  onRemove: () => void;
}> = ({ filename, type, onRemove }) => {
  const icon = type === 'video' ? '🎬' : '📄';
  
  return (
    <View style={styles.attachmentItem}>
      <Text style={styles.attachmentIcon}>{icon}</Text>
      <Text style={styles.attachmentName} numberOfLines={1}>
        {filename}
      </Text>
      <TouchableOpacity style={styles.removeButtonSmall} onPress={onRemove} activeOpacity={0.7}>
        <Text style={styles.removeButtonTextSmall}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * ComposeSheet Component
 * 
 * Main compose sheet for creating community posts.
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8
 */
export const ComposeSheet: React.FC<ComposeSheetProps> = ({
  onSubmit,
  onDismiss,
  initialType = 'Post',
  groupId: _groupId,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useViewTranslation('community');
  const tx = useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      t(key, { defaultValue, ...(options ?? {}) }),
    [t],
  );
  // State
  const [postType, setPostType] = useState<PostType>(initialType);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [videoPreview, setVideoPreview] = useState<VideoPreview | null>(null);
  const [audience, setAudience] = useState<'all' | 'segment'>('all');

  // Animations
  const { animatedStyle: fadeStyle } = useFadeUp({ autoStart: true, distance: 30 });
  const postTypeConfig = useMemo(() => buildPostTypeConfig(tx), [tx]);
  const audienceOptions = useMemo(() => buildAudienceOptions(tx), [tx]);

  // Get current post type config
  const currentConfig = postTypeConfig[postType];

  /**
   * Extract and generate link preview from text
   * Validates: Requirements 12.5, 12.6, 12.7
   */
  const handleTextChange = useCallback((newText: string) => {
    setText(newText);

    // Check for YouTube links first
    const youtubeMatch = newText.match(YOUTUBE_REGEX);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      // Generate mock video preview (in real app, would fetch from YouTube API)
      setVideoPreview({
        url: `https://youtube.com/watch?v=${videoId}`,
        title: tx('compose.video.previewTitle', 'Video de YouTube'),
        channel: tx('compose.video.previewChannel', 'Canal de YouTube'),
        duration: '10:30',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      });
      setLinkPreview(null);
      return;
    }

    // Check for regular links
    const urlMatch = newText.match(URL_REGEX);
    if (urlMatch && !videoPreview) {
      const url = urlMatch[0];
      // Generate mock link preview (in real app, would fetch metadata)
      const domain = new URL(url).hostname.replace('www.', '');
      setLinkPreview({
        url,
        title: tx('compose.link.sharedTitle', 'Enlace compartido'),
        siteName: domain,
      });
    } else if (!urlMatch && !youtubeMatch) {
      // Clear previews if no links found
      if (!videoPreview) setLinkPreview(null);
    }
  }, [tx, videoPreview]);

  /**
   * Handle file attachment
   * Validates: Requirement 12.4
   */
  const handleAttachFile = useCallback(() => {
    // In a real app, this would open a file picker
    // For now, we'll simulate adding a file
    const mockFilename = postType === 'Video' 
      ? `video_${Date.now()}.mp4`
      : `document_${Date.now()}.pdf`;
    
    setAttachments(prev => [...prev, mockFilename]);
  }, [postType]);

  /**
   * Remove attachment
   */
  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Handle post submission
   */
  const handleSubmit = useCallback(() => {
    if (!text.trim() && attachments.length === 0) return;

    const composeData: ComposeData = {
      type: postType,
      text: text.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
      linkPreview: linkPreview || undefined,
      videoPreview: videoPreview || undefined,
      audience,
    };

    onSubmit?.(composeData);
  }, [postType, text, attachments, linkPreview, videoPreview, audience, onSubmit]);

  /**
   * Check if submit is enabled
   */
  const isSubmitEnabled = useMemo(() => {
    return text.trim().length > 0 || attachments.length > 0;
  }, [text, attachments]);

  /**
   * Get supported file types label
   */
  const getSupportedFilesLabel = useCallback(() => {
    if (postType === 'Video') {
      return SUPPORTED_FILES.Video.join(', ');
    }
    if (postType === 'Document') {
      return SUPPORTED_FILES.Document.join(', ');
    }
    return '';
  }, [postType]);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={styles.keyboardAvoid}
    >
      <Animated.View style={[styles.container, fadeStyle, style]}>
        <GlassCard
          style={[
            styles.card,
            Platform.OS === 'android'
              ? { paddingBottom: spacing.base + Math.max(insets.bottom, spacing.base) }
              : null,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.cancelButton}>{tx('common.cancel', 'Cancelar')}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{tx('compose.header.title', 'Nueva publicacion')}</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!isSubmitEnabled}
              activeOpacity={0.7}
            >
              <Text style={[styles.submitButton, !isSubmitEnabled && styles.submitButtonDisabled]}>
                {tx('compose.header.submit', 'Publicar')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Post Type Selector - Requirement 12.2 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.typeSelector}
            contentContainerStyle={styles.typeSelectorContent}
          >
            {(Object.keys(postTypeConfig) as PostType[]).map((type) => (
              <PostTypeButton
                key={type}
                config={postTypeConfig[type]}
                isSelected={postType === type}
                onPress={() => setPostType(type)}
              />
            ))}
          </ScrollView>

          {/* Text Input - Requirement 12.3 */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder={currentConfig.placeholder}
              placeholderTextColor={colors.text.tertiary}
              multiline
              value={text}
              onChangeText={handleTextChange}
              textAlignVertical="top"
            />
          </View>

          {/* Video Preview - Requirement 12.6 */}
          {videoPreview && (
            <VideoPreviewCard
              preview={videoPreview}
              onRemove={() => setVideoPreview(null)}
            />
          )}

          {/* Link Preview - Requirement 12.7 */}
          {linkPreview && !videoPreview && (
            <LinkPreviewCard
              preview={linkPreview}
              onRemove={() => setLinkPreview(null)}
            />
          )}

          {/* Attachments - Requirement 12.4 */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              <Text style={styles.sectionLabel}>{tx('compose.attachments.title', 'Archivos adjuntos')}</Text>
              {attachments.map((filename, index) => (
                <AttachmentItem
                  key={index}
                  filename={filename}
                  type={postType === 'Video' ? 'video' : 'document'}
                  onRemove={() => handleRemoveAttachment(index)}
                />
              ))}
            </View>
          )}

          {/* Audience Selector - Requirement 12.8 */}
          <AudienceSelector
            selected={audience}
            onSelect={setAudience}
            sectionLabel={tx('compose.audience.title', 'Audiencia')}
            options={audienceOptions}
          />

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Attach File Button - Requirement 12.4 */}
            {(postType === 'Video' || postType === 'Document') && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleAttachFile}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonIcon}>📎</Text>
                <Text style={styles.actionButtonLabel}>
                  {tx('compose.actions.attach', 'Adjuntar')} ({getSupportedFilesLabel()})
                </Text>
              </TouchableOpacity>
            )}

            {/* Add Link Button - Requirement 12.5 */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // In a real app, this would open a link input dialog
                handleTextChange(text + ' https://example.com');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonIcon}>🔗</Text>
              <Text style={styles.actionButtonLabel}>{tx('compose.actions.addLink', 'Anadir enlace')}</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    padding: spacing.base,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '90%',
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  cancelButton: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  submitButton: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.accent,
  },
  submitButtonDisabled: {
    color: colors.text.tertiary,
  },

  // Type selector styles
  typeSelector: {
    marginBottom: spacing.base,
  },
  typeSelectorContent: {
    gap: spacing.sm,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  typeButtonIcon: {
    fontSize: typography.fontSize.base,
    marginRight: spacing.xs,
  },
  typeButtonLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  typeButtonLabelSelected: {
    color: colors.text.inverse,
  },

  // Input styles
  inputContainer: {
    marginBottom: spacing.base,
  },
  textInput: {
    minHeight: 120,
    maxHeight: 200,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  // Section label
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Audience selector styles
  audienceContainer: {
    marginBottom: spacing.base,
  },
  audienceOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  audienceOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  audienceOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}10`,
  },
  audienceIcon: {
    fontSize: typography.fontSize.md,
    marginRight: spacing.xs,
  },
  audienceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
  },
  audienceLabelSelected: {
    color: colors.accent,
  },

  // Link preview styles
  linkPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.base,
  },
  linkPreviewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkPreviewIcon: {
    fontSize: typography.fontSize.xl,
    marginRight: spacing.sm,
  },
  linkPreviewInfo: {
    flex: 1,
  },
  linkPreviewTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  linkPreviewSite: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },

  // Video preview styles
  videoPreviewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.base,
  },
  videoThumbnailContainer: {
    width: 100,
    height: 56,
    borderRadius: borderRadius.small,
    overflow: 'hidden',
    marginRight: spacing.sm,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumbnailIcon: {
    fontSize: typography.fontSize.xl,
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
  },
  videoDurationText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.medium,
  },
  videoPreviewInfo: {
    flex: 1,
  },
  videoPreviewTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  videoPreviewChannel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },

  // Remove button styles
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  removeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.bold,
  },
  removeButtonSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonTextSmall: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.bold,
  },

  // Attachments styles
  attachmentsContainer: {
    marginBottom: spacing.base,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.xs,
  },
  attachmentIcon: {
    fontSize: typography.fontSize.md,
    marginRight: spacing.sm,
  },
  attachmentName: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },

  // Action buttons styles
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.background.secondary,
  },
  actionButtonIcon: {
    fontSize: typography.fontSize.base,
    marginRight: spacing.xs,
  },
  actionButtonLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
  },
});

export default ComposeSheet;
