// Firebase Storage utilities for image upload/delete
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { processImageToBlob, ImageProcessingOptions, DEFAULT_IMAGE_OPTIONS } from './imageUtils';

/**
 * Generate a unique filename for uploaded images
 */
function generateFilename(prefix: string = 'img'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.webp`;
}

/**
 * Upload a processed image file to Firebase Storage
 * @param file - Original image file from input
 * @param folder - Storage folder (e.g. "products", "categories")
 * @param options - Image processing options
 * @returns Download URL of the uploaded image
 */
export async function uploadImage(
  file: File,
  folder: string = 'products',
  options: ImageProcessingOptions = DEFAULT_IMAGE_OPTIONS
): Promise<string> {
  // Process image to WebP blob
  const blob = await processImageToBlob(file, options);

  // Generate unique filename
  const filename = generateFilename(folder);
  const storagePath = `${folder}/${filename}`;

  // Upload to Firebase Storage
  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: 'image/webp',
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  };

  await uploadBytes(storageRef, blob, metadata);

  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * Delete an image from Firebase Storage by its download URL
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return;
  }

  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error: any) {
    if (error.code !== 'storage/object-not-found') {
      console.error('Error deleting image:', error);
    }
  }
}

/**
 * Check if a string is a Firebase Storage URL (not base64)
 */
export function isStorageUrl(value: string): boolean {
  if (!value) return false;
  return value.startsWith('https://firebasestorage.googleapis.com/') ||
         value.startsWith('https://storage.googleapis.com/');
}

/**
 * Check if a string is a base64 data URL (legacy format)
 */
export function isBase64Image(value: string): boolean {
  if (!value) return false;
  return value.startsWith('data:image/');
}
