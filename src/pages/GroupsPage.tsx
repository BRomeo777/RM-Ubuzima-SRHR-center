import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useEphemeralStore, usePersistentStore } from '../store';
import {
  Users,
  Plus,
  Search,
  ArrowLeft,
  MessageCircle,
  User,
  Check,
  X,
  ChevronRight,
  Lock,
  Unlock,
  Shield,
  Clock,
  AlertCircle,
  LogOut,
  Globe
} from 'lucide-react';
import { cn } from '../utils/helpers';
import {
  subscribeToGroups,
  subscribeToUserGroups,
  joinGroup,
  leaveGroup,
  createGroupRequest,
  generateGroupShareLink,
  createGroupJoinRequest,
  hasPendingJoinRequest,
  cancelJoinRequest,
  subscribeToUserJoinRequests
} from '../services/groupService';
import type { Group, GroupFacilitator, GroupJoinRequest } from '../types';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';

export default function GroupsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const { session } = useEphemeralStore();
  const { chatSettings } = usePersistentStore();
  
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'explore'>('my');
  
  // Join request modal state
  const [showJoinRequestModal, setShowJoinRequestModal] = useState(false);
  const [selectedGroupForRequest, setSelectedGroupForRequest] = useState<Group | null>(null);
  const [joinReason, setJoinReason] = useState('');
  const [isSubmittingJoinRequest, setIsSubmittingJoinRequest] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Map<string, GroupJoinRequest>>(new Map());
  
  // Create group form state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedFacilitators, setSelectedFacilitators] = useState<GroupFacilitator[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Get available facilitators from chat settings
  const availableFacilitators = chatSettings?.facilitators || [];
  
  // Sync chat settings to ensure facilitators are loaded
  useEffect(() => {
    const { syncSettings } = usePersistentStore.getState();
    const unsubscribe = syncSettings();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
  
  // Phone back navigation for modal
  usePhoneBackNavigation({
    isOpen: showCreateModal,
    onClose: () => {
      setShowCreateModal(false);
      resetForm();
    },
    modalId: 'create-group-modal'
  });

  // Phone back navigation for join request modal
  usePhoneBackNavigation({
    isOpen: showJoinRequestModal,
    onClose: () => {
      setShowJoinRequestModal(false);
      setJoinReason('');
      setSelectedGroupForRequest(null);
    },
    modalId: 'join-request-modal'
  });
  
  // Subscribe to groups
  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    console.log('[GroupsPage] 🚀 Setting up group subscriptions for user:', session.user.id);
    setLoading(true);

    // Subscribe to user's groups (CRITICAL: updates when admin adds user to group)
    const unsubscribeMyGroups = subscribeToUserGroups(session.user.id, (groups) => {
      console.log('[GroupsPage] 📨 Received my groups:', groups.length);
      setMyGroups(groups);
      setLoading(false);
    });

    // Subscribe to ALL approved groups (for Explore tab)
    const unsubscribeAllGroups = subscribeToGroups((groups) => {
      console.log('[GroupsPage] 📨 Received ALL groups for Explore:', groups.length);
      setAllGroups(groups);
    });

    return () => {
      console.log('[GroupsPage] 🧹 Cleaning up group subscriptions');
      unsubscribeMyGroups();
      unsubscribeAllGroups();
    };
  }, [session?.user]);

  // Subscribe to user's pending join requests (CRITICAL: removes request when approved)
  useEffect(() => {
    if (!session?.user) return;

    console.log('[GroupsPage] 🔌 Setting up pending requests subscription for user:', session.user.id);

    const unsubscribe = subscribeToUserJoinRequests(session.user.id, (requests) => {
      console.log('[GroupsPage] 📨 Received pending requests:', requests.length);
      const pendingMap = new Map(requests.map(r => [r.groupId, r]));
      setPendingRequests(pendingMap);
    });

    return () => {
      console.log('[GroupsPage] 🧹 Cleaning up pending requests subscription');
      unsubscribe();
    };
  }, [session?.user]);
  
  const resetForm = () => {
    setGroupName('');
    setGroupDescription('');
    setSelectedFacilitators([]);
    setSubmitSuccess(false);
    setIsSubmitting(false);
  };
  
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!session?.user) {
      alert('Please log in to create a group');
      return;
    }
    
    // Check if facilitators are available
    if (availableFacilitators.length === 0) {
      alert(t('groups.noFacilitatorsAvailable') || 'No facilitators are currently available. Please try again later.');
      return;
    }
    
    if (selectedFacilitators.length !== 2) {
      alert(t('groups.selectTwoFacilitators') || 'Please select exactly 2 facilitators');
      return;
    }
    
    if (!groupName.trim() || groupName.trim().length < 3) {
      alert(t('groups.nameTooShort') || 'Group name must be at least 3 characters');
      return;
    }
    
    if (!groupDescription.trim() || groupDescription.trim().length < 10) {
      alert(t('groups.descriptionTooShort') || 'Group description must be at least 10 characters');
      return;
    }
    
    // Validate that selected facilitators are still available (exist in system)
    const validFacilitators = availableFacilitators.filter(f => 
      selectedFacilitators.some(sf => sf.userId === f.userId)
    );
    
    if (validFacilitators.length !== 2) {
      alert(t('groups.facilitatorsNotAvailable') || 'One or more selected facilitators are no longer available. Please select again.');
      setSelectedFacilitators([]);
      return;
    }
    
    // Ensure selected facilitators have all required fields
    const sanitizedFacilitators = selectedFacilitators.map(f => ({
      userId: f.userId,
      userName: f.userName || 'Unknown',
      userAvatar: f.userAvatar || '',
      assignedAt: new Date().toISOString(),
      isAdmin: true
    }));
    
    setIsSubmitting(true);
    
    try {
      const result = await createGroupRequest({
        name: groupName.trim(),
        description: groupDescription.trim(),
        requestedBy: session.user.id,
        requestedByName: session.user.name,
        requestedByAvatar: session.user.avatar,
        proposedFacilitators: sanitizedFacilitators
      });
      
      if (result) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setShowCreateModal(false);
          resetForm();
        }, 2000);
      } else {
        alert(t('groups.createFailed') || 'Failed to create group request. Please try again.');
      }
    } catch (error) {
      console.error('[GroupsPage] Error creating group:', error);
      alert(t('groups.createError') || 'An error occurred while creating the group request.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleFacilitator = (facilitator: typeof availableFacilitators[0]) => {
    const groupFacilitator: GroupFacilitator = {
      userId: facilitator.userId,
      userName: facilitator.userName,
      userAvatar: facilitator.userAvatar,
      assignedAt: new Date().toISOString(),
      isAdmin: true
    };
    
    setSelectedFacilitators(prev => {
      const isSelected = prev.some(f => f.userId === facilitator.userId);
      
      if (isSelected) {
        return prev.filter(f => f.userId !== facilitator.userId);
      } else if (prev.length < 2) {
        return [...prev, groupFacilitator];
      }
      return prev;
    });
  };
  
  const handleJoinGroup = async (group: Group) => {
    if (!session?.user) {
      navigate('/auth');
      return;
    }

    // Check if group is active and approved
    if (!group.isActive || group.status !== 'approved') {
      alert(t('groups.groupNotAvailable') || 'This group is not currently available for joining.');
      return;
    }

    // Check if user already has a pending request
    if (pendingRequests.has(group.id)) {
      alert('You already have a pending request for this group. Please wait for admin approval.');
      return;
    }

    // Show join request modal instead of directly joining
    setSelectedGroupForRequest(group);
    setShowJoinRequestModal(true);
  };

  const handleSubmitJoinRequest = async () => {
    if (!selectedGroupForRequest || !session?.user) return;

    if (!joinReason.trim()) {
      alert('Please tell us why you want to join this group.');
      return;
    }

    setIsSubmittingJoinRequest(true);

    // Capture values before clearing state
    const groupId = selectedGroupForRequest.id;
    const groupName = selectedGroupForRequest.name;
    const reason = joinReason.trim();

    // Create optimistic request for immediate UI feedback
    const optimisticRequest: GroupJoinRequest = {
      id: 'temp-' + Date.now(),
      groupId: groupId,
      groupName: groupName,
      requestedBy: session.user.id,
      requestedByName: session.user.name,
      requestedByAvatar: session.user.avatar,
      requestedAt: new Date().toISOString(),
      reason: reason,
      status: 'pending'
    };

    // Optimistically update UI immediately
    setPendingRequests(prev => new Map(prev).set(groupId, optimisticRequest));
    setShowJoinRequestModal(false);
    setJoinReason('');
    setSelectedGroupForRequest(null);

    try {
      console.log('[GroupsPage] 📤 Sending join request:', { groupId, groupName, reason });
      const request = await createGroupJoinRequest(
        groupId,
        groupName,
        session.user.id,
        session.user.name,
        session.user.avatar,
        reason
      );

      if (request) {
        // Update with real request data from server
        setPendingRequests(prev => new Map(prev).set(groupId, request));
        alert('Your request has been sent! You will be notified when an admin reviews it.');
      } else {
        // Remove optimistic update if failed
        setPendingRequests(prev => {
          const newMap = new Map(prev);
          newMap.delete(groupId);
          return newMap;
        });
        alert('Failed to send request. You may already be a member or an error occurred.');
      }
    } catch (error) {
      // Remove optimistic update on error
      setPendingRequests(prev => {
        const newMap = new Map(prev);
        newMap.delete(groupId);
        return newMap;
      });
      console.error('[GroupsPage] Error creating join request:', error);
      alert('An error occurred while sending your request.');
    } finally {
      setIsSubmittingJoinRequest(false);
    }
  };
  
  const handleLeaveGroup = async (groupId: string) => {
    if (!confirm(t('groups.confirmLeave') || 'Are you sure you want to leave this group?')) return;

    if (!session?.user) return;

    try {
      const success = await leaveGroup(groupId, session.user.id);
      if (!success) {
        alert(t('groups.leaveFailed') || 'Failed to leave group. Please try again.');
      }
    } catch (error) {
      console.error('[GroupsPage] Error leaving group:', error);
      alert(t('groups.leaveError') || 'An error occurred while leaving the group.');
    }
  };

  // Handle cancel join request
  const handleCancelRequest = async (requestId: string, groupId: string) => {
    if (!session?.user) return;

    if (!confirm('Are you sure you want to cancel your join request?')) return;

    try {
      const success = await cancelJoinRequest(requestId, session.user.id);
      if (success) {
        // Remove from pending requests
        setPendingRequests(prev => {
          const newMap = new Map(prev);
          newMap.delete(groupId);
          return newMap;
        });
        alert('Join request cancelled successfully.');
      } else {
        alert('Failed to cancel request. It may have already been processed.');
      }
    } catch (error) {
      console.error('[GroupsPage] Error cancelling request:', error);
      alert('An error occurred while cancelling the request.');
    }
  };

  // Helper functions - MUST be defined before any filters that use them
  const isGroupMember = useCallback((group: Group) => {
    if (!session?.user) return false;
    return group.members.some(m => m.userId === session.user.id) ||
           group.facilitators.some(f => f.userId === session.user.id);
  }, [session?.user]);

  const isGroupFacilitator = useCallback((group: Group) => {
    if (!session?.user) return false;
    return group.facilitators.some(f => f.userId === session.user.id);
  }, [session?.user]);

  const isGroupAdmin = useCallback((group: Group) => {
    if (!session?.user) return false;
    return group.admins?.some(a => a.userId === session.user.id) ||
           group.createdBy === session.user.id ||
           group.facilitators.some(f => f.userId === session.user.id);
  }, [session?.user]);
  
  // Filter for Explore tab: groups user is NOT a member of AND does NOT have pending request
  const exploreGroups = allGroups.filter(group => {
    const isMember = isGroupMember(group);
    const hasPending = pendingRequests.has(group.id);
    return !isMember && !hasPending;
  });

  const filteredAllGroups = exploreGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Link to="/services" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <h1 className="text-xl font-bold text-slate-900">{t('groups.title') || 'Groups'}</h1>
            </div>
          </div>
        </header>
        
        <main className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              {t('groups.loginRequired') || 'Login Required'}
            </h2>
            <p className="text-slate-500 mb-4">
              {t('groups.loginToAccess') || 'Please log in to access groups'}
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-6 py-2 bg-srhr text-white rounded-xl font-medium hover:bg-srhr-dark transition-colors"
            >
              {t('common.login') || 'Login'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/services" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">{t('groups.title') || 'Groups'}</h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-srhr text-white rounded-xl text-sm font-medium hover:bg-srhr-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('groups.create') || 'Create'}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('my')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all',
              activeTab === 'my'
                ? 'bg-srhr text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            {t('groups.myGroups') || 'My Groups'}
          </button>
          <button
            onClick={() => setActiveTab('explore')}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'explore'
                ? 'bg-srhr text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            {t('groups.explore') || 'Explore'}
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              activeTab === 'explore'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-600'
            )}>
              {exploreGroups.length}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4">
        {activeTab === 'explore' && (
          <div className="mb-4">
            {/* Available Groups Count */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-slate-700">
                {filteredAllGroups.length === exploreGroups.length
                  ? `${exploreGroups.length} groups available to join`
                  : `${filteredAllGroups.length} of ${exploreGroups.length} groups`
                }
              </h2>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-srhr hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('groups.search') || 'Search groups...'}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr/50"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse">
              <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400">{t('common.loading') || 'Loading...'}</p>
            </div>
          </div>
        ) : (
          <>
            {/* My Groups Tab */}
            {activeTab === 'my' && (
              <div className="space-y-6">
                {/* Pending Groups Section */}
                {pendingRequests.size > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-medium text-slate-700">
                        {t('groups.pendingRequests') || 'Waiting to Join'} ({pendingRequests.size})
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {Array.from(pendingRequests.entries()).map(([groupId, request]) => {
                        // Find group info from allGroups for display
                        const group = allGroups.find(g => g.id === groupId);
                        if (!group) return null;
                        return (
                          <GroupCard
                            key={`pending-${groupId}`}
                            group={group}
                            isMember={false}
                            isFacilitator={false}
                            isAdmin={false}
                            pendingRequest={request}
                            onJoin={() => {}} // No action needed - already requested
                            onLeave={() => {}}
                            onCancelRequest={() => handleCancelRequest(request.id, groupId)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Joined Groups Section */}
                <div className="space-y-3">
                  {pendingRequests.size > 0 && myGroups.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-srhr" />
                      <h3 className="text-sm font-medium text-slate-700">
                        {t('groups.joinedGroups') || 'Joined Groups'} ({myGroups.length})
                      </h3>
                    </div>
                  )}
                  {myGroups.length === 0 && pendingRequests.size === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-500 mb-2">{t('groups.noGroups') || "You haven't joined any groups yet"}</p>
                      <button
                        onClick={() => setActiveTab('explore')}
                        className="text-srhr font-medium hover:underline"
                      >
                        {t('groups.exploreGroups') || 'Explore groups'}
                      </button>
                    </div>
                  ) : myGroups.length > 0 ? (
                    myGroups.map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        isMember={true}
                        isFacilitator={isGroupFacilitator(group)}
                        isAdmin={isGroupAdmin(group)}
                        onJoin={() => navigate(`/groups/${group.id}/chat`)}
                        onLeave={() => handleLeaveGroup(group.id)}
                      />
                    ))
                  ) : null}
                </div>
              </div>
            )}

            {/* Explore Tab */}
            {activeTab === 'explore' && (
              <div className="space-y-3">
                {exploreGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 mb-2">
                      {myGroups.length > 0
                        ? "You've joined all available groups!"
                        : "No groups available to join yet"}
                    </p>
                    {myGroups.length > 0 && (
                      <button
                        onClick={() => setActiveTab('my')}
                        className="text-srhr font-medium hover:underline text-sm"
                      >
                        Go to My Groups
                      </button>
                    )}
                    <p className="text-sm text-slate-400 mt-2">
                      {myGroups.length > 0
                        ? "Check back later for new groups or create your own"
                        : "Be the first to create a group!"}
                    </p>
                  </div>
                ) : filteredAllGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500">No groups match your search</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-srhr text-sm hover:underline mt-2"
                    >
                      Clear search to see all {exploreGroups.length} groups
                    </button>
                  </div>
                ) : (
                  filteredAllGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      isMember={false}
                      isFacilitator={false}
                      isAdmin={false}
                      onJoin={() => handleJoinGroup(group)}
                      onLeave={() => {}}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {t('groups.createGroup') || 'Create Group'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {submitSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    {t('groups.requestSent') || 'Request Sent!'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {t('groups.requestPending') || 'Your group request is pending admin approval'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  {/* Group Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('groups.groupName') || 'Group Name'} *
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder={t('groups.namePlaceholder') || 'Enter group name...'}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr/50"
                      required
                      maxLength={50}
                    />
                  </div>

                  {/* Group Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('groups.groupDescription') || 'Group Description'} *
                    </label>
                    <textarea
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      placeholder={t('groups.descriptionPlaceholder') || 'Describe what your group is about...'}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr/50 resize-none"
                      rows={3}
                      required
                      maxLength={200}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {groupDescription.length}/200
                    </p>
                  </div>

                  {/* Facilitators Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('groups.selectFacilitators') || 'Select 2 Facilitators'} *
                    </label>
                    <p className="text-xs text-slate-500 mb-3">
                      {t('groups.facilitatorsRequired') || 'You must select exactly 2 facilitators who will be group admins'}
                    </p>
                    
                    {availableFacilitators.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-700">
                            {t('groups.noFacilitators') || 'No facilitators available at the moment'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableFacilitators.map((facilitator) => {
                          const isSelected = selectedFacilitators.some(f => f.userId === facilitator.userId);
                          return (
                            <button
                              key={facilitator.userId}
                              type="button"
                              onClick={() => toggleFacilitator(facilitator)}
                              disabled={!isSelected && selectedFacilitators.length >= 2}
                              className={cn(
                                'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                                isSelected
                                  ? 'border-srhr bg-srhr/5'
                                  : selectedFacilitators.length >= 2
                                    ? 'border-slate-100 opacity-50 cursor-not-allowed'
                                    : 'border-slate-200 hover:border-srhr/50'
                              )}
                            >
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-srhr/20 flex items-center justify-center">
                                  {facilitator.userAvatar ? (
                                    <img
                                      src={facilitator.userAvatar}
                                      alt={facilitator.userName}
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-5 h-5 text-srhr" />
                                  )}
                                </div>
                                {/* Facilitator Badge */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-800 rounded-full flex items-center justify-center border-2 border-white">
                                  <span className="text-[8px] font-bold text-white">F</span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">
                                  {facilitator.userName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {facilitator.role || 'Facilitator'}
                                </p>
                              </div>
                              {isSelected && (
                                <div className="w-6 h-6 bg-srhr rounded-full flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    
                    {selectedFacilitators.length > 0 && (
                      <p className="text-sm text-slate-500 mt-2">
                        {t('groups.selected') || 'Selected'}: {selectedFacilitators.length}/2
                      </p>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            {!submitSuccess && (
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || !groupDescription.trim() || selectedFacilitators.length !== 2 || isSubmitting || availableFacilitators.length === 0}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium transition-all',
                    groupName.trim() && groupDescription.trim() && selectedFacilitators.length === 2 && !isSubmitting && availableFacilitators.length > 0
                      ? 'bg-srhr text-white hover:bg-srhr-dark'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('common.sending') || 'Sending...'}
                    </span>
                  ) : (
                    t('groups.sendRequest') || 'Send Request'
                  )}
                </button>
                <p className="text-xs text-slate-400 text-center mt-2">
                  {t('groups.requestNote') || 'Your request will be reviewed by an admin'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Join Request Modal */}
      {showJoinRequestModal && selectedGroupForRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Request to Join</h3>
                  <p className="text-sm text-slate-500">{selectedGroupForRequest.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowJoinRequestModal(false);
                  setJoinReason('');
                  setSelectedGroupForRequest(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Group Info */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-600 mb-2">{selectedGroupForRequest.description}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {selectedGroupForRequest.members.length + selectedGroupForRequest.facilitators.length} members
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {selectedGroupForRequest.messageCount} messages
                </span>
              </div>
            </div>

            {/* Reason Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Why do you want to join this group?
              </label>
              <textarea
                value={joinReason}
                onChange={(e) => setJoinReason(e.target.value)}
                placeholder="Tell the admins why you'd like to join this group..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr focus:border-transparent resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-slate-400 mt-1 text-right">
                {joinReason.length}/500
              </p>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                Your request will be reviewed by the group admins. You will be notified when they respond.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowJoinRequestModal(false);
                  setJoinReason('');
                  setSelectedGroupForRequest(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitJoinRequest}
                disabled={!joinReason.trim() || isSubmittingJoinRequest}
                className={cn(
                  'flex-1 py-2.5 rounded-xl font-medium transition-colors',
                  joinReason.trim() && !isSubmittingJoinRequest
                    ? 'bg-srhr text-white hover:bg-srhr-dark'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                )}
              >
                {isSubmittingJoinRequest ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  'Send Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Group Card Component
function GroupCard({
  group,
  isMember,
  isFacilitator,
  isAdmin,
  pendingRequest,
  onJoin,
  onLeave,
  onCancelRequest
}: {
  group: Group;
  isMember: boolean;
  isFacilitator: boolean;
  isAdmin: boolean;
  pendingRequest?: GroupJoinRequest;
  onJoin: () => void;
  onLeave: () => void;
  onCancelRequest?: () => void;
}) {
  const { t } = useTranslation();
  
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Group Profile Photo */}
        {group.profilePhoto ? (
          <img
            src={group.profilePhoto}
            alt={group.name}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-200"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
        )}
        
        {/* Group Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate">{group.name}</h3>
            {isAdmin && (
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                  isFacilitator ? 'bg-green-800' : 'bg-amber-500'
                )}
                title={isFacilitator ? 'Admin' : 'Group Creator'}
              >
                <span className="text-[8px] font-bold text-white">
                  {isFacilitator ? 'F' : 'C'}
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-500 line-clamp-2">{group.description}</p>
          
          {/* Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {group.members.length + group.facilitators.length} {t('groups.members') || 'members'}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              {group.messageCount} {t('groups.messages') || 'messages'}
            </span>
            {/* Group Visibility Badge */}
            <span className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full',
              group.visibility === 'public'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600'
            )}>
              {group.visibility === 'public' ? (
                <>
                  <Globe className="w-3 h-3" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  Private
                </>
              )}
            </span>
          </div>
          
          {/* Admins (Creator + Facilitators) */}
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-slate-400 mr-1">{t('groups.admins') || 'Admins'}:</span>
            {/* Creator Badge First */}
            <div className="relative">
              {group.createdByAvatar ? (
                <img
                  src={group.createdByAvatar}
                  alt={group.createdByName}
                  className="w-6 h-6 rounded-full object-cover border border-white"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center border border-white">
                  <User className="w-3 h-3 text-amber-600" />
                </div>
              )}
              {/* Creator C Badge - Amber/Gold */}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full flex items-center justify-center border border-white">
                <span className="text-[6px] font-bold text-white">C</span>
              </div>
            </div>
            {/* Facilitator Badges */}
            {group.facilitators.slice(0, 2).map((f, i) => (
              <div key={f.userId} className="relative" style={{ marginLeft: '-8px', zIndex: 2 - i }}>
                {f.userAvatar ? (
                  <img
                    src={f.userAvatar}
                    alt={f.userName}
                    className="w-6 h-6 rounded-full object-cover border border-white"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-srhr/20 flex items-center justify-center border border-white">
                    <User className="w-3 h-3 text-srhr" />
                  </div>
                )}
                {/* F Badge - Green */}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-800 rounded-full flex items-center justify-center border border-white">
                  <span className="text-[6px] font-bold text-white">F</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-2">
          {isMember ? (
            <>
              <button
                onClick={onJoin}
                className="flex items-center gap-1 px-3 py-1.5 bg-srhr text-white rounded-lg text-sm font-medium hover:bg-srhr-dark transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {t('groups.open') || 'Open'}
              </button>
              <button
                onClick={onLeave}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={t('groups.leave') || 'Leave group'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : pendingRequest ? (
            // Show "Request Sent" with cancel option
            <div className="flex flex-col gap-1">
              <button
                disabled
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                <Clock className="w-4 h-4" />
                {t('groups.requestSent') || 'Request Sent'}
              </button>
              <button
                onClick={onCancelRequest}
                className="text-xs text-slate-400 hover:text-red-500 underline"
              >
                Cancel request
              </button>
            </div>
          ) : (
            // Show "Request to Join" button for non-members
            <button
              onClick={onJoin}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('groups.requestToJoin') || 'Request to Join'}
            </button>
          )}
        </div>
      </div>
      
    </div>
  );
}
