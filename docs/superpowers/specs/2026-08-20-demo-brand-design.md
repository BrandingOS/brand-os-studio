# Demo brand — every new account starts with BrandingOS

**Status:** design approved 2026-08-20, not yet implemented
**Owner decision:** the demo brand is a NORMAL BRAND IN THE DATABASE. Not a
fixture, not a seed merge, not a special case anywhere in the client.

---

## 1 · The problem

A new account's dashboard is empty. `brands.supabase.ts:list()` deliberately
excludes seed brands — *"they must not appear as user-owned records (Batch C /
C5)"* — so an authenticated user sees nothing at all until they build a brand
from scratch. There is no way to see what the product does before committing
your own material to it.

The five seed brands (Raqm, SKAM, Vector, Uniex, Meridian) do not solve this.
They are merged at read time and are **structurally undeletable** —
`brands.local.ts:137` refuses to delete them by design. A demo the user cannot
remove is worse than no demo.

## 2 · What we are building

Every new account is given **BrandingOS** — the product's own brand — as an
ordinary brand row it owns. The user can open it, edit it, export it, generate
from it, and delete it, and every one of those behaves exactly as it would for a
brand they created themselves. There is no demo mode and no demo code path.

The brand a new user receives is a **copy of a template brand that lives in the
database**. Changing what new users get is editing that brand in the app.

## 3 · Architecture

### 3.1 The template is a flagged brand row

```sql
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS is_demo_template boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS brands_one_demo_template
  ON public.brands ((true)) WHERE is_demo_template;
```

The partial unique index enforces **at most one template**, so "which brand do
new users get" can never become ambiguous.

The template is a real brand. It is openable at `/b/<its-slug>/setup`, editable
through Setup, Identity, Brand Kit and the Guideline builder like any other. It
is owned by the platform account.

### 3.2 Cloning is column-agnostic

`public.clone_demo_brand(target_user uuid) RETURNS uuid`, `SECURITY DEFINER`,
`SET search_path = ''` — the pattern established by migration 027.

The clone does **not** enumerate columns. It round-trips each row through
`to_jsonb` with an overrides object and `jsonb_populate_record`:

```sql
INSERT INTO public.brands
SELECT * FROM jsonb_populate_record(
  NULL::public.brands,
  to_jsonb(t) || jsonb_build_object(
    'id',               new_brand_id,
    'user_id',          target_user,
    'workspace_id',     target_workspace,
    'slug',             new_slug,
    'is_demo_template', false,
    'created_at',       now(),
    'updated_at',       now()
  )
)
FROM public.brands t
WHERE t.is_demo_template;
```

**This is the load-bearing decision.** A column added to `brands` next month is
copied with no change to this function. Enumerating columns would mean every
future migration silently drops a field from every new user's demo brand, and
nobody would notice until a user asked why their demo has no typescale.

The same shape copies the child rows, in this order:

| # | table | id handling | other remaps |
|---|---|---|---|
| 1 | `brand_folders` | new ids, **two passes** (see below) | `brand_id` |
| 2 | `assets` | new ids | `brand_id`, `folder_id` → new folder id |
| 3 | `designs` | `id` is TEXT and PK is `(brand_id, id)`, so **keep it** | `brand_id`, `user_id`, `folder_id` |

**Folders need two passes.** `parent_id` points at another row in the same
table, and `brand_folders` carries a composite FK asserting a parent belongs to
the same brand. Insert every folder with `parent_id = NULL` first, then a single
`UPDATE … FROM` mapping old→new. One pass with a correlated subquery would
depend on insertion order, which is not guaranteed.

The old→new id map is a `jsonb` object built as we go, so no temp table is
needed and the function stays a single statement per table.

### 3.3 The trigger

```sql
CREATE TRIGGER on_auth_user_created_demo_brand
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.give_new_user_demo_brand();
```

