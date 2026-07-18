import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/helpers';
import { usePersistentStore } from '../store';
import type { ChatSettings as ChatSettingsType, Facilitator } from '../types';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';
import {
  Users,
  Shield,
  Ban,
  Bell,
  Lock,
  Trash2,
  X,
  AlertTriangle,
  Check,
  Crown,
  FileText,
  Info,
  Settings
} from 'lucide-react';

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  isFacilitator?: boolean;
}

export default function ChatSettings({ isOpen, onClose, isAdmin, isFacilitator }: ChatSettingsProps) {
  const { t } = useTranslation();
  const { chatSettings, updateChatSettings, addFacilitator, removeFacilitator, banUser, unbanUser } = usePersistentStore();

  const [activeTab, setActiveTab] = useState<'facilitators' | 'moderation' | 'privacy' | 'rules'>('facilitators');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [banUserId, setBanUserId] = useState('');
  const [banReason, setBanReason] = useState('');

  // Phone back navigation for delete confirmation
  usePhoneBackNavigation({
    isOpen: !!showDeleteConfirm,
    onClose: () => setShowDeleteConfirm(null),
    modalId: 'chatsettings-delete-confirm'
  });


  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };



  const handleRemoveFacilitator = async (userId: string) => {
    const success = await removeFacilitator(userId);
    if (success) {
      showSuccess('Facilitator removed successfully');
      setShowDeleteConfirm(null);
    }
  };

  const handleBanUser = async () => {
    if (!banUserId.trim()) return;
    const success = await banUser(banUserId.trim());
    if (success) {
      showSuccess('User banned successfully');
      setBanUserId('');
      setBanReason('');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    const success = await unbanUser(userId);
    if (success) {
      showSuccess('User unbanned successfully');
    }
  };

  const facilitators = chatSettings?.facilitators || [];
  const bannedUsers = chatSettings?.bannedUsers || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-rm-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-srhr/10 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-srhr" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-rm-gray-900">Chat Settings</h2>
              <p className="text-xs text-rm-gray-500">Manage your community chat preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rm-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-rm-gray-500" />
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">{successMessage}</span>
          </div>
        )}

        {/* Tabs - horizontally scrollable on mobile */}
        <div className="flex border-b border-rm-gray-100 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
          {[
            { key: 'rules', label: 'Rules', shortLabel: 'Rules', icon: FileText },
            { key: 'facilitators', label: 'Facilitators', shortLabel: 'Facilitator', icon: Users },
            ...(isAdmin ? [{ key: 'moderation', label: 'Moderation', shortLabel: 'Moderation', icon: Shield }] : []),
            { key: 'privacy', label: 'Privacy', shortLabel: 'Privacy', icon: Lock },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0',
                activeTab === tab.key
                  ? 'text-srhr border-srhr'
                  : 'text-rm-gray-500 border-transparent hover:text-rm-gray-700'
              )}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">Chat Rules & Guidelines</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Please follow these rules to maintain a respectful and supportive community.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-rm-gray-50 rounded-xl">
                  <h4 className="font-medium text-rm-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-srhr" />
                    Community Guidelines
                  </h4>
                  <ul className="space-y-2 text-sm text-rm-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-srhr font-medium">1.</span>
                      <span>Be respectful and supportive to all members</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-srhr font-medium">2.</span>
                      <span>No spam, harassment, or inappropriate content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-srhr font-medium">3.</span>
                      <span>Keep discussions related to reproductive health</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-srhr font-medium">4.</span>
                      <span>Respect privacy - don't share personal medical details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-srhr font-medium">5.</span>
                      <span>Report any concerning behavior to facilitators</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-rm-gray-50 rounded-xl">
                  <h4 className="font-medium text-rm-gray-900 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    Moderation Policy
                  </h4>
                  <p className="text-sm text-rm-gray-600">
                    Facilitators and administrators monitor this chat to ensure a safe environment. 
                    Violations may result in warnings, message deletion, or temporary/permanent bans.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* Facilitators Tab - Read Only */}
          {activeTab === 'facilitators' && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-purple-900">Community Facilitators</h3>
                    <p className="text-sm text-purple-700 mt-1">
                      These facilitators help moderate the chat and provide guidance. Only administrators can add or remove facilitators.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Facilitators List - Read Only */}
              <div className="space-y-3">
                <h4 className="font-medium text-rm-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Current Facilitators ({facilitators.length})
                </h4>
                {facilitators.length === 0 ? (
                  <div className="text-center py-8 bg-rm-gray-50 rounded-xl">
                    <Users className="w-12 h-12 text-rm-gray-300 mx-auto mb-2" />
                    <p className="text-rm-gray-500 text-sm">No facilitators assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {facilitators.map((facilitator) => (
                      <div
                        key={facilitator.userId}
                        className="flex items-center justify-between p-4 bg-rm-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar with Facilitator Badge */}
                          <div className="relative">
                            <div className="w-10 h-10 bg-srhr/20 rounded-full flex items-center justify-center overflow-hidden">
                              {facilitator.userAvatar ? (
                                <img
                                  src={facilitator.userAvatar}
                                  alt={facilitator.userName}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <Shield className="w-5 h-5 text-srhr" />
                              )}
                            </div>
                            {/* Facilitator Badge - Dark Green "F" */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-800 rounded-full flex items-center justify-center border-2 border-white">
                              <span className="text-[8px] font-bold text-white">F</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-rm-gray-900">{facilitator.userName}</p>
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[10px] rounded font-medium">
                                F
                              </span>
                            </div>
                            <p className="text-xs text-rm-gray-500">
                              {facilitator.role || 'Facilitator'} • Added {new Date(facilitator.assignedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          Verified
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Moderation Tab - Admin Only */}
          {activeTab === 'moderation' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900">User Moderation</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Manage user access and maintain community standards. Banned users cannot send messages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Ban User */}
              <div className="space-y-4">
                <h4 className="font-medium text-rm-gray-900 flex items-center gap-2">
                  <Ban className="w-4 h-4" />
                  Ban User
                </h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="User ID to ban"
                    value={banUserId}
                    onChange={(e) => setBanUserId(e.target.value)}
                    className="flex-1 px-4 py-3 bg-rm-gray-50 border border-rm-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Reason for ban (optional)"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-4 py-3 bg-rm-gray-50 border border-rm-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
                <button
                  onClick={handleBanUser}
                  disabled={!banUserId.trim()}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
                    banUserId.trim()
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-rm-gray-200 text-rm-gray-400 cursor-not-allowed'
                  )}
                >
                  <Ban className="w-4 h-4" />
                  Ban User
                </button>
              </div>

              {/* Banned Users List */}
              <div className="space-y-3">
                <h4 className="font-medium text-rm-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Banned Users ({bannedUsers.length})
                </h4>
                {bannedUsers.length === 0 ? (
                  <div className="text-center py-8 bg-rm-gray-50 rounded-xl">
                    <Shield className="w-12 h-12 text-rm-gray-300 mx-auto mb-2" />
                    <p className="text-rm-gray-500 text-sm">No banned users</p>
                    <p className="text-xs text-rm-gray-400 mt-1">Your community is healthy!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bannedUsers.map((userId) => (
                      <div
                        key={userId}
                        className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <Ban className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium text-rm-gray-900">{userId}</p>
                            <p className="text-xs text-red-600">Banned from chat</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnbanUser(userId)}
                          className="px-4 py-2 bg-white border border-rm-gray-200 text-rm-gray-700 rounded-lg hover:bg-rm-gray-50 transition-colors text-sm font-medium"
                        >
                          Unban
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-900">Privacy & Security</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Control privacy settings and data handling for your chat community.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-rm-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-rm-gray-900">Message Notifications</p>
                      <p className="text-sm text-rm-gray-500">Notify members of new messages</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-rm-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-srhr/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-srhr"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-rm-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-rm-gray-900">Message History</p>
                      <p className="text-sm text-rm-gray-500">Retain chat history for 90 days</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-rm-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-srhr/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-srhr"></div>
                  </label>
                </div>

              </div>

              {(isAdmin || isFacilitator) && (
                <div className="border-t border-rm-gray-100 pt-6">
                  <h4 className="font-medium text-red-600 flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4" />
                    Danger Zone
                  </h4>
                  <button className="w-full py-3 border-2 border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Clear All Messages
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
