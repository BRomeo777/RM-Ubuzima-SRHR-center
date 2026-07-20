import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEphemeralStore, usePersistentStore } from '../store';
import {
  MessageCircle,
  Inbox,
  Heart,
  ArrowLeft,
  Send,
  User,
  ChevronRight,
  MessageSquare,
  Users,
  Lock,
  Search,
  MoreVertical,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';
import type { DirectMessage, InboxConversation, Facilitator } from '../types';
import {
  subscribeToFacilitatorInbox,
  subscribeToShangaziInbox,
  subscribeToLegalInbox,
  subscribeToGBVInbox,
  subscribeToConversation,
  sendDirectMessage,
  markMessagesAsRead,
  deleteDirectMessage,
} from '../services/facilitatorInboxService';

// Types for view state
type ViewState = 'menu' | 'inbox-list' | 'shangazi-list' | 'legal-list' | 'gbv-list' | 'chat';
type ChatContext = 'inbox' | 'shangazi' | 'legal' | 'gbv';

// Extended conversation type for facilitator
interface FacilitatorConversation extends InboxConversation {
  context?: ChatContext;
}

export default function FacilitatorInboxPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, setCurrentPage } = useEphemeralStore();
  const { chatSettings, isUserBigSister, isUserLegalAdvisor, isUserGBVCounselor } = usePersistentStore();

  const currentUser = session?.user;
  const isBigSister = currentUser?.id && isUserBigSister
    ? isUserBigSister(currentUser.id)
    : false;
  const isLegalAdvisor = currentUser?.id && isUserLegalAdvisor
    ? isUserLegalAdvisor(currentUser.id)
    : false;
  const isGBVCounselor = currentUser?.id && isUserGBVCounselor
    ? isUserGBVCounselor(currentUser.id)
    : false;

  // View state
  const [viewState, setViewState] = useState<ViewState>('menu');
  const [selectedUser, setSelectedUser] = useState<FacilitatorConversation | null>(null);
  const [activeTab, setActiveTab] = useState<ChatContext>('inbox');

  // Data states
  const [inboxConversations, setInboxConversations] = useState<FacilitatorConversation[]>([]);
  const [shangaziConversations, setShangaziConversations] = useState<FacilitatorConversation[]>([]);
  const [legalConversations, setLegalConversations] = useState<FacilitatorConversation[]>([]);
  const [gbvConversations, setGbvConversations] = useState<FacilitatorConversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({ inbox: 0, shangazi: 0, legal: 0, gbv: 0 });
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Phone back navigation
  usePhoneBackNavigation({
    isOpen: viewState !== 'menu',
    onClose: () => {
      if (viewState === 'chat') {
        setViewState(
          activeTab === 'shangazi' ? 'shangazi-list' : activeTab === 'legal' ? 'legal-list' : activeTab === 'gbv' ? 'gbv-list' : 'inbox-list'
        );
        setSelectedUser(null);
      } else if (viewState === 'inbox-list' || viewState === 'shangazi-list' || viewState === 'legal-list' || viewState === 'gbv-list') {
        setViewState('menu');
      }
    },
    modalId: 'facilitator-inbox'
  });

  usePhoneBackNavigation({
    isOpen: showEmojiPicker,
    onClose: () => setShowEmojiPicker(false),
    modalId: 'emoji-picker'
  });

  // Set current page on mount
  useEffect(() => {
    setCurrentPage('inbox');
  }, [setCurrentPage]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session?.user) {
      navigate('/auth');
    }
  }, [session, navigate]);

  // Subscribe to inbox conversations
  useEffect(() => {
    if (!currentUser?.id) return;

    console.log('[FacilitatorInbox] Setting up inbox subscription');

    const unsubscribe = subscribeToFacilitatorInbox(currentUser.id, (convs) => {
      console.log(`[FacilitatorInbox] Received ${convs.length} inbox conversations`);
      const conversationsWithContext = convs.map(c => ({ ...c, context: 'inbox' as const }));
      setInboxConversations(conversationsWithContext);

      // Calculate unread count
      const unread = conversationsWithContext.reduce((sum, c) => sum + c.unreadCount, 0);
      setUnreadCounts(prev => ({ ...prev, inbox: unread }));
    });

    return () => {
      console.log('[FacilitatorInbox] Cleaning up inbox subscription');
      unsubscribe();
    };
  }, [currentUser?.id]);

  // Subscribe to Shangazi conversations (only for Big Sisters)
  useEffect(() => {
    if (!currentUser?.id || !isBigSister) return;

    console.log('[FacilitatorInbox] Setting up Shangazi subscription');

    const unsubscribe = subscribeToShangaziInbox(currentUser.id, (convs) => {
      console.log(`[FacilitatorInbox] Received ${convs.length} Shangazi conversations`);
      const conversationsWithContext = convs.map(c => ({ ...c, context: 'shangazi' as const }));
      setShangaziConversations(conversationsWithContext);

      // Calculate unread count
      const unread = conversationsWithContext.reduce((sum, c) => sum + c.unreadCount, 0);
      setUnreadCounts(prev => ({ ...prev, shangazi: unread }));
    });

    return () => {
      console.log('[FacilitatorInbox] Cleaning up Shangazi subscription');
      unsubscribe();
    };
  }, [currentUser?.id, isBigSister]);

  // Subscribe to Legal Affairs conversations (only for Legal Advisors)
  useEffect(() => {
    if (!currentUser?.id || !isLegalAdvisor) return;

    console.log('[FacilitatorInbox] Setting up Legal Affairs subscription');

    const unsubscribe = subscribeToLegalInbox(currentUser.id, (convs) => {
      console.log(`[FacilitatorInbox] Received ${convs.length} Legal Affairs conversations`);
      const conversationsWithContext = convs.map(c => ({ ...c, context: 'legal' as const }));
      setLegalConversations(conversationsWithContext);

      const unread = conversationsWithContext.reduce((sum, c) => sum + c.unreadCount, 0);
      setUnreadCounts(prev => ({ ...prev, legal: unread }));
    });

    return () => {
      console.log('[FacilitatorInbox] Cleaning up Legal Affairs subscription');
      unsubscribe();
    };
  }, [currentUser?.id, isLegalAdvisor]);

  // Subscribe to GBV conversations (only for GBV Counselors)
  useEffect(() => {
    if (!currentUser?.id || !isGBVCounselor) return;

    console.log('[FacilitatorInbox] Setting up GBV subscription');

    const unsubscribe = subscribeToGBVInbox(currentUser.id, (convs) => {
      console.log(`[FacilitatorInbox] Received ${convs.length} GBV conversations`);
      const conversationsWithContext = convs.map(c => ({ ...c, context: 'gbv' as const }));
      setGbvConversations(conversationsWithContext);

      const unread = conversationsWithContext.reduce((sum, c) => sum + c.unreadCount, 0);
      setUnreadCounts(prev => ({ ...prev, gbv: unread }));
    });

    return () => {
      console.log('[FacilitatorInbox] Cleaning up GBV subscription');
      unsubscribe();
    };
  }, [currentUser?.id, isGBVCounselor]);

  // Subscribe to messages when a user is selected
  useEffect(() => {
    if (!selectedUser || !currentUser?.id) return;

    console.log(`[FacilitatorInbox] Subscribing to conversation with ${selectedUser.participantName}`);
    // ULTRA-FIX: Don't clear messages immediately - prevents flickering
    // Only set messages when we receive data from subscription

    let isFirstCallback = true;

    const unsubscribe = subscribeToConversation(
      currentUser.id,
      selectedUser.participantId,
      selectedUser.context || 'inbox',
      (msgs) => {
        console.log(`[FacilitatorInbox] Received ${msgs.length} messages`);
        setMessages(msgs);

        // Mark unread messages as read
        const unreadIds = msgs
          .filter(m => !m.isRead && m.senderId !== currentUser.id)
          .map(m => m.id);
        if (unreadIds.length > 0) {
          markMessagesAsRead(unreadIds, selectedUser.context || 'inbox');
        }

        isFirstCallback = false;
      }
    );

    return () => {
      unsubscribe();
      // Don't clear messages on unmount - prevents flickering when switching
    };
  }, [selectedUser, currentUser?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !selectedUser || isLoading) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);
    setSendStatus('sending');
    setStatusMessage('Sending...');

    try {
      const result = await sendDirectMessage(
        currentUser.id,
        currentUser.name,
        currentUser.avatar,
        selectedUser.participantId,
        selectedUser.participantName,
        content,
        selectedUser.context || 'inbox'
      );

      if (result) {
        console.log('[FacilitatorInbox] Message sent:', result.id);
        setSendStatus('sent');
        setStatusMessage('Message sent!');
        // Clear status after 2 seconds
        setTimeout(() => {
          setSendStatus('idle');
          setStatusMessage('');
        }, 2000);
      } else {
        setNewMessage(content);
        setSendStatus('error');
        setStatusMessage('Failed to send. Please try again.');
      }
    } catch (error) {
      console.error('[FacilitatorInbox] Error sending message:', error);
      setNewMessage(content);
      setSendStatus('error');
      setStatusMessage('Error sending message. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
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
      const success = await deleteDirectMessage(messageId, selectedUser?.context || 'inbox');
      if (success) {
        console.log('[FacilitatorInbox] Message deleted:', messageId);
      }
    } catch (err) {
      console.error('[FacilitatorInbox] Error deleting message:', err);
    }
  };

  // Select conversation
  const handleSelectConversation = (conversation: FacilitatorConversation) => {
    setSelectedUser(conversation);
    setViewState('chat');
    setActiveTab(conversation.context || 'inbox');
  };

  // Filter conversations by search
  const filteredInbox = inboxConversations.filter(c =>
    c.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredShangazi = shangaziConversations.filter(c =>
    c.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredLegal = legalConversations.filter(c =>
    c.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredGBV = gbvConversations.filter(c =>
    c.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // EMOJI LIST
  const EMOJIS = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','👍','👎','👏','🙌','👐','🤲','🤝','🙏','✌️','🤟','🤘','🤙','👌','🤏','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤜','🤛','✊','👊','🤝','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸'];

  // ==================== RENDER MENU VIEW ====================
  const renderMenu = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('chat.title')}</h1>
            <p className="text-sm text-gray-500">{t('common.facilitator')}</p>
          </div>
        </div>
      </div>

      {/* Menu Options */}
      <div className="p-4 space-y-4">
        {/* Main Chat Option */}
        <button
          onClick={() => navigate('/chat')}
          className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all text-left"
        >
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">{t('chat.mainChat')}</h3>
            <p className="text-sm text-gray-500">{t('chat.mainChatDescription')}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Inbox Option */}
        <button
          onClick={() => setViewState('inbox-list')}
          className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-left relative"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
            <Inbox className="w-7 h-7 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">{t('chat.inbox')}</h3>
            <p className="text-sm text-gray-500">{t('chat.inboxDescription')}</p>
          </div>
          {unreadCounts.inbox > 0 && (
            <div className="absolute top-4 right-14 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{unreadCounts.inbox}</span>
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Shangazi Option (Only for Big Sisters) */}
        {isBigSister && (
          <button
            onClick={() => setViewState('shangazi-list')}
            className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-pink-200 transition-all text-left relative"
          >
            <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center relative">
              <Heart className="w-7 h-7 text-pink-600" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-pink-600 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-white text-xs font-bold">S</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">{t('girlsRoom.bazaShangazi')}</h3>
              <p className="text-sm text-gray-500">{t('girlsRoom.shangaziDescription')}</p>
            </div>
            {unreadCounts.shangazi > 0 && (
              <div className="absolute top-4 right-14 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{unreadCounts.shangazi}</span>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        )}

        {/* Legal Affairs Option (Only for Legal Advisors) */}
        {isLegalAdvisor && (
          <button
            onClick={() => setViewState('legal-list')}
            className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all text-left relative"
          >
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center relative">
              <Scale className="w-7 h-7 text-indigo-600" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-white text-xs font-bold">L</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">{t('mpuza.legalHumanRights')}</h3>
              <p className="text-sm text-gray-500">{t('mpuza.legalHumanRightsDesc')}</p>
            </div>
            {unreadCounts.legal > 0 && (
              <div className="absolute top-4 right-14 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{unreadCounts.legal}</span>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        )}

        {/* GBV Option (Only for GBV Counselors) */}
        {isGBVCounselor && (
          <button
            onClick={() => setViewState('gbv-list')}
            className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-amber-200 transition-all text-left relative"
          >
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center relative">
              <ShieldAlert className="w-7 h-7 text-amber-600" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-white text-xs font-bold">G</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">{t('mpuza.genderBasedViolence')}</h3>
              <p className="text-sm text-gray-500">{t('mpuza.genderBasedViolenceDesc')}</p>
            </div>
            {unreadCounts.gbv > 0 && (
              <div className="absolute top-4 right-14 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{unreadCounts.gbv}</span>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Info Card */}
      <div className="mx-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <p className="text-sm text-emerald-800 font-medium">{t('chat.facilitatorInboxInfo')}</p>
            <p className="text-xs text-emerald-600 mt-1">{t('chat.facilitatorInboxSubInfo')}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ==================== RENDER CONVERSATION LIST ====================
  const renderConversationList = (conversations: FacilitatorConversation[], type: ChatContext) => {
    const isShangazi = type === 'shangazi';
    const isLegal = type === 'legal';
    const isGBV = type === 'gbv';
    const title = isShangazi ? t('girlsRoom.bazaShangazi') : isLegal ? t('mpuza.legalHumanRights') : isGBV ? t('mpuza.genderBasedViolence') : t('chat.inbox');
    const filtered = isShangazi ? filteredShangazi : isLegal ? filteredLegal : isGBV ? filteredGBV : filteredInbox;
    const headerBg = isShangazi ? 'bg-pink-50 border-pink-200' : isLegal ? 'bg-indigo-50 border-indigo-200' : isGBV ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200';
    const emptyIconBg = isShangazi ? 'bg-pink-100' : isLegal ? 'bg-indigo-100' : isGBV ? 'bg-amber-100' : 'bg-blue-100';
    const emptyIconColor = isShangazi ? 'text-pink-400' : isLegal ? 'text-indigo-400' : isGBV ? 'text-amber-400' : 'text-blue-400';
    const badgeBg = isShangazi ? 'bg-pink-500' : isLegal ? 'bg-indigo-600' : isGBV ? 'bg-amber-600' : 'bg-blue-500';
    const ringColor = isShangazi ? '#ec4899' : isLegal ? '#6366f1' : isGBV ? '#d97706' : '#3b82f6';

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className={cn(
          "border-b px-4 py-4",
          headerBg
        )}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewState('menu')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500">
                {conversations.length} {conversations.length === 1 ? t('chat.conversation') : t('chat.conversations')}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('chat.searchUsers')}
              className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{ '--tw-ring-color': ringColor } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
                emptyIconBg
              )}>
                {isShangazi ? (
                  <Heart className={cn('w-10 h-10', emptyIconColor)} />
                ) : isLegal ? (
                  <Scale className={cn('w-10 h-10', emptyIconColor)} />
                ) : isGBV ? (
                  <ShieldAlert className={cn('w-10 h-10', emptyIconColor)} />
                ) : (
                  <Inbox className={cn('w-10 h-10', emptyIconColor)} />
                )}
              </div>
              <p className="text-gray-500 font-medium">
                {searchQuery ? t('chat.noSearchResults') : t('chat.noConversations')}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? t('chat.tryDifferentSearch') : t('chat.conversationsWillAppear')}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.participantId}
                onClick={() => handleSelectConversation(conv)}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all text-left"
              >
                <div className="relative">
                  <img
                    src={conv.participantAvatar || '/default-avatar.png'}
                    alt={conv.participantName}
                    className="w-14 h-14 rounded-full object-cover bg-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-avatar.png';
                    }}
                    loading="lazy"
                  />
                  {conv.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                      <span className="text-white text-xs font-bold">{conv.unreadCount}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={cn(
                      "font-semibold truncate",
                      conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                    )}>
                      {conv.participantName}
                    </h3>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatTime(conv.lastMessageTimestamp)}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm truncate mt-1",
                    conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'
                  )}>
                    {conv.lastMessage}
                  </p>
                </div>
                {(isShangazi || isLegal || isGBV) && (
                  <div className={cn('flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center', badgeBg)}>
                    <span className="text-white text-xs font-bold">{isShangazi ? 'S' : isLegal ? 'L' : 'G'}</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  // ==================== RENDER CHAT VIEW ====================
  const renderChat = () => {
    if (!selectedUser) return null;
    const isShangazi = activeTab === 'shangazi';
    const isLegal = activeTab === 'legal';
    const isGBV = activeTab === 'gbv';
    const headerBg = isShangazi ? 'bg-pink-50 border-pink-200' : isLegal ? 'bg-indigo-50 border-indigo-200' : isGBV ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200';
    const bubbleOwn = isShangazi ? 'bg-pink-500 text-white rounded-br-sm' : isLegal ? 'bg-indigo-600 text-white rounded-br-sm' : isGBV ? 'bg-amber-600 text-white rounded-br-sm' : 'bg-blue-500 text-white rounded-br-sm';
    const sendBtn = isShangazi ? 'bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300' : isLegal ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300' : isGBV ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300' : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300';
    const emptyIconBg = isShangazi ? 'bg-pink-100' : isLegal ? 'bg-indigo-100' : isGBV ? 'bg-amber-100' : 'bg-blue-100';
    const emptyIconColor = isShangazi ? 'text-pink-400' : isLegal ? 'text-indigo-400' : isGBV ? 'text-amber-400' : 'text-blue-400';
    const backList: ViewState = isShangazi ? 'shangazi-list' : isLegal ? 'legal-list' : isGBV ? 'gbv-list' : 'inbox-list';

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
        {/* Header */}
        <div className={cn(
          "border-b px-4 py-3 flex-shrink-0",
          headerBg
        )}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setViewState(backList);
                setSelectedUser(null);
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="relative">
              <img
                src={selectedUser.participantAvatar || '/default-avatar.png'}
                alt={selectedUser.participantName}
                className="w-10 h-10 rounded-full object-cover bg-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-avatar.png';
                }}
                loading="eager"
              />
              {(isShangazi || isLegal || isGBV) && (
                <div className={cn('absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white', isShangazi ? 'bg-pink-500' : isLegal ? 'bg-indigo-600' : 'bg-amber-600')}>
                  <span className="text-white text-[10px] font-bold">{isShangazi ? 'S' : isLegal ? 'L' : 'G'}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{selectedUser.participantName}</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {t('chat.privateConversation')}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                emptyIconBg
              )}>
                <MessageSquare className={cn(
                  "w-8 h-8",
                  emptyIconColor
                )} />
              </div>
              <p className="text-gray-500">{t('chat.noMessagesYet')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('chat.startConversation')}</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwnMessage = msg.senderId === currentUser?.id;
              const showDate = index === 0 ||
                new Date(msg.timestamp).toDateString() !==
                new Date(messages[index - 1].timestamp).toDateString();

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                        {new Date(msg.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className={cn(
                    'flex gap-3',
                    isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                  )}>
                    <img
                      src={isOwnMessage ? currentUser?.avatar : msg.senderAvatar}
                      alt={isOwnMessage ? t('chat.you') : msg.senderName}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className={cn(
                      'max-w-[75%]',
                      isOwnMessage ? 'items-end' : 'items-start'
                    )}>
                      <div className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm relative group',
                        isOwnMessage
                          ? bubbleOwn
                          : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                      )}>
                        {msg.content}
                        {/* Delete button for own messages */}
                        {isOwnMessage && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm"
                            title={t('chat.delete')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOwnMessage && (
                          <span className="text-xs text-gray-400">
                            {msg.isRead ? (
                              <CheckCheck className="w-3 h-3 inline" />
                            ) : (
                              <Check className="w-3 h-3 inline" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-3 sm:p-4 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="text-lg sm:text-xl">😊</span>
            </button>
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={t('chat.typeMessage')}
              className="flex-1 min-w-0 px-3 py-2 sm:px-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none max-h-24 sm:max-h-32"
              rows={1}
              style={{ minHeight: '36px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-colors shadow-sm",
                sendBtn,
                "text-white disabled:opacity-50"
              )}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 flex-shrink-0" />
              )}
            </button>
          </div>

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

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <p className="text-xs text-gray-400 mt-2 text-center">
            {t('chat.privateNotice')}
          </p>
        </div>
      </div>
    );
  };

  // ==================== MAIN RENDER ====================
  switch (viewState) {
    case 'menu':
      return renderMenu();
    case 'inbox-list':
      return renderConversationList(inboxConversations, 'inbox');
    case 'shangazi-list':
      return renderConversationList(shangaziConversations, 'shangazi');
    case 'legal-list':
      return renderConversationList(legalConversations, 'legal');
    case 'gbv-list':
      return renderConversationList(gbvConversations, 'gbv');
    case 'chat':
      return renderChat();
    default:
      return renderMenu();
  }
}
