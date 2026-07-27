import { useState, useCallback, useMemo } from 'react';
import { usePersistentStore, useEphemeralStore } from '../store';
import {
  getVoiceProfileById,
  FACILITATOR_VOICE_PROFILE,
  USER_VOICE_PROFILES,
} from '../utils/voiceProcessor';

/**
 * Hook to manage voice note functionality in chat pages.
 * Returns the selected voice profile, a function to send voice messages,
 * and whether the current user is a facilitator.
 */
export function useVoiceNote() {
  const { selectedVoiceId, setSelectedVoiceId, isUserFacilitator } = usePersistentStore();
  const { session } = useEphemeralStore();
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);

  const currentUser = session?.user;
  const isFacilitator = currentUser?.id
    ? isUserFacilitator(currentUser.id, currentUser)
    : false;

  // Facilitators always use the facilitator voice. Everyone else is resolved
  // against the user profiles only, so a stale or tampered stored id can never
  // grant access to the facilitator-only voice.
  const voiceProfile = useMemo(() => {
    if (isFacilitator) return FACILITATOR_VOICE_PROFILE;

    const selected = getVoiceProfileById(selectedVoiceId);
    if (selected && !selected.isFacilitatorOnly) return selected;

    return USER_VOICE_PROFILES[0];
  }, [isFacilitator, selectedVoiceId]);

  const effectiveVoiceId = voiceProfile.id;

  // Guard the setter too: users cannot opt into the facilitator voice.
  const selectVoice = useCallback(
    (id: string) => {
      if (isFacilitator) return;
      const profile = getVoiceProfileById(id);
      if (!profile || profile.isFacilitatorOnly) return;
      setSelectedVoiceId(id);
    },
    [isFacilitator, setSelectedVoiceId]
  );

  const handleVoiceSend = useCallback(
    async (
      base64: string,
      duration: number,
      sendFn: (params: {
        content: string;
        type: 'voice';
        voiceData: string;
        voiceDuration: number;
        voiceProfileId: string;
      }) => Promise<any>
    ) => {
      try {
        await sendFn({
          content: `🎤 Voice note (${duration.toFixed(0)}s)`,
          type: 'voice',
          voiceData: base64,
          voiceDuration: duration,
          voiceProfileId: effectiveVoiceId,
        });
      } catch (error) {
        console.error('[useVoiceNote] Failed to send voice:', error);
        throw error;
      }
    },
    [effectiveVoiceId]
  );

  return {
    voiceProfile,
    selectedVoiceId: effectiveVoiceId,
    setSelectedVoiceId: selectVoice,
    isFacilitator,
    showVoiceSelector,
    setShowVoiceSelector,
    handleVoiceSend,
  };
}
