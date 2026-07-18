import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minimize2, Send, Bot, User, Sparkles, BookOpen, Calendar, HeartPulse, MessageSquare, ChevronRight, GripHorizontal, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/helpers';
import { queryRMAdminAI, isAIConfigured } from '../services/ubuzimaAIService';
import { usePersistentStore } from '../store';
import type { Language } from '../types';

interface RMAdminAIChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  aiAvatar: string;
  userId: string;
  userName?: string;
  language?: Language;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'quick_reply' | 'link';
  action?: {
    label: string;
    url: string;
  };
}

const QUICK_REPLIES = [
  { icon: BookOpen, label: 'SRHR Articles', url: '/srhr' },
  { icon: Calendar, label: 'Baza Muganga', url: '/baza-muganga' },
  { icon: HeartPulse, label: 'Services', url: '/services' },
  { icon: MessageSquare, label: 'Community Chat', url: '/chat' },
];

// Fallback responses - Navigation Guide only (no health discussion)
const FALLBACK_RESPONSES: Record<string, string> = {
  'hello': 'Hello! Welcome to RM Ubuzima. I\'m here to help you navigate the app.\n\nI can guide you to:\n• Health information → SRHR Info section\n• Appointments → Book SRHR Healthcare Provider\n• Emergency help → Emergency section\n• Community chat → Chat section\n\nWhere would you like to go?',
  'hi': 'Hi there! I\'m your navigation guide for RM Ubuzima.\n\nI can help you find:\n• Health education resources\n• App features and settings\n• Emergency contacts\n• Community discussions\n\nWhat are you looking for?',
  'help': 'I can help you navigate to:\n• SRHR Info section for health education\n• Book SRHR Healthcare Provider for online consultations\n• Services to find nearby facilities\n• Chat to connect with the community\n• Emergency section for urgent help\n• Baza Muganga for weekly sessions\n\nWhich would you like to explore?',
  'baza': '🔥 Baza Muganga is our weekly Friday session at 7:00 PM. Healthcare professionals host educational discussions.\n\nYou can find it in the Baza Muganga section. Want me to guide you there?',
  'baza muganga': '🔥 Baza Muganga happens every Friday at 7:00 PM! It\'s a great place to learn from healthcare professionals.\n\nVisit the Baza Muganga section to join.',
  'weekly baza': '🔥 Our Weekly Baza Muganga is every Friday at 7:00 PM. Find it in the Baza Muganga section!',
  'appointment': 'To book an online consultation, go to Services > Book SRHR Healthcare Provider. This connects you with SRHR healthcare professionals.\n\nWould you like directions to that section?',
  'emergency': '🚨 For medical emergencies, please call emergency services immediately or visit the nearest hospital.\n\nI can also direct you to our Emergency section in the app for contact information and resources.',
  'chat': 'Our community chat is in the Chat section. It\'s a space for members to share and learn together.\n\nWant me to show you where to find it?',
  'article': 'Health education articles are in the SRHR Info section.\n\nWould you like me to point you to the articles?',
  'thank': 'You\'re very welcome! Feel free to ask if you need help navigating the app.',
  'thanks': 'You\'re welcome! I\'m here anytime you need help finding your way around RM Ubuzima.',
  'bye': 'Goodbye! Feel free to return anytime you need help navigating the app. Take care!',
};

