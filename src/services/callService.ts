/**
 * Call signaling over Firestore.
 *
 * WebRTC needs a way for two peers to exchange connection details before the
 * call starts. This module uses Firestore for that handshake:
 *
 *   1. Caller writes a call doc containing the SDP offer (status: 'ringing').
 *   2. Callee is subscribed to calls addressed to them, so their app rings.
 *   3. Callee writes the SDP answer and flips status to 'accepted'.
 *   4. Both sides stream ICE candidates into their own subcollection.
 *   5. Either side sets status to 'ended' to hang up.
 *
 * Once connected, audio flows peer-to-peer and never touches Firestore, so
 * call length has no effect on cost or storage.
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { CallSignal, CallStatus } from '../types';

const CALLS_COLLECTION = 'calls';

/** Calls older than this that are still 'ringing' are treated as stale. */
const RINGING_TIMEOUT_MS = 60_000;

function toIso(value: any): string {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function mapCall(id: string, data: any): CallSignal {
  return {
    id,
    callerId: data.callerId || '',
    callerName: data.callerName || '',
    callerAvatar: data.callerAvatar || '',
    callerIsFacilitator: data.callerIsFacilitator || false,
    calleeId: data.calleeId || '',
    calleeName: data.calleeName || '',
    calleeAvatar: data.calleeAvatar || '',
    calleeIsFacilitator: data.calleeIsFacilitator || false,
    status: (data.status || 'ringing') as CallStatus,
    useRealVoice: data.useRealVoice ?? true,
    voiceProfileId: data.voiceProfileId || undefined,
    offer: data.offer || undefined,
    answer: data.answer || undefined,
    createdAt: toIso(data.createdAt),
    answeredAt: data.answeredAt ? toIso(data.answeredAt) : undefined,
    endedAt: data.endedAt ? toIso(data.endedAt) : undefined,
    duration: data.duration ?? undefined,
    endedBy: data.endedBy || undefined,
  };
}

export interface CreateCallParams {
  callerId: string;
  callerName: string;
  callerAvatar: string;
  callerIsFacilitator: boolean;
  calleeId: string;
  calleeName: string;
  calleeAvatar: string;
  calleeIsFacilitator: boolean;
  useRealVoice: boolean;
  voiceProfileId?: string;
  offer: { type: string; sdp: string };
}

/** Create the call document that makes the callee's device ring. */
export async function createCall(params: CreateCallParams): Promise<string> {
  const ref = await addDoc(collection(db, CALLS_COLLECTION), {
    callerId: params.callerId,
    callerName: params.callerName,
    callerAvatar: params.callerAvatar,
    callerIsFacilitator: params.callerIsFacilitator,
    calleeId: params.calleeId,
    calleeName: params.calleeName,
    calleeAvatar: params.calleeAvatar,
    calleeIsFacilitator: params.calleeIsFacilitator,
    status: 'ringing' as CallStatus,
    useRealVoice: params.useRealVoice,
    voiceProfileId: params.voiceProfileId ?? null,
    offer: params.offer,
    createdAt: serverTimestamp(),
  });

  console.log('[callService] Call created:', ref.id);
  return ref.id;
}

/** Callee accepts: store the answer and mark the call accepted. */
export async function acceptCall(
  callId: string,
  answer: { type: string; sdp: string }
): Promise<void> {
  await updateDoc(doc(db, CALLS_COLLECTION, callId), {
    answer,
    status: 'accepted' as CallStatus,
    answeredAt: serverTimestamp(),
  });
  console.log('[callService] Call accepted:', callId);
}

/** Terminate a call with a specific outcome. */
export async function endCall(
  callId: string,
  status: Extract<CallStatus, 'declined' | 'ended' | 'missed' | 'failed' | 'busy'>,
  endedBy?: string,
  duration?: number
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      status,
      endedAt: serverTimestamp(),
    };
    if (endedBy) payload.endedBy = endedBy;
    if (typeof duration === 'number') payload.duration = Math.round(duration);

    await updateDoc(doc(db, CALLS_COLLECTION, callId), payload);
    console.log(`[callService] Call ${callId} -> ${status}`);
  } catch (error) {
    // A call may already be gone; hanging up must never throw at the UI.
    console.error('[callService] Failed to end call:', error);
  }
}

