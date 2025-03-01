import { supabase } from './supabase';
import { useToast } from '@/hooks/use-toast';

export async function ensureStorageBucket() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'item-images');

    if (!bucketExists) {
      console.error('Storage bucket "item-images" does not exist. Please create it in the Supabase dashboard with the following settings:\n' +
        '1. Bucket name: item-images\n' +
        '2. Public bucket: Yes\n' +
        '3. File size limit: 5MB\n' +
        '4. Allowed mime types: image/jpeg, image/png, image/gif');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking storage bucket:', error);
    return false;
  }
}

// Function to check if storage is properly configured
export async function checkStorageAccess() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      throw error;
    }

    const bucket = buckets?.find(b => b.name === 'item-images');
    return !!bucket;
  } catch (error) {
    console.error('Storage access check failed:', error);
    return false;
  }
}