import { supabase } from './supabase';

export async function ensureStorageBucket() {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase
      .storage
      .listBuckets();

    const bucketExists = buckets?.some(bucket => bucket.name === 'item-images');

    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { data, error } = await supabase
        .storage
        .createBucket('item-images', {
          public: true, // Make bucket public
          fileSizeLimit: 5242880, // 5MB in bytes
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif']
        });

      if (error) throw error;
      console.log('Created item-images bucket:', data);
    }
  } catch (error) {
    console.error('Error ensuring storage bucket exists:', error);
  }
}