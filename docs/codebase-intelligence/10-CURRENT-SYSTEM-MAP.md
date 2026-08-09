# 10 — Current System Map

> Consolidated from audits 00–09. This is the architecture that **exists on 2026-08-08**
> (baseline `new-ui` @ `46ffb41`), not a desired architecture. Every box below is backed
> by the referenced audit doc; nothing here is aspirational.

## 1. Whole-system map

```mermaid
flowchart TB
  subgraph SURF["Product surfaces (01, 02)"]
    LP["landingpage/ — separate Vite deploy"]
    IDX["/ — domains/landing (SPA public landing)"]
    ONB["/onboard-brand — features/onboarding-v4 (LIVE onboarding; 4 legacy URL shims redirect here)"]
    WS["/dashboard — WorkspaceShellAlt brands grid"]
    STU["/b/:slug Studio — WorkspaceShell, 5 tabs + ~18 fullscreen surfaces"]
    CLA["/a/:slug Classic — AppRail, frozen; fallback target for unported /b paths"]
    EDT["Editors: unified features/editor · frozen shared/editor deck engine · legacy OptimizedDesignEditor · Chronicle guideline"]
    TOOLS["/tools public + /b/:slug/tools hub"]
    ADM["/admin (user_roles-gated) · stale /dashboard/admin/* (auth-only)"]
    DEV["/_dev/* + ?dev=1 feature flags"]
  end

  subgraph STATE["Client state (03, 04)"]
    ZS["~26 zustand persist stores (brandos:* keys)"]
    BS["brandStore"] ; SS["sessionStore"] ; WST["workspaceStore"]
  end

  subgraph DI["DI container — src/core/boot.ts (04)"]
    K1["BRANDS: Local → Supabase on auth"]
    K2["WORKSPACES: Local → Supabase on auth"]
    K3["DESIGN_STORAGE / UPLOAD / TEMPLATES: **Local always, even authed** (boot.ts:98,102)"]
    K4["ASSETS/COMMENTS/APPROVALS/NOTIFICATIONS/ACTIVITY Supabase adapters: registered, **zero consumers**"]
  end

  subgraph PERSIST["Persistence (04, 05, 06)"]
    LS["localStorage — designs, templates, decks, comments, approvals, uploads, guest brands"]
    SB["Supabase Postgres — brands (13-col whitelist + guidelines JSONB = de-facto rich brand), workspaces, profiles, user_roles, subscriptions…"]
    ST["Storage bucket brand-assets (direct client access, bypasses DI)"]
  end

  subgraph EXT["External services (03, 04, 07)"]
    ANT["api.anthropic.com — **called directly from browser** (6 sites, VITE key)"]
    BV["brand-vision Python @ localhost:8300 — dev-machine dependency, silent fallback"]
    EF["Edge Functions: ai-generate-image (openai→fal→pollinations), apply-command, stripe fns; 4 orphans"]
  end

  SURF --> STATE --> DI --> PERSIST
  ONB --> BV
  ONB --> ANT
  EDT --> EF
  EDT --> ANT
  DI -.->|"only brands+workspaces round-trip"| SB
  STATE -.->|"most features"| LS
  SURF -.-> ST
```

Key structural facts (all VERIFIED in the cited audits):

- **Two persistence worlds.** Only brands + workspaces reach Supabase for authenticated
  users; designs, templates, uploads, decks, comments, approvals live in localStorage for
  everyone (04 §DI-reality, 03 §3). Public share routes (`/d/…`, bento) therefore only
  resolve in the creator's browser (03 §10).
- **The backend is one architecture ahead of the client**: tables + adapters exist for the
  localStorage-only features, registered in DI but never consumed (03, 06 §10).
- **The rich brand is `brands.guidelines` JSONB**, not the "canonical" v3 fields; v3 is
  re-derived per load by `migrateBrandToCurrent` (05 §2–4).

## 2. Brand data — representations and flow

```mermaid
flowchart LR
  subgraph WRITE["Writers"]
    OB["onboarding-v4 (writes legacy fields + guidelines mirror + v3 typography w/ string weights)"]
    SU["Setup page (writes primary_color, NOT guidelines mirror → stale loop)"]
    BK["brand-kit card editor / color+icon adds — session-only, never persisted (03, 04)"]
  end

  subgraph STORE["brandStore"]
    CUR["brand (v3 shape, in memory)"]
  end

  subgraph PERSISTB["Persistence split"]
    L["localStorage brandos:brands — FULL object (guest + seed edits)"]
    S["Supabase brands row — 13-col whitelist; drops assets/neutrals/typography/typescale; guidelines JSONB carries the rest"]
  end

  subgraph READ["Readers / derivers"]
    MIG["migrateBrandToCurrent — always runs, derives v3 from legacy+JSONB"]
    MOCK["brandToMockBrand → Setup/brand-kit UI (reads 5 nonexistent fields)"]
    KIT["brandToBrandKit (zod, sanitizeWeights patch 46ffb41)"]
    PAL["buildBrandPalette / logoOnBackground / recolorLogo"]
  end

  OB --> CUR ; SU --> CUR ; BK -. session-only .-> CUR
  CUR --> L ; CUR -->|whitelist| S
  L --> MIG ; S --> MIG
  MIG --> MOCK ; MIG --> KIT ; MIG --> PAL
```

