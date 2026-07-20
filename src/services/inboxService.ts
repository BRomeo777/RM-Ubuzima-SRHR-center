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
  serverTimestamp,
  getDocs,
  limit,
  type QuerySnapshot,
  type DocumentData
} from 'firebase/firestore';
import { app } from './firebaseConfig';
import type { DirectMessage, InboxConversation, Facilitator } from '../types';
import { sendMessageNotification, notifyFacilitatorOfNewMessage } from './emailService';
import { notify, NotificationTemplates } from './notificationService';

const db = getFirestore(app);

// --- Performance Optimizations ---

// Message deduplication cache (prevents double messages from optimistic UI + Firestore)
const messageCache = new Map<string, Set<string>>();
const MAX_CACHE_SIZE = 100;

/**
 * Deduplicate messages by ID and content hash
 * Prevents showing the same message twice when optimistic UI merges with Firestore
 */
function deduplicateMessages(messages: DirectMessage[]): DirectMessage[] {
  const seen = new Set<string>();
  return messages.filter(msg => {
    // Create unique key from id or content+sender+timestamp
    const key = msg.id.startsWith('temp-')
      ? `temp-${msg.senderId}-${msg.content}-${msg.timestamp}`
      : msg.id;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Batch mark-as-read operations with debouncing
 */
class BatchMarkAsRead {
  private queue: Set<string> = new Set();
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private readonly delay = 500; // 500ms debounce
  private context: 'inbox' | 'shangazi' = 'inbox';

  add(messageIds: string[], context: 'inbox' | 'shangazi') {
    messageIds.forEach(id => this.queue.add(id));
    this.context = context;

    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.flush(), this.delay);
  }

  private async flush() {
    if (this.queue.size === 0) return;

    const ids = Array.from(this.queue);
    this.queue.clear();

    try {
      await markMessagesAsRead(ids, this.context);
      console.log(`[inboxService] Batch marked ${ids.length} messages as read`);
    } catch (error) {
      console.error('[inboxService] Batch mark-as-read failed:', error);
    }
  }
}

const batchMarkAsRead = new BatchMarkAsRead();

// Connection state monitoring
let isOnline = navigator.onLine;
const connectionListeners = new Set<(online: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    connectionListeners.forEach(cb => cb(true));
  });
  window.addEventListener('offline', () => {
    isOnline = false;
    connectionListeners.forEach(cb => cb(false));
  });
}

export function subscribeToConnection(callback: (online: boolean) => void): () => void {
  connectionListeners.add(callback);
  callback(isOnline); // Initial state
  return () => connectionListeners.delete(callback);
}

// Collection path for direct messages
const INBOX_COLLECTION = 'inbox_messages';
const SHANGAZI_COLLECTION = 'shangazi_messages';
const LEGAL_AFFAIRS_COLLECTION = 'legal_affairs_messages';
const GBV_COLLECTION = 'gbv_messages';
const FACILITATORS_COLLECTION = 'facilitators';

/**
 * Get all active facilitators (for mention dropdown and inbox)
 */
export async function getFacilitators(): Promise<Facilitator[]> {
  console.log('[inboxService] Fetching facilitators...');
  
  try {
    const q = query(
      collection(db, FACILITATORS_COLLECTION),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const facilitators = snapshot.docs.map(doc => ({
      userId: doc.data().userId || '',
      userName: doc.data().userName || '',
      userAvatar: doc.data().userAvatar || '',
      assignedBy: doc.data().assignedBy || '',
      assignedAt: doc.data().assignedAt?.toDate?.().toISOString() || new Date().toISOString(),
      canDeleteMessages: doc.data().canDeleteMessages ?? true,
      canBanUsers: doc.data().canBanUsers ?? true,
      canSendAnnouncements: doc.data().canSendAnnouncements ?? true,
      isOnline: doc.data().isOnline || false,
      lastSeen: doc.data().lastSeen?.toDate?.().toISOString(),
      bio: doc.data().bio || '',
      role: doc.data().role || 'Facilitator',
    })) as Facilitator[];
    
    console.log(`[inboxService] Found ${facilitators.length} facilitators`);
    return facilitators;
  } catch (error: any) {
    console.error('[inboxService] Error fetching facilitators:', error);
    return [];
  }
}

/**
 * Subscribe to facilitators in real-time
 */
export function subscribeToFacilitators(callback: (facilitators: Facilitator[]) => void): () => void {
  console.log('[inboxService] Subscribing to facilitators...');
  
  const q = query(
    collection(db, FACILITATORS_COLLECTION),
    where('isActive', '==', true)
  );
  
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const facilitators = snapshot.docs.map(doc => ({
      userId: doc.data().userId || '',
      userName: doc.data().userName || '',
      userAvatar: doc.data().userAvatar || '',
      assignedBy: doc.data().assignedBy || '',
      assignedAt: doc.data().assignedAt?.toDate?.().toISOString() || new Date().toISOString(),
      canDeleteMessages: doc.data().canDeleteMessages ?? true,
      canBanUsers: doc.data().canBanUsers ?? true,
      canSendAnnouncements: doc.data().canSendAnnouncements ?? true,
      isOnline: doc.data().isOnline || false,
      lastSeen: doc.data().lastSeen?.toDate?.().toISOString(),
      bio: doc.data().bio || '',
      role: doc.data().role || 'Facilitator',
    })) as Facilitator[];
    
    callback(facilitators);
  }, (error) => {
    console.error('[inboxService] Error subscribing to facilitators:', error);
    callback([]);
  });
}

