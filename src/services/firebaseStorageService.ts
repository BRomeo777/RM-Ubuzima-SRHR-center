import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebaseConfig';

const storage = getStorage(app);

/**
 * Compress an image file for faster upload
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default 1200)
 * @param quality - JPEG quality 0-1 (default 0.85)
 * @returns Compressed image as Blob
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // If file is already small (< 200KB), don't compress
    if (file.size < 200 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob conversion failed'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload an image to Firebase Storage
 * @param file - File or Blob to upload
 * @param path - Storage path (e.g., 'logos', 'avatars', 'carousel')
 * @param filename - Optional filename (if not provided, generates unique ID)
 * @returns Download URL
 */
export async function uploadImage(
  file: File | Blob,
  path: string,
  filename?: string,
  compress: boolean = true
): Promise<string> {
  try {
    // Compress if it's a File and compression is enabled
    let fileToUpload = file;
    if (compress && file instanceof File && file.type.startsWith('image/')) {
      try {
        fileToUpload = await compressImage(file, 1200, 0.85);
        console.log(`[Storage] Compressed image from ${file.size} to ${fileToUpload.size} bytes`);
      } catch (err) {
        console.warn('[Storage] Compression failed, uploading original:', err);
      }
    }

    const uniqueName = filename || `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const storageRef = ref(storage, `${path}/${uniqueName}`);
    
    const snapshot = await uploadBytes(storageRef, fileToUpload);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Delete an image from Firebase Storage by URL
 * @param url - The download URL of the image to delete
 */
export async function deleteImageByUrl(url: string): Promise<void> {
  try {
    // Extract path from URL
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)\?/);
    if (!pathMatch) return;
    
    const path = decodeURIComponent(pathMatch[1]);
    const imageRef = ref(storage, path);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - image might already be deleted
  }
}

/**
 * Convert base64 to Blob for upload
 */
export function base64ToBlob(base64: string, type = 'image/png'): Blob {
  const byteString = atob(base64.split(',')[1] || base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type });
}

/**
 * Check if a string is a base64 image
 */
export function isBase64Image(str: string): boolean {
  return str.startsWith('data:image') || /^[A-Za-z0-9+/=]+$/.test(str);
}

/**
 * Upload an image with progress tracking
 * @param file - File or Blob to upload
 * @param path - Storage path
 * @param filename - Optional filename
 * @param onProgress - Callback for progress updates (0-100)
 * @returns Download URL
 */
export async function uploadImageWithProgress(
  file: File | Blob,
  path: string,
  filename?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uniqueName = filename || `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const storageRef = ref(storage, `${path}/${uniqueName}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(Math.round(progress));
      },
      (error) => {
        reject(new Error('Upload failed'));
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
}

export { storage };
