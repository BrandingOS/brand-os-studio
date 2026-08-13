# Phase 1 — Data Model: Brand System Foundation MVP

**Date**: 2026-08-13 · **Feature**: `001-brand-system-foundation`

Everything here is **additive** to the existing schema. No existing column is dropped
or retyped in this feature; legacy fields are retired later, by their own criteria
(see `plan.md` §Legacy retirement).

---

## 1. Brand Core DNA

**Home**: `brands.identity` JSONB (exists, migration 013) + the canonical model at
`src/domain/brand/identity.ts`. **Write authority**: `BrandRepository` only.

### 1.1 `BrandIdentity` — extended (3 new subsystems)

| Field | Status | Shape |
|---|---|---|
| `colors` | exists | `ColorSystem { primary, secondary?, accent?, neutrals[], semantic{} }` |
| `logos` | exists | `LogoSystemRefs { primary, secondary, wordmark, iconmark, mono{}, orientations{}, clearSpace?, minSize?, usage[] }` |
| `typography` | exists | `TypographySystem { primary, secondary?, accent?, scale? }` |
| `strategy` | exists | `Strategy { mission?, vision?, values[], positioning?, personality[], targetAudience?, aboutSections[] }` |
| `voice` | exists | `Voice { tone?, personality[], doList[], dontList[], examples[] }` |
| **`visualStyle`** | **NEW** | enumerated attributes, below |
| **`rules`** | **NEW** | structured brand rules, below |
| **`positioning`** | **NEW** | positioning/audience essentials, below |

**`visualStyle`** — closed enumerations, never free text:

```
{
  descriptors: StyleDescriptor[],        // enum: minimal | bold | elegant | playful |
                                         //       technical | organic | luxury | retro …
  cornerStyle:  'sharp' | 'soft' | 'rounded' | 'pill',
  density:      'tight' | 'balanced' | 'airy',
  contrast:     'low' | 'medium' | 'high',
  imageryStyle: 'photographic' | 'illustrated' | 'abstract' | 'mixed' | 'none',
  motion:       'still' | 'subtle' | 'expressive'
}
```

Every field optional. `brand.uiStyle` (borderRadius/shadowIntensity/spacing/weight,
written today by Brand Board) maps into `cornerStyle`/`density` on migration and is
retired afterward.

**`rules`** — structured, not prose:

```
{
  logo:  { minSizePx?, clearSpaceRatio?, allowedBackgrounds: ('light'|'dark'|'brand'|'photo')[],
           prohibited: LogoProhibition[] },     // enum: stretch | recolor | rotate | outline | shadow …
  color: { neverPair: [hexA, hexB][], requireContrastRatio? },
  type:  { minBodySizePx?, allowedWeights: number[] },
  voice: { avoidTerms: string[], preferTerms: string[] }
}
```

