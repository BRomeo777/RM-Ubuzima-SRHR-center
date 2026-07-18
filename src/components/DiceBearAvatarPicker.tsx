import { useState } from 'react';
import { cn } from '../utils/helpers';
import { USER_AVATAR_OPTIONS, AvatarOption } from '../utils/avatar';
import { Check, User } from 'lucide-react';

interface DiceBearAvatarPickerProps {
  selectedAvatar: string;
  onSelect: (avatarUrl: string) => void;
  error?: string;
}

// Use the 28 local avatars
const ALL_AVATARS = USER_AVATAR_OPTIONS;

function AvatarButton({ avatar, isSelected, onSelect }: { avatar: AvatarOption; isSelected: boolean; onSelect: () => void }) {
  const [hasError, setHasError] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative w-full aspect-square rounded-full overflow-hidden transition-all duration-200',
        'hover:scale-110 hover:shadow-lg bg-white border-2',
        isSelected
          ? 'border-srhr ring-4 ring-srhr/30 scale-105 shadow-xl'
          : 'border-cool-200 hover:border-cool-300'
      )}
    >
      {hasError ? (
        <div className="w-full h-full bg-cool-100 flex items-center justify-center">
          <User className="w-8 h-8 text-cool-400" />
        </div>
      ) : (
        <img
          src={avatar.url}
          alt={`Avatar ${avatar.id}`}
          className="w-full h-full object-cover bg-white"
          loading="eager"
          onError={() => setHasError(true)}
        />
      )}
      
      {isSelected && (
        <div className="absolute inset-0 bg-srhr/20 flex items-center justify-center">
          <div className="w-6 h-6 bg-srhr rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </button>
  );
}

export function DiceBearAvatarPicker({ selectedAvatar, onSelect, error }: DiceBearAvatarPickerProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-cool-700">
        Choose avatar <span className="text-red-500">*</span>
      </label>
      
      {/* Scrollable container with all 28 avatars - 5 columns for larger avatars */}
      <div className="max-h-96 overflow-y-auto p-4 bg-white rounded-xl border border-cool-200 shadow-inner">
        <div className="grid grid-cols-5 gap-4">
          {ALL_AVATARS.map((avatar) => (
            <AvatarButton
              key={avatar.seed}
              avatar={avatar}
              isSelected={selectedAvatar === avatar.url}
              onSelect={() => onSelect(avatar.url)}
            />
          ))}
        </div>
      </div>
      
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      
      <p className="text-xs text-cool-500">
        Choose from 28 avatar options
      </p>
    </div>
  );
}

/**
 * Simple avatar display component for showing a user's avatar
 */
interface AvatarDisplayProps {
  src: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20'
};

export function AvatarDisplay({ src, alt = 'Avatar', size = 'md', className }: AvatarDisplayProps) {
  return (
    <div className={cn(
      'rounded-full overflow-hidden bg-cool-100 flex-shrink-0',
      'ring-2 ring-cool-200 ring-offset-1',
      sizeClasses[size],
      className
    )}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-cool-200 flex items-center justify-center">
          <span className="text-cool-400 text-lg">?</span>
        </div>
      )}
    </div>
  );
}
