import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEphemeralStore, usePersistentStore } from '../store';
import { 
  Users,
  MessageSquare,
  User,
  Bot,
  MoreVertical,
  Trash2,
  Inbox,
  FileText,
  X,
  AtSign,
  Shield,
  ChevronRight,
  Pin,
  Sparkles,
  Crown,
  Stethoscope,
  Heart,
  Settings,
  Smile,
  ArrowLeft
} from 'lucide-react';
import ChatSettings from '../components/ChatSettings';
import NotificationBell from '../components/NotificationBell';
import { Link } from 'react-router-dom';
import { cn } from '../utils/helpers';
import { subscribeToGlobalMessagesWithAI, sendMessageToGlobalChat, deleteGlobalMessage } from '../services/chatService';
import type { ChatMessage, AIType, Facilitator } from '../types';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';

// Emoji list for picker
const EMOJIS = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','🏧','🈂️','🛂','🛃','🛄','🛅','♿','🚭','🚾','🅿️','🈳','🈂','⚕️','🛗','🛌','🔀','🔁','🔂','▶️','⏩','⏭️','⏯️','◀️','⏪','⏮️','🔼','⏫','🔽','⏬','⏸️','⏹️','⏺️','⏏️','🎦','🔅','🔆','📶','🛜','📳','📴','♀️','♂️','⚧️','✖️','➕','➖','➗','🟰','♾️','‼️','⁉️','❓','❔','❕','❗','〰️','💱','💲','⚕️','♻️','🔱','📛','🔰','⭕','✅','☑️','✔️','❌','❎','➰','➿','〽️','✳️','✴️','❇️','©️','®️','™️','#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔠','🔡','🔢','🔣','🔤','🅰️','🆎','🅱️','🆑','🆒','🆓','ℹ️','🆔','Ⓜ️','🆕','🆖','🆗','🅾️','🆘','🆙','🆚','🈁','🈂️','🈷️','🈶','🈯','🉐','🈹','🈚','🈲','🉑','🈸','🈴','🈳','㊗️','㊙️','🈺','🈵','🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🟥','🟧','🟨','🟩','🟦','🟪','🟫','⬛','⬜','◼️','◻️','◾','◽','▪️','▫️','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔳','🔲','🕛','🕧','🕐','🕑','🕝','🕒','🕓','🕟','🕔','🕕','🕠','🕖','🕗','🕡','🕘','🕙','🕥','🕚','🕦','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌙','🌚','🌛','🌜','🌡️','☀️','🌝','🌞','🪐','⭐','🌟','🌠','🌌','☁️','⛅','⛈️','🌤️','🌥️','🌦️','🌧️','🌨️','❄️','🌬️','💨','🌪️','🌫️','🌊','💧','💦','☔','☂️','🌂','⚡','❄️','☃️','⛄','☄️','🔥','💥','🌈','☀️','🌤️','⛅','☁️','🌦️','🌧️','⛈️','🌩️','⚡','❄️','🌨️','☃️','⛄','💧','💦','☔','☂️','🌊','🌫️'];

