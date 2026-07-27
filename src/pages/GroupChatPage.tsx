import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useEphemeralStore, usePersistentStore } from '../store';
import {
  Users,
  MessageSquare,
  User,
  Bot,
  MoreVertical,
  Trash2,
  ArrowLeft,
  Shield,
  ChevronRight,
  Pin,
  Smile,
  Settings,
  X,
  Share2,
  Copy,
  LogOut,
  Crown,
  AlertCircle,
  UserCog,
  Check,
  Camera,
  // Enhanced WhatsApp-inspired icons
  UserPlus,
  Link,
  RefreshCw,
  Search,
  Lock,
  Globe,
  MessageCircleOff,
  MessageCircle,
  Plus,
  Mic
} from 'lucide-react';
import { cn } from '../utils/helpers';
import {
  subscribeToGroupMessagesWithAI,
  sendGroupMessage,
  deleteGroupMessage,
  getGroupById,
  leaveGroup,
  isGroupMember,
  isGroupFacilitator,
  isGroupAdmin,
  removeGroupMember,
  promoteToAdmin,
  demoteAdmin,
  subscribeToGroupJoinRequests,
  approveJoinRequest,
  denyJoinRequest,
  uploadGroupProfilePhoto,
  removeGroupProfilePhoto,
  // Enhanced WhatsApp-inspired functions
  addMemberToGroup,
  resetGroupInviteLink,
  updateGroupPermissions,
  searchGroupMembers,
  generateGroupInviteLink
} from '../services/groupService';
import type { GroupMessage, Group, GroupJoinRequest, GroupPermissions } from '../types';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';
import VoiceRecorder from '../components/VoiceRecorder';
import VoicePlayer from '../components/VoicePlayer';
import VoiceSelector from '../components/VoiceSelector';
import { useVoiceNote } from '../hooks/useVoiceNote';

// Emoji list for picker
const EMOJIS = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '🏧', '🈂️', '🛂', '🛃', '🛄', '🛅', '♿', '🚾', '🅿️', '🈳', '🈂', '⚕️', '🛗', '🛌', '🔀', '🔁', '🔂', '▶️', '⏩', '⏭️', '⏯️', '◀️', '⏪', '⏮️', '🔼', '⏫', '🔽', '⏬', '⏸️', '⏹️', '⏺️', '⏏️', '🎦', '🔅', '🔆', '📶', '📳', '📴', '♀️', '♂️', '⚧️', '✖️', '➕', '➖', '➗', '🟰', '♾️', '‼️', '⁉️', '❓', '❔', '❕', '❗', '〰️', '💱', '💲', '⚕️', '♻️', '🔱', '📛', '🔰', '⭕', '✅', '☑️', '✔️', '❌', '❎', '➰', '➿', '〽️', '✳️', '✴️', '❇️', '©️', '®️', '™️'];

