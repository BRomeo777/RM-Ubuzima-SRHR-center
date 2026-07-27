/**
 * Global call orchestrator.
 *
 * Mounted once at app level so a call survives page navigation and so an
 * incoming call rings no matter where the user is. Pages never own call state;
 * they only register a request via `useCallStore`.
 *
 * Voice policy:
 * - A facilitator placing a call chooses real or disguised voice up front.
 * - A non-facilitator placing a call is always disguised, protecting them by
 *   default. The facilitator can still switch the mode once connected.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Mic, X } from 'lucide-react';
import { useEphemeralStore, usePersistentStore } from '../store';
import { useCallStore, type CallTarget } from '../store/callStore';
import { useCall } from '../hooks/useCall';
import { subscribeToIncomingCalls, endCall } from '../services/callService';
import { FACILITATOR_VOICE_PROFILE } from '../utils/voiceProcessor';
import IncomingCallModal from './IncomingCallModal';
import CallScreen from './CallScreen';
import { cn } from '../utils/helpers';
import type { CallSignal } from '../types';

export default function CallManager() {
  const { session } = useEphemeralStore();
  const { isUserFacilitator } = usePersistentStore();
  const { i18n } = useTranslation();
  const isKinyarwanda = i18n.language === 'rw';

  const currentUser = session?.user;
  const isFacilitator = currentUser
    ? isUserFacilitator(currentUser.id, currentUser)
    : false;

  const pendingTarget = useCallStore((s) => s.pendingTarget);
  const clearRequest = useCallStore((s) => s.clearRequest);

  const [incoming, setIncoming] = useState<CallSignal | null>(null);
  const [voiceChoiceFor, setVoiceChoiceFor] = useState<CallTarget | null>(null);

  const {
    phase,
    call,
    duration,
    isMuted,
    quality,
    isCaller,
    usingRealVoice,
    canToggleVoice,
    error,
    startCall,
    answerCall,
    declineCall,
    hangUp,
    toggleMute,
    setUseRealVoice,
    reset,
  } = useCall(currentUser?.id);

  const isBusy = phase !== 'idle' && phase !== 'ended';

  /**
   * Read inside the Firestore listener without making it a dependency.
   * Resubscribing on every phase change caused the listener to replay a call
   * we had just answered and wrongly flag it as busy.
   */
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = isBusy;
  }, [isBusy]);

  /**
   * Calls this device has already acted on. The accepted call stays 'ringing'
   * in Firestore for the moment it takes to capture the mic and build an
   * answer, so without this guard we would mark our own call busy and kill it.
   */
  const handledCallIds = useRef<Set<string>>(new Set());

  // ============================================
  // INCOMING CALLS
  // ============================================
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = subscribeToIncomingCalls(currentUser.id, (incomingCall) => {
      if (!incomingCall) {
        setIncoming(null);
        return;
      }

      // Never react twice to a call we are already answering or declining.
      if (handledCallIds.current.has(incomingCall.id)) return;

      // Genuinely on another call: tell the caller we're busy.
      if (busyRef.current) {
        handledCallIds.current.add(incomingCall.id);
        void endCall(incomingCall.id, 'busy');
        return;
      }

      setIncoming(incomingCall);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // ============================================
  // OUTGOING REQUESTS FROM PAGES
  // ============================================
  useEffect(() => {
    if (!pendingTarget || !currentUser) return;

    // Consume the request immediately so it cannot fire twice.
    clearRequest();

    if (isBusy) return;

    if (isFacilitator) {
      // Facilitator decides the voice mode before dialing.
      setVoiceChoiceFor(pendingTarget);
    } else {
      // Community members are always disguised.
      void startCall({
        callerId: currentUser.id,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatar || '',
        callerIsFacilitator: false,
        calleeId: pendingTarget.userId,
        calleeName: pendingTarget.userName,
        calleeAvatar: pendingTarget.userAvatar,
        calleeIsFacilitator: pendingTarget.isFacilitator,
        useRealVoice: false,
        voiceProfileId: FACILITATOR_VOICE_PROFILE.id,
      });
    }
  }, [pendingTarget, currentUser, isFacilitator, isBusy, clearRequest, startCall]);

  // Auto-dismiss the ended screen after a moment.
  useEffect(() => {
    if (phase !== 'ended') return;
    const timer = setTimeout(() => reset(), 3500);
    return () => clearTimeout(timer);
  }, [phase, reset]);

  const dialWithVoice = useCallback(
    (useRealVoice: boolean) => {
      const target = voiceChoiceFor;
      setVoiceChoiceFor(null);
      if (!target || !currentUser) return;

      void startCall({
        callerId: currentUser.id,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatar || '',
        callerIsFacilitator: true,
        calleeId: target.userId,
        calleeName: target.userName,
        calleeAvatar: target.userAvatar,
        calleeIsFacilitator: target.isFacilitator,
        useRealVoice,
        voiceProfileId: useRealVoice ? undefined : FACILITATOR_VOICE_PROFILE.id,
      });
    },
    [voiceChoiceFor, currentUser, startCall]
  );

  const handleAccept = useCallback(() => {
    if (!incoming) return;
    const toAnswer = incoming;
    // Claim it before answering so the listener cannot flag it busy.
    handledCallIds.current.add(toAnswer.id);
    setIncoming(null);
    void answerCall(toAnswer);
  }, [incoming, answerCall]);

  const handleDecline = useCallback(() => {
    if (!incoming) return;
    const toDecline = incoming;
    handledCallIds.current.add(toDecline.id);
    setIncoming(null);
    void declineCall(toDecline);
  }, [incoming, declineCall]);

  if (!currentUser) return null;

  // Who is on the other end of the active call?
  const peerName = call ? (isCaller ? call.calleeName : call.callerName) : '';
  const peerAvatar = call ? (isCaller ? call.calleeAvatar : call.callerAvatar) : '';

  return (
    <>
      {/* Pre-call voice choice (facilitators only) */}
      {voiceChoiceFor && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {isKinyarwanda ? 'Hamagara' : 'Start call'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {voiceChoiceFor.userName}
                </p>
              </div>
              <button
                onClick={() => setVoiceChoiceFor(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex-shrink-0"
                aria-label="Cancel"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {isKinyarwanda
                  ? 'Hitamo ijwi rizakoreshwa muri iki kiganiro.'
                  : 'Choose the voice used for this call.'}
              </p>

              <button
                onClick={() => dialWithVoice(false)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors',
                  'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
                  'dark:border-emerald-800 dark:hover:bg-emerald-900/20'
                )}
              >
                <span className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-gray-900 dark:text-white">
                    {isKinyarwanda ? 'Ijwi ryahinduwe' : 'Disguised voice'}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {isKinyarwanda ? 'Amajwi yombi ahindurwa' : 'Both voices are altered'}
                  </span>
                </span>
              </button>

              <button
                onClick={() => dialWithVoice(true)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors',
                  'border-amber-200 hover:border-amber-400 hover:bg-amber-50',
                  'dark:border-amber-800 dark:hover:bg-amber-900/20'
                )}
              >
                <span className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-gray-900 dark:text-white">
                    {isKinyarwanda ? 'Ijwi nyaryo' : 'Real voice'}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {isKinyarwanda ? 'Amajwi nyayo yumvikana' : 'Real voices are heard'}
                  </span>
                </span>
              </button>

              <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                {isKinyarwanda
                  ? 'Ushobora guhindura mu gihe cy\u2019ikiganiro.'
                  : 'You can switch during the call.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Incoming call ring */}
      {incoming && !isBusy && (
        <IncomingCallModal
          call={incoming}
          onAccept={handleAccept}
          onDecline={handleDecline}
          isKinyarwanda={isKinyarwanda}
        />
      )}

      {/* Active / ended call */}
      {phase !== 'idle' && (
        <CallScreen
          call={call}
          phase={phase}
          duration={duration}
          isMuted={isMuted}
          quality={quality}
          isCaller={isCaller}
          usingRealVoice={usingRealVoice}
          canToggleVoice={canToggleVoice || (isFacilitator && phase === 'connected')}
          error={error}
          peerName={peerName}
          peerAvatar={peerAvatar}
          onHangUp={() => void hangUp()}
          onToggleMute={toggleMute}
          onSetUseRealVoice={setUseRealVoice}
          onClose={reset}
          isKinyarwanda={isKinyarwanda}
        />
      )}
    </>
  );
}
