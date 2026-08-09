import { describe, it, expect } from 'vitest';
import type { CanonicalBrand } from '@/domain/brand';
import { canonicalToRow, rowToCanonical, type BrandRow } from '../brandRow';

function makeCanonical(overrides: Partial<CanonicalBrand> = {}): CanonicalBrand {
  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    identity: {
      colors: { primary: { hex: '#111111', name: 'Ink' }, secondary: { hex: '#222222' } },
      logos: { primary: { assetId: 'a1' }, iconmark: { assetId: 'a2' } },
      typography: {
        primary: { family: 'Inter', weights: [400, 700] },
        secondary: { family: 'Georgia' },
      },
      strategy: { values: ['clarity'], personality: ['bold'], aboutSections: [], mission: 'Ship' },
      voice: { personality: [], doList: ['be clear'], dontList: [], examples: [], tone: 'confident' },
    },
    isPublic: false,
    identitySchemaVersion: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  };
}

/** Wrap a write payload into a full row (as a DB SELECT would return). */
function asRow(c: CanonicalBrand): BrandRow {
  const w = canonicalToRow(c);
  return {
    id: c.id,
    slug: c.slug,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    ...w,
  };
}

describe('canonicalToRow / rowToCanonical — semantic round-trip', () => {
  it('round-trips the full identity by MEANING, not just shape', () => {
    const c = makeCanonical();
    const back = rowToCanonical(asRow(c));
    // Semantic equality of every identity subsystem.
    expect(back.identity.colors.primary.hex).toBe('#111111');
    expect(back.identity.colors.primary.name).toBe('Ink');
    expect(back.identity.colors.secondary?.hex).toBe('#222222');
    expect(back.identity.logos.primary?.assetId).toBe('a1');
    expect(back.identity.logos.iconmark?.assetId).toBe('a2');
    expect(back.identity.typography.primary.family).toBe('Inter');
    expect(back.identity.typography.primary.weights).toEqual([400, 700]);
    expect(back.identity.strategy.mission).toBe('Ship');
    expect(back.identity.voice.tone).toBe('confident');
    expect(back.identity.voice.doList).toEqual(['be clear']);
    expect(back.name).toBe('Acme');
    expect(back.identitySchemaVersion).toBe(1);
  });

  it('survives a JSON serialization round-trip (JSONB column simulation)', () => {
    const c = makeCanonical();
    const row = JSON.parse(JSON.stringify(asRow(c))) as BrandRow;
    const back = rowToCanonical(row);
    expect(back.identity.colors.primary.hex).toBe('#111111');
    expect(back.identity.typography.primary.weights).toEqual([400, 700]);
  });

  it('keeps legacy scalar columns in sync with the canonical values', () => {
    const c = makeCanonical();
    c.identity.strategy.targetAudience = 'founders';
    const w = canonicalToRow(c);
    expect(w.primary_color).toBe('#111111');
    expect(w.secondary_color).toBe('#222222');
    expect(w.fonts.primary).toBe('Inter');
    expect(w.tone).toBe('confident');
    expect(w.strategy).toBe('Ship');
    expect(w.audience).toBe('founders');
  });
});

describe('read precedence — stored identity beats legacy scalars (no stale overwrite)', () => {
  it('prefers the canonical identity over a divergent legacy scalar column', () => {
    // Row where the stored canonical says #111 but a legacy scalar says #999.
    const row: BrandRow = {
      id: 'b1',
      slug: 'acme',
      name: 'Acme',
      identity: { colors: { primary: { hex: '#111111' } }, logos: {}, typography: { primary: { family: 'Inter' } }, strategy: { values: [], personality: [], aboutSections: [] }, voice: { personality: [], doList: [], dontList: [], examples: [] } },
      identity_schema_version: 1,
      primary_color: '#999999', // stale legacy column — must NOT win
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    expect(rowToCanonical(row).identity.colors.primary.hex).toBe('#111111');
  });

  it('uses the stored identity even when the schema version is null (no silent discard)', () => {
    const row: BrandRow = {
      id: 'b1',
      slug: 'acme',
      name: 'Acme',
      identity: { colors: { primary: { hex: '#111111' } }, logos: {}, typography: { primary: { family: 'Inter' } }, strategy: { values: [], personality: [], aboutSections: [] }, voice: { personality: [], doList: [], dontList: [], examples: [] } },
      identity_schema_version: null, // present identity, missing version
      primary_color: '#999999',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    const c = rowToCanonical(row);
    expect(c.identity.colors.primary.hex).toBe('#111111'); // stored identity NOT discarded
    expect(c.identitySchemaVersion).toBe(1); // defaulted
  });

  it('falls back to legacy scalars only when there is no stored identity (pre-013 row)', () => {
    const row: BrandRow = {
      id: 'b2',
      slug: 'legacy',
      name: 'Legacy Co',
      identity: null,
      identity_schema_version: null,
      primary_color: '#abcdef',
      fonts: { primary: 'Georgia' },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    const c = rowToCanonical(row);
    expect(c.identity.colors.primary.hex).toBe('#abcdef');
    expect(c.identity.typography.primary.family).toBe('Georgia');
    expect(c.identitySchemaVersion).toBe(1); // stamped by fromLegacyBrand
  });
});
