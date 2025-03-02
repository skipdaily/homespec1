-- Add bucket column to images table if it doesn't exist
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS bucket text NOT NULL DEFAULT 'item-images';

-- Create item-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('item-documents', 'item-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Add security policies for item-documents bucket
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'item-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'item-documents'
);