**Trigger name ordering is load-bearing.** Postgres fires `AFTER INSERT` row
triggers in alphabetical order by name. The existing trigger is
`on_auth_user_created` (migration 001), which creates the profile and the
workspace. `on_auth_user_created_demo_brand` sorts after it, so the workspace
the clone assigns exists by the time we run. Renaming either trigger breaks
this silently.

`give_new_user_demo_brand()` **must never fail the signup.** It wraps the clone
in `BEGIN … EXCEPTION WHEN OTHERS THEN RAISE WARNING … END`. A malformed
template, a missing workspace or a slug collision must cost the user their demo
brand, never their account. This is the single most important line in the
migration.

`clone_demo_brand` returns `NULL` and does nothing when no template row exists,
so deleting the template turns the feature off cleanly.

### 3.4 Slug collisions

`brands_set_slug` (migration 001) generates slugs. The clone assigns
`brandingos`, `brandingos-2`, … by counting existing matches. Slugs are global,
not per-user, so this must be a real uniqueness check rather than a constant.

### 3.5 Deleting stays deleted — for free

The trigger runs once, at signup, and never again. There is **no marker, no
provisioning check, no re-seed loop, and nothing to un-stick.** Deleting the
demo brand is `brands.delete(id)` and it is gone. This is the main thing putting
the copy in the database buys us; an earlier client-side design needed a
`dismissed.demoBrandProvisioned` preference to achieve the same effect, and that
preference is now unnecessary.

### 3.6 Backfill for existing accounts

One statement at the end of the migration gives the demo to every user who
currently has **zero** brands. Accounts with real brands are left untouched —
they have already made their own, and a surprise extra brand in a working
account is a support ticket, not a feature.

## 4 · What the template brand contains

Built from the product's own real identity. Nothing is invented.

| | Source in this repo |
|---|---|
| **Mark** | `src/shared/ds/BrandMark.tsx` — eight ring dots + centre, exact path data on a 113×113 viewBox |
| **Colours** | `src/shared/ds/tokens.json` — Warm Cream `#F5F4EF`, Warm Charcoal `#111113`, Ink `#0E0E0E`, semantic four, warm neutral ramp |
| **Type** | Plus Jakarta Sans (`--ds-font`), with the DS ladder as the typescale |
| **Positioning** | `index.html` — *"One setup. Infinite branded possibilities."* |
| **Voice** | The DS's own binding rules, restated as brand voice |

### 4.1 Logo files

Six SVGs generated from `BrandMark`'s path data, committed to
`public/brands/brandingos/` as **static product assets**: icon, horizontal
lockup, stacked lockup, wordmark, mono black, mono white. They fill six roles in
`logoSystem`.

Every clone references the same paths, so nothing is duplicated per user, and
moving them to Supabase Storage later is an `UPDATE` on the template's rows.

**The wordmark must be outlined, not `<text>`.** A copy of Plus Jakarta Sans is
at `archive/Brands/vector/fonts/Plus_Jakarta_Sans.zip`; outline it once with
fontTools at authoring time and commit the paths. An SVG rasterized through
`<img>` (which is how every export path works) cannot see the page's webfonts
and falls back to a system sans — the same class of bug as the blank-logo defect
found in the Brand Kit export on 2026-08-20.

### 4.2 Two asset projections, both kept internally consistent

`brands.brand_assets` (JSONB on the row, what `resolveBrandLogo` reads through
`logoSystem` refs) and the `assets` table (what `useAssetLibrary` reads) are
separate projections. The clone copies the JSONB **verbatim** — asset ids inside
it are only meaningful within their brand, so leaving them unchanged keeps every
`logoSystem` ref resolving — while the `assets` rows get fresh ids. Neither
projection references the other's id space.

## 5 · Staged content

The answer to "how much is pre-filled" was **everything, fully staged**. Split
by what the database can hold:

### 5.1 In the database, cloned by the function

