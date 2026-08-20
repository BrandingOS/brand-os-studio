-- ════════════════════════════════════════════════════════════════════════════
-- 033 — every new account starts with a demo brand
-- ════════════════════════════════════════════════════════════════════════════
--
-- A new account's dashboard is empty. Seed brands do not solve that: they are
-- merged at read time and are structurally UNDELETABLE (brands.local.ts refuses
-- by design), and a demo the user cannot remove is worse than no demo.
--
-- So the demo is an ordinary brand row that the user OWNS. One brand in this
-- table is flagged as the template; every new user gets a copy of it, made
-- here, in SQL. The copy is a normal brand in every respect — editable,
-- exportable, and deletable like any other.
--
-- The consequence worth naming: because the copy happens once, at signup, and
-- never again, "deleted stays deleted" needs no marker, no provisioning check
-- and no re-seed loop. There is simply nothing that would ever run a second
-- time.
--
-- Changing what new users get is not a deploy:
--
--   change the demo         open the template brand in the app and edit it
--   stop giving it out      UPDATE brands SET is_demo_template = false
--   remove it entirely      delete the row; clone_demo_brand() then no-ops
--   hand it to someone      UPDATE brands SET user_id = <them>


-- ─── 1. Flags ───────────────────────────────────────────────────────────────

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS is_demo_template boolean NOT NULL DEFAULT false,
  -- Set on the COPIES, so a demo brand can be recognised after the fact —
  -- for a badge in the UI, and so these rows can be found later. It is never
  -- read to decide behaviour: a demo brand behaves exactly like a real one.
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- At most one template, ever. "Which brand do new users get" must not be a
-- question with two answers.
CREATE UNIQUE INDEX IF NOT EXISTS brands_one_demo_template
  ON public.brands ((true)) WHERE is_demo_template;


-- ─── 2. The clone ───────────────────────────────────────────────────────────
--
-- SECURITY DEFINER because it reads a row owned by someone else and writes
-- rows for a user who has no session yet.
--
-- It does NOT enumerate columns. Every row round-trips through `to_jsonb`
-- with an overrides object and back via `jsonb_populate_record`, so a column
-- added to `brands` next month is copied with no change here. Listing columns
-- would mean every future migration silently drops a field from every new
-- user's demo brand, and nobody would notice until someone asked why theirs
-- has no typescale.

