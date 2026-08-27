# Phase 4 — Content Universe (Master Spec)

> **Status:** Locked specification. Read end-to-end before starting. Execute through all four sub-phases without intermediate check-ins. Stop discipline still applies for real architectural issues only.

---

## Strategic Frame

The "Templates" entry in the editor's App Rail is not just a templates library. It is the **Content Universe** — every design, template, AI-generated artifact, and AI prompt preset accessible by the user, organized by category, in one place.

This phase makes BrandingOS feel like Canva, but better — because every template is brand-aware (uses SlotRefs from `useBrandKit`), every design saves to the user's brand, and every AI-generated artifact is immediately editable inside the unified editor.

---

## What "Content" Means in Phase 4

Five content types live in the Templates panel:

1. **Pre-made templates** — designed by the BrandingOS team, curated, high-quality. Brand-agnostic via SlotRefs.
2. **AI-generated editable templates** — AI returns a `BrandOSDocument` with full layers; user can edit layer-by-layer.
3. **AI-generated rasterized images** — AI returns a single image (PNG/SVG); not editable as a design but can be remixed via prompt or used as a layer.
4. **AI prompt presets** — pre-written prompts the user can pick and customize before generating.
5. **User-uploaded templates (community)** — users upload templates, admin approves, they appear in the library.

---

## Categories (Initial Set)

These map onto existing or new `ContentTypeConfig`s:

- Social posts (Instagram post, story, reel cover, Facebook post, LinkedIn post, Twitter post)
- Presentations
- Business cards
- Invoices
- Letterheads
- Brochures (bi-fold, tri-fold)
- Posters (A3, A4, US Letter)
- Banners (Twitter header, Facebook cover, LinkedIn banner, web ads)
- Email signatures
- Profile icons (avatar, favicon)
- Brand guidelines

Add `ContentTypeConfig`s for any not yet present. Use the same `resizeStrategy` discipline from Phase 3.

The category system must be **extensible** — admin/team can add new categories without code changes (database-driven).

---

## Sub-Phase 4.1 — Templates Foundation

**Goal:** Ship the Templates panel with pre-made templates working end-to-end. User opens template → unified editor opens with brand kit applied → user can edit and save.

### Database schema

Create migration files (Supabase) for:

```sql
-- Categories
CREATE TABLE template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- 'social-posts', 'business-cards', etc.
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT, -- lucide icon name
  display_order INT NOT NULL DEFAULT 0,
  parent_category_id UUID REFERENCES template_categories(id), -- for sub-categories
  content_type_config_id TEXT NOT NULL, -- maps to ContentTypeConfig.id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates (covers all 5 content types via 'source')
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL CHECK (source IN ('curated', 'ai_editable', 'ai_rasterized', 'ai_prompt_preset', 'user_uploaded')),
  category_id UUID NOT NULL REFERENCES template_categories(id),
  document JSONB, -- BrandOSDocument; null for ai_rasterized + ai_prompt_preset
  thumbnail_url TEXT NOT NULL,
  preview_image_url TEXT, -- larger preview
  width INT NOT NULL,
  height INT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  mood TEXT, -- 'professional', 'playful', 'minimal', 'bold', etc.
  -- AI-specific fields
  prompt_text TEXT, -- for ai_prompt_preset
  prompt_system_hints TEXT, -- additional context for AI when this preset is used
  raster_image_url TEXT, -- for ai_rasterized
  -- User-uploaded fields
  uploaded_by_user_id UUID REFERENCES auth.users(id),
  upload_status TEXT CHECK (upload_status IN ('pending', 'approved', 'rejected', NULL)),
  uploaded_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  -- Visibility (used by 4.4)
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'public')),
  -- Premium fields (forward-compatibility, no UI in Phase 4)
  is_premium BOOLEAN DEFAULT FALSE,
  required_plan TEXT,
  -- Stats
  use_count INT DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX templates_category_idx ON templates(category_id);
CREATE INDEX templates_source_idx ON templates(source);
CREATE INDEX templates_tags_idx ON templates USING GIN(tags);
CREATE INDEX templates_status_idx ON templates(upload_status) WHERE upload_status IS NOT NULL;
CREATE INDEX templates_visibility_idx ON templates(visibility);
```

