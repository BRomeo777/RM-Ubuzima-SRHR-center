import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Mail,
  Shield,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Check,
  X,
  ShieldCheck,
  KeyRound,
  User
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { loginUser } from '../services/firebaseAuthService';

// ============================================================================
// CONFIGURATION
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_EXPIRY_MINUTES = 15;
const MAX_CODE_ATTEMPTS = 3;
const MAX_RESEND_ATTEMPTS = 3;
const RESEND_COOLDOWN_SECONDS = 60;

// Using the deployed email server for 6-digit code password reset
const API_BASE_URL = 'https://rm-ubuzima-email.onrender.com';

const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', check: (pwd: string) => pwd.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', check: (pwd: string) => /[A-Z]/.test(pwd) },
  { id: 'lowercase', label: 'One lowercase letter', check: (pwd: string) => /[a-z]/.test(pwd) },
  { id: 'number', label: 'One number', check: (pwd: string) => /\d/.test(pwd) },
  { id: 'special', label: 'One special character (!@#$%^&*)', check: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
];

type RecoveryStep = 'identity' | 'verify-code' | 'reset-password' | 'success';

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

// ============================================================================
// API FUNCTIONS (REST API to Render backend)
// ============================================================================

async function sendResetCodeAPI(email: string): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/send-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.toLowerCase().trim() }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send reset code');
  }
  return data;
}

async function verifyResetCodeAPI(email: string, code: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/verify-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.toLowerCase().trim(), code }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Invalid code');
  }
  return data;
}

async function resetPasswordAPI(email: string, code: string, newPassword: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/reset-password-with-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: email.toLowerCase().trim(), 
      code, 
      newPassword 
    }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }
  return data;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculatePasswordStrength(password: string): { score: number; strength: PasswordStrength } {
  let score = 0;
  PASSWORD_REQUIREMENTS.forEach(req => {
    if (req.check(password)) score++;
  });
  
  let strength: PasswordStrength = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 4) strength = 'good';
  else if (score >= 3) strength = 'fair';
  
  return { score, strength };
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface ProgressBarProps {
  step: number;
  totalSteps: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ step, totalSteps }) => (
  <div className="w-full">
    <div className="flex items-center justify-between mb-2">
      {['Email', 'Verify', 'Reset'].map((label, idx) => (
        <div key={label} className="flex flex-col items-center">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
              idx < step ? 'bg-green-500 text-white' : idx === step ? 'bg-srhr text-white ring-4 ring-srhr/20' : 'bg-cool-200 text-cool-500'
            )}
          >
            {idx < step ? <Check className="w-4 h-4" /> : idx + 1}
          </div>
          <span className={cn('text-xs mt-1', idx <= step ? 'text-cool-700 font-medium' : 'text-cool-400')}>
            {label}
          </span>
        </div>
      ))}
    </div>
    <div className="h-2 bg-cool-200 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-srhr to-srhr-dark transition-all duration-500" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
    </div>
  </div>
);

interface PasswordStrengthMeterProps {
  password: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { score, strength } = calculatePasswordStrength(password);
  
