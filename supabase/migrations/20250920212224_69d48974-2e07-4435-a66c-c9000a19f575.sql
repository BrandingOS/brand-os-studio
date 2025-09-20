-- Fix search path security issues for the functions we created

-- Update generate_brand_slug function with proper search_path
CREATE OR REPLACE FUNCTION public.generate_brand_slug(brand_name TEXT, brand_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 1;
BEGIN
    -- Convert brand name to slug format
    base_slug := lower(trim(regexp_replace(brand_name, '[^a-zA-Z0-9\s]', '', 'g')));
    base_slug := regexp_replace(base_slug, '\s+', '_', 'g');
    
    -- Start with base slug
    final_slug := base_slug;
    
    -- Check for duplicates and add counter if needed
    WHILE EXISTS (
        SELECT 1 FROM public.brands 
        WHERE slug = final_slug 
        AND (brand_id IS NULL OR id != brand_id)
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '_' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$;

-- Update set_brand_slug function with proper search_path
CREATE OR REPLACE FUNCTION public.set_brand_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Generate slug if not provided or if name changed
    IF NEW.slug IS NULL OR (OLD.name IS DISTINCT FROM NEW.name) THEN
        NEW.slug := public.generate_brand_slug(NEW.name, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;