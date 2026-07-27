import { useState } from 'react';
import { Check, Volume2, Loader2, Mic } from 'lucide-react';
import { cn } from '../utils/helpers';
import {
  USER_VOICE_PROFILES,
  FACILITATOR_VOICE_PROFILE,
  previewVoiceProfile,
  type VoiceProfile,
} from '../utils/voiceProcessor';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onSelect: (voiceId: string) => void;
  isFacilitator: boolean;
  themeColor?: string;
}

export default function VoiceSelector({
  selectedVoiceId,
  onSelect,
  isFacilitator,
  themeColor = '#3b82f6',
}: VoiceSelectorProps) {
  const [previewing, setPreviewing] = useState<string | null>(null);

  const voices = isFacilitator
    ? [FACILITATOR_VOICE_PROFILE]
    : USER_VOICE_PROFILES;

  const handlePreview = async (voice: VoiceProfile) => {
    if (previewing) return;
    setPreviewing(voice.id);
    try {
      await previewVoiceProfile(voice);
      // Wait a bit for the preview to finish
      setTimeout(() => setPreviewing(null), 2000);
    } catch (e) {
      setPreviewing(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Mic className="w-4 h-4 text-slate-500" />
        <p className="text-sm font-medium text-slate-700">
          {isFacilitator ? 'Facilitator Voice' : 'Choose Your Voice'}
        </p>
      </div>

      {isFacilitator && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-2">
          As a facilitator, you have a unique voice that only facilitators can use. Users cannot use this voice.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2">
        {voices.map((voice) => {
          const isSelected = selectedVoiceId === voice.id;
          const isPreviewing = previewing === voice.id;

          return (
            <div
              key={voice.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer',
                isSelected
                  ? 'border-2 bg-opacity-5'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              )}
              style={isSelected ? { borderColor: voice.color, backgroundColor: `${voice.color}0D` } : undefined}
              onClick={() => onSelect(voice.id)}
            >
              {/* Selected indicator */}
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  isSelected ? 'border-transparent' : 'border-slate-300'
                )}
                style={isSelected ? { backgroundColor: voice.color } : undefined}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              {/* Voice info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{voice.name}</p>
                <p className="text-xs text-slate-500">{voice.description}</p>
              </div>

              {/* Preview button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(voice);
                }}
                disabled={isPreviewing}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ backgroundColor: isPreviewing ? voice.color : `${voice.color}1A` }}
                title="Preview voice"
              >
                {isPreviewing ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: voice.color }} />
                ) : (
                  <Volume2 className="w-4 h-4" style={{ color: voice.color }} />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {!isFacilitator && (
        <p className="text-xs text-slate-400 mt-2">
          Your real voice is never heard. The selected voice profile is applied to all your voice notes.
        </p>
      )}
    </div>
  );
}
