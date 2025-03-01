import { supabase } from './supabase';

// Function to check if storage is properly configured
export async function checkStorageAccess() {
  try {
    // First check if we can list buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const bucket = buckets?.find(b => b.name === 'item-images');
    if (!bucket) {
      console.error('Bucket "item-images" not found');
      return false;
    }

    // Then test if we can list files in the bucket
    const { error: testError } = await supabase
      .storage
      .from('item-images')
      .list('', {
        limit: 1,
        offset: 0,
      });

    if (testError) {
      console.error('Error accessing bucket:', testError);
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
        '2. Bucket is set to public\n' +
        '3. SQL policy allows authenticated users to read/write\n' +
        '4. Storage policy allows file uploads'
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking storage bucket:', error);
    return false;
  }
}