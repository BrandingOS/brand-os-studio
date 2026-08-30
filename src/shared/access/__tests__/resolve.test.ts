// ============================================================================
// The TypeScript resolver against the SAME truth table the SQL resolver is tested with
// (supabase/tests/fixtures/access-cases.json, 869 cells). Two implementations, one file
// of expectations: that is the only thing that keeps a client-side permission model
// honest, because a UI that disagrees with RLS either hides what people may do or offers
// what they may not.
// ============================================================================
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { effectiveCapabilities, type BrandRef, type Membership } from '../resolve';
import {
  BRAND_ROLE_CAPABILITIES,
  RESERVED_CAPABILITIES,
  WORKSPACE_ROLE_CAPABILITIES,
  overridableCapabilities,
} from '../catalog';

type Case = {
  actor: string;
  capability: string;
  workspace: string;
  brand: string | null;
  expected: boolean;
};

const CASES: Case[] = JSON.parse(
  readFileSync(join(process.cwd(), 'supabase/tests/fixtures/access-cases.json'), 'utf8'),
);

/** The fixture cast, exactly as supabase/tests/fixtures/access_fixture.sql inserts it. */
const MEMBERSHIPS: Record<string, Membership | null> = {
  alice: { workspaceId: 'A', role: 'owner', status: 'active', brandAccessMode: 'all' },
  adam: { workspaceId: 'A', role: 'admin', status: 'active', brandAccessMode: 'all' },
  emma: { workspaceId: 'A', role: 'member', status: 'active', brandAccessMode: 'all', defaultBrandRole: 'editor' },
  dana: {
    workspaceId: 'A', role: 'member', status: 'active', brandAccessMode: 'selected',
    defaultBrandRole: 'designer',
    grants: [
      { brandId: 'A1', role: 'designer' },
      { brandId: 'A2', role: 'designer', overrides: { deny: ['ai.generate'] } },
    ],
  },
  victor: { workspaceId: 'A', role: 'member', status: 'active', brandAccessMode: 'all', defaultBrandRole: 'viewer' },
  grace: {
    workspaceId: 'A', role: 'guest', status: 'active', brandAccessMode: 'selected',
    defaultBrandRole: 'viewer',
    grants: [{ brandId: 'A1', role: 'viewer', overrides: { grant: ['designs.export'] } }],
  },
  sam: { workspaceId: 'A', role: 'member', status: 'suspended', brandAccessMode: 'all', defaultBrandRole: 'editor' },
  bob: { workspaceId: 'B', role: 'owner', status: 'active', brandAccessMode: 'all' },
  rita: null,
  nina: {
    workspaceId: 'A', role: 'member', status: 'active', brandAccessMode: 'all',
    defaultBrandRole: 'editor',
    overrides: { deny: ['ai.generate', 'designs.export'] },
    grants: [{ brandId: 'A2', role: 'editor', overrides: { grant: ['ai.generate'] } }],
  },
};

const BRANDS: Record<string, BrandRef> = {
  A1: { id: 'A1', workspaceId: 'A' },
  A2: { id: 'A2', workspaceId: 'A' },
  A3: { id: 'A3', workspaceId: 'A', archived: true },
  B1: { id: 'B1', workspaceId: 'B' },
};

/** A membership only answers for its OWN workspace; asking about another yields nothing. */
function membershipIn(actor: string, workspace: string): Membership | null {
  const m = MEMBERSHIPS[actor];
  return m && m.workspaceId === workspace ? m : null;
}

describe('the TypeScript resolver matches the shared truth table', () => {
  it('has the whole table', () => {
    expect(CASES.length).toBeGreaterThan(800);
  });

  it('agrees on every cell', () => {
    const failures: string[] = [];
    for (const c of CASES) {
      const caps = effectiveCapabilities(
        membershipIn(c.actor, c.workspace),
        c.brand ? BRANDS[c.brand] : null,
      );
      const got = caps.has(c.capability);
      if (got !== c.expected) {
        failures.push(`${c.actor} ${c.capability} ${c.workspace}/${c.brand ?? '-'}: expected ${c.expected} got ${got}`);
      }
    }
    expect(failures.slice(0, 20).join('\n')).toBe('');
    expect(failures).toHaveLength(0);
  });
});

