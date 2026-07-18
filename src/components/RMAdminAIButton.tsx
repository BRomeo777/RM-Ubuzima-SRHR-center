import { useState } from 'react';
import { Bot, MessageCircle } from 'lucide-react';
import { usePersistentStore, useEphemeralStore } from '../store';
import { cn } from '../utils/helpers';
import RMAdminAIChatBox from './RMAdminAIChatBox';

interface RMAdminAIButtonProps {
  className?: string;
}

export default function RMAdminAIButton({ className }: RMAdminAIButtonProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { session } = useEphemeralStore();
  const { aiAvatars } = usePersistentStore();

  const userId = session?.user?.id;
  const userName = session?.user?.name;
  const aiAvatar = aiAvatars?.['ubuzima-admin'] || 'https://api.dicebear.com/7.x/bottts/svg?seed=rm-admin';

  // Don't show if no user
  if (!userId) return null;

  return (
    <>
      {/* Fixed RM Admin AI Button - Upper middle position */}
      <button
        onClick={() => setIsChatOpen(true)}
        className={cn(
          'fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-lg border border-cool-200 hover:shadow-xl hover:scale-105 transition-all duration-200 group',
          className
        )}
        title="Chat with RM Admin AI"
      >
        {/* AI Avatar */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
          <img
            src={aiAvatar}
            alt="RM Admin AI"
            className="relative w-8 h-8 rounded-full border-2 border-white object-cover"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
        </div>

        {/* Label */}
        <span className="text-sm font-medium text-cool-700 hidden sm:block">RM Admin AI</span>

        {/* Message Icon */}
        <div className="w-6 h-6 rounded-full bg-srhr/10 flex items-center justify-center">
          <MessageCircle className="w-3.5 h-3.5 text-srhr" />
        </div>
      </button>

      {/* Chat Box */}
      <RMAdminAIChatBox
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        aiAvatar={aiAvatar}
        userId={userId}
        userName={userName}
      />
    </>
  );
}
