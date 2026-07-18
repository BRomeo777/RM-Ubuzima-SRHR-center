import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistentStore, useEphemeralStore } from '../store';
import { createSmartAvatar } from '../utils/avatar';
import { 
  Shield, 
  LogOut, 
  Bot, 
  FileText, 
  Building2, 
  Phone, 
  Calendar, 
  Video, 
  Settings,
  Trash2,
  AlertCircle,
  Plus,
  Edit2,
  Save,
  X,
  Check,
  Users,
  Activity,
  Database,
  Bell,
  Mail,
  Link2,
  Image as ImageIcon,
  Key,
  Layout,
  ChevronLeft,
  Circle,
  Smartphone,
  MessageSquare,
  Ban,
  UserCheck,
  Stethoscope,
  MapPin,
  Clock,
  Globe,
} from 'lucide-react';
import { cn, fileToBase64, validateFileSize, generateId } from '../utils/helpers';
import { uploadImage } from '../services/firebaseStorageService';
import { getLandingPagePhotos, uploadLandingPagePhotoInstant, deleteLandingPagePhoto, subscribeToLandingPagePhotos, type LandingPagePhotos, type UploadProgress } from '../services/landingPagePhotoService';
import { generateAIPost } from '../services/grokService';
import { getStorageUsage, getStorageWarning } from '../utils/storage';
import bcrypt from 'bcryptjs';
import { Link } from 'react-router-dom';
import type { AIPost, Facility, EmergencyContact, CarouselPhoto, Topic, Article, StatusUpdate, AIType, Organization, Appointment, ChatMessage, ChatSettings, Facilitator, Group, GroupRequest } from '../types';
import { subscribeToGroups, subscribeToGroupRequests, approveGroupRequest, denyGroupRequest, updateGroupFacilitators } from '../services/groupService';
import GroupsManagementTab from './AdminPanelPage-GroupsTab';
import AppointmentsTab from './AdminPanelPage-AppointmentsTab';
import RichTextEditor from '../components/RichTextEditor';

const ADMIN_TABS = [
  { key: 'dashboard', label: 'Overview', icon: Layout },
  { key: 'ai', label: 'Daily Feed', icon: Bot },
  { key: 'status', label: 'Status Updates', icon: Smartphone },
  { key: 'content', label: 'SRHR Content', icon: FileText },
  { key: 'chat', label: 'Chat Mgmt', icon: MessageSquare },
  { key: 'groups', label: 'Groups', icon: Users },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'organizations', label: 'Organizations', icon: Building2 },
  { key: 'facilities', label: 'Facilities', icon: Building2 },
  { key: 'emergency', label: 'Emergency', icon: Phone },
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'landing', label: 'Landing Page', icon: ImageIcon },
  { key: 'services', label: 'Services', icon: Settings },
  { key: 'legal', label: 'Legal Content', icon: Shield },
  { key: 'system', label: 'System', icon: Settings },
];