export default function ChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, setCurrentPage } = useEphemeralStore();
  const { chatSettings, isAdminLoggedIn, language } = usePersistentStore();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [privateReplyTo, setPrivateReplyTo] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Phone back navigation for modals
  usePhoneBackNavigation({
    isOpen: showParticipants,
    onClose: () => setShowParticipants(false),
    modalId: 'chat-participants'
  });

  usePhoneBackNavigation({
    isOpen: showTerms,
    onClose: () => setShowTerms(false),
    modalId: 'chat-terms'
  });

  usePhoneBackNavigation({
    isOpen: showSettings,
    onClose: () => setShowSettings(false),
    modalId: 'chat-settings'
  });

  usePhoneBackNavigation({
    isOpen: showMentions,
    onClose: () => setShowMentions(false),
    modalId: 'chat-mentions'
  });

  usePhoneBackNavigation({
    isOpen: showEmojiPicker,
    onClose: () => setShowEmojiPicker(false),
    modalId: 'chat-emoji-picker'
  });

  // AI Types for mentions - RM Admin only
  const aiMentions: { type: AIType; name: string; icon: React.ReactNode; description: string }[] = [
    { type: 'ubuzima-admin', name: 'RM Admin', icon: <Stethoscope className="w-4 h-4" />, description: 'Platform Navigation Guide' },
  ];

  // Get facilitators from chat settings
  const facilitators = chatSettings?.facilitators || [];

  // Filter mentions based on search
  const filteredAIMentions = aiMentions.filter(ai => 
    ai.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );
  const filteredFacilitators = facilitators.filter(f => 
    f.userName.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Subscribe to global messages
  useEffect(() => {
    console.log('[ChatPage] 🚀 Setting up global chat subscription');
    setCurrentPage('chat');
    
    setLoading(true);
    setError(null);
    
    // Subscribe to real-time updates with AI auto-response
    // IMPORTANT: AI (RM Admin) will ONLY respond when explicitly mentioned with @RM Admin
    // This is enforced in chatService.ts - processMessageForAIMention() - STRICT CHECK 4
    const unsubscribe = subscribeToGlobalMessagesWithAI((newMessages: ChatMessage[]) => {
      console.log(`[ChatPage] 📨 Received ${newMessages.length} messages from global chat`);
      setMessages(newMessages);
      setLoading(false);
    }, language);

    // Cleanup on unmount
    return () => {
      console.log('[ChatPage] 🧹 Cleaning up chat subscription');
      unsubscribe();
    };
  }, [setCurrentPage, language]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle input change for mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart || 0;
    
    setMessage(value);
    setCursorPosition(cursor);
    setShowEmojiPicker(false); // Hide emoji picker when typing
    
    // Check if typing @
    const lastChar = value[cursor - 1];
    const charBeforeLast = cursor > 1 ? value[cursor - 2] : '';
    
    if (lastChar === '@' && (cursor === 1 || charBeforeLast === ' ' || charBeforeLast === '\n')) {
      setShowMentions(true);
      setMentionSearch('');
      setMentionStartIndex(cursor);
    } else if (showMentions) {
      // Update mention search
      const textAfterAt = value.substring(mentionStartIndex, cursor);
      if (textAfterAt.includes(' ')) {
        setShowMentions(false);
      } else {
        setMentionSearch(textAfterAt);
      }
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Handle mention selection
  const handleMentionSelect = (mentionName: string, type: 'ai' | 'facilitator') => {
    const beforeMention = message.substring(0, mentionStartIndex);
    const afterCursor = message.substring(cursorPosition);
    const newMessage = `${beforeMention}@${mentionName} ${afterCursor}`;
    
    setMessage(newMessage);
    setShowMentions(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || !session?.user || isLoading) return;

    setIsLoading(true);
    const content = message.trim();
    
    // Optimistic UI - clear input immediately
    setMessage('');

    try {
      const result = await sendMessageToGlobalChat({
        userId: session.user.id,
        userName: session.user.name,
        userAvatar: session.user.avatar,
        content,
        type: 'text',
      });

      if (!result) {
        throw new Error('Failed to send message');
      }
      
      console.log('[ChatPage] ✅ Message sent successfully:', result.id);
    } catch (err: any) {
      console.error('[ChatPage] ❌ Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      // Restore message if failed
      setMessage(content);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm(t('chat.confirmDelete'))) return;
    
    try {
      const success = await deleteGlobalMessage(messageId);
      if (success) {
        console.log('[ChatPage] ✅ Message deleted:', messageId);
      } else {
        console.error('[ChatPage] ❌ Failed to delete message');
      }
    } catch (err) {
      console.error('[ChatPage] ❌ Error deleting message:', err);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
    
    if (isToday) return t('chat.today') + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isYesterday) return t('chat.yesterday') + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const groupName = chatSettings?.groupName || 'RM Ubuzima Community Chat';

  // Check if current user is a facilitator
  const isCurrentUserFacilitator = session?.user?.id && chatSettings?.facilitators?.some(f => f.userId === session.user?.id);

  return (
    <div className="fixed inset-0 z-50 bg-rm-gray-50 flex flex-col">
      {/* Header - Full width */}
      <div className="bg-white border-b border-rm-gray-200 sticky top-0 z-10">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Back button - always visible in fullscreen mode */}
              <button
                onClick={() => navigate('/')}
                className="p-2 text-rm-gray-600 hover:bg-rm-gray-100 rounded-lg transition-colors"
                title="Back to Home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-srhr rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-rm-gray-900">{groupName}</h1>
                <p className="text-xs text-rm-gray-500">
                  {loading ? 'Loading...' : `${messages.length} ${t('chat.messages')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Inbox Button */}
              <Link
                to="/inbox"
                className="flex items-center gap-2 px-3 py-2 bg-srhr/10 hover:bg-srhr/20 text-srhr rounded-lg transition-colors"
              >
                <Inbox className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">{t('chat.inbox')}</span>
              </Link>

              {/* Notification Bell - Same as HomePage */}
              {session?.user && (
                <NotificationBell />
              )}

              {/* Settings Button - Always visible on all devices */}
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 p-2 text-rm-gray-500 hover:bg-rm-gray-100 rounded-lg transition-colors"
                title="Chat Settings"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Description Banner - Full width */}
      {(chatSettings?.groupDescription || chatSettings?.pinnedAnnouncement) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="w-full px-4 py-2">
            <div className="flex items-start gap-2">
              <Pin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-800">
                  {chatSettings?.pinnedAnnouncement || chatSettings?.groupDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-rm-gray-200">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-srhr" />
                <h2 className="text-lg font-semibold text-rm-gray-900">{t('chat.termsTitle')}</h2>
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
                <p className="font-medium text-rm-gray-900 mb-3">{t('chat.welcomeToChat')}</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-srhr mt-0.5 flex-shrink-0" />
                    <span>{t('chat.ruleRespect')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-srhr mt-0.5 flex-shrink-0" />
                    <span>{t('chat.rulePrivacy')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-srhr mt-0.5 flex-shrink-0" />
                    <span>{t('chat.ruleMentions')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-srhr mt-0.5 flex-shrink-0" />
                    <span>{t('chat.ruleInbox')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-srhr mt-0.5 flex-shrink-0" />
                    <span>{t('chat.ruleModeration')}</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <Shield className="w-3 h-3 inline mr-1" />
                    {t('chat.facilitatorsInfo')}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-rm-gray-200 bg-rm-gray-50">
              <button
                onClick={() => setShowTerms(false)}
                className="w-full py-2 bg-srhr text-white rounded-xl font-medium hover:bg-srhr-dark transition-colors"
              >
                {t('chat.understand')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area - Endless scrolling, full width */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="w-full px-4 py-4 space-y-4">
          {/* Loading State */}
          {loading && messages.length === 0 && (
            <div className="text-center py-12">
              <div className="animate-pulse">
                <MessageSquare className="w-16 h-16 text-rm-gray-200 mx-auto mb-4" />
                <p className="text-rm-gray-400">{t('chat.loading') || 'Loading messages...'}</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                }}
                className="text-sm text-red-600 underline mt-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && messages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-rm-gray-300 mx-auto mb-4" />
              <p className="text-rm-gray-500">{t('chat.noMessages')}</p>
              <p className="text-sm text-rm-gray-400 mt-2">{t('chat.startConversation')}</p>
            </div>
          )}

          {/* Messages List */}
          {messages.map((msg, index) => (
            <div key={msg.id} className="group">
              <MessageBubble
                message={msg}
                isOwnMessage={msg.userId === session?.user?.id}
                onDelete={handleDeleteMessage}
                onPrivateReply={(msg: ChatMessage) => {
                  setPrivateReplyTo(msg);
                  // Navigate to inbox with this facilitator
                  const facilitator = chatSettings?.facilitators?.find(f => f.userId === msg.userId);
                  if (facilitator) {
                    // Store the message to reply to
                    sessionStorage.setItem('privateReplyTo', JSON.stringify({
                      facilitatorId: facilitator.userId,
                      originalMessage: msg.content,
                      originalSender: msg.userName
                    }));
                  }
                }}
                formatTime={formatTime}
                t={t}
                isFacilitator={chatSettings?.facilitators?.some(f => f.userId === msg.userId)}
                currentUserId={session?.user?.id}
                isLastMessage={index === messages.length - 1}
              />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Private Reply Banner */}
      {privateReplyTo && (
        <div className="bg-green-50 border-t border-green-200 px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-green-600" />
              <span className="text-green-700">Reply privately to {privateReplyTo.userName}</span>
            </div>
            <Link
              to="/inbox"
              className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              Go to Inbox
            </Link>
            <button
              onClick={() => setPrivateReplyTo(null)}
              className="p-1 hover:bg-green-100 rounded"
            >
              <X className="w-4 h-4 text-green-600" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area - WhatsApp Style - Full width */}
      <div className="bg-[#f0f2f5] border-t border-gray-200 z-10 sticky bottom-0">
        <div className="w-full px-3 py-2 relative">
          {/* Mentions Dropdown */}
          {showMentions && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-rm-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-20">
              {/* AI Mentions Section */}
              {filteredAIMentions.length > 0 && (
                <div className="p-2">
                  <p className="text-xs font-medium text-rm-gray-500 px-2 py-1">AI Assistant</p>
                  {filteredAIMentions.map((ai) => (
                    <button
                      key={ai.type}
                      onClick={() => handleMentionSelect(ai.name, 'ai')}
                      className="w-full flex items-center gap-2 px-2 py-2 hover:bg-rm-gray-50 rounded-lg text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        {ai.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-rm-gray-900">{ai.name}</p>
                        <p className="text-xs text-rm-gray-500">{ai.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Facilitators Section */}
              {filteredFacilitators.length > 0 && (
                <div className="p-2 border-t border-rm-gray-100">
                  <p className="text-xs font-medium text-rm-gray-500 px-2 py-1">Facilitators</p>
                  {filteredFacilitators.map((facilitator) => (
                    <button
                      key={facilitator.userId}
                      onClick={() => handleMentionSelect(facilitator.userName, 'facilitator')}
                      className="w-full flex items-center gap-2 px-2 py-2 hover:bg-rm-gray-50 rounded-lg text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-srhr/20 flex items-center justify-center">
                        {facilitator.userAvatar ? (
                          <img
                            src={facilitator.userAvatar}
                            alt={facilitator.userName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-srhr" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-rm-gray-900">{facilitator.userName}</p>
                        <p className="text-xs text-rm-gray-500">{facilitator.role || 'Facilitator'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {filteredAIMentions.length === 0 && filteredFacilitators.length === 0 && (
                <div className="p-4 text-center">
                  <p className="text-sm text-rm-gray-500">No matches found</p>
                  <p className="text-xs text-rm-gray-400 mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          )}

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

          <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-3xl mx-auto">
            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-rm-gray-500 hover:text-rm-gray-700 hover:bg-gray-200 rounded-full transition-colors"
              disabled={!session?.user}
            >
              <Smile className="w-6 h-6" />
            </button>

            {/* Input Field - WhatsApp Style - Smaller on PC */}
            <div className="flex-1 bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm border border-gray-200 sm:max-w-xl">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={handleInputChange}
                placeholder={session?.user ? "Type a message" : 'Log in to send messages'}
                className="w-full bg-transparent outline-none text-rm-gray-900 placeholder:text-rm-gray-400 text-sm"
                disabled={isLoading || !session?.user}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!message.trim() || isLoading || !session?.user}
              className={cn(
                'p-2 rounded-full transition-colors',
                message.trim() && !isLoading && session?.user
                  ? 'bg-srhr text-white hover:bg-srhr-dark shadow-md'
                  : 'bg-gray-300 text-gray-500'
              )}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Chat Settings Modal */}
      <ChatSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isAdmin={isAdminLoggedIn}
        isFacilitator={chatSettings?.facilitators?.some(f => f.userId === session?.user?.id)}
      />

    </div>
  );
}

// Message Bubble Component - Optimized with React.memo
const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
  onDelete,
  onPrivateReply,
  formatTime,
  t,
  isFacilitator,
  currentUserId,
  isLastMessage,
}: {
  message: ChatMessage;
  isOwnMessage: boolean;
  onDelete: (id: string) => void;
  onPrivateReply?: (msg: ChatMessage) => void;
  formatTime: (timestamp: string) => string;
  t: any;
  isFacilitator?: boolean;
  currentUserId?: string;
  isLastMessage?: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState<string[]>(message.reactions || []);
  const [isPressing, setIsPressing] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if this message should have a 3-dot menu
  // - Own messages: yes (delete)
  // - Facilitator messages: yes (inbox)
  // - Others: no
  const shouldShowMenu = isOwnMessage || (isFacilitator && !message.isAI);

  // Quick reaction emojis (WhatsApp style) - memoized
  const quickReactions = useRef(['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏']).current;

  // Close actions when clicking outside - memoized callback
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActions(false);
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to last message - only when isLastMessage changes
  useEffect(() => {
    if (isLastMessage && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isLastMessage]);

  // WhatsApp-style long press handlers - memoized
  const handleTouchStart = useCallback(() => {
    setIsPressing(true);
    pressTimerRef.current = setTimeout(() => {
      setShowReactions(true);
      setIsPressing(false);
    }, 500); // 500ms long press
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsPressing(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsPressing(true);
    pressTimerRef.current = setTimeout(() => {
      setShowReactions(true);
      setIsPressing(false);
    }, 500); // 500ms long press
  }, []);

  const handleMouseUp = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsPressing(false);
  }, []);

  const handleAddReaction = useCallback((emoji: string) => {
    if (!currentUserId) return;
    setReactions(prev => [...prev, emoji]);
    setShowReactions(false);
    // In a real app, you'd sync this to Firebase here
  }, [currentUserId]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  return (
    <div 
      ref={messageRef}
      className={cn('flex gap-3', isOwnMessage ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar with Facilitator Badge */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center overflow-hidden',
          message.isAI ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 
          message.userAvatar ? 'bg-transparent' : 'bg-rm-gray-200'
        )}>
          {message.isAI ? (
            <Bot className="w-5 h-5 text-white" />
          ) : message.userAvatar ? (
            <img 
              src={message.userAvatar} 
              alt={message.userName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-rm-gray-600" />
          )}
        </div>
        
        {/* Facilitator Badge - Dark Green "F" */}
        {isFacilitator && !message.isAI && (
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
            {message.userName}
          </span>
          {message.isAI && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {t('chat.ai')}
            </span>
          )}
          {isFacilitator && !message.isAI && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
              Facilitator
            </span>
          )}
          <span className="text-xs text-rm-gray-400">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Message Bubble Container */}
        <div className="relative">
          {/* WhatsApp-style Reactions Picker (appears on long press) */}
          {showReactions && (
            <div 
              ref={actionsRef}
              className={cn(
                "absolute z-50 bg-white border border-rm-gray-200 rounded-full px-3 py-2 shadow-xl",
                isOwnMessage ? 'right-0 -top-14' : 'left-0 -top-14'
              )}
            >
              <div className="flex items-center gap-2">
                {quickReactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddReaction(emoji)}
                    className="text-2xl hover:scale-125 transition-transform p-1"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={() => setShowReactions(false)}
                  className="p-1 hover:bg-rm-gray-100 rounded-full ml-1"
                >
                  <X className="w-4 h-4 text-rm-gray-500" />
                </button>
              </div>
            </div>
          )}

          {/* Message Bubble with long-press handlers */}
          <div
            className={cn(
              'relative px-4 py-2 rounded-2xl select-none',
              isOwnMessage
                ? 'bg-srhr text-white rounded-br-md'
                : 'bg-white border border-rm-gray-200 rounded-bl-md',
              isPressing && 'opacity-80 scale-[0.98] transition-all'
            )}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            {message.isDeleted ? (
              <p className="italic text-sm opacity-60">{t('chat.deleted')}</p>
            ) : (
              <p className={cn(
                'text-sm whitespace-pre-wrap',
                isOwnMessage ? 'text-white' : 'text-rm-gray-900'
              )}>
                {message.content}
              </p>
            )}

            {/* 3-Dot Menu Button - Only for own messages or facilitator messages */}
            {!message.isDeleted && shouldShowMenu && (
              <button
                onClick={handleMenuClick}
                className="absolute -top-2 -right-2 p-1.5 bg-white border border-rm-gray-200 rounded-full shadow-md opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4 text-rm-gray-500" />
              </button>
            )}

            {/* Simplified Actions Dropdown Menu */}
            {showActions && shouldShowMenu && (
              <div 
                ref={actionsRef}
                className={cn(
                  "absolute z-30 bg-white border border-rm-gray-200 rounded-xl shadow-xl py-2 min-w-[160px]",
                  isOwnMessage ? 'right-0 top-8' : 'left-0 top-8'
                )}
              >
                {/* For own messages: Only Delete */}
                {isOwnMessage && (
                  <button
                    onClick={() => {
                      onDelete(message.id);
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-left transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600">Delete</span>
                  </button>
                )}

                {/* For facilitator messages: Only Inbox/Private Reply */}
                {isFacilitator && !message.isAI && !isOwnMessage && onPrivateReply && (
                  <button
                    onClick={() => {
                      onPrivateReply(message);
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-green-50 text-left transition-colors"
                  >
                    <Inbox className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">Inbox</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Display Reactions */}
          {reactions.length > 0 && (
            <div className={cn(
              "flex items-center gap-1 mt-1",
              isOwnMessage ? 'justify-end' : 'justify-start'
            )}>
              {Array.from(new Set(reactions)).map((emoji, idx) => (
                <span 
                  key={idx}
                  className="text-sm bg-white border border-rm-gray-200 rounded-full px-1.5 py-0.5 shadow-sm"
                >
                  {emoji} {reactions.filter(r => r === emoji).length > 1 && reactions.filter(r => r === emoji).length}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
