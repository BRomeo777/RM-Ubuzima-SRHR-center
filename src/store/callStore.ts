/**
 * Lightweight store used to request a call from anywhere in the app.
 *
 * Pages don't own the call UI — they just register a request here, and the
 * globally-mounted CallManager picks it up. That keeps a single call engine and
 * a single audio pipeline no matter which page the user is on.
 */

import { create } from 'zustand';

export interface CallTarget {
  userId: string;
  userName: string;
  userAvatar: string;
  isFacilitator: boolean;
}

interface CallStoreState {
  /** Set when a page wants to place a call; cleared once handled. */
  pendingTarget: CallTarget | null;
  requestCall: (target: CallTarget) => void;
  clearRequest: () => void;
}

export const useCallStore = create<CallStoreState>((set) => ({
  pendingTarget: null,
  requestCall: (target) => set({ pendingTarget: target }),
  clearRequest: () => set({ pendingTarget: null }),
}));

/** Convenience hook for pages: `const startCall = useStartCall()`. */
export function useStartCall() {
  return useCallStore((state) => state.requestCall);
}