/**
 * Send a direct message to a facilitator
 * Only users can message facilitators, not vice versa for privacy
 */
export async function sendDirectMessage(
  senderId: string,
  senderName: string,
  senderAvatar: string,
  receiverId: string,
  receiverName: string,
  content: string
): Promise<DirectMessage | null> {
  console.log('[inboxService] Sending DM...');
  console.log(`[inboxService] From: ${senderName} (${senderId}) -> To: ${receiverName} (${receiverId})`);

  // Validate required fields
  if (!senderId || !receiverId || !content.trim()) {
    console.error('[inboxService] Missing required fields:', { senderId, receiverId, content: content.trim() });
    throw new Error('Missing required fields: senderId, receiverId, or content');
  }

  try {
    // Create conversation ID for easier querying (sorted user IDs)
    const conversationId = [senderId, receiverId].sort().join('_');
    // Participants array for array-contains queries
    const participants = [senderId, receiverId];

    const messageData = {
      senderId,
      senderName: senderName || 'Anonymous',
      senderAvatar: senderAvatar || '',
      receiverId,
      receiverName: receiverName || 'Facilitator',
      content: content.trim(),
      conversationId, // For simple conversation queries
      participants,   // For array-contains queries to get all user's conversations
      timestamp: serverTimestamp(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };

    console.log('[inboxService] Adding document to Firestore...');
    const docRef = await addDoc(collection(db, INBOX_COLLECTION), messageData);

    console.log('[inboxService] DM sent successfully:', docRef.id);

    // Send email notification to facilitator (async, don't block)
    // Only send if facilitator is not currently online (check would require additional query)
    // For now, we send with debounce logic in the email service
    setTimeout(async () => {
      try {
        await notifyFacilitatorOfNewMessage(
          '', // Facilitator email - would need to be fetched from profile
          receiverName,
          senderName,
          content,
          'inbox'
        );
      } catch (e) {
        // Silently fail - email notification is not critical
        console.log('[inboxService] Email notification failed (non-critical):', e);
      }
    }, 100);

    return {
      id: docRef.id,
      senderId,
      senderName: messageData.senderName,
      senderAvatar: messageData.senderAvatar,
      receiverId,
      receiverName: messageData.receiverName,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };
  } catch (error: any) {
    console.error('[inboxService] Error sending DM:', error);
    console.error('[inboxService] Error code:', error.code);
    console.error('[inboxService] Error message:', error.message);
    // Re-throw the error so the caller can handle it properly
    throw error;
  }
}

/**
 * Send a direct message to a Big Sister (Shangazi) - uses separate collection
 */
export async function sendShangaziMessage(
  senderId: string,
  senderName: string,
  senderAvatar: string,
  receiverId: string,
  receiverName: string,
  content: string
): Promise<DirectMessage | null> {
  console.log('[inboxService] Sending Shangazi message...');
  console.log(`[inboxService] From: ${senderName} (${senderId}) -> To Big Sister: ${receiverName} (${receiverId})`);

  // Validate required fields
  if (!senderId || !receiverId || !content.trim()) {
    console.error('[inboxService] Missing required fields:', { senderId, receiverId, content: content.trim() });
    throw new Error('Missing required fields: senderId, receiverId, or content');
  }

  try {
    // Create conversation ID for easier querying (sorted user IDs)
    const conversationId = [senderId, receiverId].sort().join('_');
    // Participants array for array-contains queries
    const participants = [senderId, receiverId];

    const messageData = {
      senderId,
      senderName: senderName || 'Anonymous',
      senderAvatar: senderAvatar || '',
      receiverId,
      receiverName: receiverName || 'Big Sister',
      content: content.trim(),
      conversationId, // For simpler querying without composite indexes
      participants,   // For array-contains queries
      timestamp: serverTimestamp(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };

    console.log('[inboxService] Adding Shangazi document to Firestore...');
    const docRef = await addDoc(collection(db, SHANGAZI_COLLECTION), messageData);

    console.log('[inboxService] Shangazi message sent successfully:', docRef.id);

    return {
      id: docRef.id,
      senderId,
      senderName: messageData.senderName,
      senderAvatar: messageData.senderAvatar,
      receiverId,
      receiverName: messageData.receiverName,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };
  } catch (error: any) {
    console.error('[inboxService] Error sending Shangazi message:', error);
    console.error('[inboxService] Error code:', error.code);
    console.error('[inboxService] Error message:', error.message);
    // Re-throw the error so the caller can handle it properly
    throw error;
  }
}

/**
 * Subscribe to Shangazi conversation between user and Big Sister
 * ULTRA-OPTIMIZED: Uses participants array only - NO composite index required
 * Prevents messages from disappearing due to missing index errors
 */
export function subscribeToShangaziConversation(
  userId: string,
  bigSisterId: string,
  callback: (messages: DirectMessage[]) => void
): () => void {
  console.log(`[inboxService] Subscribing to Shangazi conversation: ${userId} <-> ${bigSisterId}`);

  // ULTRA-FIX: Use participants array only - NO orderBy to avoid composite index
  const q = query(
    collection(db, SHANGAZI_COLLECTION),
    where('participants', 'array-contains', userId),
    limit(300)
  );

  let isFirstSnapshot = true;

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    // Filter to only include messages between these two specific users
    const allMessages = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId || '',
          senderName: data.senderName || '',
          senderAvatar: data.senderAvatar || '',
          receiverId: data.receiverId || '',
          receiverName: data.receiverName || '',
          receiverAvatar: data.receiverAvatar || '',
          content: data.content || '',
          timestamp: data.timestamp?.toDate?.().toISOString() || new Date().toISOString(),
          isDeleted: data.isDeleted || false,
          isRead: data.isRead || false,
          type: data.type || 'text',
        } as DirectMessage;
      })
      .filter(msg => {
        // Only include messages between these two specific users
        const isBetweenUsers = (msg.senderId === userId && msg.receiverId === bigSisterId) ||
                               (msg.senderId === bigSisterId && msg.receiverId === userId);
        return isBetweenUsers && !msg.isDeleted;
      });

    // Sort client-side (chronological order for chat display)
    const messages = allMessages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (isFirstSnapshot) {
      console.log(`[inboxService] First snapshot: ${messages.length} Shangazi messages`);
      isFirstSnapshot = false;
    } else {
      console.log(`[inboxService] Real-time update: ${messages.length} Shangazi messages`);
    }

    callback(messages);
  }, (error) => {
    console.error('[inboxService] Error subscribing to Shangazi conversation:', error);
    console.error('[inboxService] Error code:', error.code);
    if (error.code === 'failed-precondition') {
      console.error('[inboxService] MISSING INDEX: Create single-field index for shangazi_messages.participants (Array)');
    }
    // DON'T clear messages on error - keep showing cached data
    console.log('[inboxService] Keeping previous messages due to error');
  });
}

