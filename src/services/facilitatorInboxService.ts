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
  limit,
  type QuerySnapshot,
  type DocumentData
} from 'firebase/firestore';
import { app } from './firebaseConfig';
import type { DirectMessage, InboxConversation } from '../types';

const db = getFirestore(app);

// Collection path for direct messages
const INBOX_COLLECTION = 'inbox_messages';
const SHANGAZI_COLLECTION = 'shangazi_messages';

/**
 * Subscribe to facilitator's inbox - ALL conversations this facilitator is part of
 * FIXED: Uses participants array to find ALL messages where facilitator is involved
 * This ensures facilitators see both sent and received messages for persistence
 */
export function subscribeToFacilitatorInbox(
  facilitatorId: string,
  callback: (conversations: InboxConversation[]) => void
): () => void {
  console.log(`[facilitatorInboxService] Subscribing to inbox for facilitator: ${facilitatorId}`);

  // FIXED: Use participants array to find ALL messages where facilitator is involved
  // This includes messages they sent AND received - no composite index required
  const q = query(
    collection(db, INBOX_COLLECTION),
    where('participants', 'array-contains', facilitatorId),
    limit(200) // Get more messages for complete conversation history
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

    snapshot.docs.forEach(docData => {
      const data = docData.data();
      if (data.isDeleted) return;

      const message: DirectMessage = {
        id: docData.id,
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

      // The OTHER participant is the user (not the facilitator)
      const otherParticipantId = message.senderId === facilitatorId ? message.receiverId : message.senderId;
      const otherParticipantName = (message.senderId === facilitatorId ? message.receiverName : message.senderName) || 'Unknown';
      const otherParticipantAvatar = (message.senderId === facilitatorId ? message.receiverAvatar : message.senderAvatar) || '';

      if (!conversationMap.has(conversationId)) {
        conversationMap.set(conversationId, {
          messages: [],
          unreadCount: 0,
          participantId: otherParticipantId,
          participantName: otherParticipantName,
          participantAvatar: otherParticipantAvatar,
        });
      }

      const conv = conversationMap.get(conversationId)!;
      conv.messages.push(message);

      // Count unread messages (only count if facilitator is the receiver)
      if (!message.isRead && message.receiverId === facilitatorId) {
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
        participantName: data.participantName || 'Unknown',
        participantAvatar: data.participantAvatar || '',
        lastMessage: lastMessage?.content || '',
        lastMessageTimestamp: lastMessage?.timestamp || new Date().toISOString(),
        unreadCount: data.unreadCount,
        isFacilitator: false,
        context: 'inbox',
      };
    });

    // Sort conversations by most recent message
    conversations.sort((a, b) =>
      new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );

    console.log(`[facilitatorInboxService] Facilitator has ${conversations.length} inbox conversations`);
    callback(conversations);
  }, (error) => {
    console.error('[facilitatorInboxService] Error subscribing to facilitator inbox:', error);
    if (error.code === 'failed-precondition') {
      console.error('[facilitatorInboxService] MISSING INDEX: Create single-field index for inbox_messages.participants (Array)');
    }
    callback([]);
  });
}

/**
 * Subscribe to Shangazi inbox - messages from users to this Big Sister
 * FIXED: Uses participants array to find ALL messages where Big Sister is involved
 * This ensures facilitators see both sent and received messages
 */
export function subscribeToShangaziInbox(
  bigSisterId: string,
  callback: (conversations: InboxConversation[]) => void
): () => void {
  console.log(`[facilitatorInboxService] Subscribing to Shangazi inbox for: ${bigSisterId}`);

  // FIXED: Use participants array to find ALL messages where Big Sister is involved
  // This includes messages they sent AND received - no composite index required
  const q = query(
    collection(db, SHANGAZI_COLLECTION),
    where('participants', 'array-contains', bigSisterId),
    limit(200) // Get more messages for conversation history
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    // Group messages by conversationId (unique conversation identifier)
    const conversationMap = new Map<string, {
      messages: DirectMessage[];
      unreadCount: number;
      participantId: string;
      participantName: string;
      participantAvatar: string;
    }>();

    snapshot.docs.forEach(docData => {
      const data = docData.data();
      if (data.isDeleted) return;

      const message: DirectMessage = {
        id: docData.id,
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

      // The OTHER participant is the user (not the bigSister)
      const otherParticipantId = message.senderId === bigSisterId ? message.receiverId : message.senderId;
      const otherParticipantName = (message.senderId === bigSisterId ? message.receiverName : message.senderName) || 'Unknown';
      const otherParticipantAvatar = (message.senderId === bigSisterId ? message.receiverAvatar : message.senderAvatar) || '';

      if (!conversationMap.has(conversationId)) {
        conversationMap.set(conversationId, {
          messages: [],
          unreadCount: 0,
          participantId: otherParticipantId,
          participantName: otherParticipantName,
          participantAvatar: otherParticipantAvatar,
        });
      }

      const conv = conversationMap.get(conversationId)!;
      conv.messages.push(message);

      // Count unread messages (only count if Big Sister is the receiver)
      if (!message.isRead && message.receiverId === bigSisterId) {
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
        participantName: data.participantName || 'Unknown',
        participantAvatar: data.participantAvatar || '',
        lastMessage: lastMessage?.content || '',
        lastMessageTimestamp: lastMessage?.timestamp || new Date().toISOString(),
        unreadCount: data.unreadCount,
        isFacilitator: false,
        context: 'shangazi',
      };
    });

    // Sort conversations by most recent message
    conversations.sort((a, b) =>
      new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );

    console.log(`[facilitatorInboxService] Big Sister has ${conversations.length} Shangazi conversations`);
    callback(conversations);
  }, (error) => {
    console.error('[facilitatorInboxService] Error subscribing to Shangazi inbox:', error);
    if (error.code === 'failed-precondition') {
      console.error('[facilitatorInboxService] MISSING INDEX: Create single-field index for shangazi_messages.participants (Array)');
    }
    callback([]);
  });
}

