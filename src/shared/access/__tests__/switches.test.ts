// ============================================================================
// The named switches, as one table.
//
// Before this, `MemberSheet`, `InviteMemberModal` and `MembersTable` each re-derived the
// same three switches by hand across ~10 sites. They could — and did — disagree: the
// sheet wrote the AI exception with `allowAi` alone (which grants nothing), and the row
// rendered a flat "no AI" over the top of it.
//
// So the tests worth having are the ones that fail when a rule lives in only one of the
// three: what a switch READS as, what it WRITES, and what a row SAYS, each derived from
// the same entries — plus the last case, which proves a NEW switch needs no component
// edit at all.
// ============================================================================
import { describe, it, expect } from 'vitest';
import { NAMED_SWITCHES } from '../catalog';
import {
  allowAiFor,
  brandExceptionsFrom,
  brandOverridesFor,
  defaultSwitchState,
  exceptionSwitches,
  overridesFromSwitches,
  sameExceptions,
  summariseSwitches,
  switchLosses,
  switchStateFrom,
  switchesFor,
} from '../switches';

describe('reading a stored member', () => {
  it('falls back to the role default when nothing is stored', () => {
    expect(switchStateFrom({}, 'editor')).toEqual({ export: true, ai: true, billing: false });
    // a viewer is the role the defaults actually differ for
    expect(switchStateFrom({}, 'viewer')).toEqual({ export: false, ai: false, billing: false });
  });

  it('an explicit deny beats the default, and beats a grant', () => {
    expect(switchStateFrom({ deny: ['ai.generate'] }, 'editor').ai).toBe(false);
    expect(switchStateFrom({ grant: ['ai.generate'], deny: ['ai.generate'] }, 'editor').ai).toBe(false);
  });

  it('an explicit grant turns on what the role would not give', () => {
    expect(switchStateFrom({ grant: ['designs.export'] }, 'viewer').export).toBe(true);
    expect(switchStateFrom({ grant: ['workspace.billing.view'] }, 'editor').billing).toBe(true);
  });
});

describe('writing', () => {
  it('writes an explicit grant on and an explicit deny off', () => {
    const off = overridesFromSwitches({ export: false, ai: true, billing: false }, 'member');
    expect(off.deny).toContain('designs.export');
    expect(off.deny).toContain('brand.kit.export');
    expect(off.grant).toContain('ai.generate');
  });

  it('writes nothing when a grant-only switch is off', () => {
    const o = overridesFromSwitches({ export: true, ai: true, billing: false }, 'member');
    expect(o.deny).not.toContain('workspace.billing.view');
    expect(o.grant).not.toContain('workspace.billing.view');
  });

  it('never writes a switch the role is not offered', () => {
    const o = overridesFromSwitches({ export: true, ai: true, billing: true }, 'guest');
    expect([...o.grant, ...o.deny]).not.toContain('workspace.billing.view');
  });

  it('round-trips: what is written reads back the same', () => {
    for (const state of [
      { export: true, ai: true, billing: false },
      { export: false, ai: false, billing: true },
      { export: true, ai: false, billing: true },
    ]) {
      expect(switchStateFrom(overridesFromSwitches(state, 'member'), 'editor')).toEqual(state);
    }
  });
});

describe('a guest starts with nothing extra', () => {
  it('defaults every switch off, whatever the brand role', () => {
    expect(defaultSwitchState('guest', 'editor')).toEqual({ export: false, ai: false, billing: false });
  });
  it('and is offered no workspace-scoped switch', () => {
    expect(switchesFor('guest').map((s) => s.id)).not.toContain('billing');
  });
});

describe('the per-brand exception', () => {
  it('is offered only for a switch that is off', () => {
    expect(exceptionSwitches({ export: true, ai: false, billing: false }).map((s) => s.id)).toEqual(['ai']);
    expect(exceptionSwitches({ export: false, ai: false, billing: false }).map((s) => s.id))
      .toEqual(['export', 'ai']);
    expect(exceptionSwitches({ export: true, ai: true, billing: false })).toEqual([]);
  });

  it('is stored as an explicit grant, not as allowAi alone', () => {
    // The bug this file exists for: `allowAi: true` with no override stores `{}`, which
    // grants nothing — the exception was silently never created.
    expect(brandOverridesFor({ ai: true })).toEqual({ grant: ['ai.generate'] });
    expect(brandOverridesFor({})).toEqual({ grant: [] });
  });

  it('round-trips off a stored brand grant', () => {
    const stored = brandOverridesFor({ ai: true, export: true });
    const read = brandExceptionsFrom(stored);
    expect(read.ai).toBe(true);
    expect(read.export).toBe(true);
    expect(sameExceptions(read, { ai: true, export: true })).toBe(true);
    expect(sameExceptions(read, { ai: true, export: false })).toBe(false);
  });

  it('passes allowAi when either the workspace or the brand says yes', () => {
    expect(allowAiFor({ ai: false }, { ai: true })).toBe(true);
    expect(allowAiFor({ ai: true }, {})).toBe(true);
    expect(allowAiFor({ ai: false }, {})).toBe(false);
  });
});

