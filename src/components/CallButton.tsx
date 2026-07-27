/**
 * Call button for chat headers.
 *
 * Only registers a request; CallManager owns the actual call. Calls must
 * involve at least one facilitator, so the button hides itself when neither
 * side is one (community members cannot call each other).
 */

import { Phone } from 'lucide-react';
import { useEphemeralStore, usePersistentStore } from '../store';
import { useStartCall } from '../store/callStore';
import { cn } from '../utils/helpers';

interface CallButtonProps {
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar?: string;
  targetIsFacilitator?: boolean;
  className?: string;
  /** Icon colour; defaults to inheriting from the header. */
  color?: string;
  title?: string;
}

export default function CallButton({
  targetUserId,
  targetUserName,
  targetUserAvatar = '',
  targetIsFacilitator = false,
  className,
  color,
  title,
}: CallButtonProps) {
  const { session } = useEphemeralStore();
  const { isUserFacilitator } = usePersistentStore();
  const requestCall = useStartCall();

  const currentUser = session?.user;
  if (!currentUser || !targetUserId) return null;

  // Cannot call yourself.
  if (currentUser.id === targetUserId) return null;

  const callerIsFacilitator = isUserFacilitator(currentUser.id, currentUser);

  // At least one party must be a facilitator.
  if (!callerIsFacilitator && !targetIsFacilitator) return null;

  return (
    <button
      onClick={() =>
        requestCall({
          userId: targetUserId,
          userName: targetUserName,
          userAvatar: targetUserAvatar,
          isFacilitator: targetIsFacilitator,
        })
      }
      className={cn(
        'p-2 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10',
        className
      )}
      title={title || `Call ${targetUserName}`}
      aria-label={`Call ${targetUserName}`}
    >
      <Phone className="w-5 h-5" style={color ? { color } : undefined} />
    </button>
  );
}
