// Image processing utilities for converting and compressing images

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for WebP quality
  format?: 'webp' | 'jpeg' | 'png';
}

export const DEFAULT_IMAGE_OPTIONS: ImageProcessingOptions = {
  maxWidth: 1000,
  maxHeight: 800,
  quality: 0.8,
  format: 'webp'
};

/**
 * Converts and compresses an image file to WebP format
 * @param file - The image file to process
 * @param options - Processing options
 * @returns Promise<string> - Base64 encoded WebP image
 */
export const processImageFile = async (
  file: File, 
  options: ImageProcessingOptions = DEFAULT_IMAGE_OPTIONS
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('Το αρχείο δεν είναι έγκυρη εικόνα'));
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      reject(new Error('Η εικόνα είναι πολύ μεγάλη. Μέγιστο μέγεθος: 10MB'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const handleImageLoad = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        const { width: newWidth, height: newHeight } = calculateDimensions(
          img.width,
          img.height,
          options.maxWidth || DEFAULT_IMAGE_OPTIONS.maxWidth!,
          options.maxHeight || DEFAULT_IMAGE_OPTIONS.maxHeight!
        );

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw and resize image
        ctx!.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to WebP with quality compression
        const webpDataUrl = canvas.toDataURL(
          `image/${options.format || 'webp'}`,
          options.quality || DEFAULT_IMAGE_OPTIONS.quality
        );

        // Validate result size (max 1MB base64)
        const base64Size = (webpDataUrl.length * 3) / 4; // Approximate base64 size
        if (base64Size > 1024 * 1024) { // 1MB
          // If still too large, reduce quality and try again
          const reducedQuality = Math.max(0.3, (options.quality || 0.8) - 0.2);
          const smallerImage = canvas.toDataURL('image/webp', reducedQuality);
          resolve(smallerImage);
        } else {
          resolve(webpDataUrl);
        }
      } catch (error) {
        reject(new Error('Σφάλμα κατά την επεξεργασία της εικόνας'));
      }
    };

    img.onload = handleImageLoad;
    img.onerror = () => {
      reject(new Error('Σφάλμα κατά τη φόρτωση της εικόνας'));
    };

    // Create object URL and load image
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    // Clean up object URL after loading
    img.addEventListener('load', () => {
      URL.revokeObjectURL(objectUrl);
    }, { once: true });
  });
};

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // If image is smaller than max dimensions, keep original size
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  // Calculate scaling factor
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const scalingFactor = Math.min(widthRatio, heightRatio);

  return {
    width: Math.round(width * scalingFactor),
    height: Math.round(height * scalingFactor)
  };
};

/**
 * Validate if a string is a valid base64 image
 */
export const isValidBase64Image = (base64String: string): boolean => {
  if (!base64String || typeof base64String !== 'string') {
    return false;
  }

  // Check if it's a data URL
  const dataUrlPattern = /^data:image\/(webp|jpeg|jpg|png|gif);base64,/;
  return dataUrlPattern.test(base64String);
};

/**
 * Get image dimensions from base64 string
 */
export const getImageDimensions = (base64String: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    if (!isValidBase64Image(base64String)) {
      reject(new Error('Μη έγκυρη εικόνα base64'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error('Σφάλμα κατά τη φόρτωση της εικόνας'));
    };
    img.src = base64String;
  });
};

/**
 * Create a thumbnail from base64 image
 */
export const createThumbnail = async (
  base64Image: string,
  maxSize: number = 150
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!isValidBase64Image(base64Image)) {
      reject(new Error('Μη έγκυρη εικόνα base64'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const { width, height } = calculateDimensions(
        img.width,
        img.height,
        maxSize,
        maxSize
      );

      canvas.width = width;
      canvas.height = height;

      ctx!.drawImage(img, 0, 0, width, height);
      
      const thumbnailDataUrl = canvas.toDataURL('image/webp', 0.7);
      resolve(thumbnailDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Σφάλμα κατά τη δημιουργία thumbnail'));
    };

    img.src = base64Image;
  });
};

/**
 * Converts and compresses an image file to a Blob (for Firebase Storage upload)
 * @param file - The image file to process
 * @param options - Processing options
 * @returns Promise<Blob> - Processed image as Blob
 */
export const processImageToBlob = async (
  file: File,
  options: ImageProcessingOptions = DEFAULT_IMAGE_OPTIONS
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Το αρχείο δεν είναι έγκυρη εικόνα'));
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      reject(new Error('Η εικόνα είναι πολύ μεγάλη. Μέγιστο μέγεθος: 10MB'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        const { width: newWidth, height: newHeight } = calculateDimensions(
          img.width,
          img.height,
          options.maxWidth || DEFAULT_IMAGE_OPTIONS.maxWidth!,
          options.maxHeight || DEFAULT_IMAGE_OPTIONS.maxHeight!
        );

        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx!.drawImage(img, 0, 0, newWidth, newHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Σφάλμα κατά τη μετατροπή της εικόνας σε Blob'));
            }
          },
          `image/${options.format || 'webp'}`,
          options.quality || DEFAULT_IMAGE_OPTIONS.quality
        );
      } catch (error) {
        reject(new Error('Σφάλμα κατά την επεξεργασία της εικόνας'));
      }
    };

    img.onerror = () => {
      reject(new Error('Σφάλμα κατά τη φόρτωση της εικόνας'));
    };

    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.addEventListener('load', () => {
      URL.revokeObjectURL(objectUrl);
    }, { once: true });
  });
};

/**
 * Compress and convert image - alias for processImageFile for compatibility
 */
export const compressAndConvertImage = async (
  file: File,
  options?: ImageProcessingOptions
): Promise<string> => {
  return processImageFile(file, options);
};
