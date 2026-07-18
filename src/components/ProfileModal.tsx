import { useState, useEffect } from 'react';
import { X, User, LogOut, Camera, Check, AlertTriangle, Edit2, Clock } from 'lucide-react';
import { useEphemeralStore, usePersistentStore } from '../store';
import { cn } from '../utils/helpers';
import { DiceBearAvatarPicker } from './DiceBearAvatarPicker';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { session, endSession } = useEphemeralStore();
  const { setSavedUser: setPersistentUser, canEditProfile, updateUserProfile } = usePersistentStore();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editStatus, setEditStatus] = useState<{ canEdit: boolean; nextEditDate?: Date } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Phone back navigation for internal modals
  usePhoneBackNavigation({
    isOpen: showAvatarPicker,
    onClose: () => setShowAvatarPicker(false),
    modalId: 'profile-avatar-picker'
  });

  usePhoneBackNavigation({
    isOpen: showLogoutConfirm,
    onClose: () => setShowLogoutConfirm(false),
    modalId: 'profile-logout-confirm'
  });

  // Initialize form values when modal opens
  useEffect(() => {
    if (isOpen && session?.user) {
      setName(session.user.name || '');
      setAvatar(session.user.avatar || '');
      setIsEditing(false);
      setSaveSuccess(false);
      setShowLogoutConfirm(false);
      setShowAvatarPicker(false);
      
      // Check edit status
      const status = canEditProfile(session.user.id);
      setEditStatus(status);
    }
  }, [isOpen, session, canEditProfile]);

  if (!isOpen || !session?.user) return null;

  const handleSave = async () => {
    if (!session?.user) return;
    
    // Check if user can edit
    const status = canEditProfile(session.user.id);
    if (!status.canEdit) {
      setEditStatus(status);
      return;
    }

    setIsSaving(true);

    try {
      // Use the new updateUserProfile function which handles Firestore sync
      const result = await updateUserProfile(session.user.id, {
        name: name.trim() || session.user.name,
        avatar: avatar || session.user.avatar,
      });

      if (result.success) {
        // Update ephemeral store session
        const updatedUser = {
          ...session.user,
          name: name.trim() || session.user.name,
          avatar: avatar || session.user.avatar,
          lastProfileEdit: new Date().toISOString(),
        };
        
        useEphemeralStore.setState({
          session: {
            ...session,
            user: updatedUser,
          },
        });

        // Update persistent store saved user
        setPersistentUser(updatedUser);

        setIsEditing(false);
        setSaveSuccess(true);
        setShowAvatarPicker(false);
        
        // Update edit status
        const newStatus = canEditProfile(session.user.id);
        setEditStatus(newStatus);

        // Hide success message after 2 seconds
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        // Show error - can't edit
        setEditStatus({ canEdit: false, nextEditDate: result.nextEditDate });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    endSession();
    setPersistentUser(null);
    onClose();
    // Redirect to home
    window.location.href = '/';
  };

  const handleAvatarSelect = (newAvatar: string) => {
    setAvatar(newAvatar);
    setShowAvatarPicker(false);
  };

  const formatNextEditDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cool-100 bg-gradient-to-r from-cool-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-srhr rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-cool-800">My Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-cool-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-cool-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Success Message */}
          {saveSuccess && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Profile updated successfully!
              </span>
            </div>
          )}

          {/* Edit Limit Warning */}
          {editStatus && !editStatus.canEdit && (
            <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm text-amber-700 font-medium">
                  Profile editing is limited to once per month
                </span>
                <p className="text-xs text-amber-600 mt-1">
                  You can edit again on {formatNextEditDate(editStatus.nextEditDate)}
                </p>
              </div>
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-cool-100 overflow-hidden border-4 border-white shadow-lg">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-cool-200">
                    <User className="w-10 h-10 text-cool-400" />
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-srhr text-white rounded-full flex items-center justify-center shadow-md hover:bg-srhr-dark transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Avatar Picker */}
            {isEditing && showAvatarPicker && (
              <div className="w-full mt-4">
                <DiceBearAvatarPicker
                  selectedAvatar={avatar}
                  onSelect={handleAvatarSelect}
                />
              </div>
            )}

            {/* User Info Display */}
            <div className="mt-4 text-center">
              <h3 className="font-semibold text-cool-900 text-lg">{session.user.name}</h3>
              <p className="text-cool-500 text-sm">{session.user.email || 'Anonymous User'}</p>
              <p className="text-cool-400 text-xs mt-1">
                Member since {new Date(session.user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cool-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr focus:border-transparent transition-all"
                  maxLength={50}
                />
                <p className="text-xs text-cool-400 mt-1 text-right">
                  {name.length}/50 characters
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setName(session.user.name);
                    setAvatar(session.user.avatar);
                    setShowAvatarPicker(false);
                  }}
                  className="flex-1 px-4 py-3 border border-cool-200 text-cool-600 rounded-xl font-medium hover:bg-cool-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !!(editStatus && !editStatus.canEdit)}
                  className={cn(
                    'flex-1 px-4 py-3 rounded-xl font-medium transition-colors',
                    isSaving || !!(editStatus && !editStatus.canEdit)
                      ? 'bg-cool-300 text-white cursor-not-allowed'
                      : 'bg-srhr text-white hover:bg-srhr-dark'
                  )}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setIsEditing(true)}
                disabled={editStatus ? !editStatus.canEdit : false}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors',
                  editStatus && !editStatus.canEdit
                    ? 'bg-cool-100 text-cool-400 cursor-not-allowed'
                    : 'bg-srhr/10 text-srhr hover:bg-srhr/20'
                )}
              >
                <Edit2 className="w-4 h-4" />
                {editStatus && !editStatus.canEdit ? 'Edit Locked' : 'Edit Profile'}
              </button>
              {editStatus && !editStatus.canEdit && (
                <p className="text-xs text-cool-500 text-center">
                  Next edit available on {formatNextEditDate(editStatus.nextEditDate)}
                </p>
              )}
            </div>
          )}

          {/* Logout Section */}
          <div className="pt-4 border-t border-cool-100">
            {!showLogoutConfirm ? (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Are you sure you want to log out?
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      You will need to sign in again to access your account.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-4 py-2 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    Yes, Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
