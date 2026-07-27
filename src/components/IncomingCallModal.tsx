/**
 * Full-screen incoming call screen, styled like a native phone call.
 * Rings audibly and vibrates where supported.
 */

import { useEffect, useRef } from 'react';
import { Phone, PhoneOff, ShieldCheck, Mic } from 'lucide-react';
import { cn } from '../utils/helpers';
import { startRingtone } from '../utils/callAudio';
import type { CallSignal } from '../types';

interface IncomingCallModalProps {
  call: CallSignal;
  onAccept: () => void;
  onDecline: () => void;
  isKinyarwanda?: boolean;
}

export default function IncomingCallModal({
  call,
  onAccept,
  onDecline,
  isKinyarwanda = false,
}: IncomingCallModalProps) {
  const ringRef = useRef<{ stop(): void } | null>(null);

  useEffect(() => {
    ringRef.current = startRingtone();

    // Vibrate in a ring-like pattern where supported (mobile).
    let vibrateTimer: ReturnType<typeof setInterval> | null = null;
    if ('vibrate' in navigator) {
      const pattern = [400, 200, 400, 2000];
      navigator.vibrate(pattern);
      vibrateTimer = setInterval(() => navigator.vibrate(pattern), 3000);
    }

    return () => {
      ringRef.current?.stop();
      ringRef.current = null;
      if (vibrateTimer) clearInterval(vibrateTimer);
      if ('vibrate' in navigator) navigator.vibrate(0);
    };
  }, []);

  const label = call.callerIsFacilitator
    ? isKinyarwanda ? 'Umujyanama' : 'Facilitator'
    : isKinyarwanda ? 'Umukoresha' : 'Community member';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-12">
      {/* Caller identity */}
      <div className="flex flex-col items-center gap-4 mt-8">
        <p className="text-sm text-white/60 tracking-wide uppercase">
          {isKinyarwanda ? 'Guhamagara kwinjira' : 'Incoming voice call'}
        </p>

        <div className="relative mt-4">
          {/* Pulsing rings */}
          <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
          <span
            className="absolute -inset-4 rounded-full bg-emerald-400/10 animate-ping"
            style={{ animationDelay: '0.4s' }}
          />
          <img
            src={call.callerAvatar || '/default-avatar.png'}
            alt={call.callerName}
            className="relative w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-2xl"
          />
        </div>

        <h2 className="text-2xl font-semibold mt-4">{call.callerName}</h2>
        <span className="px-3 py-1 rounded-full bg-white/10 text-xs text-white/80">
          {label}
        </span>

        {/* Voice mode disclosure: the callee must know whether their real
            voice will be transmitted before they answer. */}
        <div
          className={cn(
            'flex items-center gap-2 mt-6 px-4 py-2.5 rounded-xl text-sm',
            call.useRealVoice
              ? 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
              : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
          )}
        >
          {call.useRealVoice ? (
            <>
              <Mic className="w-4 h-4 flex-shrink-0" />
              <span>
                {isKinyarwanda
                  ? 'Ijwi ryawo nyaryo rizumvikana'
                  : 'Your real voice will be heard'}
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>
                {isKinyarwanda
                  ? 'Ijwi ryawe rizahindurwa'
                  : 'Your voice will be disguised'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Answer / decline */}
      <div className="flex items-center justify-center gap-16 mb-8">
        <button
          onClick={onDecline}
          className="flex flex-col items-center gap-3 group"
          aria-label={isKinyarwanda ? 'Kwanga' : 'Decline'}
        >
          <span className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl transition-transform group-active:scale-90">
            <PhoneOff className="w-7 h-7" />
          </span>
          <span className="text-xs text-white/70">
            {isKinyarwanda ? 'Kwanga' : 'Decline'}
          </span>
        </button>

        <button
          onClick={onAccept}
          className="flex flex-col items-center gap-3 group"
          aria-label={isKinyarwanda ? 'Kwakira' : 'Answer'}
        >
          <span className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-xl transition-transform group-active:scale-90 animate-bounce">
            <Phone className="w-7 h-7" />
          </span>
          <span className="text-xs text-white/70">
            {isKinyarwanda ? 'Kwakira' : 'Answer'}
          </span>
        </button>
      </div>
    </div>
  );
}
