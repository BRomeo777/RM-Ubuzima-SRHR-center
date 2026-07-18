import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Local Storage Store - For Group Profile Photos Only
 * WhatsApp-style: Photos stored locally on user's device
 * All other data is stored in Firebase
 */

interface LocalStorageState {
  // Group profile photos stored locally (WhatsApp-style)
  groupProfilePhotos: Record<string, string>; // groupId -> base64 image
  
  // Actions
  setGroupProfilePhoto: (groupId: string, photoBase64: string | null) => void;
  getGroupProfilePhoto: (groupId: string) => string | null;
  deleteGroupProfilePhoto: (groupId: string) => void;
  clearAllGroupPhotos: () => void;
}

// Maximum storage for group photos (10MB - reasonable for profile photos)
const MAX_GROUP_PHOTOS_SIZE_MB = 10;

export const useLocalStorageStore = create<LocalStorageState>()(
  persist(
    (set, get) => ({
      // Initial state
      groupProfilePhotos: {},

      // Set group profile photo
      setGroupProfilePhoto: (groupId: string, photoBase64: string | null) => {
        set((state) => {
          const newPhotos = { ...state.groupProfilePhotos };
          
          if (photoBase64 === null) {
            delete newPhotos[groupId];
          } else {
            // Check size before adding
            const currentSize = JSON.stringify(state.groupProfilePhotos).length;
            const newPhotoSize = photoBase64.length;
            const totalSizeMB = (currentSize + newPhotoSize) / (1024 * 1024);
            
            if (totalSizeMB > MAX_GROUP_PHOTOS_SIZE_MB) {
              console.warn('[LocalStorage] Group photos size limit reached. Removing oldest photos.');
              // Remove oldest photos (first 5 entries) to make room
              const entries = Object.entries(newPhotos);
              if (entries.length > 0) {
                const entriesToRemove = entries.slice(0, 5);
                entriesToRemove.forEach(([id]) => delete newPhotos[id]);
              }
            }
            
            newPhotos[groupId] = photoBase64;
          }
          
          return { groupProfilePhotos: newPhotos };
        });
      },

      // Get group profile photo
      getGroupProfilePhoto: (groupId: string) => {
        return get().groupProfilePhotos[groupId] || null;
      },

      // Delete group profile photo
      deleteGroupProfilePhoto: (groupId: string) => {
        set((state) => {
          const newPhotos = { ...state.groupProfilePhotos };
          delete newPhotos[groupId];
          return { groupProfilePhotos: newPhotos };
        });
      },

      // Clear all group photos
      clearAllGroupPhotos: () => {
        set({ groupProfilePhotos: {} });
      },
    }),
    {
      name: 'rm-ubuzima-group-photos',
      storage: createJSONStorage(() => localStorage),
      // Only persist groupProfilePhotos
      partialize: (state) => ({ groupProfilePhotos: state.groupProfilePhotos }),
    }
  )
);

// Helper function to calculate total size of group photos
export function getGroupPhotosStorageUsage(): number {
  const state = useLocalStorageStore.getState();
  const sizeInBytes = JSON.stringify(state.groupProfilePhotos).length;
  return sizeInBytes / (1024 * 1024); // Return size in MB
}

// Helper to check if group photos storage is nearing limit
export function getGroupPhotosStorageWarning(): string | null {
  const usage = getGroupPhotosStorageUsage();
  if (usage >= MAX_GROUP_PHOTOS_SIZE_MB * 0.9) {
    return `Group photos storage at ${usage.toFixed(2)}MB / ${MAX_GROUP_PHOTOS_SIZE_MB}MB. Consider removing old group photos.`;
  }
  if (usage >= MAX_GROUP_PHOTOS_SIZE_MB * 0.75) {
    return `Group photos storage: ${usage.toFixed(2)}MB / ${MAX_GROUP_PHOTOS_SIZE_MB}MB`;
  }
  return null;
}
