import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEphemeralStore, usePersistentStore } from '../store';
import { 
  ArrowLeft,
  Send,
  User,
  MessageSquare,
  ChevronRight,
  Shield,
  Check,
  CheckCheck,
  Search,
  FileText,
  X,
  Info,
  Pin,
  Smile,
  Bot,
  MoreVertical,
  Trash2,
  Stethoscope,
  Heart,
  Sparkles,
  Crown,
  ArrowLeft as BackIcon,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/helpers';
import {
  subscribeToUserInbox,
  subscribeToConversation,
  sendDirectMessage,
  deleteDirectMessage
} from '../services/inboxService';
import type { Facilitator, InboxConversation, DirectMessage } from '../types';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';

// Emoji list for picker
const EMOJIS = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '🏧', '🈂️', '🛂', '🛃', '🛄', '🛅', '♿', '🚭', '🚾', '🅿️', '🈳', '🈂', '⚕️', '🛗', '🛌', '🔀', '🔁', '🔂', '▶️', '⏩', '⏭️', '⏯️', '◀️', '⏪', '⏮️', '🔼', '⏫', '🔽', '⏬', '⏸️', '⏹️', '⏺️', '⏏️', '🎦', '🔅', '🔆', '📶', '📳', '📴', '♀️', '♂️', '⚧', '✖️', '➕', '➖', '➗', '♾️', '‼️', '⁉️', '❓', '❔', '❕', '❗', '〰️', '💱', '💲', '⚕️', '♻️', '🔱', '📛', '🔰', '⭕', '✅', '☑️', '✔️', '❌', '❎', '➰', '➿', '〽️', '✳️', '✴️', '❇️', '©️', '®️', '™️', '#️⃣', '*️⃣', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔠', '🔡', '🔢', '🔣', '🔤', '🅰️', '🆎', '🅱️', '🆑', '🆒', '🆓', 'ℹ️', '🆔', 'Ⓜ️', '🆕', '🆖', '🅾️', '🆗', '🅿️', '🆘', '🆙', '🆚', '🈁', '🈂️', '🈷️', '🈶', '🈯', '🉐', '🈹', '🈚', '🈲', '🉑', '🈸', '🈴', '🈳', '㊗️', '㊙️', '🈺', '🈵', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '⬛', '⬜', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬇️', '⬆️', '⬅️', '➡️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '⚪', '⚫', '🟤', '🟣', '🔴', '🟠', '🟡', '🟢', '🔵', '🟦', '🟪', '🟥', '🟧', '🟨', '🟩', '⬜', '⬛', '◽', '◾', '🔲', '🔳', '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️\u200d🌈', '🏳️\u200d⚧️', '🏴\u200d☠️', '🇦🇨', '🇦🇩', '🇦🇪', '🇦🇫', '🇦🇬', '🇦🇮', '🇦🇱', '🇦🇲', '🇦🇴', '🇦🇶', '🇦🇷', '🇦🇸', '🇦🇹', '🇦🇺', '🇦🇼', '🇦🇽', '🇦🇿', '🇧🇦', '🇧🇧', '🇧🇩', '🇧🇪', '🇧🇫', '🇧🇬', '🇧🇭', '🇧🇮', '🇧🇯', '🇧🇱', '🇧🇲', '🇧🇳', '🇧🇴', '🇧🇶', '🇧🇷', '🇧🇸', '🇧🇹', '🇧🇻', '🇧🇼', '🇧🇾', '🇧🇿', '🇨🇦', '🇨🇨', '🇨🇩', '🇨🇫', '🇨🇬', '🇨🇭', '🇨🇮', '🇨🇰', '🇨🇱', '🇨🇲', '🇨🇳', '🇨🇴', '🇨🇵', '🇨🇷', '🇨🇺', '🇨🇻', '🇨🇼', '🇨🇽', '🇨🇾', '🇨🇿', '🇩🇪', '🇩🇬', '🇩🇯', '🇩🇰', '🇩🇲', '🇩🇴', '🇩🇿', '🇪🇦', '🇪🇨', '🇪🇪', '🇪🇬', '🇪🇭', '🇪🇷', '🇪🇸', '🇪🇹', '🇪🇺', '🇫🇮', '🇫🇯', '🇫🇰', '🇫🇲', '🇫🇴', '🇫🇷', '🇬🇦', '🇬🇧', '🇬🇩', '🇬🇪', '🇬🇫', '🇬🇬', '🇬🇭', '🇬🇮', '🇬🇱', '🇬🇲', '🇬🇳', '🇬🇵', '🇬🇶', '🇬🇷', '🇬🇸', '🇬🇹', '🇬🇺', '🇬🇼', '🇬🇾', '🇭🇰', '🇭🇲', '🇭🇳', '🇭🇷', '🇭🇹', '🇭🇺', '🇮🇨', '🇮🇩', '🇮🇪', '🇮🇱', '🇮🇲', '🇮🇳', '🇮🇴', '🇮🇶', '🇮🇷', '🇮🇸', '🇮🇹', '🇯🇪', '🇯🇲', '🇯🇴', '🇯🇵', '🇰🇪', '🇰🇬', '🇰🇭', '🇰🇮', '🇰🇲', '🇰🇳', '🇰🇵', '🇰🇷', '🇰🇼', '🇰🇾', '🇰🇿', '🇱🇦', '🇱🇧', '🇱🇨', '🇱🇮', '🇱🇰', '🇱🇷', '🇱🇸', '🇱🇹', '🇱🇺', '🇱🇻', '🇱🇾', '🇲🇦', '🇲🇨', '🇲🇩', '🇲🇪', '🇲🇫', '🇲🇬', '🇲🇭', '🇲🇰', '🇲🇱', '🇲🇲', '🇲🇳', '🇲🇴', '🇲🇵', '🇲🇶', '🇲🇷', '🇲🇸', '🇲🇹', '🇲🇺', '🇲🇻', '🇲🇼', '🇲🇽', '🇲🇾', '🇲🇿', '🇳🇦', '🇳🇨', '🇳🇪', '🇳🇫', '🇳🇬', '🇳🇮', '🇳🇱', '🇳🇴', '🇳🇵', '🇳🇷', '🇳🇺', '🇳🇿', '🇴🇲', '🇵🇦', '🇵🇪', '🇵🇫', '🇵🇬', '🇵🇭', '🇵🇰', '🇵🇱', '🇵🇲', '🇵🇳', '🇵🇷', '🇵🇸', '🇵🇹', '🇵🇼', '🇵🇾', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇸', '🇷🇺', '🇷🇼', '🇸🇦', '🇸🇧', '🇸🇨', '🇸🇩', '🇸🇪', '🇸🇬', '🇸🇭', '🇸🇮', '🇸🇯', '🇸🇰', '🇸🇱', '🇸🇲', '🇸🇳', '🇸🇴', '🇸🇷', '🇸🇸', '🇸🇹', '🇸🇻', '🇸🇽', '🇸🇾', '🇸🇿', '🇹🇦', '🇹🇨', '🇹🇩', '🇹🇫', '🇹🇬', '🇹🇭', '🇹🇯', '🇹🇰', '🇹🇱', '🇹🇲', '🇹🇳', '🇹🇴', '🇹🇷', '🇹🇹', '🇹🇻', '🇹🇼', '🇹🇿', '🇺🇦', '🇺🇬', '🇺🇲', '🇺🇳', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇦', '🇻🇨', '🇻🇪', '🇻🇬', '🇻🇮', '🇻🇳', '🇻🇺', '🇼🇫', '🇼🇸', '🇽🇰', '🇾🇪', '🇾🇹', '🇿🇦', '🇿🇲', '🇿🇼'];

// Message Bubble Component - Styled like ChatPage
interface InboxMessageBubbleProps {
  message: DirectMessage;
  isOwnMessage: boolean;
  selectedFacilitator: Facilitator;
  session: any;
  onDelete: (id: string) => void;
  formatTime: (timestamp: string) => string;
  formatFullDate: (timestamp: string) => string;
  messages: DirectMessage[];
  index: number;
}

function InboxMessageBubble({
  message,
  isOwnMessage,
  selectedFacilitator,
  session,
  onDelete,
  formatTime,
  formatFullDate,
  messages,
  index,
}: InboxMessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Close actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDate = index === 0 || 
    formatFullDate(message.timestamp) !== formatFullDate(messages[index - 1].timestamp);

  return (
    <div>
      {showDate && (
        <div className="flex items-center justify-center my-4">
          <span className="text-xs text-rm-gray-400 bg-rm-gray-100 px-3 py-1 rounded-full">
            {formatFullDate(message.timestamp)}
          </span>
        </div>
      )}
      
      <div className={cn('flex gap-3 group', isOwnMessage ? 'flex-row-reverse' : 'flex-row')}>
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center overflow-hidden',
            isOwnMessage 
              ? (session?.user?.avatar ? 'bg-transparent' : 'bg-rm-gray-200')
              : (selectedFacilitator.userAvatar ? 'bg-transparent' : 'bg-srhr')
          )}>
            {isOwnMessage ? (
              session?.user?.avatar ? (
                <img 
                  src={session.user.avatar} 
                  alt={session.user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-rm-gray-600" />
              )
            ) : (
              selectedFacilitator.userAvatar ? (
                <img 
                  src={selectedFacilitator.userAvatar} 
                  alt={selectedFacilitator.userName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <Shield className="w-5 h-5 text-white" />
              )
            )}
          </div>
          
          {/* Facilitator Badge */}
          {!isOwnMessage && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-800 rounded-full flex items-center justify-center border-2 border-white">
              <span className="text-[8px] font-bold text-white">F</span>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className={cn('flex-1 max-w-[75%]', isOwnMessage ? 'items-end' : 'items-start')}>
          {/* Header with Name */}
          <div className={cn('flex items-center gap-2 mb-1', isOwnMessage ? 'justify-end' : 'justify-start')}>
            <span className="text-sm font-medium text-rm-gray-900">
              {isOwnMessage ? (session?.user?.name || 'You') : selectedFacilitator.userName}
            </span>
            {!isOwnMessage && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                Facilitator
              </span>
            )}
            <span className="text-xs text-rm-gray-400">
              {formatTime(message.timestamp)}
            </span>
            {isOwnMessage && (
              <span className="text-xs text-rm-gray-400">
                {message.isRead ? (
                  <CheckCheck className="w-3 h-3 text-blue-500" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
              </span>
            )}
          </div>

          {/* Message Bubble Container */}
          <div className="relative">
            {/* Message Bubble */}
            <div 
              className={cn(
                'px-4 py-2 rounded-2xl cursor-pointer select-none',
                isOwnMessage 
                  ? 'bg-srhr text-white rounded-br-md' 
                  : 'bg-white border border-rm-gray-200 rounded-bl-md'
              )}
              onClick={() => isOwnMessage && setShowActions(!showActions)}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>

            {/* Actions Menu (3-dot) */}
            {isOwnMessage && showActions && (
              <div 
                ref={actionsRef}
                className={cn(
                  "absolute z-10 bg-white border border-rm-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]",
                  isOwnMessage ? "right-0 top-full mt-1" : "left-0 top-full mt-1"
                )}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(message.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}

            {/* 3-dot menu trigger for own messages */}
            {isOwnMessage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                className={cn(
                  "absolute -top-2 p-1 rounded-full bg-white border border-rm-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity",
                  isOwnMessage ? "left-0" : "right-0"
                )}
              >
                <MoreVertical className="w-3 h-3 text-rm-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, setCurrentPage, chatFullScreen, setChatFullScreen } = useEphemeralStore();
  const { chatSettings, isAdminLoggedIn } = usePersistentStore();
  
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedFacilitator, setSelectedFacilitator] = useState<Facilitator | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Phone back navigation for modals
  usePhoneBackNavigation({
    isOpen: showTerms,
    onClose: () => setShowTerms(false),
    modalId: 'inbox-terms'
  });

  usePhoneBackNavigation({
    isOpen: showEmojiPicker,
    onClose: () => setShowEmojiPicker(false),
    modalId: 'inbox-emoji-picker'
  });

  usePhoneBackNavigation({
    isOpen: showSettings,
    onClose: () => setShowSettings(false),
    modalId: 'inbox-settings'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Get facilitators from chatSettings (managed by admin)
  const facilitators = chatSettings?.facilitators || [];
  const loadingFacilitators = false;

  // Subscribe to user's inbox conversations
  useEffect(() => {
    if (!session?.user?.id) return;
    
    console.log('[InboxPage] Setting up inbox subscription');
    setCurrentPage('inbox');
    
    const unsubscribe = subscribeToUserInbox(session.user.id, (convs) => {
      console.log(`[InboxPage] Received ${convs.length} conversations`);
      setConversations(convs);
    });

    return () => {
      console.log('[InboxPage] Cleaning up inbox subscription');
      unsubscribe();
    };
  }, [session?.user?.id, setCurrentPage]);

  // Subscribe to selected conversation
  // ULTRA-OPTIMIZED: Uses simple participants query - NO composite index required
  useEffect(() => {
    if (!session?.user?.id || !selectedFacilitator || view !== 'chat') return;

    console.log(`[InboxPage] Starting conversation subscription with ${selectedFacilitator.userId}`);
    // ULTRA-FIX: Don't clear messages - let subscription populate them

    const unsubscribe = subscribeToConversation(
      session.user.id,
      selectedFacilitator.userId,
      (msgs) => {
        console.log(`[InboxPage] Received ${msgs.length} messages`);
        setMessages(msgs);
      }
    );

    return () => {
      unsubscribe();
      // Don't clear messages on unmount - prevents flickering
    };
  }, [session?.user?.id, selectedFacilitator?.userId, view]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, view]);

  // Focus input when entering chat view
  useEffect(() => {
    if (view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [view]);

  const handleStartConversation = useCallback((facilitator: Facilitator) => {
    setSelectedFacilitator(facilitator);
    setView('chat');
    // ULTRA-FIX: Don't clear messages immediately - prevents flickering
    // The subscription will populate messages when ready
  }, []);

  // OPTIMIZED: useCallback prevents re-creation on every render
  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!newMessage.trim() || !session?.user || !selectedFacilitator || isLoading) return;

    const content = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // Create optimistic message for immediate UI update
    const optimisticMessage: DirectMessage = {
      id: tempId,
      senderId: session.user.id,
      senderName: session.user.name,
      senderAvatar: session.user.avatar,
      receiverId: selectedFacilitator.userId,
      receiverName: selectedFacilitator.userName,
      content: content,
      timestamp: new Date().toISOString(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };

    // Optimistic UI - add message immediately to chat
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setIsLoading(true);
    setSendStatus('sending');
    setStatusMessage('Sending...');

    try {
      const result = await sendDirectMessage(
        session.user.id,
        session.user.name,
        session.user.avatar,
        selectedFacilitator.userId,
        selectedFacilitator.userName,
        content
      );

      if (result && result.id) {
        setSendStatus('sent');
        setStatusMessage('Message sent!');
        setTimeout(() => {
          setSendStatus('idle');
          setStatusMessage('');
        }, 2000);
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setNewMessage(content);
        setSendStatus('error');
        setStatusMessage('Failed to send. Please try again.');
      }
    } catch (error: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
      setSendStatus('error');
      setStatusMessage(error?.message || 'Error sending message. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [newMessage, session?.user, selectedFacilitator, isLoading]);

  // OPTIMIZED: Memoized time formatter
  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  // VIRTUAL SCROLLING: Only render visible messages for performance
  // Only apply virtualization when there are many messages (> 50)
  const VIRTUALIZATION_THRESHOLD = 50;
  const OVERSCAN = 5; // Extra messages to render above/below viewport
  const MESSAGE_HEIGHT_ESTIMATE = 80; // Estimated px height per message

  const visibleMessages = useMemo(() => {
    if (messages.length <= VIRTUALIZATION_THRESHOLD) return messages;

    // For large message lists, show last 30 messages by default
    // User can scroll to load more (simplified approach for mobile)
    return messages.slice(-30);
  }, [messages]);

  const formatFullDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
    
    if (isToday) return t('chat.today');
    if (isYesterday) return t('chat.yesterday');
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm(t('chat.confirmDelete'))) return;
    
    try {
      const success = await deleteDirectMessage(messageId);
      if (success) {
        console.log('[InboxPage] ✅ Message deleted:', messageId);
      } else {
        console.error('[InboxPage] ❌ Failed to delete message');
      }
    } catch (err) {
      console.error('[InboxPage] ❌ Error deleting message:', err);
    }
  };

  // Filter facilitators by search
  const filteredFacilitators = facilitators.filter(f => 
    f.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'chat' && selectedFacilitator) {
    return (
      <div className={cn(
        "min-h-screen bg-rm-gray-50 flex flex-col",
        chatFullScreen && "fixed inset-0 z-50"
      )}>
        {/* Header - ChatPage Style */}
        <div className="bg-white border-b border-rm-gray-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView('list')}
                  className="p-2 text-rm-gray-600 hover:bg-rm-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-srhr rounded-full flex items-center justify-center">
                  {selectedFacilitator.userAvatar ? (
                    <img 
                      src={selectedFacilitator.userAvatar} 
                      alt={selectedFacilitator.userName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <Shield className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="font-semibold text-rm-gray-900">{selectedFacilitator.userName}</h1>
                  <p className="text-xs text-rm-gray-500">
                    {loading ? 'Loading...' : `${messages.length} ${t('chat.messages')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Terms Button */}
                <button
                  onClick={() => setShowTerms(true)}
                  className="flex items-center gap-2 p-2 text-rm-gray-500 hover:bg-rm-gray-100 rounded-lg transition-colors"
                  title={t('chat.terms')}
                >
                  <FileText className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Terms Modal - ChatPage Style */}
        {showTerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-rm-gray-200">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-srhr" />
                  <h2 className="text-lg font-semibold text-rm-gray-900">{t('chat.termsTitle') || 'Terms & Conditions'}</h2>
                </div>
                <button
                  onClick={() => setShowTerms(false)}
                  className="p-2 hover:bg-rm-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-rm-gray-500" />
                </button>
              </div>
              <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
                <div className="prose prose-sm text-rm-gray-600">
                  <p className="font-medium text-rm-gray-900 mb-3">{t('chat.welcomeToChat') || 'Welcome to Private Chat'}</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-srhr mt-0.5 flex-shrink-0" />
                      <span>Your messages are private and confidential</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-srhr mt-0.5 flex-shrink-0" />
                      <span>Only you and the facilitator can view this conversation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-srhr mt-0.5 flex-shrink-0" />
                      <span>Be respectful and courteous in all communications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-srhr mt-0.5 flex-shrink-0" />
                      <span>Facilitators will respond as soon as possible</span>
                    </li>
                  </ul>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <Shield className="w-3 h-3 inline mr-1" />
                      This is a private conversation with a certified facilitator.
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-rm-gray-200 bg-rm-gray-50">
                <button
                  onClick={() => setShowTerms(false)}
                  className="w-full py-2 bg-srhr text-white rounded-xl font-medium hover:bg-srhr-dark transition-colors"
                >
                  {t('chat.understand') || 'I Understand'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pinned Description Banner - ChatPage Style */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="max-w-3xl mx-auto px-4 py-2">
            <div className="flex items-start gap-2">
              <Pin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-800">
                  Private conversation with {selectedFacilitator.userName}. Facilitators provide guidance and support for your reproductive health journey.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area - ChatPage Style */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
            {/* Loading State */}
            {loading && messages.length === 0 && (
              <div className="text-center py-12">
                <div className="animate-pulse">
                  <MessageSquare className="w-16 h-16 text-rm-gray-200 mx-auto mb-4" />
                  <p className="text-rm-gray-400">{t('chat.loading') || 'Loading messages...'}</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && messages.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-rm-gray-300 mx-auto mb-4" />
                <p className="text-rm-gray-500">{t('inbox.startConversation') || 'Start a conversation'}</p>
                <p className="text-sm text-rm-gray-400 mt-2">{t('inbox.messagesEncrypted') || 'Your messages are private and confidential'}</p>
              </div>
            )}

            {/* Messages List - Using MessageBubble style with virtualization */}
            {visibleMessages.map((msg: DirectMessage) => (
              <InboxMessageBubble
                key={msg.id}
                message={msg}
                isOwnMessage={msg.senderId === session?.user?.id}
                selectedFacilitator={selectedFacilitator}
                session={session}
                onDelete={handleDeleteMessage}
                formatTime={formatTime}
                formatFullDate={formatFullDate}
                messages={messages}
                index={messages.indexOf(msg)}
              />
            ))}
            {/* Show indicator if messages are virtualized */}
            {messages.length > VIRTUALIZATION_THRESHOLD && (
              <div className="text-center py-2 text-xs text-gray-400">
                Showing last {visibleMessages.length} of {messages.length} messages
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - WhatsApp Style like ChatPage */}
        <div className={cn(
          "bg-[#f0f2f5] border-t border-gray-200 z-10",
          chatFullScreen ? "sticky bottom-0" : "sticky bottom-[72px] safe-area-bottom"
        )}>
          <div className="max-w-3xl mx-auto px-3 py-2 relative">
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-rm-gray-200 rounded-xl shadow-lg z-20">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-rm-gray-500">Select Emoji</p>
                    <button
                      onClick={() => setShowEmojiPicker(false)}
                      className="p-1 hover:bg-rm-gray-100 rounded"
                    >
                      <X className="w-4 h-4 text-rm-gray-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                    {EMOJIS.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => handleEmojiSelect(emoji)}
                        className="p-2 hover:bg-rm-gray-100 rounded text-xl transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 sm:gap-2">
              {/* Emoji Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 sm:p-2 text-rm-gray-500 hover:text-rm-gray-700 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                disabled={!session?.user}
              >
                <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Input Field - WhatsApp Style */}
              <div className="flex-1 min-w-0 bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm border border-gray-200">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={session?.user ? "Type a message" : 'Log in to send messages'}
                  className="w-full min-w-0 bg-transparent outline-none text-rm-gray-900 placeholder:text-rm-gray-400 text-xs sm:text-sm"
                  disabled={isLoading || !session?.user}
                />
              </div>

              {/* Send Button - ALWAYS VISIBLE on mobile */}
              <button
                type="submit"
                disabled={!newMessage.trim() || isLoading || !session?.user}
                className={cn(
                  'p-2 sm:p-2.5 rounded-full transition-colors flex-shrink-0 shadow-sm',
                  newMessage.trim() && !isLoading && session?.user
                    ? 'bg-srhr text-white hover:bg-srhr-dark'
                    : 'bg-gray-300 text-gray-500'
                )}
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              </button>
            </form>

            {/* Status Message */}
            {statusMessage && (
              <div className={cn(
                'mt-2 text-center text-sm font-medium',
                sendStatus === 'sending' && 'text-blue-600',
                sendStatus === 'sent' && 'text-green-600',
                sendStatus === 'error' && 'text-red-600'
              )}>
                {sendStatus === 'sending' && (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    {statusMessage}
                  </span>
                )}
                {sendStatus === 'sent' && (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {statusMessage}
                  </span>
                )}
                {sendStatus === 'error' && statusMessage}
              </div>
            )}
          </div>
        </div>

      </div>
    );
  }

  // Conversation List View
  return (
    <div className="min-h-screen bg-rm-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-rm-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Back to Chat Button */}
              <Link
                to="/chat"
                className="flex items-center gap-2 px-3 py-2 text-rm-gray-600 hover:bg-rm-gray-100 rounded-lg transition-colors"
              >
                <BackIcon className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">Back to Chat</span>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-rm-gray-900">{t('inbox.selectFacilitator') || 'Select a Facilitator'}</h1>
                <p className="text-sm text-rm-gray-500">{t('inbox.chooseToChat') || 'Choose someone to start a private conversation'}</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-srhr rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
        {/* Facilitators List */}
        <div>
          <h2 className="text-sm font-medium text-rm-gray-700 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-srhr" />
            {t('inbox.contactFacilitator') || 'Contact a Facilitator'}
          </h2>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rm-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('inbox.searchFacilitators') || 'Search facilitators...'}
              className="w-full pl-10 pr-4 py-3 bg-white border border-rm-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-srhr"
            />
          </div>
          
          {loadingFacilitators ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-srhr border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-rm-gray-400 mt-2">Loading facilitators...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFacilitators.length === 0 && searchQuery && (
                <p className="text-sm text-rm-gray-400 text-center py-4">
                  {t('inbox.noFacilitatorsFound') || 'No facilitators found'}
                </p>
              )}
              
              {filteredFacilitators.length === 0 && !searchQuery && (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-rm-gray-200 mx-auto mb-4" />
                  <p className="text-rm-gray-500">{t('inbox.noFacilitators') || 'No facilitators available'}</p>
                  <p className="text-sm text-rm-gray-400 mt-1">Check back later</p>
                </div>
              )}
              
              {filteredFacilitators.map(facilitator => (
                <button
                  key={facilitator.userId}
                  onClick={() => handleStartConversation(facilitator)}
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-rm-gray-200 hover:border-srhr hover:shadow-md transition-all text-left"
                >
                  {/* Avatar with Facilitator Badge */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden">
                      {facilitator.userAvatar ? (
                        <img 
                          src={facilitator.userAvatar} 
                          alt={facilitator.userName}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <Shield className="w-7 h-7 text-white" />
                      )}
                    </div>
                    {/* Facilitator Badge - Dark Green "F" */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-800 rounded-full flex items-center justify-center border-2 border-white">
                      <span className="text-[10px] font-bold text-white">F</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-rm-gray-900 truncate">{facilitator.userName}</h3>
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[10px] rounded font-medium">
                        F
                      </span>
                    </div>
                    <p className="text-sm text-srhr">{facilitator.role || t('inbox.facilitator') || 'Facilitator'}</p>
                    {facilitator.bio && (
                      <p className="text-sm text-rm-gray-400 truncate mt-1">{facilitator.bio}</p>
                    )}
                  </div>
                  
                  <ChevronRight className="w-6 h-6 text-rm-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
