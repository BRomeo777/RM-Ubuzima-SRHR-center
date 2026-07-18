import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, Timestamp, enableIndexedDbPersistence, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { app } from './firebaseConfig';
import type { AIPost, Appointment, Organization, StatusUpdate, EmergencyContact, Facility, Topic, Article } from '../types';

// Get Firestore instance from initialized app
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err: { code: string }) => {
  if (err.code === 'failed-precondition') {
    console.log('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.log('Persistence not supported in this browser');
  }
});

// Collection names
const COLLECTIONS = {
  aiPosts: 'aiPosts',
  appointments: 'appointments',
  organizations: 'organizations',
  statusUpdates: 'statusUpdates',
  emergencyContacts: 'emergencyContacts',
  facilities: 'facilities',
  topics: 'topics',
  articles: 'articles',
  settings: 'settings'
};

// ===================== AI POSTS =====================

export async function getAIPosts(): Promise<AIPost[]> {
  try {
    const q = query(collection(db, COLLECTIONS.aiPosts), orderBy('timestamp', 'desc'));
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
      timestamp: doc.data().timestamp?.toDate?.().toISOString() || new Date().toISOString()
    } as AIPost));
  } catch (error) {
    console.error('Error getting AI posts:', error);
    return [];
  }
}

export function subscribeToAIPosts(callback: (posts: AIPost[]) => void) {
  const q = query(collection(db, COLLECTIONS.aiPosts), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const posts = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
      timestamp: doc.data().timestamp?.toDate?.().toISOString() || new Date().toISOString()
    } as AIPost));
    callback(posts);
  });
}

export async function addAIPost(post: Omit<AIPost, 'id' | 'timestamp'>): Promise<AIPost | null> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.aiPosts), {
      ...post,
      timestamp: Timestamp.now()
    });
    return { ...post, id: docRef.id, timestamp: new Date().toISOString() } as AIPost;
  } catch (error) {
    console.error('Error adding AI post:', error);
    return null;
  }
}

export async function updateAIPost(id: string, updates: Partial<AIPost>): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.aiPosts, id), updates);
    return true;
  } catch (error) {
    console.error('Error updating AI post:', error);
    return false;
  }
}

export async function deleteAIPost(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.aiPosts, id));
    return true;
  } catch (error) {
    console.error('Error deleting AI post:', error);
    return false;
  }
}

// ===================== APPOINTMENTS =====================

export async function getAppointments(): Promise<Appointment[]> {
  try {
    const q = query(collection(db, COLLECTIONS.appointments), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString()
    } as Appointment));
  } catch (error) {
    console.error('Error getting appointments:', error);
    return [];
  }
}

export function subscribeToAppointments(callback: (appointments: Appointment[]) => void) {
  const q = query(collection(db, COLLECTIONS.appointments), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const appointments = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString()
    } as Appointment));
    callback(appointments);
  });
}

export async function addAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'referenceNumber'>): Promise<Appointment | null> {
  try {
    console.log('[Firebase] Adding appointment:', appointment);
    const referenceNumber = `APT-${Date.now().toString(36).toUpperCase()}`;
    console.log('[Firebase] Generated reference number:', referenceNumber);

    // Remove undefined values - Firestore doesn't accept undefined
    const cleanAppointment: any = {};
    for (const [key, value] of Object.entries(appointment)) {
      if (value !== undefined) {
        cleanAppointment[key] = value;
      }
    }

    const appointmentData = {
      ...cleanAppointment,
      referenceNumber,
      createdAt: Timestamp.now()
    };
    console.log('[Firebase] Saving to Firestore (cleaned):', appointmentData);

    const docRef = await addDoc(collection(db, COLLECTIONS.appointments), appointmentData);
    console.log('[Firebase] Appointment saved successfully with ID:', docRef.id);

    return { ...appointment, id: docRef.id, referenceNumber, createdAt: new Date().toISOString() } as Appointment;
  } catch (error: any) {
    console.error('[Firebase] Error adding appointment:', error);
    console.error('[Firebase] Error code:', error?.code);
    console.error('[Firebase] Error message:', error?.message);
    throw new Error(`Firebase error: ${error?.message || 'Unknown error'}`);
  }
}

export async function updateAppointment(id: string, updates: Partial<Appointment>): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.appointments, id), updates);
    return true;
  } catch (error) {
    console.error('Error updating appointment:', error);
    return false;
  }
}

export async function deleteAppointment(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.appointments, id));
    return true;
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return false;
  }
}

// ===================== ORGANIZATIONS =====================

export async function getOrganizations(): Promise<Organization[]> {
  try {
    const q = query(collection(db, COLLECTIONS.organizations), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString()
    } as Organization));
  } catch (error) {
    console.error('Error getting organizations:', error);
    return [];
  }
}

