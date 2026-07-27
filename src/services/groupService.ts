import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  getDocs,
  getDoc,
  limit,
  serverTimestamp,
  runTransaction,
  type QuerySnapshot,
  type DocumentData 
} from 'firebase/firestore';
import { app } from './firebaseConfig';
import { queryRMAdminAI } from './ubuzimaAIService';
import type { Group, GroupMessage, GroupRequest, GroupFacilitator, GroupMember, GroupAdmin, GroupJoinRequest, GroupPermissions, GroupSettings, Language } from '../types';

const db = getFirestore(app);

console.log('[groupService] Firestore initialized, app:', app?.name || 'default');

// COLLECTION PATHS
const GROUPS_COLLECTION = 'groups';
const GROUP_MESSAGES_COLLECTION = 'group_messages';
const GROUP_JOIN_REQUESTS_COLLECTION = 'group_join_requests';
const GROUP_REQUESTS_COLLECTION = 'group_requests';

/**
 * Generate a unique shareable link for a group
 * Links directly to the group chat page
 */
export function generateGroupShareLink(groupId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/groups/${groupId}/chat`;
}

/**
 * Convert file to base64 string
 * WhatsApp-style: stores image as base64 in Firestore for instant loading
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image before converting to base64
 * Reduces size for faster storage and loading
 */
function compressImage(file: File, maxWidth: number = 500, maxHeight: number = 500, quality: number = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas to Blob failed'));
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload group profile photo - WhatsApp Style
 * Stores as compressed base64 directly in Firestore for instant loading
 * All users see the photo immediately without separate downloads
 * @param groupId - The group ID
 * @param file - The image file to upload
 * @returns The base64 data URL of the uploaded photo
 */
export async function uploadGroupProfilePhoto(
  groupId: string,
  file: File
): Promise<string | null> {
  try {
    console.log('[groupService] 📤 Uploading profile photo (WhatsApp style) for group:', groupId);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('[groupService] ❌ Invalid file type:', file.type);
      alert('Please select an image file');
      return null;
    }
    
    // Validate original file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      console.error('[groupService] ❌ File too large:', file.size);
      alert('Image must be less than 10MB');
      return null;
    }
    
    // Compress image for efficient storage (like WhatsApp)
    console.log('[groupService] 🗜️ Compressing image...');
    const compressedBlob = await compressImage(file, 500, 500, 0.7);
    
    // Convert to base64
    const compressedFile = new File([compressedBlob], 'photo.jpg', { type: 'image/jpeg' });
    const base64Data = await fileToBase64(compressedFile);
    
    console.log('[groupService] ✅ Base64 generated, size:', base64Data.length, 'chars');
    
    // Validate final size (max 1MB base64 string)
    if (base64Data.length > 1024 * 1024) {
      alert('Image too large after compression. Please choose a smaller image.');
      return null;
    }
    
    // Update group document with base64 photo (INSTANT - no separate download needed!)
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      profilePhoto: base64Data,
      updatedAt: serverTimestamp()
    });
    
    console.log('[groupService] ✅ Photo saved to Firestore (WhatsApp style) - instant loading enabled');
    return base64Data;
  } catch (error) {
    console.error('[groupService] ❌ Error uploading profile photo:', error);
    alert('Failed to upload profile photo. Please try again.');
    return null;
  }
}

/**
 * Remove group profile photo - WhatsApp Style
 * Simply clears the base64 data from Firestore
 * @param groupId - The group ID
 */
export async function removeGroupProfilePhoto(groupId: string): Promise<boolean> {
  try {
    console.log('[groupService] 🗑️ Removing profile photo (WhatsApp style) for group:', groupId);
    
    // Just clear the field in Firestore - no storage to clean up!
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      profilePhoto: null,
      updatedAt: serverTimestamp()
    });
    
    console.log('[groupService] ✅ Profile photo removed from Firestore');
    return true;
  } catch (error) {
    console.error('[groupService] ❌ Error removing profile photo:', error);
    return false;
  }
}

/**
 * Subscribe to all approved groups
 * Uses simple query to avoid Firestore composite index requirements
 */
export function subscribeToGroups(
  callback: (groups: Group[]) => void
): () => void {
  console.log('[groupService] 🔌 Attaching groups listener...');

  // Simple query - only filter by status to avoid composite index requirement
  const q = query(
    collection(db, GROUPS_COLLECTION),
    where('status', '==', 'approved')
  );

  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const groups = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          createdBy: data.createdBy || '',
          createdByName: data.createdByName || '',
          createdByAvatar: data.createdByAvatar || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          facilitators: data.facilitators || [],
          members: data.members || [],
          admins: data.admins || [],
          isActive: data.isActive !== false,
          status: data.status || 'pending',
          shareLink: data.shareLink || generateGroupShareLink(doc.id),
          profilePhoto: data.profilePhoto || undefined,
          deniedReason: data.deniedReason || undefined,
          reviewedAt: data.reviewedAt?.toDate?.()?.toISOString(),
          reviewedBy: data.reviewedBy || undefined,
          reviewedByName: data.reviewedByName || undefined,
          messageCount: data.messageCount || 0,
          lastActivity: data.lastActivity?.toDate?.()?.toISOString(),
          // Enhanced WhatsApp-inspired fields
          visibility: data.visibility || 'private',
          permissions: data.permissions || {
            canSendMessages: 'all',
            canEditGroupInfo: 'all_admins',
            canAddMembers: 'admins',
            requireApprovalToJoin: true
          },
          inviteCode: data.inviteCode || generateInviteCode(),
          settings: data.settings || {
            allowMemberSearch: true,
            showMemberList: true,
            muteNotifications: false
          }
        } as Group;
      })
      // Filter active groups in memory (to avoid composite index)
      .filter(group => group.isActive)
      // Sort by lastActivity in memory
      .sort((a, b) => {
        const dateA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const dateB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return dateB - dateA; // Descending order
      });

    console.log(`[groupService] 📨 Received ${groups.length} approved active groups`);
    callback(groups);
  }, (error) => {
    console.error('[groupService] ❌ Error in groups listener:', error);
    callback([]);
  });

  return () => {
    console.log('[groupService] 🔌 Detaching groups listener');
    unsubscribe();
  };
}

/**
 * Subscribe to groups where user is a member
 */
export function subscribeToUserGroups(
  userId: string,
  callback: (groups: Group[]) => void
): () => void {
  console.log('[groupService] 🔌 Attaching user groups listener for:', userId);
  
  const q = query(
    collection(db, GROUPS_COLLECTION),
    where('status', '==', 'approved'),
    where('isActive', '==', true)
  );

  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const groups = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        createdBy: data.createdBy || '',
        createdByName: data.createdByName || '',
        createdByAvatar: data.createdByAvatar || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        facilitators: data.facilitators || [],
        members: data.members || [],
        admins: data.admins || [],
        isActive: data.isActive !== false,
        status: data.status || 'pending',
        shareLink: data.shareLink || generateGroupShareLink(doc.id),
        profilePhoto: data.profilePhoto || undefined,
        deniedReason: data.deniedReason || undefined,
        reviewedAt: data.reviewedAt?.toDate?.()?.toISOString(),
        reviewedBy: data.reviewedBy || undefined,
        reviewedByName: data.reviewedByName || undefined,
        messageCount: data.messageCount || 0,
        lastActivity: data.lastActivity?.toDate?.()?.toISOString(),
        // Enhanced WhatsApp-inspired fields
        visibility: data.visibility || 'private',
        permissions: data.permissions || {
          canSendMessages: 'all',
          canEditGroupInfo: 'all_admins',
          canAddMembers: 'admins',
          requireApprovalToJoin: true
        },
        inviteCode: data.inviteCode || generateInviteCode(),
        settings: data.settings || {
          allowMemberSearch: true,
          showMemberList: true,
          muteNotifications: false
        }
      } as Group;
    }).filter(group =>
      group.members.some(m => m.userId === userId) ||
      group.facilitators.some(f => f.userId === userId)
    )
    // Sort by lastActivity in memory
    .sort((a, b) => {
      const dateA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const dateB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      return dateB - dateA; // Descending order
    });
    
    console.log(`[groupService] 📨 Received ${groups.length} user groups`);
    callback(groups);
  }, (error) => {
    console.error('[groupService] ❌ Error in user groups listener:', error);
    // Check for Firestore index error
    if (error.message?.includes('index')) {
      console.error('[groupService] ⚠️ Firestore index required. Please create the index in Firebase console.');
      console.error('[groupService] Index URL:', error.message);
    }
    callback([]);
  });

  return () => {
    console.log('[groupService] 🔌 Detaching user groups listener');
    unsubscribe();
  };
}

/**
 * Get a single group by ID
 */
export async function getGroupById(groupId: string): Promise<Group | null> {
  console.log('[groupService] 📥 Fetching group:', groupId);
  
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const snapshot = await getDoc(groupRef);
    
    if (!snapshot.exists()) {
      console.log('[groupService] Group not found:', groupId);
      return null;
    }
    
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name || '',
      description: data.description || '',
      createdBy: data.createdBy || '',
      createdByName: data.createdByName || '',
      createdByAvatar: data.createdByAvatar || '',
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      facilitators: data.facilitators || [],
      members: data.members || [],
      admins: data.admins || [],
      isActive: data.isActive !== false,
      status: data.status || 'pending',
      shareLink: data.shareLink || generateGroupShareLink(snapshot.id),
      profilePhoto: data.profilePhoto || undefined,
      deniedReason: data.deniedReason || undefined,
      reviewedAt: data.reviewedAt?.toDate?.()?.toISOString(),
      reviewedBy: data.reviewedBy || undefined,
      reviewedByName: data.reviewedByName || undefined,
      messageCount: data.messageCount || 0,
      lastActivity: data.lastActivity?.toDate?.()?.toISOString(),
      // Enhanced WhatsApp-inspired fields
      visibility: data.visibility || 'private',
      permissions: data.permissions || {
        canSendMessages: 'all',
        canEditGroupInfo: 'all_admins',
        canAddMembers: 'admins',
        requireApprovalToJoin: true
      },
      inviteCode: data.inviteCode || generateInviteCode(),
      settings: data.settings || {
        allowMemberSearch: true,
        showMemberList: true,
        muteNotifications: false
      }
    } as Group;
  } catch (error: any) {
    console.error('[groupService] ❌ Error fetching group:', error);
    return null;
  }
}

/**
 * Create a group request (requires admin approval)
 */
export async function createGroupRequest(
  groupData: {
    name: string;
    description: string;
    requestedBy: string;
    requestedByName: string;
    requestedByAvatar: string;
    proposedFacilitators: GroupFacilitator[];
  }
): Promise<GroupRequest | null> {
  console.log('[groupService] ⏳ Creating group request...');
  
  try {
    const requestData = {
      name: groupData.name,
      description: groupData.description,
      requestedBy: groupData.requestedBy,
      requestedByName: groupData.requestedByName,
      requestedByAvatar: groupData.requestedByAvatar,
      proposedFacilitators: groupData.proposedFacilitators,
      requestedAt: serverTimestamp(),
      status: 'pending'
    };
    
    const docRef = await addDoc(collection(db, GROUP_REQUESTS_COLLECTION), requestData);
    
    console.log('[groupService] ✅ Group request created:', docRef.id);
    
    return {
      id: docRef.id,
      ...groupData,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      proposedFacilitators: groupData.proposedFacilitators,
    } as GroupRequest;
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to create group request:', error);
    return null;
  }
}

/**
 * Approve a group request (admin only)
 */
export async function approveGroupRequest(
  requestId: string,
  adminId: string,
  adminName: string
): Promise<Group | null> {
  console.log('[groupService] ✅ Approving group request:', requestId);
  
  try {
    // Get the request
    const requestRef = doc(db, GROUP_REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      console.error('[groupService] Request not found:', requestId);
      return null;
    }
    
    const requestData = requestSnap.data();
    
    // Check if request was already processed
    if (requestData.status !== 'pending') {
      console.error('[groupService] Request already processed:', requestId, 'Status:', requestData.status);
      return null;
    }
    
    // Validate that exactly 2 facilitators are proposed
    if (!requestData.proposedFacilitators || requestData.proposedFacilitators.length !== 2) {
      console.error('[groupService] Invalid facilitator count:', requestData.proposedFacilitators?.length);
      return null;
    }
    
    // Create the approved group
    const now = new Date().toISOString();
    const creatorAdmin: GroupAdmin = {
      userId: requestData.requestedBy,
      userName: requestData.requestedByName,
      userAvatar: requestData.requestedByAvatar,
      role: 'creator',
      assignedAt: now
    };
    
    const facilitatorAdmins: GroupAdmin[] = requestData.proposedFacilitators.map((f: GroupFacilitator) => ({
      userId: f.userId,
      userName: f.userName,
      userAvatar: f.userAvatar,
      role: 'facilitator',
      assignedAt: now
    }));
    
    const inviteCode = generateInviteCode();

    const groupData = {
      name: requestData.name,
      description: requestData.description,
      createdBy: requestData.requestedBy,
      createdByName: requestData.requestedByName,
      createdByAvatar: requestData.requestedByAvatar,
      createdAt: serverTimestamp(),
      facilitators: requestData.proposedFacilitators.map((f: GroupFacilitator) => ({
        ...f,
        isAdmin: true
      })),
      members: [{
        userId: requestData.requestedBy,
        userName: requestData.requestedByName,
        userAvatar: requestData.requestedByAvatar,
        joinedAt: now,
        isFacilitator: false
      }],
      admins: [creatorAdmin, ...facilitatorAdmins],
      isActive: true,
      status: 'approved',
      shareLink: '', // Will be set after creation
      messageCount: 0,
      lastActivity: serverTimestamp(),
      // Enhanced WhatsApp-inspired fields
      visibility: 'private',
      permissions: {
        canSendMessages: 'all' as const,
        canEditGroupInfo: 'all_admins' as const,
        canAddMembers: 'admins' as const,
        requireApprovalToJoin: true
      },
      inviteCode,
      settings: {
        allowMemberSearch: true,
        showMemberList: true,
        muteNotifications: false
      }
    };

    const groupRef = await addDoc(collection(db, GROUPS_COLLECTION), groupData);
    
    // Update share link
    const shareLink = generateGroupShareLink(groupRef.id);
    await updateDoc(groupRef, { shareLink });
    
    // Update request status
    await updateDoc(requestRef, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      reviewedBy: adminId,
      reviewedByName: adminName,
      groupId: groupRef.id
    });
    
    console.log('[groupService] ✅ Group created and request approved:', groupRef.id);
    
    const returnNow = new Date().toISOString();
    const returnCreatorAdmin: GroupAdmin = {
      userId: requestData.requestedBy,
      userName: requestData.requestedByName,
      userAvatar: requestData.requestedByAvatar,
      role: 'creator',
      assignedAt: returnNow
    };
    
    const returnFacilitatorAdmins: GroupAdmin[] = requestData.proposedFacilitators.map((f: GroupFacilitator) => ({
      userId: f.userId,
      userName: f.userName,
      userAvatar: f.userAvatar,
      role: 'facilitator',
      assignedAt: returnNow
    }));
    
    return {
      id: groupRef.id,
      name: requestData.name,
      description: requestData.description,
      createdBy: requestData.requestedBy,
      createdByName: requestData.requestedByName,
      createdByAvatar: requestData.requestedByAvatar,
      createdAt: returnNow,
      facilitators: requestData.proposedFacilitators.map((f: GroupFacilitator) => ({
        ...f,
        isAdmin: true
      })),
      members: [{
        userId: requestData.requestedBy,
        userName: requestData.requestedByName,
        userAvatar: requestData.requestedByAvatar,
        joinedAt: returnNow,
        isFacilitator: false
      }],
      admins: [returnCreatorAdmin, ...returnFacilitatorAdmins],
      isActive: true,
      status: 'approved' as const,
      shareLink,
      messageCount: 0,
      lastActivity: returnNow,
      // Enhanced WhatsApp-inspired fields
      visibility: 'private' as const,
      permissions: {
        canSendMessages: 'all' as const,
        canEditGroupInfo: 'all_admins' as const,
        canAddMembers: 'admins' as const,
        requireApprovalToJoin: true
      },
      inviteCode,
      settings: {
        allowMemberSearch: true,
        showMemberList: true,
        muteNotifications: false
      }
    };
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to approve group request:', error);
    return null;
  }
}

/**
 * Deny a group request (admin only)
 */
export async function denyGroupRequest(
  requestId: string,
  adminId: string,
  adminName: string,
  reason?: string
): Promise<boolean> {
  console.log('[groupService] ❌ Denying group request:', requestId);
  
  try {
    const requestRef = doc(db, GROUP_REQUESTS_COLLECTION, requestId);
    
    await updateDoc(requestRef, {
      status: 'denied',
      reviewedAt: serverTimestamp(),
      reviewedBy: adminId,
      reviewedByName: adminName,
      denialReason: reason || 'Request denied by admin'
    });
    
    console.log('[groupService] ✅ Group request denied');
    return true;
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to deny group request:', error);
    return false;
  }
}

/**
 * Subscribe to group requests (admin only)
 */
export function subscribeToGroupRequests(
  callback: (requests: GroupRequest[]) => void
): () => void {
  console.log('[groupService] 🔌 Attaching group requests listener...');
  
  const q = query(
    collection(db, GROUP_REQUESTS_COLLECTION),
    orderBy('requestedAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const requests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        requestedBy: data.requestedBy || '',
        requestedByName: data.requestedByName || '',
        requestedByAvatar: data.requestedByAvatar || '',
        requestedAt: data.requestedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        status: data.status || 'pending',
        proposedFacilitators: data.proposedFacilitators || [],
        reviewedAt: data.reviewedAt?.toDate?.()?.toISOString(),
        reviewedBy: data.reviewedBy || undefined,
        reviewedByName: data.reviewedByName || undefined,
        denialReason: data.denialReason || undefined
      } as GroupRequest;
    });
    
    console.log(`[groupService] 📨 Received ${requests.length} group requests`);
    callback(requests);
  }, (error) => {
    console.error('[groupService] ❌ Error in group requests listener:', error);
    // Check for Firestore index error
    if (error.message?.includes('index')) {
      console.error('[groupService] ⚠️ Firestore index required. Please create the index in Firebase console.');
    }
    callback([]);
  });

  return () => {
    console.log('[groupService] 🔌 Detaching group requests listener');
    unsubscribe();
  };
}

/**
 * Check if user is banned from chat/groups
 */
async function isUserBanned(userId: string): Promise<boolean> {
  try {
    const settingsRef = doc(db, 'settings', 'chat');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) return false;
    
    const bannedUsers = settingsSnap.data()?.bannedUsers || [];
    return bannedUsers.includes(userId);
  } catch (error) {
    return false;
  }
}

/**
 * Join a group
 */
export async function joinGroup(
  groupId: string,
  userId: string,
  userName: string,
  userAvatar: string
): Promise<boolean> {
  console.log('[groupService] 👋 User joining group:', groupId, userId);
  
  try {
    // Check if user is banned
    const banned = await isUserBanned(userId);
    if (banned) {
      console.error('[groupService] ❌ Banned user cannot join group:', userId);
      return false;
    }

    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    
    // Use transaction to prevent race conditions
    return await runTransaction(db, async (transaction) => {
      const groupDoc = await transaction.get(groupRef);
      
      if (!groupDoc.exists()) {
        console.error('[groupService] Group not found:', groupId);
        return false;
      }
      
      const groupData = groupDoc.data();
      const members: GroupMember[] = groupData.members || [];
      
      // Check if already a member
      if (members.some(m => m.userId === userId)) {
        console.log('[groupService] User already in group');
        return true;
      }

      // Check if group is active and approved
      if (!groupData.isActive || groupData.status !== 'approved') {
        console.error('[groupService] ❌ Group is not active or approved');
        return false;
      }
      
      // Add new member
      const newMember: GroupMember = {
        userId,
        userName,
        userAvatar,
        joinedAt: new Date().toISOString(),
        isFacilitator: false
      };
      
      transaction.update(groupRef, {
        members: [...members, newMember],
        lastActivity: serverTimestamp()
      });
      
      console.log('[groupService] ✅ User joined group');
      return true;
    });
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to join group:', error);
    return false;
  }
}

/**
 * Leave a group
 */
export async function leaveGroup(
  groupId: string,
  userId: string
): Promise<boolean> {
  console.log('[groupService] 👋 User leaving group:', groupId, userId);
  
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    
    // Use transaction to prevent race conditions
    return await runTransaction(db, async (transaction) => {
      const groupDoc = await transaction.get(groupRef);
      
      if (!groupDoc.exists()) {
        console.error('[groupService] Group not found:', groupId);
        return false;
      }
      
      const groupData = groupDoc.data();
      const members: GroupMember[] = groupData.members || [];
      const facilitators: GroupFacilitator[] = groupData.facilitators || [];
      
      // Check if user is a facilitator - facilitators cannot leave (must be removed by admin)
      if (facilitators.some(f => f.userId === userId)) {
        console.error('[groupService] ❌ Facilitators cannot leave group. Must be removed by admin.');
        return false;
      }
      
      // Check if user is actually a member
      if (!members.some(m => m.userId === userId)) {
        console.log('[groupService] User is not a member of this group');
        return true; // Already not in group, consider success
      }
      
      // Remove member
      const updatedMembers = members.filter(m => m.userId !== userId);
      
      transaction.update(groupRef, {
        members: updatedMembers,
        lastActivity: serverTimestamp()
      });
      
      console.log('[groupService] ✅ User left group');
      return true;
    });
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to leave group:', error);
    return false;
  }
}

/**
 * Update group facilitators (admin only)
 */
export async function updateGroupFacilitators(
  groupId: string,
  facilitators: GroupFacilitator[]
): Promise<boolean> {
  console.log('[groupService] 📝 Updating group facilitators:', groupId);
  
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    
    await updateDoc(groupRef, {
      facilitators: facilitators.map(f => ({ ...f, isAdmin: true }))
    });
    
    console.log('[groupService] ✅ Group facilitators updated');
    return true;
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to update facilitators:', error);
    return false;
  }
}

/**
 * Subscribe to group messages
 */
export function subscribeToGroupMessages(
  groupId: string,
  callback: (messages: GroupMessage[]) => void
): () => void {
  console.log('[groupService] 🔌 Attaching group messages listener for:', groupId);
  
  const messagesRef = collection(db, GROUPS_COLLECTION, groupId, 'messages');
  
  const q = query(
    messagesRef,
    orderBy('timestamp', 'asc'),
    limit(500)
  );

  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        groupId: data.groupId || groupId,
        userId: data.userId || '',
        userName: data.userName || '',
        userAvatar: data.userAvatar || '',
        content: data.content || '',
        timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        isDeleted: data.isDeleted || false,
        type: data.type || 'text',
        isFacilitator: data.isFacilitator || false,
        facilitatorBadge: data.facilitatorBadge || null,
        reactions: data.reactions || [],
        replyTo: data.replyTo || undefined,
        voiceData: data.voiceData || undefined,
        voiceDuration: data.voiceDuration || undefined,
        voiceProfileId: data.voiceProfileId || undefined
      } as GroupMessage;
    });
    
    console.log(`[groupService] 📨 Received ${messages.length} messages for group ${groupId}`);
    callback(messages);
  }, (error) => {
    console.error('[groupService] ❌ Error in group messages listener:', error);
    // Check for Firestore index error
    if (error.message?.includes('index')) {
      console.error('[groupService] ⚠️ Firestore index required. Please create composite index in Firebase console for: groups/{groupId}/messages ordered by timestamp.');
    }
    callback([]);
  });

  return () => {
    console.log('[groupService] 🔌 Detaching group messages listener');
    unsubscribe();
  };
}

/**
 * Send message to group
 */
export async function sendGroupMessage(
  messageData: Omit<GroupMessage, 'id' | 'timestamp' | 'isDeleted'>
): Promise<GroupMessage | null> {
  console.log('[groupService] ⏳ Sending message to group:', messageData.groupId);
  
  try {
    const messagesRef = collection(db, GROUPS_COLLECTION, messageData.groupId, 'messages');
    const groupRef = doc(db, GROUPS_COLLECTION, messageData.groupId);
    
    // Check if user is banned before sending
    const banned = await isUserBanned(messageData.userId);
    if (banned) {
      console.error('[groupService] ❌ Banned user cannot send messages:', messageData.userId);
      return null;
    }

    // Check if user is still a member before sending
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) {
      console.error('[groupService] ❌ Group not found');
      return null;
    }
    const groupData = groupSnap.data();
    const isMember = groupData.members?.some((m: GroupMember) => m.userId === messageData.userId);
    const isFacilitator = groupData.facilitators?.some((f: GroupFacilitator) => f.userId === messageData.userId);
    
    if (!isMember && !isFacilitator) {
      console.error('[groupService] ❌ User is not a member of this group');
      return null;
    }
    
    const docData: Record<string, any> = {
      groupId: messageData.groupId,
      userId: messageData.userId,
      userName: messageData.userName,
      userAvatar: messageData.userAvatar || '',
      content: messageData.content,
      type: messageData.type || 'text',
      isDeleted: false,
      isFacilitator: messageData.isFacilitator || false,
      facilitatorBadge: messageData.facilitatorBadge || null,
      reactions: [],
      replyTo: messageData.replyTo || null,
      timestamp: serverTimestamp()
    };

    if (messageData.type === 'voice' && messageData.voiceData) {
      docData.voiceData = messageData.voiceData;
      docData.voiceDuration = messageData.voiceDuration;
      docData.voiceProfileId = messageData.voiceProfileId;
    }
    
    const docRef = await addDoc(messagesRef, docData);
    
    // Use transaction to safely update message count and prevent race conditions
    await runTransaction(db, async (transaction) => {
      const groupDoc = await transaction.get(groupRef);
      if (!groupDoc.exists()) {
        throw new Error('Group not found during transaction');
      }
      const currentCount = groupDoc.data()?.messageCount || 0;
      transaction.update(groupRef, {
        lastActivity: serverTimestamp(),
        messageCount: currentCount + 1
      });
    });
    
    console.log('[groupService] ✅ Message sent to group:', docRef.id);
    
    return {
      ...messageData,
      id: docRef.id,
      timestamp: new Date().toISOString(),
      isDeleted: false
    } as GroupMessage;
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to send group message:', error);
    return null;
  }
}

/**
 * Delete a group message (soft delete)
 */
export async function deleteGroupMessage(
  groupId: string,
  messageId: string
): Promise<boolean> {
  console.log('[groupService] 🗑️ Deleting group message:', messageId);
  
  try {
    const messageRef = doc(db, GROUPS_COLLECTION, groupId, 'messages', messageId);
    
    await updateDoc(messageRef, {
      isDeleted: true,
      deletedAt: serverTimestamp()
    });
    
    console.log('[groupService] ✅ Group message soft-deleted');
    return true;
  } catch (error: any) {
    console.error('[groupService] ❌ Error deleting group message:', error);
    return false;
  }
}

/**
 * Check if user is group facilitator
 */
export async function isGroupFacilitator(
  groupId: string,
  userId: string
): Promise<boolean> {
  try {
    const group = await getGroupById(groupId);
    if (!group) return false;
    
    return group.facilitators.some(f => f.userId === userId);
  } catch (error) {
    return false;
  }
}

/**
 * Check if user is group member
 */
export async function isGroupMember(
  groupId: string,
  userId: string
): Promise<boolean> {
  try {
    const group = await getGroupById(groupId);
    if (!group) return false;

    return group.members.some(m => m.userId === userId) ||
           group.facilitators.some(f => f.userId === userId);
  } catch (error) {
    return false;
  }
}

/**
 * Check if user is group admin (creator or facilitator)
 */
export async function isGroupAdmin(
  groupId: string,
  userId: string
): Promise<boolean> {
  try {
    const group = await getGroupById(groupId);
    if (!group) return false;

    // Check in admins array
    return group.admins?.some(a => a.userId === userId) ||
           // Fallback: check if user is creator or facilitator
           group.createdBy === userId ||
           group.facilitators.some(f => f.userId === userId);
  } catch (error) {
    return false;
  }
}

/**
 * Remove a member from group (admin only)
 * Creator can remove anyone including facilitators
 * Facilitators can only remove regular members
 */
export async function removeGroupMember(
  groupId: string,
  memberId: string,
  adminId: string
): Promise<boolean> {
  console.log('[groupService] 🗑️ Removing member:', memberId, 'from group:', groupId);

  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);

    return await runTransaction(db, async (transaction) => {
      const groupDoc = await transaction.get(groupRef);

      if (!groupDoc.exists()) {
        console.error('[groupService] Group not found:', groupId);
        return false;
      }

      const groupData = groupDoc.data();
      const members: GroupMember[] = groupData.members || [];
      const facilitators: GroupFacilitator[] = groupData.facilitators || [];
      const admins: GroupAdmin[] = groupData.admins || [];

      // Check if adminId is actually an admin
      const isAdmin = admins.some(a => a.userId === adminId) ||
                     facilitators.some(f => f.userId === adminId) ||
                     groupData.createdBy === adminId;

      if (!isAdmin) {
        console.error('[groupService] ❌ User is not an admin:', adminId);
        return false;
      }

      // Check if admin is the creator
      const isCreator = groupData.createdBy === adminId;

      // Check if target is the creator - cannot remove creator
      if (memberId === groupData.createdBy) {
        console.error('[groupService] ❌ Cannot remove group creator');
        return false;
      }

      // Check if target is a facilitator
      const isTargetFacilitator = facilitators.some(f => f.userId === memberId);
      // Check if target is a regular member
      const isTargetMember = members.some(m => m.userId === memberId);

      // If target is neither facilitator nor member, they are not in the group
      if (!isTargetFacilitator && !isTargetMember) {
        console.log('[groupService] User is not in the group');
        return true; // Already not in group, consider success
      }

      // If target is a facilitator, only creator can remove them
      if (isTargetFacilitator && !isCreator) {
        console.error('[groupService] ❌ Only creator can remove facilitators');
        return false;
      }

      // Remove from members array (if they are a member)
      const updatedMembers = members.filter(m => m.userId !== memberId);

      // Remove from facilitators if target is a facilitator
      let updatedFacilitators = facilitators;
      let updatedAdmins = admins;

      if (isTargetFacilitator) {
        updatedFacilitators = facilitators.filter(f => f.userId !== memberId);
        updatedAdmins = admins.filter(a => a.userId !== memberId);
      }

      transaction.update(groupRef, {
        members: updatedMembers,
        facilitators: updatedFacilitators,
        admins: updatedAdmins,
        lastActivity: serverTimestamp()
      });

      console.log('[groupService] ✅ Member removed successfully');
      return true;
    });
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to remove member:', error);
    return false;
  }
}

/**
 * Promote a member to admin (creator only)
 */
export async function promoteToAdmin(
  groupId: string,
  memberId: string,
  memberName: string,
  memberAvatar: string,
  creatorId: string
): Promise<boolean> {
  console.log('[groupService] ⬆️ Promoting member to admin:', memberId);

  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);

    return await runTransaction(db, async (transaction) => {
      const groupDoc = await transaction.get(groupRef);

      if (!groupDoc.exists()) {
        console.error('[groupService] Group not found:', groupId);
        return false;
      }

      const groupData = groupDoc.data();

      // Only creator can promote to admin
      if (groupData.createdBy !== creatorId) {
        console.error('[groupService] ❌ Only creator can promote to admin');
        return false;
      }

      const members: GroupMember[] = groupData.members || [];
      const facilitators: GroupFacilitator[] = groupData.facilitators || [];
      const admins: GroupAdmin[] = groupData.admins || [];

      // Check if user is a member
      const isMember = members.some(m => m.userId === memberId);
      if (!isMember) {
        console.error('[groupService] ❌ User is not a member');
        return false;
      }

      // Check if already an admin
      const isAlreadyAdmin = admins.some(a => a.userId === memberId);
      if (isAlreadyAdmin) {
        console.log('[groupService] User is already an admin');
        return true;
      }

      // Add as facilitator
      const newFacilitator: GroupFacilitator = {
        userId: memberId,
        userName: memberName,
        userAvatar: memberAvatar,
        assignedAt: new Date().toISOString(),
        isAdmin: true
      };

      // Add to admins array
      const newAdmin: GroupAdmin = {
        userId: memberId,
        userName: memberName,
        userAvatar: memberAvatar,
        role: 'facilitator',
        assignedAt: new Date().toISOString()
      };

      transaction.update(groupRef, {
        facilitators: [...facilitators, newFacilitator],
        admins: [...admins, newAdmin],
        lastActivity: serverTimestamp()
      });

      console.log('[groupService] ✅ Member promoted to admin');
      return true;
    });
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to promote member:', error);
    return false;
  }
}

/**
 * Demote an admin to regular member (creator only)
 */
export async function demoteAdmin(
  groupId: string,
  adminIdToDemote: string,
  creatorId: string
): Promise<boolean> {
  console.log('[groupService] ⬇️ Demoting admin:', adminIdToDemote);

  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);

    return await runTransaction(db, async (transaction) => {
      const groupDoc = await transaction.get(groupRef);

      if (!groupDoc.exists()) {
        console.error('[groupService] Group not found:', groupId);
        return false;
      }

      const groupData = groupDoc.data();

      // Only creator can demote admins
      if (groupData.createdBy !== creatorId) {
        console.error('[groupService] ❌ Only creator can demote admins');
        return false;
      }

      // Cannot demote the creator
      if (adminIdToDemote === groupData.createdBy) {
        console.error('[groupService] ❌ Cannot demote the creator');
        return false;
      }

      const facilitators: GroupFacilitator[] = groupData.facilitators || [];
      const admins: GroupAdmin[] = groupData.admins || [];

      // Check if target is actually an admin
      const isAdmin = admins.some(a => a.userId === adminIdToDemote);
      if (!isAdmin) {
        console.error('[groupService] ❌ User is not an admin');
        return false;
      }

      // Remove from facilitators
      const updatedFacilitators = facilitators.filter(f => f.userId !== adminIdToDemote);

      // Remove from admins
      const updatedAdmins = admins.filter(a => a.userId !== adminIdToDemote);

      transaction.update(groupRef, {
        facilitators: updatedFacilitators,
        admins: updatedAdmins,
        lastActivity: serverTimestamp()
      });

      console.log('[groupService] ✅ Admin demoted to member');
      return true;
    });
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to demote admin:', error);
    return false;
  }
}

// ============================================
// GROUP JOIN REQUEST FUNCTIONS
// ============================================

/**
 * Create a join request for a group - OPTIMIZED VERSION
 * No complex queries that require composite indexes
 */
export async function createGroupJoinRequest(
  groupId: string,
  groupName: string,
  userId: string,
  userName: string,
  userAvatar: string,
  reason: string
): Promise<GroupJoinRequest | null> {
  console.log('[groupService] 📝 Creating join request for group:', groupId, 'by user:', userId);

  try {
    // SIMPLIFIED: Check if user is already a member (this is the most important check)
    // We skip the pending request check here - let the client-side handle it
    // This avoids the need for a composite index
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const groupDoc = await getDoc(groupRef);

    if (!groupDoc.exists()) {
      console.error('[groupService] ❌ Group not found:', groupId);
      return null;
    }

    const groupData = groupDoc.data();
    const members: GroupMember[] = groupData.members || [];
    const facilitators: GroupFacilitator[] = groupData.facilitators || [];

    // Check if user is already a member or facilitator
    const isAlreadyMember = members.some(m => m.userId === userId) ||
                           facilitators.some(f => f.userId === userId);

    if (isAlreadyMember) {
      console.log('[groupService] User is already a member of this group');
      return null;
    }

    // Simplified request data - no undefined values
    const requestData = {
      groupId,
      groupName,
      requestedBy: userId,
      requestedByName: userName,
      requestedByAvatar: userAvatar || '',
      requestedAt: new Date().toISOString(),
      reason: reason || 'No reason provided',
      status: 'pending'
    };

    console.log('[groupService] 📤 Adding request to Firestore:', requestData);

    const requestRef = await addDoc(collection(db, GROUP_JOIN_REQUESTS_COLLECTION), requestData);

    console.log('[groupService] ✅ Join request created successfully:', requestRef.id);

    return {
      id: requestRef.id,
      ...requestData
    } as GroupJoinRequest;
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to create join request:', error);
    console.error('[groupService] Error details:', error.message);
    if (error.code) {
      console.error('[groupService] Error code:', error.code);
    }
    return null;
  }
}

/**
 * Get all pending join requests for a group (admin only)
 */
export async function getGroupJoinRequests(
  groupId: string,
  status: 'pending' | 'approved' | 'denied' | 'all' = 'pending'
): Promise<GroupJoinRequest[]> {
  try {
    let requestsQuery;

    if (status === 'all') {
      requestsQuery = query(
        collection(db, GROUP_JOIN_REQUESTS_COLLECTION),
        where('groupId', '==', groupId),
        orderBy('requestedAt', 'desc')
      );
    } else {
      requestsQuery = query(
        collection(db, GROUP_JOIN_REQUESTS_COLLECTION),
        where('groupId', '==', groupId),
        where('status', '==', status),
        orderBy('requestedAt', 'desc')
      );
    }

    const snapshot = await getDocs(requestsQuery);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        groupId: data.groupId,
        groupName: data.groupName,
        requestedBy: data.requestedBy,
        requestedByName: data.requestedByName,
        requestedByAvatar: data.requestedByAvatar,
        requestedAt: data.requestedAt,
        reason: data.reason,
        status: data.status,
        reviewedAt: data.reviewedAt,
        reviewedBy: data.reviewedBy,
        reviewedByName: data.reviewedByName,
        denialReason: data.denialReason
      } as GroupJoinRequest;
    });
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to get join requests:', error);
    return [];
  }
}

/**
 * Check if user has a pending join request for a group
 * SIMPLIFIED: Uses only single field query to avoid composite index
 */
export async function hasPendingJoinRequest(
  groupId: string,
  userId: string
): Promise<boolean> {
  try {
    // Use simple query on requestedBy only, then filter in memory
    // This avoids needing a composite index
    const requestsQuery = query(
      collection(db, GROUP_JOIN_REQUESTS_COLLECTION),
      where('requestedBy', '==', userId)
    );

    const snapshot = await getDocs(requestsQuery);
    
    // Filter in memory for the specific group and pending status
    const hasPending = snapshot.docs.some(doc => {
      const data = doc.data();
      return data.groupId === groupId && data.status === 'pending';
    });
    
    return hasPending;
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to check join request:', error);
    return false;
  }
}

/**
 * Cancel own join request
 */
export async function cancelJoinRequest(
  requestId: string,
  userId: string
): Promise<boolean> {
  try {
    const requestRef = doc(db, GROUP_JOIN_REQUESTS_COLLECTION, requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      console.error('[groupService] Join request not found:', requestId);
      return false;
    }

    const data = requestDoc.data();

    // Only the requester can cancel their own request
    if (data.requestedBy !== userId) {
      console.error('[groupService] ❌ User is not the requester');
      return false;
    }

    // Can only cancel pending requests
    if (data.status !== 'pending') {
      console.log('[groupService] Can only cancel pending requests');
      return false;
    }

    await deleteDoc(requestRef);
    console.log('[groupService] ✅ Join request cancelled');
    return true;
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to cancel join request:', error);
    return false;
  }
}

/**
 * Approve a join request (admin only)
 */
export async function approveJoinRequest(
  requestId: string,
  adminId: string,
  adminName: string
): Promise<boolean> {
  console.log('[groupService] ✅ Approving join request:', requestId);

  try {
    const requestRef = doc(db, GROUP_JOIN_REQUESTS_COLLECTION, requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      console.error('[groupService] Join request not found:', requestId);
      return false;
    }

    const requestData = requestDoc.data();

    // Check if request is pending
    if (requestData.status !== 'pending') {
      console.log('[groupService] Request is already processed');
      return false;
    }

    const groupId = requestData.groupId;
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);

    // Check if admin has permission
    const isAdmin = await isGroupAdmin(groupId, adminId);
    if (!isAdmin) {
      console.error('[groupService] ❌ User is not an admin:', adminId);
      return false;
    }

    return await runTransaction(db, async (transaction) => {
      const groupDoc = await transaction.get(groupRef);

      if (!groupDoc.exists()) {
        console.error('[groupService] Group not found:', groupId);
        return false;
      }

      const groupData = groupDoc.data();
      const members: GroupMember[] = groupData.members || [];

      // Check if user is already a member
      const isAlreadyMember = members.some(m => m.userId === requestData.requestedBy);
      if (isAlreadyMember) {
        console.log('[groupService] User is already a member');
        // Update request status anyway
        transaction.update(requestRef, {
          status: 'approved',
          reviewedAt: new Date().toISOString(),
          reviewedBy: adminId,
          reviewedByName: adminName
        });
        return true;
      }

      // Add user to members
      const newMember: GroupMember = {
        userId: requestData.requestedBy,
        userName: requestData.requestedByName,
        userAvatar: requestData.requestedByAvatar,
        joinedAt: new Date().toISOString(),
        isFacilitator: false
      };

      transaction.update(groupRef, {
        members: [...members, newMember],
        lastActivity: serverTimestamp()
      });

      // Update request status
      transaction.update(requestRef, {
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: adminId,
        reviewedByName: adminName
      });

      console.log('[groupService] ✅ Join request approved, user added to group');
      return true;
    });
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to approve join request:', error);
    return false;
  }
}

/**
 * Subscribe to user's pending join requests (real-time)
 * This allows users to see their pending requests across all groups
 */
export function subscribeToUserJoinRequests(
  userId: string,
  callback: (requests: GroupJoinRequest[]) => void
): () => void {
  console.log('[groupService] 🔌 Subscribing to user join requests for:', userId);

  const q = query(
    collection(db, GROUP_JOIN_REQUESTS_COLLECTION),
    where('requestedBy', '==', userId),
    where('status', '==', 'pending'),
    orderBy('requestedAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const requests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        groupId: data.groupId,
        groupName: data.groupName,
        requestedBy: data.requestedBy,
        requestedByName: data.requestedByName,
        requestedByAvatar: data.requestedByAvatar,
        requestedAt: data.requestedAt,
        reason: data.reason,
        status: data.status,
        reviewedAt: data.reviewedAt,
        reviewedBy: data.reviewedBy,
        reviewedByName: data.reviewedByName,
        denialReason: data.denialReason
      } as GroupJoinRequest;
    });

    console.log(`[groupService] 📨 Received ${requests.length} pending requests for user`);
    callback(requests);
  }, (error) => {
    console.error('[groupService] ❌ Error in user join requests subscription:', error);
    callback([]);
  });

  return () => {
    console.log('[groupService] 🔌 Unsubscribing from user join requests');
    unsubscribe();
  };
}

/**
 * Deny a join request (admin only)
 */
export async function denyJoinRequest(
  requestId: string,
  adminId: string,
  adminName: string,
  reason?: string
): Promise<boolean> {
  console.log('[groupService] ❌ Denying join request:', requestId);

  try {
    const requestRef = doc(db, GROUP_JOIN_REQUESTS_COLLECTION, requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      console.error('[groupService] Join request not found:', requestId);
      return false;
    }

    const requestData = requestDoc.data();
    const groupId = requestData.groupId;

    // Check if request is pending
    if (requestData.status !== 'pending') {
      console.log('[groupService] Request is already processed');
      return false;
    }

    // Check if admin has permission
    const isAdmin = await isGroupAdmin(groupId, adminId);
    if (!isAdmin) {
      console.error('[groupService] ❌ User is not an admin:', adminId);
      return false;
    }

    // Update request status
    await updateDoc(requestRef, {
      status: 'denied',
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminId,
      reviewedByName: adminName,
      denialReason: reason || null
    });

    console.log('[groupService] ✅ Join request denied');
    return true;
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to deny join request:', error);
    return false;
  }
}

/**
 * Subscribe to join requests for a group (for real-time updates)
 * OPTIMIZED: Avoids composite index by querying only on groupId
 */
export function subscribeToGroupJoinRequests(
  groupId: string,
  callback: (requests: GroupJoinRequest[]) => void
): () => void {
  console.log('[groupService] 🔌 Subscribing to group join requests for:', groupId);

  // Use single where clause to avoid composite index requirement
  // Filter by status in memory
  const requestsQuery = query(
    collection(db, GROUP_JOIN_REQUESTS_COLLECTION),
    where('groupId', '==', groupId)
  );

  const unsubscribe = onSnapshot(
    requestsQuery,
    (snapshot) => {
      const allRequests = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          groupId: data.groupId,
          groupName: data.groupName,
          requestedBy: data.requestedBy,
          requestedByName: data.requestedByName,
          requestedByAvatar: data.requestedByAvatar,
          requestedAt: data.requestedAt,
          reason: data.reason,
          status: data.status,
          reviewedAt: data.reviewedAt,
          reviewedBy: data.reviewedBy,
          reviewedByName: data.reviewedByName,
          denialReason: data.denialReason
        } as GroupJoinRequest;
      });

      // Filter pending requests in memory and sort
      const pendingRequests = allRequests
        .filter(r => r.status === 'pending')
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

      console.log(`[groupService] 📨 Received ${pendingRequests.length} pending join requests`);
      callback(pendingRequests);
    },
    (error) => {
      console.error('[groupService] ❌ Error subscribing to join requests:', error);
      callback([]);
    }
  );

  return () => {
    console.log('[groupService] 🔌 Unsubscribing from group join requests');
    unsubscribe();
  };
}

// ============================================
// ENHANCED WHATSAPP-INSPIRED GROUP FUNCTIONS
// ============================================

/**
 * Generate a unique invite code for a group
 */
export function generateInviteCode(): string {
  // Generate a 8-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a group invite link with unique code
 */
export function generateGroupInviteLink(groupId: string, inviteCode: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/join/${inviteCode}`;
}

