import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, X, Check, CheckCheck, ExternalLink, Crown, Bot, User as UserIcon, Info, AlertTriangle, Calendar, BookOpen, HeartPulse, Sparkles, ChevronDown, ChevronUp, Megaphone, GripHorizontal } from 'lucide-react';
import { usePersistentStore, useEphemeralStore } from '../store';
import type { Notification, NotificationPriority, NotificationSource, NotificationType, NotificationCategory } from '../types';
import { cn, getRelativeTime } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';

interface NotificationBellProps {
  className?: string;
  variant?: 'default' | 'minimal';
}

const priorityColors: Record<NotificationPriority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};

const priorityTextColors: Record<NotificationPriority, string> = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  low: 'text-blue-600',
};

const sourceIcons: Record<NotificationSource, React.ReactNode> = {
  admin: <UserIcon className="w-3 h-3" />,
  rm_admin_ai: <Bot className="w-3 h-3" />,
  system: <Info className="w-3 h-3" />,
};

const sourceLabels: Record<NotificationSource, string> = {
  admin: 'Admin',
  rm_admin_ai: 'RM Admin AI',
  system: 'System',
};

const typeIcons: Record<NotificationType, React.ReactNode> = {
  announcement: <Crown className="w-4 h-4" />,
  reminder: <Calendar className="w-4 h-4" />,
  system: <Info className="w-4 h-4" />,
  event: <Sparkles className="w-4 h-4" />,
  weekly_baza: <HeartPulse className="w-4 h-4" />,
  article: <BookOpen className="w-4 h-4" />,
  appointment: <Calendar className="w-4 h-4" />,
  emergency: <AlertTriangle className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
  private_message: <Info className="w-4 h-4" />,
  welcome: <Sparkles className="w-4 h-4" />,
  guidance: <Info className="w-4 h-4" />,
};