Divergence points (05): whitelist drop (CRITICAL), stale `primary_color` vs
`guidelines.colorPalette` loop, string-vs-number font weights (producer still writes
strings), voice written to `voiceAndTone.voice` but read from `guidelines.voice`, logo
slot vocabularies with a polarity flip between resolvers.

## 3. Assets

```mermaid
flowchart LR
  U1["onboarding-v4 uploads"] -->|data-URLs embedded in brand JSON| BJ["brand object (localStorage-quota-aware)"]
  U2["DAM (/b/:slug/folders)"] -->|direct storage.supabase singleton, bypasses DI| BKT["bucket brand-assets"]
  U2 -->|metadata into brand.assets| WL["Supabase whitelist DROPS assets → orphaned storage objects (authed)"]
  U3["AssetSourcePopover / AssetPicker / useUpload / useAssetUpload — 3+ competing 'canonical' pickers (07)"] --> U2
  X1["assets table + SupabaseAssetsService"] -. zero consumers (06) .-x U2
  X2["onboarding-scratch bucket + finalize-onboarding-assets edge fn"] -. orphaned; fn has NO auth (06) .-x U1
```

## 4. Authentication & permissions

```mermaid
sequenceDiagram
  participant UI as AuthModal
  participant SB as supabase.auth
  participant SS as sessionStore
  participant AU as useAuth listener
  participant DI as reconfigureForAuth
  UI->>SB: signInWithPassword
  UI->>SS: signIn(user) — synchronous seed (guard race)
  SB-->>AU: SIGNED_IN
  AU->>DI: reconfigureForAuth(true) — swaps BRANDS+WORKSPACES only
  AU->>AU: localStorage.removeItem('brandos:brands')  %% :296 — WIPE
  AU->>AU: brandStore.loadAll / workspaceStore.loadAll
  AU->>AU: migrateLocalStorageToSupabase()  %% :307 — reads the wiped key → data loss (04, 06)
```

- Roles: `user_roles.role` → platformRole → `/admin` + ~18 RLS policies; `profiles.is_admin`
  → `useIsAdmin` → templates queue. No writer for `is_admin` exists; column possibly never
  deployed (06 §9, 05 §10).
- RLS holes verified: `wm_insert_admin` self-owner insert into any workspace;
  `profiles_select_by_member USING (true)`; era-1 demo brand updatable by all (06 §5).
- Dev-bypass login is compile-time gated (`import.meta.env.DEV`) — cannot ship (04 §2).

## 5. Design / editor system

```mermaid
flowchart TB
  subgraph CURRENT["Unified editor — features/editor (43 importers, active)"]
    EC["EditorChrome + panels"] --> AD["adapters (Fabric.js)"] --> ASV["useAutoSave"] --> IDS["IDesignStorage → LocalDesignStorage ALWAYS (boot.ts:98)"]
    AI1["AI prompt bar → apply-command / ai-generate-image edge fns (real vendors)"]
  end
  subgraph FROZEN["Gen-A deck engine — shared/editor EditorWorkspace (23 importers, frozen, load-bearing)"]
    SM["social-media"] ; LPz["logo-presentation"] ; BLK["blocks"] ; PRS["shared/presentation"]
  end
  subgraph DECKS["Deck engines ×4 (no winner decided)"]
    CSD["case-study-deck"] --> PD["pitch-deck (15 imports into CSD)"]
    V2["presentation-v2 / deck-v2"] ; V1["shared v1"]
  end
  subgraph LEGACY["Legacy carve-out"]
    ODE["/editor/design/:slug OptimizedDesignEditor → ExportDialog → vectorize/* (stable/editable-export-v1)"]
  end
  CHR["Chronicle guideline editor (/b/:slug/guideline) — CURRENT, imports shared/editor pieces"]
  IDS --> LSK["localStorage brandos:design:* — single-device, breaks /d/ share links"]
```

Note: `EditorWorkspace` has exactly one implementation (`shared/editor/EditorWorkspace.tsx:177`);
`features/guidelines/editor` re-exports it (corrected in 03/07). The real naming trap is
`WorkspaceShellAlt.tsx` exporting a component named `WorkspaceShell`.

## 6. What "current" means per layer (synthesis)

| Layer | Current (active frontier) | Frozen but load-bearing | Legacy/orphaned |
|---|---|---|---|
| Onboarding | `features/onboarding-v4` + brand-vision | — | 4 URL shim families; v3 scratch backend |
| Workspace | `/dashboard` brands grid | WorkspaceShellAlt | orphaned `pages/dashboard` v5 chain |
| Brand home | Studio `/b/:slug` | Classic `/a/:slug` (fallback) | `/dashboard/brand/:slug` redirects |
| Brand kit | `features/brand-kit` (Studio) | `features/brandkit` domain layer (45 importers); `brand-kit-alt` (load-bearing in Studio settings!) | — |
| Guidelines | Chronicle (`features/guideline`) | legacy `features/guidelines` hub/canvas (Supabase-backed!) | brand-guides deck; blocks (UNKNOWN) |
| Editor | unified `features/editor` | `shared/editor` deck engine; vectorize export | OptimizedDesignEditor route |
| Decks | — (no winner) | all 4 engines frozen since 2026-05-19 | — |
| Persistence | Supabase: brands+workspaces only | localStorage: everything else | 6 zero-reader tables; 5 unconsumed adapters; 4 orphan edge fns |
| Auth | supabase.auth + sessionStore | user_roles RBAC | profiles.is_admin (no writer) |
