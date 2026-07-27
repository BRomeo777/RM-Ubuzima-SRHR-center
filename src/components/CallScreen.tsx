/**
 * Active call screen: status, timer, connection quality, and controls.
 * Facilitators get a live toggle between their real and disguised voice.
 */

import { PhoneOff, Mic, MicOff, ShieldCheck, Signal, AlertTriangle, Volume2 } from 'lucide-react';
import { cn } from '../utils/helpers';
import { formatCallDuration } from '../utils/callAudio';
import type { CallPhase, CallQuality, CallSignal } from '../types';

interface CallScreenProps {
  call: CallSignal | null;
  phase: CallPhase;
  duration: number;
  isMuted: boolean;
  quality: CallQuality;
  isCaller: boolean;
  usingRealVoice: boolean;
  canToggleVoice: boolean;
  error: string | null;
  peerName: string;
  peerAvatar: string;
  onHangUp: () => void;
  onToggleMute: () => void;
  onSetUseRealVoice: (real: boolean) => void;
  onClose: () => void;
  isKinyarwanda?: boolean;
}

export default function CallScreen({
  call,
  phase,
  duration,
  isMuted,
  quality,
  isCaller,
  usingRealVoice,
  canToggleVoice,
  error,
  peerName,
  peerAvatar,
  onHangUp,
  onToggleMute,
  onSetUseRealVoice,
  onClose,
  isKinyarwanda = false,
}: CallScreenProps) {
  const statusText = (() => {
    if (error) return error;
    switch (phase) {
      case 'dialing':
        return isKinyarwanda ? 'Turahamagara...' : 'Calling...';
      case 'ringing':
        return isKinyarwanda ? 'Birahamagara...' : 'Ringing...';
      case 'connecting':
        return isKinyarwanda ? 'Turahuza...' : 'Connecting...';
      case 'connected':
        return formatCallDuration(duration);
      case 'ended':
        return isKinyarwanda ? 'Guhamagara byarangiye' : 'Call ended';
      default:
        return '';
    }
  })();

  const isOver = phase === 'ended';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-12">
      {/* Peer identity + status */}
      <div className="flex flex-col items-center gap-4 mt-10">
        <div className="relative">
          {phase === 'connected' && (
            <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-pulse" />
          )}
          <img
            src={peerAvatar || '/default-avatar.png'}
            alt={peerName}
            className="relative w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-2xl"
          />
        </div>

        <h2 className="text-2xl font-semibold mt-3">{peerName}</h2>

        <p
          className={cn(
            'text-base tabular-nums',
            error ? 'text-red-300' : 'text-white/70'
          )}
        >
          {statusText}
        </p>

        {/* Voice mode indicator — always visible so nobody is surprised
            about whether their real voice is being transmitted. */}
        <div
          className={cn(
            'flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm',
            usingRealVoice
              ? 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
              : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
          )}
        >
          {usingRealVoice ? (
            <>
              <Mic className="w-4 h-4" />
              <span>{isKinyarwanda ? 'Ijwi nyaryo' : 'Real voice'}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>{isKinyarwanda ? 'Ijwi ryahinduwe' : 'Voice disguised'}</span>
            </>
          )}
        </div>

        {/* Connection quality warning */}
        {phase === 'connected' && quality !== 'good' && (
          <div
            className={cn(
              'flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs',
              quality === 'poor'
                ? 'bg-red-500/15 text-red-200'
                : 'bg-amber-500/15 text-amber-200'
            )}
          >
            {quality === 'poor' ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <Signal className="w-3.5 h-3.5" />
            )}
            <span>
              {quality === 'poor'
                ? isKinyarwanda ? 'Umuyoboro mubi' : 'Poor connection'
                : isKinyarwanda ? 'Umuyoboro uringaniye' : 'Unstable connection'}
            </span>
          </div>
        )}
      </div>

      {/* Facilitator-only live voice switch */}
      {canToggleVoice && !isOver && (
        <div className="w-full max-w-sm bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className="text-xs text-white/50 mb-3 text-center">
            {isKinyarwanda ? 'Hitamo ijwi rikoreshwa' : 'Voice used in this call'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSetUseRealVoice(false)}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors',
                !usingRealVoice
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              {isKinyarwanda ? 'Ryahinduwe' : 'Disguised'}
            </button>
            <button
              onClick={() => onSetUseRealVoice(true)}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors',
                usingRealVoice
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              )}
            >
              <Mic className="w-4 h-4" />
              {isKinyarwanda ? 'Nyaryo' : 'Real'}
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-8 mb-6">
        {!isOver && (
          <button
            onClick={onToggleMute}
            className={cn(
              'flex flex-col items-center gap-2 group',
              isMuted && 'text-red-300'
            )}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            <span
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center transition-transform group-active:scale-90',
                isMuted ? 'bg-red-500/80' : 'bg-white/10 hover:bg-white/20'
              )}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </span>
            <span className="text-xs text-white/70">
              {isMuted
                ? isKinyarwanda ? 'Fungura' : 'Unmute'
                : isKinyarwanda ? 'Nyamucyecyekere' : 'Mute'}
            </span>
          </button>
        )}

        <button
          onClick={isOver ? onClose : onHangUp}
          className="flex flex-col items-center gap-2 group"
          aria-label={isOver ? 'Close' : 'End call'}
        >
          <span className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl transition-transform group-active:scale-90">
            <PhoneOff className="w-7 h-7" />
          </span>
          <span className="text-xs text-white/70">
            {isOver
              ? isKinyarwanda ? 'Funga' : 'Close'
              : isKinyarwanda ? 'Hagarika' : 'End'}
          </span>
        </button>

        {!isOver && (
          <div className="flex flex-col items-center gap-2 opacity-40">
            <span className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <Volume2 className="w-6 h-6" />
            </span>
            <span className="text-xs text-white/70">
              {isKinyarwanda ? 'Ijwi' : 'Speaker'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
