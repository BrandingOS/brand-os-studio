-- Insert "The Main Brand" demo data into the brands table with proper UUID
-- This brand will serve as the comprehensive demo brand for testing all features

-- First, let's create a specific UUID for our demo brand
-- Using a deterministic UUID so we can reference it consistently
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

-- Create a policy to allow all authenticated users to view demo brands
CREATE POLICY "Demo brands viewable by all" 
ON public.brands 
FOR SELECT 
TO authenticated
USING (id = '550e8400-e29b-41d4-a716-446655440000'::uuid);

-- Also allow all authenticated users to update the demo brand for testing purposes
CREATE POLICY "Demo brands editable by all" 
ON public.brands 
FOR UPDATE 
TO authenticated
USING (id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
WITH CHECK (id = '550e8400-e29b-41d4-a716-446655440000'::uuid);