Apply migrations idempotently (use `DROP IF EXISTS` patterns; reference Phase 3's migration repair lessons).

### Seed data

Create seed migrations for:
- All initial categories (~12)
- 8-12 pre-made templates per category, total ~100 templates
- Each template has a real `BrandOSDocument` using SlotRefs
- Generate thumbnails server-side or via Storage upload script
- Use the existing `templateSeeds.ts` patterns from Step 9 as starting point; expand significantly

The 100-template seed is real work. Use multiple parallel agents to generate `BrandOSDocument` skeletons in parallel — one agent per category, working from a shared spec. Each generated template is reviewed for:
- Valid `BrandOSDocumentSchema` parse
- Uses SlotRefs for brand-bound properties (color, font)
- Reasonable layer composition (not just empty rectangles)
- Thumbnail generated and uploaded

### Service layer

Create `src/features/templates/services/`:

- `ITemplatesService` interface in `src/core/services/`
- `TemplatesService` implementation (real, talks to Supabase)
- Methods: `listCategories()`, `listTemplates(filters)`, `getTemplate(id)`, `searchTemplates(query, filters)`, `incrementUseCount(id)`
- Wired into the DI container at `src/core/boot.ts`
- `useTemplatesService()` hook for React access

### Templates Panel UI

Replace the "Coming in Phase 4" placeholder in the App Rail's Templates entry with the real panel.

Layout (refer to Variant 4 styling patterns from Phase 3):

```
┌─ Templates ─────────────────────────┐
│ [🔍 Search templates...]            │
│                                     │
│ Categories                          │
│ ┌─────────┬─────────┬─────────┐     │
│ │ Social  │ Print   │ Web     │ ... │
│ └─────────┴─────────┴─────────┘     │
│                                     │
│ Filters: [Source ▾] [Mood ▾]        │
│                                     │
│ Templates (grid)                    │
│ ┌────┐ ┌────┐ ┌────┐                │
│ │ T1 │ │ T2 │ │ T3 │                │
│ └────┘ └────┘ └────┘                │
│ ┌────┐ ┌────┐ ┌────┐                │
│ │ T4 │ │ T5 │ │ T6 │                │
│ └────┘ └────┘ └────┘                │
│                                     │
│ [Load more]                         │
└─────────────────────────────────────┘
```

**UI requirements:**
- Thumbnail aspect ratio matches template's actual dimensions (use Phase 3's pattern: `aspect-ratio: width/height`)
- Hover reveals: template name, mood tag, "Use this template" button overlay
- Click thumbnail or button → opens template in unified editor at `/b/:slug/design/<seeded-design-slug>`
- Filter by source (Curated / AI / Community)
- Filter by mood (multi-select)
- Search by name + tags + description
- Empty state when no results: clean message, no clutter
- Loading skeleton during fetch

Use shadcn primitives. Match the existing editor aesthetic (DM Sans, monochrome with green accent, rounded 12-16px corners).

### Open template flow

When user clicks a template:
1. Resolve current brand from URL
2. Fetch template's `document` field
3. Run `applyBrandToDocument(doc, brandKit, { mode: 'apply' })` to seed it with the user's brand
4. Persist as a new design via `IDesignsService` (which exists from Phase 3 Step 9 forward-pull)
5. Navigate to `/b/:slug/design/:newDesignSlug`
6. Increment template's `use_count`

### Tests

Three-layer rule applies. Per migration: schema test. Per service: unit + integration. Per UI: unit + browser E2E.

---

## Sub-Phase 4.2 — User Designs Persistence + "My Designs" + Save as Template

**Goal:** User can save designs, browse their saved designs, and save designs as personal templates.

### Database schema additions

```sql
-- User designs (already partially exists from Phase 3 Step 9; extend)
ALTER TABLE designs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE designs ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES templates(id);
ALTER TABLE designs ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE designs ADD COLUMN IF NOT EXISTS template_category_id UUID REFERENCES template_categories(id);
```

