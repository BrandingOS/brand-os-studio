-- Add slug column to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create function to generate unique slug from brand name
CREATE OR REPLACE FUNCTION public.generate_brand_slug(brand_name TEXT, brand_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION public.set_brand_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate slug if not provided or if name changed
    IF NEW.slug IS NULL OR (OLD.name IS DISTINCT FROM NEW.name) THEN
        NEW.slug := public.generate_brand_slug(NEW.name, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set slug
DROP TRIGGER IF EXISTS brands_set_slug ON public.brands;
CREATE TRIGGER brands_set_slug
    BEFORE INSERT OR UPDATE ON public.brands
    FOR EACH ROW
    EXECUTE FUNCTION public.set_brand_slug();

-- Populate existing brands with slugs
UPDATE public.brands 
SET slug = public.generate_brand_slug(name, id)
WHERE slug IS NULL;

-- Add unique constraint on slug
DO $c$ BEGIN
  ALTER TABLE public.brands ADD CONSTRAINT brands_slug_unique UNIQUE (slug);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $c$;

-- Make slug NOT NULL after populating
ALTER TABLE public.brands 
ALTER COLUMN slug SET NOT NULL;