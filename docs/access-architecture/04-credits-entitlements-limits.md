# Access Architecture — 04 · Credits · Entitlements · Limits

_Five questions, five systems, one order of evaluation. Authorization is "may you";
entitlement is "does your plan include it"; quota is "how much"; credit is "can you pay";
rate limit is "not so fast"._

## 1. What is preserved (migration 025 is good)

`credit_accounts`, `credit_ledger`, and the RPCs `reserve_credits` / `settle_credits` /
`release_credits` / `grant_credits` / `ensure_credit_account` stay, byte-for-byte in
semantics: integer BIGINT credits, **1 credit = USD 0.01**, one guarded atomic UPDATE for a
reservation, settlement clamped to the reservation, ledger idempotency by
`(workspace_id, idempotency_key)`. The image job pipeline keeps calling them.

## 2. What is added

### 2.1 `credit_reservations` — a hold is a row, so it can expire
Today a hold exists only as `reserved_credits += n` plus a ledger line; a crashed function
holds money forever. New table:

```
credit_reservations(
  id uuid pk, workspace_id, brand_id, user_id, purpose text ('image'|'text'|…),
  amount bigint > 0, status ('held'|'settled'|'released'|'expired'),
  idempotency_key text unique per workspace, ref_kind text, ref_id text,
  expires_at timestamptz not null, created_at, resolved_at)
```
`reserve_credits(_workspace_id, _job_id, _amount, _idem_key, _ttl, _purpose, _brand_id,
_user_id, _ref_kind, _ref_id)` inserts it (status `held`); the new arguments default so the
unchanged image function keeps working and the row is filled from the job; text AI passes
them explicitly. `settle_credits` / `release_credits` first run
`UPDATE credit_reservations SET status=… WHERE … AND status='held' RETURNING id` and touch
`credit_accounts` **only if that row transition won**; the reaper uses the symmetric guarded
UPDATE, so whichever writer transitions the row first is authoritative and the other skips
the balance mutation. A pg_cron job
`expire_stale_reservations()` every minute releases `held` rows past `expires_at` with
idempotency key `release:<id>:expired` and writes an audit event. If a late settle arrives
for an expired reservation, `settle_credits` finds status `expired`, charges nothing, and
returns `{ok:false, error:'reservation_expired'}`. **The job follows the reservation:** on
that answer the function marks the job `failed` with `error_code = reservation_expired`,
deletes any outputs it stored, and writes an `ai_usage_events` row with
`status = 'expired_unbilled'` carrying the provider cost — so the loss is visible in
telemetry and the customer never receives work we could not bill. TTL is never a flat
default: every metered path sets `ttl = provider deadline + 60 s` (images 170 + 60 = 230 s,
text 120 + 60 = 180 s), so expiry can only precede settlement after a genuine hang.

### 2.2 `ai_usage_events` — immutable telemetry, one row per paid call
```
(id, workspace_id, brand_id, user_id, reservation_id, job_id?,
 provider, model, operation, input_tokens, output_tokens, image_count, image_size,
 provider_cost_usd numeric(12,6), credits_charged bigint, pricing_version text,
 pricing_snapshot jsonb, latency_ms, status ('succeeded'|'failed'|'cancelled'), created_at)
```
Written by the server at settlement for images (alongside the job row, which stays) and for
every metered text call. "Who is consuming credits" on the Usage page is a query over this.
Provider economics (`provider_cost_usd`) are admin-only columns — the Usage page shows credits.

### 2.3 Reconciliation
`reconcile_credit_account(ws)` asserts `balance_credits = lifetime_granted − lifetime_spent −
reserved_credits` and `= sum(ledger.amount)`; nightly cron flags mismatches into
`audit_events(action='credits.reconcile_mismatch')`. Every balance is explainable by the ledger.

### 2.4 Text AI is metered (owner decision #5)
`anthropic-proxy` and `ai-apply-command` **require a user JWT unconditionally** — a request
without a valid `Authorization` header is refused, never downgraded to the anon path (a
signed-in client that simply omits the header must not get free calls). Their five call
sites are all signed-in product features. Only `generate-description` and
`fetch-url-preview` remain anon-capable, on the session/IP limiter, with no wallet. Flow:
`requireCaller` →
resolve workspace (from `brandId` when present, else the caller's current workspace passed as
`workspaceId` and **verified via membership**) → `has_capability('ai.generate', ws, brand)` →
reserve `estimate = ceil(max_tokens × rate)` → call → settle on actual `usage` →
`ai_usage_events`. Pricing rules for text models join `_shared/pricing.ts` under the same
`PRICING_VERSION`. Text calls run under a 120 s provider deadline; their reservation TTL is
deadline + 60 s.

