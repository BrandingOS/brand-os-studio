-- T087 FIX (2026-08-13): 'demo-brand-1' was inserted into `brands.id`, a uuid
-- column, so this statement is invalid SQL and could never have executed —
-- yet this version IS recorded as applied in production. Migrations
-- 20250916220322 and 20250916220410 are the corrected re-issues and use the
-- proper uuid, so this file is aligned to the same value. That makes a fresh
-- database consistent with production's demo brand id. Editing is safe:
-- Supabase applies by version, and this version is already recorded.

-- Insert "The Main Brand" demo data into the brands table
-- First, we'll insert it with the admin user as owner (hamza2007ezzat@gmail.com)
-- This brand will serve as the comprehensive demo brand for testing all features

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
  '550e8400-e29b-41d4-a716-446655440000',
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

-- Create a policy to allow all authenticated users to view demo brands
-- This allows everyone to see and use "The Main Brand" for testing
DROP POLICY IF EXISTS "Demo brands are viewable by all authenticated users" ON public.brands;
CREATE POLICY "Demo brands are viewable by all authenticated users" 
ON public.brands 
FOR SELECT 
TO authenticated
USING (id = '550e8400-e29b-41d4-a716-446655440000');

-- Also allow all authenticated users to update the demo brand for testing purposes
DROP POLICY IF EXISTS "Demo brands are editable by all authenticated users" ON public.brands;
CREATE POLICY "Demo brands are editable by all authenticated users" 
ON public.brands 
FOR UPDATE 
TO authenticated
USING (id = '550e8400-e29b-41d4-a716-446655440000')
WITH CHECK (id = '550e8400-e29b-41d4-a716-446655440000');