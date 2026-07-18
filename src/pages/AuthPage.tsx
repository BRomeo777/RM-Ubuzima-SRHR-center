import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Shield, 
  ArrowRight, 
  RefreshCw, 
  Mail, 
  User, 
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
  Monitor,
  Apple,
  Smartphone,
  ChevronLeft,
  Download
} from 'lucide-react';
import { useEphemeralStore, usePersistentStore } from '../store';
import { generateAnonymousName, cn } from '../utils/helpers';
import { DiceBearAvatarPicker } from '../components/DiceBearAvatarPicker';
import { loginUser, registerUser, subscribeToAuth, resetPassword } from '../services/firebaseAuthService';
import { ForgotPasswordWizard } from '../components/ForgotPasswordWizard';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'sw', label: 'Swahili', flag: '🇰🇪' },
];

interface AuthPageProps {
  onClose?: () => void;
  onLoginSuccess?: () => void;
}

type AuthView = 'login' | 'signup';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper to get redirect URL after login
const getRedirectUrl = () => {
  const redirect = sessionStorage.getItem('auth_redirect');
  sessionStorage.removeItem('auth_redirect');
  return redirect || '/';
};

export default function AuthPage({ onClose, onLoginSuccess }: AuthPageProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { createSession } = useEphemeralStore();
  const { 
    platformLogo, 
    setLanguage, 
    language, 
    setSavedUser 
  } = usePersistentStore();
  
  const [view, setView] = useState<AuthView>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [configError, setConfigError] = useState('');
  
  // Check Firebase config on mount & capture PWA install prompt
  useEffect(() => {
    const checkFirebaseConfig = () => {
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      
      if (!apiKey || !authDomain || !projectId) {
        const missing = [];
        if (!apiKey) missing.push('VITE_FIREBASE_API_KEY');
        if (!authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
        if (!projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
        setConfigError(`Firebase not configured. Missing: ${missing.join(', ')}`);
        console.error('[AuthPage] Missing Firebase config:', missing);
      }
    };
    checkFirebaseConfig();

    // Capture PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      console.log('[PWA] Install prompt captured on auth page');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Phone back navigation for terms modal
  usePhoneBackNavigation({
    isOpen: showTermsModal,
    onClose: () => setShowTermsModal(false),
    modalId: 'auth-terms-modal'
  });

  // Forgot password state - now handled by ForgotPasswordWizard
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  useEffect(() => {
    setError('');
    setSuccess('');
  }, [view]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as typeof language);
    i18n.changeLanguage(lang);
  };

  const handleRandomUsername = () => {
    setSignupUsername(generateAnonymousName());
  };

  // LOGIN HANDLER
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const trimmedEmail = loginEmail.trim().toLowerCase();
      if (!trimmedEmail) {
        setError('Email is required');
        setIsLoading(false);
        return;
      }
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }
      if (!loginPassword) {
        setError('Password is required');
        setIsLoading(false);
        return;
      }

      // Use Firebase authentication
      const user = await loginUser(trimmedEmail, loginPassword);
      
      if (user) {
        setSuccess('Login successful!');

        // Fetch user profile from Firestore to get latest profile data
        let firestoreProfile = null;
        try {
          const { getUserFromFirebase } = await import('../services/firebaseService');
          firestoreProfile = await getUserFromFirebase(user.uid);
        } catch (err) {
          console.warn('[AuthPage] Could not fetch user profile from Firestore:', err);
        }

        // Check if user is banned - prevent login if banned
        if (firestoreProfile?.isBanned) {
          setError('Your account has been banned. Please contact support if you believe this is an error.');
          setIsLoading(false);
          return;
        }

        // Merge Firebase Auth data with Firestore profile data
        // CRITICAL: Include facilitator status for cross-device persistence
        const userData = {
          id: user.uid,
          name: firestoreProfile?.name || user.displayName || trimmedEmail.split('@')[0],
          email: trimmedEmail,
          avatar: firestoreProfile?.avatar || user.photoURL || '',
          createdAt: new Date().toISOString(),
          lastProfileEdit: firestoreProfile?.lastProfileEdit,
          // Facilitator status - persisted in Firestore user document
          isFacilitator: firestoreProfile?.isFacilitator || false,
          facilitatorAssignedAt: firestoreProfile?.facilitatorAssignedAt,
          facilitatorAssignedBy: firestoreProfile?.facilitatorAssignedBy,
          facilitatorRole: firestoreProfile?.facilitatorRole,
          facilitatorBadges: firestoreProfile?.facilitatorBadges,
          facilitatorPermissions: firestoreProfile?.facilitatorPermissions,
        };
        setSavedUser(userData);

        // Create session - pass full userData to preserve facilitator status
        createSession(userData, true);
        
        setTimeout(() => {
          onLoginSuccess?.();
          onClose?.();
          if (!onClose) {
            const redirectUrl = getRedirectUrl();
            navigate(redirectUrl);
          }
        }, 800);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // SIGNUP HANDLER
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const trimmedEmail = signupEmail.trim().toLowerCase();
      const trimmedUsername = signupUsername.trim();
      
      if (!trimmedEmail) {
        setError('Email is required');
        setIsLoading(false);
        return;
      }
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      if (!trimmedUsername) {
        setError('Username is required');
        setIsLoading(false);
        return;
      }
      if (trimmedUsername.length < 3) {
        setError('Username must be at least 3 characters');
        setIsLoading(false);
        return;
      }
      if (!signupPassword) {
        setError('Password is required');
        setIsLoading(false);
        return;
      }
      if (signupPassword.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }
      if (!selectedAvatar) {
        setError('Please select an avatar');
        setIsLoading(false);
        return;
      }
      if (!termsAccepted) {
        setError('You must accept the Terms & Conditions and Disclaimer to continue');
        setIsLoading(false);
        return;
      }

      // Use Firebase authentication - handles email exists check automatically
      const user = await registerUser(trimmedEmail, signupPassword, trimmedUsername, selectedAvatar);
      
      if (user) {
        // Save user to local store
        const userData = {
          id: user.uid,
          name: trimmedUsername,
          email: trimmedEmail,
          avatar: selectedAvatar,
          createdAt: new Date().toISOString()
        };
        setSavedUser(userData);
        
        // Also save initial profile to Firestore for persistence
        try {
          const { updateUserInFirebase } = await import('../services/firebaseService');
          await updateUserInFirebase(user.uid, {
            name: trimmedUsername,
            avatar: selectedAvatar,
            createdAt: userData.createdAt
          });
        } catch (err) {
          console.warn('[AuthPage] Could not save initial user profile to Firestore:', err);
        }
        
        // Send welcome email to new user
        try {
          const { sendWelcomeEmail } = await import('../services/emailService');
          await sendWelcomeEmail(trimmedEmail, trimmedUsername);
          console.log('[AuthPage] Welcome email sent to:', trimmedEmail);
        } catch (err) {
          console.warn('[AuthPage] Could not send welcome email:', err);
          // Don't block signup if welcome email fails
        }
        
        setSignupSuccess(true);
        setTimeout(() => {
          // Pass full user object to preserve data structure consistency
          createSession(userData, true);
          onClose?.();
          if (!onClose) {
            const redirectUrl = getRedirectUrl();
            navigate(redirectUrl);
          }
        }, 1500);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred during signup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // FORGOT PASSWORD - Now using ForgotPasswordWizard component
  const handleForgotPasswordSuccess = () => {
    setShowForgotPassword(false);
    setView('login');
  };

  // DOWNLOAD APP HANDLER
  const handleDownload = async () => {
    // Check if PWA install prompt is available
    const deferredPrompt = (window as any).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install');
      }
      (window as any).deferredPrompt = null;
    } else {
      // Fallback: redirect to landing page or show instructions
      window.location.href = '/';
    }
  };

  const switchView = (newView: AuthView) => {
    setError('');
    setSuccess('');
    setView(newView);
  };

  const MessageDisplay = ({ message, type }: { message: string; type: 'error' | 'success' }) => (
    <div className={cn(
      'flex items-center gap-2 p-3 rounded-lg text-sm',
      type === 'error' 
        ? 'bg-red-50 text-red-600 border border-red-200' 
        : 'bg-green-50 text-green-600 border border-green-200'
    )}>
      {type === 'error' ? (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-cool-50 via-white to-cool-100 flex flex-col safe-area-top safe-area-bottom overflow-y-auto">
      {/* Top Bar - Fixed for mobile */}
      <div className="sticky top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-br from-cool-50 via-white to-cool-100/95 backdrop-blur-sm safe-area-top">
        <div className="flex items-center gap-2">
          {platformLogo ? (
            <img src={platformLogo} alt="RM Ubuzima" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-srhr to-srhr-dark rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="font-semibold text-cool-700 text-sm">RM Ubuzima</span>
        </div>
        
        {/* Language Selector */}
        <div className="flex gap-1.5">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all',
                language === lang.code
                  ? 'bg-srhr/20 ring-2 ring-srhr'
                  : 'bg-white hover:bg-cool-100 shadow-soft'
              )}
              title={lang.label}
            >
              {lang.flag}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Scrollable on mobile */}
      <div className="flex-1 flex items-start sm:items-center justify-center p-4 pt-4 pb-8 min-h-0">
        <div className="w-full max-w-md mx-auto">
          
          {/* LOGIN VIEW */}
          {view === 'login' && (
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cool-600 to-cool-700 rounded-xl mb-4 shadow-lg">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-cool-900 mb-2">Welcome Back</h2>
                <p className="text-sm text-cool-500">Sign in to continue your journey</p>
              </div>

              {/* Error/Success Messages */}
              {configError && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800 font-medium">⚠️ Configuration Error</p>
                  <p className="text-xs text-amber-700 mt-1">{configError}</p>
                  <p className="text-xs text-amber-600 mt-2">Please contact support.</p>
                </div>
              )}
              {error && <MessageDisplay message={error} type="error" />}
              {success && <MessageDisplay message={success} type="success" />}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5 mt-6">
                <div>
                  <label className="block text-sm font-medium text-cool-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cool-400" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-cool-50 border border-cool-200 rounded-xl text-cool-900 placeholder-cool-400 focus:outline-none focus:ring-2 focus:ring-srhr/20 focus:border-srhr transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cool-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cool-400" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 bg-cool-50 border border-cool-200 rounded-xl text-cool-900 placeholder-cool-400 focus:outline-none focus:ring-2 focus:ring-srhr/20 focus:border-srhr transition-all"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-400 hover:text-cool-600 transition-colors"
                      disabled={isLoading}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-cool-300 text-srhr focus:ring-srhr"
                      disabled={isLoading}
                    />
                    <span className="text-sm text-cool-600">Remember me</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-srhr hover:text-srhr-dark font-medium"
                    disabled={isLoading}
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-srhr to-srhr-dark text-white font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-srhr/25"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Switch to Signup */}
              <p className="text-center mt-6 text-sm text-cool-500">
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => switchView('signup')}
                  className="text-srhr font-semibold hover:text-srhr-dark transition-colors"
                  disabled={isLoading}
                >
                  Create account
                </button>
              </p>

              {/* Privacy Note */}
              <div className="flex items-start gap-2 mt-4 p-3 bg-srhr/10 rounded-lg">
                <Shield className="w-4 h-4 text-srhr flex-shrink-0 mt-0.5" />
                <p className="text-xs text-srhr-dark">
                  Your login is secured with Firebase. We never share your credentials.
                </p>
              </div>

              {/* AI Medical Disclaimer */}
              <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-semibold">AI-Generated Content Disclaimer</p>
                  <p className="mt-0.5">RM Ubuzima connects you with trained healthcare providers and facilitators. For medical advice, consult qualified healthcare professionals directly through the platform.</p>
                </div>
              </div>
            </div>
          )}

          {/* SIGNUP VIEW */}
          {view === 'signup' && (
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Back Button */}
              <button
                onClick={() => switchView('login')}
                className="flex items-center gap-1 text-sm text-cool-500 hover:text-cool-700 transition-colors mb-4"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-srhr to-srhr-dark rounded-xl mb-4 shadow-lg shadow-srhr/30">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-cool-900 mb-2">Create Account</h2>
                <p className="text-sm text-cool-500">Join our Anonymous SRHR community</p>
              </div>

              {/* Privacy Badge */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex items-center gap-1.5 bg-srhr/10 text-srhr px-3 py-1.5 rounded-full text-xs font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  <span>100% Private & Secure</span>
                </div>
              </div>

              {/* Error/Success Messages */}
              {configError && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800 font-medium">⚠️ Configuration Error</p>
                  <p className="text-xs text-amber-700 mt-1">{configError}</p>
                  <p className="text-xs text-amber-600 mt-2">Please contact support.</p>
                </div>
              )}
              {error && <div className="mb-4"><MessageDisplay message={error} type="error" /></div>}
              {signupSuccess && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-cool-900 mb-2">Account Created!</h3>
                  <p className="text-sm text-cool-500">Redirecting you to the app...</p>
                </div>
              )}

              {!signupSuccess && (
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-cool-700 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cool-400" />
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-cool-50 border border-cool-200 rounded-xl text-cool-900 placeholder-cool-400 focus:outline-none focus:ring-2 focus:ring-srhr/20 focus:border-srhr transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-cool-700 mb-1.5">
                      Username <span className="text-red-500">*</span>
                      <span className="text-xs text-cool-400 font-normal ml-1">(not your real name)</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cool-400" />
                      <input
                        type="text"
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value)}
                        placeholder="Choose a username"
                        className="w-full pl-10 pr-12 py-3 bg-cool-50 border border-cool-200 rounded-xl text-cool-900 placeholder-cool-400 focus:outline-none focus:ring-2 focus:ring-srhr/20 focus:border-srhr transition-all"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={handleRandomUsername}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-cool-400 hover:text-srhr transition-colors"
                        title="Generate random username"
                        disabled={isLoading}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-cool-700 mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cool-400" />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full pl-10 pr-12 py-3 bg-cool-50 border border-cool-200 rounded-xl text-cool-900 placeholder-cool-400 focus:outline-none focus:ring-2 focus:ring-srhr/20 focus:border-srhr transition-all"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-400 hover:text-cool-600 transition-colors"
                        disabled={isLoading}
                      >
                        {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Avatar Selection */}
                  <DiceBearAvatarPicker
                    selectedAvatar={selectedAvatar}
                    onSelect={setSelectedAvatar}
                    error={''}
                  />

                  {/* Terms & Conditions Checkbox */}
                  <div 
                    onClick={() => !isLoading && setTermsAccepted(!termsAccepted)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      termsAccepted 
                        ? 'bg-srhr/10 border-srhr' 
                        : 'bg-cool-50 border-cool-200 hover:border-cool-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      termsAccepted ? 'bg-srhr text-white' : 'bg-white border border-cool-300'
                    }`}>
                      {termsAccepted && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-sm ${termsAccepted ? 'text-srhr-dark font-medium' : 'text-cool-600'}`}>
                      I accept the{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTermsModal(true);
                        }}
                        className="underline hover:text-srhr"
                      >
                        Terms & Conditions
                      </button>
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !termsAccepted}
                    className="w-full py-3.5 bg-gradient-to-r from-srhr to-srhr-dark text-white font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-srhr/25"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Switch to Login */}
              <p className="text-center mt-6 text-sm text-cool-500">
                Already have an account?{' '}
                <button
                  onClick={() => switchView('login')}
                  className="text-srhr font-semibold hover:text-srhr-dark transition-colors"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Download App Section - Professional */}
      <div className="w-full max-w-md mx-auto mt-6 mb-8 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-cool-100">
          {/* Download Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-green-500 rounded-xl mb-2">
              <Download className="w-5 h-5 text-black" />
            </div>
            <h3 className="text-lg font-bold text-cool-900">Download RM Ubuzima App</h3>
            <p className="text-xs text-cool-500 mt-1">Get the full app experience on your device</p>
          </div>

          {/* Main Download Button */}
          <button 
            onClick={handleDownload}
            className="w-full py-3 bg-green-500 text-black font-semibold rounded-xl border border-green-600 hover:bg-green-600 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <Download className="w-4 h-4" />
            Download App
          </button>

          {/* Platform Buttons */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button 
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-all shadow-sm"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Windows</span>
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-all shadow-sm"
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iOS</span>
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-all shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-cool-200 my-4"></div>

          {/* Back to Website */}
          <button
            onClick={() => {
              // Clear landing page seen flag to show landing page again
              localStorage.removeItem('rm_ubuzima_landing_seen');
              navigate('/', { replace: true });
              // Force page reload to trigger landing page
              window.location.reload();
            }}
            className="w-full flex items-center justify-center gap-2 text-cool-600 hover:text-srhr font-medium text-sm py-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Website
          </button>
        </div>
      </div>

      {/* Full Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowTermsModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-srhr to-srhr-dark px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-white" />
                <h2 className="text-lg font-bold text-white">Terms & Conditions</h2>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="h-[60vh] overflow-y-auto p-6 space-y-6">
              {/* AI Content Disclaimer Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-blue-800 font-bold flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  AI-Generated Content Disclaimer
                </h3>
                <p className="text-sm text-blue-700 leading-relaxed">
                  <strong>RM Ubuzima connects you with trained healthcare providers and facilitators for professional SRHR support.</strong>
                  Educational content is for informational purposes only. 
                  AI content does not constitute medical diagnosis, treatment, or professional medical advice. 
                  Content from healthcare providers and trained facilitators is professional medical information.
                  For medical concerns, you can consult qualified healthcare professionals directly through the platform. 
                  In case of medical emergency, contact emergency services immediately (call 112).
                </p>
              </div>

              {/* Acceptance Section */}
              <section>
                <h3 className="text-lg font-bold text-cool-900 mb-3">1. Acceptance of Terms</h3>
                <p className="text-sm text-cool-600 leading-relaxed">
                  By accessing or using RM Ubuzima, you confirm that you are at least 16 years of age or have obtained 
                  parental/guardian consent. You agree to comply with all applicable laws and regulations. If you do not 
                  agree to these terms, please do not use the platform.
                </p>
              </section>

              {/* Anonymous Usage Section */}
              <section>
                <h3 className="text-lg font-bold text-cool-900 mb-3">2. Anonymous Usage & Privacy</h3>
                <ul className="text-sm text-cool-600 space-y-2 list-disc pl-5">
                  <li>You may access the platform anonymously using pseudonyms</li>
                  <li>No real identity information is required</li>
                  <li>You are responsible for maintaining the confidentiality of your session</li>
                  <li>We use encryption to protect your data</li>
                  <li>You can delete your data at any time through settings</li>
                </ul>
              </section>

              {/* User Conduct Section */}
              <section>
                <h3 className="text-lg font-bold text-cool-900 mb-3">3. User Conduct & Community Guidelines</h3>
                <p className="text-sm text-cool-600 leading-relaxed mb-2">You agree to:</p>
                <ul className="text-sm text-cool-600 space-y-2 list-disc pl-5">
                  <li>Treat all community members with respect, dignity, and without discrimination</li>
                  <li>Not share false, misleading, or harmful health information</li>
                  <li>Not harass, bully, threaten, or discriminate against others</li>
                  <li>Not use the platform for illegal activities or to exploit others</li>
                  <li>Report inappropriate content or behavior to administrators</li>
                  <li>Respect the anonymity and privacy of other users</li>
                </ul>
              </section>

              {/* Content Guidelines */}
              <section>
                <h3 className="text-lg font-bold text-cool-900 mb-3">4. Content Guidelines</h3>
                <ul className="text-sm text-cool-600 space-y-2 list-disc pl-5">
                  <li><strong>Healthcare Provider Content:</strong> Content from trained healthcare providers and facilitators is professional medical information</li>
                  <li>Platform navigation assistance is provided by RM Admin AI to help you find resources</li>
                  <li>User-generated content should be respectful, appropriate, and truthful</li>
                  <li>The platform reserves the right to remove harmful, offensive, or inappropriate content</li>
                  <li>Facilitators and administrators moderate content to ensure community safety</li>
                </ul>
              </section>

              {/* Emergency Section */}
              <section>
                <h3 className="text-lg font-bold text-cool-900 mb-3">5. Emergency Services</h3>
                <p className="text-sm text-cool-600 leading-relaxed">
                  RM Ubuzima is not an emergency service. <strong className="text-red-600">If you are experiencing a medical emergency, 
                  call 112 immediately or go to the nearest hospital.</strong> Do not wait for responses on this platform 
                  during emergencies.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section>
                <h3 className="text-lg font-bold text-cool-900 mb-3">6. Limitation of Liability</h3>
                <p className="text-sm text-cool-600 leading-relaxed">
                  To the maximum extent permitted by law, RM Ubuzima and its operators shall not be liable for any direct, 
                  indirect, incidental, special, or consequential damages arising from your use of the platform, including 
                  but not limited to health decisions made based on information obtained through the platform.
                </p>
              </section>

              {/* Data & Privacy */}
              <section>
                <h3 className="text-lg font-bold text-cool-900 mb-3">7. Data Protection & Privacy</h3>
                <ul className="text-sm text-cool-600 space-y-2 list-disc pl-5">
                  <li>We prioritize user privacy and use industry-standard security measures</li>
                  <li>Personal data is encrypted and stored securely</li>
                  <li>We do not sell or share your personal information with third parties</li>
                  <li>You have the right to access, modify, or delete your data</li>
                  <li>See our Privacy Policy for detailed information</li>
                </ul>
              </section>

              {/* Modifications */}
              <section>
                <h3 className="text-lg font-bold text-cool-900 mb-3">8. Modifications to Terms</h3>
                <p className="text-sm text-cool-600 leading-relaxed">
                  We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. 
                  Continued use of the platform after changes constitutes acceptance of the new terms. We will notify users 
                  of significant changes through the app.
                </p>
              </section>

              {/* Termination */}
              <section>
                <h3 className="text-lg font-bold text-cool-900 mb-3">9. Account Termination</h3>
                <p className="text-sm text-cool-600 leading-relaxed">
                  We reserve the right to suspend or terminate accounts that violate these terms, engage in harmful behavior, 
                  or misuse the platform. Users may delete their accounts at any time through the settings page.
                </p>
              </section>

              {/* Contact */}
              <section>
                <h3 className="text-lg font-bold text-cool-900 mb-3">10. Contact Information</h3>
                <p className="text-sm text-cool-600 leading-relaxed">
                  For questions about these terms, privacy concerns, or to report issues, please contact us at: 
                  support@rmubuzima.org or through the Help Center in the app.
                </p>
              </section>

              {/* Agreement Footer */}
              <div className="bg-cool-50 border border-cool-200 rounded-xl p-4 mt-6">
                <p className="text-sm text-cool-700 font-medium text-center">
                  By using RM Ubuzima, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions and Medical Disclaimer.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-cool-200 px-6 py-4 bg-cool-50 flex justify-end">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-6 py-2 bg-srhr text-white rounded-lg hover:bg-srhr-dark transition-colors font-medium"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Wizard Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg animate-in zoom-in-95 duration-200">
            <ForgotPasswordWizard 
              onBack={() => setShowForgotPassword(false)}
              onSuccess={handleForgotPasswordSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
}