/**
 * Subscribe to conversation between current user and a facilitator
 * ULTRA-OPTIMIZED: Uses participants array only - NO composite index required
 * Prevents messages from disappearing due to missing index errors
 */
export function subscribeToConversation(
  userId: string,
  facilitatorId: string,
  callback: (messages: DirectMessage[]) => void
): () => void {
  console.log(`[inboxService] Subscribing to conversation: ${userId} <-> ${facilitatorId}`);

  // ULTRA-FIX: Use participants array only - NO orderBy to avoid composite index
  const q = query(
    collection(db, INBOX_COLLECTION),
    where('participants', 'array-contains', userId),
    limit(300)
  );

  let isFirstSnapshot = true;
  let lastProcessedMessageId = '';

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    // Filter to only include messages between these two specific users
    const allMessages = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId || '',
          senderName: data.senderName || '',
          senderAvatar: data.senderAvatar || '',
          receiverId: data.receiverId || '',
          receiverName: data.receiverName || '',
          content: data.content || '',
          timestamp: data.timestamp?.toDate?.().toISOString() || new Date().toISOString(),
          isDeleted: data.isDeleted || false,
          isRead: data.isRead || false,
          type: data.type || 'text',
        } as DirectMessage;
      })
      .filter(msg => {
        // Only include messages between these two specific users
        const isBetweenUsers = (msg.senderId === userId && msg.receiverId === facilitatorId) ||
                               (msg.senderId === facilitatorId && msg.receiverId === userId);
        return isBetweenUsers && !msg.isDeleted;
      });

    // Sort client-side (chronological order for chat display)
    const messages = allMessages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (isFirstSnapshot) {
      console.log(`[inboxService] First snapshot: ${messages.length} messages`);
      isFirstSnapshot = false;
    } else {
      console.log(`[inboxService] Real-time update: ${messages.length} messages`);
    }

    // Notify on new messages received from facilitator (not sent by user)
    const newReceivedMessages = messages.filter(m => 
      m.receiverId === userId && 
      !m.isRead && 
      m.id !== lastProcessedMessageId &&
      !m.id.startsWith('temp-')
    );

    if (newReceivedMessages.length > 0) {
      const latestMessage = newReceivedMessages[newReceivedMessages.length - 1];
      lastProcessedMessageId = latestMessage.id;
      
      // Only notify if not currently on inbox page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/inbox')) {
        notify(NotificationTemplates.newInboxMessage(
          latestMessage.senderName || 'New Message',
          latestMessage.content.substring(0, 100) + (latestMessage.content.length > 100 ? '...' : ''),
          '/inbox'
        ));
      }
    }

    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.receiverId === userId) {
        lastProcessedMessageId = lastMessage.id;
      }
    }

    // Batch mark unread messages as read
    const unreadIds = messages
      .filter(m => m.receiverId === userId && !m.isRead)
      .map(m => m.id)
      .filter(id => !id.startsWith('temp-'));

    if (unreadIds.length > 0) {
      batchMarkAsRead.add(unreadIds, 'inbox');
    }

    callback(messages);
  }, (error) => {
    console.error('[inboxService] Error subscribing to conversation:', error);
    console.error('[inboxService] Error code:', error.code);
    if (error.code === 'failed-precondition') {
      console.error('[inboxService] MISSING INDEX: Create single-field index for inbox_messages.participants (Array)');
    }
    // DON'T clear messages on error - keep showing cached data
    console.log('[inboxService] Keeping previous messages due to error');
  });
}

