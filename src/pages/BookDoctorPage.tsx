import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePersistentStore, useEphemeralStore } from '../store';
import { Calendar, Clock, User, Phone, Mail, FileText, Check, AlertCircle, ArrowLeft, WifiOff } from 'lucide-react';
import { cn } from '../utils/helpers';
import { getFirestore } from 'firebase/firestore';
import { app } from '../services/firebaseConfig';

export default function BookDoctorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addAppointment } = usePersistentStore();
  const { session } = useEphemeralStore();
  const currentUser = session?.user;
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    reason: '',
    preferredDate: '',
    preferredTime: 'morning' as 'morning' | 'afternoon' | 'evening',
    isAnonymous: false,
  });
  
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Test Firebase connection on mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('[BookDoctor] Testing Firebase connection...');
        console.log('[BookDoctor] Firebase config:', {
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        });

        const db = getFirestore(app);
        // Test by trying to access Firestore - we just check if we can get a reference
        // Actual write test happens when user submits
        console.log('[BookDoctor] Firestore instance created successfully');
        setFirebaseStatus('connected');
      } catch (err: any) {
        console.error('[BookDoctor] Firebase connection failed:', err);
        setFirebaseStatus('error');
        setFirebaseError(err?.message || 'Unknown Firebase error');
      }
    };
    testConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.phone) {
      setError('Phone number is required');
      return;
    }

    if (!formData.reason) {
      setError('Please describe your reason for the appointment');
      return;
    }

    if (!formData.preferredDate) {
      setError('Please select a preferred date');
      return;
    }


    setIsLoading(true);

    try {
      // Prepare appointment data, removing undefined values
      const appointmentData: any = {
        phone: formData.phone,
        reason: formData.reason,
        preferredDate: formData.preferredDate,
        preferredTime: formData.preferredTime,
        isAnonymous: formData.isAnonymous,
        status: 'pending',
      };

      // Link appointment to current user if logged in (not anonymous)
      if (currentUser?.id && !formData.isAnonymous) {
        appointmentData.userId = currentUser.id;
        appointmentData.userName = currentUser.name;
      }

      // Only add name if not anonymous and has value
      if (!formData.isAnonymous && formData.name) {
        appointmentData.name = formData.name;
      }

      // Only add email if provided
      if (formData.email) {
        appointmentData.email = formData.email;
      }

      console.log('[BookDoctor] Submitting appointment data:', appointmentData);
      const appointment = await addAppointment(appointmentData);

      if (!appointment) {
        throw new Error('Failed to create appointment');
      }

      // Save reference number and show success
      setReferenceNumber(appointment.referenceNumber);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Appointment submission error:', err);
      console.error('Error code:', err?.code);
      console.error('Error details:', err);

      // Provide specific error messages based on Firebase error codes
      let userMessage = 'Failed to submit appointment. ';
      if (err?.code === 'permission-denied') {
        userMessage += 'Permission denied. Please contact support to update Firestore rules.';
      } else if (err?.code === 'not-found') {
        userMessage += 'Database not found. Please ensure Firestore is enabled in Firebase Console.';
      } else if (err?.code === 'unauthenticated') {
        userMessage += 'Authentication required. Please check your connection.';
      } else if (err?.code === 'unavailable') {
        userMessage += 'Service temporarily unavailable. Please try again later.';
      } else {
        userMessage += err?.message || 'Please try again or contact support.';
      }

      setError(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="page-container">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-rm-gray-900 mb-4">
            Appointment Request Submitted!
          </h1>
          <p className="text-rm-gray-600 mb-2">
            Your reference number:
          </p>
          <p className="text-xl font-bold text-srhr mb-4">
            {referenceNumber}
          </p>
          <p className="text-sm text-rm-gray-500 mb-6">
            Please save this number. Our admin will contact you soon to schedule your online consultation.
          </p>
          <a href="/" className="btn-primary mt-8 inline-block">
            {t('common.home')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Back button */}
      <button
        onClick={() => navigate('/services')}
        className="flex items-center gap-2 text-rm-gray-600 hover:text-rm-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Services</span>
      </button>

      <h1 className="section-title flex items-center gap-2">
        <Calendar className="w-6 h-6" />
        Book a SRHR Healthcare Provider - Online Consultation
      </h1>

      {/* Firebase Status */}
      {firebaseStatus === 'error' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-orange-800">
            <WifiOff className="w-5 h-5" />
            <div>
              <p className="text-sm font-medium">Database Connection Issue</p>
              <p className="text-xs mt-1">{firebaseError}</p>
              <p className="text-xs mt-1">Please check your internet connection or contact support.</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-rm-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            {t('doctor.nameLabel')}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('doctor.namePlaceholder')}
            className="input"
            disabled={formData.isAnonymous}
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-rm-gray-700 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            {t('doctor.phoneLabel')} *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder={t('doctor.phonePlaceholder')}
            className="input"
            required
          />
        </div>

        {/* Email - for admin reference only, no emails will be sent */}
        <div>
          <label className="block text-sm font-medium text-rm-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Email (for admin reference)
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="optional - for admin contact only"
            className="input"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-rm-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            {t('doctor.reasonLabel')} *
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder={t('doctor.reasonPlaceholder')}
            className="textarea"
            required
            rows={4}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-rm-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />
            {t('doctor.dateLabel')} *
          </label>
          <input
            type="date"
            value={formData.preferredDate}
            onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="input"
            required
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-rm-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-2" />
            {t('doctor.timeLabel')} *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['morning', 'afternoon', 'evening'] as const).map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setFormData({ ...formData, preferredTime: time })}
                className={cn(
                  'py-3 px-2 rounded-lg border text-sm font-medium transition-colors',
                  formData.preferredTime === time
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-rm-gray-200 hover:border-rm-gray-300'
                )}
              >
                {t(`doctor.${time}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Anonymous */}
        <div className="flex items-center gap-3 p-4 bg-rm-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="anonymous"
            checked={formData.isAnonymous}
            onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
            className="w-4 h-4 rounded border-rm-gray-300"
          />
          <label htmlFor="anonymous" className="text-sm text-rm-gray-700">
            {t('doctor.anonymousLabel')}
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('common.loading')}
            </span>
          ) : (
            t('doctor.submit')
          )}
        </button>
      </form>

    </div>
  );
}
