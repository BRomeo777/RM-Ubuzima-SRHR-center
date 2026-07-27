/**
 * Voice Processor Utility
 * 
 * Handles:
 * - Audio recording via MediaRecorder
 * - Pitch shifting for voice anonymization using OfflineAudioContext
 * - Re-encoding processed audio to WebM for compression
 * - Base64 encoding for Firestore storage
 * - Audio playback with Web Audio API
 * 
 * Voice anonymization: The real voice is NEVER stored. Audio is pitch-shifted
 * before encoding, so the stored/sent audio is already anonymized.
 */

// ============================================
// VOICE PROFILES
// ============================================

export interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  playbackRate: number;
  isFacilitatorOnly?: boolean;
  color: string;
}

export const USER_VOICE_PROFILES: VoiceProfile[] = [
  { id: 'voice-deep', name: 'Deep', description: 'Deep, calm voice', playbackRate: 0.82, color: '#7c3aed' },
  { id: 'voice-warm', name: 'Warm', description: 'Warm, friendly voice', playbackRate: 0.90, color: '#0891b2' },
  { id: 'voice-neutral', name: 'Neutral', description: 'Balanced, neutral voice', playbackRate: 1.06, color: '#059669' },
  { id: 'voice-bright', name: 'Bright', description: 'Bright, clear voice', playbackRate: 1.18, color: '#d97706' },
  { id: 'voice-high', name: 'High', description: 'High, energetic voice', playbackRate: 1.30, color: '#e11d48' },
];

export const FACILITATOR_VOICE_PROFILE: VoiceProfile = {
  id: 'facilitator-voice',
  name: 'Facilitator',
  description: 'Unique facilitator voice',
  playbackRate: 0.78,
  isFacilitatorOnly: true,
  color: '#2563eb',
};

export const ALL_VOICE_PROFILES = [...USER_VOICE_PROFILES, FACILITATOR_VOICE_PROFILE];

// ============================================
// LIMITS
// ============================================

/** Output sample rate. 10 kHz preserves speech intelligibility while staying small. */
export const VOICE_SAMPLE_RATE = 10000;

/** Hard cap on recording length so encoded audio always fits in a Firestore document. */
export const MAX_RECORDING_SECONDS = 30;

/** Firestore documents are capped at 1 MB; stay well under it. */
export const MAX_VOICE_BASE64_BYTES = 900_000;

export const VOICE_MIME_TYPE = 'audio/wav';

export function getVoiceProfileById(id: string): VoiceProfile | undefined {
  return ALL_VOICE_PROFILES.find(v => v.id === id);
}

export function getVoiceProfilesForUser(isFacilitator: boolean): VoiceProfile[] {
  if (isFacilitator) {
    return [FACILITATOR_VOICE_PROFILE];
  }
  return USER_VOICE_PROFILES;
}

// ============================================
// RECORDING
// ============================================

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStream: MediaStream | null = null;
let recordingStartTime: number = 0;
let lastRecordingDuration: number = 0;

export async function startRecording(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
      },
    });

    recordingStream = stream;
    audioChunks = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    mediaRecorder.start(100); // Collect data in 100ms chunks
    recordingStartTime = Date.now();
    lastRecordingDuration = 0;
  } catch (error: any) {
    console.error('[voiceProcessor] Error starting recording:', error);
    throw new Error(`Failed to access microphone: ${error.message}`);
  }
}

export function stopRecording(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const recorder = mediaRecorder;
    const chunks = audioChunks;
    const stream = recordingStream;

    if (!recorder || recorder.state === 'inactive') {
      reject(new Error('Not recording'));
      return;
    }

    // Take ownership of this session's state immediately. Without this, a
    // concurrent cancelRecording() (e.g. from a React cleanup) would reset
    // audioChunks before the final 'dataavailable' fires, leaving us with a
    // headerless fragment that fails to decode.
    mediaRecorder = null;
    audioChunks = [];
    recordingStream = null;

    const mimeType = recorder.mimeType || 'audio/webm';

    // Re-bind so trailing data lands in this session's array, not the fresh one.
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });

      lastRecordingDuration = recordingStartTime
        ? (Date.now() - recordingStartTime) / 1000
        : lastRecordingDuration;
      recordingStartTime = 0;

      stream?.getTracks().forEach(track => track.stop());

      resolve(blob);
    };

    recorder.onerror = () => {
      stream?.getTracks().forEach(track => track.stop());
      reject(new Error('Recording failed'));
    };

    recorder.stop();
  });
}

