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
  limit,
  serverTimestamp,
  type QuerySnapshot,
  type DocumentData 
} from 'firebase/firestore';
import { app } from './firebaseConfig';
import { queryRMAdminAI } from './ubuzimaAIService';
import { notify, NotificationTemplates } from './notificationService';
import type { ChatMessage, ChatRoom, ChatParticipant, Language } from '../types';

const db = getFirestore(app);

console.log('[chatService] Firestore initialized, app:', app?.name || 'default');

// GLOBAL CHAT CONFIGURATION
// Messages are stored at: chat_settings/global/messages (subcollection)
const GLOBAL_CHAT_PATH = {
  collection: 'chat_settings',
  document: 'global',
  subcollection: 'messages'
};

// Legacy collection names (kept for backwards compatibility)
const COLLECTIONS = {
  chatMessages: 'chat_messages',
  chatRooms: 'chat_rooms',
  chatParticipants: 'chat_participants'
};

/**
 * Get reference to global messages collection
 * Path: chat_settings/global/messages
 */
const getGlobalMessagesRef = () => {
  const path = `${GLOBAL_CHAT_PATH.collection}/${GLOBAL_CHAT_PATH.document}/${GLOBAL_CHAT_PATH.subcollection}`;
  console.log('[chatService] Using collection path:', path);
  return collection(db, GLOBAL_CHAT_PATH.collection, GLOBAL_CHAT_PATH.document, GLOBAL_CHAT_PATH.subcollection);
};

/**
 * Subscribe to GLOBAL chat messages in real-time
 * Uses onSnapshot for live updates across all users
 */
export function subscribeToGlobalMessages(
  callback: (messages: ChatMessage[]) => void
): () => void {
  console.log('[chatService] 🔌 Attaching global messages listener...');
  console.log('[chatService] Path: chat_settings/global/messages');
  
  const messagesRef = getGlobalMessagesRef();
  
  const q = query(
    messagesRef,
    orderBy('timestamp', 'asc'),
    limit(500)
  );

  // Track last processed message ID to avoid duplicate notifications
  let lastProcessedMessageId = '';
  let initialLoad = true;

  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || '',
        userName: data.userName || '',
        userAvatar: data.userAvatar || '',
        content: data.content || '',
        timestamp: data.timestamp?.toDate?.() 
          ? data.timestamp.toDate().toISOString() 
          : new Date().toISOString(),
        isDeleted: data.isDeleted || false,
        type: data.type || 'text',
        isAI: data.isAI || false,
        aiType: data.aiType || null,
        isFacilitator: data.isFacilitator || false,
        facilitatorBadge: data.facilitatorBadge || null,
      } as ChatMessage;
    });
    
    console.log(`[chatService] 📨 Received ${messages.length} messages from global chat`);
    if (messages.length > 0) {
      console.log('[chatService] Message IDs:', messages.map(m => m.id).join(', '));
    }

    // Notify on new messages (not on initial load and not for deleted messages)
    if (!initialLoad) {
      const currentUserId = typeof window !== 'undefined' ? 
        (localStorage.getItem('rm_ubuzima_session') ? 
          JSON.parse(localStorage.getItem('rm_ubuzima_session') || '{}').user?.id : null) : null;

      const newMessages = messages.filter(m => 
        m.id !== lastProcessedMessageId && 
        !m.isDeleted && 
        m.userId !== currentUserId &&
        !m.isAI // Don't notify for AI messages
      );

      // Send notification for the most recent new message
      const latestMessage = newMessages[newMessages.length - 1];
      if (latestMessage) {
        lastProcessedMessageId = latestMessage.id;
        
        // Only notify if not currently on chat page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/chat')) {
          notify(NotificationTemplates.newMessage(
            latestMessage.userName || 'Someone',
            latestMessage.content,
            '/chat'
          ));
        }
      }
    }
    initialLoad = false;
    if (messages.length > 0) {
      lastProcessedMessageId = messages[messages.length - 1].id;
    }

    callback(messages);
  }, (error) => {
    console.error('[chatService] ❌ Error in global messages listener:', error);
    console.error('[chatService] Error code:', error.code);
    console.error('[chatService] Error message:', error.message);
    callback([]);
  });

  console.log('[chatService] ✅ Listener attached, unsubscribe function ready');
  
  // Return cleanup function
  return () => {
    console.log('[chatService] 🔌 Detaching global messages listener');
    unsubscribe();
  };
}