/**
 * Join a group via invite link/code - OPTIMIZED FLOW
 * This is the "10x better than WhatsApp" feature:
 * - If group doesn't require approval: instant join
 * - If group requires approval: creates a request with invite code reference
 * - If user was previously denied: allows retry with cooldown
 */
export async function joinGroupViaInviteCode(
  inviteCode: string,
  userId: string,
  userName: string,
  userAvatar: string
): Promise<{ success: boolean; group?: Group; message: string; requestCreated?: boolean }> {
  console.log('[groupService] 🔗 User joining via invite code:', inviteCode);

  try {
    // Find group by invite code
    const groupsQuery = query(
      collection(db, GROUPS_COLLECTION),
      where('inviteCode', '==', inviteCode),
      where('isActive', '==', true),
      where('status', '==', 'approved')
    );

    const snapshot = await getDocs(groupsQuery);

    if (snapshot.empty) {
      console.error('[groupService] ❌ Invalid or expired invite code');
      return { success: false, message: 'Invalid or expired invite link' };
    }

    const groupDoc = snapshot.docs[0];
    const groupId = groupDoc.id;
    const groupData = groupDoc.data();

    // Check if invite link has expired
    if (groupData.inviteLinkExpiresAt) {
      const expiryDate = new Date(groupData.inviteLinkExpiresAt);
      if (expiryDate < new Date()) {
        return { success: false, message: 'This invite link has expired' };
      }
    }

    const group: Group = {
      id: groupId,
      name: groupData.name,
      description: groupData.description,
      createdBy: groupData.createdBy,
      createdByName: groupData.createdByName,
      createdByAvatar: groupData.createdByAvatar,
      createdAt: groupData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      facilitators: groupData.facilitators || [],
      members: groupData.members || [],
      admins: groupData.admins || [],
      isActive: groupData.isActive !== false,
      status: groupData.status || 'approved',
      shareLink: groupData.shareLink || generateGroupShareLink(groupId),
      profilePhoto: groupData.profilePhoto || undefined,
      messageCount: groupData.messageCount || 0,
      lastActivity: groupData.lastActivity?.toDate?.()?.toISOString(),
      // Enhanced fields
      visibility: groupData.visibility || 'private',
      permissions: groupData.permissions || {
        canSendMessages: 'all',
        canEditGroupInfo: 'all_admins',
        canAddMembers: 'admins',
        requireApprovalToJoin: true
      },
      inviteCode: groupData.inviteCode,
      settings: groupData.settings || {
        allowMemberSearch: true,
        showMemberList: true,
        muteNotifications: false
      }
    };

    // Check if user is already a member
    const isAlreadyMember = group.members.some(m => m.userId === userId) ||
                           group.facilitators.some(f => f.userId === userId);

    if (isAlreadyMember) {
      return { success: true, group, message: 'You are already a member of this group' };
    }

    // Check if user has a pending request
    const hasPending = await hasPendingJoinRequest(groupId, userId);
    if (hasPending) {
      return { success: false, message: 'You already have a pending request for this group' };
    }

    // Check permissions - if no approval required, join instantly!
    if (!group.permissions.requireApprovalToJoin) {
      const joined = await joinGroup(groupId, userId, userName, userAvatar);
      if (joined) {
        // Add system message
        await addGroupSystemMessage(groupId, 'user_joined', userId, userName);
        return { success: true, group, message: 'You have successfully joined the group!' };
      }
      return { success: false, message: 'Failed to join group. Please try again.' };
    }

    // If approval is required, create a join request with invite code
    const request = await createGroupJoinRequest(
      groupId,
      group.name,
      userId,
      userName,
      userAvatar,
      'Joined via invite link'
    );

    if (request) {
      // Update request with invite code used
      const requestRef = doc(db, GROUP_JOIN_REQUESTS_COLLECTION, request.id);
      await updateDoc(requestRef, { inviteCodeUsed: inviteCode });

      return {
        success: false,
        group,
        message: 'Your request to join has been sent to the group admins',
        requestCreated: true
      };
    }

    return { success: false, message: 'Failed to create join request' };
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to join via invite code:', error);
    return { success: false, message: 'An error occurred. Please try again.' };
  }
}

