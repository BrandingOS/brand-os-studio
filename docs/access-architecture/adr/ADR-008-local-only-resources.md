# ADR-008 · Local-only resources are out of scope for server authorization (this phase)

**Status:** accepted 2026-08-29

**Context.** Guideline documents, kit customisations, branding checkpoints, comments,
approvals, content templates, bento, blocks, decks live in localStorage/IndexedDB
(01 §4.3). They cannot be isolated by RLS because they are not on the server.

**Decision.** This initiative authorizes everything server-backed and leaves local-only
resources as per-device data, with a visible notice on the Guideline builder when the brand
has other members. Moving each to a table is listed as the next phase, in order of user
value: guideline docs → kit customisations → comments/approvals → the rest. The capability
ids for them (`brand.guideline.edit`, `comments.create`, `approvals.review`) exist now so
the UI and the future policies share a name.
