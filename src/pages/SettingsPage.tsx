import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistentStore, useEphemeralStore } from '../store';
import {
  Globe,
  Shield,
  ChevronRight,
  Phone,
  Bell,
  FileText,
  Lock,
  HelpCircle,
  LogOut,
  User,
  Moon,
  Crown
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { Link, useNavigate } from 'react-router-dom';
import { initializeNotifications, requestNotificationPermission, notify, NotificationTemplates } from '../services/notificationService';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'sw', label: 'Swahili', flag: '🇰🇪' },
];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    language,
    setLanguage,
    isAdminLoggedIn,
    setAdminLoggedIn,
    notificationsEnabled,
    setNotificationsEnabled,
    darkModeEnabled,
    setDarkModeEnabled,
    isUserFacilitator,
    hasPendingFacilitatorRequest,
    chatSettings,
    setSavedUser,
  } = usePersistentStore();
  const { 
    session,
    endSession,
  } = useEphemeralStore();

  // Get facilitator status for current user
  const userId = session?.user?.id;
  const isFacilitator = userId ? isUserFacilitator(userId) : false;
  const hasPendingRequest = userId ? hasPendingFacilitatorRequest(userId) : false;
  const facilitatorStatusText = isFacilitator 
    ? 'You have facilitator access' 
    : hasPendingRequest 
    ? 'Request under review' 
    : 'Apply to become a facilitator';

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as typeof language);
    i18n.changeLanguage(lang);
  };

  const handleLogout = () => {
    setAdminLoggedIn(false);
    endSession();
    setSavedUser(null); // CRITICAL: Clear persistent user to prevent auto-restore
    navigate('/auth', { replace: true }); // Use replace to prevent back navigation to logged-in state
  };

  // Initialize notifications on mount if enabled by default
  useEffect(() => {
    if (notificationsEnabled) {
      initializeNotifications().then(success => {
        if (success) {
          console.log('[Settings] Notifications initialized successfully');
        }
      });
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      // Turning ON
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        // Send test notification
        notify(NotificationTemplates.system(
          '🔔 Notifications Enabled',
          'You will now receive real-time updates for messages, appointments, and important alerts.',
          '/settings'
        ));
      } else {
        // Permission denied - keep setting false
        setNotificationsEnabled(false);
        alert('Notification permission was denied. Please enable notifications in your browser settings to receive alerts.');
      }
    } else {
      // Turning OFF
      setNotificationsEnabled(false);
    }
  };

  const handleToggleDarkMode = () => {
    const newValue = !darkModeEnabled;
    setDarkModeEnabled(newValue);
    
    // Add no-transition class to prevent flash during toggle
    document.documentElement.classList.add('no-transition');
    
    if (newValue) {
      document.documentElement.classList.add('dark');
      // Send confirmation notification
      notify(NotificationTemplates.system(
        '🌙 Dark Mode Enabled',
        'The app is now in dark mode for easier viewing.',
        '/settings'
      ));
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Remove no-transition after a brief delay
    setTimeout(() => {
      document.documentElement.classList.remove('no-transition');
    }, 50);
  };

  return (
    <div className="min-h-full bg-cool-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-soft sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-cool-900">{t('settings.title')}</h1>
          <p className="text-xs text-cool-500">Manage your preferences</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Emergency Section */}
        <section className="bg-red-50 rounded-xl shadow-soft border border-red-100 overflow-hidden">
          <Link to="/emergency" className="block p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-status-offline rounded-xl flex items-center justify-center shadow-soft">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-base font-semibold text-red-900">Emergency</p>
                  <p className="text-xs text-red-600">Quick access to emergency services</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400" />
            </div>
          </Link>
        </section>

        {/* Account Section */}
        <section className="bg-white rounded-xl shadow-soft border border-cool-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-cool-50 flex items-center gap-2">
            <User className="w-4 h-4 text-cool-400" />
            <h2 className="text-sm font-semibold text-cool-700">Account</h2>
          </div>
          <div className="divide-y divide-cool-50">
            {/* Notifications */}
            <button 
              onClick={handleToggleNotifications}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-cool-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-srhr/10 rounded-lg flex items-center justify-center">
                  <Bell className="w-4 h-4 text-srhr" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-cool-700">{t('settings.notifications', 'Notifications')}</p>
                  <p className="text-xs text-cool-400">{notificationsEnabled ? t('notifications.enabled', 'Enabled') : t('notifications.disabled', 'Disabled')}</p>
                </div>
              </div>
              <Toggle checked={notificationsEnabled} />
            </button>

            {/* Dark Mode */}
            <button 
              onClick={handleToggleDarkMode}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-cool-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cool-100 rounded-lg flex items-center justify-center">
                  <Moon className="w-4 h-4 text-cool-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-cool-700">{t('settings.darkMode', 'Dark Mode')}</p>
                  <p className="text-xs text-cool-400">{darkModeEnabled ? t('darkMode.on', 'On') : t('darkMode.off', 'Off')}</p>
                </div>
              </div>
              <Toggle checked={darkModeEnabled} />
            </button>

          </div>
        </section>

        {/* Language Section */}
        <section className="bg-white rounded-xl shadow-soft border border-cool-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-cool-50 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cool-400" />
            <h2 className="text-sm font-semibold text-cool-700">Language / Ururimi</h2>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all',
                    language === lang.code
                      ? 'bg-srhr/10 text-srhr border border-srhr/30'
                      : 'hover:bg-cool-50 text-cool-600'
                  )}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Legal Section */}
        <section className="bg-white rounded-xl shadow-soft border border-cool-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-cool-50 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cool-400" />
            <h2 className="text-sm font-semibold text-cool-700">Legal</h2>
          </div>
          <div className="divide-y divide-cool-50">
            {/* Terms & Conditions */}
            <Link to="/terms" className="w-full flex items-center justify-between px-4 py-3 hover:bg-cool-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cool-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-cool-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-cool-700">Terms & Conditions</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-cool-400" />
            </Link>

            {/* Privacy Policy */}
            <Link to="/privacy" className="w-full flex items-center justify-between px-4 py-3 hover:bg-cool-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cool-100 rounded-lg flex items-center justify-center">
                  <Lock className="w-4 h-4 text-cool-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-cool-700">Privacy Policy</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-cool-400" />
            </Link>
          </div>
        </section>

        {/* Support Section */}
        <section className="bg-white rounded-xl shadow-soft border border-cool-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-cool-50 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cool-400" />
            <h2 className="text-sm font-semibold text-cool-700">Support</h2>
          </div>
          <div className="divide-y divide-cool-50">
            {/* Help Center */}
            <Link to="/help-center" className="w-full flex items-center justify-between px-4 py-3 hover:bg-cool-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cool-100 rounded-lg flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-cool-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-cool-700">Help Center</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-cool-400" />
            </Link>

            {/* Admin Panel */}
            <section className="bg-gradient-to-r from-srhr to-srhr-dark rounded-xl shadow-soft overflow-hidden m-2">
              <Link to="/admin" className="block p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Admin Panel</p>
                      <p className="text-xs text-cool-100">
                        {isAdminLoggedIn ? 'Logged in' : 'Manage platform settings'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/70" />
                </div>
              </Link>
            </section>

            {/* Facilitator Panel */}
            <section className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-soft overflow-hidden m-2 mt-2">
              <Link to="/facilitator" className="block p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">Facilitator Panel</p>
                        {/* Facilitator Status Badge */}
                        {isFacilitator && (
                          <span className="px-2 py-0.5 bg-green-400/30 text-white text-[10px] rounded-full font-medium border border-green-400/50">
                            Facilitator
                          </span>
                        )}
                        {hasPendingRequest && (
                          <span className="px-2 py-0.5 bg-amber-400/30 text-white text-[10px] rounded-full font-medium border border-amber-400/50">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-purple-100">{facilitatorStatusText}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/70" />
                </div>
              </Link>
            </section>
          </div>
        </section>

        {/* Logout Section */}
        <section className="bg-white rounded-xl shadow-soft border border-cool-100 overflow-hidden">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-cool-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <LogOut className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-red-600">Logout</p>
                <p className="text-xs text-cool-400">Sign out of your account</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-cool-400" />
          </button>
        </section>

        {/* Footer */}
        <footer className="text-center pt-4">
          <p className="text-xs text-cool-400">RM Ubuzima v1.0</p>
          <p className="text-[10px] text-cool-300 mt-1">Privacy-first SRHR platform</p>
        </footer>
      </div>
    </div>
  );
}

// Toggle Component
function Toggle({ checked }: { checked: boolean }) {
  return (
    <div className={cn(
      'w-11 h-6 rounded-full transition-colors relative',
      checked ? 'bg-srhr' : 'bg-cool-200'
    )}>
      <div className={cn(
        'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-soft',
        checked ? 'translate-x-6' : 'translate-x-0.5'
      )} />
    </div>
  );
}
