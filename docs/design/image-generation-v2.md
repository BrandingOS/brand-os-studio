# Image Generation v2

_Last updated 2026-08-18. Supersedes the AI-image sections of
`docs/editor/PHASE_4_SPEC.md` and the "AI Studio" section of `CLAUDE.md`._

This phase covers **AI image generation only**. Editable-design generation,
artifact generation and the design editor are separate products that share the
brand model but not this pipeline. The seams for them are listed at the end.

---

## 1. Why this exists

The previous implementation worked, in the sense that images appeared. It also:

- required **no authenticated user** — the shipped anon key was enough to spend
  provider quota, and rate limits were keyed on a client-supplied `sessionId`
  that a user could reset by clearing localStorage;
- **fetched arbitrary caller-supplied URLs server-side** and returned the bytes
  (a read-SSRF);
- had **no idempotency**, so the 180-second client timeout meant a retry paid
  the vendor twice;
- stored results as **base64 data URIs inside the design document**, i.e. inside
  a Postgres JSONB column or localStorage, with an IndexedDB overflow when the
  browser quota blew;
- forwarded **raw provider error bodies** (org ids, billing thresholds) to the
  browser and rendered them verbatim;
- had **no cost accounting at all**: `MODEL_PRICING` covered Anthropic text
  models only, so every image row recorded `cost_estimate_usd = NULL`.

v2 moves every decision that costs money or leaks data to the server.

---

## 2. Architecture

```
Browser                                   Edge Function (service role)
────────────────────────────────────      ─────────────────────────────────────
image-studio/  ImageStudioPage            ai-generate-image
  PromptComposer                            requireCaller()        auth
  ResultsGrid                               requireBrandAccess()   tenancy
  useStudioGeneration                        idempotency lookup
        │                                    estimate → RESERVE credits
        ▼                                    insert job row (queued)
image-generation/  (domain layer)            providerFor(model)    ─┐
  client.ts     estimate/generate/cancel      ↳ imageProviders.ts   │ vendor
  projects.ts   projects + job history        ↳ imageRefs.ts        │
  credits.ts    balance + ledger (read)       storeOutputs()       ─┘ storage
  types.ts      the shared contract            SETTLE credits
                                               update job (succeeded)
editor/ai/generateImage.ts  ── thin adapter for the design editor
```

Two UI surfaces, one pipeline: the **Image Studio** (this phase) and the design
editor's **Generate panel** both call the same domain layer, so a security or
metering fix lands in both at once.

---

## 3. Routes

| URL | What it is |
|---|---|
| `/b/:slug/design` | Creation Hub. A prompt here creates a project and opens it. Generates nothing itself. |
| `/b/:slug/design/:projectId` | **Image Studio** when the id names an `image_projects` row. |
| `/b/:slug/design/:designSlug` | The layered **design editor** when the id names a design. |

One route resolves both because "open the thing I was working on" should not
depend on remembering which kind of thing it was
(`src/pages/dashboard/brand/[slug]/design/[designSlug].tsx` does the lookup).

**Project ids are immutable** — the id is the URL, minted with
`crypto.randomUUID()` and never rewritten. **Titles are mutable**: click the
title in the Studio header to rename (`renameImageProject`).

---

## 4. Provider adapter

`supabase/functions/_shared/imageProviders.ts`

```ts
type ImageProvider = (req: ProviderRequest) => Promise<ProviderResult>
```

Everything a vendor differs on — endpoint, body shape, how the image comes back,
how many per call — lives inside its adapter. Rules that bind every adapter:

- never return raw vendor error text; throw through `imageErrors.ts` so the
  taxonomy decides what the user sees;
- always honour `signal`, so cancellation and the request deadline work;
- return decoded **bytes**, never a URL — the orchestrator owns storage.

Wired today: `google` (Nano Banana / Nano Banana Pro), `openai` (GPT Image,
`/v1/images/edits` when references are attached), `fal`, `pollinations`,
`cloudflare`, `huggingface`, `mock`.

### Capability registry

`supabase/functions/_shared/imageModels.ts` is the single source of truth:

```ts
supportsReferenceImages, maxReferenceImages, supportedAspectRatios,
supportedSizes, supportedQualities, supportsMultipleOutputs, maxOutputs,
nPerCall, supportsCancellation, supportsSeed, supportsNegativePrompt,
supportsImageToImage, textRendering
```