`doList`/`dontList` on `Voice` stay where they are (narrative do/don'ts); `rules` holds
the machine-checkable subset.

**`positioning`**:

```
{
  category?, differentiator?,
  audiences: { label, descriptor?, priority: 'primary'|'secondary' }[],
  competitors: { name, note? }[]        // MVP: labels only, no CRM, no entities
}
```

`Strategy.positioning` (a string) and `Strategy.targetAudience` remain and are the
migration source; they become read-compat once `positioning` is populated.

### 1.2 Authority & provenance sidecar — **NEW**

**Home**: `brands.identity_meta` JSONB (new column).

```
identityMeta: Record<CoreFieldPath, CoreValueMeta>

CoreValueMeta {
  authority:  'suggested' | 'provisional' | 'confirmed' | 'official'
  provenance: 'user-entered' | 'ai-suggested' | 'inferred' | 'imported'
  setBy:      string | null      // user id, or an agent identifier
  setAt:      string             // ISO
  promotedBy?: string            // set only on → confirmed/official
  promotedAt?: string
}
```

**`CoreFieldPath` is a closed registry**, not a free-form string — a typed union
enumerating the addressable Core values, e.g.:

```
'colors.primary' | 'colors.secondary' | 'colors.accent' | 'colors.neutrals'
'logos.primary' | 'logos.mono.black' | 'logos.orientations.horizontal' | …
'typography.primary' | 'typography.secondary' | 'typography.scale'
'voice.tone' | 'voice.personality' | 'strategy.mission' | 'strategy.values' | …
'visualStyle.descriptors' | 'rules.logo' | 'positioning.audiences' | …
```

**Invariants** (enforced in the domain layer, covered by tests):

- **INV-1** Every key in `identityMeta` MUST be a member of the registry. Unknown keys
  are dropped on read (self-healing; no dangling metadata).
- **INV-2** Authority and provenance are independent. Promotion NEVER rewrites
  provenance.
- **INV-3** Only the promotion op may set `authority` to `confirmed` or `official`,
  and it requires an authorized-human actor id. No AI/system path can reach those
  values.
- **INV-4** A value with no metadata entry resolves to a documented default:
  `{ authority: 'provisional', provenance: 'imported' }` for pre-existing data.
- **INV-5** Authority ordering for comparison: `suggested < provisional < confirmed <
  official`.

**State transitions**:

```
(absent) ──system/AI write──▶ suggested ──put into active use──▶ provisional
                                  │                                   │
                                  └───── explicit human accept ───────┴──▶ confirmed
                                                                            │
                                                          explicit adoption │
                                                                            ▼
                                                                         official
```

- Any authority → any authority is permitted **for an authorized human**.
- System/AI writes may only produce `suggested` or `provisional`.
- Editing the value of a `confirmed`/`official` entry by a human keeps authority and
  updates `setBy`/`setAt`; editing by the system **demotes to `provisional`** and
  records the change (never silently overwrites confirmed truth at its old authority).

---

## 2. Business Info — **NEW**

**Home**: `brands.business_info` JSONB (new column). **Write authority**:
`BrandRepository`.

```
BusinessInfo {
  legalName?, displayName?, tagline?, description?,
  industry?, foundedYear?,
  contact: { email?, phone?, website?, address? { line1?, line2?, city?, region?, postalCode?, country? } },
  links:   { kind: 'website'|'linkedin'|'instagram'|'x'|'facebook'|'youtube'|'tiktok'|'other',
             url: string, label? }[],
  audienceSummary?
}
```

Every field optional (FR-005/006 — never blocks). Consumed by business card,
letterhead, email signature, and invoice renderers, which today free-type these values.

**Future boundary (not built)**: People / Products / Services / Locations / Clients
become their own `brand_id`-scoped tables. This column does not change when they land.

---

## 3. Brand Library

**Home**: `public.assets` (exists) + `public.brand_folders` (new). **Write authority**:
`IAssetsService`.

### 3.1 `public.assets` — additive columns

| Column | Type | Purpose |
|---|---|---|
| `origin` | `text` default `'uploaded'` | `uploaded` \| `generated` \| `reference` |
| `folder_id` | `uuid` null, FK → `brand_folders(id)` ON DELETE SET NULL | organization |
| `is_favorite` | `boolean` default false | FR-019 |
| `is_disliked` | `boolean` default false | FR-019 + Context signal source |
| `archived_at` | `timestamptz` null | FR-020 (null = active) |
| `use_as_reference` | `boolean` default false | FR-019/FR-010 — explicit references |
| `provenance` | `jsonb` null | generative media provenance (§5) |
| `deleted_at` | `timestamptz` null | tombstone (§3.3) |
| `legacy_ref_id` | `text` null, indexed | resolves pre-migration `AssetRef.assetId` |

Existing columns (`id, brand_id, name, type, category, source, url, storage_path,
size, tags, metadata, uploaded_by, created_at, updated_at`) are unchanged.

**Constraint**: `is_favorite` and `is_disliked` are mutually exclusive (CHECK).

### 3.2 `public.brand_folders` — **NEW**

```
id uuid pk default gen_random_uuid()
brand_id uuid not null references brands(id) on delete cascade
name text not null
parent_id uuid null references brand_folders(id) on delete cascade
created_at timestamptz default now()
updated_at timestamptz default now()
unique (brand_id, parent_id, name)
```

MVP: one level of nesting is what the UI offers; `parent_id` exists because the tree
shape is free and removes a future migration. No folder permissions, no sharing.

### 3.3 Deletion & lineage (FR-020)

Deleting a Library item is a **soft delete with a minimal inert record**:

- `deleted_at` is set; the row keeps `id`, `name`, `origin` (its "tombstone" identity)
  and is removed from all Library views.
- The storage object is removed; `url`/`storage_path` are cleared.
- Existing **Work/Outputs remain intact** — constructive documents keep their resolved
  content (they never depended on a live URL for correctness), and any provenance or
  relationship pointing at the item still resolves to the tombstone rather than
  dangling.
- If the item has an Official Kit adoption, deletion is **blocked until the user is
  informed** and the adoption is removed or explicitly confirmed.

This is a tombstone, **not** versioning and **not** event sourcing: no history rows, no
prior versions, no restore-to-point-in-time. Archive (`archived_at`) is the reversible
operation; delete is one-way apart from the inert record.

---

## 4. Official Brand Kit — **NEW**

**Home**: `public.brand_kit_adoptions`. **Write authority**: a dedicated service; the
only op that creates rows requires an authorized-human actor.

```
id uuid pk default gen_random_uuid()
brand_id uuid not null references brands(id) on delete cascade
target_kind text not null check (target_kind in ('core_value','library_item','kit_deliverable'))
target_ref text not null       -- CoreFieldPath | assets.id | DeliverableKey::itemId
adopted_by uuid not null       -- the authorized human
adopted_at timestamptz not null default now()
note text null
unique (brand_id, target_kind, target_ref)
```

**Invariants**:

- **INV-6** An adoption row NEVER contains a copy of the adopted object. It is a
  reference plus adoption metadata.
- **INV-7** Removing an adoption deletes only this row; the referenced Core value,
  Library item, or deliverable is untouched.
- **INV-8** Core adoption has ONE entry point: `promoteCoreValue(…, 'official')`, which
  delegates the row to the adoption service. Adopting a `core_value` sets that path's
  authority to `official`; removing the adoption returns it to `confirmed` (never
  below — a human had confirmed it). A direct `adopt({targetKind:'core_value'})` call is
  rejected, so there is never a second way to make a Core value official.
- **INV-9** No automatic insert path exists: no trigger, no generation hook, no
  upload hook may create a row.

---

## 5. Work / Outputs

Two families, two homes, deliberately not unified.

### 5.1 Constructive outputs — `public.designs` (exists, unchanged)

`BrandOSDocument` + `DesignSummary`. Reopen-editable by construction. Owner-scoped RLS
retained for the MVP (research D10).

### 5.2 Generative media — Library items with provenance

A generated image/video is an `assets` row with `origin='generated'` and:

```
provenance: {
  kind: 'generated',
  prompt?: string,
  inputRefs?: string[],        // library item ids used as references/inputs
  contextUsed?: { core?: CoreFieldPath[], businessInfo?: boolean, contextSignals?: number },
  model?: string,
  generatedAt: string,         // ISO
  relations?: { placedInDesignIds?: string[], derivedFromAssetId?: string }
}
```

**Invariants**:

- **INV-10** Provenance is written once at creation and is immutable except for
  `relations`, which may accrue.
- **INV-11** Relationship targets that are later deleted resolve to tombstones
  (§3.3) — a work item's history never silently loses a link.
- **INV-12** Saving generated media into the Library is a **registration of the one
  canonical object**, never a copy with independent state.

---

## 6. Brand Context v1 — **NEW**

**Home**: `public.brand_context_signals`. **Write authority**: a context service
(append + delete only; no update).

```
id uuid pk default gen_random_uuid()
brand_id uuid not null references brands(id) on delete cascade
kind text not null            -- 'favorite' | 'dislike' | 'reference' | 'approval' | 'preference' | 'usage'
target_kind text null         -- 'library_item' | 'core_value' | 'design' | null
target_ref text null
value jsonb null              -- small payload (e.g. {"hex":"#123456"}), never a document
source text not null          -- 'user-action' | 'derived'
created_at timestamptz not null default now()
```

**Invariants**:

- **INV-13** Context NEVER writes to Core: no code path from this service to
  `BrandRepository`.
- **INV-14** Signals are inspectable (listable per brand) and correctable (deletable) —
  FR-013.
- **INV-15** Capture is silent: no signal write may raise a prompt, dialog, or blocking
  state.
- **INV-16** Bounded by construction: no embeddings, no vectors, no cross-brand reads
  (RLS forbids it), no scheduled recomputation.

`LocalBrandMemoryService`'s ranked colors/fonts become a **derived read** over these
signals plus designs — not a parallel store.

---

## 7. Entity relationships

```
                         ┌──────────────────────────────┐
                         │  brands (row)                │
                         │  ├── identity        (Core)  │
                         │  ├── identity_meta   (auth/prov sidecar)
                         │  └── business_info           │
                         └───────────┬──────────────────┘
                                     │ brand_id (RLS: is_brand_member)
        ┌────────────────┬───────────┼──────────────┬────────────────────┐
        ▼                ▼           ▼              ▼                    ▼
  brand_folders      assets     brand_kit_      brand_context_       designs
        │         (Library)     adoptions          signals        (constructive
        └── folder_id ─┘             │                │             outputs)
                        │            │                │
        origin: uploaded│generated│reference          │
        provenance (generative media) ────────────────┘
                        ▲            │
                        └── target_ref (reference only, never a copy)
```

**Cardinality**: one brand → one Core DNA, one Business Info, many folders, many
Library items, many adoptions, many context signals, many designs.

---

## 8. Validation summary

| Rule | Enforced where |
|---|---|
| Core schema shape | zod `canonicalBrandSchema`, extended (`src/domain/brand/invariants.ts`) |
| `CoreFieldPath` registry completeness | unit test asserting every path resolves against the identity schema |
| AI cannot promote (INV-3) | the promotion op — the only writer of `confirmed`/`official` |
| Adoption never duplicates (INV-6) | adoption service + a test asserting the row carries no payload |
| Context never writes Core (INV-13) | dependency-direction test (no import path from context service to `BrandRepository`) |
| Brand isolation | RLS `is_brand_member()` on every new table + SQL RLS tests |
| Favorite/dislike exclusivity | DB CHECK constraint |
| Work survives asset deletion (INV-11) | adapter integration test |