If `IDesignsService` doesn't have `list(brandId)` or thumbnail support, add them.

### Save flow

Already partially exists (auto-save in editor). Extend:
- Generate thumbnail on save (canvas snapshot at lower resolution, ~400px wide)
- Upload thumbnail to Supabase Storage
- Update `designs.thumbnail_url`

### "Save as template" action

In the editor's More menu (top chrome) or via a new `Templates → Save as template` flow:
- User picks: name, description, category, mood tags
- Creates a new row in `templates` table with `source = 'user_uploaded'`, `upload_status = 'approved'` (auto-approved for personal/private templates)
- Privacy field: `visibility = 'private'` (only visible to the creator); `'public'` goes through approval queue (handled in 4.4)
- The template's `document` is the current design's BrandOSDocument with SlotRefs preserved (not literals — important: run `convertToTemplate()` to convert any literal brand colors/fonts back into SlotRefs)

### "My Designs" UI

New panel/page showing the user's saved designs. Accessible from:
- Brand dashboard
- A "My Designs" tab in the Templates panel
- (Decide which is more discoverable; prefer the Templates panel tab — keeps content unified)

Same grid layout as Templates panel. Click → opens design in editor.

### Tests

Same three-layer rule. Cover save → list → reopen flow end-to-end.

---

## Sub-Phase 4.3 — AI Generation Layer

**Goal:** AI generates content directly into the Templates panel (and the editor). Three AI content types:

1. **AI editable templates** — full BrandOSDocument with layers
2. **AI rasterized images** — single PNG/SVG
3. **AI prompt presets** — saved prompts users can customize

### Wire Mode 1 (zero-state generate) from Phase 3.5

Phase 3.5 deferred Mode 1 to Phase 5; we're pulling it forward to Phase 4.3 since it's the natural home.

The AI prompt bar already supports Mode 2/3/4. Add Mode 1:
- Triggered when prompt is submitted with NO active document AND NO selection
- Or: explicitly when user clicks "Generate with AI" from the Templates panel
- AI returns a complete `BrandOSDocument` (using `kind: 'replace'` semantics)
- Justification field is auto-populated: "Mode 1 — zero-state generation"
- Document is persisted, user navigated to `/b/:slug/design/:newSlug`

### AI editable template generation flow

In the Templates panel, add a "Generate with AI" button at the top:

```
[Generate with AI]
┌─────────────────────────────────────┐
│ Describe what you want:             │
│ [Instagram post for product launch] │
│                                     │
│ Type:                               │
│ ( ) Editable design (recommended)   │
│ ( ) Image only                      │
│                                     │
│ [Generate]                          │
└─────────────────────────────────────┘
```

If "Editable design" → calls Mode 1 → returns BrandOSDocument → opens in editor.
If "Image only" → calls a new AI image generation endpoint → returns image URL → user can place as ImageLayer or download.

### AI prompt presets

Pre-written prompts that users can click and customize. Stored in `templates` table with `source = 'ai_prompt_preset'`.

Example presets:
- "Instagram post announcing a product launch"
- "5-slide pitch deck for an investor meeting"
- "Business card for a creative professional"
- "Quote post for social media"

Click preset → prefills the AI prompt input → user edits → submits → generates.

Seed ~20-30 presets at launch, distributed across categories.

### AI image generation

Backend: new Supabase Edge Function `ai-generate-image`. Uses an image generation API (whichever Anthropic-compatible or fallback service is configured). Returns image URL stored in Supabase Storage.

Mock mode same pattern as Phase 3.5: when no API key, return a placeholder image with descriptive text overlaid.

### Tests

Same three-layer rule. Negative-path tests for AI failures, image gen failures, mock mode.

---

## Sub-Phase 4.4 — Community Templates

**Goal:** Any user can upload a template; admin approves; approved templates appear in the global library.

### Upload flow

In the editor's More menu (extend "Save as template" from 4.2):
- New option: "Submit to community library"
- Sets `templates.visibility = 'public'` and `templates.upload_status = 'pending'`
- User fills additional metadata: name, description, category, tags, mood
- Optional: usage license (CC0, CC-BY, proprietary)

### Admin approval queue