The browser renders **every** control from `{action:'models'}`, so a switch the
active model cannot honour is never offered. `coerceSettings()` then snaps
anything the client still sent and reports the adjustment — the server never
trusts the client to have read the capabilities.

`src/features/editor/ai/imageModels.ts` holds display metadata only (label,
short label, hint). Capabilities are not mirrored, so they cannot drift; a test
pins that every server model id has a display entry, in both directions.

**Adding a model** = one registry entry + one display entry (+ a `dispatchX`
adapter only if the vendor is new).

---

## 5. Job state machine

`public.image_generation_jobs`, one row per request.

```
queued ──▶ running ──▶ succeeded
   │           │
   │           ├────▶ failed      (reservation released in full)
   └───────────┴────▶ cancelled   (reservation released in full)
```

Each job records ownership (`workspace_id`, `brand_id`, `user_id`,
`project_id`/`design_id`), provider + exact model, **both** prompts, requested
settings, input reference descriptors, output assets, provider usage, cost and
its source, the pricing version and snapshot, estimated and charged credits,
latency, a normalized error code, and the idempotency key.

Raw provider bodies go to `image_generation_job_diagnostics`, whose RLS policy
is `USING (false)` for `authenticated` and `anon` — the same posture as
`ai_rate_limits`. The job row is readable by brand members; the diagnostics are
readable by nobody.

### Idempotency

Every submit carries `idempotencyKey`, unique per `(workspace_id, key)`. A
repeat — retry button, double-click, refresh-and-resend — returns the original
job instead of calling the provider again. `retry()` deliberately **reuses** the
key rather than minting a new one.

---

## 6. Storage flow

Generated bytes are uploaded server-side to
`brand-assets/{brandId}/generated/{jobId}/{n}.{ext}` and the job stores both the
`storagePath` and a signed URL (1 year).

- The path satisfies the bucket's existing RLS convention (first segment = brand
  uuid → `is_brand_member`), so no new storage policy was needed.
- The path is the durable identity; `resignOutput()` re-signs on demand, which
  is what makes an output durable rather than merely persisted.
- **"Save to Brand Assets"** is a separate, explicit action: it registers the
  image in the Library through the existing `saveGeneratedMedia()` with its
  provenance (prompt, model). Generating does not flood the Library.

---

## 7. Prompt compiler

`src/features/editor/ai/imagePrompt/`

`compileImagePrompt()` (Claude Haiku via `anthropic-proxy`, deterministic
fallback) enriches the user's prompt with brand context. Its rules, encoded in
the system prompt and pinned by tests:

- preserve the user's creative intent — enrich and constrain, never replace;
- only relevant brand information, never every attribute;
- **no logo** unless the user asked or the subject is clearly branded;
- don't force every colour; an explicit user colour direction wins outright.

Both prompts are stored: `user_prompt` is what the user wrote, `compiled_prompt`
is what the provider saw. The compile is **invisible** in the UI — the user
asked for an image, not a prompt-editing session — and the composer's
"Use from brand" chips are the user's own lever over what is attached.

Brand context reaches the model as **images**, not adjectives:
`brandReferences.ts` rasterizes the logo (`rasterizeLogo`) and renders a palette
swatch card, and only for models whose caps allow references.

---

## 8. Usage metering and credits

**1 credit = USD 0.01.** Costs round **up** to whole credits; free models cost
0 credits.

`supabase/functions/_shared/pricing.ts` holds versioned rules
(`PRICING_VERSION`). Every completed job stores the version **and** a snapshot
of the exact rule used, so a later price change never rewrites history.

`cost_source` is recorded per job:

| value | meaning |
|---|---|
| `provider` | the vendor reported a price (no wired vendor does today; the path exists and is used verbatim when one does) |
| `calculated` | real returned usage priced with a versioned rule |
| `estimated` | the pre-flight guess, before the provider answered |

### The money path

```
estimate  → server-side, from the versioned rules
reserve   → balance −= n, reserved += n     (atomic, guarded UPDATE)
generate  → provider call
settle    → reserved −= n, balance += (n − actual), lifetime_spent += actual
release   → whole reservation returned      (failure or cancellation)
```

