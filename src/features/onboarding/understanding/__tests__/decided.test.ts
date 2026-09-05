import { describe, expect, it } from 'vitest';
import { confirmedPaths } from '../decided';
import { interpret } from '../interpret';
import { EVIDENCE } from '../../website/__tests__/fromWebsite.test';

const meta = (authority: 'suggested' | 'provisional' | 'confirmed' | 'official') => ({
  authority, provenance: 'user-entered' as const, setBy: 'u1', setAt: '2026-09-06T00:00:00.000Z',
});

describe('what the user has decided', () => {
  it('lists confirmed and official paths, never suggested or provisional ones', () => {
    const paths = confirmedPaths({
      identityMeta: { 'colors.primary': meta('confirmed'), 'voice.tone': meta('official'), 'strategy.mission': meta('suggested'), 'typography.primary': meta('provisional') },
    });
    expect(paths).toEqual(['colors.primary', 'voice.tone']);
  });

  it('a brand with no sidecar has decided nothing', () => {
    expect(confirmedPaths({})).toEqual([]);
    expect(confirmedPaths(null)).toEqual([]);
  });

  it('a decided path is never proposed, whatever the website says', async () => {
    const out = await interpret({ description: '', items: [], websiteEvidence: EVIDENCE, decided: ['colors.primary', 'typography.primary'] });
    expect(out.proposals.map((p) => p.corePath)).not.toContain('colors.primary');
    expect(out.proposals.map((p) => p.corePath)).not.toContain('typography.primary');
    expect(out.proposals.map((p) => p.corePath)).toContain('colors.secondary');
  });
});
