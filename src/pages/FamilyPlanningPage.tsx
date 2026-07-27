import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Baby,
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
  subscribeToFamilyPlanningConversation,
  sendFamilyPlanningMessage,
  subscribeToUserFamilyPlanningInbox,
} from '../services/inboxService';
import VoiceRecorder from '../components/VoiceRecorder';
import VoicePlayer from '../components/VoicePlayer';
import VoiceSelector from '../components/VoiceSelector';
import { useVoiceNote } from '../hooks/useVoiceNote';

export default function FamilyPlanningPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session } = useEphemeralStore();
  const { chatSettings } = usePersistentStore();

  const isKinyarwanda = i18n.language === 'rw';
  const { voiceProfile, selectedVoiceId, setSelectedVoiceId, isFacilitator, showVoiceSelector, setShowVoiceSelector, handleVoiceSend } = useVoiceNote();

  const [counselors, setCounselors] = useState<Facilitator[]>([]);
  const [selectedCounselor, setSelectedCounselor] = useState<Facilitator | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [fpConversations, setFpConversations] = useState<InboxConversation[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingCounselors, setLoadingCounselors] = useState(true);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatSettings?.facilitators) {
      const fpCounselors = chatSettings.facilitators.filter(
        f => f.badges?.includes('P') || f.isFamilyPlanningCounselor
      );
      setCounselors(fpCounselors);
      setLoadingCounselors(false);
    } else {
      setLoadingCounselors(false);
    }
  }, [chatSettings]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const unsubscribe = subscribeToUserFamilyPlanningInbox(session.user.id, (conversations) => {
      setFpConversations(conversations);
    });
    return () => unsubscribe();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!selectedCounselor || !session?.user?.id) return;
    const unsubscribe = subscribeToFamilyPlanningConversation(
      session.user.id,
      selectedCounselor.userId,
      (msgs) => setMessages(msgs)
    );
    return () => unsubscribe();
  }, [selectedCounselor?.userId, session?.user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const result = await sendFamilyPlanningMessage(
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
        setTimeout(() => { setSendStatus('idle'); setStatusMessage(''); }, 2000);
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
      setStatusMessage(error?.message || (isKinyarwanda ? 'Habaye ikosa.' : 'Error sending message.'));
    }
  }, [messageInput, selectedCounselor, session?.user, isKinyarwanda]);

  if (!selectedCounselor) {
    return (
      <div className="min-h-full bg-slate-50 pb-24">
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/mpuza')} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <Baby className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{isKinyarwanda ? 'Kuboneza Urubyaro' : t('mpuza.familyPlanning')}</h1>
                <p className="text-xs text-slate-500">{isKinyarwanda ? 'Hitamo umujyanama' : 'Choose a Family Planning Counselor'}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden">
            <div className="bg-emerald-50 p-4 border-b border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                  <Baby className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-900">{isKinyarwanda ? 'Kuboneza Urubyaro' : 'Family Planning Support'}</h3>
                  <p className="text-xs text-emerald-600">{isKinyarwanda ? 'Hitamo umujyanama wawe' : 'Choose your Family Planning Counselor'}</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
                  <Lock className="w-3 h-3" />
                  {isKinyarwanda ? 'Ntibivugwa' : 'Private'}
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {loadingCounselors ? (
                <div className="text-center py-8 text-slate-400">{isKinyarwanda ? 'Gutegereza...' : 'Loading...'}</div>
              ) : counselors.length === 0 && fpConversations.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">
                    {isKinyarwanda ? 'Nta bajyanama baboneka ubu.' : 'No Family Planning Counselors available right now. Please check back later.'}
                  </p>
                </div>
              ) : (
                <>
                  {fpConversations.length > 0 && (
                    <>
                      <p className="text-sm font-medium text-slate-700 mb-3">{isKinyarwanda ? 'Ingingo zanyu' : 'Your Conversations'}</p>
                      {fpConversations.map((conv) => {
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
                                role: 'Family Planning Counselor',
                                badges: ['P'],
                              } as Facilitator;
                              setSelectedCounselor(selected);
                            }}
                            className="w-full flex items-center gap-4 p-4 bg-white border border-emerald-100 rounded-xl hover:shadow-md hover:border-emerald-300 transition-all text-left"
                          >
                            <div className="relative">
                              <img src={conv.participantAvatar || counselor?.userAvatar || '/default-avatar.png'} alt={conv.participantName} className="w-14 h-14 rounded-full object-cover" />
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center border-2 border-white">
                                <span className="text-white text-xs font-bold">P</span>
                              </div>
                              {counselor?.isOnline && (
                                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-800 truncate">{conv.participantName}</p>
                                  <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-xs rounded font-bold">P</span>
                                </div>
                                {conv.unreadCount > 0 && (
                                  <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">{conv.unreadCount}</span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 truncate mt-1">{conv.lastMessage}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{new Date(conv.lastMessageTimestamp).toLocaleDateString()}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </>
                  )}

                  {fpConversations.length > 0 && (
                    <div className="border-t border-slate-200 my-4 pt-4">
                      <p className="text-sm font-medium text-slate-700 mb-3">{isKinyarwanda ? 'Abajyanama baboneka' : 'Available Family Planning Counselors'}</p>
                    </div>
                  )}

                  {fpConversations.length === 0 && (
                    <p className="text-sm text-slate-600 mb-4">
                      {isKinyarwanda ? 'Hitamo umujyanama wawe.' : 'Choose a Family Planning Counselor to talk to. You can chat with any of them.'}
                    </p>
                  )}

                  {counselors
                    .filter(c => !fpConversations.some(conv => conv.participantId === c.userId))
                    .map((counselor) => (
                      <button
                        key={counselor.userId}
                        onClick={() => setSelectedCounselor(counselor)}
                        className="w-full flex items-center gap-4 p-4 bg-white border border-emerald-100 rounded-xl hover:shadow-md hover:border-emerald-300 transition-all text-left"
                      >
                        <div className="relative">
                          <img src={counselor.userAvatar || '/default-avatar.png'} alt={counselor.userName} className="w-14 h-14 rounded-full object-cover" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center border-2 border-white">
                            <span className="text-white text-xs font-bold">P</span>
                          </div>
                          {counselor.isOnline && (
                            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800">{counselor.userName}</p>
                            <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-xs rounded font-bold" title="Family Planning Counselor">P</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{counselor.bio || (isKinyarwanda ? 'Umujyanama wa Kuboneza' : 'Family Planning Counselor')}</p>
                          {counselor.isOnline && <p className="text-xs text-green-600 mt-1">{isKinyarwanda ? 'Ari online' : 'Online'}</p>}
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

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedCounselor(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-emerald-50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="relative">
              <img src={selectedCounselor.userAvatar || '/default-avatar.png'} alt={selectedCounselor.userName} className="w-10 h-10 rounded-full object-cover" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-white text-[10px] font-bold">P</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{selectedCounselor.userName}</h3>
                <span className="px-1 py-0.5 bg-emerald-600 text-white text-xs rounded font-bold">P</span>
              </div>
              <p className="text-xs text-slate-500">
                {selectedCounselor.isOnline ? (isKinyarwanda ? 'Ari online' : 'Online') : (isKinyarwanda ? 'Ntiyari online' : 'Offline')}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
              <Lock className="w-3 h-3" />
              {isKinyarwanda ? 'Ntibivugwa' : 'Private'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        <div ref={messagesContainerRef} className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-2xl border border-emerald-100 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">{isKinyarwanda ? 'Nta bwozi buriho. Tangira ubwanya!' : 'No messages yet. Start chatting!'}</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={cn('flex', message.senderId === session?.user?.id ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2',
                    message.senderId === session?.user?.id ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'
                  )}>
                    {message.type === 'voice' && message.voiceData ? (
                      <VoicePlayer
                        base64={message.voiceData}
                        duration={message.voiceDuration}
                        isOwn={message.senderId === session?.user?.id}
                        themeColor="#059669"
                      />
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <p className={cn('text-xs mt-1', message.senderId === session?.user?.id ? 'text-white/70' : 'text-slate-500')}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-2 sm:p-4 border-t border-emerald-100 bg-white">
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
                    return sendFamilyPlanningMessage(
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
                themeColor="#059669"
              />
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={isKinyarwanda ? 'Andika ubutumwa...' : 'Type message...'}
                disabled={sendStatus === 'sending'}
                className="flex-1 min-w-0 px-3 py-2 sm:px-4 sm:py-2 bg-slate-100 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || sendStatus === 'sending'}
                className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 bg-emerald-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-emerald-700 transition-colors shadow-md"
                title={isKinyarwanda ? 'Ohereza' : 'Send'}
              >
                {sendStatus === 'sending' ? (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                )}
              </button>
            </form>

            {statusMessage && (
              <div className={cn(
                'mt-2 text-center text-sm font-medium',
                sendStatus === 'sending' && 'text-emerald-600',
                sendStatus === 'sent' && 'text-green-600',
                sendStatus === 'error' && 'text-red-600'
              )}>
                {sendStatus === 'sending' && (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
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
