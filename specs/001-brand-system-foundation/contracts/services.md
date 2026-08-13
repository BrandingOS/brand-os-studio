# Contract — Service Interfaces

**Feature**: `001-brand-system-foundation` · **Layer**: `src/core/types/services.ts`
(keys) + domain/application layers.

These are the interfaces the five consuming surfaces (Onboarding, Setup, Brand Kit,
Library, Create) program against. Signatures are the contract; implementations are the
plan's concern.

---

## 1. Core DNA — write authority

**No new service.** The existing `BrandRepository` port
(`src/domain/brand/repository.ts`) remains the single write authority for Core.

```ts
// EXISTING — unchanged shape
interface BrandRepository {
  getById(id: string): Promise<CanonicalBrand | null>;
  getBySlug(slug: string): Promise<CanonicalBrand | null>;
  save(brand: CanonicalBrand): Promise<CanonicalBrand>;
}
```

`CanonicalBrand` gains `identityMeta` and `businessInfo`; `BrandIdentity` gains
`visualStyle`, `rules`, `positioning` (see `data-model.md` §1–2).

### 1.1 Application-layer ops — extended set

Existing ops keep their signatures (`changeBrandColor`, `changeBrandTypography`,
`changeBrandVoice`, `changeBrandStrategy`). Each gains an **actor + provenance**
parameter so every Core write records who/what wrote it:

```ts
type Actor =
  | { kind: 'human'; userId: string }
  | { kind: 'system'; agent: string };   // AI or migration — CANNOT promote

// NEW ops
changeBrandVisualStyle(repo, brandId, patch: Partial<VisualStyle>, actor): Promise<CanonicalBrand>
changeBrandRules(repo, brandId, patch: Partial<BrandRules>, actor): Promise<CanonicalBrand>
changeBrandPositioning(repo, brandId, patch: Partial<Positioning>, actor): Promise<CanonicalBrand>
changeBusinessInfo(repo, brandId, patch: Partial<BusinessInfo>, actor): Promise<CanonicalBrand>
```

**Contract**: a `system` actor may only produce authority `suggested` or
`provisional`. Attempting `confirmed`/`official` with a system actor is a
**programming error and throws** — it is not silently downgraded.

### 1.2 Promotion — the only path to Confirmed/Official

```ts
promoteCoreValue(
  repo: BrandRepository,
  brandId: string,
  path: CoreFieldPath,
  to: 'confirmed' | 'official',
  actor: Extract<Actor, { kind: 'human' }>,   // type-level enforcement
): Promise<CanonicalBrand>

demoteCoreValue(repo, brandId, path, to: 'provisional' | 'confirmed', actor): Promise<CanonicalBrand>
```

**Contract**:
- `actor` is typed to human-only — a system caller cannot compile.
- Promotion never rewrites `provenance` (INV-2).
- `to: 'official'` **delegates** the adoption row to `IKitAdoptionService.adopt` (§3)
  within the same operation. It does not write `brand_kit_adoptions` itself: the
  adoption service stays the sole writer of that table, and this op stays the sole
  writer of Core authority. One write authority per datum, on both sides.
- If the delegated adoption fails, the authority change is not applied — the two
  cannot diverge.

### 1.3 Core read helpers (pure, no service)

```ts
coreValueMeta(brand: CanonicalBrand, path: CoreFieldPath): CoreValueMeta   // never null — INV-4 default
isAtLeast(authority: Authority, min: Authority): boolean                    // INV-5 ordering
coreCompleteness(brand: CanonicalBrand): { confirmed: number; total: number }
```

`coreCompleteness` exists so surfaces can show progress **without** gating on it
(FR-006).

---

## 2. Brand Library

Extends the existing `IAssetsService`. **Key**: `SERVICE_KEYS.ASSETS` (unchanged, so
existing consumers keep working).

```ts
// EXISTING methods — unchanged
listForBrand(brandId: string): Promise<Asset[]>
getById(id: string): Promise<Asset | null>
create(input: CreateAssetInput): Promise<Asset>
update(id: string, patch: Partial<Asset>): Promise<Asset>
delete(id: string): Promise<void>

// NEW — Library semantics
listLibrary(brandId: string, q?: LibraryQuery): Promise<Asset[]>
setFlags(id: string, flags: Partial<LibraryFlags>): Promise<Asset>
moveToFolder(id: string, folderId: string | null): Promise<Asset>
archive(id: string): Promise<Asset>
unarchive(id: string): Promise<Asset>
softDelete(id: string): Promise<DeleteOutcome>

listFolders(brandId: string): Promise<BrandFolder[]>
createFolder(brandId: string, name: string, parentId?: string | null): Promise<BrandFolder>
renameFolder(id: string, name: string): Promise<BrandFolder>
deleteFolder(id: string): Promise<void>   // items fall back to no folder
```

```ts
interface LibraryQuery {
  folderId?: string | null;
  origin?: ('uploaded' | 'generated' | 'reference')[];
  favorite?: boolean;
  references?: boolean;
  includeArchived?: boolean;   // default false
  search?: string;
  tags?: string[];
}

interface LibraryFlags {
  isFavorite: boolean;
  isDisliked: boolean;       // mutually exclusive with isFavorite
  useAsReference: boolean;
}

type DeleteOutcome =
  | { ok: true }
  | { ok: false; reason: 'adopted'; adoptions: KitAdoption[] }        // FR-020 — inform first
  | { ok: false; reason: 'referenced'; workItemIds: string[] };
```

