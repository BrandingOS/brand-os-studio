# ADR-003 · Roles are presets; capabilities decide; overrides are bounded

**Status:** accepted 2026-08-29

**Decision.** Security decisions read capabilities only (`has_capability`). Roles map to
capability sets in a seeded table. Per-member and per-brand `capability_overrides` may grant
or deny capabilities **within a per-role overridable set** validated by trigger; role-bound
capabilities (members.manage, brand.settings.edit, share.manage, …) cannot be granted by
override — the user changes role instead. Saved custom roles are not built (owner decision
#6); they would be a `workspace_roles` table whose rows the same resolver reads as presets.

**Why bounded.** Unbounded overrides recreate "70 checkboxes" and make the matrix
unexplainable; bounded overrides cover every case the brief lists (viewer with exports,
designer without AI, member with billing view) with one extra sheet.
