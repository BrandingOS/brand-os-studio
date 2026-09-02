// ============================================================================
// The named switches, read and written in ONE place.
//
// `NAMED_SWITCHES` in catalog.ts says what a switch IS. This says what it MEANS: how to
// read one off a member's stored overrides, what to write back, which brand may except
// it, and how a row summarises it. No component outside this file names a capability id,
// so adding a switch is one catalog entry and nothing else.
//
// Two rules the shape exists to keep:
//
//  • A switch that is OFF at the workspace and granted back on one brand is a real state
//    the server supports (the precedence rule in 03 §3), and it must round-trip. It did
//    not before: the sheet passed `allowAi: true` and NO override, which only suppresses
//    the deny the RPC would have added — it does not grant anything, so the exception was
//    silently not created. `brandOverridesFor` writes the grant explicitly.
//  • A summary names only what DIFFERS from the role's default. A row that lists every
//    capability is a row nobody reads.
// ============================================================================
import {
  NAMED_SWITCHES,
  type BrandRole,
  type NamedSwitch,
  type WorkspaceRole,
} from './catalog';

/** On/off per switch id. The UI holds exactly this, whatever the switches happen to be. */
export type SwitchState = Record<string, boolean>;

export type Overrides = { grant?: string[]; deny?: string[] };

export function switchById(id: string): NamedSwitch | undefined {
  return NAMED_SWITCHES.find((s) => s.id === id);
}

/** The switches offered to someone with this workspace role. */
export function switchesFor(role: WorkspaceRole): NamedSwitch[] {
  return NAMED_SWITCHES.filter((s) => !s.offeredFor || s.offeredFor.includes(role));
}

/** Where every switch starts for a new invitation at this role. */
export function defaultSwitchState(
  workspaceRole: WorkspaceRole,
  brandRole: BrandRole | null,
): SwitchState {
  const out: SwitchState = {};
  for (const s of NAMED_SWITCHES) {
    // A guest gets nothing extra unless someone deliberately says so — the same rule
    // `grant_brand_access` enforces server-side for AI.
    out[s.id] = workspaceRole === 'guest' ? false : s.defaultFor(brandRole);
  }
  return out;
}

/** How the switches read for someone already stored. */
export function switchStateFrom(
  overrides: Overrides | null | undefined,
  brandRole: BrandRole | null,
): SwitchState {
  const grant = new Set(overrides?.grant ?? []);
  const deny = new Set(overrides?.deny ?? []);
  const out: SwitchState = {};
  for (const s of NAMED_SWITCHES) {
    // An explicit deny wins, then an explicit grant, then the role's own default —
    // the same precedence the resolver applies.
    if (s.capabilities.some((c) => deny.has(c))) out[s.id] = false;
    else if (s.capabilities.some((c) => grant.has(c))) out[s.id] = true;
    else out[s.id] = s.defaultFor(brandRole);
  }
  return out;
}

/** What the switches write at the workspace level. */
export function overridesFromSwitches(
  state: SwitchState,
  workspaceRole: WorkspaceRole,
): { grant: string[]; deny: string[] } {
  const grant: string[] = [];
  const deny: string[] = [];
  for (const s of switchesFor(workspaceRole)) {
    if (state[s.id]) grant.push(...s.capabilities);
    else if (s.write === 'both') deny.push(...s.capabilities);
  }
  return { grant, deny };
}

/**
 * Switches a single brand may grant back. Only brand-scoped ones that say so, and only
 * while the workspace switch is off — an exception to something already granted is noise.
 */
export function exceptionSwitches(state: SwitchState): NamedSwitch[] {
  return NAMED_SWITCHES.filter((s) => s.perBrandException && s.scope === 'brand' && !state[s.id]);
}

/** Which exceptions a stored brand grant carries. */
export function brandExceptionsFrom(overrides: Overrides | null | undefined): SwitchState {
  const grant = new Set(overrides?.grant ?? []);
  const out: SwitchState = {};
  for (const s of NAMED_SWITCHES) {
    if (s.perBrandException) out[s.id] = s.capabilities.some((c) => grant.has(c));
  }
  return out;
}

/**
 * What to store on ONE brand grant. An exception is an explicit grant — passing the RPC's
 * `allowAi` alone stores nothing and grants nothing.
 */
export function brandOverridesFor(exceptions: SwitchState): { grant: string[] } {
  const grant: string[] = [];
  for (const s of NAMED_SWITCHES) {
    if (s.perBrandException && exceptions[s.id]) grant.push(...s.capabilities);
  }
  return { grant };
}

/** The RPC's guest-rule parameter, from whichever switch owns AI. */
export function allowAiFor(state: SwitchState, exceptions: SwitchState): boolean {
  return !!state.ai || !!exceptions.ai;
}

/** True when two brand grants would store the same exceptions. */
export function sameExceptions(a: SwitchState, b: SwitchState): boolean {
  return NAMED_SWITCHES.every((s) => !s.perBrandException || !!a[s.id] === !!b[s.id]);
}

export type SwitchSummaryInput = {
  overrides: Overrides | null | undefined;
  defaultBrandRole: BrandRole | null;
  /** Brand grants, so an exception can be counted rather than contradicted. */
  grants: { overrides?: Overrides }[];
};

/**
 * The words a row adds after "Designer · 2 brands". Only what differs from the role's
 * default, and an excepted switch is COUNTED rather than denied — a bare "no AI" is a lie
 * when one of those brands grants it back.
 */
export function summariseSwitches(input: SwitchSummaryInput): string[] {
  const state = switchStateFrom(input.overrides, input.defaultBrandRole);
  const notes: string[] = [];
  for (const s of NAMED_SWITCHES) {
    const on = state[s.id];
    if (on === s.defaultFor(input.defaultBrandRole)) continue;
    if (on) {
      if (s.summary.on) notes.push(s.summary.on);
      continue;
    }
    const excepted = s.perBrandException
      ? input.grants.filter((g) => s.capabilities.some((c) => (g.overrides?.grant ?? []).includes(c))).length
      : 0;
    if (excepted > 0 && s.summary.on) notes.push(`${s.summary.on} on ${excepted} of ${input.grants.length}`);
    else if (s.summary.off) notes.push(s.summary.off);
  }
  return notes;
}

/** What a save takes away, in the words the person losing it would use. */
export function switchLosses(args: {
  name: string;
  before: SwitchState;
  after: SwitchState;
  /** Brands keeping an exception after the save, per switch id. */
  keptExceptions: Record<string, string[]>;
  /** Brands that HAD an exception before, per switch id. */
  hadExceptions: Record<string, string[]>;
}): string[] {
  const out: string[] = [];
  for (const s of NAMED_SWITCHES) {
    const kept = args.keptExceptions[s.id] ?? [];
    if (args.before[s.id] && !args.after[s.id] && kept.length === 0) {
      out.push(`${args.name} will no longer be able to ${s.lossLabel}.`);
    }
    // Turning the switch ON for everyone loses no exception — it grants a superset.
    const lost = args.after[s.id]
      ? []
      : (args.hadExceptions[s.id] ?? []).filter((b) => !kept.includes(b));
    if (lost.length) {
      out.push(`${args.name} will lose the ${s.summary.on ?? s.id} exception on ${lost.join(', ')}.`);
    }
  }
  return out;
}
