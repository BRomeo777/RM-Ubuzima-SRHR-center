import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, AlertCircle, User } from 'lucide-react';
import { useGlobalChat } from '../hooks/useGlobalChat';
import type { ChatUser } from '../types';

interface ChatWindowProps {
  currentUser: ChatUser | null;
}

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 10) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get initials from name for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Generate a consistent color from user ID
 */
function getUserColor(userId: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function ChatWindow({ currentUser }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { messages, loading, sending, error, sendMessage, retry } = useGlobalChat(currentUser);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Only auto-scroll if user is near the bottom
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages, scrollToBottom]);

  // Handle send message
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!inputValue.trim() || sending || !currentUser) {
      return;
    }

    const success = await sendMessage(inputValue.trim());
    
    if (success) {
      setInputValue('');
      // Focus back on input
      inputRef.current?.focus();
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Check if message is from current user
  const isOwnMessage = (msgUserId: string) => {
    return currentUser?.id === msgUserId;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <h2 className="font-semibold text-gray-800">Global Chat</h2>
          <span className="text-xs text-gray-500">
            ({messages.length} messages)
          </span>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Logged in as</span>
            <span className="font-medium text-gray-800">{currentUser.name}</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {/* Loading State */}
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            <span className="ml-2 text-gray-500">Loading messages...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <button
              onClick={retry}
              className="text-sm text-red-600 underline hover:text-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-gray-500 font-medium">No messages yet</p>
            <p className="text-gray-400 text-sm mt-1">
              {currentUser ? 'Start the conversation!' : 'Log in to send messages'}
            </p>
          </div>
        )}

        {/* Messages List */}
        {messages.map((message, index) => {
          const own = isOwnMessage(message.userId);
          const showAvatar = index === 0 || messages[index - 1].userId !== message.userId;
          
          return (
            <div
              key={message.id}
              className={`flex gap-2 ${own ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 w-8">
                {showAvatar ? (
                  message.userAvatar ? (
                    <img
                      src={message.userAvatar}
                      alt={message.userName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full ${getUserColor(message.userId)} flex items-center justify-center text-white text-xs font-medium`}>
                      {getInitials(message.userName)}
                    </div>
                  )
                ) : (
                  <div className="w-8" /> // Spacer for alignment
                )}
              </div>

              {/* Message Bubble */}
              <div className={`flex flex-col max-w-[70%] ${own ? 'items-end' : 'items-start'}`}>
                {showAvatar && (
                  <div className="flex items-center gap-1 mb-1 px-1">
                    <span className="text-xs text-gray-500">
                      {message.userName}
                    </span>
                    {message.isFacilitator && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded-full font-medium">
                        {message.facilitatorBadge || 'Facilitator'}
                      </span>
                    )}
                  </div>
                )}
                <div
                  className={`px-3 py-2 rounded-lg text-sm ${
                    own
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                  } ${message.isDeleted ? 'opacity-50 italic' : ''}`}
                >
                  {message.isDeleted ? (
                    <span className="text-xs">Message deleted</span>
                  ) : (
                    message.content
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Invisible element for scrolling to bottom */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-3">
        {!currentUser ? (
          <div className="text-center py-2 text-gray-500 text-sm">
            Please log in to send messages
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={sending || loading}
              className="flex-1 px-4 py-2 bg-gray-100 border border-gray-200 rounded-full 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-sm"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || sending || loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-full
                         hover:bg-blue-600 active:bg-blue-700
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors duration-200
                         flex items-center gap-1"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Send</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