describe('the catalog matches the migration that seeds the database', () => {
  const migration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20260829030000_038_capabilities.sql'),
    'utf8',
  );

  // Every capability id contains a dot; the migration's monotonicity guard also holds
  // (scope, stronger, weaker) role tuples, which must not be read as seed rows.
  const seeded = new Set(
    [...migration.matchAll(/\('(workspace|brand)','([a-z]+)','([a-z_]+\.[a-z._]+)'\)/g)].map(
      (m) => `${m[1]}:${m[2]}:${m[3]}`,
    ),
  );

  it('seeds the same workspace matrix', () => {
    for (const [role, caps] of Object.entries(WORKSPACE_ROLE_CAPABILITIES)) {
      for (const cap of caps) {
        expect(seeded.has(`workspace:${role}:${cap}`), `${role} → ${cap} missing from 038`).toBe(true);
      }
    }
  });

  it('seeds the same brand matrix', () => {
    for (const [role, caps] of Object.entries(BRAND_ROLE_CAPABILITIES)) {
      for (const cap of caps) {
        expect(seeded.has(`brand:${role}:${cap}`), `${role} → ${cap} missing from 038`).toBe(true);
      }
    }
  });

  it('has no capability in the database the catalog does not know', () => {
    const known = new Set<string>();
    for (const [role, caps] of Object.entries(WORKSPACE_ROLE_CAPABILITIES)) {
      for (const c of caps) known.add(`workspace:${role}:${c}`);
    }
    for (const [role, caps] of Object.entries(BRAND_ROLE_CAPABILITIES)) {
      for (const c of caps) known.add(`brand:${role}:${c}`);
    }
    for (const s of seeded) {
      expect(known.has(s), `${s} is seeded but the catalog does not list it`).toBe(true);
    }
  });

  it('agrees on which capabilities are reserved', () => {
    for (const r of RESERVED_CAPABILITIES) {
      expect(migration).toContain(`'${r}'`);
    }
  });

  it('agrees on the overridable sets', () => {
    for (const cap of overridableCapabilities('workspace', 'member')) {
      expect(migration).toContain(`'${cap}'`);
    }
    for (const cap of overridableCapabilities('brand', 'editor')) {
      expect(migration).toContain(`'${cap}'`);
    }
    // owner and admin take no overrides, in both implementations
    expect(overridableCapabilities('workspace', 'owner')).toHaveLength(0);
    expect(overridableCapabilities('workspace', 'admin')).toHaveLength(0);
  });
});

describe('the rules that are easy to get subtly wrong', () => {
  it('a workspace-level deny survives the brand role preset', () => {
    // The named switches ("Can use AI generation", "Can download and export") are stored
    // at workspace scope for an `all`-mode member. The brand preset re-added both, so
    // unchecking them was a silent no-op for every role above viewer. (Pass C, F1.)
    const caps = effectiveCapabilities(MEMBERSHIPS.nina, BRANDS.A1);
    expect(caps.has('designs.edit')).toBe(true);      // her role is untouched
    expect(caps.has('ai.generate')).toBe(false);      // the switch actually holds
    expect(caps.has('designs.export')).toBe(false);
  });

  it('a per-brand grant out-ranks a workspace-level deny', () => {
    expect(effectiveCapabilities(MEMBERSHIPS.nina, BRANDS.A2).has('ai.generate')).toBe(true);
  });

  it('a per-brand deny beats a workspace-wide grant', () => {
    const m: Membership = {
      workspaceId: 'A', role: 'member', status: 'active', brandAccessMode: 'all',
      defaultBrandRole: 'designer',
      overrides: { grant: ['ai.generate'] },
      grants: [{ brandId: 'A2', role: 'designer', overrides: { deny: ['ai.generate'] } }],
    };
    expect(effectiveCapabilities(m, BRANDS.A1).has('ai.generate')).toBe(true);
    expect(effectiveCapabilities(m, BRANDS.A2).has('ai.generate')).toBe(false);
  });

  it('an archived brand is read-only for everyone, and only a manager keeps the key', () => {
    const owner = effectiveCapabilities(MEMBERSHIPS.alice, BRANDS.A3);
    expect(owner.has('brand.view')).toBe(true);
    expect(owner.has('brand.archive')).toBe(true);
    expect(owner.has('brand.setup.edit')).toBe(false);
    expect(owner.has('designs.edit')).toBe(false);

    const viewer = effectiveCapabilities(MEMBERSHIPS.victor, BRANDS.A3);
    expect(viewer.has('brand.view')).toBe(true);
    expect(viewer.has('brand.archive')).toBe(false);
  });

  it('a brand in another workspace resolves to nothing at all', () => {
    expect(effectiveCapabilities(MEMBERSHIPS.alice, BRANDS.B1).size).toBe(0);
  });

  it('a suspended member is treated as absent', () => {
    expect(effectiveCapabilities(MEMBERSHIPS.sam, BRANDS.A1).size).toBe(0);
    expect(effectiveCapabilities(MEMBERSHIPS.sam).size).toBe(0);
  });

  it('a selected-brands member gets workspace capabilities but not an unnamed brand', () => {
    const caps = effectiveCapabilities(MEMBERSHIPS.dana, BRANDS.A3);
    expect(caps.has('brands.list')).toBe(true);
    expect(caps.has('brand.view')).toBe(false);
  });

  it('a guest never submits to the community catalogue, however they are granted', () => {
    const m: Membership = {
      workspaceId: 'A', role: 'guest', status: 'active', brandAccessMode: 'selected',
      grants: [{ brandId: 'A1', role: 'manager' }],
    };
    expect(effectiveCapabilities(m, BRANDS.A1).has('templates.submit_community')).toBe(false);
    expect(effectiveCapabilities(m, BRANDS.A1).has('brand.settings.edit')).toBe(true);
  });

  it('reserved capabilities are false even for an owner', () => {
    const caps = effectiveCapabilities(MEMBERSHIPS.alice, BRANDS.A1);
    for (const r of RESERVED_CAPABILITIES) expect(caps.has(r)).toBe(false);
  });
});