/**
 * Add a member directly to group (admin only) - "Better Than WhatsApp"
 * Admin can add members instantly without requiring approval
 */
export async function addMemberToGroup(
  groupId: string,
  userId: string,
  userName: string,
  userAvatar: string,
  adminId: string,
  adminName: string
): Promise<{ success: boolean; message: string }> {
  console.log('[groupService] ➕ Admin adding member to group:', groupId, 'user:', userId);

  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);

    return await runTransaction(db, async (transaction) => {
      const groupDoc = await transaction.get(groupRef);

      if (!groupDoc.exists()) {
        return { success: false, message: 'Group not found' };
      }

      const groupData = groupDoc.data();

      // Check if admin has permission to add members
      const isCreator = groupData.createdBy === adminId;
      const isAdmin = groupData.admins?.some((a: GroupAdmin) => a.userId === adminId) ||
                     groupData.facilitators?.some((f: GroupFacilitator) => f.userId === adminId);

      const canAddMembers = groupData.permissions?.canAddMembers || 'admins';

      if (canAddMembers === 'creator_only' && !isCreator) {
        return { success: false, message: 'Only the group creator can add members' };
      }

      if (!isAdmin && !isCreator) {
        return { success: false, message: 'You do not have permission to add members' };
      }

      const members: GroupMember[] = groupData.members || [];
      const facilitators: GroupFacilitator[] = groupData.facilitators || [];

      // Check if user is already in group
      const isAlreadyMember = members.some((m: GroupMember) => m.userId === userId) ||
                             facilitators.some((f: GroupFacilitator) => f.userId === userId);

      if (isAlreadyMember) {
        return { success: false, message: 'User is already a member of this group' };
      }

      // Add member directly
      const newMember: GroupMember = {
        userId,
        userName,
        userAvatar,
        joinedAt: new Date().toISOString(),
        isFacilitator: false
      };

      transaction.update(groupRef, {
        members: [...members, newMember],
        lastActivity: serverTimestamp()
      });

      // Create a system message record
      const systemMessagesRef = collection(db, GROUPS_COLLECTION, groupId, 'system_messages');
      transaction.set(doc(systemMessagesRef), {
        type: 'user_added',
        userId: adminId,
        userName: adminName,
        targetUserId: userId,
        targetUserName: userName,
        message: `${userName} was added by ${adminName}`,
        timestamp: serverTimestamp()
      });

      return { success: true, message: 'Member added successfully' };
    });
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to add member:', error);
    return { success: false, message: 'An error occurred while adding the member' };
  }
}

