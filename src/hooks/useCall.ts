/**
 * WebRTC voice call engine.
 *
 * Handles the full lifecycle for both sides of a 1:1 call:
 * dialing, ringing, answering, connecting, talking, and hanging up.
 *
 * Audio flows peer-to-peer once connected, so calls can run indefinitely at
 * no bandwidth cost to us (except for the minority of calls that need a TURN
 * relay). Nothing about the audio is ever stored.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  createCall,
  acceptCall,
  endCall,
  subscribeToCall,
  addIceCandidate,
  subscribeToIceCandidates,
} from '../services/callService';
import {
  createCallAudio,
  pitchRatioForVoice,
  startRingback,
  playEndTone,
  type CallAudioPipeline,
} from '../utils/callAudio';
import { tuneAudioSdp, applySenderBitrate } from '../utils/callSdp';
import type { CallSignal, CallPhase, CallQuality } from '../types';
import type { Unsubscribe } from 'firebase/firestore';

/**
 * ICE servers. STUN is free and handles most connections. TURN is required for
 * the ~10-20% of networks (notably carrier-grade NAT, common on mobile in
 * Rwanda) where a direct peer-to-peer path cannot be established.
 *
 * Configure TURN via env vars; without it those users cannot connect at all.
 */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnPass = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: turnUser || undefined,
      credential: turnPass || undefined,
    });
  } else {
    console.warn(
      '[useCall] No TURN server configured (VITE_TURN_URL). Calls will fail on restrictive networks.'
    );
  }

  return servers;
}

export interface UseCallResult {
  phase: CallPhase;
  call: CallSignal | null;
  /** Seconds since the call connected. */
  duration: number;
  isMuted: boolean;
  quality: CallQuality;
  /** True when this device is the one that placed the call. */
  isCaller: boolean;
  /** False while the call is using disguised voice. */
  usingRealVoice: boolean;
  /** Only facilitators may change this mid-call. */
  canToggleVoice: boolean;
  error: string | null;

  startCall: (params: StartCallParams) => Promise<void>;
  answerCall: (call: CallSignal) => Promise<void>;
  declineCall: (call: CallSignal) => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  setUseRealVoice: (real: boolean) => void;
  reset: () => void;
}

export interface StartCallParams {
  callerId: string;
  callerName: string;
  callerAvatar: string;
  callerIsFacilitator: boolean;
  calleeId: string;
  calleeName: string;
  calleeAvatar: string;
  calleeIsFacilitator: boolean;
  /** Facilitator's choice for this call. */
  useRealVoice: boolean;
  voiceProfileId?: string;
}