/**
 * Get all conversations for a user (inbox list)
 * FIXED: Uses participants array without orderBy to avoid composite index requirement
 * This ensures users see ALL their conversation history when they return
 */
export function subscribeToUserInbox(
  userId: string,
  callback: (conversations: InboxConversation[]) => void
): () => void {
  console.log(`[inboxService] Subscribing to inbox for user: ${userId}`);

  // FIXED: Removed orderBy to avoid composite index requirement
  // We do client-side sorting instead - this is more reliable
  const q = query(
    collection(db, INBOX_COLLECTION),
    where('participants', 'array-contains', userId),
    limit(200) // Get more messages for complete history
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    // Group messages by conversationId for complete conversation threads
    const conversationMap = new Map<string, {
      messages: DirectMessage[];
      unreadCount: number;
      participantId: string;
      participantName: string;
      participantAvatar: string;
    }>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.isDeleted) return;

      const message: DirectMessage = {
        id: doc.id,
        senderId: data.senderId || '',
        senderName: data.senderName || '',
        senderAvatar: data.senderAvatar || '',
        receiverId: data.receiverId || '',
        receiverName: data.receiverName || '',
        content: data.content || '',
        timestamp: data.timestamp?.toDate?.().toISOString() || new Date().toISOString(),
        isDeleted: data.isDeleted || false,
        isRead: data.isRead || false,
        type: data.type || 'text',
      };

      // Get conversationId or create from sender/receiver
      const conversationId = data.conversationId || [message.senderId, message.receiverId].sort().join('_');

      // Identify the other participant (not the current user)
      const otherId = message.senderId === userId ? message.receiverId : message.senderId;
      const otherName = (message.senderId === userId ? message.receiverName : message.senderName) || 'Unknown';
      const otherAvatar = (message.senderId === userId ? message.receiverAvatar : message.senderAvatar) || '';

      if (!conversationMap.has(conversationId)) {
        conversationMap.set(conversationId, {
          messages: [],
          unreadCount: 0,
          participantId: otherId,
          participantName: otherName,
          participantAvatar: otherAvatar,
        });
      }

      const conv = conversationMap.get(conversationId)!;
      conv.messages.push(message);

      // Count unread messages (received but not read)
      if (message.receiverId === userId && !message.isRead) {
        conv.unreadCount++;
      }
    });

    // Sort messages within each conversation by timestamp (newest first)
    conversationMap.forEach(conv => {
      conv.messages.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    });

    // Convert to conversation array
    const conversations: InboxConversation[] = Array.from(conversationMap.entries()).map(([conversationId, data]) => {
      const lastMessage = data.messages[0]; // Already sorted, first is most recent

      return {
        participantId: data.participantId,
        participantName: data.participantName,
        participantAvatar: data.participantAvatar,
        lastMessage: lastMessage?.content || '',
        lastMessageTimestamp: lastMessage?.timestamp || new Date().toISOString(),
        unreadCount: data.unreadCount,
        isFacilitator: true,
      };
    });

    // Sort conversations by most recent message (client-side)
    conversations.sort((a, b) =>
      new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );

    console.log(`[inboxService] User has ${conversations.length} conversations with complete history`);
    callback(conversations);
  }, (error) => {
    console.error('[inboxService] Error subscribing to inbox:', error);
    console.error('[inboxService] Error code:', error.code);
    if (error.code === 'failed-precondition') {
      console.error('[inboxService] MISSING INDEX: Create a composite index for inbox_messages with participants (Array contains) + timestamp (Descending)');
    }
    callback([]);
  });
}