/**
 * Add a system message to group
 */
async function addGroupSystemMessage(
  groupId: string,
  type: 'user_joined' | 'user_left' | 'user_added' | 'user_removed',
  userId: string,
  userName: string,
  targetUserId?: string,
  targetUserName?: string
): Promise<void> {
  try {
    const systemMessagesRef = collection(db, GROUPS_COLLECTION, groupId, 'system_messages');
    await addDoc(systemMessagesRef, {
      type,
      userId,
      userName,
      targetUserId,
      targetUserName,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('[groupService] ❌ Failed to add system message:', error);
  }
}

/**
 * Reset/regenerate group invite link (admin only)
 */
export async function resetGroupInviteLink(
  groupId: string,
  adminId: string
): Promise<{ success: boolean; newInviteCode?: string; newInviteLink?: string; message: string }> {
  console.log('[groupService] 🔄 Resetting invite link for group:', groupId);

  try {
    const isAdmin = await isGroupAdmin(groupId, adminId);
    if (!isAdmin) {
      return { success: false, message: 'Only admins can reset the invite link' };
    }

    const newInviteCode = generateInviteCode();
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);

    await updateDoc(groupRef, {
      inviteCode: newInviteCode,
      inviteLinkExpiresAt: null, // Reset expiration
      updatedAt: serverTimestamp()
    });

    const newInviteLink = generateGroupInviteLink(groupId, newInviteCode);

    return {
      success: true,
      newInviteCode,
      newInviteLink,
      message: 'Invite link has been reset'
    };
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to reset invite link:', error);
    return { success: false, message: 'Failed to reset invite link' };
  }
}

/**
 * Update group permissions (creator only)
 */
export async function updateGroupPermissions(
  groupId: string,
  permissions: Partial<GroupPermissions>,
  creatorId: string
): Promise<{ success: boolean; message: string }> {
  console.log('[groupService] 🔐 Updating group permissions:', groupId);

  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const groupDoc = await getDoc(groupRef);

    if (!groupDoc.exists()) {
      return { success: false, message: 'Group not found' };
    }

    const groupData = groupDoc.data();

    // Only creator can update permissions
    if (groupData.createdBy !== creatorId) {
      return { success: false, message: 'Only the group creator can update permissions' };
    }

    await updateDoc(groupRef, {
      permissions: { ...groupData.permissions, ...permissions },
      updatedAt: serverTimestamp()
    });

    return { success: true, message: 'Permissions updated successfully' };
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to update permissions:', error);
    return { success: false, message: 'Failed to update permissions' };
  }
}