/**
 * Send message to GLOBAL chat
 * Writes to: chat_settings/global/messages
 */
export async function sendMessageToGlobalChat(
  messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'isDeleted'>
): Promise<ChatMessage | null> {
  console.log('[chatService] ⏳ Sending message to global chat...');
  console.log('[chatService] User:', messageData.userName, `(${messageData.userId})`);
  console.log('[chatService] Content length:', messageData.content?.length || 0);
  
  try {
    const messagesRef = getGlobalMessagesRef();
    
    const docData = {
      userId: messageData.userId,
      userName: messageData.userName,
      userAvatar: messageData.userAvatar || '',
      content: messageData.content,
      type: messageData.type || 'text',
      isDeleted: false,
      isAI: messageData.isAI || false,
      aiType: messageData.aiType || null,
      isFacilitator: messageData.isFacilitator || false,
      facilitatorBadge: messageData.facilitatorBadge || null,
      timestamp: serverTimestamp()
    };
    
    console.log('[chatService] Writing document to Firestore...');
    const docRef = await addDoc(messagesRef, docData);
    
    console.log('[chatService] ✅ Message sent successfully!');
    console.log('[chatService] Document ID:', docRef.id);
    console.log('[chatService] Full path:', docRef.path);
    
    const newMessage: ChatMessage = {
      ...messageData,
      id: docRef.id,
      timestamp: new Date().toISOString(),
      isDeleted: false,
    };
    
    return newMessage;
  } catch (error: any) {
    console.error('[chatService] ❌ FAILED to send message');
    console.error('[chatService] Error code:', error.code);
    console.error('[chatService] Error message:', error.message);
    console.error('[chatService] Full error:', error);
    
    if (error.code === 'permission-denied') {
      console.error('[chatService] 🔒 Permission denied - check Firestore rules');
    } else if (error.code === 'not-found') {
      console.error('[chatService] 📁 Collection not found - path may be incorrect');
    } else if (error.code === 'unauthenticated') {
      console.error('[chatService] 🔑 User not authenticated');
    }
    
    return null;
  }
}

/**
 * Get global messages (one-time fetch)
 * Use this for initial load if needed, but prefer onSnapshot for real-time
 */
export async function getGlobalMessages(): Promise<ChatMessage[]> {
  console.log('[chatService] 📥 Fetching global messages (one-time)...');
  
  try {
    const messagesRef = getGlobalMessagesRef();
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(500));
    
    const snapshot = await getDocs(q);
    
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || '',
        userName: data.userName || '',
        userAvatar: data.userAvatar || '',
        content: data.content || '',
        timestamp: data.timestamp?.toDate?.() 
          ? data.timestamp.toDate().toISOString() 
          : new Date().toISOString(),
        isDeleted: data.isDeleted || false,
        type: data.type || 'text',
        isAI: data.isAI || false,
        aiType: data.aiType || null,
        isFacilitator: data.isFacilitator || false,
        facilitatorBadge: data.facilitatorBadge || null,
      } as ChatMessage;
    });
    
    console.log(`[chatService] ✅ Fetched ${messages.length} messages`);
    return messages;
  } catch (error: any) {
    console.error('[chatService] ❌ Error fetching messages:', error);
    console.error('[chatService] Error code:', error.code);
    console.error('[chatService] Error message:', error.message);
    return [];
  }
}

/**
 * Delete a message from global chat (soft delete)
 */
export async function deleteGlobalMessage(messageId: string): Promise<boolean> {
  console.log('[chatService] 🗑️ Deleting message:', messageId);
  
  try {
    const messageRef = doc(
      db, 
      GLOBAL_CHAT_PATH.collection, 
      GLOBAL_CHAT_PATH.document, 
      GLOBAL_CHAT_PATH.subcollection, 
      messageId
    );
    
    await updateDoc(messageRef, {
      isDeleted: true,
      deletedAt: serverTimestamp()
    });
    
    console.log('[chatService] ✅ Message soft-deleted:', messageId);
    return true;
  } catch (error: any) {
    console.error('[chatService] ❌ Error deleting message:', error);
    console.error('[chatService] Error code:', error.code);
    console.error('[chatService] Error message:', error.message);
    return false;
  }
}