### 2.5 Per-member monthly cap
`workspace_members.credits_monthly_cap` (NULL = none). `reserve_credits` sums this month's
`credit_reservations.amount` for `(workspace, user)` with status ≠ released/expired and refuses
with `member_credit_cap_reached` when the new hold would exceed the cap. Set from the member
sheet ("Monthly AI limit"); the Usage page shows each person's spend against it.

## 3. Plans and entitlements (owner decision #4)

Existing: `subscriptions.plan ∈ free|pro|agency` (Stripe-driven), `PLAN_LIMITS` constant in
`_shared/plan-limits.ts`. Replace the constant with data:

```
plan_entitlements(plan_key text, key text, value bigint, primary key (plan_key, key))
workspace_entitlement_overrides(workspace_id, key, value, reason, set_by, created_at)
```
Seeded keys (−1 = unlimited; booleans as 0/1):

| key | free | pro | agency |
|---|---|---|---|
| `workspaces.owned` | 1 | 3 | 10 |
| `brands` | 2 | 10 | −1 |
| `seats` (owner+admin+member, active + pending) | 1 | 5 | 25 |
| `guest_seats` | 0 | 5 | 50 |
| `storage_mb` | 500 | 10 000 | 100 000 |
| `credits.monthly` | 0 | 2 000 | 10 000 |
| `credits.signup_grant` | 500 | — | — |
| `ai.models.premium` | 0 | 1 | 1 |
| `share_links` | 3 | −1 | −1 |
| `exports_month` | 20 | −1 | −1 |
| `audit.retention_days` | 30 | 180 | 400 |
| `advanced_access` (generic override editor — deferred; named switches are on every plan) | 0 | 1 | 1 |

Numbers are placeholders the owner can change with an UPDATE — no schema change per
repackaging. `entitlement(ws, key)` = override ?? plan value ?? free value. Enforced in the
same place the action happens: `brands.create` RPC checks `brands`; `create_invitation`
checks `seats`/`guest_seats`; upload path checks `storage_mb` (sum of `assets.size`);
`ai-generate-image` checks `ai.models.premium` before pricing. The owned-workspace cap closes
the unlimited-free-credit hole; signup grant stays 500 once per **user's personal
workspace only** (`ensure_credit_account` grants only when `is_personal`).

Monthly credits: `stripe-webhook` on `invoice.paid` calls `grant_credits(ws,
plan.credits.monthly, 'plan-grant', 'plan-grant:<ws>:<period_start>')` — idempotent by key,
so webhook retries cannot double-grant. Downgrade never claws back a balance.

## 4. Limits taxonomy and semantic reasons

| kind | behaviour | example reason |
|---|---|---|
| HARD | blocked | `brand_limit_reached`, `seat_limit_reached`, `guest_seat_limit_reached`, `workspace_limit_reached`, `storage_limit_reached` |
| SOFT | warning at 80 %, banner | same keys with `_warning` from the client, computed from `check_limit` |
| RATE | 429 with `retry_after` | `rate_limited` |
| CREDIT | 402 | `insufficient_credits` (+ `required`, `balance`), `member_credit_cap_reached` (+ `cap`, `used`) |
| ENTITLEMENT | 403 | `feature_not_in_plan` (+ `feature`) |
| AUTHZ | 403 / 404-shaped | `permission_denied`, `brand_access_denied`, `not_authenticated` |
| CONCURRENCY | 409 | `conflict` (+ `currentVersion`, `updatedBy`) |

One TS type `AccessDenialReason` (`src/shared/access/reasons.ts`) mirrors the SQL enum-like
text; Edge Functions return `{ error: reason, ...details }`; the client maps reason → message
in one place (`reasonMessage(reason, details)`). "Upgrade" appears only for
`feature_not_in_plan` and the HARD plan limits.

## 5. Rate limiting fixes
`ai_rate_limits` stays. The bucket key becomes `user_id` whenever a JWT is present
(`session_id` only for anon onboarding), so a signed-in caller can no longer rotate the
key. Per-workspace concurrency for images stays at 6; text AI gets 20/min/user.

## 6. The AI request, end to end (the order the brief asks for)
```
1 authenticated?                requireCaller
2 member of workspace?          has_capability(…) step 2
3 can reach this brand?         step 5–7
4 ai.generate?                  step 8
5 plan allows model?            entitlement(ws,'ai.models.premium')
6 within limits?                rate limit (user), concurrency (workspace)
7 enough credit?  8 reserve     reserve_credits (atomic; row in credit_reservations)
9 run provider                  under deadline
10 actual usage                 provider usage or server re-price — never the client
11 settle  12 release diff      settle_credits (clamped) / release on any throw
13 immutable usage event        ai_usage_events
```
Idempotency: caller-supplied key per job (existing), reservation key derived from it,
settle/release keys derived from the job id. Retries return the original job. Concurrent
reservations cannot overspend (guarded UPDATE). Both are pinned by the concurrency tests in 09.