CREATE OR REPLACE FUNCTION public.clone_demo_brand(target_user uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  tpl          public.brands%ROWTYPE;
  new_brand_id uuid := gen_random_uuid();
  target_ws    uuid;
  folder_map   jsonb := '{}'::jsonb;   -- old folder id (text) -> new folder id
  f            public.brand_folders%ROWTYPE;
  new_fid      uuid;
BEGIN
  SELECT * INTO tpl FROM public.brands WHERE is_demo_template LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;                       -- no template: the feature is off
  END IF;

  -- A workspace if the user has one. `brands.workspace_id` is nullable and a
  -- directly-owned brand legitimately has none (see 026), so NULL is a valid
  -- outcome rather than a failure — which is what lets this run at signup,
  -- before any workspace exists.
  SELECT w.id INTO target_ws
    FROM public.workspaces w
   WHERE w.owner_id = target_user
   ORDER BY w.created_at
   LIMIT 1;

  -- ── the brand ──
  -- slug is set to NULL deliberately. `brands_set_slug` (migration 001) fires
  -- BEFORE INSERT and regenerates the slug whenever it is null, appending
  -- _2, _3 … until it is unique. Slugs are global, not per-user, so letting
  -- the existing trigger own uniqueness is both correct and one less place
  -- that has to agree about it.
  INSERT INTO public.brands
  SELECT * FROM jsonb_populate_record(
    NULL::public.brands,
    to_jsonb(tpl) || jsonb_build_object(
      'id',               new_brand_id,
      'user_id',          target_user,
      'workspace_id',     target_ws,
      'slug',             NULL,
      'is_demo_template', false,
      'is_demo',          true,
      'created_at',       now(),
      'updated_at',       now()
    )
  );

  -- ── folders, in two passes ──
  -- `parent_id` points at another row in this table, and a composite FK
  -- asserts a parent belongs to the same brand. Insert flat first, then wire
  -- the parents up: a single pass with a correlated subquery would depend on
  -- insertion order, which is not guaranteed.
  FOR f IN SELECT * FROM public.brand_folders WHERE brand_id = tpl.id LOOP
    new_fid := gen_random_uuid();
    folder_map := folder_map || jsonb_build_object(f.id::text, new_fid);
    INSERT INTO public.brand_folders (id, brand_id, name, parent_id, created_at, updated_at)
    VALUES (new_fid, new_brand_id, f.name, NULL, now(), now());
  END LOOP;

  FOR f IN
    SELECT * FROM public.brand_folders
     WHERE brand_id = tpl.id AND parent_id IS NOT NULL
  LOOP
    UPDATE public.brand_folders
       SET parent_id = (folder_map ->> f.parent_id::text)::uuid
     WHERE id = (folder_map ->> f.id::text)::uuid;
  END LOOP;

  -- ── library assets ──
  -- LATERAL, not `SELECT * FROM f(...) FROM t` — that is two FROM clauses and
  -- does not parse. The row has to be the driver and the record-builder the
  -- join.
  INSERT INTO public.assets
  SELECT r.*
    FROM public.assets a
    CROSS JOIN LATERAL jsonb_populate_record(
      NULL::public.assets,
      to_jsonb(a) || jsonb_build_object(
        'id',          gen_random_uuid(),
        'brand_id',    new_brand_id,
        -- `->` yields SQL NULL for an absent key, which becomes JSON null and
        -- then a NULL column: an unfiled asset stays unfiled.
        'folder_id',   folder_map -> a.folder_id::text,
        'uploaded_by', target_user,
        'created_at',  now(),
        'updated_at',  now()
      )
    ) AS r
   WHERE a.brand_id = tpl.id;

  -- ── designs ──
  -- `designs.id` is TEXT and the primary key is (brand_id, id), so the id
  -- carries over unchanged; only the brand and the owner move.
  INSERT INTO public.designs
  SELECT r.*
    FROM public.designs d
    CROSS JOIN LATERAL jsonb_populate_record(
      NULL::public.designs,
      to_jsonb(d) || jsonb_build_object(
        'brand_id',   new_brand_id,
        'user_id',    target_user,
        'folder_id',  folder_map -> d.folder_id::text,
        'created_at', now(),
        'updated_at', now()
      )
    ) AS r
   WHERE d.brand_id = tpl.id;

  RETURN new_brand_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.clone_demo_brand(uuid) FROM public, anon, authenticated;


-- ─── 3. The trigger ─────────────────────────────────────────────────────────
--
-- THIS MUST NEVER FAIL THE SIGNUP. A malformed template, a constraint we did
-- not anticipate, or a missing table must cost the user their demo brand —
-- never their account. That is the entire reason for the exception block.

CREATE OR REPLACE FUNCTION public.give_new_user_demo_brand()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  BEGIN
    PERFORM public.clone_demo_brand(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '033: demo brand not created for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$fn$;

-- Postgres fires AFTER INSERT row triggers in alphabetical order by name, and
-- this name sorts after `on_auth_user_created` (migration 001), which creates
-- the profile. Renaming either trigger changes that order silently.
DROP TRIGGER IF EXISTS on_auth_user_created_demo_brand ON auth.users;
CREATE TRIGGER on_auth_user_created_demo_brand
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.give_new_user_demo_brand();


-- ─── 4. The template brand ──────────────────────────────────────────────────
--
-- BrandingOS, built from the product's own identity: the mark is the nine-dot
-- BrandMark, the colours are ds/tokens.json, the typeface is Plus Jakarta
-- Sans. The logo files are static product assets under /brands/brandingos/,
-- so every copy references the same paths and nothing is duplicated per user.
--
-- Owned by the platform account when one can be resolved, so it can be OPENED
-- AND EDITED IN THE APP — that is how it is meant to be changed. Reassign with
--   UPDATE public.brands SET user_id = <uuid> WHERE is_demo_template;

DO $seed$
DECLARE
  owner_id uuid;
  tpl_id   uuid;
  f_logos  uuid := gen_random_uuid();
  f_photos uuid := gen_random_uuid();
  f_camp   uuid := gen_random_uuid();
  f_launch uuid := gen_random_uuid();
BEGIN
  IF EXISTS (SELECT 1 FROM public.brands WHERE is_demo_template) THEN
    RAISE NOTICE '033: a demo template already exists — leaving it alone';
    RETURN;
  END IF;

  owner_id := COALESCE(
    (SELECT id FROM auth.users WHERE email = 'hamza2007ezzat@gmail.com' LIMIT 1),
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );

  tpl_id := gen_random_uuid();

  INSERT INTO public.brands (
    id, user_id, name, slug, logo_url,
    primary_color, secondary_color, fonts, tone, audience, strategy,
    logo_assets, logo_system, brand_assets, guidelines, business_info,
    is_demo_template, created_at, updated_at
  ) VALUES (
    tpl_id,
    owner_id,
    'BrandingOS',
    'brandingos',
    '/brands/brandingos/logo.svg',
    '#111113',
    '#F5F4EF',
    '{"primary":"Plus Jakarta Sans","secondary":"Plus Jakarta Sans"}'::jsonb,
    'Warm, precise, quiet. Plain words, no hype, no exclamation marks.',
    'Founders, in-house brand and marketing teams, and small studios who need one brand to stay itself across every asset they ship.',
    'BrandingOS is the operating system for a brand. Strategy, identity and output live in one place, so a change to the brand becomes a change to everything it touches — without a designer in the loop for every asset.',

    -- Legacy scalars. Kept in step with logo_system below; the resolver
    -- prefers the refs and falls back to these for older readers.
    jsonb_build_object(
      'full',       '/brands/brandingos/logo.svg',
      'wordmark',   '/brands/brandingos/wordmark.svg',
      'icon',       '/brands/brandingos/icon.svg',
      'light',      '/brands/brandingos/logo-white.svg',
      'dark',       '/brands/brandingos/logo-black.svg',
      'alternate',  '/brands/brandingos/logo-stacked.svg'
    ),

    -- v3 refs. Each points at an entry in brand_assets by id.
    jsonb_build_object(
      'primary',   jsonb_build_object('assetId', 'bos-logo-primary',  'preferredFormat', 'svg',
                     'description', 'The nine-dot mark beside the wordmark. Eight dots orbiting one steady centre — a brand held together by a single source.',
                     'usage', 'The default. Product chrome, documents, decks, anywhere there is room for the full lockup.'),
      'wordmark',  jsonb_build_object('assetId', 'bos-logo-wordmark',  'preferredFormat', 'svg',
                     'description', 'The name alone, outlined from Plus Jakarta Sans SemiBold at tight tracking.',
                     'usage', 'Where the mark already appears nearby, or in a space too short for the lockup.'),
      'iconmark',  jsonb_build_object('assetId', 'bos-logo-icon',      'preferredFormat', 'svg',
                     'description', 'The mark on its own, square.',
                     'usage', 'Avatars, favicons, app icons, and anywhere below the lockup''s minimum size.'),
      'mono', jsonb_build_object(
        'black',   jsonb_build_object('assetId', 'bos-logo-black', 'preferredFormat', 'svg',
                     'description', 'Single-colour black.', 'usage', 'Print on light stock, embossing, one-colour reproduction.'),
        'white',   jsonb_build_object('assetId', 'bos-logo-white', 'preferredFormat', 'svg',
                     'description', 'Warm cream, drawn for dark grounds.', 'usage', 'Dark surfaces, photography overlays, dark-mode interfaces.')
      ),
      'orientations', jsonb_build_object(
        'stacked', jsonb_build_object('assetId', 'bos-logo-stacked', 'preferredFormat', 'svg',
                     'description', 'Mark above wordmark, centred.', 'usage', 'Narrow columns, square formats, merchandise.')
      ),
      'clearSpace', 'One dot diameter on all sides, measured from the mark''s own grid',
      'minSize',    '96px wide for the lockup, 16px for the icon'
    ),

    -- The canonical asset library. Ids are stable and referenced above; they
    -- are only meaningful inside this brand, so copies keep them unchanged.
    jsonb_build_array(
      jsonb_build_object('id','bos-logo-primary','kind','logo','role','primary','name','BrandingOS — primary lockup',
        'formats', jsonb_build_object('svg', jsonb_build_object('url','/brands/brandingos/logo.svg','size',5883,'mime','image/svg+xml')),
        'tags', jsonb_build_array('logo','primary'),
        'metadata', jsonb_build_object('createdAt', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'version', 1)),
      jsonb_build_object('id','bos-logo-wordmark','kind','logo','role','wordmark','name','BrandingOS — wordmark',
        'formats', jsonb_build_object('svg', jsonb_build_object('url','/brands/brandingos/wordmark.svg','size',4701,'mime','image/svg+xml')),
        'tags', jsonb_build_array('logo','wordmark'),
        'metadata', jsonb_build_object('createdAt', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'version', 1)),
      jsonb_build_object('id','bos-logo-icon','kind','logo','role','iconmark','name','BrandingOS — icon',
        'formats', jsonb_build_object('svg', jsonb_build_object('url','/brands/brandingos/icon.svg','size',1373,'mime','image/svg+xml')),
        'tags', jsonb_build_array('logo','icon'),
        'metadata', jsonb_build_object('createdAt', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'version', 1)),
      jsonb_build_object('id','bos-logo-black','kind','logo','role','mono.black','name','BrandingOS — mono black',
        'formats', jsonb_build_object('svg', jsonb_build_object('url','/brands/brandingos/logo-black.svg','size',5897,'mime','image/svg+xml')),
        'tags', jsonb_build_array('logo','mono'),
        'metadata', jsonb_build_object('createdAt', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'version', 1)),
      jsonb_build_object('id','bos-logo-white','kind','logo','role','mono.white','name','BrandingOS — on dark',
        'formats', jsonb_build_object('svg', jsonb_build_object('url','/brands/brandingos/logo-white.svg','size',5901,'mime','image/svg+xml')),
        'tags', jsonb_build_array('logo','mono'),
        'metadata', jsonb_build_object('createdAt', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'version', 1)),
      jsonb_build_object('id','bos-logo-stacked','kind','logo','role','stacked','name','BrandingOS — stacked lockup',
        'formats', jsonb_build_object('svg', jsonb_build_object('url','/brands/brandingos/logo-stacked.svg','size',5939,'mime','image/svg+xml')),
        'tags', jsonb_build_array('logo','stacked'),
        'metadata', jsonb_build_object('createdAt', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'version', 1))
    ),

    -- guidelines.* is the legacy shape the canonical reader derives identity
    -- from (fromLegacyBrand). Writing it rather than an `identity` blob keeps
    -- this insert on the same path every seed brand already proves works.
    jsonb_build_object(
      'strategy', jsonb_build_object(
        'summary',        'BrandingOS turns a brand from a folder of files into a system. You set the strategy, identity and rules once; every guideline, template, design and export is generated from that one source and stays in step with it.',
        'mission',        'Make a brand something you set up once and then simply have — consistent everywhere, without a designer in the loop for every asset.',
        'vision',         'Every organisation, at any size, operating its brand as coherently as the best-run companies do.',
        'positioning',    'The operating system for a brand — strategy, identity and output in one place, where a change to the brand becomes a change to everything it touches.',
        'values',         jsonb_build_array('Clarity','Consistency','Ownership','Craft','Speed'),
        'personality',    jsonb_build_array('Precise','Warm','Quiet','Confident','Practical'),
        'targetAudience', 'Founders who are their own brand team; in-house brand and marketing teams keeping dozens of assets in step; and small studios who hand a finished system to a client and need it to survive contact with everyone who uses it afterwards.'
      ),
      'colorPalette', jsonb_build_object(
        'primary',   jsonb_build_object('hex','#111113','name','Warm Charcoal','rgb','rgb(17, 17, 19)',
                       'usage','Type, the mark, filled buttons, and every piece of chrome. The brand''s ink — never a decorative fill.'),
        'secondary', jsonb_build_object('hex','#F5F4EF','name','Warm Cream','rgb','rgb(245, 244, 239)',
                       'usage','The ground everything sits on. Warm rather than white, so the interface reads as paper instead of glass.'),
        'accent',    jsonb_build_object('hex','#2F9E5F','name','Signal Green','rgb','rgb(47, 158, 95)',
                       'usage','Success and completion only. Reserved, so that when it appears it means something.'),
        'neutral', jsonb_build_array(
          jsonb_build_object('hex','#FFFFFF','name','Surface','usage','Cards and raised surfaces above the cream ground.'),
          jsonb_build_object('hex','#EFEEE8','name','Hairline','usage','Hover states and the quietest separations.'),
          jsonb_build_object('hex','#E6E4DD','name','Border','usage','Borders, dividers, input outlines.'),
          jsonb_build_object('hex','#8A877E','name','Muted','usage','Placeholders, timestamps, secondary labels.'),
          jsonb_build_object('hex','#55534C','name','Secondary','usage','Body copy and supporting text.'),
          jsonb_build_object('hex','#0E0E0E','name','Ink','usage','Headings and the highest-contrast text.')
        )
      ),
      'typography', jsonb_build_object(
        'primary', jsonb_build_object('family','Plus Jakarta Sans','weights', jsonb_build_array('400','500','600','700'),
          'usage','Everything. One family across headings, body and interface — the range lives in weight and size, not in a second typeface.'),
        'scale', jsonb_build_array(
          jsonb_build_object('name','Display','size','40px','weight','600','lineHeight','1.1'),
          jsonb_build_object('name','Heading','size','28px','weight','600','lineHeight','1.2'),
          jsonb_build_object('name','Subhead','size','20px','weight','500','lineHeight','1.3'),
          jsonb_build_object('name','Body','size','15px','weight','400','lineHeight','1.55'),
          jsonb_build_object('name','Caption','size','13px','weight','400','lineHeight','1.45'),
          jsonb_build_object('name','Eyebrow','size','11px','weight','500','lineHeight','1.2')
        )
      ),
      'voice', jsonb_build_object(
        'tone', 'Warm, precise, quiet.',
        'essay', 'Say the thing. Plain words in short sentences, and no more of them than the reader needs. We do not sell inside the product — a button that says what it does is worth more than a button that sounds exciting. No exclamation marks, no "simply", no "just", no congratulating anyone for clicking. When something goes wrong we say what happened and what to do about it, in that order. Uppercase is reserved for eyebrows; the rest is sentence case, including buttons and headings.'
      )
    ),

    jsonb_build_object(
      'industry',    'Software — brand management',
      'description', 'A brand operating system: brand setup, a living brand kit, generated guidelines, an AI-assisted design editor, and export to every format a brand actually ships in.',
      'tagline',     'One setup. Infinite branded possibilities.',
      'contact',     jsonb_build_object('website', 'https://brandingos.ai')
    ),

    true, now(), now()
  );

  -- ── the template's folder tree ──
  -- ONE tree, three views into it (Library · Designs · Kit) — see the Folders
  -- section of CLAUDE.md. Subfolders render in every tab, so this is the shape
  -- the demo brand demonstrates, not a Library-only arrangement.
  INSERT INTO public.brand_folders (id, brand_id, name, parent_id)
  VALUES (f_logos,  tpl_id, 'Logos',       NULL),
         (f_photos, tpl_id, 'Photography', NULL),
         (f_camp,   tpl_id, 'Campaigns',   NULL),
         (f_launch, tpl_id, 'Launch',      f_camp);

  -- ── the template's library ──
  -- The same six files the logo system points at, as Library rows. The two are
  -- separate projections on purpose (brand_assets JSONB answers logoSystem
  -- refs; this table answers the Library grid), so a brand needs both to look
  -- complete in both places.
  INSERT INTO public.assets (brand_id, name, type, category, source, url, folder_id, tags, uploaded_by)
  VALUES
    (tpl_id, 'BrandingOS — primary lockup', 'image/svg+xml', 'logo', 'seed', '/brands/brandingos/logo.svg',         f_logos, ARRAY['logo','primary'],  owner_id),
    (tpl_id, 'BrandingOS — stacked lockup', 'image/svg+xml', 'logo', 'seed', '/brands/brandingos/logo-stacked.svg', f_logos, ARRAY['logo','stacked'],  owner_id),
    (tpl_id, 'BrandingOS — wordmark',       'image/svg+xml', 'logo', 'seed', '/brands/brandingos/wordmark.svg',     f_logos, ARRAY['logo','wordmark'], owner_id),
    (tpl_id, 'BrandingOS — icon',           'image/svg+xml', 'logo', 'seed', '/brands/brandingos/icon.svg',         f_logos, ARRAY['logo','icon'],     owner_id),
    (tpl_id, 'BrandingOS — mono black',     'image/svg+xml', 'logo', 'seed', '/brands/brandingos/logo-black.svg',   f_logos, ARRAY['logo','mono'],     owner_id),
    (tpl_id, 'BrandingOS — on dark',        'image/svg+xml', 'logo', 'seed', '/brands/brandingos/logo-white.svg',   f_logos, ARRAY['logo','mono'],     owner_id);

  RAISE NOTICE '033: demo template created (%) owned by %', tpl_id, owner_id;
END $seed$;


-- ─── 5. Backfill ────────────────────────────────────────────────────────────
--
-- Existing accounts that have NO brands get one too. Accounts that already
-- have brands are left alone: they have made their own, and an extra brand
-- appearing in a working account is a support ticket, not a feature.

DO $backfill$
DECLARE
  u     RECORD;
  given INT := 0;
BEGIN
  FOR u IN
    SELECT au.id
      FROM auth.users au
     WHERE NOT EXISTS (SELECT 1 FROM public.brands b WHERE b.user_id = au.id)
  LOOP
    BEGIN
      IF public.clone_demo_brand(u.id) IS NOT NULL THEN
        given := given + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '033: backfill skipped user %: %', u.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE '033: demo brand backfilled to % account(s)', given;
END $backfill$;
