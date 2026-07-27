import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, X, Send, Loader2 } from 'lucide-react';
import { cn } from '../utils/helpers';
import {
  startRecording,
  stopRecording,
  cancelRecording,
  getRecordingDuration,
  isRecording,
  processAndEncodeVoice,
  formatDuration,
  MAX_RECORDING_SECONDS,
  type VoiceProfile,
} from '../utils/voiceProcessor';

interface VoiceRecorderProps {
  voiceProfile: VoiceProfile;
  onSend: (base64: string, duration: number) => void;
  disabled?: boolean;
  themeColor?: string;
}

export default function VoiceRecorder({
  voiceProfile,
  onSend,
  disabled = false,
  themeColor = '#3b82f6',
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [processing, setProcessing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopAndSendRef = useRef<() => void>(() => {});
  const recordingRef = useRef(false);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  // Unmount only. Depending on `recording` here would fire cancelRecording()
  // the moment a recording ends, destroying the audio mid-send.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) cancelRecording();
    };
  }, []);

  const handleStartRecording = useCallback(async () => {
    if (disabled || processing) return;
    try {
      await startRecording();
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        const elapsed = getRecordingDuration();
        setDuration(elapsed);
        // Auto-send at the cap so the encoded note always fits in Firestore.
        if (elapsed >= MAX_RECORDING_SECONDS) {
          stopAndSendRef.current();
        }
      }, 100);
    } catch (error: any) {
      console.error('[VoiceRecorder] Failed to start recording:', error);
      alert(error.message || 'Failed to access microphone. Please check permissions.');
    }
  }, [disabled, processing]);

  const handleStopAndSend = useCallback(async () => {
    if (!recording || processing) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const finalDuration = getRecordingDuration();
    setRecording(false);
    setProcessing(true);

    try {
      const blob = await stopRecording();
      
      if (blob.size < 100) {
        setProcessing(false);
        return;
      }

      const { base64, duration: encodedDuration } = await processAndEncodeVoice(
        blob,
        voiceProfile.playbackRate
      );

      onSend(base64, encodedDuration);
    } catch (error: any) {
      console.error('[VoiceRecorder] Failed to process voice:', error);
      alert(error.message || 'Failed to process voice note.');
    } finally {
      setProcessing(false);
      setDuration(0);
    }
  }, [recording, processing, voiceProfile, onSend]);

  // Keep the auto-stop callback current without re-creating the interval.
  useEffect(() => {
    stopAndSendRef.current = handleStopAndSend;
  }, [handleStopAndSend]);

  const handleCancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cancelRecording();
    setRecording(false);
    setDuration(0);
  }, []);

  // Recording state - show timer + cancel + send
  if (recording) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-red-50 rounded-full border border-red-200">
        {/* Recording indicator */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-xs font-mono text-red-600 tabular-nums">
            {formatDuration(duration)}
          </span>
          <span className="text-[10px] text-red-400 tabular-nums flex-shrink-0">
            /{formatDuration(MAX_RECORDING_SECONDS)}
          </span>
          {/* Waveform animation */}
          <div className="flex items-center gap-0.5 ml-1">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="w-0.5 bg-red-400 rounded-full"
                style={{
                  height: `${4 + Math.sin(Date.now() / 200 + i) * 4 + 4}px`,
                  animation: `voiceWave 0.5s ease-in-out ${i * 0.1}s infinite alternate`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Cancel button */}
        <button
          onClick={handleCancel}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 transition-colors flex-shrink-0"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5 text-red-600" />
        </button>

        {/* Send button */}
        <button
          onClick={handleStopAndSend}
          className="w-7 h-7 flex items-center justify-center rounded-full text-white transition-colors flex-shrink-0 shadow-sm"
          style={{ backgroundColor: themeColor }}
          title="Send voice note"
        >
          <Send className="w-3.5 h-3.5" />
        </button>

        <style>{`
          @keyframes voiceWave {
            0% { height: 4px; }
            100% { height: 14px; }
          }
        `}</style>
      </div>
    );
  }

  // Processing state
  if (processing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
        <span className="text-xs text-slate-500">Processing...</span>
      </div>
    );
  }

  // Idle state - show mic button
  return (
    <button
      onClick={handleStartRecording}
      disabled={disabled}
      className={cn(
        'w-9 h-9 flex items-center justify-center rounded-full transition-all flex-shrink-0',
        disabled
          ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95'
      )}
      title="Record voice note"
    >
      <Mic className="w-4 h-4" />
    </button>
  );
}