**Contract**:
- `listLibrary` excludes archived and soft-deleted items by default.
- `softDelete` NEVER hard-deletes the row (tombstone, `data-model.md` §3.3) and returns
  `ok: false` with the blocking references rather than cascading.
- Every method is brand-scoped at the data layer; `getById`-style lookups rely on RLS
  (`is_brand_member`) exactly as the current service does.

---

## 3. Official Brand Kit — adoption

**New service.** Key: `SERVICE_KEYS.KIT_ADOPTIONS`.

```ts
interface IKitAdoptionService {
  list(brandId: string): Promise<KitAdoption[]>;
  adopt(input: AdoptInput): Promise<KitAdoption>;
  unadopt(brandId: string, targetKind: AdoptTargetKind, targetRef: string): Promise<void>;
  isAdopted(brandId: string, targetKind: AdoptTargetKind, targetRef: string): Promise<boolean>;
}

type AdoptTargetKind = 'core_value' | 'library_item' | 'kit_deliverable';

interface AdoptInput {
  brandId: string;
  targetKind: AdoptTargetKind;
  targetRef: string;
  actor: { kind: 'human'; userId: string };   // type-level: no system adoption
  note?: string;
}

interface KitAdoption {
  id: string; brandId: string;
  targetKind: AdoptTargetKind; targetRef: string;
  adoptedBy: string; adoptedAt: string; note?: string;
}
```

**Contract**:
- `adopt` stores a **reference only** — the returned object carries no copy of the
  adopted material (INV-6).
- `unadopt` removes only the adoption record (INV-7).
- There is no `adoptMany`-from-generation hook and no trigger path: nothing creates
  adoptions except this method (INV-9).
- **`targetKind: 'core_value'` is rejected when called directly.** Core adoption has a
  single entry point — `promoteCoreValue(…, 'official', actor)` — which delegates here
  internally. This service never writes Core authority; the promotion op never writes
  this table. Without that split there would be two ways to make a Core value official,
  which is exactly the competing-write-path problem this feature removes.

---

## 4. Brand Context v1

**New service.** Key: `SERVICE_KEYS.BRAND_CONTEXT`.

```ts
interface IBrandContextService {
  record(signal: NewContextSignal): Promise<void>;          // fire-and-forget, never throws to the UI
  list(brandId: string, q?: ContextQuery): Promise<ContextSignal[]>;
  remove(id: string): Promise<void>;                        // FR-013 correctable
  summarize(brandId: string): Promise<ContextSummary>;      // derived, not stored
}

interface NewContextSignal {
  brandId: string;
  kind: 'favorite' | 'dislike' | 'reference' | 'approval' | 'preference' | 'usage';
  targetKind?: 'library_item' | 'core_value' | 'design';
  targetRef?: string;
  value?: Record<string, unknown>;   // small payload only
  source: 'user-action' | 'derived';
}

interface ContextSummary {
  references: Asset[];               // Library items flagged use_as_reference
  liked: string[]; disliked: string[];
  preferences: Record<string, unknown>;
  signalCount: number;
}
```

**Contract**:
- `record` is **silent and non-blocking** (INV-15): failures are swallowed and logged,
  never surfaced as user-facing errors.
- No method returns or accepts a `CanonicalBrand`; this service has **no import path**
  to `BrandRepository` (INV-13, enforced by a dependency test).
- `summarize` is computed per call — there is no stored summary, no scheduler, no
  embedding.

---

## 5. AI creation context assembly

**New pure module** (not a service), living in the existing application layer at
`src/application/brand/buildCreationContext.ts` — it is a use case over domain objects,
consumed by every generation entry point. It does **not** get a new feature folder.

```ts
buildCreationContext(input: {
  brand: CanonicalBrand;
  context: ContextSummary;
  library: Asset[];                 // references only
  minAuthority?: Authority;         // default: include provisional and above
}): CreationContext

interface CreationContext {
  core: { path: CoreFieldPath; value: unknown; authority: Authority; provenance: Provenance }[];
  businessInfo?: BusinessInfo;
  references: { assetId: string; url: string; kind: string }[];
  preferences: Record<string, unknown>;
  provisionalPaths: CoreFieldPath[];   // what the caller may surface as "assumed"
}
```

**Contract**:
- Every Core value handed to AI carries its authority and provenance — the model is
  told what is assumed vs settled (FR-006).
- Assembly NEVER filters down to "confirmed only" by default: creation must work on a
  provisional brand.
- Output is data; this module performs no network calls and no writes.

---

## 6. Kit state repository — signature change

```ts
// BEFORE (src/features/brand-kit/kit/repository.ts) — synchronous
interface KitStateRepository {
  load(brandId: string): BrandKitState | null;
  save(brandId: string, state: BrandKitState): boolean;
}

// AFTER — async, so a server-backed implementation can satisfy it
interface KitStateRepository {
  load(brandId: string): Promise<BrandKitState | null>;
  save(brandId: string, state: BrandKitState): Promise<boolean>;
}
```

**Contract**: two call sites in `kitStore.ts` change. `LocalKitStateRepository` keeps
its behavior (wrapped in resolved promises); `SupabaseKitStateRepository` is registered
in `boot.ts` under `reconfigureForAuth`.

---

## 7. DI registration contract

New keys in `SERVICE_KEYS`: `KIT_ADOPTIONS`, `BRAND_CONTEXT`.

**Contract**: both keys MUST be registered in **both** branches of `boot.ts`
(`bootServices()` local defaults and the authenticated overrides in
`reconfigureForAuth`). `src/core/__tests__/boot.test.ts` asserts every key resolves in
both modes — a missing registration fails there, by design.
