// LOCAL DEVICE STORAGE - WhatsApp-style (stored on admin's device)
// No Firebase Storage needed - photos are stored locally as base64

export interface LandingPagePhotos {
  mainHero: (string | null)[];
  rmAdminAI: (string | null)[];
  anonymousChat: (string | null)[];
  bookDoctor: (string | null)[];
  girlsRoom: (string | null)[];
  findServices: (string | null)[];
  emergency: (string | null)[];
  srhrLibrary: (string | null)[];
  dailyFeeds: (string | null)[];
  bazaMuganga: (string | null)[];
}

const STORAGE_KEY = 'rm_ubuzima_landing_photos';

const defaultPhotos: LandingPagePhotos = {
  mainHero: [
    '/landing-photos/hero-1.png',
    '/landing-photos/hero-2.png',
    '/landing-photos/hero-3.png',
    '/landing-photos/hero-4.jpg'
  ],
  rmAdminAI: [null, null, null],
  anonymousChat: [null, null, null],
  bookDoctor: [null, null, null],
  girlsRoom: [null, null, null],
  findServices: [null, null, null],
  emergency: [null, null, null],
  srhrLibrary: [null, null, null],
  dailyFeeds: [null, null, null],
  bazaMuganga: [null, null, null]
};

// Local storage listeners for real-time sync
const listeners: Set<(photos: LandingPagePhotos) => void> = new Set();

function notifyListeners(photos: LandingPagePhotos) {
  listeners.forEach(listener => listener(photos));
}

// Compress and convert to base64 instantly
async function fileToBase64(file: File, maxWidth: number = 1200, quality: number = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert directly to base64 JPEG
      const base64 = canvas.toDataURL('image/jpeg', quality);
      resolve(base64);
    };
    img.onerror = () => reject(new Error('Image loading failed'));
  });
}

function getOptimalDimensions(section: keyof LandingPagePhotos): { maxWidth: number; quality: number } {
  if (section === 'mainHero') {
    return { maxWidth: 1600, quality: 0.9 };
  }
  return { maxWidth: 800, quality: 0.85 };
}

// Load from localStorage (device storage)
export function getLandingPagePhotos(): LandingPagePhotos {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultPhotos, ...JSON.parse(stored) };
    }
    return defaultPhotos;
  } catch (error) {
    console.error('Error loading landing page photos:', error);
    return defaultPhotos;
  }
}

// Save to localStorage (device storage)
function saveLandingPagePhotos(photos: LandingPagePhotos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    notifyListeners(photos);
  } catch (error) {
    console.error('Error saving landing page photos:', error);
    throw new Error('Storage full. Please delete some photos first.');
  }
}

// Subscribe to changes (real-time sync)
export function subscribeToLandingPagePhotos(callback: (photos: LandingPagePhotos) => void): () => void {
  listeners.add(callback);
  // Send current data immediately
  callback(getLandingPagePhotos());
  
  // Listen for storage changes from other tabs
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getLandingPagePhotos());
    }
  };
  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorageChange);
  };
}

export interface UploadProgress {
  previewUrl: string;
  progress: number;
  status: 'processing' | 'complete' | 'error';
  error?: string;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

// INSTANT UPLOAD - Direct to device storage (no cloud)
export async function uploadLandingPagePhotoInstant(
  section: keyof LandingPagePhotos,
  index: number,
  file: File,
  onProgress: UploadProgressCallback
): Promise<string> {
  // Step 1: Instant preview
  const previewUrl = URL.createObjectURL(file);
  onProgress({ previewUrl, progress: 0, status: 'processing' });
  
  try {
    // Step 2: Compress and convert to base64 (happens locally on device)
    const { maxWidth, quality } = getOptimalDimensions(section);
    onProgress({ previewUrl, progress: 50, status: 'processing' });
    
    const base64 = await fileToBase64(file, maxWidth, quality);
    
    // Step 3: Save to device storage (instant - no network)
    const photos = getLandingPagePhotos();
    const updatedSection = [...photos[section]];
    updatedSection[index] = base64;
    
    const updatedPhotos = {
      ...photos,
      [section]: updatedSection
    };
    
    saveLandingPagePhotos(updatedPhotos);
    
    URL.revokeObjectURL(previewUrl);
    onProgress({ previewUrl: base64, progress: 100, status: 'complete' });
    
    return base64;
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    onProgress({ previewUrl: '', progress: 0, status: 'error', error: (error as Error).message });
    throw error;
  }
}

// Simple upload without progress tracking
export async function uploadLandingPagePhoto(
  section: keyof LandingPagePhotos,
  index: number,
  file: File
): Promise<string> {
  const { maxWidth, quality } = getOptimalDimensions(section);
  const base64 = await fileToBase64(file, maxWidth, quality);
  
  const photos = getLandingPagePhotos();
  const updatedSection = [...photos[section]];
  updatedSection[index] = base64;
  
  saveLandingPagePhotos({
    ...photos,
    [section]: updatedSection
  });
  
  return base64;
}

// Delete from device storage
export async function deleteLandingPagePhoto(
  section: keyof LandingPagePhotos,
  index: number
): Promise<void> {
  const photos = getLandingPagePhotos();
  const updatedSection = [...photos[section]];
  updatedSection[index] = null;
  
  saveLandingPagePhotos({
    ...photos,
    [section]: updatedSection
  });
}