/**
 * Mark messages as read
 * Supports both inbox and shangazi collections
 */
export async function markMessagesAsRead(
  messageIds: string[],
  context: 'inbox' | 'shangazi' = 'inbox'
): Promise<boolean> {
  console.log(`[inboxService] Marking ${messageIds.length} ${context} messages as read`);

  const collectionName = context === 'shangazi' ? SHANGAZI_COLLECTION : INBOX_COLLECTION;

  try {
    const promises = messageIds.map(id =>
      updateDoc(doc(db, collectionName, id), { isRead: true })
    );
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('[inboxService] Error marking messages as read:', error);
    return false;
  }
}

/**
 * Delete a direct message (soft delete)
 */
export async function deleteDirectMessage(messageId: string): Promise<boolean> {
  console.log(`[inboxService] Deleting message: ${messageId}`);

  try {
    await updateDoc(doc(db, INBOX_COLLECTION, messageId), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('[inboxService] Error deleting message:', error);
    return false;
  }
}

/**
 * Get all Shangazi conversations for a user
 * FIXED: Uses participants array without orderBy to avoid composite index requirement
 * This ensures users see ALL their Shangazi conversation history when they return
 */
export function subscribeToUserShangaziInbox(
  userId: string,
  callback: (conversations: InboxConversation[]) => void
): () => void {
  console.log(`[inboxService] Subscribing to Shangazi inbox for user: ${userId}`);

  // FIXED: Use participants array to find ALL messages where user is involved
  const q = query(
    collection(db, SHANGAZI_COLLECTION),
    where('participants', 'array-contains', userId),
    limit(200) // Get more messages for complete history
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    // Group messages by conversationId
    const conversationMap = new Map<string, {
      messages: DirectMessage[];
      unreadCount: number;
      participantId: string;
      participantName: string;
      participantAvatar: string;
    }>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.isDeleted) return;

      const message: DirectMessage = {
        id: doc.id,
        senderId: data.senderId || '',
        senderName: data.senderName || '',
        senderAvatar: data.senderAvatar || '',
        receiverId: data.receiverId || '',
        receiverName: data.receiverName || '',
        receiverAvatar: data.receiverAvatar || '',
        content: data.content || '',
        timestamp: data.timestamp?.toDate?.().toISOString() || new Date().toISOString(),
        isDeleted: data.isDeleted || false,
        isRead: data.isRead || false,
        type: data.type || 'text',
      };

      // Get conversationId or create from sender/receiver
      const conversationId = data.conversationId || [message.senderId, message.receiverId].sort().join('_');

      // The OTHER participant (Big Sister)
      const otherId = message.senderId === userId ? message.receiverId : message.senderId;
      const otherName = (message.senderId === userId ? message.receiverName : message.senderName) || 'Big Sister';
      const otherAvatar = (message.senderId === userId ? message.receiverAvatar : message.senderAvatar) || '';

      if (!conversationMap.has(conversationId)) {
        conversationMap.set(conversationId, {
          messages: [],
          unreadCount: 0,
          participantId: otherId,
          participantName: otherName,
          participantAvatar: otherAvatar,
        });
      }

      const conv = conversationMap.get(conversationId)!;
      conv.messages.push(message);

      // Count unread messages
      if (message.receiverId === userId && !message.isRead) {
        conv.unreadCount++;
      }
    });

    // Sort messages within each conversation by timestamp (newest first)
    conversationMap.forEach(conv => {
      conv.messages.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    });

    // Convert to conversation array
    const conversations: InboxConversation[] = Array.from(conversationMap.entries()).map(([conversationId, data]) => {
      const lastMessage = data.messages[0]; // Already sorted

      return {
        participantId: data.participantId,
        participantName: data.participantName,
        participantAvatar: data.participantAvatar,
        lastMessage: lastMessage?.content || '',
        lastMessageTimestamp: lastMessage?.timestamp || new Date().toISOString(),
        unreadCount: data.unreadCount,
        isFacilitator: true,
      };
    });

    // Sort conversations by most recent message
    conversations.sort((a, b) =>
      new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );

    console.log(`[inboxService] User has ${conversations.length} Shangazi conversations`);
    callback(conversations);
  }, (error) => {
    console.error('[inboxService] Error subscribing to Shangazi inbox:', error);
    if (error.code === 'failed-precondition') {
      console.error('[inboxService] MISSING INDEX: Create single-field index for shangazi_messages.participants (Array)');
    }
    callback([]);
  });
}

