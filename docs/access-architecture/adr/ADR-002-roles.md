# ADR-002 · Four workspace roles, four brand roles, guest is a role

**Status:** accepted 2026-08-29

**Context.** Existing enum `owner|admin|editor|exporter|viewer` conflates "what can you do to
the workspace" with "what can you do inside a brand"; `exporter` is unused by any policy.
The brief's candidate list (Owner, Admin, Brand Manager, Editor, Contributor, Viewer,
Billing, Guest) is too long to explain in an invite dialog.

**Decision.** Workspace: **Owner · Admin · Member · Guest**. Brand: **Manager · Editor ·
Designer · Viewer**. "Billing" is a capability override (`workspace.billing.*` on a Member),
not a role. "Contributor" is named **Designer** because that is who it is in this product:
someone who makes designs and uploads files but does not define the brand. Guest is a
workspace role rather than a flag because it changes what the workspace shows (no member
directory, no settings), not only which brands are visible; a flag would need the same
policy branches.

**Consequences.** Migration maps the old five to the new pairs (08 §1, 036) without loss of
access. The matrix in 03 has 8 columns, which fits one screen in the member detail sheet.