export function subscribeToOrganizations(callback: (orgs: Organization[]) => void) {
  const q = query(collection(db, COLLECTIONS.organizations), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const orgs = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString()
    } as Organization));
    callback(orgs);
  });
}

export async function addOrganization(org: Omit<Organization, 'id' | 'createdAt'>): Promise<Organization | null> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.organizations), {
      ...org,
      createdAt: Timestamp.now()
    });
    return { ...org, id: docRef.id, createdAt: new Date().toISOString() } as Organization;
  } catch (error) {
    console.error('Error adding organization:', error);
    return null;
  }
}

export async function updateOrganization(id: string, updates: Partial<Organization>): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.organizations, id), updates);
    return true;
  } catch (error) {
    console.error('Error updating organization:', error);
    return false;
  }
}

export async function deleteOrganization(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.organizations, id));
    return true;
  } catch (error) {
    console.error('Error deleting organization:', error);
    return false;
  }
}

// ===================== STATUS UPDATES =====================

export async function getStatusUpdates(): Promise<StatusUpdate[]> {
  try {
    const q = query(collection(db, COLLECTIONS.statusUpdates), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      timestamp: doc.data().timestamp?.toDate?.().toISOString() || new Date().toISOString(),
      expiresAt: doc.data().expiresAt?.toDate?.().toISOString() || new Date().toISOString()
    } as StatusUpdate));
  } catch (error) {
    console.error('Error getting status updates:', error);
    return [];
  }
}

export function subscribeToStatusUpdates(callback: (updates: StatusUpdate[]) => void) {
  const q = query(collection(db, COLLECTIONS.statusUpdates), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const updates = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      timestamp: doc.data().timestamp?.toDate?.().toISOString() || new Date().toISOString(),
      expiresAt: doc.data().expiresAt?.toDate?.().toISOString() || new Date().toISOString()
    } as StatusUpdate));
    callback(updates);
  });
}

export async function addStatusUpdate(update: Omit<StatusUpdate, 'id' | 'timestamp' | 'expiresAt'>): Promise<StatusUpdate | null> {
  try {
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const docRef = await addDoc(collection(db, COLLECTIONS.statusUpdates), {
      ...update,
      timestamp: now,
      expiresAt: expiresAt
    });
    return { ...update, id: docRef.id, timestamp: now.toDate().toISOString(), expiresAt: expiresAt.toDate().toISOString() } as StatusUpdate;
  } catch (error) {
    console.error('Error adding status update:', error);
    return null;
  }
}

export async function deleteStatusUpdate(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.statusUpdates, id));
    return true;
  } catch (error) {
    console.error('Error deleting status update:', error);
    return false;
  }
}

// ===================== EMERGENCY CONTACTS =====================

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.emergencyContacts));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as EmergencyContact));
  } catch (error) {
    console.error('Error getting emergency contacts:', error);
    return [];
  }
}

export function subscribeToEmergencyContacts(callback: (contacts: EmergencyContact[]) => void) {
  return onSnapshot(collection(db, COLLECTIONS.emergencyContacts), (snapshot) => {
    const contacts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as EmergencyContact));
    callback(contacts);
  });
}

export async function addEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact | null> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.emergencyContacts), contact);
    return { ...contact, id: docRef.id } as EmergencyContact;
  } catch (error) {
    console.error('Error adding emergency contact:', error);
    return null;
  }
}

export async function updateEmergencyContact(id: string, updates: Partial<EmergencyContact>): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.emergencyContacts, id), updates);
    return true;
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    return false;
  }
}

export async function deleteEmergencyContact(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.emergencyContacts, id));
    return true;
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    return false;
  }
}

// ===================== FACILITIES =====================

export async function getFacilities(): Promise<Facility[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.facilities));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Facility));
  } catch (error) {
    console.error('Error getting facilities:', error);
    return [];
  }
}

export function subscribeToFacilities(callback: (facilities: Facility[]) => void) {
  return onSnapshot(collection(db, COLLECTIONS.facilities), (snapshot) => {
    const facilities = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Facility));
    callback(facilities);
  });
}

export async function addFacility(facility: Omit<Facility, 'id'>): Promise<Facility | null> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.facilities), facility);
    return { ...facility, id: docRef.id } as Facility;
  } catch (error) {
    console.error('Error adding facility:', error);
    return null;
  }
}

export async function updateFacility(id: string, updates: Partial<Facility>): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.facilities, id), updates);
    return true;
  } catch (error) {
    console.error('Error updating facility:', error);
    return false;
  }
}

export async function deleteFacility(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.facilities, id));
    return true;
  } catch (error) {
    console.error('Error deleting facility:', error);
    return false;
  }
}

// ===================== SETTINGS =====================

