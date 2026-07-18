import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEphemeralStore, usePersistentStore } from './store';
import { useTranslation } from 'react-i18next';

// Landing Page
import LandingPage from './pages/LandingPage';

// Layout Components
import BottomNavigation from './components/layout/BottomNavigation';
import Footer from './components/layout/Footer';
import DecoyMode from './components/layout/DecoyMode';
import FloatingRMAdminAI from './components/FloatingRMAdminAI';
import { IOSInstallBanner } from './components/IOSInstallBanner';

// Pages
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import SRHRInfoPage from './pages/SRHRInfoPage';
import FindServicePage from './pages/FindServicePage';
import BookDoctorPage from './pages/BookDoctorPage';
import BazaMugangaPage from './pages/BazaMugangaPage';
import MpuzaPage from './pages/MpuzaPage';
import LegalAffairsPage from './pages/LegalAffairsPage';
import EmergencyPage from './pages/EmergencyPage';
import SettingsPage from './pages/SettingsPage';
import ServicesPage from './pages/ServicesPage';
import GirlsRoomPage from './pages/GirlsRoomPage';
import AdminPanelPage from './pages/AdminPanelPage';
import FacilitatorPanelPage from './pages/FacilitatorPanelPage';
import ChatPage from './pages/ChatPage';
import InboxPage from './pages/InboxPage';
import FacilitatorInboxPage from './pages/FacilitatorInboxPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import GroupsPage from './pages/GroupsPage';
import GroupChatPage from './pages/GroupChatPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import HelpCenterPage from './pages/HelpCenterPage';
import AuthActionPage from './pages/AuthActionPage';

// Services
import { startHekimoScheduler, stopHekimoScheduler } from './services/hekimoScheduler';

