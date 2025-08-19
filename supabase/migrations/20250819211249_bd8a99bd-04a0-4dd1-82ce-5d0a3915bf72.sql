
-- 1) Onboarding answers table (one row per user, flexible JSONB structure)
create table if not exists public.onboarding_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, -- do not FK auth.users; RLS will use auth.uid()
  answers jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.onboarding_answers enable row level security;

-- RLS: users can manage only their own row
create policy "onboarding_answers_select_own"
  on public.onboarding_answers
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "onboarding_answers_insert_own"
  on public.onboarding_answers
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "onboarding_answers_update_own"
  on public.onboarding_answers
  for update
  to authenticated
  using (user_id = auth.uid());

create policy "onboarding_answers_delete_own"
  on public.onboarding_answers
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_onboarding_answers_updated_at on public.onboarding_answers;
create trigger trg_onboarding_answers_updated_at
before update on public.onboarding_answers
for each row
execute procedure public.set_updated_at();

-- 2) Brands table
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  logo_url text,
  primary_color text not null,
  secondary_color text,
  fonts jsonb, -- { primary: string, secondary?: string }
  tone text,
  audience text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brands enable row level security;

-- RLS: users can manage only their own brands
create policy "brands_select_own"
  on public.brands
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "brands_insert_own"
  on public.brands
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "brands_update_own"
  on public.brands
  for update
  to authenticated
  using (user_id = auth.uid());

create policy "brands_delete_own"
  on public.brands
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Trigger to keep updated_at fresh
drop trigger if exists trg_brands_updated_at on public.brands;
create trigger trg_brands_updated_at
before update on public.brands
for each row
execute procedure public.set_updated_at();

-- 3) Storage bucket for brand assets (private)
insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', false)
on conflict (id) do nothing;

-- Storage RLS (allow only the owner to manage their files in 'brand-assets')
-- Note: storage.objects already has RLS enabled by default
create policy "brand-assets_read_own"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'brand-assets' and owner = auth.uid());

create policy "brand-assets_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'brand-assets' and owner = auth.uid());

create policy "brand-assets_update_own"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'brand-assets' and owner = auth.uid());

create policy "brand-assets_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'brand-assets' and owner = auth.uid());
