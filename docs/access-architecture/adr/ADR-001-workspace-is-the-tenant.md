# ADR-001 · Workspace is the tenant; no Organization/Company/Team layer

**Status:** accepted 2026-08-29

**Context.** The brief asked whether a Company/Organization layer above Workspace is needed.
Reconnaissance (01 §1.2) shows `workspaces` already anchors `subscriptions`, `invoices`,
`usage_tracking`, `credit_accounts`, `credit_ledger`, `workspace_members` and (nullable)
`brands.workspace_id`. Every billing and membership fact in the system is keyed by it.

**Decision.** One tenant concept: `workspaces`. A workspace can be a person, a company, an
agency or a team; `is_personal` distinguishes only the auto-created one. Agencies managing
many clients use one workspace with many brands and per-brand access — the case the brief
describes — rather than a workspace per client.

**Consequences.** No new join layer; every RLS predicate resolves in one membership lookup.
If a future customer needs "one company, several billing workspaces" that is a *billing
group*, addable as `workspaces.parent_billing_workspace_id` without touching access.