export async function getSettings(): Promise<any> {
  try {
    const docRef = doc(db, COLLECTIONS.settings, 'main');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data();
    }
    // Return default settings if none exist
    return {
      platformLogo: '',
      appEmail: 'rmubuzima@gmail.com',
      aiAvatars: [],
      carouselPhotos: [],
      termsContent: '',
      privacyContent: '',
      notificationsEnabled: true,
      darkModeEnabled: false,
      // API Keys and AI Settings
      groqApiKey: '',
      googleApiKey: '',
      groqModel: 'llama-3.3-70b-versatile',
      // App Settings
      bookDoctorEmail: '',
      bazaMugangaLink: 'https://meet.jit.si/rm-ubuzima-baza-muganga',
      bazaMugangaTopic: 'Sexual and Reproductive Health Q&A',
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return null;
  }
}

export function subscribeToSettings(callback: (settings: any) => void) {
  const docRef = doc(db, COLLECTIONS.settings, 'main');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      // Return defaults if no settings exist
      callback({
        platformLogo: '',
        appEmail: 'rmubuzima@gmail.com',
        aiAvatars: [],
        carouselPhotos: [],
        termsContent: '',
        privacyContent: '',
        notificationsEnabled: true,
        darkModeEnabled: false,
        // API Keys and AI Settings
        groqApiKey: '',
        googleApiKey: '',
        groqModel: 'llama-3.3-70b-versatile',
        // App Settings
        bookDoctorEmail: '',
        bazaMugangaLink: 'https://meet.jit.si/rm-ubuzima-baza-muganga',
        bazaMugangaTopic: 'Sexual and Reproductive Health Q&A',
      });
    }
  });
}

export async function updateSettings(settings: any): Promise<boolean> {
  try {
    await setDoc(doc(db, COLLECTIONS.settings, 'main'), settings, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating settings:', error);
    return false;
  }
}

// ===================== TOPICS =====================

export async function getTopics(): Promise<Topic[]> {
  try {
    const q = query(collection(db, COLLECTIONS.topics), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Topic));
  } catch (error) {
    console.error('Error getting topics:', error);
    return [];
  }
}

export function subscribeToTopics(callback: (topics: Topic[]) => void) {
  const q = query(collection(db, COLLECTIONS.topics), orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const topics = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Topic));
    callback(topics);
  });
}

export async function addTopic(topic: Omit<Topic, 'id'>): Promise<Topic | null> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.topics), topic);
    return { ...topic, id: docRef.id } as Topic;
  } catch (error) {
    console.error('Error adding topic:', error);
    return null;
  }
}

export async function updateTopic(id: string, updates: Partial<Topic>): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.topics, id), updates);
    return true;
  } catch (error) {
    console.error('Error updating topic:', error);
    return false;
  }
}

export async function deleteTopic(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.topics, id));
    return true;
  } catch (error) {
    console.error('Error deleting topic:', error);
    return false;
  }
}

// ===================== ARTICLES =====================

export async function getArticles(): Promise<Article[]> {
  try {
    const q = query(collection(db, COLLECTIONS.articles), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString()
    } as Article));
  } catch (error) {
    console.error('Error getting articles:', error);
    return [];
  }
}

export function subscribeToArticles(callback: (articles: Article[]) => void) {
  const q = query(collection(db, COLLECTIONS.articles), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const articles = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString()
    } as Article));
    callback(articles);
  });
}

export async function addArticle(article: Omit<Article, 'id' | 'createdAt'>): Promise<Article | null> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.articles), {
      ...article,
      createdAt: Timestamp.now()
    });
    return { ...article, id: docRef.id, createdAt: new Date().toISOString() } as Article;
  } catch (error) {
    console.error('Error adding article:', error);
    return null;
  }
}

export async function updateArticle(id: string, updates: Partial<Article>): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTIONS.articles, id), updates);
    return true;
  } catch (error) {
    console.error('Error updating article:', error);
    return false;
  }
}

export async function deleteArticle(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.articles, id));
    return true;
  } catch (error) {
    console.error('Error deleting article:', error);
    return false;
  }
}

// ===================== USERS =====================

export async function updateUserInFirebase(userId: string, updates: Partial<{ name: string; avatar: string; lastProfileEdit: string; createdAt: string }>): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, updates, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating user in Firebase:', error);
    return false;
  }
}