export default function AdminPanelPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);

  const {
    adminPassword,
    setAdminPassword,
    isAdminLoggedIn,
    setAdminLoggedIn,
    platformLogo,
    setPlatformLogo,
    appEmail,
    setAppEmail,
    aiAvatars,
    setAIAvatar,
    bazaMugangaLink,
    setBazaMugangaLink,
    bazaMugangaTopic,
    setBazaMugangaTopic,
    groqApiKey,
    setGroqApiKey,
    groqModel,
    setGroqModel,
    aiPosts,
    addAIPost,
    deleteAIPost,
    facilities,
    addFacility,
    updateFacility,
    deleteFacility,
    emergencyContacts,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
    enabledAIs,
    toggleAI,
    carouselPhotos,
    setCarouselPhotoAtIndex,
    deleteCarouselPhoto,
    topics,
    articles,
    addTopic,
    deleteTopic,
    addArticle,
    updateArticle,
    deleteArticle,
    statusUpdates,
    addStatusUpdate,
    deleteStatusUpdate,
    organizations,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    appointments,
    deleteAppointment,
    updateAppointment,
    syncAppointments,
    chatMessages,
    chatSettings,
    updateChatSettings,
    addFacilitator,
    removeFacilitator,
    banUser,
    unbanUser,
    approveFacilitatorRequest,
    denyFacilitatorRequest,
    changeAdminPassword,
    syncSettings,
    syncFacilities,
    users,
    getAllUsers,
    adminUpdateUserName,
  } = usePersistentStore();

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Sync settings from Firebase when admin is logged in
  useEffect(() => {
    if (isAdminLoggedIn) {
      const unsubscribe = syncSettings();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isAdminLoggedIn, syncSettings]);

  // Sync facilities from Firebase when admin is logged in
  useEffect(() => {
    if (isAdminLoggedIn) {
      const unsubscribe = syncFacilities();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isAdminLoggedIn, syncFacilities]);

  // Subscribe to groups for dashboard stats
  useEffect(() => {
    if (isAdminLoggedIn) {
      const unsubscribe = subscribeToGroups((data) => {
        setGroups(data);
      });
      return () => unsubscribe();
    }
  }, [isAdminLoggedIn]);

  // Sync appointments from Firebase
  useEffect(() => {
    if (isAdminLoggedIn) {
      const unsubscribe = syncAppointments();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isAdminLoggedIn, syncAppointments]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedPassword = password.trim();
    
    if (!trimmedPassword) {
      setLoginError('Password is required');
      return;
    }
    
    console.log('[AdminPanel] Attempting login with password:', trimmedPassword);
    console.log('[AdminPanel] Stored adminPassword:', adminPassword);
    
    if (!adminPassword) {
      const hashed = await bcrypt.hash(trimmedPassword, 10);
      setAdminPassword(hashed);
      setAdminLoggedIn(true);
      showSuccess('Admin account created successfully');
      return;
    }

    // Check if password is stored as bcrypt (starts with $2) or plain text
    let isValid = false;
    if (adminPassword.startsWith('$2')) {
      // Bcrypt comparison
      isValid = await bcrypt.compare(trimmedPassword, adminPassword);
    } else {
      // Plain text comparison (fallback for default password)
      isValid = trimmedPassword === adminPassword;
    }
    
    console.log('[AdminPanel] Password valid:', isValid);
    
    if (isValid) {
      setAdminLoggedIn(true);
    } else {
      setLoginError('Invalid password');
    }
  };

  const handleLogout = () => {
    setAdminLoggedIn(false);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (data: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileSize(file);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setter(base64);
      showSuccess('Image uploaded successfully');
    } catch (error) {
      alert('Failed to upload file');
    }
  };

  const handleGenerateAI = async (aiType: Parameters<typeof generateAIPost>[0]) => {
    const result = await generateAIPost(aiType, i18n.language as 'en' | 'rw' | 'fr' | 'sw', 'medium');
    if (result.success) {
      addAIPost({
        aiType,
        content: result.content,
        category: 'general',
        isActive: true,
        postLength: 'medium',
        views: 0,
      });
      showSuccess('AI post generated successfully');
    } else {
      alert(result.error || 'Failed to generate');
    }
  };

  const storageUsage = getStorageUsage();
  const storageWarning = getStorageWarning();

  // Login Screen
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cool-900 via-cool-800 to-cool-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-srhr to-srhr-dark rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                {adminPassword ? 'Admin Login' : 'Setup Admin'}
              </h1>
              <p className="text-cool-300 mt-2">
                {adminPassword ? 'Enter your password to continue' : 'Create your admin password'}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-cool-400 focus:outline-none focus:ring-2 focus:ring-srhr"
                  required
                />
              </div>
              
              {loginError && (
                <div className="text-red-400 text-sm text-center">{loginError}</div>
              )}

              <button 
                type="submit" 
                className="w-full py-3 bg-gradient-to-r from-srhr to-srhr-dark text-white font-semibold rounded-xl hover:brightness-110 transition-all"
              >
                {adminPassword ? 'Login' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/" className="text-sm text-cool-400 hover:text-white transition-colors">
                ← Back to app
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cool-50">
      {/* Header */}
      <header className="bg-white shadow-soft sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/settings" className="p-2 hover:bg-cool-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-cool-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-srhr to-srhr-dark rounded-xl flex items-center justify-center shadow-soft">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-cool-900">Admin Panel</h1>
                <p className="text-xs text-cool-500">RM Ubuzima Management</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {storageWarning && (
              <span className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-full font-medium">
                {storageWarning}
              </span>
            )}
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 text-sm text-cool-600 hover:text-cool-900 px-3 py-2 hover:bg-cool-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-srhr text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-fade-in-down">
            <Check className="w-5 h-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row">
        {/* Sidebar - Horizontal scrollable on mobile, vertical on desktop */}
        <nav className="bg-white border-b md:border-b-0 md:border-r border-cool-200 md:min-h-[calc(100vh-73px)] p-2 md:p-4 sticky top-[73px] z-10 md:w-64 overflow-x-auto scrollbar-hide">
          <div className="flex md:flex-col gap-1 md:gap-1 min-w-max md:min-w-0">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl text-left transition-all whitespace-nowrap flex-shrink-0 md:flex-shrink md:w-auto md:mb-1',
                  activeTab === tab.key
                    ? 'bg-srhr/10 text-srhr shadow-soft'
                    : 'text-cool-600 hover:bg-cool-50'
                )}
              >
                <tab.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm md:text-base">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6">
          {activeTab === 'dashboard' && (
            <DashboardTab
              aiPosts={aiPosts}
              storageUsage={storageUsage}
              storageWarning={storageWarning}
              facilities={facilities}
              emergencyContacts={emergencyContacts}
              groups={groups}
            />
          )}

          {activeTab === 'ai' && (
            <AITab 
              aiPosts={aiPosts}
              enabledAIs={enabledAIs}
              onToggleAI={toggleAI}
              onGenerate={handleGenerateAI}
              onDelete={deleteAIPost}
              aiAvatars={aiAvatars}
            />
          )}

          {activeTab === 'system' && (
            <SystemTab
              groqApiKey={groqApiKey}
              groqModel={groqModel}
              onSetGroqApiKey={setGroqApiKey}
              onSetGroqModel={setGroqModel}
              platformLogo={platformLogo}
              onUploadLogo={setPlatformLogo}
              appEmail={appEmail}
              onSetAppEmail={setAppEmail}
              aiAvatars={aiAvatars}
              onSetAIAvatar={setAIAvatar}
              carouselPhotos={carouselPhotos}
              onSetCarouselPhotoAtIndex={setCarouselPhotoAtIndex}
              onDeleteCarouselPhoto={deleteCarouselPhoto}
              changeAdminPassword={changeAdminPassword}
              showSuccess={showSuccess}
            />
          )}

          {activeTab === 'services' && (
            <ServicesTab
              bazaMugangaLink={bazaMugangaLink}
              onSetBazaMugangaLink={setBazaMugangaLink}
              bazaMugangaTopic={bazaMugangaTopic}
              onSetBazaMugangaTopic={setBazaMugangaTopic}
            />
          )}

          {activeTab === 'facilities' && (
            <FacilitiesTab
              facilities={facilities}
              onAdd={addFacility}
              onUpdate={updateFacility}
              onDelete={deleteFacility}
            />
          )}

          {activeTab === 'emergency' && (
            <EmergencyTab
              contacts={emergencyContacts}
              onAdd={addEmergencyContact}
              onUpdate={updateEmergencyContact}
              onDelete={deleteEmergencyContact}
            />
          )}

          {activeTab === 'content' && (
            <SRHRContentTab
              topics={topics}
              articles={articles}
              onAddTopic={addTopic}
              onDeleteTopic={deleteTopic}
              onAddArticle={addArticle}
              onUpdateArticle={updateArticle}
              onDeleteArticle={deleteArticle}
            />
          )}

          {activeTab === 'status' && (
            <StatusUpdatesTab
              statusUpdates={statusUpdates}
              onAdd={(update) => addStatusUpdate({
                ...update,
                createdBy: 'admin',
                createdByName: 'Administrator',
                createdByBadge: 'Admin',
              })}
              onDelete={deleteStatusUpdate}
            />
          )}

          {activeTab === 'organizations' && (
            <OrganizationsTab
              organizations={organizations}
              onAdd={addOrganization}
              onUpdate={updateOrganization}
              onDelete={deleteOrganization}
            />
          )}

          {activeTab === 'chat' && (
            <ChatManagementTab
              chatMessages={chatMessages}
              chatSettings={chatSettings}
              onUpdateSettings={updateChatSettings}
              onAddFacilitator={addFacilitator}
              onRemoveFacilitator={removeFacilitator}
              onBanUser={banUser}
              onUnbanUser={unbanUser}
              onApproveFacilitatorRequest={approveFacilitatorRequest}
              onDenyFacilitatorRequest={denyFacilitatorRequest}
              showSuccess={showSuccess}
            />
          )}

          {activeTab === 'groups' && (
            <GroupsManagementTab
              showSuccess={showSuccess}
            />
          )}

          {activeTab === 'members' && (
            <MembersManagementTab
              users={users}
              getAllUsers={getAllUsers}
              banUser={banUser}
              unbanUser={unbanUser}
              adminUpdateUserName={adminUpdateUserName}
              showSuccess={showSuccess}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsTab
              appointments={appointments}
              onUpdate={updateAppointment}
              onDelete={deleteAppointment}
              showSuccess={showSuccess}
            />
          )}

          {activeTab === 'legal' && (
            <LegalContentTab
              showSuccess={showSuccess}
            />
          )}

          {activeTab === 'landing' && (
            <LandingPagePhotosTab
              showSuccess={showSuccess}
            />
          )}

        </main>
      </div>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({
  aiPosts,
  storageUsage,
  storageWarning,
  facilities,
  emergencyContacts,
  groups,
}: {
  aiPosts: AIPost[];
  storageUsage: number;
  storageWarning: string | null;
  facilities: Facility[];
  emergencyContacts: EmergencyContact[];
  groups: Group[];
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cool-900">Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Bot}
          label="AI Posts"
          value={aiPosts.length}
          color="bg-srhr"
        />
        <StatCard
          icon={Building2}
          label="Facilities"
          value={facilities.length}
          color="bg-srhr-dark"
        />
        <StatCard
          icon={Phone}
          label="Emergency Contacts"
          value={emergencyContacts.length}
          color="bg-cool-600"
        />
        <StatCard
          icon={Users}
          label="Active Groups"
          value={groups.length}
          color="bg-emerald-600"
        />
        <StatCard
          icon={Database}
          label="Storage Used"
          value={`${storageUsage.toFixed(1)}MB`}
          color="bg-cool-700"
        />
        <StatCard
          icon={UserCheck}
          label="Facilitators"
          value={groups.reduce((acc, g) => acc + g.facilitators.length, 0)}
          color="bg-indigo-600"
        />
      </div>

      {storageWarning && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700 font-medium">{storageWarning}</span>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-soft border border-cool-200 p-6">
        <h3 className="font-semibold text-cool-900 mb-4">Recent AI Posts</h3>
        <div className="space-y-3">
          {aiPosts.slice(0, 5).map((post) => (
            <div key={post.id} className="flex items-start gap-3 p-3 bg-cool-50 rounded-lg">
              <div className="w-8 h-8 bg-srhr/20 rounded-full flex items-center justify-center text-xs font-bold text-srhr">
                {post.aiType.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-cool-900">{post.aiType}</p>
                <p className="text-xs text-cool-500 line-clamp-1">{post.content}</p>
              </div>
              <span className="text-xs text-cool-400">{post.views} views</span>
            </div>
          ))}
          {aiPosts.length === 0 && (
            <p className="text-cool-500 text-center py-4">No posts yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Bot; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-cool-900">{value}</p>
      <p className="text-sm text-cool-500">{label}</p>
    </div>
  );
}

// AI Tab Component
function AITab({ 
  aiPosts, 
  enabledAIs,
  onToggleAI,
  onGenerate,
  onDelete,
  aiAvatars,
}: { 
  aiPosts: AIPost[];
  enabledAIs: string[];
  onToggleAI: (ai: AIType) => void;
  onGenerate: (ai: AIType) => void;
  onDelete: (id: string) => void;
  aiAvatars: Record<AIType, string | null>;
}) {
  const aiPersonas = [
    { key: 'ubuzima-admin' as AIType, name: 'RM Admin', title: 'Community Guide', color: 'bg-slate-700' },
    { key: 'hekimo' as AIType, name: 'Hekimo', title: 'SRHR News AI', color: 'bg-emerald-700' },
  ] as const;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cool-900">Daily Feed Management</h2>

      {/* AI Personas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiPersonas.map((ai) => (
          <div key={ai.key} className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 ${ai.color} rounded-xl flex items-center justify-center`}>
                <Bot className="w-6 h-6 text-white" />
              </div>
              <button
                onClick={() => onToggleAI(ai.key)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  enabledAIs.includes(ai.key)
                    ? 'bg-srhr/20 text-srhr'
                    : 'bg-cool-100 text-cool-500'
                )}
              >
                {enabledAIs.includes(ai.key) ? 'Active' : 'Inactive'}
              </button>
            </div>
            <h3 className="font-semibold text-cool-900">{ai.name}</h3>
            <p className="text-sm text-cool-500">{ai.title}</p>
            {ai.key !== 'hekimo' && (
              <button
                onClick={() => onGenerate(ai.key)}
                className="mt-3 w-full py-2 bg-srhr/10 text-srhr rounded-lg text-sm font-medium hover:bg-srhr/20 transition-colors"
              >
                Generate Post
              </button>
            )}
            {ai.key === 'hekimo' && (
              <p className="mt-3 text-xs text-cool-400 text-center">
                Auto-posts at 6AM, 10AM, 2PM (SRHR) &amp; 6PM (General) — Kigali time
              </p>
            )}
          </div>
        ))}
      </div>

      {/* AI Avatars */}
      <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
        <h3 className="font-semibold text-cool-900 mb-4">AI Avatar</h3>
        <p className="text-sm text-cool-500 mb-4">RM Admin AI avatar (configure in System Settings)</p>
        <div className="flex justify-center">
          {aiAvatars['ubuzima-admin'] ? (
            <img
              src={aiAvatars['ubuzima-admin']!}
              alt="RM Admin"
              className="w-16 h-16 rounded-full object-cover mx-auto ring-2 ring-cool-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-white text-lg font-bold mx-auto">
              R
            </div>
          )}
        </div>
      </div>

      {/* Recent Posts */}
      <div className="bg-white rounded-xl shadow-soft border border-cool-200 p-6">
        <h3 className="font-semibold text-cool-900 mb-4">Recent Posts</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {aiPosts.map((post) => (
            <div key={post.id} className="flex items-start gap-3 p-3 bg-cool-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-srhr bg-srhr/10 px-2 py-0.5 rounded">
                    {post.aiType}
                  </span>
                  <span className="text-xs text-cool-400">
                    {new Date(post.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-cool-600 line-clamp-2">{post.content}</p>
              </div>
              <button
                onClick={() => onDelete(post.id)}
                className="p-1.5 text-cool-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {aiPosts.length === 0 && (
            <p className="text-cool-500 text-center py-8">No posts yet. Generate your first post above.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// System Tab Component
function SystemTab({
  groqApiKey,
  groqModel,
  onSetGroqApiKey,
  onSetGroqModel,
  platformLogo,
  onUploadLogo,
  appEmail,
  onSetAppEmail,
  aiAvatars,
  onSetAIAvatar,
  carouselPhotos,
  onSetCarouselPhotoAtIndex,
  onDeleteCarouselPhoto,
  changeAdminPassword,
  showSuccess,
}: {
  groqApiKey: string;
  groqModel: string;
  onSetGroqApiKey: (key: string) => void;
  onSetGroqModel: (model: 'llama-3.1-8b-instant' | 'llama-3.3-70b-versatile' | 'mixtral-8x7b-32768') => void;
  platformLogo: string | null;
  onUploadLogo: (base64: string) => void | Promise<void>;
  appEmail: string;
  onSetAppEmail: (email: string) => void;
  aiAvatars: Record<AIType, string | null>;
  onSetAIAvatar: (aiType: AIType, avatar: string | null) => void | Promise<void>;
  carouselPhotos: CarouselPhoto[];
  onSetCarouselPhotoAtIndex: (index: number, url: string | null) => Promise<void>;
  onDeleteCarouselPhoto: (id: string) => Promise<void>;
  changeAdminPassword: (current: string, newPass: string) => boolean;
  showSuccess?: (msg: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleChangePassword = () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    const success = changeAdminPassword(currentPassword, newPassword);
    if (success) {
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError('Current password is incorrect');
    }
  };

  const [logoUploading, setLogoUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit. Please choose a smaller image.`);
      return;
    }

    setLogoUploading(true);
    setUploadError(null);
    try {
      const { uploadImage } = await import('../services/firebaseStorageService');
      const url = await uploadImage(file, 'logos', `platform_logo_${Date.now()}`, true);
      await onUploadLogo(url);
      showSuccess?.('Logo uploaded successfully');
    } catch (error) {
      console.error('Failed to upload logo:', error);
      setUploadError('Failed to upload logo. Please try again.');
      alert('Failed to upload logo. Please try again.');
    } finally {
      setLogoUploading(false);
    }
  };

  // Handle carousel photo upload - DIRECT (no waiting)
  const handleCarouselPhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Create local URL for instant display
    const localUrl = URL.createObjectURL(file);
    
    // Add to UI immediately - no waiting
    const newPhoto: CarouselPhoto = {
      id: `temp_${Date.now()}`,
      url: localUrl,
      caption: '',
      order: index,
    };
    
    // Update local state instantly
    const updated = carouselPhotos.filter(p => p.order !== index).concat(newPhoto);
    usePersistentStore.setState({ carouselPhotos: updated });
    
    // Upload and save
    try {
      const url = await uploadImage(file, 'carousel', `carousel_${index}_${Date.now()}`, false);
      await onSetCarouselPhotoAtIndex(index, url);
      URL.revokeObjectURL(localUrl);
      alert(`Photo ${index + 1} saved successfully!`);
    } catch (error) {
      alert('Upload failed. Please try again.');
    }
    
    e.target.value = '';
  };

  // Get photo at specific index or return null
  const getPhotoAtIndex = (index: number): CarouselPhoto | null => {
    return carouselPhotos.find(p => p.order === index) || null;
  };

  // Handle delete photo at index
  const handleDeletePhotoAtIndex = async (index: number) => {
    const photo = getPhotoAtIndex(index);
    if (photo) {
      await onDeleteCarouselPhoto(photo.id);
      showSuccess?.(`Photo ${index + 1} removed`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cool-900">System Settings</h2>

      {/* Compliance Notice */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900">AI Educational Use Notice</h3>
            <p className="text-amber-800/90 mt-1.5 text-sm leading-relaxed">
              This AI feature generates <strong>general health education content only</strong>. All responses include disclaimers 
              directing users to licensed professionals. By using this feature, you agree to:
            </p>
            <ul className="text-amber-800/80 mt-2 text-sm space-y-1">
              <li className="flex items-center gap-2"><span className="text-amber-500">•</span> Use AI solely for educational content—not medical advice</li>
              <li className="flex items-center gap-2"><span className="text-amber-500">•</span> Include mandatory disclaimers on all AI-generated content</li>
              <li className="flex items-center gap-2"><span className="text-amber-500">•</span> Comply with Groq's Acceptable Use and Responsible AI policies</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-cool-100 rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-cool-600" />
          </div>
          <div>
            <h3 className="font-semibold text-cool-900">Groq API Key</h3>
            <p className="text-sm text-cool-500">For generating educational health content with disclaimers</p>
          </div>
        </div>

        <input
          type="password"
          value={groqApiKey}
          onChange={(e) => onSetGroqApiKey(e.target.value)}
          placeholder="Enter Groq API key (gsk_...)"
          className="w-full px-4 py-3 bg-cool-50 border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr"
        />
        
        {/* Model Selection */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-cool-700 mb-2">AI Model</label>
          <select
            value={groqModel}
            onChange={(e) => onSetGroqModel(e.target.value as 'llama-3.1-8b-instant' | 'llama-3.3-70b-versatile' | 'mixtral-8x7b-32768')}
            className="w-full px-4 py-3 bg-cool-50 border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr"
          >
            <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Recommended)</option>
            <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fast responses)</option>
            <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
          </select>
        </div>

        {/* Safety Features */}
        <div className="mt-4 bg-blue-50/60 border border-blue-100 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">Built-in Safety Features</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-blue-800/80">
            <div className="flex items-center gap-1.5">
              <span className="text-blue-500">✓</span> Mandatory disclaimers on all content
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-500">✓</span> "Not a healthcare professional" notice
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-500">✓</span> Emergency redirect to services
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-500">✓</span> Terms acceptance required
            </div>
          </div>
        </div>
      </div>

      {/* Admin Password */}
      <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-srhr-dark/20 rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-srhr-dark" />
          </div>
          <div>
            <h3 className="font-semibold text-cool-900">Change Admin Password</h3>
            <p className="text-sm text-cool-500">Update your admin login password</p>
          </div>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current Password"
            className="w-full px-4 py-3 bg-cool-50 border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New Password (min 6 chars)"
            className="w-full px-4 py-3 bg-cool-50 border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm New Password"
            className="w-full px-4 py-3 bg-cool-50 border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr"
          />
          {passwordError && (
            <p className="text-sm text-red-500">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-green-600">{passwordSuccess}</p>
          )}
          <button
            onClick={handleChangePassword}
            className="w-full px-4 py-3 bg-srhr text-white rounded-xl font-medium hover:bg-srhr-dark transition-colors"
          >
            Update Password
          </button>
        </div>
        <p className="text-xs text-cool-400 mt-3">
          Default password is: <strong>RM@Dr.R2026</strong>
        </p>
      </div>

      {/* Platform Logo */}
      <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-srhr/20 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-srhr" />
          </div>
          <div>
            <h3 className="font-semibold text-cool-900">Platform Logo</h3>
            <p className="text-sm text-cool-500">Shown on login screen</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {platformLogo ? (
            <img src={platformLogo} alt="Logo" className="w-24 h-24 object-contain rounded-lg" />
          ) : (
            <div className="w-24 h-24 bg-cool-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-cool-400" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            disabled={logoUploading}
            onChange={handleLogoUpload}
            className="block text-sm text-cool-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-srhr/10 file:text-srhr hover:file:bg-srhr/20 disabled:opacity-50"
          />
          {logoUploading && <span className="text-xs text-cool-500">Uploading...</span>}
        </div>
      </div>

      {/* App Email */}
      <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-srhr/20 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-srhr" />
          </div>
          <div>
            <h3 className="font-semibold text-cool-900">App Email</h3>
            <p className="text-sm text-cool-500">Email address used to send all app emails (forgot password, appointments, etc.)</p>
          </div>
        </div>
        <div className="space-y-3">
          <input
            type="email"
            value={appEmail}
            onChange={(e) => onSetAppEmail(e.target.value)}
            placeholder="Enter app email address"
            className="w-full px-4 py-3 bg-cool-50 border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr"
          />
          <p className="text-xs text-cool-400">
            Default: <strong>rmubuzima@gmail.com</strong>. This email will be used as the sender for all emails sent by the app including password resets, appointment confirmations, and notifications.
          </p>
        </div>
      </div>

      {/* AI Avatars */}
      <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-srhr/20 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-srhr" />
          </div>
          <div>
            <h3 className="font-semibold text-cool-900">AI Avatars</h3>
            <p className="text-sm text-cool-500">Individual avatars for each AI</p>
          </div>
        </div>
        <AIAvatarsGrid aiAvatars={aiAvatars} onSetAIAvatar={onSetAIAvatar} showSuccess={showSuccess} />
      </div>

      {/* Carousel Photos - 5 Individual Uploads like Logo */}
      <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-srhr-dark/20 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-srhr-dark" />
          </div>
          <div>
            <h3 className="font-semibold text-cool-900">Homepage Carousel Photos</h3>
            <p className="text-sm text-cool-500">5 sliding photos - upload each one individually like the logo</p>
          </div>
        </div>
        
        {uploadError && (
          <p className="text-xs text-red-500 mb-3">{uploadError}</p>
        )}
        
        {/* 5 Individual Photo Upload Slots */}
        <div className="grid grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((index) => {
            const photo = getPhotoAtIndex(index);
            return (
              <div key={index} className="flex flex-col items-center gap-2">
                {/* Photo Preview / Empty Slot */}
                <div className="relative w-full">
                  {photo?.url ? (
                    <div className="relative group">
                      <img 
                        src={photo.url} 
                        alt={`Carousel ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{index + 1}</span>
                      </div>
                      <button
                        onClick={() => handleDeletePhotoAtIndex(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-cool-100 rounded-lg flex items-center justify-center border-2 border-dashed border-cool-300">
                      <span className="text-cool-400 text-lg font-bold">{index + 1}</span>
                    </div>
                  )}
                </div>
                
                {/* Individual Upload Input - Simple Direct Upload */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCarouselPhotoUpload(index, e)}
                  className="block w-full text-xs text-cool-500 file:mr-2 file:py-1.5 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-srhr-dark/10 file:text-srhr-dark hover:file:bg-srhr-dark/20 text-center"
                />
              </div>
            );
          })}
        </div>
        
        <p className="text-xs text-cool-400 mt-4">
          Click "Choose File" for each slot to upload a photo. Each photo stays in its position until you replace or delete it.
        </p>
      </div>
    </div>
  );
}

// Services Tab Component
function ServicesTab({
  bazaMugangaLink,
  onSetBazaMugangaLink,
  bazaMugangaTopic,
  onSetBazaMugangaTopic,
}: {
  bazaMugangaLink: string;
  onSetBazaMugangaLink: (link: string) => void;
  bazaMugangaTopic: string;
  onSetBazaMugangaTopic: (topic: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cool-900">Services Configuration</h2>

      {/* Baza Muganga */}
      <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-srhr-dark/20 rounded-lg flex items-center justify-center">
            <Video className="w-5 h-5 text-srhr-dark" />
          </div>
          <div>
            <h3 className="font-semibold text-cool-900">Baza Muganga</h3>
            <p className="text-sm text-cool-500">Weekly video conference settings</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cool-700 mb-2">Jitsi Room Link</label>
            <input
              type="url"
              value={bazaMugangaLink}
              onChange={(e) => onSetBazaMugangaLink(e.target.value)}
              placeholder="https://meet.jit.si/room-name"
              className="w-full px-4 py-3 bg-cool-50 border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cool-700 mb-2">This Week's Topic</label>
            <input
              type="text"
              value={bazaMugangaTopic}
              onChange={(e) => onSetBazaMugangaTopic(e.target.value)}
              placeholder="Weekly discussion topic"
              className="w-full px-4 py-3 bg-cool-50 border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Facilities Tab Component
function FacilitiesTab({
  facilities,
  onAdd,
  onUpdate,
  onDelete,
}: {
  facilities: Facility[];
  onAdd: (facility: Omit<Facility, 'id'>) => Promise<Facility | null>;
  onUpdate: (id: string, updates: Partial<Facility>) => void;
  onDelete: (id: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<Facility[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'health_center' as Facility['type'],
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
    services: [] as string[],
    hours: '7AM - 7PM',
    googleMapsLink: '',
    contacts: [] as any[],
  });

  const facilityTypeOptions = [
    { value: 'hospital', label: 'Hospital', icon: Building2, color: '#EF4444' },
    { value: 'health_center', label: 'Health Center', icon: Stethoscope, color: '#8B5CF6' },
    { value: 'health_post', label: 'Health Post', icon: MapPin, color: '#F59E0B' },
    { value: 'pharmacy', label: 'Pharmacy', icon: Link2, color: '#10B981' },
    { value: 'private_clinic', label: 'Private Clinic', icon: Activity, color: '#EC4899' },
  ];

  const commonServices = [
    'Family Planning', 'Antenatal Care', 'Delivery', 'Postnatal Care',
    'HIV Testing', 'STI Treatment', 'Cervical Cancer Screening', 'Breast Cancer Screening',
    'Vaccination', 'Nutrition Counseling', 'Youth-Friendly Services',
    'GBV Support', 'Mental Health', 'Psychological Support',
    'TB Treatment', 'General Medicine', 'Cardiology', 'Orthopedics', 'Radiology'
  ];

  const openAddModal = () => {
    setEditingFacility(null);
    setFormData({
      name: '',
      type: 'health_center',
      phone: '',
      address: '',
      latitude: '',
      longitude: '',
      services: [],
      hours: '7AM - 7PM',
      googleMapsLink: '',
      contacts: [],
    });
    setShowModal(true);
  };

  const openEditModal = (facility: Facility) => {
    setEditingFacility(facility);
    setFormData({
      name: facility.name,
      type: facility.type,
      address: facility.address,
      phone: facility.phone || '',
      latitude: facility.latitude?.toString() || '',
      longitude: facility.longitude?.toString() || '',
      services: facility.services || [],
      hours: facility.hours || '7AM - 7PM',
      googleMapsLink: facility.googleMapsLink || '',
      contacts: facility.contacts || [],
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.latitude || !formData.longitude || !formData.address || !formData.googleMapsLink) {
      return;
    }

    const facilityData = {
      name: formData.name,
      type: formData.type,
      latitude: parseFloat(formData.latitude) || 0,
      longitude: parseFloat(formData.longitude) || 0,
      address: formData.address,
      phone: formData.phone,
      hours: formData.hours,
      services: formData.services,
      googleMapsLink: formData.googleMapsLink,
      contacts: formData.contacts,
    };

    if (editingFacility) {
      await onUpdate(editingFacility.id, facilityData);
    } else {
      await onAdd(facilityData);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cool-900">Health Facilities</h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Facility
        </button>
      </div>

      {/* Facilities List */}
      {!facilities || facilities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">No facilities added yet</p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-srhr text-white rounded-lg hover:bg-srhr-dark transition-colors"
          >
            Add First Facility
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility) => {
            const facilityTypeOption = facilityTypeOptions.find(t => t.value === facility.type);
            const Icon = facilityTypeOption?.icon || Building2;
            return (
              <div
                key={facility.id}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <Icon className="w-6 h-6" style={{ color: facilityTypeOption?.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{facility.name}</h3>
                    <p className="text-sm text-slate-500 truncate">{facility.address}</p>
                    {facility.contacts && facility.contacts.length > 0 && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                        <Shield className="w-3 h-3" />
                        {facility.contacts.length} contacts
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  {facility.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span>{facility.phone}</span>
                    </div>
                  )}
                  {facility.hours && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4" />
                      <span>{facility.hours}</span>
                    </div>
                  )}
                  {facility.googleMapsLink && (
                    <a
                      href={facility.googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Globe className="w-4 h-4" />
                      <span className="truncate">{facility.googleMapsLink.substring(0, 30)}...</span>
                    </a>
                  )}
                </div>

                {facility.services && facility.services.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {facility.services.slice(0, 3).map((service, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                    {facility.services.length > 3 && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                        +{facility.services.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(facility)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(facility.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingFacility ? 'Edit Facility' : 'Add Facility'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-6 space-y-6">
              {/* Scroll hint */}
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>Scroll down to see Verified Contacts and Google Maps Link sections</span>
              </div>

              {/* Name with Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Facility Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, name: value });
                    if (value.trim().length > 0) {
                      const searchLower = value.toLowerCase();
                      const filtered = facilities.filter(f =>
                        f.name.toLowerCase().includes(searchLower) ||
                        f.address?.toLowerCase().includes(searchLower) ||
                        f.googleMapsLink?.toLowerCase().includes(searchLower)
                      ).slice(0, 10);
                      setNameSuggestions(filtered);
                      setShowSuggestions(filtered.length > 0);
                    } else {
                      setNameSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Start typing to search existing facilities..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {showSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50 border-b">
                      Click to auto-fill facility details (including Google Maps & Contacts)
                    </div>
                    {nameSuggestions.map((facility) => (
                      <button
                        key={facility.id}
                        type="button"
                        onClick={() => {
                          setFormData({
                            name: facility.name,
                            type: facility.type,
                            latitude: facility.latitude?.toString() || '',
                            longitude: facility.longitude?.toString() || '',
                            address: facility.address || '',
                            phone: facility.phone || '',
                            hours: facility.hours || '7AM - 7PM',
                            services: facility.services || [],
                            googleMapsLink: facility.googleMapsLink || '',
                            contacts: facility.contacts || [],
                          });
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {facility.type === 'hospital' ? '🏥' : facility.type === 'pharmacy' ? '💊' : '🏥'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900">{facility.name}</p>
                            <p className="text-xs text-slate-500 truncate">{facility.address}</p>
                            {facility.googleMapsLink && (
                              <p className="text-xs text-blue-600 truncate">
                                <Globe className="w-3 h-3 inline mr-1" />
                                {facility.googleMapsLink.substring(0, 40)}...
                              </p>
                            )}
                          </div>
                          {facility.contacts && facility.contacts.length > 0 && (
                            <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                              {facility.contacts.length} contacts
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {facilityTypeOptions.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value as Facility['type'] })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors text-sm ${
                        formData.type === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <type.icon className="w-4 h-4" style={{ color: type.color }} />
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Phone & Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Main Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hours</label>
                  <input
                    type="text"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* VERIFIED CONTACTS SECTION */}
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Verified Contacts ({formData.contacts?.length || 0} added)
                  </label>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Admin Verified</span>
                </div>
                <p className="text-xs text-blue-600 mb-4">
                  Add all contact methods for this facility. These will be displayed to users.
                </p>

                {/* Existing Contacts */}
                {formData.contacts && formData.contacts.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.contacts.map((contact: any, index: number) => (
                      <div key={contact.id} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-blue-100">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-700 min-w-[80px]">{contact.label}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              contact.type === 'phone' ? 'bg-emerald-100 text-emerald-700' :
                              contact.type === 'whatsapp' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {contact.type}
                            </span>
                            {contact.isVerified && <Check className="w-3 h-3 text-emerald-500" />}
                          </div>
                          <div className="text-sm text-slate-900 font-medium">{contact.value}</div>
                          {contact.notes && <div className="text-xs text-slate-500">{contact.notes}</div>}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newContacts = formData.contacts?.filter((_, i) => i !== index) || [];
                            setFormData({ ...formData, contacts: newContacts });
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Contact */}
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      id="contactLabel"
                      placeholder="Label (e.g., Emergency, Reception)"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <select id="contactType" className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="phone">Phone</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    id="contactValue"
                    placeholder="Contact number or email"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3"
                  />
                  <input
                    type="text"
                    id="contactNotes"
                    placeholder="Notes (optional)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const labelInput = document.getElementById('contactLabel') as HTMLInputElement;
                      const typeInput = document.getElementById('contactType') as HTMLSelectElement;
                      const valueInput = document.getElementById('contactValue') as HTMLInputElement;
                      const notesInput = document.getElementById('contactNotes') as HTMLInputElement;
                      if (labelInput.value && valueInput.value) {
                        const newContact = {
                          id: Date.now().toString(),
                          label: labelInput.value,
                          type: typeInput.value,
                          value: valueInput.value,
                          isVerified: true,
                          verifiedAt: new Date().toISOString(),
                          verifiedBy: 'admin',
                          notes: notesInput.value || undefined,
                        };
                        setFormData({
                          ...formData,
                          contacts: [...(formData.contacts || []), newContact]
                        });
                        labelInput.value = '';
                        valueInput.value = '';
                        notesInput.value = '';
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Verified Contact
                  </button>
                </div>
              </div>

              {/* Google Maps Link - REQUIRED */}
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <label className="block text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Google Maps Link *
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Required</span>
                </label>
                <p className="text-xs text-blue-600 mb-3">
                  This link identifies the facility. All contacts are linked to this Google Maps location.
                </p>
                <input
                  type="url"
                  value={formData.googleMapsLink}
                  onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {formData.googleMapsLink && (
                  <a
                    href={formData.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Link2 className="w-4 h-4" />
                    Preview on Google Maps
                  </a>
                )}
              </div>

              {/* Services */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Services</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                  {commonServices.map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          services: prev.services.includes(service)
                            ? prev.services.filter(s => s !== service)
                            : [...prev.services, service],
                        }));
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        formData.services.includes(service)
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {formData.services.includes(service) && <Check className="w-3 h-3 inline mr-1" />}
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.name || !formData.latitude || !formData.longitude || !formData.address || !formData.googleMapsLink}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {editingFacility ? 'Update' : 'Add'} Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Facilities List */}
      <div className="space-y-3">
        {facilities.map((facility) => (
          <div key={facility.id} className="bg-white rounded-xl p-4 shadow-soft border border-cool-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cool-100 rounded-lg flex items-center justify-center text-lg">
                {facility.type === 'hospital' ? '🏥' :
                 facility.type === 'pharmacy' ? '💊' :
                 facility.type === 'health_post' ? '🏪' :
                 facility.type === 'private_clinic' ? '🏩' : '🏨'}
              </div>
              <div>
                <h4 className="font-medium text-cool-900">{facility.name}</h4>
                <p className="text-sm text-cool-500">{facility.address}</p>
                <p className="text-xs text-cool-400 mt-0.5">
                  📍 {facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => openEditModal(facility)}
                className="p-2 text-cool-400 hover:text-srhr hover:bg-srhr/10 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(facility.id)}
                className="p-2 text-cool-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Emergency Tab Component
function EmergencyTab({
  contacts,
  onAdd,
  onUpdate,
  onDelete,
}: {
  contacts: EmergencyContact[];
  onAdd: (contact: Omit<EmergencyContact, 'id'>) => Promise<EmergencyContact | null>;
  onUpdate: (id: string, updates: Partial<EmergencyContact>) => void;
  onDelete: (id: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    category: 'police' as const,
    description: '',
  });

  const handleSubmit = () => {
    onAdd({
      name: formData.name,
      number: formData.number,
      category: formData.category,
      description: formData.description,
    });
    setIsAdding(false);
    setFormData({ name: '', number: '', category: 'police', description: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cool-900">Emergency Contacts</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-status-offline text-white rounded-lg font-medium hover:brightness-110 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {isAdding && (
        <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-200">
          <h3 className="font-semibold text-cool-900 mb-4">Add Emergency Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Name (e.g., Police Emergency)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="col-span-2 px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-status-offline"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className="px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-status-offline"
            />
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as typeof formData.category })}
              className="px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-status-offline"
            >
              <option value="police">Police</option>
              <option value="ambulance">Ambulance</option>
              <option value="gbv">GBV Support</option>
              <option value="suicide">Suicide Hotline</option>
              <option value="youth">Youth Support</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-status-offline text-white rounded-lg font-medium hover:brightness-110 transition-colors"
            >
              Add Contact
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-cool-200 text-cool-600 rounded-lg font-medium hover:bg-cool-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {contacts.map((contact) => (
          <div key={contact.id} className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-status-offline bg-red-50 px-2 py-0.5 rounded uppercase">
                  {contact.category}
                </span>
                <h4 className="font-medium text-cool-900 mt-1">{contact.name}</h4>
                <p className="text-lg font-bold text-cool-700">{contact.number}</p>
              </div>
              <button
                onClick={() => onDelete(contact.id)}
                className="p-1.5 text-cool-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Status Updates Tab Component
function StatusUpdatesTab({
  statusUpdates,
  onAdd,
  onDelete,
}: {
  statusUpdates: StatusUpdate[];
  onAdd: (update: Omit<StatusUpdate, 'id' | 'timestamp' | 'expiresAt'>) => Promise<StatusUpdate | null>;
  onDelete: (id: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [statusType, setStatusType] = useState<'image' | 'video' | 'text'>('text');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileSize(file);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setUploadedImage(base64);
      setMediaUrl(base64);
    } catch (error) {
      alert('Failed to upload image');
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;

    onAdd({
      type: statusType,
      content: content.trim(),
      mediaUrl: mediaUrl || undefined,
      viewedBy: [],
    });

    setIsAdding(false);
    setContent('');
    setMediaUrl('');
    setUploadedImage(null);
    setStatusType('text');
  };

  // Filter active status updates (not expired)
  const activeStatuses = statusUpdates.filter((status) => {
    const expiresAt = new Date(status.expiresAt);
    return expiresAt > new Date();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cool-900">Status Updates</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Status
        </button>
      </div>

      <p className="text-sm text-cool-500">
        Status updates appear as WhatsApp-style stories at the top of the Daily Feed. 
        They automatically expire after 24 hours.
      </p>

      {/* Add Status Form */}
      {isAdding && (
        <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-200">
          <h3 className="font-semibold text-cool-900 mb-4">Create New Status</h3>
          
          {/* Type Selection */}
          <div className="flex gap-2 mb-4">
            {(['text', 'image', 'video'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setStatusType(type)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium capitalize transition-colors',
                  statusType === type
                    ? 'bg-srhr text-white'
                    : 'bg-cool-100 text-cool-600 hover:bg-cool-200'
                )}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Content Input */}
          <div className="space-y-4">
            <textarea
              placeholder="What's new? (caption or text content)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
              rows={3}
            />

            {/* Image Upload */}
            {statusType === 'image' && (
              <div>
                <label className="block text-sm font-medium text-cool-700 mb-2">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-cool-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-srhr/10 file:text-srhr hover:file:bg-srhr/20"
                />
                {uploadedImage && (
                  <div className="mt-3 relative">
                    <img
                      src={uploadedImage}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setMediaUrl('');
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Video URL */}
            {statusType === 'video' && (
              <div>
                <label className="block text-sm font-medium text-cool-700 mb-2">
                  Video URL
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or video URL"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="px-4 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors disabled:opacity-50"
            >
              Post Status
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setContent('');
                setMediaUrl('');
                setUploadedImage(null);
              }}
              className="px-4 py-2 border border-cool-200 text-cool-600 rounded-lg font-medium hover:bg-cool-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeStatuses.map((status) => {
          const hoursLeft = Math.ceil(
            (new Date(status.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)
          );

          return (
            <div
              key={status.id}
              className="bg-white rounded-xl p-4 shadow-soft border border-cool-100 overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    status.type === 'image' ? 'bg-srhr' :
                    status.type === 'video' ? 'bg-srhr-dark' : 'bg-cool-500'
                  )} />
                  <span className="text-xs font-medium uppercase text-cool-500">
                    {status.type}
                  </span>
                </div>
                <button
                  onClick={() => onDelete(status.id)}
                  className="p-1.5 text-cool-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Media Preview */}
              {status.mediaUrl && status.type === 'image' && (
                <img
                  src={status.mediaUrl}
                  alt="Status"
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
              )}

              {/* Content */}
              <p className="text-sm text-cool-700 line-clamp-3 mb-3">
                {status.content}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-cool-400">
                <span>{new Date(status.timestamp).toLocaleDateString()}</span>
                <span className={cn(
                  'px-2 py-1 rounded-full',
                  hoursLeft <= 4 ? 'bg-red-100 text-red-600' : 'bg-cool-100 text-cool-600'
                )}>
                  {hoursLeft}h left
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activeStatuses.length === 0 && (
        <div className="text-center py-12 bg-cool-50 rounded-xl">
          <Smartphone className="w-12 h-12 text-cool-300 mx-auto mb-4" />
          <p className="text-cool-500">No active status updates</p>
          <p className="text-sm text-cool-400 mt-1">
            Create status updates to engage users with WhatsApp-style stories
          </p>
        </div>
      )}
    </div>
  );
}

// SRHR Content Tab Component
function SRHRContentTab({
  topics,
  articles,
  onAddTopic,
  onDeleteTopic,
  onAddArticle,
  onUpdateArticle,
  onDeleteArticle,
}: {
  topics: Topic[];
  articles: Article[];
  onAddTopic: (topic: Omit<Topic, 'id' | 'createdAt'>) => Promise<Topic>;
  onDeleteTopic: (id: string) => Promise<void>;
  onAddArticle: (article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Article>;
  onUpdateArticle: (id: string, updates: Partial<Article>) => Promise<void>;
  onDeleteArticle: (id: string) => Promise<void>;
}) {
  const [activeSection, setActiveSection] = useState<'topics' | 'articles'>('topics');
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [isAddingArticle, setIsAddingArticle] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  
  const [topicForm, setTopicForm] = useState({
    name: '',
    nameKinyarwanda: '',
    nameFrench: '',
    nameSwahili: '',
  });
  
  const [articleForm, setArticleForm] = useState({
    topicId: '',
    title: '',
    titleKinyarwanda: '',
    titleFrench: '',
    titleSwahili: '',
    content: '',
    contentKinyarwanda: '',
    contentFrench: '',
    contentSwahili: '',
    images: [] as string[],
    videos: [] as string[],
  });

  const handleAddTopic = () => {
    if (!topicForm.name) return;
    onAddTopic(topicForm);
    setTopicForm({ name: '', nameKinyarwanda: '', nameFrench: '', nameSwahili: '' });
    setIsAddingTopic(false);
  };

  const handleAddArticle = () => {
    if (!articleForm.title || !articleForm.topicId) return;
    onAddArticle({
      ...articleForm,
      images: articleForm.images,
      videos: articleForm.videos,
    });
    setArticleForm({
      topicId: '',
      title: '',
      titleKinyarwanda: '',
      titleFrench: '',
      titleSwahili: '',
      content: '',
      contentKinyarwanda: '',
      contentFrench: '',
      contentSwahili: '',
      images: [],
      videos: [],
    });
    setIsAddingArticle(false);
  };

  const handleUpdateArticle = () => {
    if (!editingArticleId) return;
    onUpdateArticle(editingArticleId, articleForm);
    setEditingArticleId(null);
    setArticleForm({
      topicId: '',
      title: '',
      titleKinyarwanda: '',
      titleFrench: '',
      titleSwahili: '',
      content: '',
      contentKinyarwanda: '',
      contentFrench: '',
      contentSwahili: '',
      images: [],
      videos: [],
    });
  };

  const startEditArticle = (article: Article) => {
    setEditingArticleId(article.id);
    setArticleForm({
      topicId: article.topicId,
      title: article.title,
      titleKinyarwanda: article.titleKinyarwanda || '',
      titleFrench: article.titleFrench || '',
      titleSwahili: article.titleSwahili || '',
      content: article.content,
      contentKinyarwanda: article.contentKinyarwanda || '',
      contentFrench: article.contentFrench || '',
      contentSwahili: article.contentSwahili || '',
      images: article.images,
      videos: article.videos,
    });
  };

  const filteredArticles = selectedTopicId 
    ? articles.filter(a => a.topicId === selectedTopicId)
    : articles;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cool-900">SRHR Content Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('topics')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeSection === 'topics'
                ? 'bg-srhr text-white'
                : 'bg-cool-100 text-cool-600 hover:bg-cool-200'
            )}
          >
            Topics ({topics.length})
          </button>
          <button
            onClick={() => setActiveSection('articles')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeSection === 'articles'
                ? 'bg-srhr text-white'
                : 'bg-cool-100 text-cool-600 hover:bg-cool-200'
            )}
          >
            Articles ({articles.length})
          </button>
        </div>
      </div>

      {/* Topics Section */}
      {activeSection === 'topics' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-cool-900">Topics</h3>
            <button
              onClick={() => setIsAddingTopic(true)}
              className="flex items-center gap-2 px-4 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Topic
            </button>
          </div>

          {/* Add Topic Form */}
          {isAddingTopic && (
            <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-200">
              <h4 className="font-semibold text-cool-900 mb-4">Add New Topic</h4>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Topic Name (English) *"
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                  className="col-span-2 px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                />
                <input
                  type="text"
                  placeholder="Kinyarwanda"
                  value={topicForm.nameKinyarwanda}
                  onChange={(e) => setTopicForm({ ...topicForm, nameKinyarwanda: e.target.value })}
                  className="px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                />
                <input
                  type="text"
                  placeholder="French"
                  value={topicForm.nameFrench}
                  onChange={(e) => setTopicForm({ ...topicForm, nameFrench: e.target.value })}
                  className="px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                />
                <input
                  type="text"
                  placeholder="Swahili"
                  value={topicForm.nameSwahili}
                  onChange={(e) => setTopicForm({ ...topicForm, nameSwahili: e.target.value })}
                  className="px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddTopic}
                  className="px-4 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors"
                >
                  Add Topic
                </button>
                <button
                  onClick={() => setIsAddingTopic(false)}
                  className="px-4 py-2 border border-cool-200 text-cool-600 rounded-lg font-medium hover:bg-cool-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Topics List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <div key={topic.id} className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-cool-900">{topic.name}</h4>
                    <p className="text-xs text-cool-500">
                      {articles.filter(a => a.topicId === topic.id).length} articles
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteTopic(topic.id)}
                    className="p-1.5 text-cool-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 text-xs text-cool-400">
                  {topic.nameKinyarwanda && <span className="mr-2">RW: {topic.nameKinyarwanda}</span>}
                  {topic.nameFrench && <span className="mr-2">FR: {topic.nameFrench}</span>}
                  {topic.nameSwahili && <span>SW: {topic.nameSwahili}</span>}
                </div>
              </div>
            ))}
            {topics.length === 0 && (
              <div className="col-span-full text-center py-8 text-cool-500">
                No topics yet. Create your first topic to organize SRHR content.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Articles Section */}
      {activeSection === 'articles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-cool-900">Articles</h3>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="px-3 py-1 border border-cool-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-srhr"
              >
                <option value="">All Topics</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIsAddingArticle(true)}
              disabled={topics.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Article
            </button>
          </div>

          {/* Add/Edit Article Form */}
          {(isAddingArticle || editingArticleId) && (
            <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-200">
              <h4 className="font-semibold text-cool-900 mb-4">
                {editingArticleId ? 'Edit Article' : 'Add New Article'}
              </h4>
              <div className="space-y-4">
                <select
                  value={articleForm.topicId}
                  onChange={(e) => setArticleForm({ ...articleForm, topicId: e.target.value })}
                  className="w-full px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                  disabled={!!editingArticleId}
                >
                  <option value="">Select Topic *</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
                
                <input
                  type="text"
                  placeholder="Title (English) *"
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                />
                
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Title (Kinyarwanda)"
                    value={articleForm.titleKinyarwanda}
                    onChange={(e) => setArticleForm({ ...articleForm, titleKinyarwanda: e.target.value })}
                    className="px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                  />
                  <input
                    type="text"
                    placeholder="Title (French)"
                    value={articleForm.titleFrench}
                    onChange={(e) => setArticleForm({ ...articleForm, titleFrench: e.target.value })}
                    className="px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                  />
                  <input
                    type="text"
                    placeholder="Title (Swahili)"
                    value={articleForm.titleSwahili}
                    onChange={(e) => setArticleForm({ ...articleForm, titleSwahili: e.target.value })}
                    className="px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-cool-700">Content (English) *</label>
                  <RichTextEditor
                    value={articleForm.content}
                    onChange={(value) => setArticleForm({ ...articleForm, content: value })}
                    placeholder="Write your article content here. Use the toolbar to format text like in Microsoft Word..."
                    minHeight="250px"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-cool-700">Content (Kinyarwanda)</label>
                    <RichTextEditor
                      value={articleForm.contentKinyarwanda}
                      onChange={(value) => setArticleForm({ ...articleForm, contentKinyarwanda: value })}
                      placeholder="Andika inyandiko yawe hano..."
                      minHeight="200px"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-cool-700">Content (French)</label>
                    <RichTextEditor
                      value={articleForm.contentFrench}
                      onChange={(value) => setArticleForm({ ...articleForm, contentFrench: value })}
                      placeholder="Écrivez votre contenu ici..."
                      minHeight="200px"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-cool-700">Content (Swahili)</label>
                    <RichTextEditor
                      value={articleForm.contentSwahili}
                      onChange={(value) => setArticleForm({ ...articleForm, contentSwahili: value })}
                      placeholder="Andika maudhui yako hapa..."
                      minHeight="200px"
                    />
                  </div>
                </div>

                {/* Media Upload Section */}
                <div className="border-t border-cool-200 pt-4 mt-4">
                  <h5 className="font-medium text-cool-700 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Images & Videos
                  </h5>
                  
                  {/* Image Upload */}
                  <div className="mb-4">
                    <label className="block text-sm text-cool-600 mb-2">Upload Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files) return;
                        const newImages: string[] = [];
                        for (let i = 0; i < files.length; i++) {
                          const validation = validateFileSize(files[i]);
                          if (!validation.valid) {
                            alert(validation.message);
                            continue;
                          }
                          try {
                            const base64 = await fileToBase64(files[i]);
                            newImages.push(base64);
                          } catch (error) {
                            alert('Failed to upload image: ' + files[i].name);
                          }
                        }
                        setArticleForm({ ...articleForm, images: [...articleForm.images, ...newImages] });
                      }}
                      className="block w-full text-sm text-cool-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-srhr/10 file:text-srhr hover:file:bg-srhr/20"
                    />
                    
                    {/* Image Preview */}
                    {articleForm.images.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {articleForm.images.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                            <button
                              onClick={() => {
                                const newImages = articleForm.images.filter((_, i) => i !== idx);
                                setArticleForm({ ...articleForm, images: newImages });
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Video URLs */}
                  <div>
                    <label className="block text-sm text-cool-600 mb-2">Video URLs (YouTube, etc.)</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        className="flex-1 px-4 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            if (input.value) {
                              setArticleForm({ ...articleForm, videos: [...articleForm.videos, input.value] });
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const input = document.querySelector('input[placeholder="https://youtube.com/watch?v=..."]') as HTMLInputElement;
                          if (input && input.value) {
                            setArticleForm({ ...articleForm, videos: [...articleForm.videos, input.value] });
                            input.value = '';
                          }
                        }}
                        className="px-4 py-2 bg-cool-100 text-cool-600 rounded-lg hover:bg-cool-200 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    
                    {/* Video List */}
                    {articleForm.videos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {articleForm.videos.map((video, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-cool-100 px-3 py-1 rounded-full text-sm">
                            <Video className="w-3 h-3 text-cool-500" />
                            <span className="truncate max-w-[200px]">{video}</span>
                            <button
                              onClick={() => {
                                const newVideos = articleForm.videos.filter((_, i) => i !== idx);
                                setArticleForm({ ...articleForm, videos: newVideos });
                              }}
                              className="text-cool-400 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={editingArticleId ? handleUpdateArticle : handleAddArticle}
                  className="px-4 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors"
                >
                  {editingArticleId ? 'Save Changes' : 'Add Article'}
                </button>
                <button
                  onClick={() => {
                    setIsAddingArticle(false);
                    setEditingArticleId(null);
                    setArticleForm({
                      topicId: '',
                      title: '',
                      titleKinyarwanda: '',
                      titleFrench: '',
                      titleSwahili: '',
                      content: '',
                      contentKinyarwanda: '',
                      contentFrench: '',
                      contentSwahili: '',
                      images: [],
                      videos: [],
                    });
                  }}
                  className="px-4 py-2 border border-cool-200 text-cool-600 rounded-lg font-medium hover:bg-cool-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Articles List */}
          <div className="space-y-3">
            {filteredArticles.map((article) => {
              const topic = topics.find(t => t.id === article.topicId);
              return (
                <div key={article.id} className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-srhr bg-srhr/10 px-2 py-0.5 rounded">
                          {topic?.name || 'Unknown Topic'}
                        </span>
                        <span className="text-xs text-cool-400">
                          {new Date(article.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-cool-900 truncate">{article.title}</h4>
                      <p className="text-sm text-cool-500 line-clamp-2 mt-1">{article.content.substring(0, 150)}...</p>
                      {(article.images.length > 0 || article.videos.length > 0) && (
                        <div className="flex items-center gap-3 mt-2">
                          {article.images.length > 0 && (
                            <span className="text-xs text-cool-400 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              {article.images.length} image{article.images.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {article.videos.length > 0 && (
                            <span className="text-xs text-cool-400 flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              {article.videos.length} video{article.videos.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-4">
                      <button
                        onClick={() => startEditArticle(article)}
                        className="p-2 text-cool-400 hover:text-srhr hover:bg-srhr/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteArticle(article.id)}
                        className="p-2 text-cool-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredArticles.length === 0 && (
              <div className="text-center py-8 text-cool-500">
                {selectedTopicId 
                  ? 'No articles in this topic yet.' 
                  : 'No articles yet. Create your first SRHR article.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// AI Avatars Grid Component
function AIAvatarsGrid({
  aiAvatars,
  onSetAIAvatar,
  showSuccess,
}: {
  aiAvatars: Record<AIType, string | null>;
  onSetAIAvatar: (aiType: AIType, avatar: string | null) => void;
  showSuccess?: (msg: string) => void;
}) {
  const aiTypes: AIType[] = ['ubuzima-admin', 'hekimo'];
  const aiNames: Record<AIType, string> = {
    'ubuzima-admin': 'RM Admin',
    'hekimo': 'Hekimo',
  };

  const [uploading, setUploading] = useState<Record<AIType, boolean>>({
    'ubuzima-admin': false,
    'hekimo': false,
  });

  const handleCustomUpload = async (aiType: AIType, file: File) => {
    // Set uploading state
    setUploading(prev => ({ ...prev, [aiType]: true }));

    try {
      // Upload file directly to Firebase (no base64 conversion)
      const { uploadImage } = await import('../services/firebaseStorageService');
      const url = await uploadImage(file, 'avatars', `${aiType}_${Date.now()}`);
      await onSetAIAvatar(aiType, url);
      showSuccess?.(`${aiNames[aiType]} avatar uploaded successfully`);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(prev => ({ ...prev, [aiType]: false }));
    }
  };

  const regenerateAvatar = (aiType: AIType) => {
    // Generate a new random avatar with a timestamp-based seed
    const timestamp = Date.now();
    const seed = `${aiType}-${timestamp}`;
    const newAvatar = createSmartAvatar(seed);
    onSetAIAvatar(aiType, newAvatar);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {aiTypes.map((aiType) => (
        <div key={aiType} className="text-center">
          <p className="text-sm font-medium text-cool-700 mb-2 truncate">{aiNames[aiType]}</p>
          <div className="relative group">
            {aiAvatars[aiType] ? (
              <img
                src={aiAvatars[aiType]!}
                alt={aiNames[aiType]}
                className="w-20 h-20 rounded-full object-cover mx-auto ring-2 ring-cool-200 bg-cool-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-srhr flex items-center justify-center text-white text-xl font-bold mx-auto">
                {aiNames[aiType].charAt(0)}
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <button
              onClick={() => regenerateAvatar(aiType)}
              disabled={uploading[aiType]}
              className="text-xs text-srhr hover:text-srhr-dark font-medium disabled:opacity-50"
            >
              {uploading[aiType] ? 'Uploading...' : 'New Avatar'}
            </button>
            <label className="inline-block">
              <input
                type="file"
                accept="image/*"
                disabled={uploading[aiType]}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  handleCustomUpload(aiType, file);
                }}
                className="hidden"
              />
              <span className={`text-xs ${uploading[aiType] ? 'text-cool-300 cursor-not-allowed' : 'text-cool-500 hover:text-cool-700 cursor-pointer'}`}>
                {uploading[aiType] ? 'Uploading...' : 'Upload Custom'}
              </span>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

// Organizations Tab Component
function OrganizationsTab({
  organizations,
  onAdd,
  onUpdate,
  onDelete,
}: {
  organizations: Organization[];
  onAdd: (org: Omit<Organization, 'id' | 'createdAt'>) => Promise<Organization | null>;
  onUpdate: (id: string, updates: Partial<Organization>) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    logo: '',
    category: 'ngo' as Organization['category'],
  });

  const categories = [
    { key: 'government', label: 'Government', color: 'bg-blue-100 text-blue-700' },
    { key: 'ngo', label: 'NGO', color: 'bg-green-100 text-green-700' },
    { key: 'international', label: 'International', color: 'bg-purple-100 text-purple-700' },
    { key: 'youth', label: 'Youth-Focused', color: 'bg-amber-100 text-amber-700' },
    { key: 'women', label: "Women's Health", color: 'bg-pink-100 text-pink-700' },
  ];

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileSize(file);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, logo: base64 });
    } catch (error) {
      alert('Failed to upload logo');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.website) return;

    if (editingId) {
      onUpdate(editingId, formData);
    } else {
      onAdd(formData);
    }

    setFormData({ name: '', description: '', website: '', logo: '', category: 'ngo' });
    setIsAdding(false);
    setEditingId(null);
  };

  const startEdit = (org: Organization) => {
    setFormData({
      name: org.name,
      description: org.description,
      website: org.website,
      logo: org.logo,
      category: org.category,
    });
    setEditingId(org.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cool-900">Organizations</h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: '', description: '', website: '', logo: '', category: 'ngo' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Organization
        </button>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-200">
          <h3 className="font-semibold text-cool-900 mb-4">
            {editingId ? 'Edit Organization' : 'Add New Organization'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cool-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-cool-200 rounded-lg focus:ring-2 focus:ring-srhr focus:border-transparent"
                  placeholder="Organization name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-700 mb-1">Website *</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2 border border-cool-200 rounded-lg focus:ring-2 focus:ring-srhr focus:border-transparent"
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cool-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Organization['category'] })}
                className="w-full px-4 py-2 border border-cool-200 rounded-lg focus:ring-2 focus:ring-srhr focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-cool-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-cool-200 rounded-lg focus:ring-2 focus:ring-srhr focus:border-transparent"
                rows={3}
                placeholder="Brief description of the organization"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cool-700 mb-1">Logo</label>
              <div className="flex items-center gap-4">
                {formData.logo ? (
                  <img src={formData.logo} alt="Preview" className="w-16 h-16 object-contain rounded-lg border border-cool-200" />
                ) : (
                  <div className="w-16 h-16 bg-cool-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-cool-400" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <span className="px-4 py-2 bg-cool-100 text-cool-700 rounded-lg hover:bg-cool-200 transition-colors text-sm font-medium">
                    {formData.logo ? 'Change Logo' : 'Upload Logo'}
                  </span>
                </label>
                {formData.logo && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logo: '' })}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setFormData({ name: '', description: '', website: '', logo: '', category: 'ngo' });
                }}
                className="px-4 py-2 border border-cool-200 text-cool-600 rounded-lg font-medium hover:bg-cool-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Organizations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {organizations.map((org) => {
          const category = categories.find((c) => c.key === org.category);
          return (
            <div key={org.id} className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
              <div className="flex items-start gap-4">
                {org.logo ? (
                  <img src={org.logo} alt={org.name} className="w-16 h-16 object-contain rounded-lg bg-white border border-cool-200" />
                ) : (
                  <div className="w-16 h-16 bg-cool-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-cool-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${category?.color || 'bg-cool-100 text-cool-700'}`}>
                      {category?.label || org.category}
                    </span>
                  </div>
                  <h4 className="font-semibold text-cool-900 truncate">{org.name}</h4>
                  <p className="text-sm text-cool-500 line-clamp-2 mt-1">{org.description}</p>
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-srhr hover:text-srhr-dark flex items-center gap-1 mt-2"
                  >
                    <Link2 className="w-3 h-3" />
                    {org.website}
                  </a>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(org)}
                    className="p-2 text-cool-400 hover:text-srhr hover:bg-srhr/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${org.name}?`)) {
                        onDelete(org.id);
                      }
                    }}
                    className="p-2 text-cool-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {organizations.length === 0 && !isAdding && (
        <div className="text-center py-12 bg-cool-50 rounded-xl border border-cool-200 border-dashed">
          <Building2 className="w-12 h-12 text-cool-300 mx-auto mb-3" />
          <p className="text-cool-500">No organizations yet.</p>
          <p className="text-cool-400 text-sm mt-1">Add organizations to display them on the homepage.</p>
        </div>
      )}
    </div>
  );
}

// Chat Management Tab Component
function ChatManagementTab({
  chatMessages,
  chatSettings,
  onUpdateSettings,
  onAddFacilitator,
  onRemoveFacilitator,
  onBanUser,
  onUnbanUser,
  onApproveFacilitatorRequest,
  onDenyFacilitatorRequest,
  showSuccess,
}: {
  chatMessages: ChatMessage[];
  chatSettings: ChatSettings | null;
  onUpdateSettings: (settings: Partial<ChatSettings>) => Promise<boolean>;
  onAddFacilitator: (facilitator: Omit<Facilitator, 'assignedAt'>) => Promise<boolean>;
  onRemoveFacilitator: (userId: string) => Promise<boolean>;
  onBanUser: (userId: string) => Promise<boolean>;
  onUnbanUser: (userId: string) => Promise<boolean>;
  onApproveFacilitatorRequest: (requestId: string, adminId: string, badges?: ('F' | 'S' | 'H' | 'L')[]) => Promise<boolean>;
  onDenyFacilitatorRequest: (requestId: string, adminId: string, reason?: string) => Promise<boolean>;
  showSuccess: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'requests' | 'facilitators' | 'banned'>('overview');
  const [newFacilitatorId, setNewFacilitatorId] = useState('');
  const [newFacilitatorName, setNewFacilitatorName] = useState('');
  const [groupName, setGroupName] = useState(chatSettings?.groupName || 'RM Ubuzima Community Chat');
  const [groupDescription, setGroupDescription] = useState(chatSettings?.groupDescription || '');

  const facilitators = chatSettings?.facilitators || [];
  const bannedUsers = chatSettings?.bannedUsers || [];

  const handleAddFacilitator = async () => {
    if (!newFacilitatorId.trim() || !newFacilitatorName.trim()) return;
    
    const success = await onAddFacilitator({
      userId: newFacilitatorId.trim(),
      userName: newFacilitatorName.trim(),
      userAvatar: '',
      assignedBy: 'admin',
      canDeleteMessages: true,
      canBanUsers: true,
      canSendAnnouncements: true,
      canPostDailyFeed: true,
      canPostNewsFeed: true,
      canPostStatus: true,
      canManageSRHR: true,
      canManageEmergency: true,
      role: 'Facilitator',
    });

    if (success) {
      showSuccess('Facilitator added successfully with full permissions');
      setNewFacilitatorId('');
      setNewFacilitatorName('');
    } else {
      alert('Failed to add facilitator. User may already be a facilitator.');
    }
  };

  const handleUpdateSettings = async () => {
    const success = await onUpdateSettings({
      groupName,
      groupDescription,
    });
    if (success) {
      showSuccess('Settings updated successfully');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cool-900">Chat Management</h2>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-cool-200">
        {[
          { key: 'overview', label: 'Overview', icon: MessageSquare },
          { key: 'requests', label: 'Requests', icon: FileText },
          { key: 'facilitators', label: 'Facilitators', icon: UserCheck },
          { key: 'banned', label: 'Banned Users', icon: Ban },
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

      {/* Overview Tab */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-cool-900">{chatMessages.length}</p>
              <p className="text-sm text-cool-500">Total Messages</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-cool-900">{facilitators.length}</p>
              <p className="text-sm text-cool-500">Facilitators</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-cool-900">{bannedUsers.length}</p>
              <p className="text-sm text-cool-500">Banned Users</p>
            </div>
          </div>

          {/* Group Settings */}
          <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
            <h3 className="font-semibold text-cool-900 mb-4">Group Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cool-700 mb-1">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2 bg-cool-50 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cool-700 mb-1">Description</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-cool-50 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                />
              </div>
              <button
                onClick={handleUpdateSettings}
                className="px-4 py-2 bg-srhr text-white rounded-lg font-medium hover:bg-srhr-dark transition-colors"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save Settings
              </button>
            </div>
          </div>

          {/* Recent Messages */}
          <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
            <h3 className="font-semibold text-cool-900 mb-4">Recent Messages</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chatMessages.slice(-10).reverse().map((msg) => (
                <div key={msg.id} className="p-3 bg-cool-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-cool-900">{msg.userName}</span>
                    <span className="text-xs text-cool-400">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                    {msg.isDeleted && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Deleted</span>
                    )}
                  </div>
                  <p className="text-cool-600 line-clamp-2">{msg.content}</p>
                </div>
              ))}
              {chatMessages.length === 0 && (
                <p className="text-cool-500 text-center py-4">No messages yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {activeSubTab === 'requests' && (
        <ChatRequestsTab
          chatSettings={chatSettings}
          onApproveRequest={onApproveFacilitatorRequest}
          onDenyRequest={onDenyFacilitatorRequest}
          showSuccess={showSuccess}
        />
      )}

      {/* Facilitators Tab */}
      {activeSubTab === 'facilitators' && (
        <div className="space-y-6">
          {/* Facilitators List */}
          <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
            <h3 className="font-semibold text-cool-900 mb-4">Current Facilitators</h3>
            <p className="text-sm text-cool-500 mb-4">
              Facilitators are added through the Requests tab when users apply. You can only remove facilitators from this list.
            </p>
            <div className="space-y-2">
              {facilitators.map((facilitator) => (
                <div
                  key={facilitator.userId}
                  className="flex items-center justify-between p-3 bg-cool-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-cool-900">{facilitator.userName}</p>
                        {/* Badge Display */}
                        {facilitator.badges?.includes('F') && (
                          <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded font-bold">F</span>
                        )}
                        {facilitator.badges?.includes('S') && (
                          <span className="px-1.5 py-0.5 bg-red-700 text-white text-xs rounded font-bold" title="Shangazi (Big Sister)">S</span>
                        )}
                        {facilitator.badges?.includes('H') && (
                          <span title="Healthcare Provider">
                            <Stethoscope className="w-4 h-4 text-green-600" />
                          </span>
                        )}
                        {facilitator.badges?.includes('L') && (
                          <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-xs rounded font-bold" title="Legal Advisor">L</span>
                        )}
                      </div>
                      <p className="text-xs text-cool-500">ID: {facilitator.userId}</p>
                      {facilitator.isBigSister && (
                        <p className="text-xs text-red-600 mt-0.5">Shangazi (Girls Room Access)</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm(`Remove ${facilitator.userName} as facilitator?`)) {
                        await onRemoveFacilitator(facilitator.userId);
                        showSuccess('Facilitator removed');
                      }
                    }}
                    className="p-2 text-cool-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {facilitators.length === 0 && (
                <p className="text-cool-500 text-center py-4">No facilitators yet. Approve requests to add facilitators.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banned Users Tab */}
      {activeSubTab === 'banned' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
            <h3 className="font-semibold text-cool-900 mb-4">Banned Users</h3>
            <div className="space-y-2">
              {bannedUsers.map((userId) => (
                <div
                  key={userId}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <Ban className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-cool-900">User ID</p>
                      <p className="text-xs text-cool-500 font-mono">{userId}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm('Unban this user?')) {
                        await onUnbanUser(userId);
                        showSuccess('User unbanned');
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Unban
                  </button>
                </div>
              ))}
              {bannedUsers.length === 0 && (
                <p className="text-cool-500 text-center py-4">No banned users</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Chat Requests Tab Component
function ChatRequestsTab({
  chatSettings,
  onApproveRequest,
  onDenyRequest,
  showSuccess,
}: {
  chatSettings: ChatSettings | null;
  onApproveRequest: (requestId: string, adminId: string, badges?: ('F' | 'S' | 'H' | 'L')[]) => Promise<boolean>;
  onDenyRequest: (requestId: string, adminId: string, reason?: string) => Promise<boolean>;
  showSuccess: (msg: string) => void;
}) {
  const [denyingRequestId, setDenyingRequestId] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState('');
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [selectedBadges, setSelectedBadges] = useState<('F' | 'S' | 'H' | 'L')[]>(['F']);

  const pendingRequests = chatSettings?.facilitatorRequests?.filter(r => r.status === 'pending') || [];
  const approvedRequests = chatSettings?.facilitatorRequests?.filter(r => r.status === 'approved') || [];
  const deniedRequests = chatSettings?.facilitatorRequests?.filter(r => r.status === 'denied') || [];

  const handleApprove = async (requestId: string) => {
    const success = await onApproveRequest(requestId, 'admin', selectedBadges);
    if (success) {
      setApprovingRequestId(null);
      setSelectedBadges(['F']);
      showSuccess('Request approved. User is now a facilitator.');
    }
  };

  const toggleBadge = (badge: 'F' | 'S' | 'H' | 'L') => {
    setSelectedBadges(prev => {
      // F badge cannot be removed (must always be a facilitator)
      if (badge === 'F') return prev;
      
      if (prev.includes(badge)) {
        return prev.filter(b => b !== badge);
      } else {
        return [...prev, badge];
      }
    });
  };

  const handleDeny = async (requestId: string) => {
    if (!denialReason.trim()) return;
    const success = await onDenyRequest(requestId, 'admin', denialReason);
    if (success) {
      setDenyingRequestId(null);
      setDenialReason('');
      showSuccess('Request denied');
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
        <h3 className="font-semibold text-cool-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500" />
          Pending Requests ({pendingRequests.length})
        </h3>
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-cool-900">{request.userName}</p>
                    <p className="text-xs text-cool-500">ID: {request.userId}</p>
                    <p className="text-xs text-cool-400">
                      Requested {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                  Pending
                </span>
              </div>

              <div className="bg-white rounded-lg p-3 mb-4">
                <p className="text-sm text-cool-600">{request.reason}</p>
              </div>

              {approvingRequestId === request.id ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-cool-700 mb-2">Assign Badges:</p>
                    <div className="flex gap-3">
                      {/* F Badge - Facilitator (Always selected) */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 rounded-lg">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          F
                        </div>
                        <span className="text-sm text-blue-700">Facilitator</span>
                        <Check className="w-4 h-4 text-blue-600" />
                      </div>
                      
                      {/* S Badge - Shangazi (Big Sister) */}
                      <button
                        onClick={() => toggleBadge('S')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                          selectedBadges.includes('S')
                            ? 'bg-red-100 border-2 border-red-500'
                            : 'bg-slate-100 border-2 border-transparent hover:bg-slate-200'
                        )}
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          selectedBadges.includes('S') ? 'bg-red-700 text-white' : 'bg-slate-400 text-white'
                        )}>
                          S
                        </div>
                        <span className={cn(
                          'text-sm',
                          selectedBadges.includes('S') ? 'text-red-700 font-medium' : 'text-slate-600'
                        )}>Shangazi (Big Sister)</span>
                        {selectedBadges.includes('S') && <Check className="w-4 h-4 text-red-600" />}
                      </button>
                      
                      {/* H Badge - Healthcare Provider */}
                      <button
                        onClick={() => toggleBadge('H')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                          selectedBadges.includes('H')
                            ? 'bg-green-100 border-2 border-green-600'
                            : 'bg-slate-100 border-2 border-transparent hover:bg-slate-200'
                        )}
                      >
                        <Stethoscope className={cn(
                          'w-5 h-5',
                          selectedBadges.includes('H') ? 'text-green-700' : 'text-slate-400'
                        )} />
                        <span className={cn(
                          'text-sm',
                          selectedBadges.includes('H') ? 'text-green-700 font-medium' : 'text-slate-600'
                        )}>Healthcare Provider</span>
                        {selectedBadges.includes('H') && <Check className="w-4 h-4 text-green-600" />}
                      </button>
                      
                      {/* L Badge - Legal Advisor */}
                      <button
                        onClick={() => toggleBadge('L')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                          selectedBadges.includes('L')
                            ? 'bg-indigo-100 border-2 border-indigo-500'
                            : 'bg-slate-100 border-2 border-transparent hover:bg-slate-200'
                        )}
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          selectedBadges.includes('L') ? 'bg-indigo-600 text-white' : 'bg-slate-400 text-white'
                        )}>
                          L
                        </div>
                        <span className={cn(
                          'text-sm',
                          selectedBadges.includes('L') ? 'text-indigo-700 font-medium' : 'text-slate-600'
                        )}>Legal Advisor</span>
                        {selectedBadges.includes('L') && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    </div>
                    <p className="text-xs text-cool-500 mt-2">
                      S = Can access Girls Room as Big Sister • H = Medical professional badge • L = Legal Advisor (Mpuza)
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setApprovingRequestId(null);
                        setSelectedBadges(['F']);
                      }}
                      className="px-4 py-2 border border-cool-200 text-cool-700 rounded-lg hover:bg-cool-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Confirm Approval
                    </button>
                  </div>
                </div>
              ) : denyingRequestId === request.id ? (
                <div className="space-y-3">
                  <textarea
                    value={denialReason}
                    onChange={(e) => setDenialReason(e.target.value)}
                    placeholder="Reason for denial (optional)"
                    rows={2}
                    className="w-full px-3 py-2 bg-cool-50 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDenyingRequestId(null)}
                      className="px-4 py-2 border border-cool-200 text-cool-700 rounded-lg hover:bg-cool-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeny(request.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4 inline mr-2" />
                      Confirm Denial
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setApprovingRequestId(request.id);
                      setSelectedBadges(['F']); // Reset to default
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setDenyingRequestId(request.id)}
                    className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Deny
                  </button>
                </div>
              )}
            </div>
          ))}
          {pendingRequests.length === 0 && (
            <p className="text-cool-500 text-center py-8 bg-cool-50 rounded-xl">
              No pending requests
            </p>
          )}
        </div>
      </div>

      {/* Approved Requests */}
      {approvedRequests.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
          <h3 className="font-semibold text-cool-900 mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            Approved Requests ({approvedRequests.length})
          </h3>
          <div className="space-y-2">
            {approvedRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-cool-900">{request.userName}</p>
                    <p className="text-xs text-cool-500">
                      Approved on {request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  Approved
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Denied Requests */}
      {deniedRequests.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
          <h3 className="font-semibold text-cool-900 mb-4 flex items-center gap-2">
            <X className="w-5 h-5 text-red-500" />
            Denied Requests ({deniedRequests.length})
          </h3>
          <div className="space-y-2">
            {deniedRequests.map((request) => (
              <div key={request.id} className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-cool-900">{request.userName}</p>
                      <p className="text-xs text-cool-500">
                        Denied on {request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                    Denied
                  </span>
                </div>
                {request.denialReason && (
                  <p className="text-sm text-cool-600 mt-2 pl-13">
                    Reason: {request.denialReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Legal Content Tab Component
function LegalContentTab({ showSuccess }: { showSuccess: (msg: string) => void }) {
  const { privacyContent, helpContent, setPrivacyContent, setHelpContent } = usePersistentStore();
  const [activeSubTab, setActiveSubTab] = useState<'privacy' | 'help'>('privacy');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  const handleSavePrivacySection = (sectionId: string) => {
    const updatedSections = privacyContent.sections.map(s =>
      s.id === sectionId ? { ...s, title: editForm.title, content: editForm.content } : s
    );
    setPrivacyContent({ sections: updatedSections });
    setEditingSection(null);
    showSuccess('Privacy section updated successfully');
  };

  const handleSaveHelpFAQ = (faqId: string) => {
    const updatedFAQs = helpContent.faqs.map(f =>
      f.id === faqId ? { ...f, question: editForm.title, answer: editForm.content } : f
    );
    setHelpContent({ faqs: updatedFAQs });
    setEditingSection(null);
    showSuccess('FAQ updated successfully');
  };

  const startEditing = (item: { title?: string; question?: string; content?: string; answer?: string }) => {
    setEditForm({
      title: item.title || item.question || '',
      content: item.content || item.answer || ''
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-cool-900">Legal Content Management</h2>
      
      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-cool-200 pb-2">
        <button
          onClick={() => setActiveSubTab('privacy')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            activeSubTab === 'privacy'
              ? 'bg-srhr text-white'
              : 'text-cool-600 hover:bg-cool-100'
          )}
        >
          Privacy Policy
        </button>
        <button
          onClick={() => setActiveSubTab('help')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            activeSubTab === 'help'
              ? 'bg-srhr text-white'
              : 'text-cool-600 hover:bg-cool-100'
          )}
        >
          Help Center
        </button>
      </div>

      {/* Privacy Policy Editor */}
      {activeSubTab === 'privacy' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Privacy Policy Editor</h3>
            <p className="text-sm text-blue-700">
              Edit the privacy policy sections that users see. Changes are saved automatically and will be reflected immediately on the Privacy Policy page.
            </p>
          </div>

          {/* Contact Email Setting */}
          <div className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
            <label className="block text-sm font-medium text-cool-700 mb-2">
              Privacy Contact Email
            </label>
            <input
              type="email"
              value={privacyContent.contactEmail}
              onChange={(e) => setPrivacyContent({ contactEmail: e.target.value })}
              className="w-full px-3 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
              placeholder="privacy@example.com"
            />
          </div>

          {/* Data Retention Setting */}
          <div className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
            <label className="block text-sm font-medium text-cool-700 mb-2">
              Data Retention (Days)
            </label>
            <input
              type="number"
              value={privacyContent.dataRetentionDays}
              onChange={(e) => setPrivacyContent({ dataRetentionDays: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
              min="1"
              max="365"
            />
          </div>

          {/* Sections List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-cool-900">Policy Sections</h3>
            {privacyContent.sections.map((section, index) => (
              <div key={section.id} className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
                {editingSection === section.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-cool-200 rounded-lg font-semibold"
                      placeholder="Section Title"
                    />
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      className="w-full px-3 py-2 border border-cool-200 rounded-lg min-h-[100px]"
                      placeholder="Section Content"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSavePrivacySection(section.id)}
                        className="px-4 py-2 bg-srhr text-white rounded-lg text-sm font-medium hover:bg-srhr-dark"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        className="px-4 py-2 bg-cool-100 text-cool-700 rounded-lg text-sm font-medium hover:bg-cool-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-srhr bg-srhr/10 px-2 py-1 rounded">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h4 className="font-semibold text-cool-900">{section.title}</h4>
                      </div>
                      <button
                        onClick={() => {
                          setEditingSection(section.id);
                          startEditing(section);
                        }}
                        className="p-2 hover:bg-cool-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-cool-500" />
                      </button>
                    </div>
                    <p className="text-sm text-cool-600 mt-2 line-clamp-2">{section.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Center Editor */}
      {activeSubTab === 'help' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <h3 className="font-semibold text-green-900 mb-2">Help Center Editor</h3>
            <p className="text-sm text-green-700">
              Edit the FAQs and guides that users see in the Help Center. Changes are saved automatically.
            </p>
          </div>

          {/* Contact Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
              <label className="block text-sm font-medium text-cool-700 mb-2">
                Support Email
              </label>
              <input
                type="email"
                value={helpContent.contactEmail}
                onChange={(e) => setHelpContent({ contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                placeholder="support@example.com"
              />
            </div>
            <div className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
              <label className="block text-sm font-medium text-cool-700 mb-2">
                Support Phone (Optional)
              </label>
              <input
                type="tel"
                value={helpContent.supportPhone || ''}
                onChange={(e) => setHelpContent({ supportPhone: e.target.value })}
                className="w-full px-3 py-2 border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                placeholder="+250 7XX XXX XXX"
              />
            </div>
          </div>

          {/* FAQs List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-cool-900">FAQs ({helpContent.faqs.length})</h3>
            {helpContent.faqs.map((faq, index) => (
              <div key={faq.id} className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
                {editingSection === faq.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-cool-200 rounded-lg font-semibold"
                      placeholder="Question"
                    />
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      className="w-full px-3 py-2 border border-cool-200 rounded-lg min-h-[100px]"
                      placeholder="Answer"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveHelpFAQ(faq.id)}
                        className="px-4 py-2 bg-srhr text-white rounded-lg text-sm font-medium hover:bg-srhr-dark"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        className="px-4 py-2 bg-cool-100 text-cool-700 rounded-lg text-sm font-medium hover:bg-cool-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'text-xs font-bold px-2 py-1 rounded',
                          faq.category === 'general' ? 'bg-blue-100 text-blue-700' :
                          faq.category === 'privacy' ? 'bg-green-100 text-green-700' :
                          faq.category === 'settings' ? 'bg-purple-100 text-purple-700' :
                          faq.category === 'services' ? 'bg-orange-100 text-orange-700' :
                          faq.category === 'ai' ? 'bg-cyan-100 text-cyan-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {faq.category}
                        </span>
                        <h4 className="font-semibold text-cool-900">{faq.question}</h4>
                      </div>
                      <button
                        onClick={() => {
                          setEditingSection(faq.id);
                          startEditing({ question: faq.question, answer: faq.answer });
                        }}
                        className="p-2 hover:bg-cool-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-cool-500" />
                      </button>
                    </div>
                    <p className="text-sm text-cool-600 mt-2 line-clamp-2">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Guides List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-cool-900">Guides ({helpContent.guides.length})</h3>
            {helpContent.guides.map((guide, index) => (
              <div key={guide.id} className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold text-srhr bg-srhr/10 px-2 py-1 rounded">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h4 className="font-semibold text-cool-900">{guide.title}</h4>
                </div>
                <p className="text-sm text-cool-600">{guide.description}</p>
                <div className="mt-3 space-y-1">
                  {guide.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-cool-600">
                      <span className="text-srhr font-bold">{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Landing Page Photos Tab Component - WhatsApp-style Instant Upload
function LandingPagePhotosTab({ showSuccess }: { showSuccess: (msg: string) => void }) {
  const [photos, setPhotos] = useState<LandingPagePhotos | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Track upload state for each slot: key -> UploadProgress
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});

  const sections = [
    { key: 'mainHero', label: 'Main Hero Slider', description: '4 photos for homepage main slider', count: 4 },
    { key: 'rmAdminAI', label: 'RM Admin AI', description: '3 photos for AI service card', count: 3 },
    { key: 'anonymousChat', label: 'Anonymous Chat', description: '3 photos for Chat service card', count: 3 },
    { key: 'bookDoctor', label: 'Book SRHR Provider', description: '3 photos for Doctor booking card', count: 3 },
    { key: 'girlsRoom', label: 'Girls Room', description: '3 photos for Girls Room card', count: 3 },
    { key: 'findServices', label: 'Find Services', description: '3 photos for Find Services card', count: 3 },
    { key: 'emergency', label: 'Emergency', description: '3 photos for Emergency card', count: 3 },
    { key: 'srhrLibrary', label: 'SRHR Library', description: '3 photos for Library card', count: 3 },
    { key: 'dailyFeeds', label: 'Daily SRHR Feeds', description: '3 photos for Daily Feeds card', count: 3 },
    { key: 'bazaMuganga', label: 'Baza Muganga', description: '3 photos for Baza Muganga card', count: 3 },
  ] as const;

  // Real-time subscription for instant updates
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToLandingPagePhotos((data) => {
      setPhotos(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // INSTANT UPLOAD - WhatsApp-style with immediate preview
  const handleUpload = async (section: keyof LandingPagePhotos, index: number, file: File) => {
    const slotKey = `${section}-${index}`;
    
    try {
      await uploadLandingPagePhotoInstant(
        section,
        index,
        file,
        (progress) => {
          setUploadProgress(prev => ({ ...prev, [slotKey]: progress }));
        }
      );
      showSuccess(`Photo ${index + 1} uploaded successfully!`);
    } catch (error) {
      alert('Upload failed. Please try again.');
    } finally {
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[slotKey];
          return newProgress;
        });
      }, 1000);
    }
  };

  const handleDelete = async (section: keyof LandingPagePhotos, index: number) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      await deleteLandingPagePhoto(section, index);
      showSuccess(`Photo deleted successfully!`);
    } catch (error) {
      alert('Failed to delete photo. Please try again.');
    }
  };

  const triggerFileInput = (section: keyof LandingPagePhotos, index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          alert('Please select an image file');
          return;
        }
        handleUpload(section, index, file);
      }
    };
    input.click();
  };

  // Get display URL for a slot (preview or actual)
  const getDisplayUrl = (section: string, index: number, storedUrl: string | null | undefined) => {
    const slotKey = `${section}-${index}`;
    const progress = uploadProgress[slotKey];
    if (progress && progress.status !== 'complete' && progress.status !== 'error') {
      return progress.previewUrl; // Show instant preview
    }
    return storedUrl || null;
  };

  // Check if slot is currently uploading
  const isUploading = (section: string, index: number) => {
    const slotKey = `${section}-${index}`;
    const progress = uploadProgress[slotKey];
    return progress && progress.status !== 'complete' && progress.status !== 'error';
  };

  // Get upload progress percentage
  const getProgressPercent = (section: string, index: number) => {
    const slotKey = `${section}-${index}`;
    return uploadProgress[slotKey]?.progress || 0;
  };

  // Get upload status text (local storage - no network upload)
  const getStatusText = (section: string, index: number) => {
    const slotKey = `${section}-${index}`;
    const status = uploadProgress[slotKey]?.status;
    const percent = Math.round(getProgressPercent(section, index));
    switch (status) {
      case 'processing': return percent < 100 ? `Processing ${percent}%` : 'Processing...';
      case 'complete': return 'Saved!';
      case 'error': return 'Failed!';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-srhr border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-cool-900">Landing Page Photos</h2>
          <p className="text-sm text-cool-500">Upload photos instantly. Shows immediate preview while uploading in background.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Real-time sync active
        </div>
      </div>

      <div className="grid gap-6">
        {sections.map(({ key, label, description, count }) => (
          <div key={key} className="bg-white rounded-xl p-6 shadow-soft border border-cool-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-cool-900">{label}</h3>
                <p className="text-xs text-cool-500">{description}</p>
              </div>
              <span className="text-xs bg-cool-100 text-cool-600 px-2 py-1 rounded-full">
                {photos?.[key]?.filter(p => p !== null).length || 0}/{count} photos
              </span>
            </div>

            <div className={`grid gap-3 ${count === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {Array.from({ length: count }).map((_, index) => {
                const storedUrl = photos?.[key]?.[index];
                const displayUrl = getDisplayUrl(key, index, storedUrl);
                const uploading = isUploading(key, index);
                const progress = getProgressPercent(key, index);
                const statusText = getStatusText(key, index);

                return (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div className="relative w-full">
                      {displayUrl ? (
                        <div className="relative group">
                          <img
                            src={displayUrl}
                            alt={`${label} ${index + 1}`}
                            className={`w-full aspect-video object-cover rounded-lg border border-cool-200 ${uploading ? 'opacity-70' : ''}`}
                          />
                          
                          {/* Upload Progress Overlay */}
                          {uploading && (
                            <div className="absolute inset-0 bg-black/40 rounded-lg flex flex-col items-center justify-center gap-2">
                              <div className="w-16 h-16 relative">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth="4"
                                  />
                                  <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={`${progress * 1.76} 176`}
                                    className="transition-all duration-300"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                                  {Math.round(progress)}%
                                </div>
                              </div>
                              <span className="text-white text-xs font-medium">{statusText}</span>
                            </div>
                          )}
                          
                          {/* Hover Actions - only when not uploading */}
                          {!uploading && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                              <button
                                onClick={() => triggerFileInput(key, index)}
                                className="p-2 bg-white rounded-full hover:bg-cool-50 transition-colors"
                                title="Replace"
                              >
                                <Edit2 className="w-4 h-4 text-cool-600" />
                              </button>
                              <button
                                onClick={() => handleDelete(key, index)}
                                className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => triggerFileInput(key, index)}
                          className="w-full aspect-video bg-cool-50 rounded-lg border-2 border-dashed border-cool-300 flex flex-col items-center justify-center gap-2 hover:bg-cool-100 hover:border-srhr transition-all active:scale-95"
                        >
                          <Plus className="w-6 h-6 text-cool-400" />
                          <span className="text-xs text-cool-400">Add Photo {index + 1}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-green-900">WhatsApp-Style Device Storage</h4>
            <ul className="text-sm text-green-700 mt-1 space-y-1">
              <li>• Photos stored on YOUR device only (like WhatsApp on your phone)</li>
              <li>• No cloud storage - instant save to your browser</li>
              <li>• Select photo → Instant preview → Compressed → Saved locally</li>
              <li>• Visitors see photos loaded from your device storage</li>
              <li>• Photos persist until you clear your browser data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Members Management Tab Component
function MembersManagementTab({
  users,
  getAllUsers,
  banUser,
  unbanUser,
  adminUpdateUserName,
  showSuccess,
}: {
  users: User[];
  getAllUsers: () => Promise<User[]>;
  banUser: (userId: string) => Promise<boolean>;
  unbanUser: (userId: string) => Promise<boolean>;
  adminUpdateUserName: (userId: string, newName: string) => Promise<boolean>;
  showSuccess: (msg: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Memoized load users function
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await getAllUsers();
    } catch (err) {
      console.error('[MembersManagementTab] Failed to load users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [getAllUsers]);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleBanUser = useCallback(async (userId: string) => {
    if (confirm('Are you sure you want to BAN this user? They will no longer be able to use the app.')) {
      try {
        const success = await banUser(userId);
        if (success) {
          showSuccess('User banned successfully');
          loadUsers();
        } else {
          setError('Failed to ban user. Please try again.');
        }
      } catch (err) {
        console.error('[MembersManagementTab] Error banning user:', err);
        setError('Failed to ban user. Please try again.');
      }
    }
  }, [banUser, loadUsers, showSuccess]);

  const handleUnbanUser = useCallback(async (userId: string) => {
    if (confirm('Unban this user? They will be able to use the app again.')) {
      try {
        const success = await unbanUser(userId);
        if (success) {
          showSuccess('User unbanned successfully');
          loadUsers();
        } else {
          setError('Failed to unban user. Please try again.');
        }
      } catch (err) {
        console.error('[MembersManagementTab] Error unbanning user:', err);
        setError('Failed to unban user. Please try again.');
      }
    }
  }, [unbanUser, loadUsers, showSuccess]);

  const handleEditName = useCallback((user: User) => {
    setEditingUser(user.id);
    setEditName(user.name);
  }, []);

  const handleSaveName = useCallback(async (userId: string) => {
    if (!editName.trim()) {
      setError('Name cannot be empty');
      return;
    }
    try {
      const success = await adminUpdateUserName(userId, editName.trim());
      if (success) {
        showSuccess('User name updated successfully');
        setEditingUser(null);
        setEditName('');
        loadUsers();
      } else {
        setError('Failed to update user name');
      }
    } catch (err) {
      console.error('[MembersManagementTab] Error updating user name:', err);
      setError('Failed to update user name');
    }
  }, [adminUpdateUserName, editName, loadUsers, showSuccess]);

  const handleCancelEdit = useCallback(() => {
    setEditingUser(null);
    setEditName('');
    setError(null);
  }, []);

  // Ensure users is an array (defensive programming)
  const safeUsers = Array.isArray(users) ? users : [];

  // Filter users based on search query
  const filteredUsers = safeUsers.filter(user => 
    user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user?.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate banned and active users
  const bannedUsers = filteredUsers.filter(u => u?.isBanned);
  const activeUsers = filteredUsers.filter(u => !u?.isBanned);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cool-900">Members Management</h2>
        <button
          onClick={loadUsers}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-srhr text-white rounded-lg hover:bg-srhr-dark transition-colors disabled:opacity-50"
        >
          <Users className="w-4 h-4" />
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search members by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 pl-10 bg-white border border-cool-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-srhr"
        />
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cool-400" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-cool-900">{safeUsers.length}</p>
          <p className="text-sm text-cool-500">Total Members</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-cool-900">{safeUsers.filter(u => !u?.isBanned).length}</p>
          <p className="text-sm text-cool-500">Active Members</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-soft border border-cool-100">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3">
            <Ban className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-cool-900">{safeUsers.filter(u => u?.isBanned).length}</p>
          <p className="text-sm text-cool-500">Banned Members</p>
        </div>
      </div>

      {/* Active Members */}
      <div className="bg-white rounded-xl shadow-soft border border-cool-200">
        <div className="p-4 border-b border-cool-200">
          <h3 className="font-semibold text-cool-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-600" />
            Active Members ({activeUsers.length})
          </h3>
        </div>
        <div className="divide-y divide-cool-100">
          {activeUsers.length === 0 ? (
            <p className="text-cool-500 text-center py-8">No active members found</p>
          ) : (
            activeUsers.map((user) => (
              <div key={user?.id || Math.random()} className="p-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-cool-100 flex-shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user?.name || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-srhr text-white font-bold">
                      {(user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  {editingUser === user?.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-cool-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-srhr"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName(user?.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveName(user?.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-cool-900 truncate">{user?.name || 'Unknown User'}</p>
                      <p className="text-xs text-cool-500 font-mono">ID: {(user?.id || 'unknown').slice(0, 8)}...</p>
                      {user?.isFacilitator && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          Facilitator
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {editingUser !== user?.id && (
                    <>
                      <button
                        onClick={() => user && handleEditName(user)}
                        className="p-2 text-cool-400 hover:text-srhr hover:bg-srhr/10 rounded-lg transition-colors"
                        title="Edit Name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => user?.id && handleBanUser(user.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Ban User"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Banned Members */}
      {bannedUsers.length > 0 && (
        <div className="bg-white rounded-xl shadow-soft border border-red-200">
          <div className="p-4 border-b border-red-200 bg-red-50">
            <h3 className="font-semibold text-red-900 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              Banned Members ({bannedUsers.length})
            </h3>
          </div>
          <div className="divide-y divide-cool-100">
            {bannedUsers.map((user) => (
              <div key={user?.id || Math.random()} className="p-4 flex items-center gap-4 bg-red-50/50">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-cool-100 flex-shrink-0 opacity-50">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user?.name || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-400 text-white font-bold">
                      {(user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-cool-900 truncate line-through opacity-60">{user?.name || 'Unknown User'}</p>
                  <p className="text-xs text-cool-500 font-mono">ID: {(user?.id || 'unknown').slice(0, 8)}...</p>
                  <p className="text-xs text-red-600 mt-1">
                    Banned {user?.bannedAt ? new Date(user.bannedAt).toLocaleDateString() : ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => user?.id && handleUnbanUser(user.id)}
                    className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Unban
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