export function cancelRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.onstop = null;
    mediaRecorder.stop();
  }
  if (recordingStream) {
    recordingStream.getTracks().forEach(track => track.stop());
    recordingStream = null;
  }
  mediaRecorder = null;
  audioChunks = [];
  recordingStartTime = 0;
  lastRecordingDuration = 0;
}

export function getRecordingDuration(): number {
  if (!recordingStartTime) return lastRecordingDuration;
  return (Date.now() - recordingStartTime) / 1000;
}

export function isRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}

// ============================================
// PITCH SHIFTING + ENCODING
// ============================================

/**
 * Process audio with pitch shifting using OfflineAudioContext.
 * The audio is pitch-shifted and re-encoded to WebM for compression.
 * The original (real) voice is NEVER stored or sent.
 * 
 * @param audioBlob - Original recorded audio blob
 * @param playbackRate - Pitch shift factor (0.78 = deeper, 1.30 = higher)
 * @returns Base64-encoded WebM audio string
 */
export async function processAndEncodeVoice(
  audioBlob: Blob,
  playbackRate: number
): Promise<{ base64: string; duration: number; size: number }> {
  try {
    // 1. Read blob as ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    console.log(
      `[voiceProcessor] Decoding recording: ${audioBlob.type || 'unknown type'}, ${arrayBuffer.byteLength} bytes`
    );

    if (arrayBuffer.byteLength === 0) {
      throw new Error('Recording was empty. Please try again.');
    }

    // 2. Decode to AudioBuffer
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (decodeError) {
      await audioContext.close();
      console.error(
        `[voiceProcessor] decodeAudioData failed for ${audioBlob.type || 'unknown type'} (${arrayBuffer.byteLength} bytes)`,
        decodeError
      );
      throw new Error(
        'Could not read the recording. Your browser may not support this audio format.'
      );
    }

    // 3. Create OfflineAudioContext for pitch shifting
    const targetSampleRate = VOICE_SAMPLE_RATE;
    const renderedLength = Math.ceil(audioBuffer.duration * targetSampleRate / playbackRate);

    const offlineCtx = new OfflineAudioContext(1, renderedLength, targetSampleRate);

    // 4. Create buffer source with pitch shift
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackRate;
    source.connect(offlineCtx.destination);
    source.start(0);

    // 5. Render the pitch-shifted audio
    const renderedBuffer = await offlineCtx.startRendering();

    // 6. Encode to WAV. Synchronous, so this is instant — unlike MediaRecorder,
    //    which can only re-encode in real time (a 30s note took 30s).
    const wavBuffer = encodeAudioBufferToWav(renderedBuffer);

    // 7. Convert to base64
    const base64 = arrayBufferToBase64(wavBuffer);

    // Clean up
    await audioContext.close();

    if (base64.length > MAX_VOICE_BASE64_BYTES) {
      throw new Error(
        `Voice note is too long to send. Please keep it under ${MAX_RECORDING_SECONDS} seconds.`
      );
    }

    const duration = renderedBuffer.duration;
    const size = wavBuffer.byteLength;

    console.log(`[voiceProcessor] Encoded voice: ${duration.toFixed(1)}s, ${(size / 1024).toFixed(1)}KB, pitch: ${playbackRate}`);

    return { base64, duration, size };
  } catch (error: any) {
    console.error('[voiceProcessor] Error processing voice:', error);
    throw new Error(`Failed to process voice: ${error.message}`);
  }
}

/**
 * Encode an AudioBuffer to a 16-bit mono PCM WAV.
 * Runs synchronously, so a 30s note encodes in milliseconds.
 */
function encodeAudioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const samples = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const dataLength = samples.length * 2;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return arrayBuffer;
}

