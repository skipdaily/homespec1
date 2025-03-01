import { supabase } from './supabase';

// Function to check if storage is properly configured
export async function checkStorageAccess() {
  try {
    // Test if we can list files in the bucket
    const { error } = await supabase
      .storage
      .from('item-images')
      .list('', {
        limit: 1,
        offset: 0,
      });

    if (error) {
      console.error('Error accessing bucket:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Storage access check failed:', error);
    return false;
  }
}

export async function ensureStorageBucket() {
  try {
    const storageAccessible = await checkStorageAccess();
    if (!storageAccessible) {
      console.error(
        'Storage bucket "item-images" is not properly configured. Please check:\n' +
        '1. Bucket exists and is named "item-images"\n' +
        '2. Enable RLS and create the following policy in SQL editor:\n' +
        '   CREATE POLICY "Enable insert for authenticated users only"\n' +
        '   ON storage.objects FOR INSERT TO authenticated\n' +
        '   WITH CHECK (bucket_id = \'item-images\' AND auth.role() = \'authenticated\');\n' +
        '3. Make sure the bucket is public for reading files'
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking storage bucket:', error);
    return false;
  }
}