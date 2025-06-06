-- Storage Setup Script for HomeSpecTracker
-- Run this in your Supabase SQL Editor to fix 404 upload errors

-- Step 1: Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 2: Create storage buckets (if they don't exist)
-- This will fail if buckets already exist, which is fine
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('item-images', 'item-images', true, 5242880, '{image/jpeg,image/jpg,image/png,image/gif,image/webp}'),
  ('item-documents', 'item-documents', true, 20971520, '{application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable all operations for authenticated users on item-images" ON storage.objects;
DROP POLICY IF EXISTS "Enable all operations for authenticated users on item-documents" ON storage.objects;

-- Step 4: Create comprehensive storage policies for item-images
CREATE POLICY "Enable all operations for authenticated users on item-images"
ON storage.objects
FOR ALL 
TO authenticated
WITH CHECK (bucket_id = 'item-images')
USING (bucket_id = 'item-images');

-- Step 5: Create comprehensive storage policies for item-documents
CREATE POLICY "Enable all operations for authenticated users on item-documents"
ON storage.objects
FOR ALL
TO authenticated 
WITH CHECK (bucket_id = 'item-documents')
USING (bucket_id = 'item-documents');

-- Step 6: Ensure images table exists for storing image metadata
CREATE TABLE IF NOT EXISTS public.images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  filename text NOT NULL,
  size bigint,
  mime_type text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Step 7: Enable RLS on images table
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Step 8: Create policy for images table (users can manage images for their own items)
CREATE POLICY "Users can manage images for their own items"
ON public.images
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.items
    JOIN public.rooms ON items.room_id = rooms.id
    JOIN public.projects ON rooms.project_id = projects.id
    WHERE items.id = images.item_id AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.items
    JOIN public.rooms ON items.room_id = rooms.id
    JOIN public.projects ON rooms.project_id = projects.id
    WHERE items.id = images.item_id AND projects.user_id = auth.uid()
  )
);

-- Verification queries
-- Run these to check if everything is set up correctly:

-- Check if buckets exist
-- SELECT * FROM storage.buckets WHERE name IN ('item-images', 'item-documents');

-- Check storage policies
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check images table
-- SELECT table_name, column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'images' AND table_schema = 'public' ORDER BY ordinal_position;