export default function GroupChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const { session, chatFullScreen, setChatFullScreen } = useEphemeralStore();
  const { isAdminLoggedIn, language } = usePersistentStore();
  const { voiceProfile, selectedVoiceId, setSelectedVoiceId, isFacilitator: isFacilitatorVoice, showVoiceSelector, setShowVoiceSelector, handleVoiceSend } = useVoiceNote();
  
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isFacilitator, setIsFacilitator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [requestToDeny, setRequestToDeny] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced WhatsApp-inspired state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberUserName, setAddMemberUserName] = useState('');
  const [addMemberUserAvatar, setAddMemberUserAvatar] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [resettingLink, setResettingLink] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [updatingPermissions, setUpdatingPermissions] = useState(false);

  // WhatsApp-style member management state
  const [selectedMemberForManagement, setSelectedMemberForManagement] = useState<{
    userId: string;
    userName: string;
    userAvatar?: string;
    role: 'member' | 'facilitator';
  } | null>(null);
  const [promotingMember, setPromotingMember] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Phone back navigation for modals
  usePhoneBackNavigation({
    isOpen: showGroupInfo,
    onClose: () => setShowGroupInfo(false),
    modalId: 'group-info'
  });

  usePhoneBackNavigation({
    isOpen: showEmojiPicker,
    onClose: () => setShowEmojiPicker(false),
    modalId: 'emoji-picker'
  });

  usePhoneBackNavigation({
    isOpen: showShareModal,
    onClose: () => setShowShareModal(false),
    modalId: 'share-modal'
  });

  usePhoneBackNavigation({
    isOpen: showMemberManagement,
    onClose: () => setShowMemberManagement(false),
    modalId: 'member-management'
  });

  usePhoneBackNavigation({
    isOpen: showDenyModal,
    onClose: () => {
      setShowDenyModal(false);
      setDenyReason('');
      setRequestToDeny(null);
    },
    modalId: 'deny-modal'
  });

  // Phone back navigation for new enhanced modals
  usePhoneBackNavigation({
    isOpen: showAddMemberModal,
    onClose: () => {
      setShowAddMemberModal(false);
      setAddMemberUserId('');
      setAddMemberUserName('');
      setAddMemberUserAvatar('');
    },
    modalId: 'add-member-modal'
  });

  usePhoneBackNavigation({
    isOpen: showPermissionsModal,
    onClose: () => setShowPermissionsModal(false),
    modalId: 'permissions-modal'
  });

  // Update invite link when group changes
  useEffect(() => {
    if (group?.inviteCode) {
      setInviteLink(generateGroupInviteLink(group.id, group.inviteCode));
    }
  }, [group?.inviteCode, group?.id]);

  // Load group data and check membership
  useEffect(() => {
    if (!groupId || !session?.user) {
      setLoading(false);
      return;
    }

    const loadGroup = async () => {
      setLoading(true);
      try {
        const groupData = await getGroupById(groupId);
        if (!groupData) {
          setError('Group not found');
          setLoading(false);
          return;
        }

        setGroup(groupData);

        // Check if user is member
        const member = await isGroupMember(groupId, session.user.id);
        setIsMember(member);

        // Check if user is facilitator
        const facilitator = await isGroupFacilitator(groupId, session.user.id);
        setIsFacilitator(facilitator);

        // Check if user is admin (creator or facilitator)
        const admin = await isGroupAdmin(groupId, session.user.id);
        setIsAdmin(admin);

        // Check if user is the creator
        const creator = groupData.createdBy === session.user.id;
        setIsCreator(creator);

        if (!member) {
          setError('You are not a member of this group');
        }
      } catch (err) {
        setError('Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    loadGroup();
  }, [groupId, session?.user]);

  // Subscribe to group messages
  useEffect(() => {
    if (!groupId || !isMember) return;

    console.log('[GroupChatPage] 🚀 Setting up group chat subscription');
    
    setLoading(true);
    setError(null);
    
    const unsubscribe = subscribeToGroupMessagesWithAI(groupId, (newMessages: GroupMessage[]) => {
      console.log(`[GroupChatPage] 📨 Received ${newMessages.length} messages from group ${groupId}`);
      setMessages(newMessages);
      setLoading(false);
    }, language);

    return () => {
      console.log('[GroupChatPage] 🧹 Cleaning up group chat subscription');
      unsubscribe();
    };
  }, [groupId, isMember, language]);

  // Subscribe to join requests (admin only)
  useEffect(() => {
    if (!groupId || !isAdmin) return;

    console.log('[GroupChatPage] 🚀 Setting up join requests subscription');

    const unsubscribe = subscribeToGroupJoinRequests(groupId, (requests) => {
      console.log(`[GroupChatPage] 📨 Received ${requests.length} join requests`);
      setJoinRequests(requests);
    });

    return () => {
      console.log('[GroupChatPage] 🧹 Cleaning up join requests subscription');
      unsubscribe();
    };
  }, [groupId, isAdmin]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || !session?.user || isLoading || !groupId || !isMember) return;

    setIsLoading(true);
    const content = message.trim();
    
    // Optimistic UI - clear input immediately
    setMessage('');

    try {
      const result = await sendGroupMessage({
        groupId,
        userId: session.user.id,
        userName: session.user.name,
        userAvatar: session.user.avatar,
        content,
        type: 'text',
        isFacilitator,
        facilitatorBadge: isFacilitator ? 'F' : undefined
      });

      if (!result) {
        throw new Error('Failed to send message');
      }
      
      console.log('[GroupChatPage] ✅ Message sent successfully:', result.id);
    } catch (err: any) {
      console.error('[GroupChatPage] ❌ Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      // Restore message if failed
      setMessage(content);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm(t('chat.confirmDelete'))) return;
    if (!groupId) return;
    
    try {
      const success = await deleteGroupMessage(groupId, messageId);
      if (success) {
        console.log('[GroupChatPage] ✅ Message deleted:', messageId);
      }
    } catch (err) {
      console.error('[GroupChatPage] ❌ Error deleting message:', err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm(t('groups.confirmLeave') || 'Are you sure you want to leave this group?')) return;
    if (!groupId || !session?.user) return;
    
    const success = await leaveGroup(groupId, session.user.id);
    if (success) {
      navigate('/groups');
    }
  };

  const handleCopyLink = () => {
    if (group?.shareLink) {
      navigator.clipboard.writeText(group.shareLink);
      setShowShareModal(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!groupId || !session?.user) return;

    const member = group?.members.find(m => m.userId === memberId);
    const memberName = member?.userName || 'this member';

    if (!confirm(`Are you sure you want to remove ${memberName} from the group?`)) return;

    setRemovingMember(memberId);
    try {
      const success = await removeGroupMember(groupId, memberId, session.user.id);
      if (success) {
        console.log('[GroupChatPage] ✅ Member removed:', memberId);
      } else {
        alert('Failed to remove member. You may not have permission.');
      }
    } catch (error) {
      console.error('[GroupChatPage] ❌ Error removing member:', error);
      alert('An error occurred while removing the member.');
    } finally {
      setRemovingMember(null);
    }
  };

  const handlePromoteToAdmin = async (memberId: string, memberName: string, memberAvatar: string) => {
    if (!groupId || !session?.user) return;

    if (!confirm(`Are you sure you want to promote ${memberName} to admin?`)) return;

    setPromotingMember(memberId);
    try {
      const success = await promoteToAdmin(groupId, memberId, memberName, memberAvatar, session.user.id);
      if (success) {
        console.log('[GroupChatPage] ✅ Member promoted to admin:', memberId);
        alert(`${memberName} is now an admin`);
      } else {
        alert('Failed to promote member. Only the creator can promote members.');
      }
    } catch (error) {
      console.error('[GroupChatPage] ❌ Error promoting member:', error);
      alert('An error occurred while promoting the member.');
    } finally {
      setPromotingMember(null);
    }
  };

  const handleDemoteAdmin = async (adminId: string, adminName: string) => {
    if (!groupId || !session?.user) return;

    if (!confirm(`Are you sure you want to remove ${adminName}'s admin privileges?`)) return;

    try {
      const success = await demoteAdmin(groupId, adminId, session.user.id);
      if (success) {
        console.log('[GroupChatPage] ✅ Admin demoted:', adminId);
        alert(`${adminName} is no longer an admin`);
      } else {
        alert('Failed to demote admin. Only the creator can demote admins, and you cannot demote yourself.');
      }
    } catch (error) {
      console.error('[GroupChatPage] ❌ Error demoting admin:', error);
      alert('An error occurred while demoting the admin.');
    }
  };

  // Handle approve join request
  const handleApproveRequest = async (requestId: string) => {
    if (!session?.user) return;

    setProcessingRequest(requestId);
    try {
      const success = await approveJoinRequest(requestId, session.user.id, session.user.name);
      if (success) {
        console.log('[GroupChatPage] ✅ Join request approved');
        alert('Member has been added to the group!');
      } else {
        alert('Failed to approve request. Please try again.');
      }
    } catch (error) {
      console.error('[GroupChatPage] ❌ Error approving request:', error);
      alert('An error occurred while approving the request.');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Handle deny join request
  const handleDenyRequest = async () => {
    if (!session?.user || !requestToDeny) return;

    setProcessingRequest(requestToDeny);
    try {
      const success = await denyJoinRequest(
        requestToDeny,
        session.user.id,
        session.user.name,
        denyReason.trim() || undefined
      );
      if (success) {
        console.log('[GroupChatPage] ❌ Join request denied');
        setShowDenyModal(false);
        setDenyReason('');
        setRequestToDeny(null);
        alert('Request has been denied.');
      } else {
        alert('Failed to deny request. Please try again.');
      }
    } catch (error) {
      console.error('[GroupChatPage] ❌ Error denying request:', error);
      alert('An error occurred while denying the request.');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Open deny modal
  const openDenyModal = (requestId: string) => {
    setRequestToDeny(requestId);
    setShowDenyModal(true);
  };

  // Handle profile photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId || !isAdmin) return;

    setUploadingPhoto(true);
    try {
      const photoUrl = await uploadGroupProfilePhoto(groupId, file);
      if (photoUrl && group) {
        setGroup({ ...group, profilePhoto: photoUrl });
        alert('Profile photo updated successfully!');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle profile photo removal
  const handlePhotoRemove = async () => {
    if (!groupId || !isAdmin || !group?.profilePhoto) return;

    if (!confirm('Are you sure you want to remove the profile photo?')) return;

    setUploadingPhoto(true);
    try {
      const success = await removeGroupProfilePhoto(groupId);
      if (success && group) {
        setGroup({ ...group, profilePhoto: undefined });
        alert('Profile photo removed successfully!');
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      alert('Failed to remove profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ========== ENHANCED WHATSAPP-INSPIRED HANDLERS ==========

  // Handle adding member directly (admin only)
  const handleAddMember = async () => {
    if (!groupId || !session?.user || !isAdmin) return;

    if (!addMemberUserId.trim() || !addMemberUserName.trim()) {
      alert('Please provide both user ID and name');
      return;
    }

    setAddingMember(true);
    try {
      const result = await addMemberToGroup(
        groupId,
        addMemberUserId.trim(),
        addMemberUserName.trim(),
        addMemberUserAvatar.trim(),
        session.user.id,
        session.user.name
      );

      if (result.success) {
        alert('Member added successfully!');
        setShowAddMemberModal(false);
        setAddMemberUserId('');
        setAddMemberUserName('');
        setAddMemberUserAvatar('');
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('[GroupChatPage] ❌ Error adding member:', error);
      alert('An error occurred while adding the member.');
    } finally {
      setAddingMember(false);
    }
  };

  // Handle reset invite link
  const handleResetInviteLink = async () => {
    if (!groupId || !session?.user || !isAdmin) return;

    if (!confirm('Are you sure you want to reset the invite link? The old link will no longer work.')) return;

    setResettingLink(true);
    try {
      const result = await resetGroupInviteLink(groupId, session.user.id);
      if (result.success && result.newInviteLink) {
        setInviteLink(result.newInviteLink);
        if (group) {
          setGroup({ ...group, inviteCode: result.newInviteCode! });
        }
        alert('Invite link has been reset!');
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('[GroupChatPage] ❌ Error resetting invite link:', error);
      alert('Failed to reset invite link.');
    } finally {
      setResettingLink(false);
    }
  };

  // Handle copy invite link
  const handleCopyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('Invite link copied to clipboard!');
    }
  };

  // Handle update group permissions
  const handleUpdatePermissions = async (permissions: Partial<GroupPermissions>) => {
    if (!groupId || !session?.user || !isCreator) return;

    setUpdatingPermissions(true);
    try {
      const result = await updateGroupPermissions(groupId, permissions, session.user.id);
      if (result.success) {
        if (group) {
          setGroup({
            ...group,
            permissions: { ...group.permissions, ...permissions }
          });
        }
        alert('Permissions updated successfully!');
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('[GroupChatPage] ❌ Error updating permissions:', error);
      alert('Failed to update permissions.');
    } finally {
      setUpdatingPermissions(false);
    }
  };

  // Search members
  const searchedMembers = group ? searchGroupMembers(group, memberSearchQuery) : { members: [], facilitators: [] };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
    
    if (isToday) return t('chat.today') + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isYesterday) return t('chat.yesterday') + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Check if user can delete a message
  const canDeleteMessage = (msg: GroupMessage) => {
    return msg.userId === session?.user?.id || isFacilitator || isAdmin || isAdminLoggedIn;
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-rm-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            {t('groups.loginRequired') || 'Login Required'}
          </h2>
          <p className="text-slate-500 mb-4">
            {t('groups.loginToChat') || 'Please log in to join the group chat'}
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-2 bg-srhr text-white rounded-xl font-medium hover:bg-srhr-dark transition-colors"
          >
            {t('common.login') || 'Login'}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rm-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <Users className="w-16 h-16 text-rm-gray-200 mx-auto mb-4" />
            <p className="text-rm-gray-400">{t('common.loading') || 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-rm-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{error}</h2>
          <button
            onClick={() => navigate('/groups')}
            className="mt-4 px-6 py-2 bg-srhr text-white rounded-xl font-medium hover:bg-srhr-dark transition-colors"
          >
            {t('groups.backToGroups') || 'Back to Groups'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-rm-gray-50 flex flex-col",
      chatFullScreen && "fixed inset-0 z-50"
    )}>
      {/* Header - Always visible */}
      <div className="bg-white border-b border-rm-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/groups')}
                className="p-2 text-rm-gray-600 hover:bg-rm-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              {/* Group Profile Photo */}
              {group?.profilePhoto ? (
                <img
                  src={group.profilePhoto}
                  alt={group.name}
                  className="w-10 h-10 rounded-full object-cover border border-rm-gray-200"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-semibold text-rm-gray-900 truncate">{group?.name || 'Group Chat'}</h1>
                <p className="text-xs text-rm-gray-500">
                  {loading ? 'Loading...' : `${messages.length} ${t('chat.messages')}`} • {group?.members.length || 0} {t('groups.members') || 'members'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Share Button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2 text-rm-gray-500 hover:bg-rm-gray-100 rounded-lg transition-colors"
                title={t('groups.share') || 'Share group'}
              >
                <Share2 className="w-5 h-5" />
              </button>

              {/* Group Info Button */}
              <button
                onClick={() => setShowGroupInfo(true)}
                className="p-2 text-rm-gray-500 hover:bg-rm-gray-100 rounded-lg transition-colors"
                title={t('groups.info') || 'Group info'}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Group Description Banner */}
      {group?.description && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
          <div className="max-w-3xl mx-auto px-4 py-2">
            <div className="flex items-start gap-2">
              <Pin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-emerald-800 line-clamp-2">
                {group.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {/* Loading State */}
          {loading && messages.length === 0 && (
            <div className="text-center py-12">
              <div className="animate-pulse">
                <MessageSquare className="w-16 h-16 text-rm-gray-200 mx-auto mb-4" />
                <p className="text-rm-gray-400">{t('chat.loading') || 'Loading messages...'}</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                }}
                className="text-sm text-red-600 underline mt-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && messages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-rm-gray-300 mx-auto mb-4" />
              <p className="text-rm-gray-500">{t('chat.noMessages') || 'No messages yet'}</p>
              <p className="text-sm text-rm-gray-400 mt-2">{t('chat.startConversation') || 'Be the first to send a message!'}</p>
            </div>
          )}

          {/* Messages List */}
          {messages.map((msg, index) => (
            <div key={msg.id} className="group">
              <MessageBubble
                message={msg}
                isOwnMessage={msg.userId === session?.user?.id}
                onDelete={handleDeleteMessage}
                formatTime={formatTime}
                t={t}
                isFacilitator={group?.facilitators?.some(f => f.userId === msg.userId)}
                currentUserId={session?.user?.id}
                canDelete={canDeleteMessage(msg)}
                isLastMessage={index === messages.length - 1}
              />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - WhatsApp Style */}
      <div className={cn(
        "bg-[#f0f2f5] border-t border-gray-200 z-10",
        chatFullScreen ? "sticky bottom-0" : "sticky bottom-[72px] safe-area-bottom"
      )}>
        <div className="max-w-3xl mx-auto px-3 py-2 relative">
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-rm-gray-200 rounded-xl shadow-lg z-20">
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-rm-gray-500">Select Emoji</p>
                  <button
                    onClick={() => setShowEmojiPicker(false)}
                    className="p-1 hover:bg-rm-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-rm-gray-500" />
                  </button>
                </div>
                <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                  {EMOJIS.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="p-2 hover:bg-rm-gray-100 rounded text-xl transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-rm-gray-500 hover:text-rm-gray-700 hover:bg-gray-200 rounded-full transition-colors"
              disabled={!isMember}
            >
              <Smile className="w-6 h-6" />
            </button>

            {/* Voice Selector Button */}
            <button
              type="button"
              onClick={() => setShowVoiceSelector(true)}
              className="p-2 text-rm-gray-500 hover:text-rm-gray-700 hover:bg-gray-200 rounded-full transition-colors"
              disabled={!isMember}
              title="Select voice"
            >
              <Mic className="w-5 h-5" style={{ color: voiceProfile.color }} />
            </button>

            {/* Voice Recorder */}
            <VoiceRecorder
              voiceProfile={voiceProfile}
              onSend={(base64, duration) => {
                handleVoiceSend(base64, duration, async (params) => {
                  if (!session?.user || !group) return null;
                  return sendGroupMessage({
                    groupId: group.id,
                    userId: session.user.id,
                    userName: session.user.name,
                    userAvatar: session.user.avatar,
                    content: params.content,
                    type: 'voice',
                    voiceData: params.voiceData,
                    voiceDuration: params.voiceDuration,
                    voiceProfileId: params.voiceProfileId,
                  });
                });
              }}
              themeColor="#10b981"
            />

            {/* Input Field - WhatsApp Style */}
            <div className="flex-1 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isMember ? "Type a message" : 'Join the group to send messages'}
                className="w-full bg-transparent outline-none text-rm-gray-900 placeholder:text-rm-gray-400 text-sm"
                disabled={isLoading || !isMember}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!message.trim() || isLoading || !isMember}
              className={cn(
                'p-2 rounded-full transition-colors',
                message.trim() && !isLoading && isMember
                  ? 'bg-srhr text-white hover:bg-srhr-dark shadow-md'
                  : 'bg-gray-300 text-gray-500'
              )}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Group Info Modal */}
      {showGroupInfo && group && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-rm-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-rm-gray-900">{t('groups.info') || 'Group Info'}</h2>
              </div>
              <button
                onClick={() => setShowGroupInfo(false)}
                className="p-2 hover:bg-rm-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-rm-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {/* Group Profile Photo */}
              <div className="mb-6">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {group.profilePhoto ? (
                      <img
                        src={group.profilePhoto}
                        alt={group.name}
                        className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-100 mb-3"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center border-2 border-emerald-100 mb-3">
                        <Users className="w-10 h-10 text-white" />
                      </div>
                    )}

                    {/* Admin photo controls */}
                    {isAdmin && (
                      <div className="absolute -bottom-1 -right-1 flex gap-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoUpload}
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingPhoto}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          title="Upload profile photo"
                        >
                          {uploadingPhoto ? (
                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                        {group.profilePhoto && (
                          <button
                            onClick={handlePhotoRemove}
                            disabled={uploadingPhoto}
                            className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Remove profile photo"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-rm-gray-900 text-center">{group.name}</h3>
                  <p className="text-sm text-rm-gray-500 mt-1 text-center">{group.description}</p>
                  <p className="text-xs text-rm-gray-400 mt-2">
                    Created {new Date(group.createdAt).toLocaleDateString()}
                  </p>

                  {isAdmin && (
                    <p className="text-xs text-rm-gray-400 mt-1">
                      Click camera icon to upload photo (max 5MB)
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Actions - Admin Only */}
              {isAdmin && (
                <div className="mb-6">
                  <button
                    onClick={() => {
                      // Close group info first, then open member management
                      setShowGroupInfo(false);
                      // Small delay to ensure smooth transition
                      setTimeout(() => {
                        setShowMemberManagement(true);
                      }, 50);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-srhr text-white hover:bg-srhr-dark rounded-xl text-sm font-semibold transition-colors shadow-md"
                  >
                    <Users className="w-5 h-5" />
                    Manage Members ({group.members.length + group.facilitators.length + 1})
                  </button>
                </div>
              )}

              {/* Admins (Creator + Facilitators) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-rm-gray-700">
                    {t('groups.admins') || 'Group Admins'} ({group.admins?.length || 0})
                  </h4>
                </div>
                <div className="space-y-2">
                  {group.admins?.map((admin) => (
                    <div key={admin.userId} className="flex items-center gap-3 p-2 bg-rm-gray-50 rounded-lg">
                      <div className="relative">
                        {admin.userAvatar ? (
                          <img
                            src={admin.userAvatar}
                            alt={admin.userName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-srhr/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-srhr" />
                          </div>
                        )}
                        {/* Badge: Crown for Creator, F for Facilitator */}
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white",
                          admin.role === 'creator' ? 'bg-amber-500' : 'bg-green-800'
                        )}>
                          <span className="text-[8px] font-bold text-white">
                            {admin.role === 'creator' ? 'C' : 'F'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-rm-gray-900">{admin.userName}</p>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          admin.role === 'creator'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        )}>
                          {admin.role === 'creator' ? 'Group Creator' : 'Admin'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Members */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-rm-gray-700 mb-3">
                  {t('groups.members') || 'Members'} ({group.members.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {group.members.map((member) => (
                    <div key={member.userId} className="flex items-center gap-3 p-2 bg-rm-gray-50 rounded-lg">
                      {member.userAvatar ? (
                        <img
                          src={member.userAvatar}
                          alt={member.userName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-rm-gray-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-rm-gray-600" />
                        </div>
                      )}
                      <p className="font-medium text-sm text-rm-gray-900">{member.userName}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Join Requests - Admin Only */}
              {isAdmin && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-rm-gray-700">
                      Join Requests ({joinRequests.length})
                    </h4>
                    {joinRequests.length > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>

                  {joinRequests.length === 0 ? (
                    <p className="text-sm text-rm-gray-500">No pending join requests.</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {joinRequests.map((request) => (
                        <div key={request.id} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="flex items-start gap-3 mb-2">
                            {request.requestedByAvatar ? (
                              <img
                                src={request.requestedByAvatar}
                                alt={request.requestedByName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-rm-gray-200 flex items-center justify-center">
                                <User className="w-5 h-5 text-rm-gray-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-rm-gray-900">{request.requestedByName}</p>
                              <p className="text-xs text-rm-gray-500">
                                {new Date(request.requestedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {/* Reason */}
                          <div className="bg-white rounded-lg p-2 mb-3">
                            <p className="text-xs text-rm-gray-500 mb-1">Reason for joining:</p>
                            <p className="text-sm text-rm-gray-700">{request.reason}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              disabled={processingRequest === request.id}
                              className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {processingRequest === request.id ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  Accept
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => openDenyModal(request.id)}
                              disabled={processingRequest === request.id}
                              className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                              Deny
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced Invite Link Section - Better Than WhatsApp */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-rm-gray-700 flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    Invite Link
                  </h4>
                  {isAdmin && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Admin Only
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-rm-gray-50 rounded-lg px-3 py-2 text-xs text-rm-gray-500 truncate">
                    {inviteLink || 'Generating...'}
                  </div>
                  <button
                    onClick={handleCopyInviteLink}
                    disabled={!inviteLink}
                    className="p-2 bg-srhr/10 hover:bg-srhr/20 text-srhr rounded-lg transition-colors disabled:opacity-50"
                    title="Copy invite link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={handleResetInviteLink}
                      disabled={resettingLink}
                      className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors disabled:opacity-50"
                      title="Reset invite link (old link will no longer work)"
                    >
                      {resettingLink ? (
                        <div className="w-4 h-4 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                {isAdmin && (
                  <p className="text-xs text-rm-gray-400 mt-1">
                    Anyone with this link can request to join. Click refresh to revoke the old link.
                  </p>
                )}
              </div>

              {/* Group Permissions - Creator Only */}
              {isCreator && group?.permissions && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-rm-gray-700 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Group Permissions
                    </h4>
                    <button
                      onClick={() => setShowPermissionsModal(true)}
                      className="text-xs text-srhr hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-rm-gray-50 rounded-lg">
                      <span className="text-rm-gray-600">Who can send messages</span>
                      <span className="font-medium text-rm-gray-900">
                        {group.permissions.canSendMessages === 'all' ? 'All members' : 'Admins only'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-rm-gray-50 rounded-lg">
                      <span className="text-rm-gray-600">Require approval to join</span>
                      <span className="font-medium text-rm-gray-900">
                        {group.permissions.requireApprovalToJoin ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-rm-gray-50 rounded-lg">
                      <span className="text-rm-gray-600">Who can add members</span>
                      <span className="font-medium text-rm-gray-900">
                        {group.permissions.canAddMembers === 'admins' ? 'Admins' : 'Creator only'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Group Rules */}
              {group?.rules && group.rules.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-rm-gray-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Group Rules
                  </h4>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <ul className="space-y-1">
                      {group.rules.map((rule, index) => (
                        <li key={index} className="text-sm text-amber-800 flex items-start gap-2">
                          <span className="font-medium">{index + 1}.</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-rm-gray-200 bg-rm-gray-50">
              <button
                onClick={handleLeaveGroup}
                className="w-full flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                {t('groups.leave') || 'Leave Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && group && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-rm-gray-900">{t('groups.shareGroup') || 'Share Group'}</h3>
              <p className="text-sm text-rm-gray-500 mt-1">
                {t('groups.shareDescription') || 'Share this link to invite others to join'}
              </p>
            </div>
            
            <div className="bg-rm-gray-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-rm-gray-500 break-all">{group.shareLink}</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-srhr text-white rounded-xl font-medium hover:bg-srhr-dark transition-colors"
              >
                <Copy className="w-4 h-4" />
                {t('common.copy') || 'Copy Link'}
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 py-2 bg-rm-gray-100 text-rm-gray-700 rounded-xl font-medium hover:bg-rm-gray-200 transition-colors"
              >
                {t('common.close') || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Management Modal - WhatsApp Style */}
      {showMemberManagement && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal itself
            if (e.target === e.currentTarget) {
              setShowMemberManagement(false);
              setSelectedMemberForManagement(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-rm-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-rm-gray-900">
                    {group ? `${group.members.length + group.facilitators.length + 1} participants` : 'Loading...'}
                  </h2>
                  <p className="text-xs text-emerald-600 font-medium">
                    {isAdmin ? 'Tap a member to manage them' : 'Group members'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMemberManagement(false);
                  setSelectedMemberForManagement(null);
                }}
                className="p-2 hover:bg-rm-gray-200 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-rm-gray-500" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-rm-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rm-gray-400" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search participants..."
                  className="w-full pl-10 pr-4 py-2.5 bg-rm-gray-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {/* Members List - WhatsApp Style */}
            <div className="flex-1 overflow-y-auto">
              {!group ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-rm-gray-500">Loading members...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Creator Section Header */}
                  <div className="px-4 py-2 bg-rm-gray-50/50">
                    <p className="text-xs font-medium text-rm-gray-500 uppercase tracking-wide">
                      Group Creator
                    </p>
                  </div>

                  {/* Creator */}
                  <div
                    onClick={() => {
                      if (isCreator && group.createdBy !== session?.user?.id) {
                        setSelectedMemberForManagement({
                          userId: group.createdBy,
                          userName: group.createdByName,
                          userAvatar: group.createdByAvatar,
                          role: 'facilitator'
                        });
                      }
                    }}
                    className={cn(
                      "px-4 py-3 flex items-center gap-3 transition-all duration-150",
                      isCreator && group.createdBy !== session?.user?.id
                        ? "hover:bg-emerald-50 active:bg-emerald-100 cursor-pointer group"
                        : "cursor-default"
                    )}
                  >
                    <div className="relative">
                      {group.createdByAvatar ? (
                        <img
                          src={group.createdByAvatar}
                          alt={group.createdByName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-emerald-600" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center border-2 border-white">
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-rm-gray-900">{group.createdByName}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600 font-medium">Creator</span>
                        {group.createdBy === session?.user?.id && (
                          <span className="text-xs text-rm-gray-400">• You</span>
                        )}
                      </div>
                    </div>
                    {isCreator && group.createdBy !== session?.user?.id && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rm-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Delete
                        </span>
                        <ChevronRight className="w-5 h-5 text-rm-gray-400 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    )}
                  </div>

                {/* Facilitators Section */}
                {searchedMembers.facilitators.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-rm-gray-50/50 mt-2">
                    <p className="text-xs font-medium text-rm-gray-500 uppercase tracking-wide">
                      Admins ({searchedMembers.facilitators.length})
                    </p>
                  </div>
                  {searchedMembers.facilitators.map((facilitator) => (
                    <div
                      key={facilitator.userId}
                      onClick={() => {
                        if (isCreator) {
                          setSelectedMemberForManagement({
                            userId: facilitator.userId,
                            userName: facilitator.userName,
                            userAvatar: facilitator.userAvatar,
                            role: 'facilitator'
                          });
                        }
                      }}
                      className={cn(
                        "w-full px-4 py-3 flex items-center gap-3 transition-all duration-150",
                        isCreator
                          ? "hover:bg-emerald-50 active:bg-emerald-100 cursor-pointer group"
                          : "cursor-default"
                      )}
                    >
                      <div className="relative">
                        {facilitator.userAvatar ? (
                          <img
                            src={facilitator.userAvatar}
                            alt={facilitator.userName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                            <User className="w-6 h-6 text-emerald-600" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                          <Shield className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold text-rm-gray-900">{facilitator.userName}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-600 font-medium">Admin</span>
                          {facilitator.userId === session?.user?.id && (
                            <span className="text-xs text-rm-gray-400">• You</span>
                          )}
                        </div>
                      </div>
                      {isCreator && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-rm-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Manage
                          </span>
                          <ChevronRight className="w-5 h-5 text-rm-gray-400 group-hover:text-emerald-500 transition-colors" />
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Regular Members Section */}
              {searchedMembers.members.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-rm-gray-50/50 mt-2">
                    <p className="text-xs font-medium text-rm-gray-500 uppercase tracking-wide">
                      Members ({searchedMembers.members.length})
                    </p>
                  </div>
                  {searchedMembers.members.map((member) => (
                    <div
                      key={member.userId}
                      onClick={() => {
                        if (isAdmin) {
                          setSelectedMemberForManagement({
                            userId: member.userId,
                            userName: member.userName,
                            userAvatar: member.userAvatar,
                            role: 'member'
                          });
                        }
                      }}
                      className={cn(
                        "w-full px-4 py-3 flex items-center gap-3 transition-all duration-150",
                        isAdmin
                          ? "hover:bg-slate-50 active:bg-slate-100 cursor-pointer group"
                          : "cursor-default"
                      )}
                    >
                      {member.userAvatar ? (
                        <img
                          src={member.userAvatar}
                          alt={member.userName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold text-rm-gray-900">{member.userName}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-rm-gray-500">Member</span>
                          {member.userId === session?.user?.id && (
                            <span className="text-xs text-rm-gray-400">• You</span>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-rm-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Delete
                          </span>
                          <ChevronRight className="w-5 h-5 text-rm-gray-400 group-hover:text-slate-500 transition-colors" />
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Empty State */}
              {searchedMembers.members.length === 0 && searchedMembers.facilitators.length === 0 && memberSearchQuery && (
                <div className="px-4 py-8 text-center">
                  <User className="w-12 h-12 text-rm-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-rm-gray-500">No members found</p>
                  <p className="text-xs text-rm-gray-400">Try a different search term</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Close Button */}
            <div className="px-4 py-3 border-t border-rm-gray-200 bg-rm-gray-50">
              <button
                onClick={() => {
                  setShowMemberManagement(false);
                  setSelectedMemberForManagement(null);
                }}
                className="w-full py-3 bg-white hover:bg-rm-gray-100 text-rm-gray-700 rounded-xl font-semibold border border-rm-gray-200 transition-colors shadow-sm"
              >
                Close Management
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Action Menu - Professional Management Panel */}
      {selectedMemberForManagement && group && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedMemberForManagement(null)}
        >
          <div
            className="bg-white rounded-t-3xl max-w-md w-full shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <div className="w-full flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 bg-rm-gray-300 rounded-full" />
            </div>

            {/* Member Info Header */}
            <div className="px-6 py-4 flex items-center gap-4">
              {selectedMemberForManagement.userAvatar ? (
                <img
                  src={selectedMemberForManagement.userAvatar}
                  alt={selectedMemberForManagement.userName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-rm-gray-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-2 border-rm-gray-100">
                  <User className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xl text-rm-gray-900 truncate">{selectedMemberForManagement.userName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    selectedMemberForManagement.role === 'facilitator'
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  )}>
                    {selectedMemberForManagement.role === 'facilitator' ? 'Admin' : 'Member'}
                  </span>
                  {selectedMemberForManagement.userId === session?.user?.id && (
                    <span className="text-xs text-rm-gray-400">You</span>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-rm-gray-100 mx-6" />

            {/* Management Title */}
            <div className="px-6 py-3">
              <p className="text-xs font-semibold text-rm-gray-400 uppercase tracking-wider">
                Management Options
              </p>
            </div>

            {/* Action Buttons */}
            <div className="px-4 pb-2 space-y-1">
              {/* Message Member */}
              <button
                onClick={() => {
                  alert(`Message ${selectedMemberForManagement.userName} - Feature coming soon`);
                  setSelectedMemberForManagement(null);
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all duration-150 text-left group"
              >
                <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-rm-gray-900 block">Message</span>
                  <span className="text-xs text-rm-gray-500">Send private message</span>
                </div>
              </button>

              {/* Make Admin - Only for regular members, creator only */}
              {isCreator && selectedMemberForManagement.role === 'member' && (
                <button
                  onClick={() => {
                    handlePromoteToAdmin(
                      selectedMemberForManagement.userId,
                      selectedMemberForManagement.userName,
                      selectedMemberForManagement.userAvatar || ''
                    );
                    setSelectedMemberForManagement(null);
                  }}
                  disabled={promotingMember === selectedMemberForManagement.userId}
                  className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-emerald-50 active:bg-emerald-100 rounded-xl transition-all duration-150 text-left disabled:opacity-50 group"
                >
                  <div className="w-11 h-11 bg-emerald-50 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    {promotingMember === selectedMemberForManagement.userId ? (
                      <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Crown className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-rm-gray-900 block">
                      {promotingMember === selectedMemberForManagement.userId ? 'Promoting...' : 'Make Group Admin'}
                    </span>
                    <span className="text-xs text-rm-gray-500">Grant admin privileges</span>
                  </div>
                </button>
              )}

              {/* Demote Admin - Only for facilitators, creator only */}
              {isCreator && selectedMemberForManagement.role === 'facilitator' && (
                <button
                  onClick={() => {
                    handleDemoteAdmin(
                      selectedMemberForManagement.userId,
                      selectedMemberForManagement.userName
                    );
                    setSelectedMemberForManagement(null);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-amber-50 active:bg-amber-100 rounded-xl transition-all duration-150 text-left group"
                >
                  <div className="w-11 h-11 bg-amber-50 rounded-full flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <UserCog className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-rm-gray-900 block">Dismiss as Admin</span>
                    <span className="text-xs text-rm-gray-500">Remove admin privileges</span>
                  </div>
                </button>
              )}

              {/* Remove from Group - Admin can remove anyone except creator */}
              {isAdmin && selectedMemberForManagement.userId !== group.createdBy && (
                <button
                  onClick={() => {
                    handleRemoveMember(selectedMemberForManagement.userId);
                    setSelectedMemberForManagement(null);
                  }}
                  disabled={removingMember === selectedMemberForManagement.userId}
                  className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-red-50 active:bg-red-100 rounded-xl transition-all duration-150 text-left disabled:opacity-50 group"
                >
                  <div className="w-11 h-11 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors">
                    {removingMember === selectedMemberForManagement.userId ? (
                      <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <LogOut className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={cn(
                      "font-semibold block",
                      removingMember === selectedMemberForManagement.userId ? "text-red-400" : "text-red-600"
                    )}>
                      {removingMember === selectedMemberForManagement.userId ? 'Removing...' : 'Remove from Group'}
                    </span>
                    <span className="text-xs text-rm-gray-500">Remove member permanently</span>
                  </div>
                </button>
              )}
            </div>

            {/* Cancel Button */}
            <div className="p-4">
              <button
                onClick={() => setSelectedMemberForManagement(null)}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-all duration-150"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deny Join Request Modal */}
      {showDenyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-rm-gray-900">Deny Join Request</h3>
                <p className="text-sm text-rm-gray-500">Are you sure you want to deny this request?</p>
              </div>
            </div>

            {/* Deny Reason Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-rm-gray-700 mb-2">
                Reason for denial (optional)
              </label>
              <textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="Tell the user why their request was denied..."
                className="w-full px-4 py-3 bg-rm-gray-50 border border-rm-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-rm-gray-400 mt-1 text-right">
                {denyReason.length}/300
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDenyModal(false);
                  setDenyReason('');
                  setRequestToDeny(null);
                }}
                className="flex-1 py-2.5 bg-rm-gray-100 text-rm-gray-700 rounded-xl font-medium hover:bg-rm-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDenyRequest}
                disabled={processingRequest === requestToDeny}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processingRequest === requestToDeny ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Deny Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal - Enhanced WhatsApp Feature */}
      {showAddMemberModal && group && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-rm-gray-900">Add Member</h3>
                  <p className="text-sm text-rm-gray-500">Add directly to group</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setAddMemberUserId('');
                  setAddMemberUserName('');
                  setAddMemberUserAvatar('');
                }}
                className="p-2 hover:bg-rm-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-rm-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-rm-gray-700 mb-1">
                  User ID *
                </label>
                <input
                  type="text"
                  value={addMemberUserId}
                  onChange={(e) => setAddMemberUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="w-full px-4 py-3 bg-rm-gray-50 border border-rm-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-rm-gray-700 mb-1">
                  User Name *
                </label>
                <input
                  type="text"
                  value={addMemberUserName}
                  onChange={(e) => setAddMemberUserName(e.target.value)}
                  placeholder="Enter user name"
                  className="w-full px-4 py-3 bg-rm-gray-50 border border-rm-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-rm-gray-700 mb-1">
                  Avatar URL (optional)
                </label>
                <input
                  type="text"
                  value={addMemberUserAvatar}
                  onChange={(e) => setAddMemberUserAvatar(e.target.value)}
                  placeholder="Enter avatar URL"
                  className="w-full px-4 py-3 bg-rm-gray-50 border border-rm-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                  The user will be added directly without needing approval. They will receive a notification.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setAddMemberUserId('');
                    setAddMemberUserName('');
                    setAddMemberUserAvatar('');
                  }}
                  className="flex-1 py-2.5 bg-rm-gray-100 text-rm-gray-700 rounded-xl font-medium hover:bg-rm-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!addMemberUserId.trim() || !addMemberUserName.trim() || addingMember}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl font-medium transition-colors',
                    addMemberUserId.trim() && addMemberUserName.trim() && !addingMember
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-rm-gray-200 text-rm-gray-400 cursor-not-allowed'
                  )}
                >
                  {addingMember ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Adding...
                    </span>
                  ) : (
                    'Add Member'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal - Creator Only */}
      {showPermissionsModal && group && isCreator && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-srhr/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-srhr" />
                </div>
                <div>
                  <h3 className="font-semibold text-rm-gray-900">Group Permissions</h3>
                  <p className="text-sm text-rm-gray-500">Control who can do what</p>
                </div>
              </div>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="p-2 hover:bg-rm-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-rm-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Send Messages Permission */}
              <div className="p-3 bg-rm-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-rm-gray-700 mb-2">
                  Who can send messages
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdatePermissions({ canSendMessages: 'all' })}
                    disabled={updatingPermissions}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                      group.permissions.canSendMessages === 'all'
                        ? 'bg-srhr text-white'
                        : 'bg-white text-rm-gray-600 hover:bg-rm-gray-100'
                    )}
                  >
                    <MessageCircle className="w-4 h-4 inline mr-1" />
                    All Members
                  </button>
                  <button
                    onClick={() => handleUpdatePermissions({ canSendMessages: 'admins_only' })}
                    disabled={updatingPermissions}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                      group.permissions.canSendMessages === 'admins_only'
                        ? 'bg-srhr text-white'
                        : 'bg-white text-rm-gray-600 hover:bg-rm-gray-100'
                    )}
                  >
                    <Lock className="w-4 h-4 inline mr-1" />
                    Admins Only
                  </button>
                </div>
              </div>

              {/* Require Approval */}
              <div className="p-3 bg-rm-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-rm-gray-700">
                      Require approval to join
                    </label>
                    <p className="text-xs text-rm-gray-500">
                      If off, anyone with link joins instantly
                    </p>
                  </div>
                  <button
                    onClick={() => handleUpdatePermissions({ requireApprovalToJoin: !group.permissions.requireApprovalToJoin })}
                    disabled={updatingPermissions}
                    className={cn(
                      'w-12 h-6 rounded-full transition-colors relative',
                      group.permissions.requireApprovalToJoin ? 'bg-srhr' : 'bg-rm-gray-300'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                        group.permissions.requireApprovalToJoin ? 'left-7' : 'left-1'
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Add Members Permission */}
              <div className="p-3 bg-rm-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-rm-gray-700 mb-2">
                  Who can add members directly
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdatePermissions({ canAddMembers: 'admins' })}
                    disabled={updatingPermissions}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                      group.permissions.canAddMembers === 'admins'
                        ? 'bg-srhr text-white'
                        : 'bg-white text-rm-gray-600 hover:bg-rm-gray-100'
                    )}
                  >
                    All Admins
                  </button>
                  <button
                    onClick={() => handleUpdatePermissions({ canAddMembers: 'creator_only' })}
                    disabled={updatingPermissions}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                      group.permissions.canAddMembers === 'creator_only'
                        ? 'bg-srhr text-white'
                        : 'bg-white text-rm-gray-600 hover:bg-rm-gray-100'
                    )}
                  >
                    Creator Only
                  </button>
                </div>
              </div>

              {updatingPermissions && (
                <div className="text-center py-2">
                  <div className="w-5 h-5 border-2 border-srhr border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-rm-gray-500 mt-1">Updating...</p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="w-full py-2.5 bg-rm-gray-100 text-rm-gray-700 rounded-xl font-medium hover:bg-rm-gray-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Voice Selector Modal */}
      {showVoiceSelector && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowVoiceSelector(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Choose Voice</h3>
              <button onClick={() => setShowVoiceSelector(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <VoiceSelector
              selectedVoiceId={selectedVoiceId}
              onSelect={(id) => { setSelectedVoiceId(id); setShowVoiceSelector(false); }}
              isFacilitator={isFacilitatorVoice}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Message Bubble Component
function MessageBubble({
  message,
  isOwnMessage,
  onDelete,
  formatTime,
  t,
  isFacilitator,
  currentUserId,
  canDelete,
  isLastMessage,
}: {
  message: GroupMessage;
  isOwnMessage: boolean;
  onDelete: (id: string) => void;
  formatTime: (timestamp: string) => string;
  t: any;
  isFacilitator?: boolean;
  currentUserId?: string;
  canDelete: boolean;
  isLastMessage?: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState<string[]>(message.reactions || []);
  const [isPressing, setIsPressing] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Quick reaction emojis (WhatsApp style)
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

  // Close actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActions(false);
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to last message
  useEffect(() => {
    if (isLastMessage && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isLastMessage]);

  // WhatsApp-style long press handlers
  const handleTouchStart = () => {
    setIsPressing(true);
    pressTimerRef.current = setTimeout(() => {
      setShowReactions(true);
      setIsPressing(false);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsPressing(false);
  };

  const handleMouseDown = () => {
    setIsPressing(true);
    pressTimerRef.current = setTimeout(() => {
      setShowReactions(true);
      setIsPressing(false);
    }, 500);
  };

  const handleMouseUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsPressing(false);
  };

  const handleAddReaction = (emoji: string) => {
    if (!currentUserId) return;
    const newReactions = [...reactions, emoji];
    setReactions(newReactions);
    setShowReactions(false);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  return (
    <div 
      ref={messageRef}
      className={cn('flex gap-3', isOwnMessage ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar with Facilitator Badge */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center overflow-hidden',
          message.userAvatar ? 'bg-transparent' : 'bg-rm-gray-200'
        )}>
          {message.userAvatar ? (
            <img 
              src={message.userAvatar} 
              alt={message.userName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-rm-gray-600" />
          )}
        </div>
        
        {/* Facilitator Badge - Dark Green "F" */}
        {isFacilitator && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-800 rounded-full flex items-center justify-center border-2 border-white">
            <span className="text-[8px] font-bold text-white">F</span>
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={cn('flex-1 max-w-[75%]', isOwnMessage ? 'items-end' : 'items-start')}>
        {/* Header with Name */}
        <div className={cn('flex items-center gap-2 mb-1', isOwnMessage ? 'justify-end' : 'justify-start')}>
          <span className="text-sm font-medium text-rm-gray-900">
            {message.userName}
          </span>
          {isFacilitator && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
              Facilitator
            </span>
          )}
          <span className="text-xs text-rm-gray-400">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Message Bubble Container */}
        <div className="relative">
          {/* WhatsApp-style Reactions Picker */}
          {showReactions && (
            <div 
              ref={actionsRef}
              className={cn(
                "absolute z-50 bg-white border border-rm-gray-200 rounded-full px-3 py-2 shadow-xl",
                isOwnMessage ? 'right-0 -top-14' : 'left-0 -top-14'
              )}
            >
              <div className="flex items-center gap-2">
                {quickReactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddReaction(emoji)}
                    className="text-2xl hover:scale-125 transition-transform p-1"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={() => setShowReactions(false)}
                  className="p-1 hover:bg-rm-gray-100 rounded-full ml-1"
                >
                  <X className="w-4 h-4 text-rm-gray-500" />
                </button>
              </div>
            </div>
          )}

          {/* Message Bubble with long-press handlers */}
          <div
            className={cn(
              'relative px-4 py-2 rounded-2xl select-none',
              isOwnMessage
                ? 'bg-srhr text-white rounded-br-md'
                : 'bg-white border border-rm-gray-200 rounded-bl-md',
              isPressing && 'opacity-80 scale-[0.98] transition-all'
            )}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            {message.isDeleted ? (
              <p className="italic text-sm opacity-60">{t('chat.deleted') || 'Message deleted'}</p>
            ) : message.type === 'voice' && message.voiceData ? (
              <VoicePlayer
                base64={message.voiceData}
                duration={message.voiceDuration}
                isOwn={isOwnMessage}
                themeColor="#10b981"
              />
            ) : (
              <p className={cn(
                'text-sm whitespace-pre-wrap',
                isOwnMessage ? 'text-white' : 'text-rm-gray-900'
              )}>
                {message.content}
              </p>
            )}

            {/* 3-Dot Menu Button */}
            {!message.isDeleted && canDelete && (
              <button
                onClick={handleMenuClick}
                className="absolute -top-2 -right-2 p-1.5 bg-white border border-rm-gray-200 rounded-full shadow-md opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4 text-rm-gray-500" />
              </button>
            )}

            {/* Actions Dropdown Menu */}
            {showActions && canDelete && (
              <div 
                ref={actionsRef}
                className={cn(
                  "absolute z-30 bg-white border border-rm-gray-200 rounded-xl shadow-xl py-2 min-w-[160px]",
                  isOwnMessage ? 'right-0 top-8' : 'left-0 top-8'
                )}
              >
                <button
                  onClick={() => {
                    onDelete(message.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-left transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">Delete</span>
                </button>
              </div>
            )}
          </div>

          {/* Display Reactions */}
          {reactions.length > 0 && (
            <div className={cn(
              "flex items-center gap-1 mt-1",
              isOwnMessage ? 'justify-end' : 'justify-start'
            )}>
              {Array.from(new Set(reactions)).map((emoji, idx) => (
                <span 
                  key={idx}
                  className="text-sm bg-white border border-rm-gray-200 rounded-full px-1.5 py-0.5 shadow-sm"
                >
                  {emoji} {reactions.filter(r => r === emoji).length > 1 && reactions.filter(r => r === emoji).length}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Alert Circle component for error state
function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
