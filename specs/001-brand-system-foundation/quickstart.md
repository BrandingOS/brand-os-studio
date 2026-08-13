# Quickstart — Validating the Brand System Foundation

**Feature**: `001-brand-system-foundation`

How to prove the foundation works, end to end. Every scenario below maps to a spec
requirement and is runnable without reading implementation code.

---

## Prerequisites

```bash
npm install
npx playwright install          # once per machine, for the browser project
```

Known-good baseline before you start (from `CLAUDE.md`):
- `npm run lint` → 0 errors (~226 pre-existing warnings)
- `npm run typecheck:ci` → passes (ratchet; 321 baselined errors, add none)
- One pre-existing unit failure: `src/features/brand-kit/data/recolorLogo.test.ts`
  ("keeps a curated brand palette intact") — not caused by this feature.

---

## Test commands

```bash
npm run test                                   # all projects (unit + browser)
npx vitest run --project unit                  # jsdom only — fastest loop
npx vitest run --project browser               # real Chromium
npx vitest run src/domain/brand                # Core DNA + authority/provenance
npx vitest run src/core/adapters/database      # Library service (local + supabase)
```

RLS is a separate, non-vitest track (repo convention — self-asserting psql scripts):

```bash
supabase db reset
psql "$LOCAL_DB_URL" -f supabase/tests/016_core_meta_isolation.test.sql
psql "$LOCAL_DB_URL" -f supabase/tests/017_library_kit_context_isolation.test.sql
# each ends with: ALL <NNN> RLS ASSERTIONS PASSED
```

Migration deploy check (never force — repo rule):

```bash
supabase migration list --linked      # before
supabase db push --linked
supabase migration list --linked      # confirm in BOTH local and remote columns
```

---

## Scenario 1 — One brand truth across surfaces (US1 / SC-001)

**Automated**: `npx vitest run --project browser src/features/**/brandTruth.browser.test.tsx`

**Manual**:
1. `npm run dev` → open `/b/<slug>/setup`, change the primary color, wait for the
   save indicator to settle.
2. Open `/b/<slug>/brand-kit` — previews use the new color.
3. Open a design in Create — brand slots resolve to the new color.
4. Open `/b/<slug>/folders` — brand chips show the new color.
5. Reverse the direction: change a font from the editor's brand tools, return to
   Setup — Setup shows the new font.

**Pass**: no refresh ritual, no re-login, no surface showing the old value.

---

## Scenario 2 — Skip freely, creation never blocked (US2 / SC-002)

**Automated**: `npx vitest run src/domain/brand/__tests__/authority.test.ts`
covers the status machine; the browser test covers the flow.

**Manual**:
1. Create a brand with **only a name**. Skip everything else.
2. Go straight to Create and produce a saved output.
3. Inspect the brand's Core: the values in use exist at `provisional`, with
   provenance `ai-suggested` or `inferred` — **never** `confirmed`/`official`.
4. Accept one suggested value explicitly. Its authority becomes `confirmed`; its
   provenance still records that it was AI-suggested.

**Pass**: zero blocking prompts; zero values promoted without an explicit action.

---

## Scenario 3 — AI cannot promote (SC-003)

**Automated (type-level + runtime)**:

```bash
npx vitest run src/application/brand/__tests__/promotion.test.ts
```

Asserts: a `system` actor writing `confirmed`/`official` throws; `promoteCoreValue`
does not accept a system actor (compile-time); promotion preserves provenance.

**Manual**: run any AI suggestion flow, then list Core metadata — every AI-written
path is at `suggested`/`provisional`.

---

## Scenario 4 — One Library for all uploads (US4 / SC-004)

**Manual**:
1. Upload an image from the **editor**.
2. Upload a logo from **Setup**.
3. Upload a file from the **Library** page.
4. Open the Library — all three are present, each with the correct `origin`.
5. Exercise: favorite → dislike (favorite clears), assign to a folder, archive
   (disappears from default view, still recoverable), mark "use as reference".