/** Watch a single call document for status/answer changes. */
export function subscribeToCall(
  callId: string,
  callback: (call: CallSignal | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, CALLS_COLLECTION, callId),
    (snapshot: any) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(mapCall(snapshot.id, snapshot.data()));
    },
    (error: any) => {
      console.error('[callService] Call listener error:', error);
      callback(null);
    }
  );
}

/**
 * Watch for incoming calls addressed to this user.
 * Stale 'ringing' calls are ignored so a crashed caller can't ring forever.
 */
export function subscribeToIncomingCalls(
  userId: string,
  callback: (call: CallSignal | null) => void
): Unsubscribe {
  const q = query(
    collection(db, CALLS_COLLECTION),
    where('calleeId', '==', userId),
    where('status', '==', 'ringing')
  );

  return onSnapshot(
    q,
    (snapshot: any) => {
      const now = Date.now();

      const fresh = snapshot.docs
        .map((d: any) => mapCall(d.id, d.data()))
        .filter((call: CallSignal) => {
          const age = now - new Date(call.createdAt).getTime();
          return age < RINGING_TIMEOUT_MS;
        })
        .sort(
          (a: CallSignal, b: CallSignal) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      callback(fresh[0] ?? null);
    },
    (error: any) => {
      console.error('[callService] Incoming call listener error:', error);
      callback(null);
    }
  );
}

// ============================================
// ICE CANDIDATES
// ============================================

type CandidateRole = 'caller' | 'callee';

function candidatesRef(callId: string, role: CandidateRole) {
  return collection(db, CALLS_COLLECTION, callId, `${role}Candidates`);
}

/** Publish a locally-discovered network route. */
export async function addIceCandidate(
  callId: string,
  role: CandidateRole,
  candidate: RTCIceCandidateInit
): Promise<void> {
  try {
    await addDoc(candidatesRef(callId, role), {
      ...candidate,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[callService] Failed to add ICE candidate:', error);
  }
}

/** Receive the other side's network routes as they are discovered. */
export function subscribeToIceCandidates(
  callId: string,
  role: CandidateRole,
  callback: (candidate: RTCIceCandidateInit) => void
): Unsubscribe {
  return onSnapshot(
    candidatesRef(callId, role),
    (snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        callback({
          candidate: data.candidate,
          sdpMid: data.sdpMid ?? undefined,
          sdpMLineIndex: data.sdpMLineIndex ?? undefined,
          usernameFragment: data.usernameFragment ?? undefined,
        });
      });
    },
    (error: any) => {
      console.error('[callService] ICE listener error:', error);
    }
  );
}

/** Read a call once, e.g. to check it is still ringing before answering. */
export async function getCall(callId: string): Promise<CallSignal | null> {
  try {
    const snapshot = await getDoc(doc(db, CALLS_COLLECTION, callId));
    if (!snapshot.exists()) return null;
    return mapCall(snapshot.id, snapshot.data());
  } catch (error) {
    console.error('[callService] Failed to read call:', error);
    return null;
  }
}

/** Mark that this user is currently busy on another call. */
export async function markBusy(callId: string): Promise<void> {
  await endCall(callId, 'busy');
}

/** Ensure a call document exists before writing to it (defensive). */
export async function ensureCallDoc(callId: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, CALLS_COLLECTION, callId));
  return snapshot.exists();
}

/** Overwrite the offer, used when renegotiating after a reconnect. */
export async function updateOffer(
  callId: string,
  offer: { type: string; sdp: string }
): Promise<void> {
  await setDoc(doc(db, CALLS_COLLECTION, callId), { offer }, { merge: true });
}