// ============================================
// LEGAL AFFAIRS CHAT (Mpuza - Legal & Human Rights)
// Uses same pattern as Shangazi but separate collection
// ============================================

/**
 * Send a message to a Legal Advisor - uses separate collection
 */
export async function sendLegalMessage(
  senderId: string,
  senderName: string,
  senderAvatar: string,
  receiverId: string,
  receiverName: string,
  content: string
): Promise<DirectMessage | null> {
  console.log('[inboxService] Sending Legal Affairs message...');

  if (!senderId || !receiverId || !content.trim()) {
    throw new Error('Missing required fields: senderId, receiverId, or content');
  }

  try {
    const conversationId = [senderId, receiverId].sort().join('_');
    const participants = [senderId, receiverId];

    const messageData = {
      senderId,
      senderName: senderName || 'Anonymous',
      senderAvatar: senderAvatar || '',
      receiverId,
      receiverName: receiverName || 'Legal Advisor',
      content: content.trim(),
      conversationId,
      participants,
      timestamp: serverTimestamp(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };

    const docRef = await addDoc(collection(db, LEGAL_AFFAIRS_COLLECTION), messageData);
    console.log('[inboxService] Legal Affairs message sent successfully:', docRef.id);

    return {
      id: docRef.id,
      senderId,
      senderName: messageData.senderName,
      senderAvatar: messageData.senderAvatar,
      receiverId,
      receiverName: messageData.receiverName,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };
  } catch (error: any) {
    console.error('[inboxService] Error sending Legal Affairs message:', error);
    throw error;
  }
}

/**
 * Subscribe to Legal Affairs conversation between user and Legal Advisor
 */
export function subscribeToLegalConversation(
  userId: string,
  advisorId: string,
  callback: (messages: DirectMessage[]) => void
): () => void {
  console.log(`[inboxService] Subscribing to Legal Affairs conversation: ${userId} <-> ${advisorId}`);

  const q = query(
    collection(db, LEGAL_AFFAIRS_COLLECTION),
    where('participants', 'array-contains', userId),
    limit(300)
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const allMessages = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId || '',
          senderName: data.senderName || '',
          senderAvatar: data.senderAvatar || '',
          receiverId: data.receiverId || '',
          receiverName: data.receiverName || '',
          receiverAvatar: data.receiverAvatar || '',
          content: data.content || '',
          timestamp: data.timestamp?.toDate?.().toISOString() || new Date().toISOString(),
          isDeleted: data.isDeleted || false,
          isRead: data.isRead || false,
          type: data.type || 'text',
        } as DirectMessage;
      })
      .filter(msg => {
        const isBetweenUsers = (msg.senderId === userId && msg.receiverId === advisorId) ||
                               (msg.senderId === advisorId && msg.receiverId === userId);
        return isBetweenUsers && !msg.isDeleted;
      });

    const messages = allMessages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    callback(messages);
  }, (error) => {
    console.error('[inboxService] Error subscribing to Legal Affairs conversation:', error);
  });
}