// ============================================
// MAIN APP COMPONENT - TRADITIONAL NAVIGATION
// ============================================
function App() {
  const { session, decoyMode, setCurrentPage } = useEphemeralStore();
  const { language, darkModeEnabled, savedUser, syncAIPosts, syncAppointments, syncOrganizations, 
          syncStatusUpdates, syncEmergencyContacts, syncFacilities, syncTopics, 
          syncArticles, syncSettings, syncChatMessages } = usePersistentStore();
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Track if we've done initial session restore
  const hasRestoredSession = useRef(false);
  
  // Landing page state - show landing for new visitors
  const [showLanding, setShowLanding] = useState(true);

  // ============================================
  // INITIALIZATION: SESSION RESTORE & LANDING CHECK
  // ============================================
  useEffect(() => {
    // Only restore session ONCE on initial mount
    if (hasRestoredSession.current) return;
    hasRestoredSession.current = true;

    const { savedUser } = usePersistentStore.getState();
    const { session } = useEphemeralStore.getState();
    
    // Check if user has seen landing page before
    const hasSeenLanding = localStorage.getItem('rm_ubuzima_landing_seen');
    if (hasSeenLanding === 'true') {
      setShowLanding(false);
    }
    
    // Only restore if there's a saved user AND no active session
    if (savedUser && !session) {
      // First restore from localStorage for immediate display
      useEphemeralStore.setState({
        session: {
          user: savedUser,
          startTime: new Date().toISOString(),
          isPersistent: true,
        },
      });
      // Auto-hide landing for returning logged-in users
      setShowLanding(false);
      
      // Then fetch fresh profile data from Firebase
      // This ensures profile changes made on other devices are synced
      const syncUserProfile = async () => {
        try {
          const { getUserFromFirebase } = await import('./services/firebaseService');
          const firestoreProfile = await getUserFromFirebase(savedUser.id);
          
          if (firestoreProfile) {
            // Check if user is banned - if so, end session and redirect to auth
            if (firestoreProfile.isBanned) {
              console.log('[App] User is banned, ending session');
              useEphemeralStore.setState({ session: null });
              usePersistentStore.getState().setSavedUser(null);
              alert('Your account has been banned. Please contact support if you believe this is an error.');
              navigate('/auth');
              return;
            }

            // Merge Firestore data with local saved user
            const updatedUser = {
              ...savedUser,
              name: firestoreProfile.name || savedUser.name,
              avatar: firestoreProfile.avatar || savedUser.avatar,
              lastProfileEdit: firestoreProfile.lastProfileEdit,
              // Preserve facilitator status from Firestore
              isFacilitator: firestoreProfile.isFacilitator || savedUser.isFacilitator,
              facilitatorAssignedAt: firestoreProfile.facilitatorAssignedAt || savedUser.facilitatorAssignedAt,
              facilitatorAssignedBy: firestoreProfile.facilitatorAssignedBy || savedUser.facilitatorAssignedBy,
              facilitatorRole: firestoreProfile.facilitatorRole || savedUser.facilitatorRole,
              facilitatorBadges: firestoreProfile.facilitatorBadges || savedUser.facilitatorBadges,
              facilitatorPermissions: firestoreProfile.facilitatorPermissions || savedUser.facilitatorPermissions,
            };
            
            // Update both session and savedUser with fresh data
            useEphemeralStore.setState({
              session: {
                user: updatedUser,
                startTime: new Date().toISOString(),
                isPersistent: true,
              },
            });
            usePersistentStore.getState().setSavedUser(updatedUser);
            
            console.log('[App] User profile synced from Firebase');
          }
        } catch (error) {
          console.warn('[App] Failed to sync user profile from Firebase:', error);
          // Continue with local data - don't break the app
        }
      };
      
      syncUserProfile();
    }
  }, []);

  // ============================================
  // URL TO PAGE SYNC - FOR RM ADMIN AI CONTEXT
  // ============================================
  useEffect(() => {
    // ALWAYS update currentPage for RM Admin AI context
    setCurrentPage(location.pathname);
  }, [location.pathname, setCurrentPage]);

  // ============================================
  // FIREBASE SYNC - SINGLE INIT
  // ============================================
  useEffect(() => {
    const unsubs = [
      syncAIPosts(),
      syncAppointments(),
      syncOrganizations(),
      syncStatusUpdates(),
      syncEmergencyContacts(),
      syncFacilities(),
      syncTopics(),
      syncArticles(),
      syncSettings(),
      syncChatMessages(),
    ];

    return () => unsubs.forEach(unsub => unsub?.());
  }, []);

  // ============================================
  // BAN STATUS CHECK - Periodic check for active sessions
  // ============================================
  useEffect(() => {
    if (!session?.user?.id) return;

    const checkBanStatus = async () => {
      try {
        const { getUserFromFirebase } = await import('./services/firebaseService');
        const firestoreProfile = await getUserFromFirebase(session.user.id);
        
        if (firestoreProfile?.isBanned) {
          console.log('[App] User banned during session, ending session');
          useEphemeralStore.setState({ session: null });
          usePersistentStore.getState().setSavedUser(null);
          alert('Your account has been banned. Please contact support if you believe this is an error.');
          navigate('/auth');
        }
      } catch (error) {
        console.warn('[App] Failed to check ban status:', error);
      }
    };

    // Check immediately on mount
    checkBanStatus();

    // Check every 30 seconds for active sessions
    const interval = setInterval(checkBanStatus, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id, navigate]);

  // ============================================
  // 404 REDIRECT HANDLER
  // ============================================
  useEffect(() => {
    const query = location.search;
    if (query.startsWith('?/')) {
      const path = query.slice(2).replace(/~and~/g, '&');
      navigate(path, { replace: true });
    }
  }, [location.search, navigate]);

  // ============================================
  // LANGUAGE SYNC
  // ============================================
  useEffect(() => {
    if (language && language !== i18n.language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // ============================================
  // DARK MODE SYNC
  // ============================================
  useEffect(() => {
    // Add no-transition class initially to prevent flash on page load
    document.documentElement.classList.add('no-transition');
    
    if (darkModeEnabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Remove no-transition after initial render
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('no-transition');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [darkModeEnabled]);

  // ============================================
  // DECOY MODE KEYBOARD SHORTCUT
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        useEphemeralStore.getState().toggleDecoyMode();
      }
      // Ctrl+M — hidden admin panel access
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        navigate('/admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // ============================================
  // HEKIMO AI SCHEDULER
  // Auto-posts trending SRHR news at 6AM + every 5h, general news at 6PM Kigali time
  // ============================================
  useEffect(() => {
    startHekimoScheduler();
    return () => stopHekimoScheduler();
  }, []);

  // ============================================
  // RENDER HELPERS
  // ============================================
  const isAuthPage = location.pathname === '/auth';
  const isAuthActionPage = location.pathname === '/__/auth/action';
  const isAdminPage = location.pathname === '/admin';
  const isFacilitatorPage = location.pathname === '/facilitator';
  const isTermsPage = location.pathname === '/terms';
  const isPrivacyPage = location.pathname === '/privacy';
  const isHelpPage = location.pathname === '/help-center';
  
  // Get current page name for RM Admin AI
  const getCurrentPageName = (): string => {
    const path = location.pathname;
    const pathMap: Record<string, string> = {
      '/': 'home',
      '/srhr': 'srhr-info',
      '/chat': 'chat',
      '/services': 'services',
      '/settings': 'settings',
      '/clinics': 'find-service',
      '/girls-room': 'girls-room',
      '/book-doctor': 'book-doctor',
      '/baza-muganga': 'baza-muganga',
      '/mpuza': 'mpuza',
      '/emergency': 'emergency',
      '/inbox': 'inbox',
      '/groups': 'groups',
      '/privacy': 'privacy',
      '/help-center': 'help-center',
    };
    if (path.startsWith('/groups')) return 'groups';
    return pathMap[path] || 'home';
  };
  const currentPageName = getCurrentPageName();

  // ============================================
  // DECOY MODE
  // ============================================
  if (decoyMode) {
    return <DecoyMode />;
  }

  // ============================================
  // LANDING PAGE HANDLER
  // ============================================
  const handleEnterApp = () => {
    localStorage.setItem('rm_ubuzima_landing_seen', 'true');
    setShowLanding(false);
    navigate('/auth');
  };
  
  // Show landing page for root path if user is not logged in and hasn't dismissed landing
  if (showLanding && !session && location.pathname === '/') {
    return <LandingPage onEnterApp={handleEnterApp} />;
  }

  // ============================================
  // AUTHENTICATION CHECK
  // ============================================
  if (!session) {
    // Allow auth page and auth action page to render without login
    if (isAuthPage) {
      return <AuthPage />;
    }
    if (isAuthActionPage) {
      return <AuthActionPage />;
    }
    
    // Store intended destination for post-login redirect
    const currentPath = location.pathname + location.search;
    if (currentPath !== '/' && !currentPath.startsWith('/auth') && !currentPath.startsWith('/__/auth')) {
      sessionStorage.setItem('auth_redirect', currentPath);
    }
    
    // Redirect to auth
    return <Navigate to="/auth" replace />;
  }

  // ============================================
  // ADMIN/FACILITATOR/TERMS PAGES
  // ============================================
  if (isAdminPage || isFacilitatorPage || isTermsPage) {
    return (
      <div className="min-h-screen bg-rm-gray-50">
        <Routes>
          <Route path="/admin" element={<AdminPanelPage />} />
          <Route path="/facilitator" element={<FacilitatorPanelPage />} />
          <Route path="/terms" element={<TermsConditionsPage onBack={() => navigate(-1)} />} />
        </Routes>
      </div>
    );
  }

  // ============================================
  // TRADITIONAL ROUTING - ALL DEVICES
  // ============================================
  return (
    <div className="min-h-screen bg-rm-gray-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/srhr" element={<SRHRInfoPage />} />
        <Route path="/clinics" element={<FindServicePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/girls-room" element={<GirlsRoomPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/facilitator-inbox" element={<FacilitatorInboxPage />} />
        <Route path="/book-doctor" element={<BookDoctorPage />} />
        <Route path="/baza-muganga" element={<BazaMugangaPage />} />
        <Route path="/mpuza" element={<MpuzaPage />} />
        <Route path="/mpuza/legal-human-rights" element={<LegalAffairsPage />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/:groupId/chat" element={<GroupChatPage />} />
        <Route path="/groups/join/:groupId" element={<GroupsPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/help-center" element={<HelpCenterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Hide nav on auth, admin, facilitator, terms, privacy, help-center, CHAT, facilitator-inbox */}
      {!isAuthPage && !isAdminPage && !isFacilitatorPage && !isTermsPage && !isPrivacyPage && !isHelpPage && location.pathname !== '/chat' && location.pathname !== '/facilitator-inbox' && (
        <>
          <BottomNavigation currentPage={currentPageName} />
          {(location.pathname === '/settings' || location.pathname === '/privacy' || location.pathname === '/help-center') && <Footer />}
        </>
      )}

      {/* RM Admin AI - Single instance at app level - hide on chat, privacy, help-center, facilitator-inbox */}
      {!isAuthPage && !isAdminPage && !isFacilitatorPage && !isTermsPage && !isPrivacyPage && !isHelpPage && location.pathname !== '/chat' && location.pathname !== '/facilitator-inbox' && (
        <FloatingRMAdminAI currentPage={currentPageName} />
      )}

      {/* iOS Install Banner - Shows for iPhone/iPad users who haven't installed */}
      <IOSInstallBanner />
    </div>
  );
}

export default App;