// Legacy function - kept for backwards compatibility, redirects to global chat
export function subscribeToChatMessages(
  callback: (messages: ChatMessage[]) => void
): () => void {
  console.log('[ChatService] Using legacy subscribeToChatMessages - redirecting to global chat');
  return subscribeToGlobalMessages(callback);
}

// Legacy function - kept for backwards compatibility
export async function sendChatMessage(
  message: Omit<ChatMessage, 'id' | 'timestamp' | 'isDeleted'>
): Promise<ChatMessage | null> {
  console.log('[ChatService] Using legacy sendChatMessage - redirecting to global chat');
  return sendMessageToGlobalChat(message);
}

// Legacy function - kept for backwards compatibility
export async function deleteChatMessage(messageId: string): Promise<boolean> {
  console.log('[ChatService] Using legacy deleteChatMessage - redirecting to global chat');
  return deleteGlobalMessage(messageId);
}

/**
 * Subscribe to chat rooms
 */
export function subscribeToChatRooms(
  callback: (rooms: ChatRoom[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTIONS.chatRooms),
    where('isActive', '==', true)
  );

  return onSnapshot(q, (snapshot) => {
    const rooms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ChatRoom[];
    
    callback(rooms);
  });
}

/**
 * Subscribe to chat participants
 */
export function subscribeToChatParticipants(
  callback: (participants: ChatParticipant[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTIONS.chatParticipants),
    where('isOnline', '==', true)
  );

  return onSnapshot(q, (snapshot) => {
    const participants: ChatParticipant[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        userId: data.userId || '',
        userName: data.userName || '',
        userAvatar: data.userAvatar || '',
        joinedAt: data.joinedAt?.toDate?.().toISOString() || new Date().toISOString(),
        isOnline: data.isOnline || false,
        lastSeen: data.lastSeen?.toDate?.().toISOString(),
      };
    });
    
    callback(participants);
  });
}

/**
 * Join a chat room
 */
export async function joinChatRoom(
  userId: string,
  userName: string,
  userAvatar: string
): Promise<boolean> {
  try {
    await addDoc(collection(db, COLLECTIONS.chatParticipants), {
      userId,
      userName,
      userAvatar,
      joinedAt: serverTimestamp(),
      isOnline: true,
      lastSeen: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('[ChatService] Error joining room:', error);
    return false;
  }
}

/**
 * Leave a chat room
 */
export async function leaveChatRoom(userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTIONS.chatParticipants),
      where('userId', '==', userId)
    );
    
    // Note: In production, you'd want to update the specific document
    // This is a simplified version
    return true;
  } catch (error) {
    console.error('[ChatService] Error leaving room:', error);
    return false;
  }
}

// ==========================================
// AI AUTO-RESPONSE FOR @RM Admin MENTIONS
// ==========================================

// Track processed message IDs to avoid duplicate responses
const processedMessageIds = new Set<string>();

// AI User Configuration
const AI_USER_CONFIG = {
  userId: 'ubuzima-admin-ai',
  userName: 'RM Admin',
  userAvatar: '/avatars/ai-admin.png',
  isAI: true,
  aiType: 'ubuzima-admin' as const,
};

/**
 * Check if message contains @RM Admin mention
 * STRICT: Only returns true if explicitly mentioned with @RM Admin or variations
 */
export function containsRMAdminMention(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  
  const trimmedContent = content.trim();
  if (!trimmedContent) return false;
  
  // STRICT patterns - must start with @ and have the exact name
  const mentionPatterns = [
    /@RM\s+Admin/i,      // @RM Admin (with space)
    /@RMAdmin/i,         // @RMAdmin (no space)
    /@rm\s+admin/i,      // @rm admin (lowercase with space)
    /@rmadmin/i,         // @rmadmin (lowercase no space)
    /@ubuzima-admin/i,   // @ubuzima-admin
    /@RM_Admin/i,        // @RM_Admin (underscore)
    /@rm_admin/i,        // @rm_admin (underscore lowercase)
  ];
  
  const hasMention = mentionPatterns.some(pattern => pattern.test(trimmedContent));
  
  if (hasMention) {
    console.log('[chatService] ✅ Detected @RM Admin mention in:', trimmedContent.substring(0, 100));
  }
  
  return hasMention;
}

/**
 * Extract the question/query from the mention
 * e.g., "@RM Admin how do I book a doctor?" -> "how do I book a doctor?"
 */
