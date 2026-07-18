import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  subscribeToGlobalMessages, 
  sendMessageToGlobalChat, 
  getGlobalMessages 
} from '../services/chatService';
import { usePersistentStore } from '../store';
import type { ChatMessage, ChatUser } from '../types';

interface UseGlobalChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<boolean>;
  retry: () => void;
}

/**
 * Custom hook for managing global chat state
 * Features:
 * - Real-time message updates via onSnapshot
 * - Optimistic UI updates
 * - Loading and error states
 * - Automatic cleanup on unmount
 */
export function useGlobalChat(currentUser: ChatUser | null): UseGlobalChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track optimistic message IDs for rollback
  const pendingMessages = useRef<Set<string>>(new Set());

  // Initial fetch and real-time subscription
  useEffect(() => {
    console.log('[useGlobalChat] 🚀 Initializing chat hook');
    console.log('[useGlobalChat] Current user:', currentUser?.name || 'not logged in');
    
    setLoading(true);
    setError(null);

    // First, do a one-time fetch for immediate data
    getGlobalMessages()
      .then((initialMessages) => {
        console.log(`[useGlobalChat] 📥 Initial fetch: ${initialMessages.length} messages`);
        setMessages(initialMessages);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[useGlobalChat] ❌ Initial fetch failed:', err);
        setError('Failed to load messages');
        setLoading(false);
      });

    // Set up real-time listener
    console.log('[useGlobalChat] 🔌 Setting up onSnapshot listener...');
    const startTime = Date.now();
    
    const unsubscribe = subscribeToGlobalMessages((newMessages) => {
      const elapsed = Date.now() - startTime;
      console.log(`[useGlobalChat] 📨 onSnapshot fired after ${elapsed}ms, ${newMessages.length} messages`);
      
      setMessages((prevMessages) => {
        // Check if we need to filter out any pending optimistic messages
        // that haven't been confirmed by Firebase yet
        const confirmedIds = new Set(newMessages.map(m => m.id));
        
        // Remove any pending messages that are now confirmed (they have real IDs)
        // Or keep them if they're still pending
        const stillPending = new Set<string>();
        pendingMessages.current.forEach(id => {
          if (!confirmedIds.has(id)) {
            stillPending.add(id);
          }
        });
        pendingMessages.current = stillPending;
        
        return newMessages;
      });
      
      setLoading(false);
    });

    // Cleanup function
    return () => {
      console.log('[useGlobalChat] 🧹 Cleaning up chat hook, unsubscribing from listener');
      unsubscribe();
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Send message function with optimistic UI
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!currentUser) {
      console.error('[useGlobalChat] ❌ Cannot send message: no current user');
      return false;
    }

    if (!content.trim()) {
      console.warn('[useGlobalChat] ⚠️ Cannot send empty message');
      return false;
    }

    console.log('[useGlobalChat] ⏳ Sending message:', content.substring(0, 50));
    setSending(true);

    // Check if user is facilitator
    const { isUserFacilitator, getFacilitator } = usePersistentStore.getState();
    const isFacilitator = isUserFacilitator(currentUser.id);
    const facilitator = isFacilitator ? getFacilitator(currentUser.id) : null;

    // Create optimistic message
    const optimisticId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isDeleted: false,
      type: 'text',
      isFacilitator: isFacilitator,
      facilitatorBadge: facilitator ? 'Facilitator' : undefined,
    };

    // Add to pending set
    pendingMessages.current.add(optimisticId);

    // Optimistic update - add to UI immediately
    console.log('[useGlobalChat] ✨ Optimistic update: adding message to UI');
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // Send to Firebase
      const result = await sendMessageToGlobalChat({
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        content: content.trim(),
        type: 'text',
        isFacilitator: isFacilitator,
        facilitatorBadge: facilitator ? 'Facilitator' : undefined,
      });

      if (result) {
        console.log('[useGlobalChat] ✅ Message confirmed by Firebase:', result.id);
        // Remove optimistic message - the real one will come via onSnapshot
        pendingMessages.current.delete(optimisticId);
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        setSending(false);
        return true;
      } else {
        throw new Error('Firebase returned null');
      }
    } catch (err: any) {
      console.error('[useGlobalChat] ❌ Failed to send message:', err);
      
      // Rollback optimistic update
      console.log('[useGlobalChat] 🔄 Rolling back optimistic update');
      pendingMessages.current.delete(optimisticId);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      
      setError('Failed to send message. Please try again.');
      setSending(false);
      return false;
    }
  }, [currentUser]);

  // Retry function
  const retry = useCallback(() => {
    console.log('[useGlobalChat] 🔄 Retrying...');
    setError(null);
    setLoading(true);
    
    getGlobalMessages()
      .then((msgs) => {
        setMessages(msgs);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[useGlobalChat] ❌ Retry failed:', err);
        setError('Failed to load messages');
        setLoading(false);
      });
  }, []);

  // Memoize messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => messages, [messages]);

  return {
    messages: memoizedMessages,
    loading,
    sending,
    error,
    sendMessage,
    retry,
  };
}
