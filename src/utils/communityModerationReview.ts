import type { ModerationCase } from '../types/community';

type CommunityTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

const REVIEW_REASON_CODES = [
  'spam_repetitive',
  'service_promotion',
  'blocked_links',
  'sensitive_content',
  'media_needs_review',
] as const;

type ReviewReasonCode = typeof REVIEW_REASON_CODES[number];

export const REVIEW_REASON_OPTIONS: ReadonlyArray<{ code: ReviewReasonCode; label: string }> = REVIEW_REASON_CODES.map((code) => ({
  code,
  label: formatReasonCode(code),
}));

export const getReviewReasonOptions = (tx?: CommunityTranslate) => REVIEW_REASON_CODES.map((code) => ({
  code,
  label: formatReasonCode(code, tx),
}));

export const formatHumanLabel = (value: string): string => value
  .replace(/_/g, ' ')
  .toLowerCase()
  .replace(/(^|\s)\S/g, (character) => character.toUpperCase());

export function formatReasonCode(value: string, tx?: CommunityTranslate): string {
  switch (value as ReviewReasonCode) {
    case 'spam_repetitive':
      return tx
        ? tx('groupDetail.review.reasons.spam_repetitive', 'Spam o publicacion repetitiva')
        : 'Spam o publicación repetitiva';
    case 'service_promotion':
      return tx
        ? tx('groupDetail.review.reasons.service_promotion', 'Promocion de servicios no permitida')
        : 'Promoción de servicios no permitida';
    case 'blocked_links':
      return tx
        ? tx('groupDetail.review.reasons.blocked_links', 'Enlaces o dominios no permitidos')
        : 'Enlaces o dominios no permitidos';
    case 'sensitive_content':
      return tx
        ? tx('groupDetail.review.reasons.sensitive_content', 'Contenido sensible o inapropiado')
        : 'Contenido sensible o inapropiado';
    case 'media_needs_review':
      return tx
        ? tx('groupDetail.review.reasons.media_needs_review', 'Media sin contexto suficiente')
        : 'Media sin contexto suficiente';
    default:
      return formatHumanLabel(value);
  }
}

export const formatSignalLabel = (value: string, tx?: CommunityTranslate): string => {
  const normalized = value.trim();

  if (!normalized) {
    return tx ? tx('groupDetail.review.signalFallback', 'Senal sin detalle') : 'Señal sin detalle';
  }

  return normalized.length > 34 ? `${normalized.slice(0, 31)}...` : normalized;
};

export const getCaseSignalChips = (item: ModerationCase, tx?: CommunityTranslate): string[] => {
  const seen = new Set<string>();

  return item.hits.reduce<string[]>((chips, hit) => {
    if (hit.source !== 'RULE_ENGINE' && hit.source !== 'AUTO_MODEL') {
      return chips;
    }

    const candidate = formatSignalLabel(hit.summary || formatHumanLabel(hit.ruleKey), tx);
    if (seen.has(candidate)) {
      return chips;
    }

    seen.add(candidate);
    chips.push(candidate);
    return chips;
  }, []);
};

export const getCaseReportReasonChips = (item: ModerationCase, tx?: CommunityTranslate): string[] => (
  item.reportSummary?.reasons.map((reason) => (
    tx
      ? tx('groupDetail.review.reportReasonChip', '{{reason}} · {{count}}', {
          reason: formatReasonCode(reason.reasonCode, tx),
          count: reason.count,
        })
      : `${formatReasonCode(reason.reasonCode)} · ${reason.count}`
  )) ?? []
);

export const getCaseVisibleSummary = (item: ModerationCase): string | null => (
  item.post?.moderationSummary ?? item.comment?.moderationSummary ?? item.summary ?? null
);

export const getCaseExcerpt = (item: ModerationCase, tx?: CommunityTranslate): string => {
  if (item.post?.text?.trim()) {
    return item.post.text;
  }

  if (item.comment?.text?.trim()) {
    return item.comment.text;
  }

  return tx ? tx('groupDetail.review.excerptFallback', 'Contenido sin texto visible') : 'Contenido sin texto visible';
};