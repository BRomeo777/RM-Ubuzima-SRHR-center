import { Download, Monitor, Apple, Smartphone, Check, Loader2 } from 'lucide-react';
import { usePWAInstall, type Platform } from '../hooks/usePWAInstall';
import { IOSInstallPrompt } from './IOSInstallPrompt';
import { useState, useCallback } from 'react';

interface DownloadButtonProps {
  variant?: 'primary' | 'secondary' | 'platform';
  platform?: Platform;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

// Platform icon mapping
const PlatformIcon = ({ platform, className = 'w-4 h-4' }: { platform: Platform; className?: string }) => {
  switch (platform) {
    case 'ios':
      return <Apple className={className} />;
    case 'android':
      return <Smartphone className={className} />;
    case 'windows':
    case 'macos':
    case 'linux':
      return <Monitor className={className} />;
    default:
      return <Download className={className} />;
  }
};

// Platform label mapping
const PlatformLabel = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case 'ios':
      return 'iPhone / iPad';
    case 'android':
      return 'Android';
    case 'windows':
      return 'Windows';
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return 'Download App';
  }
};

// Platform color mapping for buttons
const getPlatformStyles = (platform: Platform, isActive: boolean): string => {
  if (!isActive) {
    return 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200';
  }

  switch (platform) {
    case 'ios':
      return 'bg-gray-900 text-white hover:bg-gray-800 border-gray-900';
    case 'android':
      return 'bg-green-600 text-white hover:bg-green-700 border-green-600';
    case 'windows':
      return 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600';
    case 'macos':
      return 'bg-gray-800 text-white hover:bg-gray-900 border-gray-800';
    default:
      return 'bg-srhr text-white hover:bg-srhr-dark border-srhr';
  }
};

export function DownloadButton({
  variant = 'primary',
  platform: requestedPlatform,
  size = 'md',
  className = '',
  showIcon = true,
}: DownloadButtonProps) {
  const { 
    install, 
    isInstalled, 
    platform: detectedPlatform, 
    isIOS, 
    isAndroid,
    showIOSInstructions,
    dismissIOSPrompt,
    isInstallable,
    deferredPrompt,
    isStandalone,
  } = usePWAInstall();

  const [isInstalling, setIsInstalling] = useState(false);

  // Determine which platform this button represents
  const effectivePlatform = requestedPlatform || detectedPlatform;
  const isCurrentDevice = effectivePlatform === detectedPlatform;

  const handleClick = useCallback(async () => {
    if (isInstalling || isInstalled) return;

    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  }, [install, isInstalling, isInstalled]);

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  // Variant-specific rendering
  if (variant === 'platform') {
    // Platform-specific button (for marketing page platform buttons)
    const canInstallOnThisPlatform = 
      (effectivePlatform === 'ios' && isIOS) ||
      (effectivePlatform === 'android' && isAndroid) ||
      (effectivePlatform === 'windows' && deferredPrompt) ||
      (effectivePlatform !== 'ios' && effectivePlatform !== 'android' && deferredPrompt);

    const isDisabled = isInstalled || (isCurrentDevice && !isInstallable && !isIOS);
    const buttonLabel = isInstalled 
      ? 'Installed' 
      : isCurrentDevice && !isInstallable && !isIOS
        ? 'Open in Browser'
        : <PlatformLabel platform={effectivePlatform} />;

    return (
      <>
        <button
          onClick={handleClick}
          disabled={isDisabled}
          className={`
            flex items-center gap-2 rounded-lg border font-medium transition-all
            ${sizeClasses[size]}
            ${getPlatformStyles(effectivePlatform, isCurrentDevice)}
            ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'}
            ${className}
          `}
        >
          {showIcon && <PlatformIcon platform={effectivePlatform} className="w-4 h-4" />}
          <span>{buttonLabel}</span>
          {isInstalling && <Loader2 className="w-4 h-4 animate-spin" />}
          {isInstalled && <Check className="w-4 h-4" />}
        </button>

        {/* iOS Install Instructions Modal */}
        <IOSInstallPrompt 
          isOpen={showIOSInstructions} 
          onClose={dismissIOSPrompt} 
        />
      </>
    );
  }

  // Primary or Secondary variant
  const isPrimary = variant === 'primary';
  const baseClasses = isPrimary
    ? 'bg-green-500 hover:bg-green-600 text-black border-green-600'
    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300';

  // Determine button text
  let buttonText = 'Download App';
  if (isInstalled) {
    buttonText = 'App Installed';
  } else if (isIOS) {
    buttonText = 'Install for iPhone';
  } else if (isAndroid) {
    buttonText = 'Install for Android';
  } else if (detectedPlatform === 'windows') {
    buttonText = 'Install for Windows';
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isInstalled || isInstalling}
        className={`
          flex items-center gap-2 rounded-full font-semibold border transition-all
          ${sizeClasses[size]}
          ${baseClasses}
          ${isInstalled || isInstalling ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'}
          ${className}
        `}
      >
        {showIcon && (
          isInstalled ? (
            <Check className="w-4 h-4" />
          ) : isInstalling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PlatformIcon platform={detectedPlatform} />
          )
        )}
        <span>{buttonText}</span>
      </button>

      {/* iOS Install Instructions Modal */}
      <IOSInstallPrompt 
        isOpen={showIOSInstructions} 
        onClose={dismissIOSPrompt} 
      />
    </>
  );
}

// Platform buttons row for marketing page
interface PlatformButtonsProps {
  className?: string;
}

export function PlatformButtons({ className = '' }: PlatformButtonsProps) {
  const { platform: detectedPlatform, isInstallable, isInstalled } = usePWAInstall();

  const platforms: Platform[] = ['windows', 'ios', 'android'];

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {platforms.map((platform) => (
        <DownloadButton
          key={platform}
          variant="platform"
          platform={platform}
          size="sm"
        />
      ))}
    </div>
  );
}