`reserve_credits`, `settle_credits`, `release_credits`, `grant_credits` and
`ensure_credit_account` are `SECURITY DEFINER` with `EXECUTE` **revoked** from
`anon` and `authenticated`. `credit_accounts` has a SELECT policy and no write
policy; `credit_ledger` is append-only from the server. A user can read their
balance and can never move it.

Overdraw is structurally impossible: the reservation is a single
`UPDATE … WHERE balance_credits >= _amount`, so concurrent requests cannot both
pass a check-then-act window. Settlement is clamped to the reservation, so a
provider surprise cannot push an account negative.

Every workspace is granted **500 credits** (USD 5.00) by a trigger on creation,
and existing workspaces were backfilled by the migration. Top up with:

```sql
select public.grant_credits('<workspace-uuid>', 5000, 'manual top-up');
```

Stripe subscriptions are explicitly **out of scope** here; this is the metering
and ledger foundation billing will sit on.

---

## 9. Error taxonomy

`supabase/functions/_shared/imageErrors.ts` — two audiences, two payloads.

| code | user-facing meaning | retryable |
|---|---|---|
| `invalid_input` | the request could not be used as written | no |
| `authentication` | the service is misconfigured (never "add KEY_X") | no |
| `insufficient_quota` | the provider account is out of quota | no |
| `rate_limited` | too many requests right now | yes |
| `safety_rejection` | declined under the provider's content policy | no |
| `unsupported_setting` | the model cannot honour a setting | no |
| `provider_unavailable` | the provider is down or unreachable | yes |
| `timeout` | the run exceeded the deadline | yes |
| `storage_failure` | generated but not saved (nothing charged) | yes |
| `insufficient_credits` | not enough credits, with the shortfall | no |
| `cancelled` | stopped by the user | — |
| `unknown` | anything else | yes |

The browser receives `{code, message, retryable}`. The provider's body is
inspected only to choose a category and is then written to the private
diagnostics table. Nothing echoes vendor text, and no message names an
environment variable — server configuration is not a user-facing concept.

---

## 10. Security model

| Property | How |
|---|---|
| Real user required | `requireCaller()` resolves `auth.getUser()`; the anon key alone is refused |
| Tenancy | `requireBrandAccess()` reads the brand **through RLS** and derives the workspace from it; a client-supplied workspace id is never trusted |
| No SSRF | references are inline `dataUrl` or a `path` inside the caller's own brand / `ai-refs/<userId>` folder. A bare URL is refused outright |
| Content safety | references are accepted on **magic bytes**, not the declared MIME, so an SVG cannot ride in as `image/png` |
| Size limits | 8 MB per reference, 12 MB total, enforced server-side |
| Spend control | credits reserved before the provider is called; ≤ 6 concurrent jobs per workspace |
| No forged money | balance and ledger are server-write-only; the functions' EXECUTE is revoked from client roles |
| No error leakage | normalized codes to the client, raw bodies to a table no client role can read |

Verified by `supabase/tests/025_image_generation_isolation.test.sql` (tenant
isolation, diagnostics invisibility, unforgeable balance, reserve/settle/release
arithmetic, overdraw refusal, idempotent replay).

---

## 11. Testing

| Layer | Where | Covers |
|---|---|---|
| Edge Function logic | `supabase/functions/_shared/imageGeneration.test.ts` | capability coercion, pricing, settlement, error taxonomy, SSRF path rules, magic-byte sniffing, storage, **every provider adapter against a mocked fetch** (success, rate limit, quota, safety, malformed, timeout, partial failure) |
| Domain wrapper | `src/features/editor/ai/generateImage.test.ts` | job request shape, style suffix on the compiled prompt only, idempotency key reuse, failure propagation |
| Registry | `src/features/editor/ai/imageModels.test.ts` | display ↔ server id parity in both directions |
| Prompt compiler | `src/features/editor/ai/imagePrompt/*.test.ts` | the brand rules, fallbacks, reference ordering |
| Studio E2E | `src/features/image-studio/__tests__/imageStudio.browser.test.tsx` | capability-driven controls, cost before commit, insufficient credits, deliberate brand context, one-in-flight, retry reusing the key, cancel, history, failure cards, rename |
| Editor E2E | `src/features/editor/__tests__/e2e/aiImageStudio.flows.browser.test.tsx` | pages inserted in one undo step, variations via storage path, raw mode, error state, hero hand-off |
| RLS + money | `supabase/tests/025_image_generation_isolation.test.sql` | see §10 (manual: `supabase db reset` then `psql -f`) |

