# Security hardening — E6 AI boundary + Edge-Function findings (owner-coordinated)

Status of the final-hardening security items. The code-side, non-breaking parts are
DONE (this run); the items below need a coordinated Edge-Function deploy + env change
that would break live AI if shipped incrementally on the auto-deploying branch, so
they are prepared + tracked here, not force-activated.

## E6 — `VITE_ANTHROPIC_API_KEY` still in the browser bundle (P0)

**Reality (verified):** the editor moved to Edge Functions (`ai-apply-command`,
`ai-generate-image`), but 5 CURRENT features still call Anthropic **directly from the
browser** with the key in the bundle (each sets `anthropic-dangerous-direct-browser-access`
/ `dangerouslyAllowBrowser`):

1. `src/features/brand-consistency/providers/anthropicProvider.ts`
2. `src/features/logo-maker/components/AILogoSuggestions.tsx`
3. `src/shared/presentation/v2/ai/generateDeckFromScript.ts`
4. `src/features/ai/v5/providers/claudeProvider.ts` (Brand Assistant, app-wide)
5. `src/features/onboarding-v4/services/parseDescription.ts` (a secure server twin,
   `generate-description`, already exists — switch to it)

**Prepared:** a generic server proxy `supabase/functions/anthropic-proxy/index.ts`
(session-auth + rate-limit + server-only `ANTHROPIC_API_KEY`, mirrors ai-apply-command).
Callers build messages client-side and POST them; no key in the browser.

**Activation (atomic — do together so live AI never breaks):**
1. `supabase functions deploy anthropic-proxy` and set the function secret
   `ANTHROPIC_API_KEY` (server-side).
2. Rewire the 5 files above: replace the direct `fetch('https://api.anthropic.com/...')`
   / `@anthropic-ai/sdk` call with `supabase.functions.invoke('anthropic-proxy', { body:
   { sessionId, model, max_tokens, system, messages } })` and parse the returned Anthropic
   response identically. (For #5, just call `generate-description` instead of parseDescription.)
3. Remove every `VITE_ANTHROPIC_API_KEY` reference from `src/` and unset it from the
   build env so it is no longer inlined.
4. Verify each AI feature end-to-end, then delete the now-dead browser provider files.

Deleted already this run (dead browser-key references): `shared/services/aiService.ts`,
`guidelines/components/AIContentGenerator.tsx`.

## Edge-Function auth gaps (tracked)

- **`finalize-onboarding-assets`** — service-role storage `move()` from
  `onboarding-scratch/<sessionId>` → `brand-assets/<brandId>` with **no verified caller
  identity and no ownership check** on `brandId`. Exploit: a user could move their scratch
  assets into another brand's folder (write-only pollution; needs the target brand UUID).
  **Fix:** require the JWT (`getUser`) and verify `brands.user_id = auth.uid()` (or
  workspace membership) for `brandId` before the move. Not modified in-session (untestable
  Deno + onboarding critical path) — owner to apply + deploy.
- **`cleanup-onboarding-scratch`** — service-role storage delete, cron/idempotent, no
  in-code auth. Lower risk; confirm it's cron-only (not publicly invokable) or add a guard.
- **AI functions authenticate by `sessionId` (rate-limit bucket), not a verified JWT** —
  acceptable for pre-signup onboarding; consider JWT for post-signup editor AI.
- **`supabase/config.toml`** has no `[functions] verify_jwt` entries — confirm per-function
  JWT gating in the dashboard (can't be verified from the repo).

## Boundary / fixtures (code-side)

- **DONE:** `brandVision.ts` no longer defaults to `http://localhost:8300` in production
  (dev-only; skipped when unconfigured).
- **Tracked (low severity, RLS-backed):** `AdminPanel.tsx` does a direct
  `supabase.from('brands').delete()` (UI-layer DB write) — should move into an admin
  service. Admin-gated + RLS-enforced, so not exploitable; a boundary-cleanliness item.
- **Tracked:** client-side admin-email gating (`BrandNavbar.tsx`, `AdminSettings.tsx`) is
  defense-in-depth only — real authz is `is_super_admin` server-side/RLS.

## Confirmed IN PLACE (no action)
Migrations 011 (workspace escalation) + 012 (profiles visibility) present; RLS enabled on
every app-written table (`brands`, `assets`, `designs`, `guideline_presentations`).