export function useCall(currentUserId: string | undefined): UseCallResult {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [call, setCall] = useState<CallSignal | null>(null);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [quality, setQuality] = useState<CallQuality>('good');
  const [isCaller, setIsCaller] = useState(false);
  const [usingRealVoice, setUsingRealVoice] = useState(true);
  const [canToggleVoice, setCanToggleVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<CallAudioPipeline | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callIdRef = useRef<string | null>(null);
  const unsubCallRef = useRef<Unsubscribe | null>(null);
  const unsubIceRef = useRef<Unsubscribe | null>(null);
  const ringbackRef = useRef<{ stop(): void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const teardownRef = useRef<() => void>(() => {});

  /** Stop every resource this call is holding. Safe to call repeatedly. */
  const teardown = useCallback(() => {
    if (unsubCallRef.current) {
      unsubCallRef.current();
      unsubCallRef.current = null;
    }
    if (unsubIceRef.current) {
      unsubIceRef.current();
      unsubIceRef.current = null;
    }
    if (ringbackRef.current) {
      ringbackRef.current.stop();
      ringbackRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (statsRef.current) {
      clearInterval(statsRef.current);
      statsRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.stop();
      audioRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    connectedAtRef.current = null;
    pendingIceRef.current = [];
  }, []);

  teardownRef.current = teardown;

  // Guarantee cleanup if the app unmounts mid-call.
  useEffect(() => {
    return () => {
      teardownRef.current();
    };
  }, []);

  const startDurationTimer = useCallback(() => {
    if (timerRef.current) return;
    connectedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (connectedAtRef.current) {
        setDuration((Date.now() - connectedAtRef.current) / 1000);
      }
    }, 500);
  }, []);

  /** Sample WebRTC stats so the UI can warn about a bad connection. */
  const startQualityMonitor = useCallback(() => {
    if (statsRef.current) return;
    let lastLost = 0;
    let lastReceived = 0;

    statsRef.current = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type !== 'inbound-rtp' || report.kind !== 'audio') return;

          const lost = report.packetsLost ?? 0;
          const received = report.packetsReceived ?? 0;
          const deltaLost = lost - lastLost;
          const deltaReceived = received - lastReceived;
          lastLost = lost;
          lastReceived = received;

          if (deltaReceived <= 0) return;
          const lossRate = deltaLost / (deltaLost + deltaReceived);

          setQuality(lossRate > 0.08 ? 'poor' : lossRate > 0.03 ? 'fair' : 'good');
        });
      } catch {
        // Stats are best-effort only.
      }
    }, 3000);
  }, []);

  /** Attach the remote audio to a hidden element so it actually plays. */
  const attachRemoteStream = useCallback((stream: MediaStream) => {
    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    // Never mute or lower this; it is the other person's voice.
    audio.volume = 1.0;
    void audio.play().catch((err) => {
      console.error('[useCall] Remote audio playback blocked:', err);
    });
    remoteAudioRef.current = audio;
  }, []);

  const createPeerConnection = useCallback(
    (callId: string, role: 'caller' | 'callee') => {
      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void addIceCandidate(callId, role, event.candidate.toJSON());
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) attachRemoteStream(stream);
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('[useCall] Connection state:', state);

        if (state === 'connected') {
          if (ringbackRef.current) {
            ringbackRef.current.stop();
            ringbackRef.current = null;
          }
          setPhase('connected');
          startDurationTimer();
          startQualityMonitor();
        } else if (state === 'failed') {
          setError(
            'Could not connect. The network may be blocking the call.'
          );
          setPhase('ended');
          void endCall(callId, 'failed', currentUserId);
          teardown();
        } else if (state === 'disconnected') {
          setQuality('poor');
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [attachRemoteStream, startDurationTimer, startQualityMonitor, teardown, currentUserId]
  );

  /** Buffer ICE candidates that arrive before the remote description is set. */
  const addRemoteCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc) return;

    if (!pc.remoteDescription) {
      pendingIceRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('[useCall] Failed to add ICE candidate:', err);
    }
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;

    const pending = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[useCall] Failed to flush ICE candidate:', err);
      }
    }
  }, []);

  // ============================================
  // OUTGOING
  // ============================================

  const startCall = useCallback(
    async (params: StartCallParams) => {
      setError(null);
      setDuration(0);
      setIsCaller(true);
      setPhase('dialing');
      setUsingRealVoice(params.useRealVoice);
      setCanToggleVoice(params.callerIsFacilitator);

      try {
        const ratio = pitchRatioForVoice(params.useRealVoice, params.voiceProfileId);
        const audio = await createCallAudio(ratio);
        audioRef.current = audio;
        setIsMuted(false);

        // Create the connection before we have a call id by deferring ICE.
        const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
        pcRef.current = pc;
        pc.addTrack(audio.outboundTrack);

        pc.ontrack = (event) => {
          const [stream] = event.streams;
          if (stream) attachRemoteStream(stream);
        };

        const rawOffer = await pc.createOffer({ offerToReceiveAudio: true });

        // Tune Opus for low data and loss resilience before it is negotiated.
        const offer = {
          type: rawOffer.type,
          sdp: tuneAudioSdp(rawOffer.sdp || ''),
        };
        await pc.setLocalDescription(offer);

        // Belt-and-braces cap that the browser enforces directly.
        const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (audioSender) await applySenderBitrate(audioSender);

        const callId = await createCall({
          callerId: params.callerId,
          callerName: params.callerName,
          callerAvatar: params.callerAvatar,
          callerIsFacilitator: params.callerIsFacilitator,
          calleeId: params.calleeId,
          calleeName: params.calleeName,
          calleeAvatar: params.calleeAvatar,
          calleeIsFacilitator: params.calleeIsFacilitator,
          useRealVoice: params.useRealVoice,
          voiceProfileId: params.voiceProfileId,
          offer: { type: offer.type, sdp: offer.sdp || '' },
        });
        callIdRef.current = callId;

        // Now that we have an id, wire up ICE and connection monitoring.
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            void addIceCandidate(callId, 'caller', event.candidate.toJSON());
          }
        };
        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          if (state === 'connected') {
            if (ringbackRef.current) {
              ringbackRef.current.stop();
              ringbackRef.current = null;
            }
            setPhase('connected');
            startDurationTimer();
            startQualityMonitor();
          } else if (state === 'failed') {
            setError('Could not connect. The network may be blocking the call.');
            setPhase('ended');
            void endCall(callId, 'failed', params.callerId);
            teardown();
          }
        };

        setPhase('ringing');
        ringbackRef.current = startRingback();

        // React to the callee answering, declining, or the call ending.
        unsubCallRef.current = subscribeToCall(callId, async (updated) => {
          if (!updated) return;
          setCall(updated);

          if (updated.status === 'accepted' && updated.answer && !pc.currentRemoteDescription) {
            setPhase('connecting');
            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription({
                  type: updated.answer.type as RTCSdpType,
                  sdp: updated.answer.sdp,
                })
              );
              await flushPendingCandidates();
            } catch (err) {
              console.error('[useCall] Failed to apply answer:', err);
              setError('Failed to establish the call.');
            }
          } else if (
            updated.status === 'declined' ||
            updated.status === 'ended' ||
            updated.status === 'busy' ||
            updated.status === 'missed'
          ) {
            if (updated.status === 'declined') setError('Call declined.');
            if (updated.status === 'busy') setError('User is on another call.');
            setPhase('ended');
            playEndTone();
            teardown();
          }
        });

        unsubIceRef.current = subscribeToIceCandidates(callId, 'callee', (candidate) => {
          void addRemoteCandidate(candidate);
        });
      } catch (err: any) {
        console.error('[useCall] Failed to start call:', err);
        setError(err?.message || 'Could not start the call.');
        setPhase('ended');
        teardown();
      }
    },
    [
      attachRemoteStream,
      addRemoteCandidate,
      flushPendingCandidates,
      startDurationTimer,
      startQualityMonitor,
      teardown,
    ]
  );

  // ============================================
  // INCOMING
  // ============================================

  const answerCall = useCallback(
    async (incoming: CallSignal) => {
      setError(null);
      setDuration(0);
      setIsCaller(false);
      setCall(incoming);
      setPhase('connecting');
      setUsingRealVoice(incoming.useRealVoice);
      // The facilitator decides the voice mode; the other party cannot change it.
      setCanToggleVoice(incoming.calleeIsFacilitator && !incoming.callerIsFacilitator);

      callIdRef.current = incoming.id;

      try {
        if (!incoming.offer) {
          throw new Error('Call is missing connection details.');
        }

        const ratio = pitchRatioForVoice(incoming.useRealVoice, incoming.voiceProfileId);
        const audio = await createCallAudio(ratio);
        audioRef.current = audio;
        setIsMuted(false);

        const pc = createPeerConnection(incoming.id, 'callee');
        pc.addTrack(audio.outboundTrack);

        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: incoming.offer.type as RTCSdpType,
            sdp: incoming.offer.sdp,
          })
        );

        const rawAnswer = await pc.createAnswer();

        // Match the caller's low-data Opus configuration.
        const answer = {
          type: rawAnswer.type,
          sdp: tuneAudioSdp(rawAnswer.sdp || ''),
        };
        await pc.setLocalDescription(answer);

        const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (audioSender) await applySenderBitrate(audioSender);

        await flushPendingCandidates();

        await acceptCall(incoming.id, {
          type: answer.type,
          sdp: answer.sdp || '',
        });

        unsubCallRef.current = subscribeToCall(incoming.id, (updated) => {
          if (!updated) return;
          setCall(updated);
          if (
            updated.status === 'ended' ||
            updated.status === 'declined' ||
            updated.status === 'failed'
          ) {
            setPhase('ended');
            playEndTone();
            teardown();
          }
        });

        unsubIceRef.current = subscribeToIceCandidates(incoming.id, 'caller', (candidate) => {
          void addRemoteCandidate(candidate);
        });
      } catch (err: any) {
        console.error('[useCall] Failed to answer call:', err);
        setError(err?.message || 'Could not answer the call.');
        setPhase('ended');
        void endCall(incoming.id, 'failed', currentUserId);
        teardown();
      }
    },
    [
      createPeerConnection,
      addRemoteCandidate,
      flushPendingCandidates,
      teardown,
      currentUserId,
    ]
  );

  const declineCall = useCallback(
    async (incoming: CallSignal) => {
      await endCall(incoming.id, 'declined', currentUserId);
      setPhase('idle');
      setCall(null);
      teardown();
    },
    [currentUserId, teardown]
  );

  const hangUp = useCallback(async () => {
    const callId = callIdRef.current;
    const elapsed = connectedAtRef.current
      ? (Date.now() - connectedAtRef.current) / 1000
      : 0;

    if (callId) {
      // Never connected means the callee never picked up.
      const status = connectedAtRef.current ? 'ended' : isCaller ? 'missed' : 'declined';
      await endCall(callId, status, currentUserId, elapsed);
    }

    setPhase('ended');
    playEndTone();
    teardown();
  }, [currentUserId, isCaller, teardown]);

  // ============================================
  // CONTROLS
  // ============================================

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !audio.isMuted();
    audio.setMuted(next);
    setIsMuted(next);
  }, []);

  /**
   * Switch between real and disguised voice mid-call. Instant, because it only
   * changes an AudioParam on the worklet already in the chain.
   */
  const setUseRealVoice = useCallback(
    (real: boolean) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (!audio.canDisguise && !real) {
        setError('This call started with your real voice and cannot be disguised.');
        return;
      }

      const ratio = real ? 1 : pitchRatioForVoice(false, call?.voiceProfileId);
      audio.setPitchRatio(ratio);
      setUsingRealVoice(real);
    },
    [call?.voiceProfileId]
  );

  const reset = useCallback(() => {
    teardown();
    callIdRef.current = null;
    setPhase('idle');
    setCall(null);
    setDuration(0);
    setIsMuted(false);
    setQuality('good');
    setError(null);
    setIsCaller(false);
  }, [teardown]);

  return {
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
  };
}
