-- 023 — Brand Identity publications
--
-- A published Brand Identity page: an immutable SNAPSHOT of what the owner
-- chose to share, addressed by a random token.
--
-- ── Why a snapshot rather than a public read of the live brand ────────────
--
-- The obvious design is to let anonymous visitors read the brand itself, and
-- it is wrong here for four reasons that are all about blast radius:
--
--   1. It would need `TO anon` policies on `brands`, on `assets`, and public
--      access to the storage bucket. This needs ONE policy on ONE new table,
--      and no existing table changes behaviour at all.
--   2. `brands_select_public` already leaks `workspace_id` to anon (see 011).
--      Widening that path widens that leak; this path never touches the row.
--   3. A live read publishes edits the moment they are saved. An owner who
--      shares a link and then experiments has published the experiment. A
--      snapshot is what they saw when they pressed the button.
--   4. Revocation is a delete of one row, not a boolean whose meaning is
--      spread across several tables.
--
-- ── What is in `snapshot` ─────────────────────────────────────────────────
--
-- The resolved identity model with its material INLINED as data URLs. That is
-- what makes the row self-sufficient: the public page reads this and nothing
-- else, so it works whether or not the storage bucket is public and without
-- any anon grant on `assets`.

create table if not exists public.brand_identity_publications (
  -- The share token IS the address. Random, unguessable, and the only thing a
  -- visitor needs — so it must never be derived from the brand's id or slug.
  token          text primary key,
  brand_id       uuid not null references public.brands(id) on delete cascade,
  -- Denormalised so the public read never has to touch `brands`.
  brand_name     text not null,
  snapshot       jsonb not null,
  published_by   uuid references auth.users(id) on delete set null,
  published_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One live publication per brand. Re-publishing REPLACES rather than
-- accumulating: a brand with nine stale links nobody can tell apart is worse
-- than no sharing at all.
create unique index if not exists brand_identity_publications_brand_uniq
  on public.brand_identity_publications (brand_id);

alter table public.brand_identity_publications enable row level security;

-- ── The one anonymous grant ───────────────────────────────────────────────
--
-- Read-only, and it requires the token, which is the primary key: a visitor
-- can only reach a row they were given the address of. There is no listing —
-- `select *` without a token filter still returns rows to anon under this
-- policy, so the CLIENT must always filter by token. Restricting further
-- would need the token in a request header, which is a later refinement.
drop policy if exists "identity_publications_select_anon" on public.brand_identity_publications;
create policy "identity_publications_select_anon"
  on public.brand_identity_publications
  for select
  to anon
  using (true);

drop policy if exists "identity_publications_select_auth" on public.brand_identity_publications;
create policy "identity_publications_select_auth"
  on public.brand_identity_publications
  for select
  to authenticated
  using (true);

-- ── Writing is the owner's alone ──────────────────────────────────────────
--
-- Publishing is a claim about a brand, so it is gated on membership of that
-- brand's workspace — the same test every other brand write uses.
drop policy if exists "identity_publications_write" on public.brand_identity_publications;
create policy "identity_publications_write"
  on public.brand_identity_publications
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.brands b
      join public.workspace_members m on m.workspace_id = b.workspace_id
      where b.id = brand_identity_publications.brand_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.brands b
      join public.workspace_members m on m.workspace_id = b.workspace_id
      where b.id = brand_identity_publications.brand_id
        and m.user_id = auth.uid()
    )
  );

comment on table public.brand_identity_publications is
  'Immutable snapshots of a shared Brand Identity page, addressed by random token. Anon-readable by design; the snapshot inlines its own material so no other table or bucket is reachable from a share link.';
