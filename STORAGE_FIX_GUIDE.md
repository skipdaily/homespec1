# File Upload 404 Error - Troubleshooting Guide

## Problem
Users are experiencing `404: NOT_FOUND` errors when trying to upload photos or documents to the deployed Vercel application.

## Root Cause Analysis
The 404 errors are **NOT** related to server routing issues. File uploads in this application happen entirely on the client-side via direct calls to Supabase Storage API. The most common causes are:

### 1. Missing Storage Buckets
- The `item-images` bucket doesn't exist
- The `item-documents` bucket doesn't exist

### 2. Incorrect Row Level Security (RLS) Policies
- Storage buckets exist but lack proper RLS policies
- Users can't upload files due to permission restrictions

### 3. Authentication Issues
- User not properly authenticated
- Session expired during upload

### 4. Environment Variable Issues
- Incorrect Supabase URL or API key in production
- Environment variables not properly set in Vercel

## Quick Fix Steps

### Step 1: Use the Debug Tool
1. Deploy the latest version with debug tools
2. Log into your deployed application
3. Click the Settings icon (⚙️) in the navbar
4. Run the storage diagnostics

### Step 2: Create Storage Buckets
If buckets are missing, either:
- Use the "Create Buckets" button in the debug tool, OR
- Manually create in Supabase Dashboard:
  1. Go to Storage in Supabase Dashboard
  2. Create bucket `item-images` (Public: Yes, Size limit: 25MB)
  3. Create bucket `item-documents` (Public: Yes, Size limit: 25MB)

### Step 3: Set Up RLS Policies
In Supabase SQL Editor, run:

```sql
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for item-images bucket
CREATE POLICY "Enable all operations for authenticated users on item-images"
ON storage.objects
FOR ALL 
TO authenticated
WITH CHECK (bucket_id = 'item-images')
USING (bucket_id = 'item-images');

-- Policy for item-documents bucket  
CREATE POLICY "Enable all operations for authenticated users on item-documents"
ON storage.objects
FOR ALL
TO authenticated 
WITH CHECK (bucket_id = 'item-documents')
USING (bucket_id = 'item-documents');
```

### Step 4: Verify Environment Variables
Check that these are set correctly in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Alternative: Manual Bucket Creation via SQL

If the JavaScript bucket creation fails, use SQL:

```sql
-- Create buckets via SQL
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('item-images', 'item-images', true),
  ('item-documents', 'item-documents', true);
```

## Verification
After fixing:
1. Run diagnostics again
2. Try uploading a test file
3. Check that the file appears in Storage dashboard

## Prevention
- Always create storage buckets before deploying to production
- Set up RLS policies during initial setup
- Test file uploads in staging environment
- Monitor storage usage and quotas
