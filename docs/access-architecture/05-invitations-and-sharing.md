# Access Architecture — 05 · Invitations · Share Links

## 1. Invitations

### 1.1 Table
```
workspace_invitations(
  id uuid pk,
  workspace_id uuid not null → workspaces cascade,
  email citext not null,                       -- normalised lower-case, citext extension
  role workspace_role_v2 not null,             -- owner is refused by CHECK: ownership is transferred, never invited
  brand_access_mode brand_access_mode not null,
  default_brand_role brand_role,
  brand_grants jsonb not null default '[]',    -- [{brandId, role, overrides?}] validated by trigger: every brandId ∈ this workspace
  capability_overrides jsonb not null default '{}',
  token_hash bytea not null unique,            -- sha256(raw token); raw token is never stored
  invited_by uuid not null,
  message text,
  status invitation_status not null default 'pending',   -- pending|accepted|revoked|expired
  expires_at timestamptz not null,             -- default now() + 7 days
  accepted_by uuid, accepted_at, revoked_by, revoked_at,
  created_at, updated_at)
unique (workspace_id, email) where status = 'pending'   -- one live invite per address per workspace
```
Same `guest ⇒ selected`, `admin ⇒ all` CHECKs as memberships, and the same override validator.

### 1.2 Lifecycle (all through SECURITY DEFINER RPCs; no client writes to the table)
| step | RPC / function | rules |
|---|---|---|
| invite | `create_invitation(ws, email, role, mode, default_role, brand_grants, overrides, message)` | caller `members.invite`; caller may not invite a role above their own (admin cannot invite owner — CHECK already; admin may invite admin); seat/guest-seat entitlement checked; if a **pending** invite exists for the address it is **replaced** (old row → revoked, new token) so "resend with different access" is one action; if the address is already an active member → `already_member`; returns `{ id, token }` — the raw token is returned exactly once to the inviter's session |
| deliver | Edge Function `workspace-invite` | authorizes with the same capability, calls the RPC, sends mail through Resend (`RESEND_API_KEY` secret) with `<origin>/invite/<token>`; if the key is absent the response still carries the link for copy — delivery is best-effort, the invite is durable |
| resend | `resend_invitation(id)` | rotates the token (old one dies), extends `expires_at`, same access |
| revoke | `revoke_invitation(id)` | `members.invite`; status → revoked; token dead |
| expire | status computed: `pending AND expires_at < now()` is treated as expired everywhere; a nightly job stamps it for tidiness |
| preview | `invitation_preview(token)` — callable by **anon** | returns `{ workspaceName, inviterName, role, brandCount, expiresAt }` ONLY when status = pending and not expired; every other case returns the same `invalid` shape (no distinction between never-existed / revoked / expired / accepted) — nothing to enumerate |
| accept | `accept_invitation(token)` — authenticated | caller's `auth.email()` must equal `email` (case-insensitive) → else `email_mismatch` (the page says "this invite was sent to s•••@x.com; sign in with that address"); membership + brand_access rows inserted in one transaction; existing membership → `already_member` (invite consumed, nothing changed); status → accepted; audit `member.joined` |
| edit before accept | there is no edit; revoke + invite again (replace semantics make this one click) |

New user path: `/invite/<token>` → preview → "Create account" pre-fills the email, and
`safeNext` returns to `/invite/<token>` after the OTP flow → accept. Existing user path:
sign in → accept. The raw token lives only in the URL; the page exchanges it immediately and
replaces history so it does not linger.

Token: 32 random bytes, base64url (43 chars), generated in SQL with `gen_random_bytes`,
returned once, stored as `sha256`. Single-purpose (one invitation), revocable, expiring,
consumed on accept, cannot escalate (validated against the same role/override ceilings the
member tables enforce).

## 2. Share links (owner decision #7)

Authenticated collaboration and public sharing are different grants. A share link is not a
membership, has no user, and can reach exactly one artifact.

### 2.1 Table
```
share_links(
  id uuid pk,
  workspace_id, brand_id (composite FK to brands(id, workspace_id)),
  target_kind share_target not null,   -- 'identity' | 'design' | 'showcase' | 'guideline'
  target_id text,                      -- publication token / design id / null for showcase
  token_hash bytea not null unique,
  allow_download boolean not null default false,
  password_hash text,                  -- optional, crypt()
  expires_at timestamptz,
  revoked_at timestamptz, revoked_by,
  created_by uuid not null, created_at,
  view_count bigint not null default 0, last_viewed_at)
```

### 2.2 Reads never go through table policies
Anon SELECT on `share_links` and on `brand_identity_publications` is **removed** (closing
gap 1.5-8). The only public read is `resolve_share_link(token, password?)` — SECURITY
DEFINER, returns the payload for that one target (the identity snapshot; the design
document; the showcase projection) plus `{ brandName, allowDownload }`, increments
`view_count`. Invalid / expired / revoked / wrong password all return the same `invalid`.
Password attempts are rate-limited by token hash in `ai_rate_limits` (reused as a generic
limiter table).

### 2.3 Coupling to brand visibility
`brands.is_public` stays as the "showcase is public" switch and becomes the guard for
`/brand/:slug/showcase` and `/p/:slug` (both routes today ignore or half-check it). A
trigger on `brands` `UPDATE OF is_public` to false **revokes** every active share link of
that brand (audit `share.revoked_all`). Archiving a brand does the same. Deleting cascades.

### 2.4 What the existing routes become
| route | after |
|---|---|
| `/i/:token` | token is now a share link (`target_kind='identity'`); `brand_identity_publications` keeps the snapshot; publishing creates the link |
| `/d/:brandSlug/:designSlug` | requires a share link token (`/d/<token>`); the slug form redirects to 404 |
| `/brand/:slug/showcase`, `/p/:slug` | gated on `is_public` server-side via `resolve_showcase(slug)` (anon RPC) |
| `/brand/:slug`, `/brand/:slug/bento/:id` | same `is_public` gate |

Entitlement `share_links` caps active links per workspace (Free: 3).

## 3. API tokens — documented extension point, not built
When needed: `api_tokens(id, workspace_id, created_by, name, token_hash, scopes text[],
expires_at, last_used_at, revoked_at)`; scopes are capability ids; a token's scopes are
validated against `effective_capabilities(created_by, ws)` at creation **and** at use (a
demoted creator's token shrinks with them); `has_capability` gains an actor abstraction
(`current_actor()` = JWT user | API token) so RLS and Edge Functions need no second path.
Nothing in the V1 schema blocks this; `audit_events.actor_kind` already has the slot.