export default function RMAdminAIChatBox({
  isOpen,
  onClose,
  onMinimize,
  aiAvatar,
  userId,
  userName,
  language = 'en',
}: RMAdminAIChatBoxProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(() => {
    // Check localStorage for terms acceptance
    return localStorage.getItem('rm_ubuzima_ai_terms_accepted') === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Drag functionality
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { facilities, articles, topics, bazaMugangaTopic, bazaMugangaLink, bookDoctorEmail } = usePersistentStore();

  const handleAcceptTerms = () => {
    setHasAcceptedTerms(true);
    localStorage.setItem('rm_ubuzima_ai_terms_accepted', 'true');
  };

  // Concise initial greeting for Navigation Guide
  useEffect(() => {
    if (isOpen && messages.length === 0 && hasAcceptedTerms) {
      const greeting = `• Looking for health information? Visit the SRHR Info section
• Need to book an appointment? I can point you to the right place
• Have an emergency? I'll direct you to immediate help
• Want to chat with the community? I'll show you where to go`;

      setMessages([
        {
          id: 'welcome',
          content: greeting,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length, userName, hasAcceptedTerms]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fallback response generator when AI API is not available
  const generateFallbackResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // Check for keyword matches
    for (const [keyword, response] of Object.entries(FALLBACK_RESPONSES)) {
      if (lowerMessage.includes(keyword)) {
        return response;
      }
    }

    // Navigation-focused default responses
    const defaultResponses = [
      'I can help you navigate RM Ubuzima. Looking for health info? I\'ll point you to the SRHR section. Need to book an online consultation? I\'ll show you where. What would you like to find?',
      'I\'m your app navigator. I can guide you to:\n• Health resources (SRHR Info section)\n• Online consultations (Book SRHR Healthcare Provider)\n• Emergency help\n• Community chat\n\nWhere shall we go?',
      'Welcome! I\'ll help you find your way around RM Ubuzima. Whether you need health information, want to book an online consultation, or join the community—just let me know what you\'re looking for!',
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    setError(null);

    // Convert chat history for API
    const chatHistory = messages.slice(-10).map((msg) => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }));

    try {
      // Check if AI is configured
      if (isAIConfigured()) {
        // Use Grok API for intelligent response
        const response = await queryRMAdminAI(
          inputValue,
          language,
          chatHistory,
          {
            bazaMugangaTopic,
            bazaMugangaLink,
            bookDoctorEmail,
            facilitiesCount: facilities.length,
            articlesCount: articles.length,
            topicsCount: topics.length,
          }
        );

        if (response.success) {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: response.content,
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          // API error - use fallback
          console.error('AI API error:', response.error);
          const fallbackResponse = generateFallbackResponse(userMsg.content);
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: fallbackResponse + '\n\n_(Note: AI service is currently experiencing issues. Basic responses only.)_',
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMsg]);
          setError('AI service temporarily unavailable. Using basic responses.');
        }
      } else {
        // AI not configured - use fallback
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate typing
        const fallbackResponse = generateFallbackResponse(userMsg.content);
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: fallbackResponse,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error('Error generating AI response:', err);
      const fallbackResponse = generateFallbackResponse(userMsg.content);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: fallbackResponse,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickReply = (label: string, url: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      content: `Take me to ${label}`,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      content: `I'll take you to ${label}. Click below:`,
      sender: 'ai',
      timestamp: new Date(),
      type: 'link',
      action: { label, url },
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, aiMsg]);
    }, 500);
  };

  // Drag handlers - ONLY allow dragging from header handle
  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
    e.stopPropagation();
  }, [position]);

  const handleHeaderTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartPos.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
    e.stopPropagation();
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;
      // Keep within viewport bounds (adjusted for smaller chat box)
      const maxX = window.innerWidth - 300;
      const maxY = window.innerHeight - 400;
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  }, [isDragging]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStartPos.current.x;
      const newY = touch.clientY - dragStartPos.current.y;
      const maxX = window.innerWidth - 300;
      const maxY = window.innerHeight - 400;
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
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

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed w-[300px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-cool-200 z-50 overflow-hidden flex flex-col max-h-[500px]"
      style={{
        left: position.x > 0 ? position.x : 'auto',
        right: position.x > 0 ? 'auto' : '1.5rem',
        top: position.y > 0 ? position.y : 'auto',
        bottom: position.y > 0 ? 'auto' : '1.5rem',
      }}
    >
      {/* Header - Draggable area ONLY */}
      <div
        className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderTouchStart}
      >
        <div className="flex items-center gap-2">
          {/* Drag handle indicator */}
          <div className="text-white/50 mr-1 cursor-grab active:cursor-grabbing">
            <GripHorizontal className="w-5 h-5" />
          </div>
          <div className="relative">
            <img
              src={aiAvatar}
              alt="RM Admin AI"
              className="w-10 h-10 rounded-full border-2 border-white bg-white"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
          </div>
          <div>
            <h3 className="font-semibold text-white">RM Admin AI</h3>
            <p className="text-xs text-purple-100 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              Online - Ready to help
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Minimize"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <p className="text-xs text-yellow-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
            {error}
          </p>
        </div>
      )}

      {/* Terms Acceptance Screen - Elegant & Professional */}
      {!hasAcceptedTerms && (
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-cool-50 to-white">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-srhr to-srhr-dark rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-cool-900 text-xl">Welcome</h3>
            <p className="text-cool-500 text-sm mt-1">Your Educational Assistant</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-soft border border-cool-100 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h4 className="font-semibold text-cool-800">Before We Begin</h4>
            </div>
            <p className="text-sm text-cool-600 leading-relaxed">
              I'm here to help you navigate RM Ubuzima and share general health education. 
              I'm an AI assistant—not a healthcare professional.
            </p>
            <div className="mt-4 space-y-2 text-sm text-cool-600">
              <div className="flex items-start gap-2">
                <span className="text-srhr mt-0.5">✓</span>
                <span>I provide <strong>educational information only</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-srhr mt-0.5">✓</span>
                <span>I <strong>do not provide medical advice or diagnoses</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-srhr mt-0.5">✓</span>
                <span>For health concerns, <strong>consult licensed professionals</strong></span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 mb-5">
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Please note:</strong> This AI is for educational purposes only and cannot replace professional medical consultation. 
              For emergencies, please contact emergency services immediately.
            </p>
          </div>

          <button
            onClick={handleAcceptTerms}
            className="w-full py-3.5 bg-gradient-to-r from-srhr to-srhr-dark text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            I Understand — Continue
          </button>

          <p className="text-xs text-cool-400 text-center mt-4">
            By continuing, you acknowledge this AI provides educational information only
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-cool-50/50 max-h-[350px]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-2',
              message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              {message.sender === 'ai' ? (
                <img
                  src={aiAvatar}
                  alt="RM Admin AI"
                  className="w-8 h-8 rounded-full bg-white"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-srhr flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-3 py-2',
                message.sender === 'user'
                  ? 'bg-srhr text-white rounded-br-none'
                  : 'bg-white border border-cool-200 text-cool-800 rounded-bl-none shadow-sm'
              )}
            >
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              {message.type === 'link' && message.action && (
                <button
                  onClick={() => {
                    navigate(message.action!.url);
                    onClose();
                  }}
                  className="mt-2 flex items-center gap-2 bg-srhr/10 text-srhr px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-srhr/20 transition-colors text-left"
                >
                  {message.action.label}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <span className="text-[10px] opacity-70 mt-1 block">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-2">
            <img
              src={aiAvatar}
              alt="RM Admin AI"
              className="w-8 h-8 rounded-full bg-white"
            />
            <div className="bg-white border border-cool-200 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-cool-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-cool-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-cool-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="px-4 py-2 bg-white border-t border-cool-100">
        <p className="text-xs text-cool-500 mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Quick Actions
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply.label}
              onClick={() => handleQuickReply(reply.label, reply.url)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cool-100 hover:bg-srhr/10 text-cool-600 hover:text-srhr rounded-lg text-xs font-medium transition-colors"
            >
              <reply.icon className="w-3 h-3" />
              {reply.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-2 sm:p-3 bg-white border-t border-cool-100">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Compact input for mobile */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask..."
            className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-cool-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-srhr/50 min-w-0"
          />
          {/* Larger send button for mobile */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-3 sm:p-2.5 bg-srhr text-white rounded-xl hover:bg-srhr-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>
        <p className="text-[10px] text-cool-400 mt-1.5 sm:mt-2 text-center">
          RM Admin AI is here to guide you. For emergencies, please contact healthcare professionals directly.
        </p>
      </div>
    </div>
  );
}
