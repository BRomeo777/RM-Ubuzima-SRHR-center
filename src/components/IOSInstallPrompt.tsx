import { X, Share2, PlusSquare, Apple } from 'lucide-react';

interface IOSInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
  appName?: string;
}

export function IOSInstallPrompt({ isOpen, onClose, appName = 'RM Ubuzima' }: IOSInstallPromptProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-srhr to-srhr-dark p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Apple className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Install {appName}</h3>
                <p className="text-white/80 text-sm">Add to your iPhone Home Screen</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            To install {appName} on your iPhone, follow these simple steps:
          </p>

          {/* Step 1 */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-10 h-10 bg-srhr/10 rounded-full flex items-center justify-center">
              <span className="text-srhr font-bold">1</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 mb-1">Open in Safari</p>
              <p className="text-sm text-gray-600">
                Make sure you're using Safari browser. If not, copy the URL and open it in Safari.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-10 h-10 bg-srhr/10 rounded-full flex items-center justify-center">
              <span className="text-srhr font-bold">2</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 mb-1">Tap the Share Button</p>
              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl">
                <Share2 className="w-5 h-5 text-srhr" />
                <span className="text-sm text-gray-600">
                  Look for the 
                  <Share2 className="w-4 h-4 inline mx-1 text-blue-500" />
                  icon at the bottom of Safari
                </span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-10 h-10 bg-srhr/10 rounded-full flex items-center justify-center">
              <span className="text-srhr font-bold">3</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 mb-1">Add to Home Screen</p>
              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl">
                <PlusSquare className="w-5 h-5 text-srhr" />
                <span className="text-sm text-gray-600">
                  Scroll down and tap 
                  <strong className="text-gray-900">"Add to Home Screen"</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Visual Guide */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-center gap-4">
              {/* Safari mockup */}
              <div className="bg-white rounded-xl p-3 shadow-sm w-32">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                </div>
                <div className="bg-gray-100 rounded-lg p-2 mb-2">
                  <div className="text-[8px] text-gray-400 truncate">rm-ubuzima.app</div>
                </div>
                <div className="flex justify-center">
                  <Share2 className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-[8px] text-center text-gray-500 mt-1">Share</p>
              </div>

              {/* Arrow */}
              <div className="text-gray-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Result mockup */}
              <div className="bg-white rounded-xl p-3 shadow-sm w-32">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-srhr rounded-xl flex items-center justify-center">
                      <span className="text-white text-xs font-bold">RM</span>
                    </div>
                    <span className="text-[6px] mt-1">RM Ubuzima</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>Tip:</strong> After installation, the app will appear on your home screen like any other app. You can launch it directly without opening Safari!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-srhr hover:bg-srhr-dark text-white font-semibold rounded-xl transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
