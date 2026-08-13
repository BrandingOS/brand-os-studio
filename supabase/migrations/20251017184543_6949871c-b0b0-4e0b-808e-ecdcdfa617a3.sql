-- Add RLS policies for brand-assets storage bucket to allow authenticated users to manage their brand files

-- Policy for reading files (users can read their own brand's files)
DROP POLICY IF EXISTS "Users can view their brand assets" ON storage.objects;
CREATE POLICY "Users can view their brand assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.brands WHERE user_id = auth.uid()
  )
);

-- Policy for uploading files (users can upload to their own brand folders)
DROP POLICY IF EXISTS "Users can upload their brand assets" ON storage.objects;
CREATE POLICY "Users can upload their brand assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.brands WHERE user_id = auth.uid()
  )
);

-- Policy for updating files (users can update their own brand's files)
DROP POLICY IF EXISTS "Users can update their brand assets" ON storage.objects;
CREATE POLICY "Users can update their brand assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.brands WHERE user_id = auth.uid()
  )
);

-- Policy for deleting files (users can delete their own brand's files)
DROP POLICY IF EXISTS "Users can delete their brand assets" ON storage.objects;
CREATE POLICY "Users can delete their brand assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.brands WHERE user_id = auth.uid()
  )
);