  const colors = {
    weak: 'bg-red-500',
    fair: 'bg-amber-500',
    good: 'bg-blue-500',
    strong: 'bg-green-500',
  };
  
  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-cool-500">Password strength</span>
        <span className={cn('text-xs font-medium capitalize', 
          strength === 'weak' ? 'text-red-600' : 
          strength === 'fair' ? 'text-amber-600' : 
          strength === 'good' ? 'text-blue-600' : 'text-green-600'
        )}>
          {strength}
        </span>
      </div>
      <div className="h-1.5 bg-cool-200 rounded-full overflow-hidden">
        <div className={cn('h-full transition-all duration-300 rounded-full', colors[strength])} style={{ width: `${(score / 5) * 100}%` }} />
      </div>
      <div className="space-y-1">
        {PASSWORD_REQUIREMENTS.map(req => (
          <div key={req.id} className="flex items-center gap-2 text-xs">
            <div className={cn('w-4 h-4 rounded-full flex items-center justify-center transition-colors', req.check(password) ? 'bg-green-500 text-white' : 'bg-cool-200')}>
              {req.check(password) ? <Check className="w-2.5 h-2.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-cool-400" />}
            </div>
            <span className={req.check(password) ? 'text-cool-700' : 'text-cool-400'}>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ForgotPasswordWizardProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export const ForgotPasswordWizard: React.FC<ForgotPasswordWizardProps> = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState<RecoveryStep>('identity');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Code verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [resendAttempts, setResendAttempts] = useState(0);
  
  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  
  // Success state
  const [autoLoginEmail, setAutoLoginEmail] = useState('');
  const [autoLoginPassword, setAutoLoginPassword] = useState('');
  
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (step === 'verify-code' && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [step, countdown]);

  // Email validation
  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Send reset code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;
    
    setIsLoading(true);
    setEmailError('');
    
    try {
      await sendResetCodeAPI(email);
      setStep('verify-code');
      setCountdown(RESEND_COOLDOWN_SECONDS);
      setCanResend(false);
      setVerificationCode('');
    } catch (err: any) {
      setEmailError(err.message || 'Failed to send code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    if (!canResend || resendAttempts >= MAX_RESEND_ATTEMPTS) return;
    
    setIsLoading(true);
    try {
      await sendResetCodeAPI(email);
      setResendAttempts(prev => prev + 1);
      setCountdown(RESEND_COOLDOWN_SECONDS);
      setCanResend(false);
      setVerificationCode('');
      setCodeError('');
      // Focus first input
      codeInputsRef.current[0]?.focus();
    } catch (err: any) {
      setCodeError(err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      setCodeError('Please enter the complete 6-digit code');
      return;
    }
    
    setIsLoading(true);
    try {
      await verifyResetCodeAPI(email, verificationCode);
      setStep('reset-password');
    } catch (err: any) {
      setCodeError(err.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    
    const { strength } = calculatePasswordStrength(newPassword);
    if (strength === 'weak') {
      setResetError('Password is too weak. Please meet all requirements.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      await resetPasswordAPI(email, verificationCode, newPassword);
      // Store credentials for auto-login
      setAutoLoginEmail(email);
      setAutoLoginPassword(newPassword);
      setStep('success');
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-login after reset
  const handleAutoLogin = async () => {
    setIsLoading(true);
    try {
      await loginUser(autoLoginEmail, autoLoginPassword);
      onSuccess?.();
    } catch (err: any) {
      // If auto-login fails, just close wizard - user can login manually
      onBack();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    if (!digit) return;
    
    const newCode = verificationCode.split('');
    newCode[index] = digit;
    const updatedCode = newCode.join('').slice(0, 6);
    setVerificationCode(updatedCode);
    setCodeError('');
    
    // Auto-focus next input
    if (index < 5 && digit) {
      codeInputsRef.current[index + 1]?.focus();
    }
    
    // Auto-submit when complete
    if (updatedCode.length === 6 && index === 5) {
      // Small delay to let user see the last digit
      setTimeout(() => {
        verifyResetCodeAPI(email, updatedCode).then(() => {
          setStep('reset-password');
        }).catch(() => {
          setCodeError('Invalid code');
        });
      }, 300);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (verificationCode[index]) {
        // Clear current digit
        const newCode = verificationCode.split('');
        newCode[index] = '';
        setVerificationCode(newCode.join(''));
      } else if (index > 0) {
        // Move to previous input
        codeInputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setVerificationCode(pasted);
    
    // Focus the appropriate input
    const focusIndex = Math.min(pasted.length, 5);
    codeInputsRef.current[focusIndex]?.focus();
  };

  // ============================================================================
  // RENDER STEPS
  // ============================================================================

  const renderIdentityStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-srhr to-srhr-dark rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-srhr/30">
          <KeyRound className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-cool-900 mb-2">Forgot Password?</h2>
        <p className="text-cool-500">Enter your email and we'll send you a 6-digit verification code</p>
      </div>

      <form onSubmit={handleSendCode} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-cool-700 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cool-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value.toLowerCase());
                setEmailError('');
              }}
              placeholder="you@example.com"
              className={cn(
                'w-full pl-10 pr-4 py-3.5 bg-cool-50 border rounded-xl text-cool-900 placeholder-cool-400 outline-none transition-all',
                emailError ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-cool-200 focus:border-srhr focus:ring-4 focus:ring-srhr/10'
              )}
            />
          </div>
          {emailError && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {emailError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-gradient-to-r from-srhr to-srhr-dark text-white font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-srhr/25"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              Send 6-Digit Code
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <button onClick={onBack} className="flex items-center gap-2 text-sm text-cool-500 hover:text-cool-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Login
      </button>
    </div>
  );

  const renderVerifyCodeStep = () => (
    <div className="space-y-6">
      <ProgressBar step={1} totalSteps={3} />

      <div className="text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Mail className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-cool-900 mb-1">Enter Verification Code</h2>
        <p className="text-sm text-cool-500">
          We sent a 6-digit code to <span className="font-medium text-cool-700">{email.replace(/(.{2}).*?@/, '$1***@')}</span>
        </p>
      </div>

      <form onSubmit={handleVerifyCode} className="space-y-5">
        <div className="flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <input
              key={idx}
              ref={el => codeInputsRef.current[idx] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={verificationCode[idx] || ''}
              onChange={(e) => handleCodeChange(idx, e.target.value)}
              onKeyDown={(e) => handleCodeKeyDown(idx, e)}
              onPaste={handleCodePaste}
              className={cn(
                'w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all',
                codeError ? 'border-red-300 focus:border-red-500' : verificationCode[idx] ? 'border-green-400 bg-green-50 text-green-700' : 'border-cool-200 focus:border-srhr'
              )}
            />
          ))}
        </div>

        {codeError && (
          <p className="text-center text-sm text-red-600">{codeError}</p>
        )}

        <button
          type="submit"
          disabled={isLoading || verificationCode.length !== 6}
          className="w-full py-3.5 bg-gradient-to-r from-srhr to-srhr-dark text-white font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
        </button>
      </form>

      <div className="text-center space-y-2">
        <p className="text-sm text-cool-500">Didn't receive the code?</p>
        <button
          onClick={handleResendCode}
          disabled={!canResend || resendAttempts >= MAX_RESEND_ATTEMPTS || isLoading}
          className="text-sm font-medium text-srhr hover:text-srhr-dark disabled:text-cool-400 disabled:cursor-not-allowed transition-colors"
        >
          {canResend ? (
            resendAttempts >= MAX_RESEND_ATTEMPTS ? 'Maximum resend attempts reached' : 'Resend code'
          ) : (
            `Resend in ${countdown}s`
          )}
        </button>
        {resendAttempts > 0 && (
          <p className="text-xs text-cool-400">
            Attempt {resendAttempts} of {MAX_RESEND_ATTEMPTS}
          </p>
        )}
      </div>

      <button onClick={() => setStep('identity')} className="flex items-center gap-2 text-sm text-cool-500 hover:text-cool-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Change email
      </button>
    </div>
  );

  const renderResetPasswordStep = () => (
    <div className="space-y-6">
      <ProgressBar step={2} totalSteps={3} />

      <div className="text-center">
        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Lock className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-cool-900 mb-1">Create New Password</h2>
        <p className="text-sm text-cool-500">Your code is verified. Create a secure password.</p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-cool-700 mb-1.5">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cool-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-12 py-3.5 bg-cool-50 border border-cool-200 rounded-xl text-cool-900 placeholder-cool-400 outline-none focus:border-srhr focus:ring-4 focus:ring-srhr/10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-400 hover:text-cool-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <PasswordStrengthMeter password={newPassword} />
        </div>

        <div>
          <label className="block text-sm font-medium text-cool-700 mb-1.5">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cool-400" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={cn(
                'w-full pl-10 pr-12 py-3.5 bg-cool-50 border rounded-xl text-cool-900 placeholder-cool-400 outline-none focus:ring-4 transition-all',
                confirmPassword && newPassword !== confirmPassword
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                  : confirmPassword && newPassword === confirmPassword
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-500/10'
                  : 'border-cool-200 focus:border-srhr focus:ring-srhr/10'
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-400 hover:text-cool-600"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <X className="w-4 h-4" />
              Passwords don't match
            </p>
          )}
          {confirmPassword && newPassword === confirmPassword && newPassword.length > 0 && (
            <p className="mt-1.5 text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Passwords match
            </p>
          )}
        </div>

        {resetError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {resetError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || calculatePasswordStrength(newPassword).strength === 'weak' || newPassword !== confirmPassword}
          className="w-full py-3.5 bg-gradient-to-r from-srhr to-srhr-dark text-white font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              Reset Password
              <CheckCircle className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6 py-4">
      <ProgressBar step={3} totalSteps={3} />

      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-cool-900 mb-2">Password Reset Complete!</h2>
        <p className="text-cool-600">
          Your password has been successfully updated. You can now log in with your new password.
        </p>
      </div>

      <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-left">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium">Security tip</p>
            <p className="text-green-700 mt-1">
              Don't reuse this password on other sites. Consider using a password manager.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleAutoLogin}
          disabled={isLoading}
          className="w-full py-3.5 bg-gradient-to-r from-srhr to-srhr-dark text-white font-semibold rounded-xl hover:brightness-110 transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Logging in...
            </>
          ) : (
            <>
              <User className="w-5 h-5" />
              Log In Automatically
            </>
          )}
        </button>

        <button
          onClick={onBack}
          className="w-full py-3.5 bg-cool-100 text-cool-700 font-semibold rounded-xl hover:bg-cool-200 transition-colors"
        >
          Back to Login Page
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const stepComponents: Record<RecoveryStep, React.ReactNode> = {
    'identity': renderIdentityStep(),
    'verify-code': renderVerifyCodeStep(),
    'reset-password': renderResetPasswordStep(),
    'success': renderSuccessStep(),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cool-50 via-white to-cool-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {step !== 'identity' && step !== 'success' && (
            <button
              onClick={() => {
                if (step === 'verify-code') setStep('identity');
                else if (step === 'reset-password') setStep('verify-code');
              }}
              className="flex items-center gap-2 text-sm text-cool-500 hover:text-cool-700 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          
          {stepComponents[step]}
        </div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 rounded-full">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-xs text-cool-500">256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordWizard;