6. Reload the page — every flag persisted.

**Pass**: no upload lands anywhere but the Library.

---

## Scenario 5 — Adoption references, never duplicates (US3)

**Automated**: `npx vitest run src/features/brand-kit/__tests__/adoption.test.ts`

**Manual**:
1. Generate a deliverable → confirm it is **absent** from the Official Kit.
2. Promote it explicitly → it appears, with adopter and timestamp.
3. Edit the underlying Library item → the Kit entry reflects the same object (no
   stale copy).
4. Remove the Kit entry → the Library item is **still there**, unchanged.

**Pass**: no adopted payload is stored anywhere; removing an adoption never deletes
material.

---

## Scenario 6 — Deletion preserves work integrity (FR-020 / INV-11)

**Automated**: `npx vitest run src/core/adapters/database/__tests__/libraryDeletion.test.ts`

**Manual**:
1. Place a Library image into a design; save the design.
2. Delete the Library item.
3. The system warns first if the item is adopted or referenced.
4. After deletion: reopen the design — **it still opens and renders**; its lineage
   shows an inert record (name + origin) of the deleted item rather than a broken
   link.

**Pass**: no dangling reference, no unopenable work.

---

## Scenario 7 — Brand isolation at the data layer (SC-006)

**This is the one scenario that must NOT be validated through the UI.**

```bash
psql "$LOCAL_DB_URL" -f supabase/tests/017_library_kit_context_isolation.test.sql
```

Asserts, as a non-member user, for each of `brand_folders`,
`brand_kit_adoptions`, `brand_context_signals` (and the new `assets` columns):
SELECT returns zero rows; INSERT/UPDATE/DELETE are denied; an adoption cannot be
attributed to another user (`adopted_by` self-check); a storage write under another
brand's path prefix is rejected.

**Pass**: every assertion passes with the script's final `ALL … ASSERTIONS PASSED`.

---

## Scenario 8 — Two output families (US5 / SC-008)

**Manual**:
1. Save a constructive output (design/presentation) → reopen it → it is **editable**,
   not a flattened image, and its brand relationship is intact.
2. Accept a generated image → it appears in the Library as a media asset with
   `origin='generated'` and complete provenance (prompt/context/model/brand).
3. Place that image into a design → the provenance gains the relationship; the image
   is still one object, not a copy.

---

## Scenario 9 — Migration safety (SC-005)

**Before/after harness**: `npx vitest run src/domain/brand/__tests__/migration.test.ts`

**Manual**, on a pre-feature brand of each legacy shape (legacy scalars only; v3
fields; identity blob; guidelines mirror; seed brand):
1. Open Setup, Brand Kit, Library, Create — every value renders as before.
2. Confirm existing values backfilled at authority `confirmed` (provenance
   `user-entered`/`imported`), and migration-derived values at `provisional`
   (provenance `inferred`) — never `official`.
3. Confirm pre-existing kit "approved" items appear as Official Kit adoptions.
4. Confirm legacy asset arrays migrated into the Library and that `logoSystem` logo
   slots still resolve.

**Pass**: zero data loss, zero user-facing migration step.

---

## Scenario 10 — Local/server parity (FR-033)

1. Run the whole of Scenarios 2, 4, and 5 in **dev-bypass local mode**.
2. Then sign in and repeat.
3. Confirm identical concepts, statuses, and behavior in both modes, and that signing
   in does not fork brand truth.

---

## Definition of done for the feature

- [ ] All ten scenarios pass.
- [ ] `npm run test` green (except the one documented pre-existing failure).
- [ ] `npm run lint` 0 errors; `npm run typecheck:ci` adds no new errors.
- [ ] Both RLS test scripts pass.
- [ ] `supabase migration list --linked` shows 016 and 017 in both columns.
- [ ] Every retired legacy path in `plan.md` §Legacy retirement either deleted or has
      its deletion criterion recorded as still-unmet.