export function extractQueryFromMention(content: string): string {
  if (!content || typeof content !== 'string') {
    return 'Hello! How can I help you navigate the app today?';
  }
  
  // Remove all mention patterns (must match containsRMAdminMention patterns)
  let query = content
    .replace(/@RM\s+Admin/i, '')      // @RM Admin (with space)
    .replace(/@RMAdmin/i, '')        // @RMAdmin (no space)
    .replace(/@rm\s+admin/i, '')     // @rm admin (lowercase with space)
    .replace(/@rmadmin/i, '')         // @rmadmin (lowercase no space)
    .replace(/@ubuzima-admin/i, '')  // @ubuzima-admin
    .replace(/@RM_Admin/i, '')       // @RM_Admin (underscore)
    .replace(/@rm_admin/i, '')       // @rm_admin (underscore lowercase)
    .trim();
  
  // If empty after removing mention, return a default greeting
  if (!query) {
    return 'Hello! How can I help you navigate the app today?';
  }
  
  return query;
}

/**
 * Send AI response to global chat
 */
export async function sendAIResponseToGlobalChat(
  aiContent: string,
  replyToMessageId?: string
): Promise<ChatMessage | null> {
  console.log('[chatService] 🤖 Sending AI response to global chat...');
  
  try {
    const messagesRef = getGlobalMessagesRef();
    
    const docData = {
      userId: AI_USER_CONFIG.userId,
      userName: AI_USER_CONFIG.userName,
      userAvatar: AI_USER_CONFIG.userAvatar,
      content: aiContent,
      type: 'text',
      isDeleted: false,
      isAI: true,
      aiType: AI_USER_CONFIG.aiType,
      isFacilitator: false,
      facilitatorBadge: null,
      replyTo: replyToMessageId || null,
      timestamp: serverTimestamp()
    };
    
    const docRef = await addDoc(messagesRef, docData);
    
    console.log('[chatService] ✅ AI response sent! ID:', docRef.id);
    
    return {
      id: docRef.id,
      userId: AI_USER_CONFIG.userId,
      userName: AI_USER_CONFIG.userName,
      userAvatar: AI_USER_CONFIG.userAvatar,
      content: aiContent,
      type: 'text',
      timestamp: new Date().toISOString(),
      isDeleted: false,
      isAI: true,
      aiType: AI_USER_CONFIG.aiType,
      isFacilitator: false,
      facilitatorBadge: undefined,
    } as ChatMessage;
  } catch (error) {
    console.error('[chatService] ❌ Failed to send AI response:', error);
    return null;
  }
}

/**
 * Process a message for AI mentions and auto-respond
 * Call this when new messages arrive in the chat
 */
export async function processMessageForAIMention(
  message: ChatMessage,
  language: Language = 'en'
): Promise<void> {
  // STRICT CHECK 1: Skip if message is from AI itself (prevent infinite loops)
  if (message.isAI || message.userId === AI_USER_CONFIG.userId) {
    return;
  }
  
  // STRICT CHECK 2: Skip if already processed
  if (processedMessageIds.has(message.id)) {
    return;
  }
  
  // Mark as processed immediately to prevent duplicate processing
  processedMessageIds.add(message.id);
  
  // STRICT CHECK 3: Must have valid content
  if (!message.content || typeof message.content !== 'string') {
    console.log('[chatService] ⏭️ Skipping AI response: message has no content');
    return;
  }
  
  // STRICT CHECK 4: MUST contain @RM Admin mention - NO EXCEPTIONS
  const hasMention = containsRMAdminMention(message.content);
  if (!hasMention) {
    console.log('[chatService] ⏭️ AI will NOT respond - no @RM Admin mention found in:', message.content.substring(0, 50));
    return;
  }
  
  console.log('[chatService] 🎯 Detected @RM Admin mention in message:', message.id);
  
  // Extract the query
  const userQuery = extractQueryFromMention(message.content);
  
  console.log('[chatService] 📝 Extracted query:', userQuery);
  
  try {
    // Query the AI
    const aiResponse = await queryRMAdminAI(userQuery, language);
    
    if (aiResponse.success && aiResponse.content) {
      // Send AI response to chat
      await sendAIResponseToGlobalChat(aiResponse.content, message.id);
      console.log('[chatService] ✅ AI auto-response sent successfully');
    } else {
      console.error('[chatService] ⚠️ AI failed to generate response:', aiResponse.error);
      // Send a fallback response
      const fallbackResponse = getFallbackResponse(language);
      await sendAIResponseToGlobalChat(fallbackResponse, message.id);
    }
  } catch (error) {
    console.error('[chatService] ❌ Error processing AI mention:', error);
    // Send error fallback
    const fallbackResponse = getFallbackResponse(language);
    await sendAIResponseToGlobalChat(fallbackResponse, message.id);
  }
}

