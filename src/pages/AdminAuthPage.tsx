import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Shield, Eye, EyeOff } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { usePersistentStore, DEFAULT_ADMIN_PASSWORD } from '../store';

export default function AdminAuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { adminPassword, loginAdmin, setAdminPassword, setAdminLoggedIn } = usePersistentStore();
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const trimmedPassword = password.trim();
      
      if (!trimmedPassword) {
        setError(t('admin.errors.passwordRequired', 'Password is required'));
        setIsLoading(false);
        return;
      }

      console.log('[AdminAuth] Attempting login with password:', trimmedPassword);

      // Always validate against the hardcoded default password
      // This ensures the same password works on ALL devices regardless of localStorage
      const isValid = trimmedPassword === DEFAULT_ADMIN_PASSWORD;

      if (isValid) {
        console.log('[AdminAuth] Password match - logging in');
        // Store the password hash for this device if not already stored
        if (!adminPassword) {
          const hashed = await bcrypt.hash(trimmedPassword, 10);
          setAdminPassword(hashed);
        }
        setAdminLoggedIn(true);
        loginAdmin();
        navigate('/admin');
      } else {
        console.log('[AdminAuth] Password mismatch');
        setError(t('admin.errors.invalidPassword', 'Invalid admin password'));
      }
    } catch (err) {
      console.error('[AdminAuth] Login error:', err);
      setError(t('admin.errors.generic', 'An error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('admin.backToHome', 'Back to Home')}
        </button>

        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {t('admin.title', 'Admin Access')}
            </h1>
            <p className="text-blue-100 text-sm">
              {t('admin.subtitle', 'Enter the admin password to continue')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('admin.password', 'Admin Password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('admin.passwordPlaceholder', 'Enter admin password')}
                  className="w-full pl-11 pr-12 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {t('admin.hint', 'Default: RM@Dr.R2026')}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                t('admin.login', 'Access Admin Panel')
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="px-8 pb-8">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-amber-200/80 text-center">
                {t('admin.securityNote', 'This area is restricted. Unauthorized access is prohibited.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