/**
 * Subscribe to conversation between facilitator and user
 * ULTRA-OPTIMIZED: Uses participants array only - NO composite index required
 * Prevents messages from disappearing due to missing index errors
 */
export function subscribeToConversation(
  facilitatorId: string,
  userId: string,
  context: 'inbox' | 'shangazi',
  callback: (messages: DirectMessage[]) => void
): () => void {
  console.log(`[facilitatorInboxService] Subscribing to ${context} conversation: ${facilitatorId} <-> ${userId}`);

  const collectionName = context === 'shangazi' ? SHANGAZI_COLLECTION : INBOX_COLLECTION;

  // ULTRA-FIX: Use participants array only - NO orderBy to avoid composite index requirement
  // We filter by both participants to get the exact conversation
  // Client-side sorting is fast enough for chat messages
  const q = query(
    collection(db, collectionName),
    where('participants', 'array-contains', facilitatorId),
    limit(300) // Get enough messages for full conversation history
  );

  let isFirstSnapshot = true;

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    // Filter to only include messages between these two specific users
    const allMessages = snapshot.docs
      .map(docData => {
        const data = docData.data();
        return {
          id: docData.id,
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
        const isBetweenUsers = (msg.senderId === facilitatorId && msg.receiverId === userId) ||
                               (msg.senderId === userId && msg.receiverId === facilitatorId);
        return isBetweenUsers && !msg.isDeleted;
      });

    // Sort client-side (chronological order for chat display)
    const messages = allMessages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (isFirstSnapshot) {
      console.log(`[facilitatorInboxService] First snapshot: ${messages.length} messages in conversation`);
      isFirstSnapshot = false;
    } else {
      console.log(`[facilitatorInboxService] Real-time update: ${messages.length} messages`);
    }

    callback(messages);
  }, (error) => {
    console.error('[facilitatorInboxService] Error subscribing to conversation:', error);
    console.error('[facilitatorInboxService] Error code:', error.code);
    if (error.code === 'failed-precondition') {
      console.error(`[facilitatorInboxService] MISSING INDEX: Create single-field index for ${collectionName}.participants (Array)`);
    }
    // DON'T clear messages on error - keep showing cached data
    console.log('[facilitatorInboxService] Keeping previous messages due to error');
  });
}

/**
 * Send a direct message from facilitator to user
 */
export async function sendDirectMessage(
  senderId: string,
  senderName: string,
  senderAvatar: string,
  receiverId: string,
  receiverName: string,
  content: string,
  context: 'inbox' | 'shangazi' = 'inbox'
): Promise<DirectMessage | null> {
  console.log(`[facilitatorInboxService] Sending ${context} message from ${senderName} to ${receiverName}`);

  const collectionName = context === 'shangazi' ? SHANGAZI_COLLECTION : INBOX_COLLECTION;

  try {
    // Create conversation ID for easier querying (sorted user IDs)
    const conversationId = [senderId, receiverId].sort().join('_');
    // Participants array for array-contains queries
    const participants = [senderId, receiverId];

    const docRef = await addDoc(collection(db, collectionName), {
      senderId,
      senderName,
      senderAvatar,
      receiverId,
      receiverName,
      content,
      conversationId, // For simple conversation queries
      participants,   // For array-contains queries
      timestamp: serverTimestamp(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    });

    console.log('[facilitatorInboxService] Message sent successfully:', docRef.id);

    return {
      id: docRef.id,
      senderId,
      senderName,
      senderAvatar,
      receiverId,
      receiverName,
      content,
      timestamp: new Date().toISOString(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };
  } catch (error: any) {
    console.error('[facilitatorInboxService] Error sending message:', error);
    return null;
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  messageIds: string[],
  context: 'inbox' | 'shangazi' = 'inbox'
): Promise<boolean> {
  console.log(`[facilitatorInboxService] Marking ${messageIds.length} ${context} messages as read`);

  const collectionName = context === 'shangazi' ? SHANGAZI_COLLECTION : INBOX_COLLECTION;

  try {
    const promises = messageIds.map(id =>
      updateDoc(doc(db, collectionName, id), { isRead: true })
    );
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('[facilitatorInboxService] Error marking messages as read:', error);
    return false;
  }
}

/**
 * Delete a direct message
 */
export async function deleteDirectMessage(
  messageId: string,
  context: 'inbox' | 'shangazi' = 'inbox'
): Promise<boolean> {
  console.log(`[facilitatorInboxService] Deleting ${context} message:`, messageId);

  const collectionName = context === 'shangazi' ? SHANGAZI_COLLECTION : INBOX_COLLECTION;

  try {
    await updateDoc(doc(db, collectionName, messageId), { isDeleted: true });
    return true;
  } catch (error) {
    console.error('[facilitatorInboxService] Error deleting message:', error);
    return false;
  }
}
