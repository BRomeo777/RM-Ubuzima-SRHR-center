import { useState, useEffect, useCallback } from 'react';

// Platform detection types
type Platform = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
type Browser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'opera' | 'unknown';

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  platform: Platform;
  browser: Browser;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  deferredPrompt: any;
}

interface UsePWAInstallReturn extends PWAInstallState {
  install: () => Promise<boolean>;
  dismissIOSPrompt: () => void;
  showIOSInstructions: boolean;
}

// Detect platform
function detectPlatform(): Platform {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();

  // iOS detection (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/.test(userAgent) || 
      (platform === 'macintel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }

  // Android detection
  if (/android/.test(userAgent)) {
    return 'android';
  }

  // Windows detection
  if (/win32|win64|windows/.test(platform) || /windows/.test(userAgent)) {
    return 'windows';
  }

  // macOS detection
  if (/macintosh|mac os x/.test(userAgent) || platform === 'macintel') {
    return 'macos';
  }

  // Linux detection
  if (/linux/.test(platform) || /linux/.test(userAgent)) {
    return 'linux';
  }

  return 'unknown';
}

// Detect browser
function detectBrowser(): Browser {
  const userAgent = navigator.userAgent.toLowerCase();

  // Samsung Internet
  if (/samsungbrowser/.test(userAgent)) {
    return 'samsung';
  }

  // Opera
  if (/opr|opera/.test(userAgent)) {
    return 'opera';
  }

  // Edge
  if (/edg/.test(userAgent)) {
    return 'edge';
  }

  // Chrome (check before Safari because Chrome on iOS includes Safari)
  if (/chrome|crios/.test(userAgent) && !/edg|opr|opera/.test(userAgent)) {
    return 'chrome';
  }

  // Safari (must be checked after Chrome on iOS)
  if (/safari/.test(userAgent) && /apple computer/.test(userAgent)) {
    return 'safari';
  }

  // Firefox
  if (/firefox|fxios/.test(userAgent)) {
    return 'firefox';
  }

  return 'unknown';
}

// Check if running in standalone mode (installed PWA)
function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true || // iOS standalone mode
    document.referrer.includes('android-app://')
  );
}

// Check if iOS can install (must be Safari)
function canInstallOnIOS(): boolean {
  const browser = detectBrowser();
  const platform = detectPlatform();
  
  // iOS requires Safari for PWA installation
  // Chrome and other browsers on iOS also support PWAs but use WebKit
  return platform === 'ios';
}

// Check if Android can install
function canInstallOnAndroid(): boolean {
  const platform = detectPlatform();
  return platform === 'android';
}

// Check if desktop can install
function canInstallOnDesktop(): boolean {
  const platform = detectPlatform();
  return platform === 'windows' || platform === 'macos' || platform === 'linux';
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [state, setState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    platform: 'unknown',
    browser: 'unknown',
    isIOS: false,
    isAndroid: false,
    isStandalone: false,
    deferredPrompt: null,
  });

  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Initialize platform detection
  useEffect(() => {
    const platform = detectPlatform();
    const browser = detectBrowser();
    const isStandalone = isStandaloneMode();

    setState(prev => ({
      ...prev,
      platform,
      browser,
      isIOS: platform === 'ios',
      isAndroid: platform === 'android',
      isInstalled: isStandalone,
      isStandalone,
    }));
  }, []);

  // Listen for beforeinstallprompt (Android/Chrome/Desktop)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      
      setState(prev => ({
        ...prev,
        deferredPrompt: e,
        isInstallable: true,
      }));
    };

    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null,
      }));
      setShowIOSInstructions(false);
    };

    // Check if already installed
    if (isStandaloneMode()) {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
      }));
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle platform-specific installation
  const install = useCallback(async (): Promise<boolean> => {
    const { platform, deferredPrompt, isStandalone } = state;

    // Already installed
    if (isStandalone) {
      return true;
    }

    // iOS Safari - Show manual instructions
    if (platform === 'ios') {
      setShowIOSInstructions(true);
      return false; // Installation requires manual user action
    }

    // Android/Chrome/Desktop with deferred prompt
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        setState(prev => ({
          ...prev,
          deferredPrompt: null,
          isInstallable: outcome === 'dismissed',
          isInstalled: outcome === 'accepted',
        }));

        return outcome === 'accepted';
      } catch (error) {
        console.error('PWA install error:', error);
        return false;
      }
    }

    // No installation method available
    return false;
  }, [state]);

  const dismissIOSPrompt = useCallback(() => {
    setShowIOSInstructions(false);
  }, []);

  return {
    ...state,
    install,
    dismissIOSPrompt,
    showIOSInstructions,
  };
}

// Utility to get install instructions for the current platform
export function getInstallInstructions(platform: Platform): string {
  switch (platform) {
    case 'ios':
      return 'Tap the Share button in Safari, then tap "Add to Home Screen"';
    case 'android':
      return 'Tap the menu (⋮) in Chrome, then tap "Add to Home screen" or "Install app"';
    case 'windows':
      return 'Click the install icon (➕) in the address bar or menu';
    case 'macos':
      return 'Click the install icon in Chrome or Edge address bar';
    default:
      return 'Install this app for the best experience';
  }
}

export type { Platform, Browser, PWAInstallState };