Library assets, the folder tree (Library · Designs · Kit over one shared tree),
and saved designs. `SupabaseDesignStorage` already exists, so design bodies are
`designs.data` rows and copy like anything else.

### 5.2 Not in the database, derived on the client

Kit lifecycle state (`brandos:brand-kit:state`) and guideline documents
(`brandos:guideline:docs` + IndexedDB page snapshots) have **no table — for any
brand, not just this one.** They cannot be cloned by SQL because they are not in
SQL.

So they are *derived*, once per browser, by calling the product's own
generators against the cloned brand:

| surface | generator that already exists |
|---|---|
| Guideline, 30 pages | `features/guideline/model/document.ts → buildDefaultDocument(brand, now)` |
| Brand Kit, 4 approved deliverables | `features/brand-kit/kit/generation.ts → defaultKitGenerator` |

Rules for this top-up:

- It runs only when the brand exists **and** its local document is absent. It
  never overwrites anything the user has touched.
- It is not a fixture. Nothing is hand-authored, so when the guideline builder
  or the kit generator changes, the demo changes with them instead of rotting
  into a broken snapshot.
- Deleting the brand removes the reason for it to run at all, and the local keys
  are cleaned up on delete.
- **Known limitation, stated plainly:** a user who signs in on a second device
  gets the brand, its assets, folders and designs, but the kit and guideline
  staging regenerate there rather than travelling. That is a property of those
  two stores, not of this feature.

## 6 · The five existing seed brands

`list()` and the local merge stop injecting Raqm, SKAM, Vector, Uniex and
Meridian. They stay in `src/data/brands/` as fixtures and stay reachable by
direct URL through `getById` / `getBySlug`, so tests and dev demos keep working.

A guest who has been editing one locally loses it from their list; their
`seedBrandOverrides` are not destroyed.

## 7 · Guest and dev-bypass mode

A database trigger cannot reach a visitor who never authenticates, and
dev-bypass deliberately keeps every service local.

**Decision: guests get an empty dashboard and a sign-up prompt** — *"Sign up
free and we'll set you up with a demo brand to explore."* The demo lives in
exactly one place, and being given one becomes a reason to create an account
rather than something to look at without one.

## 8 · Telling the user it is a demo

A **Demo** badge on the dashboard card, and one dismissible line: *"BrandingOS
is a demo brand so you can see how everything works. Delete it whenever you
like."* Dismissal goes in the existing `dismissed` bag in `user_preferences`.

Nothing else differs. It behaves exactly like a real brand, which is the point.

## 9 · Changing or removing it later — no deploy

| you want to | you do |
|---|---|
| change what new users get | open the template brand in the app and edit it |
| stop giving it to new users | `UPDATE brands SET is_demo_template = false` |
| remove it entirely | delete the row — `clone_demo_brand` no-ops with no template |
| move logos to Storage | `UPDATE` the template's asset rows |
| hand the template to someone else | `UPDATE brands SET user_id = …` |

None of these is a code change. That was the requirement.

## 10 · Testing

**SQL (`supabase/tests/`)**
- cloning twice yields two independent brands; editing one does not touch the other
- a folder tree three levels deep survives with parents intact
- `assets.folder_id` and `designs.folder_id` point at the *clone's* folders
- a column added to `brands` after the function was written is still copied
- a deliberately broken template raises a warning and **the signup still succeeds**
- no template row → function returns NULL, signup succeeds, user has zero brands
- the partial unique index refuses a second template

**Unit**
- the derived top-up is idempotent, and never overwrites an existing local doc
- deleting the brand cleans up its kit and guideline keys
- the cloned brand passes `assertCanonicalBrand` — `z.date()` vs the ISO strings
  a JSON round-trip produces (the `fromLegacyBrand.toDate()` boundary)

**Browser**
- fresh account → exactly one dashboard card, badged Demo
- Setup shows every section filled; Brand Kit shows four approved; Guideline
  opens a built book; Design shows the seeded designs; Folders shows Library,
  Designs and Kit populated
