import { useState, useEffect } from 'react';
import { X, Share2, PlusSquare, Apple, ChevronUp } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface IOSInstallBannerProps {
  appName?: string;
}

export function IOSInstallBanner({ appName = 'RM Ubuzima' }: IOSInstallBannerProps) {
  const { isIOS, isStandalone, platform, browser } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the banner
    const hasDismissed = localStorage.getItem('ios-install-banner-dismissed');
    
    // Show banner after a short delay for iOS users who haven't installed
    if (isIOS && !isStandalone && !hasDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isIOS, isStandalone]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('ios-install-banner-dismissed', 'true');
  };

  const handleShowDetails = () => {
    setShowDetails(true);
  };

  // Only show on iOS devices that haven't installed the app
  if (!isVisible || !isIOS || isStandalone) {
    return null;
  }

  return (
    <>
      {/* Compact Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-3 shadow-lg animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Apple className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Install {appName}</p>
              <p className="text-xs text-gray-400">Add to Home Screen for easy access</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShowDetails}
              className="px-3 py-1.5 bg-srhr hover:bg-srhr-dark text-white text-sm font-medium rounded-lg transition-colors"
            >
              How to Install
            </button>
            <button 
              onClick={handleDismiss}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Instructions Modal */}
      {showDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={() => setShowDetails(false)}
          />
          
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-srhr to-srhr-dark p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Apple className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Install on iPhone</h3>
                    <p className="text-white/80 text-sm">Works with Safari, Chrome & Edge</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* iOS Version Info */}
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>iOS 11.3+ Required</strong><br />
                  Your iPhone/iPad must be running iOS 11.3 or later to install this app.
                </p>
              </div>

              <p className="text-gray-600 mb-6">
                Follow these steps to add {appName} to your Home Screen:
              </p>

              {/* Step 1 */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-10 h-10 bg-srhr/10 rounded-full flex items-center justify-center">
                  <span className="text-srhr font-bold">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">Tap the Share button</p>
                  <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-3">
                    <Share2 className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-gray-600">
                      Look for this icon at the bottom (Safari) or top (Chrome) of your browser
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-10 h-10 bg-srhr/10 rounded-full flex items-center justify-center">
                  <span className="text-srhr font-bold">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">Scroll and tap "Add to Home Screen"</p>
                  <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-3">
                    <PlusSquare className="w-5 h-5 text-srhr" />
                    <span className="text-sm text-gray-600">
                      You may need to scroll down in the share menu to find this option
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-srhr/10 rounded-full flex items-center justify-center">
                  <span className="text-srhr font-bold">3</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">Tap "Add" in the top right</p>
                  <p className="text-sm text-gray-600">
                    The app icon will appear on your Home Screen like any other app!
                  </p>
                </div>
              </div>

              {/* Visual Demo */}
              <div className="mt-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4">
                <p className="text-xs text-gray-500 text-center mb-3">What it looks like:</p>
                <div className="flex items-center justify-center gap-3">
                  {/* iPhone mockup */}
                  <div className="bg-white rounded-2xl p-3 shadow-sm w-28">
                    <div className="flex justify-center mb-2">
                      <div className="w-12 h-12 bg-srhr rounded-xl flex items-center justify-center">
                        <span className="text-white text-xs font-bold">RM</span>
                      </div>
                    </div>
                    <p className="text-[8px] text-center text-gray-500">RM Ubuzima</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button 
                onClick={() => setShowDetails(false)}
                className="w-full py-3 bg-srhr hover:bg-srhr-dark text-white font-semibold rounded-xl transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
