# ADR-006 · Brand archive is soft; brand delete stays hard

**Status:** accepted 2026-08-29

**Decision.** `brands.archived_at` gives the recoverable path (hidden, read-only for
managers, restorable). Delete remains a cascading hard delete behind `brands.delete`
(workspace admin+) with a confirmation naming counts, and an audit event with a summary.
A soft-deleted brand would add a filter to every brand-child policy and query for a
recovery path archive already provides. Workspace delete IS soft (30 days) because it is
rarer, larger, and owns the wallet.
