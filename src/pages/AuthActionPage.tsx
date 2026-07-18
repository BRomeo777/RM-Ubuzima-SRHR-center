import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuth, verifyPasswordResetCode, confirmPasswordReset, applyActionCode, checkActionCode } from 'firebase/auth';
import { app } from '../services/firebaseConfig';
import { Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const auth = getAuth(app);

export default function AuthActionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<string | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    const codeParam = searchParams.get('oobCode');
    
    setMode(modeParam);
    setOobCode(codeParam);

    if (!modeParam || !codeParam) {
      setError('Invalid or expired link. Please request a new one.');
      setLoading(false);
      return;
    }

    // Verify the action code is valid
    if (modeParam === 'resetPassword') {
      verifyPasswordResetCode(auth, codeParam)
        .then(() => {
          setLoading(false);
        })
        .catch((err) => {
          console.error('Invalid reset code:', err);
          setError('This password reset link has expired or is invalid. Please request a new one.');
          setLoading(false);
        });
    } else if (modeParam === 'verifyEmail') {
      applyActionCode(auth, codeParam)
        .then(() => {
          setSuccess(true);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Email verification failed:', err);
          setError('This verification link has expired or is invalid.');
          setLoading(false);
        });
    } else {
      setError('Unknown action. Please try again.');
      setLoading(false);
    }
  }, [searchParams]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!oobCode) {
      setError('Invalid reset code');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset failed:', err);
      if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else {
        setError('Failed to reset password. The link may have expired.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cool-50 to-cool-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-srhr animate-spin mx-auto mb-4" />
          <p className="text-cool-600">Verifying your request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cool-50 to-cool-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-cool-800 mb-2">Link Expired</h2>
          <p className="text-cool-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full py-3 bg-srhr text-white rounded-xl font-medium hover:bg-srhr-dark transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (success && mode === 'resetPassword') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cool-50 to-cool-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-cool-800 mb-2">Password Reset!</h2>
          <p className="text-cool-600 mb-6">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full py-3 bg-srhr text-white rounded-xl font-medium hover:bg-srhr-dark transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (success && mode === 'verifyEmail') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cool-50 to-cool-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-cool-800 mb-2">Email Verified!</h2>
          <p className="text-cool-600 mb-6">
            Your email has been successfully verified. You can now use all features of RM Ubuzima.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full py-3 bg-srhr text-white rounded-xl font-medium hover:bg-srhr-dark transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'resetPassword') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cool-50 to-cool-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-srhr/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-srhr" />
            </div>
            <h2 className="text-2xl font-bold text-cool-800 mb-2">Reset Password</h2>
            <p className="text-cool-600">Enter your new password below</p>
          </div>

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-cool-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-cool-200 rounded-xl focus:ring-2 focus:ring-srhr focus:border-transparent outline-none"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cool-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-cool-200 rounded-xl focus:ring-2 focus:ring-srhr focus:border-transparent outline-none"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-srhr text-white rounded-xl font-medium hover:bg-srhr-dark transition-colors"
            >
              Reset Password
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cool-50 to-cool-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-cool-800 mb-2">Processing...</h2>
        <p className="text-cool-600">Please wait while we process your request.</p>
      </div>
    </div>
  );
}