export default function NotificationBell({ className, variant = 'default' }: NotificationBellProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationCategory>('notification');
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Phone back navigation for notification dropdown
  usePhoneBackNavigation({
    isOpen,
    onClose: () => setIsOpen(false),
    modalId: 'notification-dropdown'
  });

  usePhoneBackNavigation({
    isOpen: !!expandedNotification,
    onClose: () => setExpandedNotification(null),
    modalId: 'expanded-notification'
  });

  // Drag functionality for dropdown
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const { session } = useEphemeralStore();
  const {
    notifications,
    getUnreadNotifications,
    getUnreadAnnouncements,
    markNotificationRead,
    markAllNotificationsRead,
    generateAINotifications,
    generateAnnouncements,
    clearExpiredNotifications,
  } = usePersistentStore();

  const userId = session?.user?.id;
  const notificationCount = userId ? getUnreadNotifications(userId).length : 0;
  const announcementCount = userId ? getUnreadAnnouncements(userId).length : 0;

  // Generate AI notifications and announcements periodically
  useEffect(() => {
    generateAINotifications();
    generateAnnouncements();
    clearExpiredNotifications();

    const interval = setInterval(() => {
      generateAINotifications();
      generateAnnouncements();
      clearExpiredNotifications();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [generateAINotifications, generateAnnouncements, clearExpiredNotifications]);

  // Simple click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    if (userId) {
      markNotificationRead(notification.id, userId);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    if (userId) {
      markAllNotificationsRead(userId);
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNotification(expandedNotification === id ? null : id);
  };

  // Simple toggle with preventDefault
  const toggleOpen = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    // Reset position when opening
    if (!isOpen) {
      setDropdownPosition({ x: 0, y: 0 });
    }
    setIsOpen(prev => !prev);
  };

  // Drag handlers for dropdown
  const handleDropdownMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - dropdownPosition.x,
      y: e.clientY - dropdownPosition.y,
    };
    e.preventDefault();
  }, [dropdownPosition]);

  const handleDropdownTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartPos.current = {
      x: touch.clientX - dropdownPosition.x,
      y: touch.clientY - dropdownPosition.y,
    };
  }, [dropdownPosition]);

  const handleDropdownMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;
      setDropdownPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  const handleDropdownTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStartPos.current.x;
      const newY = touch.clientY - dragStartPos.current.y;
      setDropdownPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  const handleDropdownDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDropdownMouseMove);
      window.addEventListener('mouseup', handleDropdownDragEnd);
      window.addEventListener('touchmove', handleDropdownTouchMove);
      window.addEventListener('touchend', handleDropdownDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDropdownMouseMove);
        window.removeEventListener('mouseup', handleDropdownDragEnd);
        window.removeEventListener('touchmove', handleDropdownTouchMove);
        window.removeEventListener('touchend', handleDropdownDragEnd);
      };
    }
  }, [isDragging, handleDropdownMouseMove, handleDropdownTouchMove, handleDropdownDragEnd]);

  // Get active notifications (not expired) filtered by category and target audience
  const activeItems = notifications.filter(
    (n) =>
      (!n.expiresAt || new Date(n.expiresAt) > new Date()) &&
      n.category === activeTab &&
      // Only show notifications meant for this user or for all users
      (!n.targetAudience || n.targetAudience === 'all' ||
        (n.targetAudience === 'specific_user' && n.targetUserId === userId))
  );

  // Sort by priority and date
  const sortedItems = [...activeItems].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (variant === 'minimal') {
    return (
      <div ref={dropdownRef} className={cn('relative inline-block', className)}>
        <button
          type="button"
          onClick={toggleOpen}
          className={cn(
            'relative p-2 rounded-full transition-colors pointer-events-auto select-none',
            isOpen ? 'bg-srhr/20 text-srhr' : 'hover:bg-cool-100 text-cool-600'
          )}
          style={{ touchAction: 'manipulation' }}
        >
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* Dropdown for minimal variant */}
        {isOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-[360px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-cool-200 z-[9999] overflow-hidden"
            style={{
              transform: `translate(${dropdownPosition.x}px, ${dropdownPosition.y}px)`,
              cursor: isDragging ? 'grabbing' : 'default',
            }}
          >
            {/* Header - Draggable */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-cool-100 bg-gradient-to-r from-cool-50 to-white cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleDropdownMouseDown}
              onTouchStart={handleDropdownTouchStart}
            >
              <div className="flex items-center gap-2">
                {/* Drag handle */}
                <div className="text-cool-400">
                  <GripHorizontal className="w-5 h-5" />
                </div>
                <Bell className="w-5 h-5 text-srhr" />
                <span className="font-semibold text-cool-800">
                  {activeTab === 'notification' ? t('notifications.title') : t('notifications.announcements')}
                </span>
                {(activeTab === 'notification' ? notificationCount : announcementCount) > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                    {activeTab === 'notification' ? notificationCount : announcementCount} {t('notifications.new')}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-cool-400 hover:text-cool-600 hover:bg-cool-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-cool-100">
              <button
                onClick={() => setActiveTab('notification')}
                className={cn(
                  'flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                  activeTab === 'notification'
                    ? 'text-srhr border-b-2 border-srhr bg-srhr/5'
                    : 'text-cool-500 hover:text-cool-700 hover:bg-cool-50'
                )}
              >
                <Bell className="w-4 h-4" />
                {t('notifications.title')}
                {notificationCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                    {notificationCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('announcement')}
                className={cn(
                  'flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                  activeTab === 'announcement'
                    ? 'text-srhr border-b-2 border-srhr bg-srhr/5'
                    : 'text-cool-500 hover:text-cool-700 hover:bg-cool-50'
                )}
              >
                <Megaphone className="w-4 h-4" />
                {t('notifications.announcements')}
                {announcementCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                    {announcementCount}
                  </span>
                )}
              </button>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto">
              {sortedItems.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <div className="w-12 h-12 bg-cool-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    {activeTab === 'notification' ? (
                      <Bell className="w-6 h-6 text-cool-300" />
                    ) : (
                      <Megaphone className="w-6 h-6 text-cool-300" />
                    )}
                  </div>
                  <p className="text-cool-500 text-sm">
                    No {activeTab === 'notification' ? 'notifications' : 'announcements'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-cool-100">
                  {sortedItems.map((notification: Notification) => {
                    const isUnread = userId && !notification.readBy.includes(userId);
                    const isExpanded = expandedNotification === notification.id;
                    const Icon = typeIcons[notification.type];
                    const hasFullContent = notification.fullContent && notification.fullContent !== notification.content;

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'px-4 py-3 transition-colors',
                          isUnread ? 'bg-blue-50/50' : 'bg-white',
                          notification.actionUrl && 'cursor-pointer hover:bg-cool-50'
                        )}
                      >
                        <div className="flex gap-3">
                          {/* Avatar/Icon */}
                          <div className="flex-shrink-0">
                            {notification.aiAvatar ? (
                              <img
                                src={notification.aiAvatar}
                                alt="RM Admin AI"
                                className="w-10 h-10 rounded-xl object-cover border border-cool-200"
                              />
                            ) : (
                              <div
                                className={cn(
                                  'w-10 h-10 rounded-xl flex items-center justify-center',
                                  notification.source === 'rm_admin_ai'
                                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                    : notification.source === 'admin'
                                    ? 'bg-slate-700 text-white'
                                    : 'bg-cool-100 text-cool-600'
                                )}
                              >
                                {notification.source === 'rm_admin_ai' ? (
                                  <Bot className="w-5 h-5" />
                                ) : notification.source === 'admin' ? (
                                  <Crown className="w-5 h-5" />
                                ) : (
                                  Icon
                                )}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-cool-900 text-sm leading-tight">
                                  {notification.title}
                                </p>
                                <p className={cn(
                                  "text-cool-600 text-xs mt-1",
                                  !isExpanded && "line-clamp-2"
                                )}>
                                  {notification.content}
                                </p>

                                {/* Expanded Content */}
                                {isExpanded && hasFullContent && (
                                  <div className="mt-2 p-2 bg-cool-50 rounded-lg">
                                    <p className="text-cool-700 text-xs whitespace-pre-line">
                                      {notification.fullContent}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {isUnread && (
                                <span className="w-2 h-2 bg-srhr rounded-full flex-shrink-0 mt-1.5" />
                              )}
                            </div>

                            {/* Read More Button */}
                            {hasFullContent && (
                              <button
                                onClick={(e) => toggleExpand(notification.id, e)}
                                className="mt-1 flex items-center gap-1 text-srhr text-xs hover:underline"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3 h-3" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" />
                                    Read more
                                  </>
                                )}
                              </button>
                            )}

                            {/* Footer with Priority & Source */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                                    priorityTextColors[notification.priority],
                                    notification.priority === 'high'
                                      ? 'bg-red-50'
                                      : notification.priority === 'medium'
                                      ? 'bg-amber-50'
                                      : 'bg-blue-50'
                                  )}
                                >
                                  {notification.priority}
                                </span>
                                <span className="text-[10px] text-cool-400 flex items-center gap-1">
                                  {sourceIcons[notification.source]}
                                  {sourceLabels[notification.source]}
                                </span>
                              </div>
                              <span className="text-[10px] text-cool-400">
                                {getRelativeTime(notification.createdAt)}
                              </span>
                            </div>

                            {/* Action Button - View/Read Article */}
                            {notification.actionUrl && (
                              <button
                                onClick={() => handleNotificationClick(notification)}
                                className="mt-2 flex items-center gap-1 text-srhr text-xs font-medium hover:underline"
                              >
                                <span>{notification.actionLabel || 'View'}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-cool-100 bg-cool-50 text-center flex justify-between items-center">
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-srhr hover:underline"
                disabled={!userId || (activeTab === 'notification' ? notificationCount : announcementCount) === 0}
              >
                Mark all read
              </button>
              <p className="text-xs text-cool-500">RM Admin AI</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          'relative p-2.5 rounded-xl transition-all duration-200 pointer-events-auto select-none',
          isOpen
            ? 'bg-srhr text-white shadow-md'
            : 'bg-white border border-cool-200 text-cool-600 hover:border-srhr hover:text-srhr shadow-sm'
        )}
        style={{ touchAction: 'manipulation' }}
      >
        <Bell className="w-5 h-5" />
        {notificationCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[380px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-cool-200 z-[9999] overflow-hidden"
          style={{
            transform: `translate(${dropdownPosition.x}px, ${dropdownPosition.y}px)`,
            cursor: isDragging ? 'grabbing' : 'default',
          }}
        >
          {/* Header - Draggable */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-cool-100 bg-gradient-to-r from-cool-50 to-white cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleDropdownMouseDown}
            onTouchStart={handleDropdownTouchStart}
          >
            <div className="flex items-center gap-2">
              {/* Drag handle */}
              <div className="text-cool-400">
                <GripHorizontal className="w-5 h-5" />
              </div>
              <Bell className="w-5 h-5 text-srhr" />
              <span className="font-semibold text-cool-800">
                {activeTab === 'notification' ? t('notifications.title') : t('notifications.announcements')}
              </span>
              {(activeTab === 'notification' ? notificationCount : announcementCount) > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                  {activeTab === 'notification' ? notificationCount : announcementCount} {t('notifications.new')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {(activeTab === 'notification' ? notificationCount : announcementCount) > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 text-cool-500 hover:text-srhr hover:bg-srhr/10 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-cool-400 hover:text-cool-600 hover:bg-cool-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-cool-100">
            <button
              onClick={() => setActiveTab('notification')}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                activeTab === 'notification'
                  ? 'text-srhr border-b-2 border-srhr bg-srhr/5'
                  : 'text-cool-500 hover:text-cool-700 hover:bg-cool-50'
              )}
            >
              <Bell className="w-4 h-4" />
              {t('notifications.title')}
              {notificationCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                  {notificationCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('announcement')}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                activeTab === 'announcement'
                  ? 'text-srhr border-b-2 border-srhr bg-srhr/5'
                  : 'text-cool-500 hover:text-cool-700 hover:bg-cool-50'
              )}
            >
              <Megaphone className="w-4 h-4" />
              {t('notifications.announcements')}
              {announcementCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                  {announcementCount}
                </span>
              )}
            </button>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {sortedItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-16 h-16 bg-cool-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  {activeTab === 'notification' ? (
                    <Bell className="w-8 h-8 text-cool-300" />
                  ) : (
                    <Megaphone className="w-8 h-8 text-cool-300" />
                  )}
                </div>
                <p className="text-cool-500 text-sm">
                  No {activeTab === 'notification' ? 'notifications' : 'announcements'} yet
                </p>
                <p className="text-cool-400 text-xs mt-1">
                  RM Admin AI will notify you when something important happens
                </p>
              </div>
            ) : (
              <div className="divide-y divide-cool-100">
                {sortedItems.map((notification: Notification) => {
                  const isUnread = userId && !notification.readBy.includes(userId);
                  const isExpanded = expandedNotification === notification.id;
                  const Icon = typeIcons[notification.type];
                  const hasFullContent = notification.fullContent && notification.fullContent !== notification.content;

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        'px-4 py-3 transition-colors',
                        isUnread ? 'bg-blue-50/50' : 'bg-white',
                        notification.actionUrl && 'cursor-pointer hover:bg-cool-50'
                      )}
                    >
                      <div className="flex gap-3">
                        {/* Avatar/Icon */}
                        <div className="flex-shrink-0">
                          {notification.aiAvatar ? (
                            <img
                              src={notification.aiAvatar}
                              alt="RM Admin AI"
                              className="w-10 h-10 rounded-xl object-cover border border-cool-200"
                            />
                          ) : (
                            <div
                              className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center',
                                notification.source === 'rm_admin_ai'
                                  ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                  : notification.source === 'admin'
                                  ? 'bg-slate-700 text-white'
                                  : 'bg-cool-100 text-cool-600'
                              )}
                            >
                              {notification.source === 'rm_admin_ai' ? (
                                <Bot className="w-5 h-5" />
                              ) : notification.source === 'admin' ? (
                                <Crown className="w-5 h-5" />
                              ) : (
                                Icon
                              )}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-cool-900 text-sm leading-tight">
                                {notification.title}
                              </p>
                              <p className={cn(
                                "text-cool-600 text-xs mt-1",
                                !isExpanded && "line-clamp-2"
                              )}>
                                {notification.content}
                              </p>

                              {/* Expanded Content */}
                              {isExpanded && hasFullContent && (
                                <div className="mt-2 p-2 bg-cool-50 rounded-lg">
                                  <p className="text-cool-700 text-xs whitespace-pre-line">
                                    {notification.fullContent}
                                  </p>
                                </div>
                              )}
                            </div>
                            {isUnread && (
                              <span className="w-2 h-2 bg-srhr rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>

                          {/* Read More Button */}
                          {hasFullContent && (
                            <button
                              onClick={(e) => toggleExpand(notification.id, e)}
                              className="mt-1 flex items-center gap-1 text-srhr text-xs hover:underline"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  Read more
                                </>
                              )}
                            </button>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                                  priorityTextColors[notification.priority],
                                  notification.priority === 'high'
                                    ? 'bg-red-50'
                                    : notification.priority === 'medium'
                                    ? 'bg-amber-50'
                                    : 'bg-blue-50'
                                )}
                              >
                                {notification.priority}
                              </span>
                              <span className="text-[10px] text-cool-400 flex items-center gap-1">
                                {sourceIcons[notification.source]}
                                {sourceLabels[notification.source]}
                              </span>
                            </div>
                            <span className="text-[10px] text-cool-400">
                              {getRelativeTime(notification.createdAt)}
                            </span>
                          </div>

                          {/* Action Button */}
                          {notification.actionUrl && (
                            <button
                              onClick={() => handleNotificationClick(notification)}
                              className="mt-2 flex items-center gap-1 text-srhr text-xs font-medium hover:underline"
                            >
                              <span>{notification.actionLabel || 'View'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-cool-100 bg-cool-50 text-center">
            <p className="text-xs text-cool-500">
              RM Admin AI
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