- delete → gone → reload → still gone

## 11 · Risks

| risk | mitigation |
|---|---|
| trigger failure blocks signup | exception-wrapped; a lost demo brand never costs an account |
| trigger ordering silently breaks | named to sort after `on_auth_user_created`; asserted in the SQL tests |
| slug collisions across users | real uniqueness check, not a constant |
| a future `brands` column is dropped from clones | `jsonb_populate_record`, plus a test that adds a column and re-clones |
| migration 020 dropped demo brand grants | verify no policy conflicts before deploying |
| the template gets edited into a bad state | it is a normal brand; fix it the same way |

## 12 · Out of scope

Kit state and guideline documents becoming database tables. That would make the
staging travel between devices and is worth doing on its own merits — but it is
a change to how those two subsystems persist for *every* brand, not part of this
feature.

---

## 13 · What shipped, and where it differs from the design above

Implemented 2026-08-20. Four things changed once the code met the schema.

**`is_demo` joined `is_demo_template`.** The design had one flag. The copies
needed one too — for the badge, and so these rows can be found later. It is
presentation only; nothing branches on it, and the Supabase update path is an
explicit allowlist so it stays server-owned by construction.

**The slug is not chosen by the clone.** `brands_set_slug` (migration 001) fires
`BEFORE INSERT` and regenerates the slug whenever it is null, appending `_2`,
`_3` … until it is unique. The clone therefore sets `slug` to NULL and lets the
existing trigger own uniqueness — one less place that has to agree about it. The
design's hand-rolled collision loop was deleted.

**`INSERT ... SELECT * FROM f(...) FROM t` does not parse.** Two `FROM` clauses.
The row has to drive and the record-builder has to be a `CROSS JOIN LATERAL`.
Caught by running the migration, not by reading it.

**The guest empty state was unreachable and is gone.** `/dashboard` and
`/dashboard/brands` are both behind `ProtectedRoute`, so a signed-out visitor is
redirected to `/login` and never reaches a dashboard empty state at all. The
decision in §7 still holds — a guest gets nothing until they sign up — but the
place to say so is the sign-up form, which is where a signed-out visitor stands.
The dashboard keeps a single empty state, now only reached by an account that
deleted what it was given.

### Testing as built

`supabase/tests/run.sh` stands up a throwaway Postgres, stubs the Supabase
objects the migrations assume (`_supabase_stub.sql`), runs the REAL migration
files in order, then asserts. 34 assertions, all passing, including:

- a signup survives a deliberately broken template, and simply gets no brand
- a column added to `brands` after the function was written is still cloned
- a three-level folder tree keeps its parents, and every parent stays inside the clone
- an unfiled asset stays unfiled
- deleting one user's demo leaves another's untouched, and it does not come back
- a second template is refused by the partial unique index

Client: `brands.local.test.ts` (6) pins the listed-vs-resolvable split;
`stageDemoContent.test.ts` (6) pins that staging never overwrites existing work,
including a kit the user emptied on purpose. Full unit suite 2566 green, lint 0
errors, typecheck ratchet clean.

### Still open

- **Deploy.** Migrations 029–033 are unpushed. 033 is the fifth in that queue.
- **`visualStyle.descriptors` is empty on the template.** The eleven strategy
  answers come through the legacy `guidelines.*` path, which `fromLegacyBrand`
  derives identity from — the same path every seed brand proves works. Visual
  style has no legacy home, and hand-writing an `identity` blob in SQL risks a
  zod-validated shape for one field. Fill it by opening the template in the app,
  which is the workflow this design is built around.
- **The centre dot of the mark is 0.9 opacity** in the generated logo files,
  faithful to `BrandMark`. At logo scale it reads as a lighter core rather than
  a refinement. Kept for fidelity; say the word and the generator can render it
  solid.
