/**
 * Image Upload Utilities
 *
 * Handles image compression, resizing, and localStorage-safe storage.
 * Solves the data URL bloat problem that causes uploads to fail
 * when localStorage quota (~5-10MB) is exceeded.
 */

/**
 * Compress and resize an image file to a reasonable data URL size.
 * - SVGs are kept as-is (they're already small and vector)
 * - Raster images are resized to maxDimension and compressed as JPEG
 *
 * @returns A data URL safe for localStorage storage
 */
export async function compressImage(
  file: File,
  options: {
    maxDimension?: number;
    quality?: number;
    maxSizeKB?: number;
  } = {},
): Promise<string> {
  const {
    maxDimension = 800,
    quality = 0.7,
    maxSizeKB = 200,
  } = options;

  // SVGs: read as text, return as data URL (already small)
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read SVG file'));
      reader.readAsDataURL(file);
    });
  }

  // Raster images: resize and compress
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Resize if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round(height * (maxDimension / width));
          width = maxDimension;
        } else {
          width = Math.round(width * (maxDimension / height));
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Draw with white background (for transparency handling in JPEG)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until under maxSizeKB
      let currentQuality = quality;
      let dataUrl = canvas.toDataURL('image/jpeg', currentQuality);

      while (dataUrl.length > maxSizeKB * 1024 * 1.37 && currentQuality > 0.2) {
        currentQuality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
      }

      // If still too large, try PNG with smaller dimensions
      if (dataUrl.length > maxSizeKB * 1024 * 1.37 * 2) {
        const smallerDim = Math.round(maxDimension * 0.5);
        canvas.width = Math.round(width * 0.5);
        canvas.height = Math.round(height * 0.5);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
}

/**
 * Compress an image specifically for logo usage.
 * Higher quality, smaller max dimension (logos are displayed small).
 */
export async function compressLogo(file: File): Promise<string> {
  // SVGs stay as-is
  if (file.type === 'image/svg+xml') {
    return compressImage(file);
  }

  return compressImage(file, {
    maxDimension: 500,
    quality: 0.8,
    maxSizeKB: 150,
  });
}

/**
 * Compress an image for asset storage.
 */
export async function compressAsset(file: File): Promise<string> {
  if (file.type === 'image/svg+xml') {
    return compressImage(file);
  }

  return compressImage(file, {
    maxDimension: 1200,
    quality: 0.75,
    maxSizeKB: 300,
  });
}

/**
 * Check if localStorage has enough space for a data URL.
 * Returns estimated available space in bytes.
 */
export function checkStorageQuota(): { used: number; available: number; percentUsed: number } {
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      totalSize += localStorage.getItem(key)?.length || 0;
    }
  }
  // Most browsers have 5MB (5,242,880 chars) limit
  const limit = 5 * 1024 * 1024;
  return {
    used: totalSize,
    available: Math.max(0, limit - totalSize),
    percentUsed: Math.round((totalSize / limit) * 100),
  };
}

/**
 * Safely store data to localStorage with quota error handling.
 * Returns true if successful, false if quota exceeded.
 */
export function safeLocalStorageSet(key: string, value: string): { success: boolean; error?: string } {
  try {
    localStorage.setItem(key, value);
    return { success: true };
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      return {
        success: false,
        error: 'Storage full — your browser storage is at capacity. Try removing unused brands or assets to free space.',
      };
    }
    return {
      success: false,
      error: `Storage error: ${e instanceof Error ? e.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validate a file before upload.
 */
export function validateUploadFile(file: File, options: {
  maxSizeMB?: number;
  acceptedTypes?: string[];
} = {}): { valid: boolean; error?: string } {
  const { maxSizeMB = 5, acceptedTypes } = options;

  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File too large — max ${maxSizeMB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.` };
  }

  if (acceptedTypes && !acceptedTypes.some(t => file.type.startsWith(t) || file.name.endsWith(t))) {
    return { valid: false, error: `Unsupported file type: ${file.type || file.name.split('.').pop()}. Accepted: ${acceptedTypes.join(', ')}` };
  }

  return { valid: true };
}
