/**
 * Call audio pipeline.
 *
 * Responsibilities:
 * - Capture the microphone with settings tuned for clear voice calls.
 * - Optionally route it through a realtime pitch-shifting AudioWorklet so a
 *   caller's real voice is never transmitted.
 * - Produce a MediaStreamTrack suitable for RTCPeerConnection.
 * - Generate phone-like ringtones without shipping any audio assets.
 *
 * The pitch shift can be toggled live mid-call by changing an AudioParam,
 * so switching between real and disguised voice is instant and seamless.
 */

import { FACILITATOR_VOICE_PROFILE, getVoiceProfileById } from './voiceProcessor';

const WORKLET_URL = '/audio/pitchShiftWorklet.js';
const PROCESSOR_NAME = 'pitch-shift-processor';

export interface CallAudioPipeline {
  /** Track to send over the peer connection. */
  outboundTrack: MediaStreamTrack;
  /** Switch between real and disguised voice at any time. */
  setPitchRatio(ratio: number): void;
  /** Mute/unmute the microphone. */
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  /** True when a pitch-shifting worklet is actually in the chain. */
  canDisguise: boolean;
  /** Release the microphone and audio graph. */
  stop(): void;
}

/**
 * Microphone constraints tuned for voice calls. Echo cancellation and noise
 * suppression are essential for clarity; 48kHz mono keeps Opus efficient.
 */
const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
};

/**
 * Build the outbound audio pipeline.
 *
 * @param pitchRatio 1 = real voice; anything else disguises it.
 */
export async function createCallAudio(pitchRatio: number): Promise<CallAudioPipeline> {
  const micStream = await navigator.mediaDevices.getUserMedia({
    audio: MIC_CONSTRAINTS,
    video: false,
  });

  const micTrack = micStream.getAudioTracks()[0];
  if (!micTrack) {
    micStream.getTracks().forEach((t) => t.stop());
    throw new Error('No microphone track available');
  }

  // Real voice requested: send the mic straight through. Nothing to build.
  if (pitchRatio === 1) {
    return {
      outboundTrack: micTrack,
      setPitchRatio: () => {
        // Cannot disguise without a worklet in the chain; caller should have
        // built the pipeline with a shift if it wants to toggle later.
        console.warn('[callAudio] Pipeline built for real voice only; rebuild to disguise.');
      },
      setMuted: (muted: boolean) => {
        micTrack.enabled = !muted;
      },
      isMuted: () => !micTrack.enabled,
      canDisguise: false,
      stop: () => micStream.getTracks().forEach((t) => t.stop()),
    };
  }

  const audioContext = new AudioContext({ sampleRate: 48000 });

  let worklet: AudioWorkletNode;
  try {
    await audioContext.audioWorklet.addModule(WORKLET_URL);
    worklet = new AudioWorkletNode(audioContext, PROCESSOR_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
  } catch (error) {
    // Without the worklet we cannot disguise the voice. Fail loudly rather
    // than silently transmitting someone's real voice.
    await audioContext.close();
    micStream.getTracks().forEach((t) => t.stop());
    console.error('[callAudio] Failed to load pitch-shift worklet:', error);
    throw new Error(
      'Voice disguise is not supported in this browser. Use a real-voice call or try Chrome.'
    );
  }

  const source = audioContext.createMediaStreamSource(micStream);
  const destination = audioContext.createMediaStreamDestination();

  source.connect(worklet);
  worklet.connect(destination);

  const pitchParam = worklet.parameters.get('pitchRatio');
  if (pitchParam) {
    pitchParam.value = pitchRatio;
  }

  const outboundTrack = destination.stream.getAudioTracks()[0];
  if (!outboundTrack) {
    await audioContext.close();
    micStream.getTracks().forEach((t) => t.stop());
    throw new Error('Failed to build processed audio track');
  }

  let muted = false;

  return {
    outboundTrack,
    setPitchRatio: (ratio: number) => {
      if (pitchParam) {
        pitchParam.value = Math.max(0.5, Math.min(2.0, ratio));
      }
    },
    setMuted: (value: boolean) => {
      muted = value;
      // Mute at the source so no audio reaches the processor at all.
      micTrack.enabled = !value;
    },
    isMuted: () => muted,
    canDisguise: true,
    stop: () => {
      try {
        source.disconnect();
        worklet.disconnect();
      } catch {
        // Already torn down.
      }
      micStream.getTracks().forEach((t) => t.stop());
      void audioContext.close();
    },
  };
}

/** Pitch ratio for a given voice profile id, or 1 for real voice. */
export function pitchRatioForVoice(useRealVoice: boolean, voiceProfileId?: string): number {
  if (useRealVoice) return 1;
  const profile = (voiceProfileId ? getVoiceProfileById(voiceProfileId) : undefined)
    ?? FACILITATOR_VOICE_PROFILE;
  return profile.playbackRate;
}

// ============================================
// RINGTONE / TONES
// ============================================

interface ToneController {
  stop(): void;
}

/**
 * Classic two-tone phone ring (440Hz + 480Hz), 2s on / 4s off, looped.
 * Generated with oscillators so no audio files are needed.
 */
export function startRingtone(): ToneController {
  let stopped = false;
  let context: AudioContext | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    context = new AudioContext();
  } catch {
    return { stop: () => undefined };
  }

  const ctx = context;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.frequency.value = 440;
  osc2.frequency.value = 480;
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.connect(master);
  osc2.connect(master);
  osc1.start();
  osc2.start();

  const ringOnce = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    // 2 seconds of ring with soft edges to avoid clicks.
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.18, now + 0.05);
    master.gain.setValueAtTime(0.18, now + 1.95);
    master.gain.linearRampToValueAtTime(0, now + 2.0);

    timer = setTimeout(ringOnce, 6000); // 2s ring + 4s silence
  };

  ringOnce();

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      try {
        osc1.stop();
        osc2.stop();
      } catch {
        // Already stopped.
      }
      void ctx.close();
    },
  };
}

/** Outgoing ringback tone heard by the caller while waiting. */
export function startRingback(): ToneController {
  let stopped = false;
  let context: AudioContext | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    context = new AudioContext();
  } catch {
    return { stop: () => undefined };
  }

  const ctx = context;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.frequency.value = 425;
  osc.type = 'sine';
  osc.connect(master);
  osc.start();

  const beep = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.12, now + 0.05);
    master.gain.setValueAtTime(0.12, now + 0.95);
    master.gain.linearRampToValueAtTime(0, now + 1.0);

    timer = setTimeout(beep, 4000); // 1s tone + 3s silence
  };

  beep();

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      try {
        osc.stop();
      } catch {
        // Already stopped.
      }
      void ctx.close();
    },
  };
}

/** Short descending tone signalling the call ended. */
export function playEndTone(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(250, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
    setTimeout(() => void ctx.close(), 500);
  } catch {
    // Non-critical.
  }
}

/** Format seconds as m:ss or h:mm:ss for the in-call timer. */
export function formatCallDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
