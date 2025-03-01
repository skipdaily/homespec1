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
        '2. Bucket is set to public\n' +
        '3. Storage policy allows file uploads\n' +
        '4. You are properly authenticated'
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking storage bucket:', error);
    return false;
  }
}