/**
 * Update group settings (admin only)
 */
export async function updateGroupSettings(
  groupId: string,
  settings: Partial<GroupSettings>,
  adminId: string
): Promise<{ success: boolean; message: string }> {
  console.log('[groupService] ⚙️ Updating group settings:', groupId);

  try {
    const isAdmin = await isGroupAdmin(groupId, adminId);
    if (!isAdmin) {
      return { success: false, message: 'Only admins can update settings' };
    }

    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const groupDoc = await getDoc(groupRef);

    if (!groupDoc.exists()) {
      return { success: false, message: 'Group not found' };
    }

    const groupData = groupDoc.data();

    await updateDoc(groupRef, {
      settings: { ...groupData.settings, ...settings },
      updatedAt: serverTimestamp()
    });

    return { success: true, message: 'Settings updated successfully' };
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to update settings:', error);
    return { success: false, message: 'Failed to update settings' };
  }
}

/**
 * Update group rules/guidelines (admin only)
 */
export async function updateGroupRules(
  groupId: string,
  rules: string[],
  adminId: string
): Promise<{ success: boolean; message: string }> {
  console.log('[groupService] 📋 Updating group rules:', groupId);

  try {
    const isAdmin = await isGroupAdmin(groupId, adminId);
    if (!isAdmin) {
      return { success: false, message: 'Only admins can update rules' };
    }

    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      rules,
      updatedAt: serverTimestamp()
    });

    return { success: true, message: 'Rules updated successfully' };
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to update rules:', error);
    return { success: false, message: 'Failed to update rules' };
  }
}