export async function getUserFromFirebase(userId: string): Promise<{ name: string; avatar: string; lastProfileEdit?: string; createdAt?: string; isFacilitator?: boolean; facilitatorAssignedAt?: string; facilitatorAssignedBy?: string; facilitatorRole?: string; facilitatorBadges?: ('F' | 'S' | 'H')[]; facilitatorPermissions?: any; isBanned?: boolean; bannedAt?: string; bannedBy?: string } | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as { name: string; avatar: string; lastProfileEdit?: string; createdAt?: string; isFacilitator?: boolean; facilitatorAssignedAt?: string; facilitatorAssignedBy?: string; facilitatorRole?: string; facilitatorBadges?: ('F' | 'S' | 'H')[]; facilitatorPermissions?: any; isBanned?: boolean; bannedAt?: string; bannedBy?: string };
    }
    return null;
  } catch (error) {
    console.error('Error getting user from Firebase:', error);
    return null;
  }
}

/**
 * Save facilitator status to user document in Firestore
 * This ensures facilitator status persists across devices
 */
export async function saveFacilitatorStatusToUser(userId: string, facilitatorData: {
  isFacilitator: boolean;
  assignedAt: string;
  assignedBy: string;
  role: string;
  badges: ('F' | 'S' | 'H')[];
  permissions: {
    canDeleteMessages: boolean;
    canBanUsers: boolean;
    canSendAnnouncements: boolean;
    canPostDailyFeed: boolean;
    canPostNewsFeed: boolean;
    canPostStatus: boolean;
    canManageSRHR: boolean;
    canManageEmergency: boolean;
  };
}): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      isFacilitator: facilitatorData.isFacilitator,
      facilitatorAssignedAt: facilitatorData.assignedAt,
      facilitatorAssignedBy: facilitatorData.assignedBy,
      facilitatorRole: facilitatorData.role,
      facilitatorBadges: facilitatorData.badges,
      facilitatorPermissions: facilitatorData.permissions,
    }, { merge: true });
    console.log('[Firebase Service] Facilitator status saved to user document:', userId);
    return true;
  } catch (error) {
    console.error('[Firebase Service] Error saving facilitator status to user:', error);
    return false;
  }
}

/**
 * Remove facilitator status from user document in Firestore
 * Called when admin removes a facilitator
 */
export async function removeFacilitatorStatusFromUser(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isFacilitator: false,
      facilitatorRemovedAt: new Date().toISOString(),
    });
    console.log('[Firebase Service] Facilitator status removed from user document:', userId);
    return true;
  } catch (error) {
    console.error('[Firebase Service] Error removing facilitator status from user:', error);
    return false;
  }
}

/**
 * Ban a user in Firestore - prevents them from accessing the app
 * Called by admin to completely ban a user
 */
export async function banUserInFirebase(userId: string, bannedBy: string, reason?: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isBanned: true,
      bannedAt: new Date().toISOString(),
      bannedBy: bannedBy,
      banReason: reason || 'Banned by admin',
    });
    console.log('[Firebase Service] User banned:', userId);
    return true;
  } catch (error) {
    console.error('[Firebase Service] Error banning user:', error);
    return false;
  }
}

/**
 * Unban a user in Firestore - restores their app access
 * Called by admin to unban a user
 */
export async function unbanUserInFirebase(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isBanned: false,
      unbannedAt: new Date().toISOString(),
    });
    console.log('[Firebase Service] User unbanned:', userId);
    return true;
  } catch (error) {
    console.error('[Firebase Service] Error unbanning user:', error);
    return false;
  }
}

/**
 * Admin update user name in Firestore
 * Allows admin to change a user's name on their behalf
 */
export async function adminUpdateUserNameInFirebase(userId: string, newName: string, adminId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      name: newName,
      nameUpdatedBy: adminId,
      nameUpdatedAt: new Date().toISOString(),
    });
    console.log('[Firebase Service] User name updated by admin:', userId, '->', newName);
    return true;
  } catch (error) {
    console.error('[Firebase Service] Error updating user name:', error);
    return false;
  }
}

/**
 * Get all users from Firestore
 * Used by admin to see all members
 */
export async function getAllUsersFromFirebase(): Promise<Array<{
  id: string;
  name: string;
  avatar: string;
  email?: string;
  createdAt?: string;
  isBanned?: boolean;
  bannedAt?: string;
  bannedBy?: string;
  isFacilitator?: boolean;
}>> {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const users: Array<{
      id: string;
      name: string;
      avatar: string;
      email?: string;
      createdAt?: string;
      isBanned?: boolean;
      bannedAt?: string;
      bannedBy?: string;
      isFacilitator?: boolean;
    }> = [];
    usersSnap.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        name: data.name || 'Unknown',
        avatar: data.avatar || '',
        email: data.email,
        createdAt: data.createdAt,
        isBanned: data.isBanned,
        bannedAt: data.bannedAt,
        bannedBy: data.bannedBy,
        isFacilitator: data.isFacilitator,
      });
    });
    return users;
  } catch (error) {
    console.error('[Firebase Service] Error getting all users:', error);
    return [];
  }
}

export { db, COLLECTIONS };
