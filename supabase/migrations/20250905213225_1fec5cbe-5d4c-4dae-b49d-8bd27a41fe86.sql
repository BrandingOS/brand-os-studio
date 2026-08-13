-- T087 FIX (2026-08-13): made idempotent. `profiles`, `user_roles`, the
-- `app_role` type and the triggers below are ALSO created by
-- `20250905213158`, so on a fresh database this migration died with
-- "relation profiles already exists" and `supabase db reset` could not rebuild
-- the schema from this repository. Guarded with IF NOT EXISTS / DO-blocks so
-- the chain converges regardless of which of the overlapping migrations ran
-- first. Editing is safe: this version is already recorded as applied in
-- production, so Supabase will never re-run it there.

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create app_role enum
DO $enum$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to automatically create profile and assign default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.email)
  );
  
  -- Assign role (admin for specific email, user for everyone else)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    CASE 
      WHEN new.email = 'hamza2007ezzat@gmail.com' THEN 'admin'::app_role
      ELSE 'user'::app_role
    END
  );
  
  RETURN new;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update brands RLS policies to allow admins to see all brands
DROP POLICY IF EXISTS brands_select_own ON public.brands;
DROP POLICY IF EXISTS "brands_select_policy" ON public.brands;
CREATE POLICY "brands_select_policy" 
ON public.brands 
FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

-- Update other brands policies for admin access
DROP POLICY IF EXISTS brands_update_own ON public.brands;
DROP POLICY IF EXISTS "brands_update_policy" ON public.brands;
CREATE POLICY "brands_update_policy"
ON public.brands
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS brands_delete_own ON public.brands;
DROP POLICY IF EXISTS "brands_delete_policy" ON public.brands;
CREATE POLICY "brands_delete_policy"
ON public.brands
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

-- Profiles RLS policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- User roles policies (admins can see all, users can see their own)
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

-- Only admins can insert/update roles
DROP POLICY IF EXISTS "user_roles_admin_only" ON public.user_roles;
CREATE POLICY "user_roles_admin_only"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Insert admin user role if user already exists
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', email)
FROM auth.users 
WHERE email = 'hamza2007ezzat@gmail.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'hamza2007ezzat@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;