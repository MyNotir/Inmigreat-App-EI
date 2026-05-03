import { getCommunityModerationPresentation } from './communityModeration';

describe('getCommunityModerationPresentation', () => {
  it('returns the expected author-facing labels for moderation states', () => {
    expect(getCommunityModerationPresentation('APPROVED')?.label).toBe('Publicado');
    expect(getCommunityModerationPresentation('PENDING_REVIEW')?.label).toBe('En revisión');
    expect(getCommunityModerationPresentation('REJECTED')?.label).toBe('Rechazado');
    expect(getCommunityModerationPresentation('REMOVED')?.label).toBe('Oculto');
    expect(getCommunityModerationPresentation('ESCALATED')?.label).toBe('Escalado');
  });

  it('returns null for unknown moderation states', () => {
    expect(getCommunityModerationPresentation('UNKNOWN_STATE')).toBeNull();
    expect(getCommunityModerationPresentation(null)).toBeNull();
  });
});