/**
 * Update group visibility (creator only)
 */
export async function updateGroupVisibility(
  groupId: string,
  visibility: 'public' | 'private',
  creatorId: string
): Promise<{ success: boolean; message: string }> {
  console.log('[groupService] 👁️ Updating group visibility:', groupId, visibility);

  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const groupDoc = await getDoc(groupRef);

    if (!groupDoc.exists()) {
      return { success: false, message: 'Group not found' };
    }

    const groupData = groupDoc.data();

    // Only creator can update visibility
    if (groupData.createdBy !== creatorId) {
      return { success: false, message: 'Only the group creator can change visibility' };
    }

    await updateDoc(groupRef, {
      visibility,
      updatedAt: serverTimestamp()
    });

    return { success: true, message: `Group is now ${visibility}` };
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to update visibility:', error);
    return { success: false, message: 'Failed to update visibility' };
  }
}

/**
 * Subscribe to group system messages
 */
export function subscribeToGroupSystemMessages(
  groupId: string,
  callback: (messages: any[]) => void
): () => void {
  console.log('[groupService] 🔌 Subscribing to system messages for group:', groupId);

  const systemMessagesRef = collection(db, GROUPS_COLLECTION, groupId, 'system_messages');
  const q = query(systemMessagesRef, orderBy('timestamp', 'desc'), limit(50));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  }, (error) => {
    console.error('[groupService] ❌ Error in system messages subscription:', error);
    callback([]);
  });

  return () => {
    console.log('[groupService] 🔌 Unsubscribing from system messages');
    unsubscribe();
  };
}

