import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  Send,
  Lock,
  ChevronRight,
  User,
  MessageSquare,
  Mic,
  X,
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { useEphemeralStore, usePersistentStore } from '../store';
import type { Facilitator, DirectMessage, InboxConversation } from '../types';
import {
  subscribeToGBVConversation,
  sendGBVMessage,
  subscribeToUserGBVInbox,
} from '../services/inboxService';
import VoiceRecorder from '../components/VoiceRecorder';
import VoicePlayer from '../components/VoicePlayer';
import VoiceSelector from '../components/VoiceSelector';
import { useVoiceNote } from '../hooks/useVoiceNote';

export default function GBVPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session } = useEphemeralStore();
  const { chatSettings } = usePersistentStore();

  const isKinyarwanda = i18n.language === 'rw';
  const { voiceProfile, selectedVoiceId, setSelectedVoiceId, isFacilitator, showVoiceSelector, setShowVoiceSelector, handleVoiceSend } = useVoiceNote();

  const [counselors, setCounselors] = useState<Facilitator[]>([]);
  const [selectedCounselor, setSelectedCounselor] = useState<Facilitator | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [gbvConversations, setGbvConversations] = useState<InboxConversation[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingCounselors, setLoadingCounselors] = useState(true);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load GBV Counselors (facilitators with 'G' badge) from store
  useEffect(() => {
    if (chatSettings?.facilitators) {
      const gbvCounselors = chatSettings.facilitators.filter(
        f => f.badges?.includes('G') || f.isGBVCounselor
      );
      setCounselors(gbvCounselors);
      setLoadingCounselors(false);
    } else {
      setLoadingCounselors(false);
    }
  }, [chatSettings]);

  // Subscribe to user's GBV inbox for conversation history
  useEffect(() => {
    if (!session?.user?.id) return;

    const unsubscribe = subscribeToUserGBVInbox(session.user.id, (conversations) => {
      setGbvConversations(conversations);
    });

    return () => unsubscribe();
  }, [session?.user?.id]);

  // Subscribe to messages when a counselor is selected
  useEffect(() => {
    if (!selectedCounselor || !session?.user?.id) return;

    const unsubscribe = subscribeToGBVConversation(
      session.user.id,
      selectedCounselor.userId,
      (msgs) => {
        setMessages(msgs);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedCounselor?.userId, session?.user?.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedCounselor || !session?.user) return;

    const content = messageInput.trim();
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage: DirectMessage = {
      id: tempId,
      senderId: session.user.id,
      senderName: session.user.name,
      senderAvatar: session.user.avatar,
      receiverId: selectedCounselor.userId,
      receiverName: selectedCounselor.userName,
      content,
      timestamp: new Date().toISOString(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setMessageInput('');
    setSendStatus('sending');
    setStatusMessage(isKinyarwanda ? 'Kohereza...' : 'Sending...');

    try {
      const result = await sendGBVMessage(
        session.user.id,
        session.user.name,
        session.user.avatar,
        selectedCounselor.userId,
        selectedCounselor.userName,
        content
      );

      if (result && result.id) {
        setSendStatus('sent');
        setStatusMessage(isKinyarwanda ? 'Byoherejwe!' : 'Message sent!');
        setTimeout(() => {
          setSendStatus('idle');
          setStatusMessage('');
        }, 2000);
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setMessageInput(content);
        setSendStatus('error');
        setStatusMessage(isKinyarwanda ? 'Byanze. Ongera ugerageze.' : 'Failed to send. Please try again.');
      }
    } catch (error: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageInput(content);
      setSendStatus('error');
      setStatusMessage(error?.message || (isKinyarwanda ? 'Habaye ikosa. Ongera ugerageze.' : 'Error sending message.'));
    }
  }, [messageInput, selectedCounselor, session?.user, isKinyarwanda]);

  // --- Counselor Selection View ---
  if (!selectedCounselor) {
    return (
      <div className="min-h-full bg-slate-50 pb-24">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/mpuza')}
                className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {isKinyarwanda ? 'Ubukangurambaga bwa GBV' : t('mpuza.genderBasedViolence')}
                </h1>
                <p className="text-xs text-slate-500">
                  {isKinyarwanda ? 'Hitamo umujyanama' : 'Choose a GBV Counselor'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
            {/* Sub-header */}
            <div className="bg-amber-50 p-4 border-b border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">
                    {isKinyarwanda ? 'Ubukangurambaga bwa GBV' : 'Gender-Based Violence Support'}
                  </h3>
                  <p className="text-xs text-amber-600">
                    {isKinyarwanda ? 'Hitamo umujyanama wawe' : 'Choose your GBV Counselor'}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-xs text-amber-400">
                  <Lock className="w-3 h-3" />
                  {isKinyarwanda ? 'Ntibivugwa' : 'Private'}
                </div>
              </div>
            </div>

            {/* Counselor List */}
            <div className="p-4 space-y-3">
              {loadingCounselors ? (
                <div className="text-center py-8 text-slate-400">
                  {isKinyarwanda ? 'Gutegereza...' : 'Loading...'}
                </div>
              ) : counselors.length === 0 && gbvConversations.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">
                    {isKinyarwanda
                      ? 'Nta bajyanama baboneka ubu. Subira nyuma.'
                      : 'No GBV Counselors available right now. Please check back later.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Recent Conversations */}
                  {gbvConversations.length > 0 && (
                    <>
                      <p className="text-sm font-medium text-slate-700 mb-3">
                        {isKinyarwanda ? 'Ingingo zanyu' : 'Your Conversations'}
                      </p>
                      {gbvConversations.map((conv) => {
                        const counselor = counselors.find(c => c.userId === conv.participantId);
                        return (
                          <button
                            key={conv.participantId}
                            onClick={() => {
                              const selected = counselor || {
                                userId: conv.participantId,
                                userName: conv.participantName,
                                userAvatar: conv.participantAvatar,
                                isOnline: false,
                                role: 'GBV Counselor',
                                badges: ['G'],
                              } as Facilitator;
                              setSelectedCounselor(selected);
                            }}
                            className="w-full flex items-center gap-4 p-4 bg-white border border-amber-100 rounded-xl hover:shadow-md hover:border-amber-300 transition-all text-left"
                          >
                            <div className="relative">
                              <img
                                src={conv.participantAvatar || counselor?.userAvatar || '/default-avatar.png'}
                                alt={conv.participantName}
                                className="w-14 h-14 rounded-full object-cover"
                              />
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center border-2 border-white">
                                <span className="text-white text-xs font-bold">G</span>
                              </div>
                              {counselor?.isOnline && (
                                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-800 truncate">{conv.participantName}</p>
                                  <span className="px-1.5 py-0.5 bg-amber-600 text-white text-xs rounded font-bold">G</span>
                                </div>
                                {conv.unreadCount > 0 && (
                                  <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 truncate mt-1">{conv.lastMessage}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {new Date(conv.lastMessageTimestamp).toLocaleDateString()}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Divider */}
                  {gbvConversations.length > 0 && (
                    <div className="border-t border-slate-200 my-4 pt-4">
                      <p className="text-sm font-medium text-slate-700 mb-3">
                        {isKinyarwanda ? 'Abajyanama baboneka' : 'Available GBV Counselors'}
                      </p>
                    </div>
                  )}

                  {/* No conversations yet */}
                  {gbvConversations.length === 0 && (
                    <p className="text-sm text-slate-600 mb-4">
                      {isKinyarwanda
                        ? 'Hitamo umujyanama wawe. Urashobora kuvugana n\'umwe wese.'
                        : 'Choose a GBV Counselor to talk to. You can chat with any of them.'}
                    </p>
                  )}

                  {/* Available Counselors */}
                  {counselors
                    .filter(c => !gbvConversations.some(conv => conv.participantId === c.userId))
                    .map((counselor) => (
                      <button
                        key={counselor.userId}
                        onClick={() => setSelectedCounselor(counselor)}
                        className="w-full flex items-center gap-4 p-4 bg-white border border-amber-100 rounded-xl hover:shadow-md hover:border-amber-300 transition-all text-left"
                      >
                        <div className="relative">
                          <img
                            src={counselor.userAvatar || '/default-avatar.png'}
                            alt={counselor.userName}
                            className="w-14 h-14 rounded-full object-cover"
                          />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center border-2 border-white">
                            <span className="text-white text-xs font-bold">G</span>
                          </div>
                          {counselor.isOnline && (
                            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800">{counselor.userName}</p>
                            <span className="px-1.5 py-0.5 bg-amber-600 text-white text-xs rounded font-bold" title="GBV Counselor">
                              G
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {counselor.bio || (isKinyarwanda ? 'Umujyanama wa GBV' : 'GBV Counselor')}
                          </p>
                          {counselor.isOnline && (
                            <p className="text-xs text-green-600 mt-1">
                              {isKinyarwanda ? 'Ari online' : 'Online'}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    ))}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Chat View with Selected Counselor ---
  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCounselor(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="relative">
              <img
                src={selectedCounselor.userAvatar || '/default-avatar.png'}
                alt={selectedCounselor.userName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-white text-[10px] font-bold">G</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{selectedCounselor.userName}</h3>
                <span className="px-1 py-0.5 bg-amber-600 text-white text-xs rounded font-bold">G</span>
              </div>
              <p className="text-xs text-slate-500">
                {selectedCounselor.isOnline
                  ? (isKinyarwanda ? 'Ari online' : 'Online')
                  : (isKinyarwanda ? 'Ntiyari online' : 'Offline')
                }
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
              <Lock className="w-3 h-3" />
              {isKinyarwanda ? 'Ntibivugwa' : 'Private'}
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="max-w-lg mx-auto px-4 py-4">
        <div
          ref={messagesContainerRef}
          className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-2xl border border-amber-100 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">
                  {isKinyarwanda
                    ? 'Nta bwozi buriho. Tangira ubwanya!'
                    : 'No messages yet. Start chatting!'}
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.senderId === session?.user?.id ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2',
                      message.senderId === session?.user?.id
                        ? 'bg-amber-600 text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-800 rounded-bl-none'
                    )}
                  >
                    {message.type === 'voice' && message.voiceData ? (
                      <VoicePlayer
                        base64={message.voiceData}
                        duration={message.voiceDuration}
                        isOwn={message.senderId === session?.user?.id}
                        themeColor="#d97706"
                      />
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <p className={cn(
                      'text-xs mt-1',
                      message.senderId === session?.user?.id ? 'text-white/70' : 'text-slate-500'
                    )}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 sm:p-4 border-t border-amber-100 bg-white">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2 items-end">
              <button
                type="button"
                onClick={() => setShowVoiceSelector(true)}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title={isKinyarwanda ? 'Hitamo ijwi' : 'Select voice'}
              >
                <Mic className="w-4 h-4" style={{ color: voiceProfile.color }} />
              </button>
              <VoiceRecorder
                voiceProfile={voiceProfile}
                onSend={(base64, duration) => {
                  handleVoiceSend(base64, duration, async (params) => {
                    return sendGBVMessage(
                      session!.user.id,
                      session!.user.name,
                      session!.user.avatar,
                      selectedCounselor!.userId,
                      selectedCounselor!.userName,
                      params.content,
                      { voiceData: params.voiceData, voiceDuration: params.voiceDuration, voiceProfileId: params.voiceProfileId, type: 'voice' }
                    );
                  });
                }}
                themeColor="#d97706"
              />
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={isKinyarwanda ? 'Andika ubutumwa...' : 'Type message...'}
                disabled={sendStatus === 'sending'}
                className="flex-1 min-w-0 px-3 py-2 sm:px-4 sm:py-2 bg-slate-100 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || sendStatus === 'sending'}
                className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 bg-amber-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-amber-700 transition-colors shadow-md"
                title={isKinyarwanda ? 'Ohereza' : 'Send'}
              >
                {sendStatus === 'sending' ? (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                )}
              </button>
            </form>

            {/* Status Message */}
            {statusMessage && (
              <div className={cn(
                'mt-2 text-center text-sm font-medium',
                sendStatus === 'sending' && 'text-amber-600',
                sendStatus === 'sent' && 'text-green-600',
                sendStatus === 'error' && 'text-red-600'
              )}>
                {sendStatus === 'sending' && (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
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
      </main>

      {/* Voice Selector Modal */}
      {showVoiceSelector && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowVoiceSelector(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{isKinyarwanda ? 'Hitamo Ijwi' : 'Choose Voice'}</h3>
              <button onClick={() => setShowVoiceSelector(false)} className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <VoiceSelector
              selectedVoiceId={selectedVoiceId}
              onSelect={(id) => { setSelectedVoiceId(id); setShowVoiceSelector(false); }}
              isFacilitator={isFacilitator}
            />
          </div>
        </div>
      )}
    </div>
  );
}
