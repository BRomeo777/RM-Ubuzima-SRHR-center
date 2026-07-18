import imageCompression from 'browser-image-compression';

// Max file size for uploads (5MB)
const MAX_FILE_SIZE_MB = 5;

// Group profile photos storage limit (10MB) - only localStorage usage
const MAX_GROUP_PHOTOS_STORAGE_MB = 10;

export async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_FILE_SIZE_MB * 1024 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: MAX_FILE_SIZE_MB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error('Failed to compress image');
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get group profile photos storage usage only
 * All other data is now stored in Firebase, not localStorage
 */
export function getGroupPhotosStorageUsage(): number {
  const groupPhotos = localStorage.getItem('rm-ubuzima-group-photos');
  if (!groupPhotos) return 0;
  return new Blob([groupPhotos]).size / (1024 * 1024);
}

/**
 * Check if group photos storage is within limit
 */
export function checkStorageLimit(): boolean {
  const usage = getGroupPhotosStorageUsage();
  return usage < MAX_GROUP_PHOTOS_STORAGE_MB;
}

/**
 * Get warning if group photos storage is nearing limit
 * Returns null if no warning needed
 */
export function getStorageWarning(): string | null {
  const usage = getGroupPhotosStorageUsage();
  if (usage >= MAX_GROUP_PHOTOS_STORAGE_MB * 0.9) {
    return `Group photos storage critical: ${usage.toFixed(2)}MB / ${MAX_GROUP_PHOTOS_STORAGE_MB}MB. Delete old group photos.`;
  }
  if (usage >= MAX_GROUP_PHOTOS_STORAGE_MB * 0.75) {
    return `Group photos storage: ${usage.toFixed(2)}MB / ${MAX_GROUP_PHOTOS_STORAGE_MB}MB`;
  }
  return null;
}

/**
 * @deprecated All data is now stored in Firebase. Use getGroupPhotosStorageUsage() for group photos only.
 */
export function getStorageUsage(): number {
  return getGroupPhotosStorageUsage();
}

export function validateFileSize(file: File): { valid: boolean; message?: string } {
  const maxSize = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds ${MAX_FILE_SIZE_MB}MB limit`,
    };
  }
  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
