# ADR-007 · Conflict detection by row version; no CRDT / realtime co-editing

**Status:** accepted 2026-08-29

**Context.** The design editor autosaves a JSON blob every 1.2 s; Setup autosaves diffs
every 400 ms; nothing checks versions (01 §4.3).

**Decision.** `version` + `updated_by` on brands/designs/brand_kit_state/workspaces with
checked-update RPCs; patch-merge retry for brands, explicit Reload / Save-a-copy for designs.
Presence avatars remain. No Yjs/Liveblocks: the editor's data model is not operation-based,
and no requirement here asks for simultaneous canvas editing.

**Consequences.** Silent overwrites become impossible for the four resources that hold the
brand's identity and work; the path to Level 4 later is an editor data-model change, which
this decision neither blocks nor pays for.