/**
 * Search members in a group
 */
export function searchGroupMembers(
  group: Group,
  searchQuery: string
): { members: GroupMember[]; facilitators: GroupFacilitator[] } {
  // Safely get arrays with fallbacks to empty arrays
  const members = group?.members || [];
  const facilitators = group?.facilitators || [];

  const query = searchQuery.toLowerCase().trim();

  if (!query) {
    return { members, facilitators };
  }

  const filteredMembers = members.filter(m =>
    m.userName?.toLowerCase().includes(query)
  );

  const filteredFacilitators = facilitators.filter(f =>
    f.userName?.toLowerCase().includes(query)
  );

  return { members: filteredMembers, facilitators: filteredFacilitators };
}

// ==========================================
// AI AUTO-RESPONSE FOR GROUP CHATS
// ==========================================

// Track processed message IDs per group to avoid duplicate responses
const processedGroupMessageIds = new Map<string, Set<string>>();

// AI User Configuration for Groups
const GROUP_AI_USER_CONFIG = {
  userId: 'ubuzima-admin-ai',
  userName: 'RM Admin',
  userAvatar: '/avatars/ai-admin.png',
  isAI: true,
  aiType: 'ubuzima-admin' as const,
};

/**
 * Check if message contains @RM Admin mention (same patterns as global chat)
 */
function containsRMAdminMention(content: string): boolean {
  if (!content) return false;
  const mentionPatterns = [
    /@RM\s*Admin/i,
    /@rm\s*admin/i,
    /@ubuzima-admin/i,
    /@RMAdmin/i,
    /@rmadmin/i,
  ];
  return mentionPatterns.some(pattern => pattern.test(content));
}

/**
 * Extract the question/query from the mention
 */
function extractQueryFromMention(content: string): string {
  let query = content
    .replace(/@RM\s*Admin/i, '')
    .replace(/@rm\s*admin/i, '')
    .replace(/@ubuzima-admin/i, '')
    .replace(/@RMAdmin/i, '')
    .replace(/@rmadmin/i, '')
    .trim();
  
  if (!query) {
    return 'Hello! How can I help you navigate the app today?';
  }
  
  return query;
}

/**
 * Send AI response to group chat
 */
export async function sendAIResponseToGroup(
  groupId: string,
  aiContent: string,
  replyToMessageId?: string
): Promise<GroupMessage | null> {
  console.log('[groupService] 🤖 Sending AI response to group:', groupId);
  
  try {
    const messagesRef = collection(db, GROUPS_COLLECTION, groupId, 'messages');
    
    const docData = {
      groupId: groupId,
      userId: GROUP_AI_USER_CONFIG.userId,
      userName: GROUP_AI_USER_CONFIG.userName,
      userAvatar: GROUP_AI_USER_CONFIG.userAvatar,
      content: aiContent,
      type: 'text',
      isDeleted: false,
      isFacilitator: false,
      facilitatorBadge: null,
      reactions: [],
      replyTo: replyToMessageId || null,
      timestamp: serverTimestamp()
    };
    
    const docRef = await addDoc(messagesRef, docData);
    
    // Update group activity
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await runTransaction(db, async (transaction) => {
      const groupDoc = await transaction.get(groupRef);
      if (groupDoc.exists()) {
        const currentCount = groupDoc.data()?.messageCount || 0;
        transaction.update(groupRef, {
          lastActivity: serverTimestamp(),
          messageCount: currentCount + 1
        });
      }
    });
    
    console.log('[groupService] ✅ AI response sent to group! ID:', docRef.id);
    
    return {
      id: docRef.id,
      groupId: groupId,
      userId: GROUP_AI_USER_CONFIG.userId,
      userName: GROUP_AI_USER_CONFIG.userName,
      userAvatar: GROUP_AI_USER_CONFIG.userAvatar,
      content: aiContent,
      type: 'text',
      timestamp: new Date().toISOString(),
      isDeleted: false,
      isFacilitator: false,
      facilitatorBadge: undefined,
      reactions: [],
      replyTo: replyToMessageId || undefined
    } as GroupMessage;
  } catch (error) {
    console.error('[groupService] ❌ Failed to send AI response to group:', error);
    return null;
  }
}

