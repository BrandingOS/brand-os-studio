# Migration Backlog — recorded, NOT fixed (phase discipline)

Issues discovered during Stage 2A–2D that belong to a LATER phase. Do **not** fix these
now — they are logged so nothing is lost. Each notes the phase that should own it.

## Later-phase (identity/domain refinements)

| # | Item | Evidence | Owner phase |
|---|---|---|---|
| B1 | `VoiceAndTone.communicationStyle` has no canonical `Voice` field — dropped by `fromLegacyBrand`. | `brand.ts:228`; `fromLegacy.ts` resolveVoice | 2A-follow-up / voice modeling |
| B2 | Voice `example.bad` dropped — canonical keeps only `{context, text: good}`. | `brand.ts:239`; `fromLegacy.ts:~199` | voice modeling |
| B3 | `guidelines.colorPalette.semantic` not populated on the scalar color path (only passes through when a v3 `colorSystem` is present). Semantic tokens are arguably derived, not identity. | `fromLegacy.ts` resolveColors | color/derivation phase |
| B4 | Canonical logo validation is loose (`z.object({}).passthrough()`) — no structural logo invariant yet. Mapping is tested; schema isn't strict. | `invariants.ts:~77` | 2C (asset/logo foundation) |
| B5 | Legacy url→Asset resolution: `resolveLogos` emits transitional `legacy-url:<url>` refs. Real Asset records (id/hash/formats) are created in 2C. | `fromLegacy.ts` legacyLogoRef | 2C |

## Unrelated / pre-existing (leave alone)

| # | Item | Evidence |
|---|---|---|
| U1 | `recolorLogo.test.ts` — 1 pre-existing unit failure, untouched by any Stage-2 work. | `src/features/brand-kit/data/recolorLogo.test.ts` |
| U2 | Browser E2E can't run — Playwright headless-shell version mismatch (1217 vs 1228). Env fix: `npx playwright install chromium-headless-shell`. | vitest browser project |
| U3 | 324 TypeScript errors (frozen baseline debt) + 10 circular deps (frozen). Ratcheted; burn-down is a later dedicated phase. | `.typecheck-baseline.txt`, `.madge-cycles-baseline.txt` |
| U4 | `supabase/.temp/*` local CLI state is tracked in git (pre-existing). Hygiene cleanup later. | `git ls-files supabase/.temp` |
