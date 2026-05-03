import type { ModerationCase } from '../types/community';
import {
  formatHumanLabel,
  formatReasonCode,
  getCaseExcerpt,
  getCaseReportReasonChips,
  getCaseSignalChips,
  getCaseVisibleSummary,
} from './communityModerationReview';

const baseModerationCase: ModerationCase = {
  id: 'case-1',
  groupId: 'group-1',
  contentType: 'POST',
  status: 'OPEN',
  priority: 'MEDIUM',
  source: 'RULE_ENGINE',
  summary: 'Fallback summary',
  openedAt: '2026-04-09T12:00:00.000Z',
  authorName: 'Ada Lovelace',
  authorRole: 'MEMBER',
  authorAvatar: 'AL',
  authorColor: '#000000',
  hits: [],
};

describe('communityModerationReview helpers', () => {
  it('formats known and unknown reason codes for moderators', () => {
    expect(formatReasonCode('service_promotion')).toBe('Promoción de servicios no permitida');
    expect(formatHumanLabel('manual_review_needed')).toBe('Manual Review Needed');
  });

  it('builds unique signal chips and ignores non-rule sources', () => {
    const chips = getCaseSignalChips({
      ...baseModerationCase,
      hits: [
        {
          id: 'hit-1',
          ruleKey: 'contact-email-review',
          source: 'RULE_ENGINE',
          summary: 'Possible email address detected in post text',
          score: 70,
          payload: null,
          createdAt: '2026-04-09T12:00:00.000Z',
        },
        {
          id: 'hit-2',
          ruleKey: 'contact-email-review',
          source: 'RULE_ENGINE',
          summary: 'Possible email address detected in post text',
          score: 70,
          payload: null,
          createdAt: '2026-04-09T12:00:00.000Z',
        },
        {
          id: 'hit-3',
          ruleKey: 'report-spam',
          source: 'USER_REPORT',
          summary: 'Spam',
          score: null,
          payload: null,
          createdAt: '2026-04-09T12:00:00.000Z',
        },
      ],
    });

    expect(chips).toEqual(['Possible email address detected...']);
  });

  it('formats report chips and picks the visible summary from content first', () => {
    const moderationCase = {
      ...baseModerationCase,
      post: {
        id: 'post-1',
        authorAvatar: 'AL',
        authorColor: '#000000',
        authorName: 'Ada Lovelace',
        authorRole: 'MEMBER',
        text: 'Necesito ayuda con mi proceso',
        timestamp: 'ayer',
        likes: 0,
        comments: 0,
        moderationSummary: 'Resumen visible del post',
      },
      reportSummary: {
        totalCount: 3,
        reasons: [
          { reasonCode: 'service_promotion', count: 2 },
          { reasonCode: 'blocked_links', count: 1 },
        ],
      },
    } satisfies ModerationCase;

    expect(getCaseReportReasonChips(moderationCase)).toEqual([
      'Promoción de servicios no permitida · 2',
      'Enlaces o dominios no permitidos · 1',
    ]);
    expect(getCaseVisibleSummary(moderationCase)).toBe('Resumen visible del post');
    expect(getCaseExcerpt(moderationCase)).toBe('Necesito ayuda con mi proceso');
  });

  it('falls back to comment text and empty-content placeholder in case detail', () => {
    const commentCase = {
      ...baseModerationCase,
      contentType: 'COMMENT' as const,
      post: null,
      comment: {
        id: 'comment-1',
        authorAvatar: 'AL',
        authorColor: '#000000',
        authorName: 'Ada Lovelace',
        authorRole: 'MEMBER',
        text: 'Comentario pendiente',
        timestamp: 'ahora',
        likes: 0,
        moderationSummary: 'Resumen del comentario',
      },
    } satisfies ModerationCase;

    expect(getCaseVisibleSummary(commentCase)).toBe('Resumen del comentario');
    expect(getCaseExcerpt(commentCase)).toBe('Comentario pendiente');
    expect(getCaseExcerpt({ ...baseModerationCase, post: null, comment: null })).toBe(
      'Contenido sin texto visible',
    );
  });
});