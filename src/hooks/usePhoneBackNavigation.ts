import { useEffect, useCallback, useRef } from 'react';

interface UsePhoneBackNavigationOptions {
  isOpen: boolean;
  onClose: () => void;
  modalId: string;
}

/**
 * Hook to handle phone back button/gesture navigation for modals
 * When a modal is open, pressing back will close the modal instead of navigating away
 */
export function usePhoneBackNavigation({ isOpen, onClose, modalId }: UsePhoneBackNavigationOptions) {
  const isOpenRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);
  const modalIdRef = useRef(modalId);

  // Keep refs in sync
  useEffect(() => {
    isOpenRef.current = isOpen;
    onCloseRef.current = onClose;
    modalIdRef.current = modalId;
  }, [isOpen, onClose, modalId]);

  // Handle popstate event (back button pressed)
  const handlePopState = useCallback((event: PopStateEvent) => {
    // Check if this modal is currently open
    if (isOpenRef.current) {
      // Close the modal
      onCloseRef.current();
      // Prevent default navigation by pushing state back
      // This keeps the user on the same page
      event.preventDefault();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Push a new history state to capture the back button
      const state = { modalId, isModal: true, timestamp: Date.now() };
      window.history.pushState(state, '', window.location.href);

      // Add popstate listener
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        
        // If the modal is being closed by something other than back button
        // (like clicking the X button), we need to clean up the history state
        // Check if there's a modal state in history that matches this modal
        const currentState = window.history.state;
        if (currentState?.modalId === modalId && currentState?.isModal) {
          // Go back one step to remove our pushed state
          window.history.back();
        }
      };
    }
  }, [isOpen, modalId, handlePopState]);

  // Also handle the hardware back button on Android via the beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isOpenRef.current) {
        // Close modal before page unloads
        onCloseRef.current();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}

/**
 * Hook specifically for managing multiple stacked modals
 * Useful when one modal can open another
 */
export function useModalStack() {
  const openModalsRef = useRef<Set<string>>(new Set());

  const openModal = useCallback((modalId: string) => {
    if (!openModalsRef.current.has(modalId)) {
      openModalsRef.current.add(modalId);
      const state = { modalId, isModal: true, timestamp: Date.now() };
      window.history.pushState(state, '', window.location.href);
    }
  }, []);

  const closeModal = useCallback((modalId: string, onClose?: () => void) => {
    if (openModalsRef.current.has(modalId)) {
      openModalsRef.current.delete(modalId);
      onClose?.();
      
      // Clean up history
      const currentState = window.history.state;
      if (currentState?.modalId === modalId) {
        window.history.back();
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Close the most recently opened modal
      const openModals = Array.from(openModalsRef.current);
      if (openModals.length > 0) {
        const lastModal = openModals[openModals.length - 1];
        openModalsRef.current.delete(lastModal);
        
        // Dispatch a custom event that the modal can listen to
        window.dispatchEvent(new CustomEvent('modalBackPressed', { detail: { modalId: lastModal } }));
        event.preventDefault();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return { openModal, closeModal, openModals: openModalsRef };
}
