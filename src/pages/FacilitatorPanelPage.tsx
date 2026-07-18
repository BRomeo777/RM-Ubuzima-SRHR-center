import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistentStore, useEphemeralStore } from '../store';
import {
  Shield,
  LogOut,
  MessageSquare,
  Users,
  Ban,
  Trash2,
  Check,
  X,
  Crown,
  AlertTriangle,
  Layout,
  Bell,
  UserCheck,
  ChevronLeft,
  Clock,
  Send,
  FileText,
  Info,
  Hourglass,
  CheckCircle,
  XCircle,
  Edit3,
  User,
  Bot,
  Plus,
  Newspaper,
  Smartphone,
  HeartPulse,
  Phone,
  Image as ImageIcon,
  Video,
  Save,
  Edit2,
  NewspaperIcon
} from 'lucide-react';
import { cn, fileToBase64, validateFileSize, generateId } from '../utils/helpers';
import { Link } from 'react-router-dom';
import bcrypt from 'bcryptjs';
import type { ChatMessage, Facilitator, FacilitatorRequest, AIPost, AIType, StatusUpdate, Topic, Article, EmergencyContact } from '../types';
import RichTextEditor from '../components/RichTextEditor';

// Permanent facilitator password
const DEFAULT_FACILITATOR_PASSWORD = 'FACILITATOR2026@ubuzima';

type ViewState = 'login' | 'request-form' | 'pending' | 'denied' | 'dashboard';

