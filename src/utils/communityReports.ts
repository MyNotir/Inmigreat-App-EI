import { GraphQLException } from '../services/graphql';
import type { AppAlertConfig } from '../types/alerts';

export const COMMUNITY_REPORT_NOTE_MAX_LENGTH = 280;

type CommunityTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

export const COMMUNITY_REPORT_REASON_OPTIONS = [
  { code: 'spam_repetitive', label: 'Spam o publicación repetitiva' },
  { code: 'service_promotion', label: 'Promoción de servicios o captación no permitida' },
  { code: 'harassment_or_abuse', label: 'Acoso, insultos o trato agresivo' },
  { code: 'fraud_or_deception', label: 'Estafa, fraude o intento de engaño' },
  { code: 'sexual_or_inappropriate', label: 'Contenido sexual o inapropiado' },
  { code: 'other', label: 'Otro' },
] as const;

export type CommunityReportReasonCode = typeof COMMUNITY_REPORT_REASON_OPTIONS[number]['code'];

export function getCommunityReportReasonLabel(
  code: CommunityReportReasonCode,
  tx?: CommunityTranslate,
): string {
  switch (code) {
    case 'spam_repetitive':
      return tx
        ? tx('reportReasons.spamRepetitive', 'Spam o publicacion repetitiva')
        : 'Spam o publicación repetitiva';
    case 'service_promotion':
      return tx
        ? tx('reportReasons.servicePromotion', 'Promocion de servicios o captacion no permitida')
        : 'Promoción de servicios o captación no permitida';
    case 'harassment_or_abuse':
      return tx
        ? tx('reportReasons.harassmentOrAbuse', 'Acoso, insultos o trato agresivo')
        : 'Acoso, insultos o trato agresivo';
    case 'fraud_or_deception':
      return tx
        ? tx('reportReasons.fraudOrDeception', 'Estafa, fraude o intento de engano')
        : 'Estafa, fraude o intento de engaño';
    case 'sexual_or_inappropriate':
      return tx
        ? tx('reportReasons.sexualOrInappropriate', 'Contenido sexual o inapropiado')
        : 'Contenido sexual o inapropiado';
    case 'other':
      return tx ? tx('reportReasons.other', 'Otro') : 'Otro';
    default:
      return code;
  }
}

function getNormalizedErrorMessage(error: unknown): string {
  if (error instanceof GraphQLException || error instanceof Error) {
    return error.message.trim().toLowerCase();
  }

  return '';
}

export function resolveCommunityReportErrorAlert(
  error: unknown,
  contentLabel: 'publicación' | 'comentario' | 'post' | 'comment',
  tx?: CommunityTranslate,
): AppAlertConfig | null {
  const message = getNormalizedErrorMessage(error);
  const normalizedContent = contentLabel === 'comment' || contentLabel === 'comentario'
    ? 'comment'
    : 'post';
  const resolvedContentLabel = tx
    ? tx(
        `reportErrors.content.${normalizedContent}`,
        normalizedContent === 'post' ? 'publicacion' : 'comentario',
      )
    : contentLabel;

  if (!message) {
    return null;
  }

  if (message.includes('already reported')) {
    return {
      title: tx
        ? tx('reportErrors.alreadyReportedTitle', 'Reporte ya enviado')
        : 'Reporte ya enviado',
      message: tx
        ? tx('reportErrors.alreadyReportedMessage', 'Ya habias enviado un reporte para esta {{content}}.', {
            content: resolvedContentLabel,
          })
        : `Ya habías enviado un reporte para este ${resolvedContentLabel}.`,
      tone: 'info',
    };
  }

  if (message.includes('cannot report')) {
    return {
      title: tx
        ? tx('reportErrors.cannotReportTitle', 'No puedes reportar este contenido')
        : 'No puedes reportar este contenido',
      message: tx
        ? tx('reportErrors.cannotReportMessage', 'Esta {{content}} ya no admite reportes desde tu cuenta.', {
            content: resolvedContentLabel,
          })
        : `Este ${resolvedContentLabel} ya no admite reportes desde tu cuenta.`,
      tone: 'warning',
    };
  }

  return null;
}