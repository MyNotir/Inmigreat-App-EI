import { GraphQLException } from '../services/graphql';
import type { AppAlertConfig } from '../types/alerts';

type CommunityTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

export type CommunityInteractionIssueKind = 'muted' | 'removed' | 'non_member';

export interface CommunityInteractionIssue {
  kind: CommunityInteractionIssueKind;
  alert: AppAlertConfig;
}

export const REMOVED_MEMBER_INTERACTION_NOTICE =
  'Ya no formas parte de este grupo. Puedes seguir viendo el contenido disponible, pero ya no puedes interactuar aquí.';

function getMutedMemberAlert(tx?: CommunityTranslate): AppAlertConfig {
  return {
    title: tx
      ? tx('interaction.muted.title', 'No puedes publicar ahora')
      : 'No puedes publicar ahora',
    message: tx
      ? tx('interaction.muted.message', 'Ahora mismo no puedes publicar ni comentar en este grupo.')
      : 'Ahora mismo no puedes publicar ni comentar en este grupo.',
    tone: 'info',
  };
}

function getRemovedMemberAlert(tx?: CommunityTranslate): AppAlertConfig {
  return {
    title: tx
      ? tx('interaction.removed.title', 'Ya no formas parte del grupo')
      : 'Ya no formas parte del grupo',
    message: tx
      ? tx('interaction.removed.message', 'Ya no formas parte de este grupo. No puedes seguir interactuando aqui.')
      : 'Ya no formas parte de este grupo. No puedes seguir interactuando aquí.',
    tone: 'warning',
  };
}

export function getRemovedMemberInteractionNotice(tx?: CommunityTranslate): string {
  return tx
    ? tx(
        'interaction.removed.notice',
        'Ya no formas parte de este grupo. Puedes seguir viendo el contenido disponible, pero ya no puedes interactuar aqui.',
      )
    : REMOVED_MEMBER_INTERACTION_NOTICE;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof GraphQLException || error instanceof Error) {
    return error.message.trim().toLowerCase();
  }

  return '';
}

export function resolveDisabledCommunityInteractionIssue(options: {
  hasActiveMembership: boolean;
  hadMembership: boolean;
  nonMemberTitle: string;
  nonMemberMessage: string;
  tx?: CommunityTranslate;
}): CommunityInteractionIssue | null {
  if (options.hasActiveMembership) {
    return null;
  }

  if (options.hadMembership) {
    return {
      kind: 'removed',
      alert: getRemovedMemberAlert(options.tx),
    };
  }

  return {
    kind: 'non_member',
    alert: {
      title: options.nonMemberTitle,
      message: options.nonMemberMessage,
      tone: 'warning',
    },
  };
}

export function resolveCommunityInteractionErrorIssue(
  error: unknown,
  tx?: CommunityTranslate,
): CommunityInteractionIssue | null {
  const message = normalizeErrorMessage(error);

  if (!message) {
    return null;
  }

  if (message.includes('temporarily unable to post or comment in this group')) {
    return {
      kind: 'muted',
      alert: getMutedMemberAlert(tx),
    };
  }

  if (message.includes('not a member of this group')) {
    return {
      kind: 'removed',
      alert: getRemovedMemberAlert(tx),
    };
  }

  return null;
}