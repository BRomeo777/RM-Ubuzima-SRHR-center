// Groups Management Tab Component for AdminPanelPage
// This component is appended to AdminPanelPage.tsx

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  Check,
  X,
  User,
  Settings,
  Copy,
  MessageSquare,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../utils/helpers';
import { usePersistentStore } from '../store';
import type { Group, GroupRequest, GroupFacilitator } from '../types';
import {
  subscribeToGroups,
  subscribeToGroupRequests,
  approveGroupRequest,
  denyGroupRequest,
  updateGroupFacilitators,
  deleteGroup,
} from '../services/groupService';

interface GroupsManagementTabProps {
  showSuccess: (msg: string) => void;
}

function GroupsManagementTab({ showSuccess }: GroupsManagementTabProps) {
  const { t } = useTranslation();
  const { chatSettings, syncSettings } = usePersistentStore();
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'approved' | 'all'>('requests');
  const [groups, setGroups] = useState<Group[]>([]);
  const [requests, setRequests] = useState<GroupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [requestToDeny, setRequestToDeny] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [editingFacilitators, setEditingFacilitators] = useState(false);
  const [selectedNewFacilitators, setSelectedNewFacilitators] = useState<GroupFacilitator[]>([]);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Get available facilitators from chat settings for reassignment
  const availableFacilitators = chatSettings?.facilitators || [];

  // Sync settings to ensure facilitators are loaded
  useEffect(() => {
    const unsubscribe = syncSettings();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [syncSettings]);

  // Subscribe to groups and requests
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const unsubscribeGroups = subscribeToGroups((data) => {
      setGroups(data);
      setLoading(false);
    });
    
    const unsubscribeRequests = subscribeToGroupRequests((data) => {
      setRequests(data);
    });
    
    return () => {
      unsubscribeGroups();
      unsubscribeRequests();
    };
  }, []);

  // Handle subscription errors
  useEffect(() => {
    if (groups.length === 0 && requests.length === 0 && !loading) {
      // Check if Firebase indexes might be missing
      console.log('[GroupsTab] No data received - checking for Firebase index issues');
    }
  }, [groups, requests, loading]);

  const handleApprove = async (requestId: string) => {
    // Prevent duplicate clicks
    if (processingRequest) return;
    
    setProcessingRequest(requestId);
    
    try {
      const group = await approveGroupRequest(requestId, 'admin', 'Administrator');
      if (group) {
        showSuccess('Group request approved successfully');
      } else {
        alert('Failed to approve group request. The request may have already been processed.');
      }
    } catch (error) {
      console.error('[GroupsTab] Error approving request:', error);
      alert('An error occurred while approving the request.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDenyClick = (requestId: string) => {
    setRequestToDeny(requestId);
    setShowDenyModal(true);
  };

  const handleDenyConfirm = async () => {
    if (!requestToDeny || processingRequest) return;
    
    if (!denialReason.trim()) {
      alert('Please provide a reason for denying this request');
      return;
    }
    
    setProcessingRequest(requestToDeny);
    
    try {
      const success = await denyGroupRequest(requestToDeny, 'admin', 'Administrator', denialReason);
      if (success) {
        showSuccess('Group request denied');
        setShowDenyModal(false);
        setDenialReason('');
        setRequestToDeny(null);
      } else {
        alert('Failed to deny group request. The request may have already been processed.');
      }
    } catch (error) {
      console.error('[GroupsTab] Error denying request:', error);
      alert('An error occurred while denying the request.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleUpdateFacilitators = async (groupId: string, facilitators: Group['facilitators']): Promise<boolean> => {
    if (processingRequest) return false;

    // Validate exactly 2 facilitators before setting processing state
    if (facilitators.length !== 2) {
      alert('A group must have exactly 2 facilitators');
      return false;
    }

    setProcessingRequest(groupId);

    try {
      const success = await updateGroupFacilitators(groupId, facilitators);
      if (success) {
        showSuccess('Group facilitators updated successfully');
        return true;
      } else {
        alert('Failed to update facilitators');
        return false;
      }
    } catch (error) {
      console.error('[GroupsTab] Error updating facilitators:', error);
      alert('An error occurred while updating facilitators.');
      return false;
    } finally {
      setProcessingRequest(null);
    }
  };

  // Handle delete group click - opens confirmation modal
  const handleDeleteClick = (group: Group) => {
    setGroupToDelete(group);
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  // Handle confirm delete group
  const handleDeleteConfirm = async () => {
    if (!groupToDelete || processingRequest) return;

    // Require typing the group name for confirmation
    if (deleteConfirmText !== groupToDelete.name) {
      alert('Please type the exact group name to confirm deletion');
      return;
    }

    setProcessingRequest(groupToDelete.id);

    try {
      // Pass true for isSystemAdmin - admin panel users can delete ANY group
      const success = await deleteGroup(groupToDelete.id, 'admin', true);
      if (success) {
        showSuccess('Group deleted successfully');
        // Close modals
        setShowDeleteModal(false);
        setGroupToDelete(null);
        setDeleteConfirmText('');
        // Close group details if open
        if (selectedGroup?.id === groupToDelete.id) {
          setShowGroupDetails(false);
          setSelectedGroup(null);
        }
      } else {
        alert('Failed to delete group. You may not have permission or the group does not exist.');
      }
    } catch (error) {
      console.error('[GroupsTab] Error deleting group:', error);
      alert('An error occurred while deleting the group.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const deniedRequests = requests.filter(r => r.status === 'denied');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cool-900">Groups Management</h2>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-cool-200">
        {[
          { key: 'requests', label: `Pending Requests (${pendingRequests.length})`, icon: FileText },
          { key: 'approved', label: `Approved (${approvedRequests.length})`, icon: Check },
          { key: 'all', label: `All Groups (${groups.length})`, icon: Users },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
              activeSubTab === tab.key
                ? 'text-srhr border-srhr'
                : 'text-cool-500 border-transparent hover:text-cool-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending Requests Tab */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-cool-900">Pending Group Requests</h3>
          
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 bg-cool-50 rounded-xl">
              <FileText className="w-12 h-12 text-cool-300 mx-auto mb-4" />
              <p className="text-cool-500">No pending group requests</p>
              <p className="text-sm text-cool-400 mt-1">
                New group requests will appear here for your approval
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-cool-900">{request.name}</h4>
                      <p className="text-sm text-cool-500">{request.description}</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                      Pending
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-cool-500 mb-2">Requested by</p>
                    <div className="flex items-center gap-2">
                      {request.requestedByAvatar ? (
                        <img src={request.requestedByAvatar} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-cool-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-cool-500" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-cool-700">{request.requestedByName}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-cool-500 mb-2">
                      Proposed Facilitators ({request.proposedFacilitators.length}/2)
                    </p>
                    <div className="flex gap-2">
                      {request.proposedFacilitators.map((f) => (
                        <div key={f.userId} className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                          <div className="w-5 h-5 bg-green-800 rounded-full flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white">F</span>
                          </div>
                          <span className="text-xs text-cool-700">{f.userName}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingRequest === request.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingRequest === request.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDenyClick(request.id)}
                      disabled={processingRequest === request.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                      Deny
                    </button>
                  </div>

                  <p className="text-xs text-cool-400 mt-3">
                    Requested on {new Date(request.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approved Requests Tab */}
      {activeSubTab === 'approved' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-cool-900">Approved Groups</h3>
          
          {approvedRequests.length === 0 ? (
            <div className="text-center py-12 bg-cool-50 rounded-xl">
              <Check className="w-12 h-12 text-cool-300 mx-auto mb-4" />
              <p className="text-cool-500">No approved group requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-cool-900">{request.name}</h4>
                        <p className="text-xs text-cool-500">
                          Approved on {request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      Approved
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Groups Tab */}
      {activeSubTab === 'all' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-cool-900">All Active Groups</h3>
          
          {groups.length === 0 ? (
            <div className="text-center py-12 bg-cool-50 rounded-xl">
              <Users className="w-12 h-12 text-cool-300 mx-auto mb-4" />
              <p className="text-cool-500">No active groups yet</p>
              <p className="text-sm text-cool-400 mt-1">
                Approved groups will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {groups.map((group) => (
                <div key={group.id} className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-cool-900">{group.name}</h4>
                        <p className="text-xs text-cool-500">{group.members.length} members</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedGroup(group);
                          setShowGroupDetails(true);
                        }}
                        className="p-2 text-cool-400 hover:text-srhr hover:bg-srhr/10 rounded-lg transition-colors"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(group)}
                        disabled={processingRequest === group.id}
                        className="p-2 text-cool-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Group"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-cool-600 mb-4 line-clamp-2">{group.description}</p>

                  {/* Facilitators */}
                  <div className="mb-4">
                    <p className="text-xs text-cool-500 mb-2">Facilitators (Admins)</p>
                    <div className="flex flex-wrap gap-2">
                      {group.facilitators.map((f) => (
                        <div key={f.userId} className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                          <div className="w-4 h-4 bg-green-800 rounded-full flex items-center justify-center">
                            <span className="text-[6px] font-bold text-white">F</span>
                          </div>
                          <span className="text-xs text-cool-700">{f.userName}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Share Link */}
                  <div className="bg-cool-50 rounded-lg p-3">
                    <p className="text-xs text-cool-500 mb-1">Share Link</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-cool-700 truncate flex-1">{group.shareLink}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(group.shareLink);
                          showSuccess('Link copied to clipboard');
                        }}
                        className="p-1 text-cool-400 hover:text-srhr transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* View Chat Button */}
                  <Link
                    to={`/groups/${group.id}/chat`}
                    className="mt-4 flex items-center justify-center gap-2 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    View Group Chat
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Group Details Modal */}
      {showGroupDetails && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cool-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h3 className="text-lg font-semibold text-cool-900">{selectedGroup.name}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDeleteClick(selectedGroup)}
                  disabled={processingRequest === selectedGroup.id}
                  className="p-2 text-cool-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                  title="Delete Group"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowGroupDetails(false)}
                  className="p-2 hover:bg-cool-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-cool-500" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {/* Group Info */}
              <div className="mb-6">
                <h4 className="font-medium text-cool-700 mb-2">Description</h4>
                <p className="text-sm text-cool-600">{selectedGroup.description}</p>
              </div>

              {/* Facilitators Management */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-cool-700">Facilitators (Admins)</h4>
                  <button
                    onClick={() => {
                      setEditingFacilitators(!editingFacilitators);
                      setSelectedNewFacilitators(selectedGroup.facilitators);
                    }}
                    className="text-xs px-3 py-1 bg-srhr/10 text-srhr rounded-lg hover:bg-srhr/20 transition-colors"
                  >
                    {editingFacilitators ? 'Cancel' : 'Reassign'}
                  </button>
                </div>
                <p className="text-xs text-cool-500 mb-3">
                  These facilitators have admin access to manage the group. Exactly 2 facilitators required.
                </p>

                {/* Current/Editing Facilitators */}
                <div className="space-y-2">
                  {!editingFacilitators ? (
                    // View Mode - Show current facilitators with badges
                    selectedGroup.facilitators.map((f) => {
                      const facilitatorInfo = availableFacilitators.find(af => af.userId === f.userId);
                      const badges = facilitatorInfo?.badges || ['F'];
                      return (
                        <div key={f.userId} className="flex items-center justify-between p-3 bg-cool-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {badges.includes('F') && (
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center" title="Facilitator">
                                  <span className="text-[10px] font-bold text-white">F</span>
                                </div>
                              )}
                              {badges.includes('S') && (
                                <div className="w-6 h-6 bg-red-700 rounded-full flex items-center justify-center" title="Shangazi (Big Sister)">
                                  <span className="text-[10px] font-bold text-white">S</span>
                                </div>
                              )}
                              {badges.includes('H') && (
                                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center" title="Healthcare Provider">
                                  <span className="text-[10px] font-bold text-white">H</span>
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-medium text-cool-700">{f.userName}</span>
                            {facilitatorInfo?.isBigSister && (
                              <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">Shangazi</span>
                            )}
                            {facilitatorInfo?.isHealthcareProvider && (
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Healthcare</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Edit Mode - Select new facilitators
                    <>
                      <p className="text-xs text-cool-500 mb-2">
                        Selected: {selectedNewFacilitators.length}/2 facilitators
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-cool-200 rounded-lg p-2">
                        {availableFacilitators.map((f) => {
                          const isSelected = selectedNewFacilitators.some(sf => sf.userId === f.userId);
                          const badges = f.badges || ['F'];
                          return (
                            <button
                              key={f.userId}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedNewFacilitators(prev => prev.filter(sf => sf.userId !== f.userId));
                                } else if (selectedNewFacilitators.length < 2) {
                                  setSelectedNewFacilitators(prev => [...prev, {
                                    userId: f.userId,
                                    userName: f.userName,
                                    userAvatar: f.userAvatar || '',
                                    assignedAt: new Date().toISOString(),
                                    isAdmin: true
                                  }]);
                                }
                              }}
                              disabled={!isSelected && selectedNewFacilitators.length >= 2}
                              className={cn(
                                'w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left',
                                isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-cool-50',
                                !isSelected && selectedNewFacilitators.length >= 2 && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              <div className="flex gap-1">
                                {badges.includes('F') && (
                                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-white">F</span>
                                  </div>
                                )}
                                {badges.includes('S') && (
                                  <div className="w-5 h-5 bg-red-700 rounded-full flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-white">S</span>
                                  </div>
                                )}
                                {badges.includes('H') && (
                                  <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-white">H</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-sm text-cool-700">{f.userName}</span>
                              {isSelected && <Check className="w-4 h-4 text-green-600 ml-auto" />}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setEditingFacilitators(false)}
                          className="flex-1 py-2 border border-cool-200 text-cool-600 rounded-lg text-sm hover:bg-cool-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (selectedNewFacilitators.length !== 2) {
                              alert('You must select exactly 2 facilitators');
                              return;
                            }
                            const success = await handleUpdateFacilitators(selectedGroup.id, selectedNewFacilitators);
                            if (success) {
                              setEditingFacilitators(false);
                              setSelectedGroup({
                                ...selectedGroup,
                                facilitators: selectedNewFacilitators
                              });
                            }
                          }}
                          disabled={selectedNewFacilitators.length !== 2 || processingRequest === selectedGroup.id}
                          className="flex-1 py-2 bg-srhr text-white rounded-lg text-sm hover:bg-srhr-dark disabled:opacity-50"
                        >
                          {processingRequest === selectedGroup.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </span>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Members */}
              <div className="mb-6">
                <h4 className="font-medium text-cool-700 mb-2">
                  Members ({selectedGroup.members.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedGroup.members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-3 p-2 bg-cool-50 rounded-lg">
                      {m.userAvatar ? (
                        <img src={m.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-cool-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-cool-500" />
                        </div>
                      )}
                      <span className="text-sm text-cool-700">{m.userName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deny Modal */}
      {showDenyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-cool-900 mb-4">Deny Group Request</h3>
            <p className="text-sm text-cool-500 mb-4">
              Please provide a reason for denying this group request. This will be shared with the requester.
            </p>
            <textarea
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr mb-4"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleDenyConfirm}
                disabled={!denialReason.trim() || processingRequest === requestToDeny}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <button
                onClick={() => {
                  setShowDenyModal(false);
                  setDenialReason('');
                  setRequestToDeny(null);
                }}
                className="flex-1 py-2 border border-cool-200 text-cool-600 rounded-lg font-medium hover:bg-cool-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-cool-900">Delete Group</h3>
                <p className="text-sm text-cool-500">This action cannot be undone</p>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-700">
                <strong>Warning:</strong> You are about to permanently delete the group <strong>"{groupToDelete.name}"</strong>. 
                This will remove:
              </p>
              <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                <li>The group and all its settings</li>
                <li>All messages in the group</li>
                <li>All pending join requests</li>
              </ul>
            </div>

            {/* Confirmation Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-cool-700 mb-2">
                Type <strong>"{groupToDelete.name}"</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type the group name here..."
                className="w-full px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmText !== groupToDelete.name || processingRequest === groupToDelete.id}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingRequest === groupToDelete.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete Group'
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setGroupToDelete(null);
                  setDeleteConfirmText('');
                }}
                className="flex-1 py-2.5 border border-cool-200 text-cool-600 rounded-lg font-medium hover:bg-cool-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupsManagementTab;
