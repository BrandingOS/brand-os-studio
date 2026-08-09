# Stage 2D — First Feature Migration (Color System)

Goal: prove the canonical architecture end-to-end on one narrow, high-value slice — changing a
brand color — so the whole 2A→2B→2C stack is demonstrated working together, not just in isolation.

## Slice chosen (verified)

**Color System** (primary/secondary/accent), not all of Brand Kit. It is the smallest bounded
identity subsystem, is the exact surface where the stale-mirror bug lived (05/11), and exercises
every layer: application command → canonical domain → repository → persistence → reload → consumer.

## What shipped

- `src/application/brand/changeBrandColor.ts` — the **one canonical command** a UI calls:
  `changeBrandColor(repo, brandId, role, token)` / `changeBrandPrimaryColor(repo, brandId, hex)`.
  Loads the canonical brand via the `BrandRepository` port, updates the color **immutably**,
  validates via `assertCanonicalBrand` (bad hex rejected before any write), and saves through the
  repository — no component touches persistence directly.
- `src/application/brand/__tests__/changeBrandColor.test.ts` — 6 integration tests.

## The end-to-end proof (all green)

```
UI intent (change primary color)
  → changeBrandColor use-case          (application/brand/changeBrandColor.ts)
  → canonical Brand identity mutated   (domain/brand — immutable, validated)
  → BrandRepository.save               (domain/brand/repository.ts port)
  → row mappers → identity JSONB       (platform/brand/brandRow.ts — 2B)
  → reload (fresh read)                → SAME value
  → second consumer (Guidelines) read  → SAME canonical value
  → stale legacy scalar CANNOT resurrect the old value
```

Tests prove: reload returns the new value; a second independent read (Guidelines simulation) gets
the canonical value; a hand-seeded **stale legacy scalar (`#999999`) loses to the stored identity**
and cannot resurrect after a change; secondary/accent roles work; invalid hex is rejected with the
store left unchanged; unknown brand throws. The `InMemoryBrandRepository` is a real
serialize→deserialize round-trip (not a hold-the-object fake), and the identity-JSONB persistence
underneath was proven against real PostgreSQL in Stage 2B.

## Scope held / what is deliberately deferred

- **No live Brand Kit DOM cutover, by design.** The canonical Supabase write path needs migration
  013, which is **deploy-blocked (no prod access)** — wiring the live UI to it would be
  non-functional in production and would risk the live app. The slice is therefore proven at every
  layer that can be exercised without the blocked deploy; the thin UI cutover is the single
  remaining step, gated on 013 deployment (= gated on S1 / prod access).
- **No legacy compat removed yet.** The legacy color path (`mockBrandToPatch` → `brandStore.update`
  in `features/brand-kit`/`features/setup`) stays live and untouched. It is removed only at the UI
  cutover, when its replacement is live — recorded for that step, not done now.
- Existing consumers untouched → zero regression (full suite: 1196 pass / 1 pre-existing fail).

## Remaining step to fully "flip" this slice (deploy-gated)

1. Deploy migration 013 (with the security release — `docs/phase-2/security-deploy`).
2. Register a `BrandRepository` in the app (DI/store) — `SupabaseBrandRepository` when authed,
   `InMemoryBrandRepository`/local otherwise.
3. Point the Brand Kit color editor's save at `changeBrandColor` instead of `mockBrandToPatch`.
4. Remove the now-dead legacy color write path for this slice; verify other consumers.