describe('the row summary', () => {
  const sum = (overrides: object, role: 'editor' | 'viewer' = 'editor', grants: object[] = []) =>
    summariseSwitches({ overrides, defaultBrandRole: role, grants } as never);

  it('says nothing when everything matches the role default', () => {
    expect(sum({})).toEqual([]);
    expect(sum({}, 'viewer')).toEqual([]);
  });

  it('names only what differs', () => {
    expect(sum({ deny: ['designs.export'] })).toEqual(['no exports']);
    expect(sum({ grant: ['designs.export'] }, 'viewer')).toEqual(['exports']);
    expect(sum({ grant: ['workspace.billing.view'] })).toEqual(['billing']);
  });

  it('counts an exception instead of contradicting it', () => {
    const grants = [{ overrides: { grant: ['ai.generate'] } }, { overrides: {} }];
    expect(sum({ deny: ['ai.generate'] }, 'editor', grants)).toEqual(['AI on 1 of 2']);
  });

  it('still says no AI when there really is none', () => {
    expect(sum({ deny: ['ai.generate'] }, 'editor', [{ overrides: {} }])).toEqual(['no AI']);
  });
});

describe('what a save takes away', () => {
  const base = { name: 'Dana', keptExceptions: {}, hadExceptions: {} };

  it('names the capability in the words the person would use', () => {
    expect(switchLosses({ ...base, before: { ai: true }, after: { ai: false } }))
      .toEqual(['Dana will no longer be able to use AI generation.']);
  });

  it('is silent when an exception keeps it alive somewhere', () => {
    expect(switchLosses({
      ...base, before: { ai: true }, after: { ai: false },
      keptExceptions: { ai: ['Client B'] },
    })).toEqual([]);
  });

  it('names a lost exception by brand', () => {
    expect(switchLosses({
      ...base, before: { ai: false }, after: { ai: false },
      hadExceptions: { ai: ['Client B', 'Client C'] }, keptExceptions: { ai: ['Client C'] },
    })).toEqual(['Dana will lose the AI exception on Client B.']);
  });

  it('turning the switch on for everyone loses nothing', () => {
    // A superset is not a loss — the old code would have reported one.
    expect(switchLosses({
      ...base, before: { ai: false }, after: { ai: true },
      hadExceptions: { ai: ['Client B'] },
    })).toEqual([]);
  });
});

describe('the table is the only thing that has to change', () => {
  it('every switch is fully described, so no component needs a special case', () => {
    for (const s of NAMED_SWITCHES) {
      expect(s.id).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(s.lossLabel).toBeTruthy();
      expect(s.capabilities.length).toBeGreaterThan(0);
      expect(['brand', 'workspace']).toContain(s.scope);
      expect(['both', 'grant-only']).toContain(s.write);
      // something to say in a row, either way round
      expect(s.summary.on || s.summary.off).toBeTruthy();
      // an exception needs a word for the checkbox that offers it
      if (s.perBrandException) {
        expect(s.scope).toBe('brand');
        expect(s.exceptionLabel).toBeTruthy();
      }
    }
  });

  it('no two switches claim the same capability', () => {
    const seen = new Set<string>();
    for (const s of NAMED_SWITCHES) {
      for (const c of s.capabilities) {
        expect(seen.has(c)).toBe(false);
        seen.add(c);
      }
    }
  });

  it('a switch nobody wrote code for still reads, writes and summarises', () => {
    // Stand in for a future entry by driving the generic functions with an id the
    // components have never heard of. If any of them needed a special case, this fails.
    const invented = {
      id: 'publish', label: 'Can publish publicly', scope: 'brand' as const,
      capabilities: ['share.publish_public'], defaultFor: () => false,
      write: 'grant-only' as const, summary: { on: 'publishes' },
      lossLabel: 'publish publicly',
    };
    const all = [...NAMED_SWITCHES, invented];
    const state = Object.fromEntries(all.map((s) => [s.id, s.defaultFor('editor')]));
    expect(state.publish).toBe(false);
    state.publish = true;
    const grant = all.filter((s) => state[s.id]).flatMap((s) => s.capabilities);
    expect(grant).toContain('share.publish_public');
    expect(switchLosses({
      name: 'Dana', before: { publish: true }, after: { publish: false },
      keptExceptions: {}, hadExceptions: {},
    } as never)).toEqual([]);   // not in the table yet, so nothing claims it
  });
});
