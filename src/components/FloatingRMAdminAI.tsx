import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Bot, Sparkles } from 'lucide-react';
import { usePersistentStore, useEphemeralStore } from '../store';
import { cn } from '../utils/helpers';
import RMAdminAIChatBox from './RMAdminAIChatBox';

interface FloatingRMAdminAIProps {
  currentPage?: string;
}

// Auto-hide duration: 7 seconds (7000ms)
const AUTO_HIDE_DURATION = 7000;
const THREE_HOURS = 3 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

// Track notifications app-wide: max 2 per 3 hours
const appNotificationTracker = {
  lastShownTime: 0,
  countInWindow: 0,
  windowStart: 0,
};

export default function FloatingRMAdminAI({ currentPage = 'home' }: FloatingRMAdminAIProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasBeenMoved, setHasBeenMoved] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { session } = useEphemeralStore();
  const {
    aiAvatars,
    rmAdminMessages,
    hideRMAdminMessage,
    generateWelcomeMessage,
    generateHomeEngagementMessage,
    generateSRHREngagementMessage,
    generateChatEngagementMessage,
    generateServicesEngagementMessage,
    generatePageEngagementMessage,
    articles,
    aiPosts,
    chatSettings,
    bazaMugangaTopic,
  } = usePersistentStore();

  const userId = session?.user?.id;
  const userName = session?.user?.name;
  const aiAvatar = aiAvatars?.['ubuzima-admin'] || 'https://api.dicebear.com/7.x/bottts/svg?seed=rm-admin';

  // Center the component initially
  useEffect(() => {
    const centerX = window.innerWidth / 2 - 150;
    const centerY = window.innerHeight / 2 - 100;
    setPosition({ x: centerX, y: centerY });
  }, []);

  // INTELLIGENT NOTIFICATION SYSTEM - App Wide: 2 notifications per 3 hours
  // Track globally across all pages, not per page

  // Generate intelligent notification - only 2 per 3 hours app-wide
  const generateIntelligentMessage = useCallback(() => {
    if (!userId || !currentPage || isChatOpen) return null;

    const now = Date.now();

    // Check if we're in a new 3-hour window
    if (now - appNotificationTracker.windowStart > THREE_HOURS) {
      appNotificationTracker.windowStart = now;
      appNotificationTracker.countInWindow = 0;
    }

    // Only allow 2 notifications per 3-hour window
    if (appNotificationTracker.countInWindow >= 2) return null;

    // Priority scoring for intelligent selection - get top 2 highest priority
    const scores: { type: string; score: number; message: string; actionUrl?: string }[] = [];

    // Score 1: New articles (highest priority if fresh)
    const oneDayAgo = now - ONE_DAY;
    const newArticles = articles.filter(a => new Date(a.createdAt).getTime() > oneDayAgo);
    if (newArticles.length > 0 && currentPage !== 'srhr-info') {
      const article = newArticles[0];
      scores.push({
        type: 'article',
        score: 90 + (newArticles.length > 1 ? 5 : 0),
        message: `📚 New: "${article.title.substring(0, 40)}${article.title.length > 40 ? '...' : ''}" - Fresh SRHR content just added!`,
        actionUrl: `/srhr-info?article=${article.id}`,
      });
    }

    // Score 2: Breaking news/priority posts
    const priorityPosts = aiPosts.filter(
      p => p.category === 'news' && new Date(p.timestamp).getTime() > oneDayAgo
    );
    if (priorityPosts.length > 0) {
      scores.push({
        type: 'news',
        score: 85,
        message: `📰 Breaking: ${priorityPosts[0].createdByName || 'RM Admin'} posted important news. Check it out!`,
        actionUrl: '/',
      });
    }

    // Score 3: Baza Muganga (high priority on Thu/Fri)
    const day = new Date().getDay();
    if ((day === 4 || day === 5) && currentPage !== 'baza-muganga') {
      const bazaTopic = bazaMugangaTopic || 'Hot SRHR Topics';
      scores.push({
        type: 'baza',
        score: day === 5 ? 95 : 80,
        message: `🔥 Baza Muganga ${day === 5 ? 'TODAY' : 'tomorrow'} at 7PM! "${bazaTopic}" - Don't miss it!`,
        actionUrl: '/baza-muganga',
      });
    }

    // Score 4: Online facilitators (for chat page)
    if (currentPage === 'chat') {
      const onlineFacilitators = chatSettings?.facilitators?.filter(f => f.isOnline) || [];
      if (onlineFacilitators.length > 0) {
        scores.push({
          type: 'facilitator',
          score: 70,
          message: `👥 ${onlineFacilitators.length} facilitator${onlineFacilitators.length > 1 ? 's are' : ' is'} online now to help!`,
        });
      }
    }

    // Score 5: General engagement based on page
    const pageMessages: Record<string, string[]> = {
      'home': [
        'Explore the latest SRHR content and community updates on your feed!',
        'Fresh posts from your followed accounts are waiting for you.',
        'Your Daily Feed has new content. Check it out!',
      ],
      'srhr-info': [
        '💡 Browse our comprehensive SRHR topics to enhance your knowledge.',
        'Knowledge is power! Explore our educational resources.',
        'New articles are added regularly. Keep learning!',
      ],
      'chat': [
        '💬 Join the conversation! This is a safe, anonymous space.',
        'Connect with the community. Share and learn together!',
        'Healthcare providers monitor this chat for accurate info.',
      ],
      'services': [
        '🔍 Discover healthcare services and facilities near you.',
        'Book appointments and find services tailored for you.',
        'Explore available SRHR services and resources.',
      ],
    };

    const messages = pageMessages[currentPage] || ['Discover what\'s new on RM Ubuzima!'];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    scores.push({
      type: 'engagement',
      score: 50,
      message: randomMsg,
    });

    // Select highest scoring message (the "hottest" one)
    scores.sort((a, b) => b.score - a.score);
    const selected = scores[0];

    if (!selected) return null;

    // Create the message
    const newMessage = {
      id: `rm_admin_${Date.now()}`,
      content: selected.message,
      type: 'tip' as const,
      duration: AUTO_HIDE_DURATION,
      position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
      isVisible: true,
      userId,
      page: currentPage,
      createdAt: new Date().toISOString(),
      actionUrl: selected.actionUrl,
    };

    // Update global tracker
    appNotificationTracker.countInWindow++;
    appNotificationTracker.lastShownTime = now;

    return newMessage;
  }, [userId, currentPage, isChatOpen, articles, aiPosts, bazaMugangaTopic, chatSettings]);

  // Show intelligent notifications - max 2 per 3 hours app-wide
  useEffect(() => {
    if (!userId || !currentPage) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initial check after 3 seconds (give time for page to settle)
    const initialTimer = setTimeout(() => {
      const msg = generateIntelligentMessage();
      if (msg) {
        // Store in rmAdminMessages
        const { addRMAdminMessage } = usePersistentStore.getState();
        const created = addRMAdminMessage(msg);
        setCurrentMessage(created.id);
        setIsVisible(true);

        hideTimerRef.current = setTimeout(() => {
          hideRMAdminMessage(created.id);
          setIsVisible(false);
          setCurrentMessage(null);
        }, AUTO_HIDE_DURATION);
      }
    }, 3000);

    // Set up 3-hour interval check
    intervalRef.current = setInterval(() => {
      const msg = generateIntelligentMessage();
      if (msg) {
        const { addRMAdminMessage } = usePersistentStore.getState();
        const created = addRMAdminMessage(msg);
        setCurrentMessage(created.id);
        setIsVisible(true);

        hideTimerRef.current = setTimeout(() => {
          hideRMAdminMessage(created.id);
          setIsVisible(false);
          setCurrentMessage(null);
        }, AUTO_HIDE_DURATION);
      }
    }, THREE_HOURS);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, currentPage, generateIntelligentMessage, hideRMAdminMessage]);

  // Listen for new messages from store
  useEffect(() => {
    const visibleMsg = rmAdminMessages.find((m) => m.isVisible && m.userId === userId);
    if (visibleMsg && visibleMsg.id !== currentMessage) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      setCurrentMessage(visibleMsg.id);
      setIsVisible(true);
      hideTimerRef.current = setTimeout(() => {
        hideRMAdminMessage(visibleMsg.id);
        setIsVisible(false);
        setCurrentMessage(null);
      }, AUTO_HIDE_DURATION);
    }
  }, [rmAdminMessages, userId, currentMessage, hideRMAdminMessage]);

  // Drag detection - track movement to distinguish click from drag
  const dragStartRef = useRef({ x: 0, y: 0, time: 0 });
  const hasDraggedRef = useRef(false);

  // Handle dragging - ONLY from drag handle
  const handleDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    hasDraggedRef.current = false;
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    setHasBeenMoved(true);
  }, [position]);

  const handleDragHandleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    hasDraggedRef.current = false;
    setIsDragging(true);
    dragStartPos.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
    setHasBeenMoved(true);
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      // If moved more than 5px, consider it a drag
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasDraggedRef.current = true;
      }
      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      // If moved more than 5px, consider it a drag
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasDraggedRef.current = true;
      }
      const newX = touch.clientX - dragStartPos.current.x;
      const newY = touch.clientY - dragStartPos.current.y;
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);


  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove, handleDragEnd]);

  // Handle click to open chat - only if not dragging
  const handleClick = () => {
    const wasDrag = hasDraggedRef.current;
    const timeDiff = Date.now() - dragStartRef.current.time;
    // Only open if: not dragged AND not currently dragging AND click was quick (< 200ms)
    if (!wasDrag && !isDragging && timeDiff < 200 && isVisible) {
      // Clear the hide timer when user clicks to chat
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      setIsChatOpen(true);
      setIsVisible(false);
      if (currentMessage) {
        hideRMAdminMessage(currentMessage);
      }
    }
  };

  // Handle close message manually
  const handleCloseMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (currentMessage) {
      hideRMAdminMessage(currentMessage);
    }
    setIsVisible(false);
    setCurrentMessage(null);
  };

  // Don't show if no user
  if (!userId) return null;

  const activeMessage = rmAdminMessages.find((m) => m.id === currentMessage && m.isVisible);

  return (
    <>
      {/* Floating Message - Only shows when there's an active message */}
      {isVisible && activeMessage && (
        <div
          ref={containerRef}
          className={cn(
            'fixed z-50 select-none',
            isDragging ? 'cursor-grabbing' : 'cursor-default'
          )}
          style={{
            left: position.x,
            top: position.y,
            transition: isDragging ? 'none' : 'transform 0.2s ease',
          }}
        >
          {/* Message Card */}
          <div
            className="bg-white rounded-2xl shadow-2xl border border-cool-200 p-4 w-[300px] animate-fade-in-scale"
            onClick={handleClick}
          >
            {/* Drag Handle - ONLY THIS AREA TRIGGERS DRAG */}
            <div
              className="flex justify-center mb-2 cursor-grab active:cursor-grabbing py-2 -mx-4 -mt-4 px-4 pt-4 bg-gradient-to-b from-gray-50 to-transparent rounded-t-2xl"
              onMouseDown={handleDragHandleMouseDown}
              onTouchStart={handleDragHandleTouchStart}
              title="Drag to move"
            >
              <div className="w-12 h-1.5 bg-cool-300 hover:bg-cool-400 rounded-full transition-colors" />
            </div>

            <div className="flex items-start gap-3">
              {/* AI Avatar */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-md opacity-50" />
                <img
                  src={aiAvatar}
                  alt="RM Admin AI"
                  className="relative w-12 h-12 rounded-full border-2 border-white shadow-md object-cover"
                  draggable={false}
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-cool-800">
                    {activeMessage.type === 'welcome' ? 'Welcome!' : 'RM Admin AI'}
                  </p>
                  <button
                    onClick={handleCloseMessage}
                    className="p-1 text-cool-400 hover:text-cool-600 hover:bg-cool-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-cool-600 mt-1 leading-relaxed">
                  {activeMessage.content}
                </p>
                <p className="text-xs text-srhr mt-2 font-medium">
                  Click to chat →
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Box */}
      <RMAdminAIChatBox
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        aiAvatar={aiAvatar}
        userId={userId!}
        userName={userName}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes fadeOutScale {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
          }
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.3s ease-out;
        }
        .animate-fade-out-scale {
          animation: fadeOutScale 0.3s ease-in forwards;
        }
      `}</style>
    </>
  );
}

