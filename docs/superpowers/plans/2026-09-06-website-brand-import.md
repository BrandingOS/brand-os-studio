# Website Brand Import — implementation plan (Build phase)

Product contract: Gate 0 brief → Gate 1 contract (patched) → Gate 2 prototype
(`/_dev/website-import`). This plan is the file-level execution of that
contract in dependency order. Nothing here redesigns the approved flow.

## Architecture in one paragraph

A signed-in user gives a website (pill or detected in the description). On
Continue the brand is created as today, then `runUnderstanding` starts a
server-side deterministic scan (`scan-website` Edge Function, SSRF-hardened,
streams NDJSON events) CONCURRENTLY with the existing artwork and colour work.
The scan returns a compact `WebsiteEvidence`. On the client `fromWebsite()`
turns it into candidates for the existing `interpret → mergeCandidates` merge
at the new website ranks, scraped logo bytes become ordinary `OnboardingAsset`s
so the existing classifier, colour extractor and Library writer handle them, a
text digest goes to ONE AI call through `anthropic-proxy` (Haiku default,
Sonnet only on the contract's conditions, two calls max), and everything lands
through `applyProposals` / `applyBusinessFacts` at authority `suggested` with
the `website-scan` agent. The processing moment's stage machine narrates the
real events; visual pacing never delays completion.

## Build order → files

| # | Step | New | Modified | Tests |
|---|---|---|---|---|
| 1 | Ranks + authorship | — | `understanding/sources.ts` (RANK: generated 0 · websiteInferred 1 · brief 2 · website 3 · uploaded 4 · authored 5 · user 6; `ai` kept as alias of generated), `understanding/interpret.ts` (`authorship`), `onboarding-v4/types.ts` + store (`descriptionAuthorship`), `BriefHandoff` (`onAuthorship`), `SetupPanel` | `sources.test.ts`, `interpret.test.ts` (authored prose outranks brief) |
| 2 | URL detection + precedence | `onboarding/website/detectSite.ts`, `onboarding/website/DetectedSiteChip.tsx` (+css) | `SetupPanel.tsx` (chip), store (`ignoredSite`), `SetUpScreen` (`scanTarget`) | `detectSite.test.ts`, `scanTarget.test.ts`, browser: chip states |
| 3 | SSRF-safe fetch | `supabase/functions/_shared/safeFetch.ts` | — | `safeFetch.test.ts` (private v4/v6/mapped/metadata, numeric forms, redirect hops, scheme/port, size cap, content-type, timeout) |
| 4 | Evidence extraction | `_shared/websiteEvidence.ts` (types + extractors), `_shared/crawlPlan.ts` | — | `websiteEvidence.test.ts`, `crawlPlan.test.ts` |
| 5 | Streaming scan function | `supabase/functions/scan-website/index.ts`, `_shared/scanWebsite.ts` (orchestrator, injectable fetch) | — | `scanWebsite.test.ts` (event order, partial, budgets, no copy in telemetry) |
| 6 | Client scan + candidate adapter | `onboarding/website/evidence.ts` (client type), `website/scanClient.ts` (fetch + NDJSON, 25s ceiling), `website/fromWebsite.ts` | `understanding/interpret.ts` (website candidates) | `fromWebsite.test.ts`, `scanClient.test.ts` |
| 7 | Scraped asset ingestion | `website/scrapedAssets.ts` | `intakeTypes.ts` (`origin?: 'website'`) | `scrapedAssets.test.ts`, uploaded-vs-scraped precedence in `logoClassify.test.ts` |
| 8 | Facts / fonts / colours / links | in `fromWebsite.ts` | `proposals.ts` (`BusinessFacts.contact`), `applyProposals.ts` (contact merge) | `fromWebsite.test.ts`, `applyProposals` contact test |
| 9 | AI digest + routing | `website/digest.ts`, `website/routing.ts`, `website/enrich.ts` | — | `digest.test.ts`, `routing.test.ts`, `enrich.test.ts` (injection, schema, Haiku default, one Sonnet retry, credits skip) |
| 10 | Decided protection | `understanding/decided.ts` | `bridge/v4Bridge.ts` (`understand` passes `decided`, website pass) | `decided.test.ts`, rescan idempotency in `persistence.test.ts` |
| 11 | Persistence | — | `onboardingState.ts` (`websiteScan` summary), `v4Bridge.ts` (`understandWebsite`) | `onboardingState.test.ts`, `websitePersistence.test.ts` |
| 12 | Progress | — | `understanding/stages.ts` (website stages + event-driven runs), `steps/UnderstandingStage.tsx` (fast-forward), `SetUpScreen.tsx` | `stages.test.ts`, browser: no animation-induced delay |
| 13 | Review presentation | — | `v4Bridge.ts` (origins from meta + marker), `AboutGroup.tsx` (vocabulary labels), `UploadsReviewPanel.tsx` (live colour check) | browser: labels, origin lines, no extra swatch |
| 14 | Partial / failure / retry | `website/ScanNotice.tsx` | `SetUpScreen.tsx` | browser: partial, unavailable, extracted-only |
| 15 | Full flow | — | — | `websiteImport.flows.browser.test.tsx` |
| 16 | Prove | — | — | typecheck, lint, unit, browser, build, security, perf |

## Acceptance criteria → tests

- URL detection / precedence → `detectSite.test.ts`, `scanTarget.test.ts`, chip browser test.
- Description authorship ranking → `interpret.test.ts`.
- Confirmed-value protection, authority never lowered → `decided.test.ts`, `websitePersistence.test.ts`.
- Uploaded beats scraped → `logoClassify.test.ts`, `fromWebsite.test.ts` (CSS colour loses to uploaded logo colour).
- Idempotent rescans → `websitePersistence.test.ts` (no duplicate links/assets, authority unchanged).
- Deterministic extraction, page selection → `websiteEvidence.test.ts`, `crawlPlan.test.ts`.
- Partial success → `scanWebsite.test.ts`, browser partial state.
- AI skipped on credits, Haiku default, Sonnet conditions, injection → `routing.test.ts`, `enrich.test.ts`.
- SSRF, redirects, size, content-type → `safeFetch.test.ts`.
- Streamed events, truthful findings → `scanWebsite.test.ts`, `stages.test.ts`.
- No animation-induced delay → `UnderstandingStage` browser test.
- Canonical persistence → `websitePersistence.test.ts`.
- Human-readable review vocabulary, no extra swatch → review browser test.

## Prototype audit (Gate 2 changes)

| Change | Verdict |
|---|---|
| `ValueOrigin` gains `website` + label | KEEP — the projection is the canonical seam; the label derives from `identityMeta.setBy === 'website-scan'` |
| `Projection.profile[].origin`, `businessOrigins` | KEEP — computed by `project()` from meta + the marker's page origins, never hand-built |
| `AboutGroup` origin line | KEEP, and fix audience/positioning to render vocabulary labels |
| `descriptionAuthorship` | IMPLEMENT properly: store field set by `BriefHandoff` mode, read by `interpret` |
| prototype `detectSite`, chip, scan script | detectSite + chip move to `features/onboarding/website/`; the scripted scan stays prototype-only |

## Status (2026-09-06)

Built and proven on `dev` (commit `feat(onboarding): Website Brand Import — the
Brand Scan, end to end`). All sixteen steps landed; see the CLAUDE.md section
"Website Brand Import — the Brand Scan" for the canonical description.

Owner actions left: deploy `supabase/functions/scan-website` (no secrets; add
to the runbook list); decide when the Gate 2 prototype `/_dev/website-import`
is removed. Known, deliberate V1.1 items: headless rendering, vision, imagery
import, rescan from Setup, social-profile crawling, multilingual, PDFs.
