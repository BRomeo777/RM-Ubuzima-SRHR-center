import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { cn } from '../utils/helpers';
import { playVoice, formatDuration, type VoiceHandle } from '../utils/voiceProcessor';

interface VoicePlayerProps {
  base64: string;
  duration?: number;
  isOwn?: boolean;
  themeColor?: string;
}

export default function VoicePlayer({
  base64,
  duration: initialDuration = 0,
  isOwn = false,
  themeColor = '#3b82f6',
}: VoicePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const handleRef = useRef<VoiceHandle | null>(null);

  // Only tear down this player's own audio on unmount.
  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, []);

  const handlePlay = useCallback(async () => {
    if (loading || error) return;

    // Genuine pause/resume: keep position instead of resetting to 0.
    if (handleRef.current) {
      if (playing) {
        handleRef.current.pause();
        setPlaying(false);
      } else {
        handleRef.current.resume();
        setPlaying(true);
      }
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const handle = await playVoice(base64, {
        onEnded: () => {
          handleRef.current = null;
          setPlaying(false);
          setCurrentTime(0);
        },
        onStopped: () => {
          handleRef.current = null;
          setPlaying(false);
          setCurrentTime(0);
        },
        onTimeUpdate: (time, dur) => {
          setCurrentTime(time);
          if (dur > 0) setDuration(dur);
        },
      });
      handleRef.current = handle;
      setPlaying(true);
    } catch (e) {
      console.error('[VoicePlayer] Playback error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [base64, playing, loading, error]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayTime = playing ? currentTime : (duration || initialDuration);
  const waveBars = 28;

  return (
    <div className={cn(
      'flex items-center gap-2.5 rounded-2xl px-3 py-2 min-w-[180px] max-w-[260px]',
      isOwn ? 'bg-white/15' : 'bg-black/5'
    )}>
      {/* Play/Pause button */}
      <button
        onClick={handlePlay}
        disabled={loading || error}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
          error ? 'bg-red-100 text-red-500' : 'text-white shadow-sm'
        )}
        style={!error ? { backgroundColor: themeColor } : undefined}
        title={error ? 'Playback error' : playing ? 'Pause' : 'Play'}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : error ? (
          <span className="text-xs">!</span>
        ) : playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Waveform + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[2px] h-8">
          {[...Array(waveBars)].map((_, i) => {
            // Generate pseudo-random heights based on index
            const seedHeight = 3 + Math.abs(Math.sin(i * 0.7 + 1.2)) * 5 + Math.abs(Math.cos(i * 1.3)) * 3;
            const barProgress = (i / waveBars) * 100;
            const isPlayed = barProgress < progress;
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-full transition-colors',
                  isPlayed
                    ? isOwn ? 'bg-white/80' : 'bg-slate-600'
                    : isOwn ? 'bg-white/30' : 'bg-slate-300'
                )}
                style={{ height: `${seedHeight * 2}px` }}
              />
            );
          })}
        </div>
        {/* Time */}
        <div className={cn(
          'text-[10px] mt-0.5 tabular-nums',
          isOwn ? 'text-white/70' : 'text-slate-500'
        )}>
          {formatDuration(displayTime)}
        </div>
      </div>
    </div>
  );
}
