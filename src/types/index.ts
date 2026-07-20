export type Language = 'en' | 'rw' | 'fr' | 'sw';
export type AIType = 'ubuzima-admin' | 'hekimo';
export type PostLength = 'short' | 'medium' | 'long';
export type NotificationType = 'announcement' | 'reminder' | 'system' | 'event' | 'weekly_baza' | 'article' | 'appointment' | 'emergency' | 'info' | 'private_message' | 'welcome' | 'guidance';
export type NotificationPriority = 'low' | 'medium' | 'high';
export type NotificationSource = 'admin' | 'rm_admin_ai' | 'system';
export type NotificationCategory = 'notification' | 'announcement';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  createdAt: string;
  isAnonymous?: boolean;
  lastProfileEdit?: string; // ISO date string of last profile edit
  // Facilitator status - stored permanently in user document
  isFacilitator?: boolean;
  facilitatorAssignedAt?: string;
  facilitatorAssignedBy?: string;
  facilitatorRole?: string;
  facilitatorBadges?: ('F' | 'S' | 'H' | 'L' | 'G' | 'A' | 'P')[];
  facilitatorPermissions?: {
    canDeleteMessages: boolean;
    canBanUsers: boolean;
    canSendAnnouncements: boolean;
    canPostDailyFeed: boolean;
    canPostNewsFeed: boolean;
    canPostStatus: boolean;
    canManageSRHR: boolean;
    canManageEmergency: boolean;
  };
  // Ban status - if true, user cannot access the app
  isBanned?: boolean;
  bannedAt?: string;
  bannedBy?: string;
  banReason?: string;
}

export interface Session {
  user: User;
  startTime: string;
  isPersistent: boolean;
}

