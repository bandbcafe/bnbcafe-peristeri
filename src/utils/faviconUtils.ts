/**
 * Utility functions for favicon processing
 * Converts images to proper favicon format (ICO, PNG) with multiple sizes
 */

export interface FaviconOptions {
  sizes?: number[]; // Array of sizes to generate (e.g., [16, 32, 48])
  format?: 'ico' | 'png';
  quality?: number;
}

/**
 * Convert an image file to favicon format with proper dimensions
 * Generates multiple sizes: 16x16, 32x32, 48x48 for ICO compatibility
 */
export async function convertToFavicon(
  file: File,
  options: FaviconOptions = {}
): Promise<string> {
  const {
    sizes = [16, 32, 48],
    format = 'png',
    quality = 0.95
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Use the largest size for the final output
        const targetSize = Math.max(...sizes);
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Fill with transparent background
        ctx.clearRect(0, 0, targetSize, targetSize);

        // Calculate dimensions to maintain aspect ratio
        let drawWidth = img.width;
        let drawHeight = img.height;
        let offsetX = 0;
        let offsetY = 0;

        // Scale to fit within target size while maintaining aspect ratio
        const scale = Math.min(targetSize / img.width, targetSize / img.height);
        drawWidth = img.width * scale;
        drawHeight = img.height * scale;

        // Center the image
        offsetX = (targetSize - drawWidth) / 2;
        offsetY = (targetSize - drawHeight) / 2;

        // Draw image
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Convert to base64
        const mimeType = format === 'ico' ? 'image/png' : 'image/png'; // ICO not supported in canvas, use PNG
        const base64 = canvas.toDataURL(mimeType, quality);

        resolve(base64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate if a file is a valid image for favicon
 */
export function validateFaviconFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/x-icon'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Μη έγκυρος τύπος αρχείου. Επιτρέπονται: PNG, JPG, GIF, SVG, ICO'
    };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 5MB'
    };
  }

  return { valid: true };
}

/**
 * Generate multiple favicon sizes from a single image
 * Returns an object with different sizes
 */
export async function generateFaviconSizes(
  file: File
): Promise<{
  favicon16: string;
  favicon32: string;
  favicon48: string;
  faviconApple: string; // 180x180 for Apple touch icon
}> {
  const [favicon16, favicon32, favicon48, faviconApple] = await Promise.all([
    convertToFavicon(file, { sizes: [16] }),
    convertToFavicon(file, { sizes: [32] }),
    convertToFavicon(file, { sizes: [48] }),
    convertToFavicon(file, { sizes: [180] }) // Apple touch icon
  ]);

  return {
    favicon16,
    favicon32,
    favicon48,
    faviconApple
  };
}