/**
 * Subscribe to user's Legal Affairs inbox for conversation history
 */
export function subscribeToUserLegalInbox(
  userId: string,
  callback: (conversations: InboxConversation[]) => void
): () => void {
  console.log(`[inboxService] Subscribing to Legal Affairs inbox for user: ${userId}`);

  const q = query(
    collection(db, LEGAL_AFFAIRS_COLLECTION),
    where('participants', 'array-contains', userId),
    limit(200)
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const conversationMap = new Map<string, {
      messages: DirectMessage[];
      unreadCount: number;
      participantId: string;
      participantName: string;
      participantAvatar: string;
    }>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.isDeleted) return;

      const message: DirectMessage = {
        id: doc.id,
        senderId: data.senderId || '',
        senderName: data.senderName || '',
        senderAvatar: data.senderAvatar || '',
        receiverId: data.receiverId || '',
        receiverName: data.receiverName || '',
        receiverAvatar: data.receiverAvatar || '',
        content: data.content || '',
        timestamp: data.timestamp?.toDate?.().toISOString() || new Date().toISOString(),
        isDeleted: data.isDeleted || false,
        isRead: data.isRead || false,
        type: data.type || 'text',
      };

      const conversationId = data.conversationId || [message.senderId, message.receiverId].sort().join('_');
      const otherId = message.senderId === userId ? message.receiverId : message.senderId;
      const otherName = (message.senderId === userId ? message.receiverName : message.senderName) || 'Legal Advisor';
      const otherAvatar = (message.senderId === userId ? message.receiverAvatar : message.senderAvatar) || '';

      if (!conversationMap.has(conversationId)) {
        conversationMap.set(conversationId, {
          messages: [],
          unreadCount: 0,
          participantId: otherId,
          participantName: otherName,
          participantAvatar: otherAvatar,
        });
      }

      const conv = conversationMap.get(conversationId)!;
      conv.messages.push(message);

      if (message.receiverId === userId && !message.isRead) {
        conv.unreadCount++;
      }
    });

    conversationMap.forEach(conv => {
      conv.messages.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    });

    const conversations: InboxConversation[] = Array.from(conversationMap.entries()).map(([_, data]) => {
      const lastMessage = data.messages[0];
      return {
        participantId: data.participantId,
        participantName: data.participantName,
        participantAvatar: data.participantAvatar,
        lastMessage: lastMessage?.content || '',
        lastMessageTimestamp: lastMessage?.timestamp || new Date().toISOString(),
        unreadCount: data.unreadCount,
        isFacilitator: true,
      };
    });

    conversations.sort((a, b) =>
      new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );

    console.log(`[inboxService] User has ${conversations.length} Legal Affairs conversations`);
    callback(conversations);
  }, (error) => {
    console.error('[inboxService] Error subscribing to Legal Affairs inbox:', error);
    callback([]);
  });
}

// ============================================
// GBV CHAT (Mpuza - Gender-Based Violence)
// Uses same pattern as Legal Affairs but separate collection
// ============================================

/**
 * Send a message to a GBV Counselor - uses separate collection
 */