/**
 * Process a group message for AI mentions and auto-respond
 */
export async function processGroupMessageForAIMention(
  groupId: string,
  message: GroupMessage,
  language: Language = 'en'
): Promise<void> {
  // Skip if message is from AI itself
  if (message.userId === GROUP_AI_USER_CONFIG.userId) {
    return;
  }
  
  // Get or create processed set for this group
  if (!processedGroupMessageIds.has(groupId)) {
    processedGroupMessageIds.set(groupId, new Set<string>());
  }
  const processedIds = processedGroupMessageIds.get(groupId)!;
  
  // Skip if already processed
  if (processedIds.has(message.id)) {
    return;
  }
  
  // Mark as processed
  processedIds.add(message.id);
  
  // Check for mention
  if (!containsRMAdminMention(message.content)) {
    return;
  }
  
  console.log('[groupService] 🎯 Detected @RM Admin mention in group message:', message.id);
  
  const userQuery = extractQueryFromMention(message.content);
  
  try {
    const aiResponse = await queryRMAdminAI(userQuery, language);
    
    if (aiResponse.success && aiResponse.content) {
      await sendAIResponseToGroup(groupId, aiResponse.content, message.id);
      console.log('[groupService] ✅ AI auto-response sent to group successfully');
    } else {
      console.error('[groupService] ⚠️ AI failed to generate response:', aiResponse.error);
      const fallbackResponse = getGroupFallbackResponse(language);
      await sendAIResponseToGroup(groupId, fallbackResponse, message.id);
    }
  } catch (error) {
    console.error('[groupService] ❌ Error processing AI mention in group:', error);
    const fallbackResponse = getGroupFallbackResponse(language);
    await sendAIResponseToGroup(groupId, fallbackResponse, message.id);
  }
}

/**
 * Get fallback response when AI is unavailable
 */
function getGroupFallbackResponse(language: Language): string {
  const fallbacks: Record<Language, string> = {
    en: "👋 Hi! I'm RM Admin AI. I'm here to help you navigate the app!\n\nI can help you find:\n• SRHR Library section for health education\n• Book a Doctor for appointments\n• Services to find nearby facilities\n• Emergency section for urgent help\n• Community chat to connect with others\n\nJust let me know what you're looking for!",
    rw: "👋 Muraho! Ndi RM Admin AI. Ndi hano kugufasha gushaka serivisi mu porogaramu!\n\nNshobora kugufasha kubona:\n• Amakuru ya SRHR\n• Gusaba Muganga\n• Serivisi z'aho uri\n• Ibiza (Emergency)\n• Chat y'abanyamuryango\n\nUmbwize icyo ushaka!",
    fr: "👋 Bonjour! Je suis RM Admin AI. Je suis là pour vous aider à naviguer dans l'application!\n\nJe peux vous aider à trouver:\n• Section Info SSRA pour l'éducation santé\n• Prendre RDV Médecin\n• Services près de chez vous\n• Section Urgence\n• Chat communautaire\n\nDites-moi ce que vous cherchez!",
    sw: "👋 Habari! Mimi ni RM Admin AI. Nipo kusaidia kuzunguka programu!\n\nNaweza kusaidia kupata:\n• Sehemu ya SRHR Library\n• Weka Miadi na Daktari\n• Huduma za karibu\n• Sehemu ya Dharura\n• Chat ya jamii\n\nNionyeshe unachotafuta!"
  };
  
  return fallbacks[language] || fallbacks.en;
}

/**
 * Subscribe to group messages with AI auto-response
 * Use this instead of subscribeToGroupMessages when you want AI auto-response
 */
export function subscribeToGroupMessagesWithAI(
  groupId: string,
  callback: (messages: GroupMessage[]) => void,
  language: Language = 'en'
): () => void {
  console.log('[groupService] 🔌 Attaching group messages listener with AI auto-response for:', groupId);

  const messagesRef = collection(db, GROUPS_COLLECTION, groupId, 'messages');

  const q = query(
    messagesRef,
    orderBy('timestamp', 'asc'),
    limit(500)
  );

  // Track initial load to skip AI processing for historical messages
  let initialLoad = true;

  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        groupId: data.groupId || groupId,
        userId: data.userId || '',
        userName: data.userName || '',
        userAvatar: data.userAvatar || '',
        content: data.content || '',
        timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        isDeleted: data.isDeleted || false,
        type: data.type || 'text',
        isFacilitator: data.isFacilitator || false,
        facilitatorBadge: data.facilitatorBadge || null,
        reactions: data.reactions || [],
        replyTo: data.replyTo || undefined,
        voiceData: data.voiceData || undefined,
        voiceDuration: data.voiceDuration || undefined,
        voiceProfileId: data.voiceProfileId || undefined
      } as GroupMessage;
    });

    console.log(`[groupService] 📨 Received ${messages.length} messages for group ${groupId}`);

    // Only process AI mentions for NEW messages, not historical ones on initial load
    // This prevents AI from responding to old @mentions when a user enters the group
    if (!initialLoad) {
      const processedIds = processedGroupMessageIds.get(groupId) || new Set<string>();
      const newMessages = messages.filter(m => !processedIds.has(m.id));
      newMessages.forEach(message => {
        processGroupMessageForAIMention(groupId, message, language).catch(error => {
          console.error('[groupService] ❌ Error in group AI mention processing:', error);
        });
      });
    } else {
      console.log('[groupService] ⏭️ Skipping AI processing for initial load (historical messages)');
      // Mark all existing messages as processed so we don't respond to them later
      if (!processedGroupMessageIds.has(groupId)) {
        processedGroupMessageIds.set(groupId, new Set<string>());
      }
      const processedIds = processedGroupMessageIds.get(groupId)!;
      messages.forEach(m => processedIds.add(m.id));
    }

    initialLoad = false;
    callback(messages);
  }, (error) => {
    console.error('[groupService] ❌ Error in group messages listener:', error);
    if (error.message?.includes('index')) {
      console.error('[groupService] ⚠️ Firestore index required. Please create composite index in Firebase console.');
    }
    callback([]);
  });

  return () => {
    console.log('[groupService] 🔌 Detaching group listener with AI auto-response');
    unsubscribe();
  };
}

/**
 * Delete a group (admin only)
 * This permanently removes the group and all associated data:
 * - Group document
 * - All messages in the group
 * - All pending join requests for this group
 * 
 * @param groupId - The group ID to delete
 * @param adminId - The admin user ID
 * @param isSystemAdmin - If true, allows deleting any group (for admin panel users)
 */
export async function deleteGroup(
  groupId: string,
  adminId: string,
  isSystemAdmin: boolean = false
): Promise<boolean> {
  console.log('[groupService] 🗑️ Deleting group:', groupId, 'isSystemAdmin:', isSystemAdmin);

  try {
    // Check if admin has permission
    // System admins can delete any group, group admins can only delete their own groups
    let hasPermission = isSystemAdmin;
    
    if (!isSystemAdmin) {
      // Check if user is admin of this specific group
      hasPermission = await isGroupAdmin(groupId, adminId);
    }
    
    if (!hasPermission) {
      console.error('[groupService] ❌ User does not have permission to delete group:', adminId);
      return false;
    }

    // Get the group to access subcollections
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    const groupDoc = await getDoc(groupRef);

    if (!groupDoc.exists()) {
      console.error('[groupService] Group not found:', groupId);
      return false;
    }

    // Delete all messages in the group
    const messagesRef = collection(db, GROUPS_COLLECTION, groupId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    const messageDeletions = messagesSnapshot.docs.map(msgDoc =>
      deleteDoc(doc(db, GROUPS_COLLECTION, groupId, 'messages', msgDoc.id))
    );
    await Promise.all(messageDeletions);
    console.log(`[groupService] ✅ Deleted ${messageDeletions.length} messages`);

    // Delete all pending join requests for this group
    const requestsQuery = query(
      collection(db, GROUP_JOIN_REQUESTS_COLLECTION),
      where('groupId', '==', groupId)
    );
    const requestsSnapshot = await getDocs(requestsQuery);
    const requestDeletions = requestsSnapshot.docs.map(reqDoc =>
      deleteDoc(doc(db, GROUP_JOIN_REQUESTS_COLLECTION, reqDoc.id))
    );
    await Promise.all(requestDeletions);
    console.log(`[groupService] ✅ Deleted ${requestDeletions.length} join requests`);

    // Delete the group document itself
    await deleteDoc(groupRef);
    console.log('[groupService] ✅ Group deleted successfully:', groupId);

    return true;
  } catch (error: any) {
    console.error('[groupService] ❌ Failed to delete group:', error);
    return false;
  }
}
