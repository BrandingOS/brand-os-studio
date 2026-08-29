/**
 * What a family says about its own variants — without touching the shared
 * dispatch or the template list.
 *
 * Template IDS are persistence keys and never change. Curation sits beside
 * them: a design that is culled is `archived` (its id stays reserved, its
 * saved customizations stay readable), every kept design gets a `name` a
 * designer would give it, and `tags` feed the drilldown's filter chips.
 * Each family owns its own curation file; `curation/index.ts` aggregates.
 */
export type FamilyCuration = {
  /** Human names by template id. Absent = the template's own name. */
  names?: Record<string, string>;
  /** Template ids that no longer show anywhere (kept for persistence). */
  archived?: string[];
  /** Filter chips by template id (e.g. ['Minimal', 'Bold']). */
  tags?: Record<string, string[]>;
};

export const EMPTY_CURATION: FamilyCuration = {};
