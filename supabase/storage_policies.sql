-- Run this in Supabase SQL Editor after creating the public `manual-images` bucket.
-- It permits signed-in users to upload, replace, and delete manual images.

DROP POLICY IF EXISTS "manual_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "manual_images_update" ON storage.objects;
DROP POLICY IF EXISTS "manual_images_delete" ON storage.objects;

CREATE POLICY "manual_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manual-images');

CREATE POLICY "manual_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'manual-images')
  WITH CHECK (bucket_id = 'manual-images');

CREATE POLICY "manual_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'manual-images');