export default function FacilitatorPanelPage() {
  const { t } = useTranslation();
  const { session } = useEphemeralStore();
  const [viewState, setViewState] = useState<ViewState>('login');
  const [activeTab, setActiveTab] = useState('overview');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [submitError, setSubmitError] = useState('');

  const {
    chatMessages,
    chatSettings,
    deleteChatMessage,
    banUser,
    unbanUser,
    requestFacilitator,
    isUserFacilitator,
    hasPendingFacilitatorRequest,
    getFacilitator,
    syncSettings,
    updateFacilitatorStatus,
    // Daily Feed & News Feed
    aiPosts,
    addAIPost,
    deleteAIPost,
    // Status Updates
    statusUpdates,
    addStatusUpdate,
    deleteStatusUpdate,
    // SRHR Content
    topics,
    articles,
    addTopic,
    deleteTopic,
    addArticle,
    updateArticle,
    deleteArticle,
    // Emergency
    emergencyContacts,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
  } = usePersistentStore();

  const currentUser = session?.user;
  const facilitatorPassword = chatSettings?.facilitatorPassword || DEFAULT_FACILITATOR_PASSWORD;

  // Sync settings from Firebase on mount to get latest facilitator data
  useEffect(() => {
    const unsubscribe = syncSettings();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [syncSettings]);

  // Check user status on mount and when chatSettings changes
  useEffect(() => {
    // If no user is logged in, stay on login view for password-only access
    if (!currentUser) {
      setViewState('login');
      return;
    }

    // Check if user is already a facilitator
    // Pass session user to check both chatSettings, savedUser, and session data
    if (isUserFacilitator(currentUser.id, currentUser)) {
      setViewState('dashboard');
      return;
    }

    // CRITICAL: Also check session.user.isFacilitator for freshly logged-in users
    // This is set during login from Firestore profile and may be available before
    // chatSettings syncs from Firebase or savedUser is fully loaded
    if (currentUser.isFacilitator) {
      console.log('[FacilitatorPanel] User has isFacilitator flag in session, granting access');
      setViewState('dashboard');
      return;
    }

    // Check if user has a pending request
    if (hasPendingFacilitatorRequest(currentUser.id)) {
      setViewState('pending');
      return;
    }

    // Check if user has a denied request
    const deniedRequest = chatSettings?.facilitatorRequests?.find(
      r => r.userId === currentUser.id && r.status === 'denied'
    );
    if (deniedRequest) {
      setViewState('denied');
      return;
    }

    // If password verified, show request form (for logged-in users requesting access)
    if (password && password === facilitatorPassword) {
      setViewState('request-form');
    }
  }, [currentUser, chatSettings, isUserFacilitator, hasPendingFacilitatorRequest, facilitatorPassword, password]);

  // Real-time check: If user is on pending page but becomes facilitator, auto-redirect to dashboard
  useEffect(() => {
    if (viewState === 'pending' && currentUser) {
      const checkInterval = setInterval(() => {
        // Force fresh read from store by checking chatSettings directly
        // This ensures we get the latest Firebase-synced data
        const freshSettings = usePersistentStore.getState().chatSettings;
        const isNowFacilitator = freshSettings?.facilitators?.some(
          f => f.userId === currentUser.id
        );

        if (isNowFacilitator) {
          setViewState('dashboard');
          showSuccess('Congratulations! Your request has been approved. Welcome, Facilitator!');
        }
      }, 3000); // Check every 3 seconds

      return () => clearInterval(checkInterval);
    }
  }, [viewState, currentUser]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      setLoginError('Password is required');
      return;
    }

    // Check facilitator password - ANY device, ANY user, just need password
    let isValid = false;
    if (facilitatorPassword.startsWith('$2')) {
      isValid = await bcrypt.compare(trimmedPassword, facilitatorPassword);
    } else {
      isValid = trimmedPassword === facilitatorPassword;
    }

    if (!isValid) {
      setLoginError('Invalid facilitator password');
      return;
    }

    // Password is correct - grant immediate facilitator access
    // Use a stable ID based on user account OR a persistent device identifier
    const sessionId = currentUser?.id || `facilitator-${btoa(trimmedPassword).slice(0, 20)}`;
    const sessionName = currentUser?.name || 'Facilitator';
    const sessionAvatar = currentUser?.avatar || '';

    // Check if already facilitator by ID
    if (isUserFacilitator(sessionId)) {
      // Update online status
      await updateFacilitatorStatus(sessionId, true);
      setViewState('dashboard');
      showSuccess('Welcome back, Facilitator!');
      return;
    }
    
    // Check if already a facilitator by name (prevent duplicates for password-only users)
    const existingFacilitator = chatSettings?.facilitators?.find(
      f => f.userName === sessionName && f.assignedBy === 'password-auth' && !currentUser
    );
    
    if (existingFacilitator && !currentUser) {
      // Update existing facilitator to online
      await updateFacilitatorStatus(existingFacilitator.userId, true);
      setViewState('dashboard');
      showSuccess('Welcome back, Facilitator!');
      return;
    }

    // Auto-add as facilitator with full permissions - no approval needed
    const { addFacilitator } = usePersistentStore.getState();
    await addFacilitator({
      userId: sessionId,
      userName: sessionName,
      userAvatar: sessionAvatar,
      assignedBy: 'password-auth',
      canDeleteMessages: true,
      canBanUsers: true,
      canSendAnnouncements: true,
      canPostDailyFeed: true,
      canPostNewsFeed: true,
      canPostStatus: true,
      canManageSRHR: true,
      canManageEmergency: true,
      role: 'Facilitator',
      badges: ['F'],
      isBigSister: false,
      isHealthcareProvider: false,
    });

    setViewState('dashboard');
    showSuccess('Welcome, Facilitator! You have full access on any device.');
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!currentUser) {
      setSubmitError('Please log in to submit a request');
      return;
    }

    if (!requestReason.trim() || requestReason.length < 50) {
      setSubmitError('Please provide a detailed reason (at least 50 characters)');
      return;
    }

    const success = await requestFacilitator({
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      reason: requestReason.trim(),
    });

    if (success) {
      setViewState('pending');
      showSuccess('Your request has been submitted for review');
    } else {
      setSubmitError('Failed to submit request. You may already have a pending request.');
    }
  };

  const handleLogout = async () => {
    // Update facilitator status to offline before logging out
    if (currentUser && isUserFacilitator(currentUser.id)) {
      await updateFacilitatorStatus(currentUser.id, false);
    }
    setPassword('');
    setRequestReason('');
    setViewState('login');
  };
  
  // Update online status when dashboard loads with heartbeat mechanism
  useEffect(() => {
    if (viewState === 'dashboard' && currentUser && isUserFacilitator(currentUser.id)) {
      const facilitatorId = currentUser.id;
      
      // Set online immediately
      updateFacilitatorStatus(facilitatorId, true);
      
      // Heartbeat: Update lastSeen every 30 seconds to show active status
      // This also serves as a cleanup mechanism - if heartbeat stops, lastSeen goes stale
      const heartbeatInterval = setInterval(() => {
        updateFacilitatorStatus(facilitatorId, true);
      }, 30000);
      
      // Handle page visibility changes (tab switching)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Tab hidden - user may have switched away, set offline after delay
          console.log('[FacilitatorPanel] Tab hidden, scheduling offline update');
        } else {
          // Tab visible again - set online
          console.log('[FacilitatorPanel] Tab visible, setting online');
          updateFacilitatorStatus(facilitatorId, true);
        }
      };
      
      // Handle page unload (browser close, refresh, navigation)
      const handleBeforeUnload = () => {
        // Use synchronous approach for beforeunload
        // Fire and forget - best effort to set offline
        updateFacilitatorStatus(facilitatorId, false).catch(() => {
          // Silent fail - we're leaving the page
        });
      };
      
      // Handle pagehide (more reliable than beforeunload on mobile)
      const handlePageHide = () => {
        updateFacilitatorStatus(facilitatorId, false).catch(() => {
          // Silent fail
        });
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('pagehide', handlePageHide);
      
      return () => {
        // Cleanup
        clearInterval(heartbeatInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('pagehide', handlePageHide);
        
        // Set offline on component unmount (navigation within app)
        updateFacilitatorStatus(facilitatorId, false);
      };
    }
  }, [viewState, currentUser, isUserFacilitator, updateFacilitatorStatus]);

  const handleDeleteMessage = async (messageId: string) => {
    const success = await deleteChatMessage(messageId);
    if (success) {
      showSuccess('Message deleted successfully');
    }
  };

  const handleBanUser = async (userId: string) => {
    const success = await banUser(userId);
    if (success) {
      showSuccess('User banned successfully');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    const success = await unbanUser(userId);
    if (success) {
      showSuccess('User unbanned successfully');
    }
  };

  // Get current facilitator permissions
  const currentFacilitator = currentUser ? getFacilitator(currentUser.id) : null;
  const canPostDailyFeed = currentFacilitator?.canPostDailyFeed ?? true;
  const canPostNewsFeed = currentFacilitator?.canPostNewsFeed ?? true;
  const canPostStatus = currentFacilitator?.canPostStatus ?? true;
  const canManageSRHR = currentFacilitator?.canManageSRHR ?? true;
  const canManageEmergency = currentFacilitator?.canManageEmergency ?? true;

  const facilitators = chatSettings?.facilitators || [];
  const bannedUsers = chatSettings?.bannedUsers || [];

  // ======== Daily Feed & News Feed Handlers ========
  const handleAddDailyFeedPost = async (content: string, type: 'text' | 'image' | 'video', mediaUrl?: string) => {
    const newPost: Omit<AIPost, 'id' | 'timestamp'> = {
      aiType: 'ubuzima-admin',
      content,
      category: 'facilitator',
      isActive: true,
      postLength: 'medium',
      views: 0,
      createdBy: currentFacilitator?.userId,
      createdByName: currentFacilitator?.userName,
      createdByAvatar: currentFacilitator?.userAvatar,
      createdByBadge: 'Facilitator',
      type,
      mediaUrl,
    };
    const success = await addAIPost(newPost);
    if (success) {
      showSuccess('Post added to daily feed');
    }
    return success;
  };

  const handleAddNewsFeedPost = async (content: string, type: 'text' | 'image' | 'video', mediaUrl?: string) => {
    // News feed posts are similar but marked differently
    const newPost: Omit<AIPost, 'id' | 'timestamp'> = {
      aiType: 'ubuzima-admin',
      content: `[NEWS] ${content}`,
      category: 'news',
      isActive: true,
      postLength: 'medium',
      views: 0,
      createdBy: currentFacilitator?.userId,
      createdByName: currentFacilitator?.userName,
      createdByAvatar: currentFacilitator?.userAvatar,
      createdByBadge: 'Facilitator',
      type,
      mediaUrl,
    };
    const success = await addAIPost(newPost);
    if (success) {
      showSuccess('News posted successfully');
    }
    return success;
  };

  // ======== Status Update Handlers ========
  const handleAddStatus = async (type: 'text' | 'image' | 'video', content: string, mediaUrl?: string) => {
    const success = await addStatusUpdate({
      type,
      content,
      mediaUrl,
      viewedBy: [],
      createdBy: currentFacilitator?.userId,
      createdByName: currentFacilitator?.userName,
      createdByAvatar: currentFacilitator?.userAvatar,
      createdByBadge: 'Facilitator',
    });
    if (success) {
      showSuccess('Status update posted');
    }
    return success;
  };

  // ============ LOGIN VIEW ============
  if (viewState === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-purple-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Facilitator Access</h1>
            <p className="text-gray-500 mt-2">Enter the facilitator password for immediate access on any device</p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facilitator Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                placeholder="Enter password provided by admin"
              />
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-700">
                  Enter the correct password to get immediate facilitator access. Works on any device, any phone, any PC - no account needed.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-md"
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Continue
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/settings" className="text-sm text-gray-500 hover:text-purple-600 transition-colors inline-flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              Back to Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============ REQUEST FORM VIEW ============
  if (viewState === 'request-form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full border border-purple-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Edit3 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Request Facilitator Status</h1>
            <p className="text-gray-500 mt-2">Tell us why you want to join the facilitator team</p>
          </div>

          {currentUser && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{currentUser.name}</p>
                <p className="text-sm text-gray-500">{currentUser.email}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">{submitError}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why do you want to become a facilitator? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
                placeholder="Explain your motivation, relevant experience, and how you can contribute to the community. Be specific and detailed (minimum 50 characters)."
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {requestReason.length} characters (min 50)
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Your request will be reviewed by an administrator. You'll be notified once a decision is made.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={requestReason.length < 50}
                className={cn(
                  'flex-[2] py-3 rounded-xl font-medium transition-all shadow-md',
                  requestReason.length >= 50
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4 inline mr-2" />
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ============ PENDING VIEW ============
  if (viewState === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-purple-100 text-center">
          <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Hourglass className="w-12 h-12 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Pending</h1>
          <p className="text-gray-500 mb-6">
            Your facilitator request has been submitted and is currently under review by an administrator.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-amber-800">
              Please check back later or wait for a notification. The review process typically takes 1-3 business days.
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-800 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              You will be automatically redirected when approved
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ============ DENIED VIEW ============
  if (viewState === 'denied') {
    const deniedRequest = chatSettings?.facilitatorRequests?.find(
      r => r.userId === currentUser?.id && r.status === 'denied'
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-red-100 text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Declined</h1>
          <p className="text-gray-500 mb-6">
            We regret to inform you that your facilitator request has been declined.
          </p>
          {deniedRequest?.denialReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-red-900 mb-1">Reason:</p>
              <p className="text-sm text-red-700">{deniedRequest.denialReason}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ============ DASHBOARD VIEW (for approved facilitators) ============
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900">Facilitator Panel</h1>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Community Management</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">{successMessage}</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Horizontal scrollable on mobile, vertical on desktop */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 hidden lg:block">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Menu</p>
              </div>
              <nav className="p-2 overflow-x-auto scrollbar-hide">
                <div className="flex lg:flex-col gap-1 min-w-max lg:min-w-0">
                  {[
                    { key: 'overview', label: 'Overview', icon: Layout },
                    { key: 'messages', label: 'Messages', icon: MessageSquare },
                    { key: 'users', label: 'User Mgmt', icon: Users },
                    ...(canPostDailyFeed ? [{ key: 'daily-feed', label: 'Daily Feed', icon: Bot }] : []),
                    ...(canPostNewsFeed ? [{ key: 'news-feed', label: 'News Feed', icon: Newspaper }] : []),
                    ...(canPostStatus ? [{ key: 'status', label: 'Status', icon: Smartphone }] : []),
                    ...(canManageSRHR ? [{ key: 'srhr', label: 'SRHR Content', icon: HeartPulse }] : []),
                    ...(canManageEmergency ? [{ key: 'emergency', label: 'Emergency', icon: Phone }] : []),
                    { key: 'facilitators', label: 'Facilitators', icon: UserCheck },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setActiveTab(item.key)}
                      className={cn(
                        'flex items-center gap-2 lg:gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 lg:flex-shrink lg:w-auto',
                        activeTab === item.key
                          ? 'bg-purple-50 text-purple-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline lg:inline">{item.label}</span>
                      <span className="sm:hidden">{item.label.slice(0, 3)}</span>
                    </button>
                  ))}
                </div>
              </nav>
            </div>

            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-4 hidden lg:block">
              <div className="flex items-start gap-2">
                <Crown className="w-4 h-4 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-900">Facilitator Status</p>
                  <p className="text-xs text-purple-700 mt-1">
                    You have moderation powers, can post to daily feed, news feed, status updates, and manage SRHR content & emergencies.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{chatMessages.length}</p>
                    <p className="text-sm text-gray-500">Total Messages</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                      <UserCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{facilitators.length}</p>
                    <p className="text-sm text-gray-500">Facilitators</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3">
                      <Ban className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{bannedUsers.length}</p>
                    <p className="text-sm text-gray-500">Banned Users</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Recent Activity</h2>
                  </div>
                  <div className="p-4">
                    {chatMessages.slice(-5).reverse().map((msg) => (
                      <div key={msg.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <Shield className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{msg.userName}</p>
                          <p className="text-sm text-gray-600 line-clamp-1">{msg.content}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(msg.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {chatMessages.length === 0 && (
                      <p className="text-center text-gray-500 py-8">No messages yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Message Management</h2>
                  <p className="text-sm text-gray-500">Delete inappropriate messages</p>
                </div>
                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                  {chatMessages.slice(-20).reverse().map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border',
                        msg.isDeleted
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : 'bg-white border-gray-200'
                      )}
                    >
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{msg.userName}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(msg.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {msg.isDeleted ? <span className="italic">Message deleted</span> : msg.content}
                        </p>
                      </div>
                      {!msg.isDeleted && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No messages to display</p>
                  )}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-red-500" />
                    Ban User
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Enter User ID to ban"
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleBanUser((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = (e.currentTarget.previousSibling as HTMLInputElement);
                        handleBanUser(input.value);
                        input.value = '';
                      }}
                      className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                    >
                      <Ban className="w-4 h-4 inline mr-2" />
                      Ban
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Banned Users ({bannedUsers.length})</h3>
                  </div>
                  <div className="p-4">
                    {bannedUsers.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No banned users</p>
                    ) : (
                      <div className="space-y-2">
                        {bannedUsers.map((userId) => (
                          <div
                            key={userId}
                            className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                <Ban className="w-4 h-4 text-red-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">{userId}</span>
                            </div>
                            <button
                              onClick={() => handleUnbanUser(userId)}
                              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                              Unban
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Daily Feed Tab */}
            {activeTab === 'daily-feed' && canPostDailyFeed && (
              <FacilitatorDailyFeedTab
                aiPosts={aiPosts}
                onAddPost={handleAddDailyFeedPost}
                onDelete={deleteAIPost}
                showSuccess={showSuccess}
              />
            )}

            {/* News Feed Tab */}
            {activeTab === 'news-feed' && canPostNewsFeed && (
              <FacilitatorNewsFeedTab
                aiPosts={aiPosts}
                onAddPost={handleAddNewsFeedPost}
                onDelete={deleteAIPost}
                showSuccess={showSuccess}
              />
            )}

            {/* Status Updates Tab */}
            {activeTab === 'status' && canPostStatus && (
              <FacilitatorStatusTab
                statusUpdates={statusUpdates}
                onAdd={handleAddStatus}
                onDelete={deleteStatusUpdate}
              />
            )}

            {/* SRHR Content Tab */}
            {activeTab === 'srhr' && canManageSRHR && (
              <FacilitatorSRHRTab
                topics={topics}
                articles={articles}
                onAddTopic={addTopic}
                onDeleteTopic={deleteTopic}
                onAddArticle={addArticle}
                onUpdateArticle={updateArticle}
                onDeleteArticle={deleteArticle}
              />
            )}

            {/* Emergency Tab */}
            {activeTab === 'emergency' && canManageEmergency && (
              <FacilitatorEmergencyTab
                contacts={emergencyContacts}
                onAdd={addEmergencyContact}
                onUpdate={updateEmergencyContact}
                onDelete={deleteEmergencyContact}
              />
            )}

            {/* Facilitators Tab */}
            {activeTab === 'facilitators' && (
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Crown className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-purple-900">Facilitator Team</h3>
                      <p className="text-sm text-purple-700 mt-1">
                        View current facilitators. Only administrators can add or remove facilitators.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Current Facilitators ({facilitators.length})</h3>
                  </div>
                  <div className="p-4">
                    {facilitators.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No facilitators assigned</p>
                    ) : (
                      <div className="space-y-3">
                        {facilitators.map((facilitator) => (
                          <div
                            key={facilitator.userId}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg',
                              facilitator.userId === currentUser?.id
                                ? 'bg-purple-50 border border-purple-200'
                                : 'bg-gray-50'
                            )}
                          >
                            {/* Avatar with Facilitator Badge */}
                            <div className="relative">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center overflow-hidden">
                                {facilitator.userAvatar ? (
                                  <img
                                    src={facilitator.userAvatar}
                                    alt={facilitator.userName}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <Shield className="w-5 h-5 text-purple-600" />
                                )}
                              </div>
                              {/* Facilitator Badge - Dark Green "F" */}
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-800 rounded-full flex items-center justify-center border-2 border-white">
                                <span className="text-[8px] font-bold text-white">F</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{facilitator.userName}</p>
                                {facilitator.userId === currentUser?.id && (
                                  <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs rounded-full font-medium">
                                    You
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[10px] rounded font-medium">
                                  F
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {facilitator.role || 'Facilitator'} • Added {new Date(facilitator.assignedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              Active
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ============ FACILITATOR TAB COMPONENTS ============

// Daily Feed Tab Component
function FacilitatorDailyFeedTab({
  aiPosts,
  onAddPost,
  onDelete,
  showSuccess,
}: {
  aiPosts: AIPost[];
  onAddPost: (content: string, type: 'text' | 'image' | 'video', mediaUrl?: string) => Promise<AIPost | null>;
  onDelete: (id: string) => Promise<void>;
  showSuccess: (msg: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [postType, setPostType] = useState<'text' | 'image' | 'video'>('text');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileSize(file);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setUploadedImage(base64);
      setMediaUrl(base64);
    } catch (error) {
      alert('Failed to upload image');
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    const success = await onAddPost(content, postType, mediaUrl || undefined);
    if (success) {
      setIsAdding(false);
      setContent('');
      setMediaUrl('');
      setUploadedImage(null);
      setPostType('text');
    }
  };

  // Filter posts by facilitator
  const facilitatorPosts = aiPosts.filter(p => p.category === 'facilitator');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Feed Posts</h2>
          <p className="text-sm text-gray-500 mt-1">Post words, photos, and video links to the daily feed where AI normally posts.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Add Post Form */}
      {isAdding && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Create Daily Feed Post</h3>
          
          {/* Type Selection */}
          <div className="flex gap-2 mb-4">
            {(['text', 'image', 'video'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setPostType(type)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium capitalize transition-colors',
                  postType === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <textarea
              placeholder="What's on your mind? Share health tips, news, or information..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={4}
            />

            {/* Image Upload */}
            {postType === 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {uploadedImage && (
                  <div className="mt-3 relative">
                    <img
                      src={uploadedImage}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setMediaUrl('');
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Video URL */}
            {postType === 'video' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL (YouTube, etc.)
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              Post to Daily Feed
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setContent('');
                setMediaUrl('');
                setUploadedImage(null);
              }}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Your Posts ({facilitatorPosts.length})</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {facilitatorPosts.slice().reverse().map((post) => (
            <div key={post.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              {/* Media Thumbnail */}
              {post.mediaUrl && post.type === 'image' && (
                <img
                  src={post.mediaUrl}
                  alt="Post thumbnail"
                  className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                />
              )}
              {post.mediaUrl && post.type === 'video' && (
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-purple-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {post.type && post.type !== 'text' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                      {post.type}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(post.timestamp).toLocaleDateString()} • {post.views} views
                </p>
              </div>
              <button
                onClick={() => onDelete(post.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {facilitatorPosts.length === 0 && (
            <p className="text-gray-500 text-center py-8">No posts yet. Create your first post above.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// News Feed Tab Component (similar to Daily Feed but with [NEWS] prefix)
function FacilitatorNewsFeedTab({
  aiPosts,
  onAddPost,
  onDelete,
  showSuccess,
}: {
  aiPosts: AIPost[];
  onAddPost: (content: string, type: 'text' | 'image' | 'video', mediaUrl?: string) => Promise<AIPost | null>;
  onDelete: (id: string) => Promise<void>;
  showSuccess: (msg: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [postType, setPostType] = useState<'text' | 'image' | 'video'>('text');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileSize(file);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setUploadedImage(base64);
      setMediaUrl(base64);
    } catch (error) {
      alert('Failed to upload image');
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    const success = await onAddPost(content, postType, mediaUrl || undefined);
    if (success) {
      setIsAdding(false);
      setContent('');
      setMediaUrl('');
      setUploadedImage(null);
      setPostType('text');
    }
  };

  // Filter posts by news category
  const newsPosts = aiPosts.filter(p => p.category === 'news');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">News Feed</h2>
          <p className="text-sm text-gray-500 mt-1">Post news updates without limits. These appear in the news section.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New News Post
        </button>
      </div>

      {/* Add Post Form */}
      {isAdding && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Create News Post</h3>
          
          {/* Type Selection */}
          <div className="flex gap-2 mb-4">
            {(['text', 'image', 'video'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setPostType(type)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium capitalize transition-colors',
                  postType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <textarea
              placeholder="Share the latest news and updates..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />

            {/* Image Upload */}
            {postType === 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadedImage && (
                  <div className="mt-3 relative">
                    <img
                      src={uploadedImage}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setMediaUrl('');
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Video URL */}
            {postType === 'video' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL (YouTube, etc.)
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Post News
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setContent('');
                setMediaUrl('');
                setUploadedImage(null);
              }}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* News Posts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">News Posts ({newsPosts.length})</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {newsPosts.slice().reverse().map((post) => (
            <div key={post.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              {/* Media Thumbnail */}
              {post.mediaUrl && post.type === 'image' && (
                <img
                  src={post.mediaUrl}
                  alt="Post thumbnail"
                  className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                />
              )}
              {post.mediaUrl && post.type === 'video' && (
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-blue-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-300 shadow-sm" style={{ fontFamily: 'Arial Black, Impact, sans-serif', letterSpacing: '0.5px' }}>News !</span>
                  {post.type && post.type !== 'text' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                      {post.type}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">{post.content.replace(/\[NEWS\]\s*/i, '')}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(post.timestamp).toLocaleDateString()} • {post.views} views
                </p>
              </div>
              <button
                onClick={() => onDelete(post.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {newsPosts.length === 0 && (
            <p className="text-gray-500 text-center py-8">No news posts yet. Create your first news post above.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Status Updates Tab Component
function FacilitatorStatusTab({
  statusUpdates,
  onAdd,
  onDelete,
}: {
  statusUpdates: StatusUpdate[];
  onAdd: (type: 'text' | 'image' | 'video', content: string, mediaUrl?: string) => Promise<StatusUpdate | null>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [statusType, setStatusType] = useState<'image' | 'video' | 'text'>('text');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileSize(file);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setUploadedImage(base64);
      setMediaUrl(base64);
    } catch (error) {
      alert('Failed to upload image');
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    const success = await onAdd(statusType, content.trim(), mediaUrl || undefined);
    if (success) {
      setIsAdding(false);
      setContent('');
      setMediaUrl('');
      setUploadedImage(null);
      setStatusType('text');
    }
  };

  // Filter active status updates (not expired)
  const activeStatuses = statusUpdates.filter((status) => {
    const expiresAt = new Date(status.expiresAt);
    return expiresAt > new Date();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Status Updates</h2>
          <p className="text-sm text-gray-500 mt-1">Post WhatsApp-style status updates that expire after 24 hours.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Status
        </button>
      </div>

      {/* Add Status Form */}
      {isAdding && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Create Status Update</h3>
          
          {/* Type Selection */}
          <div className="flex gap-2 mb-4">
            {(['text', 'image', 'video'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setStatusType(type)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium capitalize transition-colors',
                  statusType === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <textarea
              placeholder="What's new? (caption or text content)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
            />

            {/* Image Upload */}
            {statusType === 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {uploadedImage && (
                  <div className="mt-3 relative">
                    <img
                      src={uploadedImage}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setMediaUrl('');
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Video URL */}
            {statusType === 'video' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or video URL"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              Post Status
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setContent('');
                setMediaUrl('');
                setUploadedImage(null);
              }}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeStatuses.slice().reverse().map((status) => {
          const hoursLeft = Math.ceil(
            (new Date(status.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)
          );

          return (
            <div
              key={status.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    status.type === 'image' ? 'bg-purple-500' :
                    status.type === 'video' ? 'bg-blue-500' : 'bg-gray-500'
                  )} />
                  <span className="text-xs font-medium uppercase text-gray-500">
                    {status.type}
                  </span>
                </div>
                <button
                  onClick={() => onDelete(status.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Media Preview */}
              {status.mediaUrl && status.type === 'image' && (
                <img
                  src={status.mediaUrl}
                  alt="Status"
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
              )}
              {status.mediaUrl && status.type === 'video' && (
                <div className="w-full h-40 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <Video className="w-12 h-12 text-blue-600" />
                </div>
              )}

              {/* Content */}
              <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                {status.content}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{new Date(status.timestamp).toLocaleDateString()}</span>
                <span className={cn(
                  'px-2 py-1 rounded-full',
                  hoursLeft <= 4 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                )}>
                  {hoursLeft}h left
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activeStatuses.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No active status updates</p>
          <p className="text-sm text-gray-400 mt-1">
            Create status updates to engage users with WhatsApp-style stories
          </p>
        </div>
      )}
    </div>
  );
}

// SRHR Content Tab Component (Simplified for facilitators)
function FacilitatorSRHRTab({
  topics,
  articles,
  onAddTopic,
  onDeleteTopic,
  onAddArticle,
  onUpdateArticle,
  onDeleteArticle,
}: {
  topics: Topic[];
  articles: Article[];
  onAddTopic: (topic: Omit<Topic, 'id' | 'createdAt'>) => Promise<Topic>;
  onDeleteTopic: (id: string) => Promise<void>;
  onAddArticle: (article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Article>;
  onUpdateArticle: (id: string, updates: Partial<Article>) => Promise<void>;
  onDeleteArticle: (id: string) => Promise<void>;
}) {
  const [activeSection, setActiveSection] = useState<'topics' | 'articles'>('topics');
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [isAddingArticle, setIsAddingArticle] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  
  const [topicForm, setTopicForm] = useState({
    name: '',
    nameKinyarwanda: '',
    nameFrench: '',
    nameSwahili: '',
  });
  
  const [articleForm, setArticleForm] = useState({
    topicId: '',
    title: '',
    titleKinyarwanda: '',
    titleFrench: '',
    titleSwahili: '',
    content: '',
    contentKinyarwanda: '',
    contentFrench: '',
    contentSwahili: '',
    images: [] as string[],
    videos: [] as string[],
  });

  const handleAddTopic = () => {
    if (!topicForm.name) return;
    onAddTopic(topicForm);
    setTopicForm({ name: '', nameKinyarwanda: '', nameFrench: '', nameSwahili: '' });
    setIsAddingTopic(false);
  };

  const handleAddArticle = () => {
    if (!articleForm.title || !articleForm.topicId) return;
    onAddArticle({
      ...articleForm,
      images: articleForm.images,
      videos: articleForm.videos,
    });
    setArticleForm({
      topicId: '',
      title: '',
      titleKinyarwanda: '',
      titleFrench: '',
      titleSwahili: '',
      content: '',
      contentKinyarwanda: '',
      contentFrench: '',
      contentSwahili: '',
      images: [],
      videos: [],
    });
    setIsAddingArticle(false);
  };

  const handleUpdateArticle = () => {
    if (!editingArticleId) return;
    onUpdateArticle(editingArticleId, articleForm);
    setEditingArticleId(null);
    setArticleForm({
      topicId: '',
      title: '',
      titleKinyarwanda: '',
      titleFrench: '',
      titleSwahili: '',
      content: '',
      contentKinyarwanda: '',
      contentFrench: '',
      contentSwahili: '',
      images: [],
      videos: [],
    });
  };

  const startEditArticle = (article: Article) => {
    setEditingArticleId(article.id);
    setArticleForm({
      topicId: article.topicId,
      title: article.title,
      titleKinyarwanda: article.titleKinyarwanda || '',
      titleFrench: article.titleFrench || '',
      titleSwahili: article.titleSwahili || '',
      content: article.content,
      contentKinyarwanda: article.contentKinyarwanda || '',
      contentFrench: article.contentFrench || '',
      contentSwahili: article.contentSwahili || '',
      images: article.images,
      videos: article.videos,
    });
  };

  const filteredArticles = selectedTopicId 
    ? articles.filter(a => a.topicId === selectedTopicId)
    : articles;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SRHR Content Management</h2>
          <p className="text-sm text-gray-500 mt-1">Add and manage SRHR topics and articles.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('topics')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeSection === 'topics'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Topics ({topics.length})
          </button>
          <button
            onClick={() => setActiveSection('articles')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeSection === 'articles'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Articles ({articles.length})
          </button>
        </div>
      </div>

      {/* Topics Section */}
      {activeSection === 'topics' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Topics</h3>
            <button
              onClick={() => setIsAddingTopic(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Topic
            </button>
          </div>

          {/* Add Topic Form */}
          {isAddingTopic && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Add New Topic</h4>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Topic Name (English) *"
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                  className="col-span-2 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  placeholder="Kinyarwanda"
                  value={topicForm.nameKinyarwanda}
                  onChange={(e) => setTopicForm({ ...topicForm, nameKinyarwanda: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  placeholder="French"
                  value={topicForm.nameFrench}
                  onChange={(e) => setTopicForm({ ...topicForm, nameFrench: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  placeholder="Swahili"
                  value={topicForm.nameSwahili}
                  onChange={(e) => setTopicForm({ ...topicForm, nameSwahili: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddTopic}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Add Topic
                </button>
                <button
                  onClick={() => setIsAddingTopic(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Topics List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <div key={topic.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{topic.name}</h4>
                    <p className="text-xs text-gray-500">
                      {articles.filter(a => a.topicId === topic.id).length} articles
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteTopic(topic.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {topic.nameKinyarwanda && <span className="mr-2">RW: {topic.nameKinyarwanda}</span>}
                  {topic.nameFrench && <span className="mr-2">FR: {topic.nameFrench}</span>}
                  {topic.nameSwahili && <span>SW: {topic.nameSwahili}</span>}
                </div>
              </div>
            ))}
            {topics.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No topics yet. Create your first topic to organize SRHR content.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Articles Section */}
      {activeSection === 'articles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Articles</h3>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="px-3 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Topics</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIsAddingArticle(true)}
              disabled={topics.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Article
            </button>
          </div>

          {/* Add/Edit Article Form */}
          {(isAddingArticle || editingArticleId) && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">
                {editingArticleId ? 'Edit Article' : 'Add New Article'}
              </h4>
              <div className="space-y-4">
                <select
                  value={articleForm.topicId}
                  onChange={(e) => setArticleForm({ ...articleForm, topicId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!!editingArticleId}
                >
                  <option value="">Select Topic *</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
                
                <input
                  type="text"
                  placeholder="Title (English) *"
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Content (English) *</label>
                  <RichTextEditor
                    value={articleForm.content}
                    onChange={(value) => setArticleForm({ ...articleForm, content: value })}
                    placeholder="Write your article content here. Use the toolbar to format text like in Microsoft Word..."
                    minHeight="250px"
                  />
                </div>

                {/* Video URLs */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Video URLs (YouTube, etc.)</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          if (input.value) {
                            setArticleForm({ ...articleForm, videos: [...articleForm.videos, input.value] });
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="https://youtube.com/watch?v=..."]') as HTMLInputElement;
                        if (input && input.value) {
                          setArticleForm({ ...articleForm, videos: [...articleForm.videos, input.value] });
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {articleForm.videos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {articleForm.videos.map((video, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm">
                          <Video className="w-3 h-3 text-gray-500" />
                          <span className="truncate max-w-[200px]">{video}</span>
                          <button
                            onClick={() => {
                              const newVideos = articleForm.videos.filter((_, i) => i !== idx);
                              setArticleForm({ ...articleForm, videos: newVideos });
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={editingArticleId ? handleUpdateArticle : handleAddArticle}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  {editingArticleId ? 'Save Changes' : 'Add Article'}
                </button>
                <button
                  onClick={() => {
                    setIsAddingArticle(false);
                    setEditingArticleId(null);
                    setArticleForm({
                      topicId: '',
                      title: '',
                      titleKinyarwanda: '',
                      titleFrench: '',
                      titleSwahili: '',
                      content: '',
                      contentKinyarwanda: '',
                      contentFrench: '',
                      contentSwahili: '',
                      images: [],
                      videos: [],
                    });
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Articles List */}
          <div className="space-y-3">
            {filteredArticles.slice().reverse().map((article) => {
              const topic = topics.find(t => t.id === article.topicId);
              return (
                <div key={article.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                          {topic?.name || 'Unknown Topic'}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 truncate">{article.title}</h4>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">{article.content.substring(0, 150)}...</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => startEditArticle(article)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteArticle(article.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredArticles.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {selectedTopicId 
                  ? 'No articles in this topic yet.' 
                  : 'No articles yet. Create your first SRHR article.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Emergency Contacts Tab Component
function FacilitatorEmergencyTab({
  contacts,
  onAdd,
  onUpdate,
  onDelete,
}: {
  contacts: EmergencyContact[];
  onAdd: (contact: Omit<EmergencyContact, 'id'>) => Promise<EmergencyContact | null>;
  onUpdate: (id: string, updates: Partial<EmergencyContact>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    category: 'other' as EmergencyContact['category'],
    description: '',
  });

  const categories = [
    { key: 'police', label: 'Police', color: 'bg-blue-100 text-blue-700' },
    { key: 'ambulance', label: 'Ambulance', color: 'bg-red-100 text-red-700' },
    { key: 'fire', label: 'Fire', color: 'bg-orange-100 text-orange-700' },
    { key: 'suicide', label: 'Suicide Hotline', color: 'bg-purple-100 text-purple-700' },
    { key: 'gbv', label: 'GBV Support', color: 'bg-pink-100 text-pink-700' },
    { key: 'youth', label: 'Youth Support', color: 'bg-green-100 text-green-700' },
    { key: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700' },
  ];

  const handleSubmit = () => {
    if (!formData.name || !formData.number) return;
    
    if (editingId) {
      onUpdate(editingId, formData);
      setEditingId(null);
    } else {
      onAdd(formData);
    }
    
    setFormData({ name: '', number: '', category: 'other', description: '' });
    setIsAdding(false);
  };

  const startEdit = (contact: EmergencyContact) => {
    setFormData({
      name: contact.name,
      number: contact.number,
      category: contact.category,
      description: contact.description || '',
    });
    setEditingId(contact.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Emergency Contacts</h2>
          <p className="text-sm text-gray-500 mt-1">Add and manage emergency contact numbers.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: '', number: '', category: 'other', description: '' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Contact' : 'Add New Contact'}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Contact Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as EmergencyContact['category'] })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {categories.map((cat) => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={2}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.number}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {editingId ? 'Save Changes' : 'Add Contact'}
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                setFormData({ name: '', number: '', category: 'other', description: '' });
              }}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contacts.map((contact) => {
          const category = categories.find(c => c.key === contact.category);
          return (
            <div key={contact.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${category?.color || 'bg-gray-100 text-gray-700'}`}>
                      {category?.label || contact.category}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900">{contact.name}</h4>
                  <a href={`tel:${contact.number}`} className="text-lg font-semibold text-purple-600 hover:text-purple-700">
                    {contact.number}
                  </a>
                  {contact.description && (
                    <p className="text-sm text-gray-500 mt-1">{contact.description}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => startEdit(contact)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(contact.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {contacts.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-gray-50 rounded-xl">
            <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No emergency contacts yet.</p>
            <p className="text-sm text-gray-400 mt-1">Add important emergency numbers for users.</p>
          </div>
        )}
      </div>
    </div>
  );
}