/**
 * Convert an ArrayBuffer to a base64 string synchronously.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Convert a base64 string back to a Blob
 */
export function base64ToBlob(base64: string, mimeType: string = VOICE_MIME_TYPE): Blob {
  const byteCharacters = atob(base64);
  const bytes = new Uint8Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    bytes[i] = byteCharacters.charCodeAt(i);
  }

  return new Blob([bytes.buffer], { type: mimeType });
}

/**
 * Create a playable URL from base64 audio data
 */
export function createAudioURL(base64: string, mimeType: string = VOICE_MIME_TYPE): string {
  const blob = base64ToBlob(base64, mimeType);
  return URL.createObjectURL(blob);
}

// ============================================
// PLAYBACK
// ============================================

export interface VoiceHandle {
  pause(): void;
  resume(): void;
  stop(): void;
  isPlaying(): boolean;
}

interface PlaybackCallbacks {
  /** Playback reached the end naturally. */
  onEnded?: () => void;
  /** Another voice note took over playback, or stop() was called. */
  onStopped?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

/** Only one voice note plays at a time across the whole app. */
let currentHandle: VoiceHandle | null = null;

export function playVoice(
  base64: string,
  callbacks: PlaybackCallbacks = {}
): Promise<VoiceHandle> {
  return new Promise((resolve, reject) => {
    // Stop whatever is playing and notify its owner so its UI resets.
    stopAudio();

    const url = createAudioURL(base64);
    const audio = new Audio(url);
    let released = false;

    const release = () => {
      if (released) return;
      released = true;
      URL.revokeObjectURL(url);
      if (currentHandle === handle) currentHandle = null;
    };

    const handle: VoiceHandle = {
      pause: () => audio.pause(),
      resume: () => {
        void audio.play().catch(() => undefined);
      },
      stop: () => {
        audio.pause();
        release();
        callbacks.onStopped?.();
      },
      isPlaying: () => !audio.paused && !audio.ended,
    };

    audio.onended = () => {
      release();
      callbacks.onEnded?.();
    };
    audio.ontimeupdate = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      callbacks.onTimeUpdate?.(audio.currentTime, dur);
    };
    audio.onerror = () => {
      release();
      reject(new Error('Failed to play voice note'));
    };

    currentHandle = handle;

    audio
      .play()
      .then(() => resolve(handle))
      .catch((err) => {
        release();
        reject(err);
      });
  });
}

/** Stop the voice note that is currently playing, if any. */
export function stopAudio(): void {
  const handle = currentHandle;
  currentHandle = null;
  handle?.stop();
}

// ============================================
// PREVIEW (for voice selection)
// ============================================

/**
 * Preview a voice profile by pitch-shifting a sample audio.
 * Uses a short generated tone to demonstrate the pitch.
 */
export async function previewVoiceProfile(profile: VoiceProfile): Promise<void> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 1.5; // 1.5 seconds
    const sampleLength = Math.ceil(duration * sampleRate);

    // Generate a simple tone that sounds vaguely voice-like
    const buffer = audioContext.createBuffer(1, sampleLength, sampleRate);
    const data = buffer.getChannelData(0);

    // A 150 Hz fundamental plus harmonics approximates a voice better than a
    // pure sine. Amplitudes are kept well below 1.0 to avoid clipping.
    const fundamentalHz = 150;
    for (let i = 0; i < sampleLength; i++) {
      const t = i / sampleRate;
      const fundamental = 1.0 * Math.sin(2 * Math.PI * fundamentalHz * t);
      const harmonic1 = 0.5 * Math.sin(2 * Math.PI * fundamentalHz * 2 * t);
      const harmonic2 = 0.3 * Math.sin(2 * Math.PI * fundamentalHz * 3 * t);
      // Amplitude envelope at 3 Hz, mimicking syllables
      const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t);
      data[i] = ((fundamental + harmonic1 + harmonic2) / 1.8) * envelope * 0.35;
    }

    // Play with pitch shift
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = profile.playbackRate;
    source.connect(audioContext.destination);
    source.start();

    source.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    console.error('[voiceProcessor] Error previewing voice:', error);
  }
}

// ============================================
// FORMAT HELPERS
// ============================================

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