New admin route `/admin/templates/queue`:
- Lists all pending templates
- Each shows: thumbnail, name, uploader, category, full preview
- Admin actions: Approve, Reject (with reason), Edit metadata
- On approve: `upload_status = 'approved'`, template becomes visible in library
- On reject: notify user (Sonner or email), include reason

### Permissions / Auth

- Uploaders must be authenticated
- Admin role check: add `is_admin` field to user profile, gate admin routes
- Only original uploader can edit/delete their pending template
- Rejected templates can be resubmitted (reset to pending)

### Community filter in Templates panel

Add to the existing source filter (from 4.1):
- Curated (BrandingOS team)
- AI Generated
- Community (users)
- My Designs (current user only)

Default view shows all sources mixed; user can filter.

### Premium foundations (forward-compatible, no UI yet)

- `is_premium` and `required_plan` fields exist (from 4.1 schema)
- No paywall UI in this phase — just structure
- Phase 5+ will add the points/earnings system; we just don't paint ourselves into a corner

### Tests

Same three-layer rule. Cover upload → approval queue → approval → visibility flow. Include negative paths: rejected templates, unauthorized access.

---

## Cross-Phase Discipline

### Stop discipline (unchanged)
Stop only on:
- Real architectural issues
- Pre-existing bugs in Phase 3 code that surface during work
- Scope ambiguity that requires Hamza's decision

For everything else (naming, file organization, refactoring opportunities), use judgment.

### Test discipline (unchanged)
Three-layer rule per commit. Negative paths covered. Don't conflate test types.

### Migration discipline
Idempotent migrations only (`DROP IF EXISTS` first). Reference Phase 3's migration repair lessons.

### Performance discipline
Templates panel loads ~100 templates initially. Pagination or virtualization for any list >50 items. Thumbnail loading is lazy.

### Brand context discipline
The Templates panel respects the editor's brand context — every template, when opened, is seeded with the active brand's BrandKit.

### Date-stamped notes
Per Phase 3 retrospective lesson, every absorption note or deferred-decision note in docs gets a date stamp.

---

## Parallel Execution Strategy

For the heavy lifting (specifically: 100-template seed creation in 4.1 + 20-30 prompt presets in 4.3), use parallel agent dispatch where it accelerates work:
- One sub-agent per category for template seed creation
- One sub-agent for thumbnail generation pipeline
- Main agent reviews outputs and integrates

Don't fan out for everything — the cost-benefit ratio matters (Step 9 retrospective lesson). Use parallel agents only where work is genuinely parallelizable and where serial would significantly bottleneck the phase.

---

## Reporting Cadence

Single milestone report per sub-phase. Four reports total across Phase 4:

1. **After Sub-Phase 4.1 ships:** Templates Foundation done. Categories live. ~100 templates seeded. Templates panel UI working. Open-template flow end-to-end. Tests green. [Stats: commits, files touched, tests added.]
2. **After Sub-Phase 4.2 ships:** Designs persistence + My Designs + Save as template all working. [Stats.]
3. **After Sub-Phase 4.3 ships:** AI generation layer (Mode 1 + AI editable + AI rasterized + prompt presets) all working. [Stats.]
4. **After Sub-Phase 4.4 ships:** Community templates + admin approval queue + premium foundations all working. **Phase 4 retrospective:** total commits, total tests delta, debt incurred, things you'd do differently, ready for Phase 5.

No mid-sub-phase check-ins unless stop discipline triggers.

---

## When everything lands

Phase 4 ships the BrandingOS content universe. Users can:
- Browse 100+ pre-made templates organized by category
- Generate new content with AI (editable or rasterized)
- Save their own designs and reuse them as personal templates
- Submit templates to the community library
- Browse and use community-approved templates
- Filter by source, mood, category
- Open any template into the unified editor with brand kit applied
- Edit any layer in any template

This is the Canva-killer phase. Execute it well.

---

## Execution

Greenlit. Begin with Sub-Phase 4.1 — Database schema first, then seed data, then services, then UI. Run the chain through 4.1 → 4.2 → 4.3 → 4.4 without stopping for milestones except as specified above.
