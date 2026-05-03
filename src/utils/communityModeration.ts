import { colors } from '../styles/theme';

type CommunityTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

export interface CommunityModerationPresentation {
  label: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

const COMMUNITY_MODERATION_PRESENTATION: Record<string, CommunityModerationPresentation> = {
  NOT_REVIEWED: {
    label: 'Publicado',
    backgroundColor: `${colors.success}12`,
    textColor: colors.success,
    borderColor: `${colors.success}22`,
  },
  APPROVED: {
    label: 'Publicado',
    backgroundColor: `${colors.success}12`,
    textColor: colors.success,
    borderColor: `${colors.success}22`,
  },
  AUTO_APPROVED: {
    label: 'Publicado',
    backgroundColor: `${colors.success}12`,
    textColor: colors.success,
    borderColor: `${colors.success}22`,
  },
  PENDING_REVIEW: {
    label: 'En revisión',
    backgroundColor: `${colors.warning}14`,
    textColor: colors.warning,
    borderColor: `${colors.warning}24`,
  },
  REJECTED: {
    label: 'Rechazado',
    backgroundColor: `${colors.error}14`,
    textColor: colors.error,
    borderColor: `${colors.error}24`,
  },
  REMOVED: {
    label: 'Oculto',
    backgroundColor: `${colors.error}14`,
    textColor: colors.error,
    borderColor: `${colors.error}24`,
  },
  ESCALATED: {
    label: 'Escalado',
    backgroundColor: `${colors.accent}14`,
    textColor: colors.accent,
    borderColor: `${colors.accent}24`,
  },
};

export function getCommunityModerationPresentation(
  moderationState?: string | null,
  tx?: CommunityTranslate,
): CommunityModerationPresentation | null {
  if (!moderationState) {
    return null;
  }

  const presentation = COMMUNITY_MODERATION_PRESENTATION[moderationState] ?? null;

  if (!presentation || !tx) {
    return presentation;
  }

  switch (moderationState) {
    case 'NOT_REVIEWED':
    case 'APPROVED':
    case 'AUTO_APPROVED':
      return {
        ...presentation,
        label: tx('moderationStatus.published', 'Publicado'),
      };
    case 'PENDING_REVIEW':
      return {
        ...presentation,
        label: tx('moderationStatus.inReview', 'En revision'),
      };
    case 'REJECTED':
      return {
        ...presentation,
        label: tx('moderationStatus.rejected', 'Rechazado'),
      };
    case 'REMOVED':
      return {
        ...presentation,
        label: tx('moderationStatus.hidden', 'Oculto'),
      };
    case 'ESCALATED':
      return {
        ...presentation,
        label: tx('moderationStatus.escalated', 'Escalado'),
      };
    default:
      return presentation;
  }
}