// Chat Types
export interface ChatUser {
  id: string;
  name: string;
  avatar: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  isDeleted: boolean;
  type?: 'text' | 'image' | 'system';
  isAI?: boolean;
  aiType?: AIType;
  isFacilitator?: boolean;
  facilitatorBadge?: string;
  reactions?: string[];
  replyTo?: {
    messageId: string;
    userName: string;
    content: string;
  };
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface ChatParticipant {
  userId: string;
  userName: string;
  userAvatar: string;
  joinedAt: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface FacilitatorRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  denialReason?: string;
}

export interface ChatSettings {
  groupName: string;
  groupDescription: string;
  pinnedAnnouncement?: string;
  facilitators: Facilitator[];
  facilitatorRequests: FacilitatorRequest[];
  bannedUsers: string[];
  isEnabled: boolean;
  facilitatorPassword: string;
}

export interface Facilitator {
  userId: string;
  userName: string;
  userAvatar: string;
  assignedBy: string;
  assignedAt: string;
  canDeleteMessages: boolean;
  canBanUsers: boolean;
  canSendAnnouncements: boolean;
  canPostDailyFeed: boolean;
  canPostNewsFeed: boolean;
  canPostStatus: boolean;
  canManageSRHR: boolean;
  canManageEmergency: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  bio?: string;
  role?: string;
  // Badge system
  badges?: ('F' | 'S' | 'H' | 'L' | 'G' | 'A' | 'P')[]; // F = Facilitator, S = Shangazi, H = Healthcare, L = Legal, G = GBV, A = Abortion, P = Family Planning
  isBigSister?: boolean;
  isHealthcareProvider?: boolean;
  isLegalAdvisor?: boolean;
  isGBVCounselor?: boolean;
  isAbortionAdvisor?: boolean; // Has 'A' badge - abortion support advisor
  isFamilyPlanningCounselor?: boolean; // Has 'P' badge - family planning counselor
}

export interface HealthcareProvider {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  specialty: string;
  licenseNumber?: string;
  isVerified: boolean;
  isAvailable: boolean;
  bio?: string;
  addedAt: string;
  addedBy: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  content: string;
  timestamp: string;
  isDeleted: boolean;
  isRead: boolean;
  type?: 'text' | 'image' | 'system';
}

export interface InboxConversation {
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  isFacilitator: boolean;
  context?: string;
}

export interface Mention {
  id: string;
  type: 'ai' | 'facilitator' | 'healthcare';
  name: string;
  userId?: string;
  aiType?: AIType;
  startIndex: number;
  endIndex: number;
}

export interface ChatTerms {
  id: string;
  title: string;
  content: string;
  version: string;
  effectiveDate: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface PinnedAnnouncement {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
  isActive: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface AIPost {
  id: string;
  aiType: AIType;
  content: string;
  contentKinyarwanda?: string;
  contentFrench?: string;
  contentSwahili?: string;
  timestamp: string;
  category: string;
  isActive: boolean;
  postLength: PostLength;
  views: number;
  createdBy?: string;
  createdByName?: string;
  createdByAvatar?: string;
  createdByBadge?: string;
  type?: 'text' | 'image' | 'video';
  mediaUrl?: string;
}

export interface StatusUpdate {
  id: string;
  type: 'image' | 'video' | 'text';
  content: string;
  mediaUrl?: string;
  timestamp: string;
  expiresAt: string;
  viewedBy: string[];
  createdBy?: string;
  createdByName?: string;
  createdByAvatar?: string;
  createdByBadge?: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  followingType: 'ai' | 'facilitator' | 'user';
  followingName: string;
  followingAvatar?: string;
  followingBadge?: string;
  followedAt: string;
}

export interface UserEngagement {
  userId: string;
  postId: string;
  aiType?: AIType;
  viewedAt: string;
  viewDuration?: number;
  liked?: boolean;
  shared?: boolean;
}

export interface CarouselPhoto {
  id: string;
  url: string;
  caption?: string;
  order: number;
}

export interface Topic {
  id: string;
  name: string;
  nameKinyarwanda?: string;
  nameFrench?: string;
  nameSwahili?: string;
  createdAt: string;
}

export interface Article {
  id: string;
  topicId: string;
  title: string;
  titleKinyarwanda?: string;
  titleFrench?: string;
  titleSwahili?: string;
  content: string;
  contentKinyarwanda?: string;
  contentFrench?: string;
  contentSwahili?: string;
  images: string[];
  videos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  descriptionKinyarwanda?: string;
  descriptionFrench?: string;
  descriptionSwahili?: string;
  logo: string;
  website: string;
  category: 'government' | 'ngo' | 'international' | 'youth' | 'women';
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  category: 'police' | 'ambulance' | 'fire' | 'suicide' | 'gbv' | 'youth' | 'other';
  description?: string;
  icon?: string;
}

export interface FacilityContact {
  id: string;
  label: string; // e.g., "Emergency", "Reception", "Doctor", "Pharmacy", "Admin"
  value: string; // phone number or email
  type: 'phone' | 'whatsapp' | 'email';
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
}

export interface Facility {
  id: string;
  name: string;
  type: 'hospital' | 'health_center' | 'pharmacy' | 'health_post' | 'private_clinic';
  latitude: number;
  longitude: number;
  address: string;
  phone?: string; // Legacy field - kept for backward compatibility
  contacts?: FacilityContact[]; // New: Array of verified contacts
  services: string[];
  hours?: string;
  googleMapsLink?: string;
}

export interface Appointment {
  id: string;
  userId?: string; // ID of the user who created the appointment (if logged in)
  userName?: string; // Name of the user who created the appointment
  name?: string;
  phone: string;
  email?: string;
  reason: string;
  preferredDate: string;
  preferredTime: 'morning' | 'afternoon' | 'evening';
  isAnonymous: boolean;
  referenceNumber: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  // Admin management fields
  adminNotes?: string;
  assignedDoctor?: string;
  doctorPhone?: string;
  appointmentTime?: string;
  feedbackToUser?: string;
  feedbackSentAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SystemSettings {
  platformLogo: string | null;
  aiAvatars: Record<AIType, string | null>;
  bookDoctorEmail: string;
  bazaMugangaLink: string;
  bazaMugangaTopic: string;
  groqApiKey: string;
  groqModel: 'llama-3.1-8b-instant' | 'llama-3.1-70b-versatile' | 'mixtral-8x7b-32768';
  primaryColor: string;
}

export interface AIConfig {
  enabled: boolean;
  schedule: string;
  lastGenerated: string | null;
}

export interface AdminState {
  password: string | null;
  isLoggedIn: boolean;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  fullContent?: string;
  type: NotificationType;
  priority: NotificationPriority;
  source: NotificationSource;
  category: NotificationCategory;
  createdAt: string;
  expiresAt?: string;
  isRead: boolean;
  readBy: string[];
  actionUrl?: string;
  actionLabel?: string;
  icon?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
  createdByName?: string;
  aiAvatar?: string;
  targetAudience?: 'all' | 'users' | 'facilitators' | 'admins' | 'specific_user';
  targetUserId?: string;
}

export interface RMAdminAIMessage {
  id: string;
  content: string;
  type: 'welcome' | 'guidance' | 'private_notification' | 'tip' | 'response';
  createdAt: string;
  duration: number;
  position: { x: number; y: number };
  isVisible: boolean;
  userId?: string;
  page?: string;
}

export interface UserNotificationPreference {
  userId: string;
  enabled: boolean;
  types: NotificationType[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// Group Types
export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdByName: string;
  createdByAvatar: string;
  createdAt: string;
  facilitators: GroupFacilitator[]; // Exactly 2 facilitators who are group admins
  members: GroupMember[];
  admins: GroupAdmin[]; // All admins including creator and facilitators
  isActive: boolean;
  status: 'pending' | 'approved' | 'denied';
  shareLink: string;
  profilePhoto?: string; // Optional group profile photo URL
  deniedReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  messageCount: number;
  lastActivity?: string;
  // Enhanced WhatsApp-inspired features
  visibility: 'public' | 'private'; // Public = searchable, Private = invite only
  permissions: GroupPermissions;
  rules?: string[]; // Group rules/guidelines
  inviteCode: string; // Unique invite code for link joins
  inviteLinkExpiresAt?: string; // Optional expiration for invite links
  settings: GroupSettings;
}

export interface GroupPermissions {
  canSendMessages: 'all' | 'admins_only'; // Who can send messages
  canEditGroupInfo: 'all_admins' | 'creator_only'; // Who can edit group info
  canAddMembers: 'admins' | 'creator_only'; // Who can add members directly
  requireApprovalToJoin: boolean; // Whether join requests need approval
}

export interface GroupSettings {
  allowMemberSearch: boolean; // Can members search other members
  showMemberList: boolean; // Show member list to non-members
  muteNotifications: boolean; // Group-level mute setting
}

export interface GroupAdmin {
  userId: string;
  userName: string;
  userAvatar: string;
  role: 'creator' | 'facilitator'; // creator = group creator, facilitator = assigned facilitator
  assignedAt: string;
}

export interface GroupFacilitator {
  userId: string;
  userName: string;
  userAvatar: string;
  assignedAt: string;
  isAdmin: boolean; // Facilitator with F badge is group admin
}

export interface GroupMember {
  userId: string;
  userName: string;
  userAvatar: string;
  joinedAt: string;
  isFacilitator: boolean;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  isDeleted: boolean;
  type: 'text' | 'image' | 'system';
  isFacilitator?: boolean;
  facilitatorBadge?: string;
  reactions?: string[];
  replyTo?: {
    messageId: string;
    userName: string;
    content: string;
  };
}

export interface GroupRequest {
  id: string;
  name: string;
  description: string;
  requestedBy: string;
  requestedByName: string;
  requestedByAvatar: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
  proposedFacilitators: GroupFacilitator[];
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  denialReason?: string;
}

// Group Join Request - for users requesting to join an existing group
export interface GroupJoinRequest {
  id: string;
  groupId: string;
  groupName: string;
  requestedBy: string;
  requestedByName: string;
  requestedByAvatar: string;
  requestedAt: string;
  reason: string; // Why the user wants to join
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  denialReason?: string;
  canRetryAfter?: string; // ISO date when user can request again (if denied)
  previousRequestId?: string; // Reference to previous request if this is a retry
  inviteCodeUsed?: string; // If joined via invite link
  addedBy?: string; // If added directly by admin (bypass request)
  addedByName?: string; // Name of admin who added user
}

// Group System Message - for join/leave/add notifications
export interface GroupSystemMessage {
  id: string;
  groupId: string;
  type: 'user_joined' | 'user_left' | 'user_added' | 'user_removed' | 'group_created' | 'rules_updated' | 'permissions_changed';
  userId?: string; // User who performed the action (if applicable)
  userName?: string;
  targetUserId?: string; // User who was affected (if applicable)
  targetUserName?: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

