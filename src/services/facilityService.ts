// =============================================================================
// RM UBUZIMA - FACILITY SERVICE
// Admin Facility Management with Firebase Integration
// =============================================================================

import { db } from './firebaseConfig';
import type { Facility } from '../types';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { smartCache } from '../utils/performanceOptimizations';

const FACILITIES_COLLECTION = 'facilities';
const FACILITIES_CACHE_KEY = 'admin_facilities';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Facility converter for Firestore
const facilityConverter = {
  toFirestore(facility: Partial<Facility>): DocumentData {
    return {
      ...facility,
      updatedAt: Timestamp.now(),
      createdAt: facility.id ? undefined : Timestamp.now(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Facility {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name,
      type: data.type,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      phone: data.phone || '',
      services: data.services || [],
      hours: data.hours || '',
      googleMapsLink: data.googleMapsLink || '',
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString(),
    } as Facility;
  }
};

class FacilityService {
  private listeners: (() => void)[] = [];

  // =============================================================================
  // GET ALL FACILITIES - With caching for extreme performance
  // =============================================================================
  async getAllFacilities(forceRefresh = false): Promise<Facility[]> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await smartCache.get(FACILITIES_CACHE_KEY);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('[FacilityService] Returning cached facilities');
        return cached.facilities;
      }
    }

    try {
      const facilitiesRef = collection(db, FACILITIES_COLLECTION);
      const q = query(facilitiesRef, orderBy('name'));
      const snapshot = await getDocs(q);
      
      const facilities = snapshot.docs.map(doc => facilityConverter.fromFirestore(doc as QueryDocumentSnapshot));
      
      // Cache results
      await smartCache.set(FACILITIES_CACHE_KEY, {
        facilities,
        timestamp: Date.now()
      });
      
      console.log(`[FacilityService] Loaded ${facilities.length} facilities from Firestore`);
      return facilities;
    } catch (error) {
      console.error('[FacilityService] Error loading facilities:', error);
      // Return cached data as fallback
      const cached = await smartCache.get(FACILITIES_CACHE_KEY);
      return cached?.facilities || [];
    }
  }

  // =============================================================================
  // REAL-TIME FACILITY LISTENER - For instant updates
  // =============================================================================
  onFacilitiesChanged(callback: (facilities: Facility[]) => void): () => void {
    const facilitiesRef = collection(db, FACILITIES_COLLECTION);
    const q = query(facilitiesRef, orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const facilities = snapshot.docs.map(doc => facilityConverter.fromFirestore(doc as QueryDocumentSnapshot));
      
      // Update cache
      smartCache.set(FACILITIES_CACHE_KEY, {
        facilities,
        timestamp: Date.now()
      });
      
      callback(facilities);
    }, (error) => {
      console.error('[FacilityService] Real-time listener error:', error);
    });

    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  // =============================================================================
  // ADD NEW FACILITY
  // =============================================================================
  async addFacility(facility: Omit<Facility, 'id'>, userId: string): Promise<Facility> {
    try {
      const facilitiesRef = collection(db, FACILITIES_COLLECTION);
      const docRef = await addDoc(facilitiesRef, {
        ...facility,
        createdBy: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Clear cache to force refresh
      await this.clearCache();

      console.log('[FacilityService] Added facility:', docRef.id);
      return {
        ...facility,
        id: docRef.id,
      } as Facility;
    } catch (error) {
      console.error('[FacilityService] Error adding facility:', error);
      throw error;
    }
  }

  // =============================================================================
  // UPDATE FACILITY
  // =============================================================================
  async updateFacility(facilityId: string, updates: Partial<Facility>): Promise<void> {
    try {
      const facilityRef = doc(db, FACILITIES_COLLECTION, facilityId);
      await updateDoc(facilityRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      // Clear cache
      await this.clearCache();
      
      console.log('[FacilityService] Updated facility:', facilityId);
    } catch (error) {
      console.error('[FacilityService] Error updating facility:', error);
      throw error;
    }
  }

  // =============================================================================
  // DELETE FACILITY
  // =============================================================================
  async deleteFacility(facilityId: string): Promise<void> {
    try {
      const facilityRef = doc(db, FACILITIES_COLLECTION, facilityId);
      await deleteDoc(facilityRef);

      // Clear cache
      await this.clearCache();
      
      console.log('[FacilityService] Deleted facility:', facilityId);
    } catch (error) {
      console.error('[FacilityService] Error deleting facility:', error);
      throw error;
    }
  }

  // =============================================================================
  // BATCH IMPORT FACILITIES - For admin bulk upload
  // =============================================================================
  async batchImport(facilities: Omit<Facility, 'id'>[], userId: string): Promise<number> {
    try {
      const batch = writeBatch(db);
      const facilitiesRef = collection(db, FACILITIES_COLLECTION);
      
      let count = 0;
      for (const facility of facilities) {
        const newDocRef = doc(facilitiesRef);
        batch.set(newDocRef, {
          ...facility,
          createdBy: userId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        count++;
        
        // Firestore limit is 500 operations per batch
        if (count % 400 === 0) {
          await batch.commit();
          console.log(`[FacilityService] Imported ${count} facilities...`);
        }
      }
      
      // Commit remaining
      await batch.commit();
      
      // Clear cache
      await this.clearCache();
      
      console.log(`[FacilityService] Batch imported ${count} facilities`);
      return count;
    } catch (error) {
      console.error('[FacilityService] Error batch importing:', error);
      throw error;
    }
  }

  // =============================================================================
  // EXPORT FACILITIES - For backup/admin export
  // =============================================================================
  async exportFacilities(): Promise<Facility[]> {
    return this.getAllFacilities(true);
  }

  // =============================================================================
  // GET FACILITY BY ID
  // =============================================================================
  async getFacilityById(facilityId: string): Promise<Facility | null> {
    try {
      const facilityRef = doc(db, FACILITIES_COLLECTION, facilityId);
      const snapshot = await getDoc(facilityRef);
      
      if (!snapshot.exists()) return null;
      
      return facilityConverter.fromFirestore(snapshot as QueryDocumentSnapshot);
    } catch (error) {
      console.error('[FacilityService] Error getting facility:', error);
      return null;
    }
  }

  // =============================================================================
  // CLEAR CACHE
  // =============================================================================
  async clearCache(): Promise<void> {
    await smartCache.set(FACILITIES_CACHE_KEY, null);
    console.log('[FacilityService] Cache cleared');
  }

  // =============================================================================
  // CLEANUP LISTENERS
  // =============================================================================
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
  }
}

// Export singleton
export const facilityService = new FacilityService();
export default facilityService;