Edge Function tests run in the existing `unit` project — `vite.config.ts`
includes `supabase/functions/**/*.test.ts`, so there is still one gate.

---

## 12. Extension points

Deliberately built as seams, not as scaffolding:

- **Another provider** (OpenRouter, Replicate, Ideogram): one adapter in
  `imageProviders.ts` + one registry entry + one display entry. OpenRouter is
  additionally attractive because its `/api/v1/images` returns `usage.cost`,
  which the settlement path already prefers (`cost_source: 'provider'`).
- **Editable design generation**: a different output kind — a `DesignDocument`
  rather than an image asset. It can reuse the job table (`operation`), the
  credit path and the error taxonomy unchanged; it needs its own adapter
  interface because the output is a document, not bytes.
- **Artifact generation**: same again, output is HTML. The design-artifact
  research in `docs/design-artifact/` is preserved and untouched by this phase.
- **Async / long jobs**: the job row already models `queued`/`running`, so
  moving to a queue means writing the row, returning immediately, and polling —
  no schema change.
- **Billing**: the ledger is the substrate. Stripe becomes another `grant`
  source; nothing else moves.

## 13. Deployment state

Live at **https://demo-25t.pages.dev** (the canonical demo URL) from commit
`4814275`, tagged `checkpoint/ai-image-generation-v2-live`.

Applied to `ciojgoozobzbeglwdxcz` on 2026-08-18:

| Migration | What |
|---|---|
| 025 | projects, jobs, diagnostics, credit accounts + ledger, money functions |
| 026 | `can_view_brand` / `can_edit_brand`; 025's policies re-pointed |
| 027 | trigger resolving a project's billing workspace |
| 028 | `assets` + brand-assets storage policies re-pointed (pre-existing bug) |

Edge Function `ai-generate-image` deployed the same day. Secrets in use:
`GEMINI_API_KEY`, `OPENAI_API_KEY`. `FAL_API_KEY`, `CLOUDFLARE_*` and
`HUGGINGFACE_API_KEY` are unset, so those models report `available: false` and
are not offered.

Top up a workspace:

```sql
select public.grant_credits('<workspace-uuid>', 5000, 'manual top-up');
```

## 14. Known limitations

- Generation is **synchronous**: the request is held open for up to 170 s. A
  refresh mid-run loses the spinner (the job row and its outputs are still
  written server-side and appear on reload), but there is no queue yet.
- **Cancellation** aborts our request and releases the reservation; the provider
  may still complete the work it had already started.
- `ai-refs/` uploads still have **no lifecycle** — pre-existing (F12 in the
  audit); they accumulate in `brand-assets`.
- Local/seed brands (non-uuid ids) cannot generate: no workspace, so no
  tenancy and no credit account. The Hub says so explicitly.
- The free Pollinations tier rate-limits concurrent requests, so asking it for
  4 images often yields fewer. That is now stated rather than silent, and only
  what was delivered is charged.
- The **insufficient-credit refusal** is verified end to end against the
  deployed stack (2026-08-18). Method: an isolated throwaway workspace held 495
  of its 500 credits through the real `reserve_credits`, leaving 5 — less than
  the 14 one Nano Banana Pro image costs. See
  `supabase/tests/qa/insufficient-credits-probe.sql`. Result:

  | check | evidence |
  |---|---|
  | refused | HTTP **402 `insufficient_credits`**, "This needs 14 credits and you have 5", `requiredCredits: 14`, `balance: 5` |
  | before contacting a provider | **469–600 ms** round trip (a real Nano Banana Pro call takes 18–27 s) and the job row has **`started_at IS NULL`** — that column is only set immediately before the provider call |
  | no paid job | job row is `failed` with `charged_credits 0`, `cost_usd NULL`, `output_assets []`; the ledger gained **no entry** for the refused attempt |
  | balance never negative | probe account unchanged at 5 / reserved 495, before and after |
  | not a broken fixture | the same brand at the same 5-credit balance generated fine on a free model (`started_at` set, 0 charged) |
  | replay is safe | re-sending the same idempotency key returned **the same job id**, not a second job |
  | real workspace untouched | `e800cf4e…` stayed 486 / reserved 0 / lifetime_spent 14 throughout |