/**
 * Get fallback response when AI is unavailable
 */
function getFallbackResponse(language: Language): string {
  const fallbacks: Record<Language, string> = {
    en: "👋 Hi! I'm RM Admin AI. I'm here to help you navigate the app!\n\nI can help you find:\n• SRHR Info section for health education\n• Book SRHR Healthcare Provider for online consultations\n• Services to find nearby facilities\n• Emergency section for urgent help\n•  Community chat to connect with others\n\nJust let me know what you're looking for!",
    rw: "👋 Muraho! Ndi RM Admin AI. Ndi hano kugufasha gushaka serivisi mu porogaramu!\n\nNshobora kugufasha kubona:\n• Amakuru ya SRHR\n• Gusaba Umuganga wa SRHR\n• Serivisi z'aho uri\n• Ibiza (Emergency)\n• Chat y'abanyamuryango\n\nUmbwize icyo ushaka!",
    fr: "👋 Bonjour! Je suis RM Admin AI. Je suis là pour vous aider à naviguer dans l'application!\n\nJe peux vous aider à trouver:\n• Section Info SSRA pour l'éducation santé\n• Prendre RDV SSRA\n• Services près de chez vous\n• Section Urgence\n• Chat communautaire\n\nDites-moi ce que vous cherchez!",
    sw: "👋 Habari! Mimi ni RM Admin AI. Nipo kusaidia kuzunguka programu!\n\nNaweza kusaidia kupata:\n• Sehemu ya SRHR Info\n• Weka Miadi ya SRHR\n• Huduma za karibu\n• Sehemu ya Dharura\n• Chat ya jamii\n\nNionyeshe unachotafuta!"
  };
  
  return fallbacks[language] || fallbacks.en;
}

/**
 * Subscribe to global messages with AI auto-response
 * Use this instead of subscribeToGlobalMessages when you want AI auto-response
 */
export function subscribeToGlobalMessagesWithAI(
  callback: (messages: ChatMessage[]) => void,
  language: Language = 'en'
): () => void {
  console.log('[chatService] 🔌 Attaching global messages listener with AI auto-response...');

  const messagesRef = getGlobalMessagesRef();

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
        userId: data.userId || '',
        userName: data.userName || '',
        userAvatar: data.userAvatar || '',
        content: data.content || '',
        timestamp: data.timestamp?.toDate?.()
          ? data.timestamp.toDate().toISOString()
          : new Date().toISOString(),
        isDeleted: data.isDeleted || false,
        type: data.type || 'text',
        isAI: data.isAI || false,
        aiType: data.aiType || null,
        isFacilitator: data.isFacilitator || false,
        facilitatorBadge: data.facilitatorBadge || null,
      } as ChatMessage;
    });

    console.log(`[chatService] 📨 Received ${messages.length} messages`);

    // Only process AI mentions for NEW messages, not historical ones on initial load
    // This prevents AI from responding to old @mentions when a user enters the chat
    if (!initialLoad) {
      const newMessages = messages.filter(m => !processedMessageIds.has(m.id));
      newMessages.forEach(message => {
        // Process asynchronously - don't block the callback
        processMessageForAIMention(message, language).catch(error => {
          console.error('[chatService] ❌ Error in AI mention processing:', error);
        });
      });
    } else {
      console.log('[chatService] ⏭️ Skipping AI processing for initial load (historical messages)');
      // Mark all existing messages as processed so we don't respond to them later
      messages.forEach(m => processedMessageIds.add(m.id));
    }

    initialLoad = false;
    callback(messages);
  }, (error) => {
    console.error('[chatService] ❌ Error in messages listener:', error);
    callback([]);
  });

  return () => {
    console.log('[chatService] 🔌 Detaching listener with AI auto-response');
    unsubscribe();
  };
}