export async function sendGBVMessage(
  senderId: string,
  senderName: string,
  senderAvatar: string,
  receiverId: string,
  receiverName: string,
  content: string
): Promise<DirectMessage | null> {
  console.log('[inboxService] Sending GBV message...');

  if (!senderId || !receiverId || !content.trim()) {
    throw new Error('Missing required fields: senderId, receiverId, or content');
  }

  try {
    const conversationId = [senderId, receiverId].sort().join('_');
    const participants = [senderId, receiverId];

    const messageData = {
      senderId,
      senderName: senderName || 'Anonymous',
      senderAvatar: senderAvatar || '',
      receiverId,
      receiverName: receiverName || 'GBV Counselor',
      content: content.trim(),
      conversationId,
      participants,
      timestamp: serverTimestamp(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };

    const docRef = await addDoc(collection(db, GBV_COLLECTION), messageData);
    console.log('[inboxService] GBV message sent successfully:', docRef.id);

    return {
      id: docRef.id,
      senderId,
      senderName: messageData.senderName,
      senderAvatar: messageData.senderAvatar,
      receiverId,
      receiverName: messageData.receiverName,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };
  } catch (error: any) {
    console.error('[inboxService] Error sending GBV message:', error);
    throw error;
  }
}

/**
 * Subscribe to GBV conversation between user and GBV Counselor
 */
export function subscribeToGBVConversation(
  userId: string,
  counselorId: string,
  callback: (messages: DirectMessage[]) => void
): () => void {
  console.log(`[inboxService] Subscribing to GBV conversation: ${userId} <-> ${counselorId}`);

  const q = query(
    collection(db, GBV_COLLECTION),
    where('participants', 'array-contains', userId),
    limit(300)
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const allMessages = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId || '',
          senderName: data.senderName || '',
          senderAvatar: data.senderAvatar || '',
          receiverId: data.receiverId || '',
          receiverName: data.receiverName || '',
          receiverAvatar: data.receiverAvatar || '',
          content: data.content || '',
          timestamp: data.timestamp?.toDate?.().toISOString() || new Date().toISOString(),
          isDeleted: data.isDeleted || false,
          isRead: data.isRead || false,
          type: data.type || 'text',
        } as DirectMessage;
      })
      .filter(msg => {
        const isBetweenUsers = (msg.senderId === userId && msg.receiverId === counselorId) ||
                               (msg.senderId === counselorId && msg.receiverId === userId);
        return isBetweenUsers && !msg.isDeleted;
      });

    const messages = allMessages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    callback(messages);
  }, (error) => {
    console.error('[inboxService] Error subscribing to GBV conversation:', error);
  });
}

/**
 * Subscribe to user's GBV inbox for conversation history
 */
export function subscribeToUserGBVInbox(
  userId: string,
  callback: (conversations: InboxConversation[]) => void
): () => void {
  console.log(`[inboxService] Subscribing to GBV inbox for user: ${userId}`);

  const q = query(
    collection(db, GBV_COLLECTION),
    where('participants', 'array-contains', userId),
    limit(200)
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const conversationMap = new Map<string, {
      messages: DirectMessage[];
      unreadCount: number;
      participantId: string;
      participantName: string;
      participantAvatar: string;
    }>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.isDeleted) return;

      const message: DirectMessage = {
        id: doc.id,
        senderId: data.senderId || '',
        senderName: data.senderName || '',
        senderAvatar: data.senderAvatar || '',
        receiverId: data.receiverId || '',
        receiverName: data.receiverName || '',
        receiverAvatar: data.receiverAvatar || '',
        content: data.content || '',
        timestamp: data.timestamp?.toDate?.().toISOString() || new Date().toISOString(),
        isDeleted: data.isDeleted || false,
        isRead: data.isRead || false,
        type: data.type || 'text',
      };

      const conversationId = data.conversationId || [message.senderId, message.receiverId].sort().join('_');
      const otherId = message.senderId === userId ? message.receiverId : message.senderId;
      const otherName = (message.senderId === userId ? message.receiverName : message.senderName) || 'GBV Counselor';
      const otherAvatar = (message.senderId === userId ? message.receiverAvatar : message.senderAvatar) || '';

      if (!conversationMap.has(conversationId)) {
        conversationMap.set(conversationId, {
          messages: [],
          unreadCount: 0,
          participantId: otherId,
          participantName: otherName,
          participantAvatar: otherAvatar,
        });
      }

      const conv = conversationMap.get(conversationId)!;
      conv.messages.push(message);

      if (message.receiverId === userId && !message.isRead) {
        conv.unreadCount++;
      }
    });

    conversationMap.forEach(conv => {
      conv.messages.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    });

    const conversations: InboxConversation[] = Array.from(conversationMap.entries()).map(([_, data]) => {
      const lastMessage = data.messages[0];
      return {
        participantId: data.participantId,
        participantName: data.participantName,
        participantAvatar: data.participantAvatar,
        lastMessage: lastMessage?.content || '',
        lastMessageTimestamp: lastMessage?.timestamp || new Date().toISOString(),
        unreadCount: data.unreadCount,
        isFacilitator: true,
      };
    });

    conversations.sort((a, b) =>
      new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );

    console.log(`[inboxService] User has ${conversations.length} GBV conversations`);
    callback(conversations);
  }, (error) => {
    console.error('[inboxService] Error subscribing to GBV inbox:', error);
    callback([]);
  });
}
