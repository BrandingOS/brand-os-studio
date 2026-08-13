-- T087 FIX (2026-08-13): guarded. The demo brand's `user_id` comes from a
-- subquery over `auth.users` for a hard-coded email, which is NULL on a fresh
-- database and violates brands.user_id NOT NULL. Skipped when that user is
-- absent, exactly like the other demo-seed migrations. Editing is safe: this
-- version is already recorded as applied in production.

-- Insert "The Main Brand" demo data with proper UUID
-- Using a consistent UUID for the demo brand so it can be referenced reliably
DO $seed$ BEGIN
IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'hamza2007ezzat@gmail.com') THEN
INSERT INTO public.brands (
  id,
  user_id,
  name,
  logo_url,
  primary_color,
  secondary_color,
  tone,
  audience,
  fonts,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  (SELECT id FROM auth.users WHERE email = 'hamza2007ezzat@gmail.com' LIMIT 1),
  'The Main Brand',
  'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop&crop=center',
  '#2563eb',
  '#f59e0b',
  'Professional & Innovative',
  'Tech-savvy businesses and startups',
  '{"primary": "Inter", "secondary": "Poppins"}',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  tone = EXCLUDED.tone,
  audience = EXCLUDED.audience,
  fonts = EXCLUDED.fonts,
  updated_at = now();
ELSE RAISE NOTICE 'Skipping demo seed: owner account not present.'; END IF;
END $seed$;

-- Create a policy to allow all authenticated users to view the demo brand
-- This allows everyone to see and use "The Main Brand" for testing
DROP POLICY IF EXISTS "Demo brand viewable by all authenticated users" ON public.brands;
CREATE POLICY "Demo brand viewable by all authenticated users" 
ON public.brands 
FOR SELECT 
TO authenticated
USING (id = '550e8400-e29b-41d4-a716-446655440000'::uuid);

-- Also allow all authenticated users to update the demo brand for testing purposes
DROP POLICY IF EXISTS "Demo brand editable by all authenticated users" ON public.brands;
CREATE POLICY "Demo brand editable by all authenticated users" 
ON public.brands 
FOR UPDATE 
TO authenticated
USING (id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
WITH CHECK (id = '550e8400-e29b-41d4-a716-446655440000'::uuid);