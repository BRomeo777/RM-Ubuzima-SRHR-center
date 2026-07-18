import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  User, 
  Session, 
  AIPost, 
  Topic, 
  Article, 
  Organization, 
  EmergencyContact,
  Facility,
  Appointment,
  AIConfig,
  Language,
  AIType,
  StatusUpdate,
  CarouselPhoto,
  ChatMessage,
  ChatSettings,
  Facilitator,
  FacilitatorRequest,
  Follow,
  UserEngagement,
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationSource,
  NotificationCategory,
  RMAdminAIMessage
} from '../types';
import { generateId, getRandomAvatar, generateAnonymousName, generateReferenceNumber } from '../utils/helpers';
import { getDefaultAIAvatars } from '../utils/avatar';
import {
  addAIPost as addAIPostToFirebase,
  updateAIPost as updateAIPostToFirebase,
  deleteAIPost as deleteAIPostFromFirebase,
  addAppointment as addAppointmentToFirebase,
  updateAppointment as updateAppointmentToFirebase,
  deleteAppointment as deleteAppointmentFromFirebase,
  addOrganization as addOrganizationToFirebase,
  updateOrganization as updateOrganizationToFirebase,
  deleteOrganization as deleteOrganizationFromFirebase,
  addStatusUpdate as addStatusUpdateToFirebase,
  deleteStatusUpdate as deleteStatusUpdateFromFirebase,
  addEmergencyContact as addEmergencyContactToFirebase,
  updateEmergencyContact as updateEmergencyContactToFirebase,
  deleteEmergencyContact as deleteEmergencyContactFromFirebase,
  addFacility as addFacilityToFirebase,
  updateFacility as updateFacilityToFirebase,
  deleteFacility as deleteFacilityFromFirebase,
  // SRHR Topics and Articles
  addTopic as addTopicToFirebase,
  updateTopic as updateTopicToFirebase,
  deleteTopic as deleteTopicFromFirebase,
  subscribeToTopics,
  addArticle as addArticleToFirebase,
  updateArticle as updateArticleToFirebase,
  deleteArticle as deleteArticleFromFirebase,
  subscribeToArticles,
  subscribeToAIPosts,
  subscribeToAppointments,
  subscribeToOrganizations,
  subscribeToStatusUpdates,
  subscribeToEmergencyContacts,
  subscribeToFacilities,
  subscribeToSettings,
  updateSettings,
  // Facilitator status persistence
  saveFacilitatorStatusToUser,
  removeFacilitatorStatusFromUser
} from '../services/firebaseService';
import { uploadImage, deleteImageByUrl, isBase64Image, base64ToBlob } from '../services/firebaseStorageService';
import {
  subscribeToChatMessages,
  sendChatMessage as sendChatMessageToFirebase,
  deleteChatMessage as deleteChatMessageFromFirebase
} from '../services/chatService';

// Default admin password - permanent unless changed by admin
export const DEFAULT_ADMIN_PASSWORD = 'RM@Dr.R2026';

// Default facilitator password - common password for all facilitators
const DEFAULT_FACILITATOR_PASSWORD = 'FACILITATOR2026@ubuzima';

// ============== PERSISTENT STATE (localStorage) ==============

interface PersistentState {
  // Admin & System
  adminPassword: string | null;
  isAdminLoggedIn: boolean;
  
  // System Settings
  platformLogo: string | null;
  appEmail: string;
  aiAvatars: Record<AIType, string | null>;
  bookDoctorEmail: string;
  bazaMugangaLink: string;
  bazaMugangaTopic: string;
  groqApiKey: string;
  googleApiKey: string;
  groqModel: 'llama-3.1-8b-instant' | 'llama-3.3-70b-versatile' | 'mixtral-8x7b-32768';
  notificationsEnabled: boolean;
  darkModeEnabled: boolean;
  termsContent: string;
  privacyContent: PrivacyPolicyContent;
  helpContent: HelpCenterContent;
  
  // AI Feeds - PERMANENT until admin delete
  aiPosts: AIPost[];
  aiConfigs: Record<AIType, AIConfig>;
  
  // SRHR Content
  topics: Topic[];
  articles: Article[];
  
  // Organizations
  organizations: Organization[];
  
  // Emergency
  emergencyContacts: EmergencyContact[];
  
  // Facilities
  facilities: Facility[];
  
  // Appointments
  appointments: Appointment[];
  
  // User management
  users: User[];
  savedUser: User | null;
  
  // Authentication
  loginUser: (email: string, password: string) => User | null;
  registerUser: (user: Omit<User, 'id' | 'createdAt'>) => User | null;
  getUserByEmail: (email: string) => User | undefined;
  
  // Language
  language: Language;
  
  // AI Preferences
  enabledAIs: AIType[];

  // Social Features
  follows: Follow[];
  userEngagements: UserEngagement[];

  // User Activity Tracking
  userActivities: UserActivity[];
  lastMessageTimes: Record<string, number>; // userId_page -> timestamp

  // Notifications
  notifications: Notification[];
  lastNotificationCheck: string | null;

  // Content
  carouselPhotos: CarouselPhoto[];
  statusUpdates: StatusUpdate[];
  
  // Chat
  chatMessages: ChatMessage[];
  chatSettings: ChatSettings | null;
  
  // Actions
  // Chat Actions
  syncChatMessages: () => (() => void);
  sendChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'isDeleted'>) => Promise<ChatMessage | null>;
  deleteChatMessage: (messageId: string) => Promise<boolean>;
  updateChatSettings: (settings: Partial<ChatSettings>) => Promise<boolean>;
  addFacilitator: (facilitator: Omit<Facilitator, 'assignedAt'>) => Promise<boolean>;
  removeFacilitator: (userId: string) => Promise<boolean>;
  banUser: (userId: string) => Promise<boolean>;
  unbanUser: (userId: string) => Promise<boolean>;
  // Facilitator Request Actions
  requestFacilitator: (request: Omit<FacilitatorRequest, 'id' | 'requestedAt' | 'status'>) => Promise<boolean>;
  approveFacilitatorRequest: (requestId: string, adminId: string, badges?: ('F' | 'S' | 'H')[]) => Promise<boolean>;
  denyFacilitatorRequest: (requestId: string, adminId: string, reason?: string) => Promise<boolean>;
  isUserFacilitator: (userId: string, sessionUser?: User) => boolean;
  hasPendingFacilitatorRequest: (userId: string) => boolean;
  getFacilitator: (userId: string) => Facilitator | undefined;
  updateFacilitatorStatus: (userId: string, isOnline: boolean) => Promise<boolean>;
  // Badge system
  isUserBigSister: (userId: string) => boolean;
  isUserHealthcareProvider: (userId: string) => boolean;
  getBigSisters: () => Facilitator[];
  // Facilitator status management
  getActiveFacilitators: () => Facilitator[];
  cleanupStaleFacilitators: () => void;
  
  changeAdminPassword: (currentPassword: string, newPassword: string) => boolean;
  setAdminPassword: (password: string | null) => void;
  setAdminLoggedIn: (loggedIn: boolean) => void;
  loginAdmin: () => void;
  setPlatformLogo: (logo: string | null) => void;
  setAppEmail: (email: string) => void;
  setAiAvatars: (avatars: Record<AIType, string | null>) => void;
  setAIAvatar: (aiType: AIType, avatar: string | null) => void;
  setBookDoctorEmail: (email: string) => void;
  setBazaMugangaLink: (link: string) => void;
  setBazaMugangaTopic: (topic: string) => void;
  setGroqApiKey: (key: string) => void;
  setGoogleApiKey: (key: string) => void;
  setGroqModel: (model: 'llama-3.1-8b-instant' | 'llama-3.3-70b-versatile' | 'mixtral-8x7b-32768') => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setDarkModeEnabled: (enabled: boolean) => void;
  setTermsContent: (content: string) => void;
  setPrivacyContent: (content: Partial<PrivacyPolicyContent>) => void;
  setHelpContent: (content: Partial<HelpCenterContent>) => void;
  addAIPost: (post: Omit<AIPost, 'id' | 'timestamp'>) => Promise<AIPost | null>;
  updateAIPost: (id: string, updates: Partial<AIPost>) => Promise<void>;
  deleteAIPost: (id: string) => Promise<void>;
  // Firebase sync
  syncAIPosts: () => (() => void);
  syncAppointments: () => (() => void);
  syncOrganizations: () => (() => void);
  syncStatusUpdates: () => (() => void);
  syncEmergencyContacts: () => (() => void);
  syncFacilities: () => (() => void);
  syncTopics: () => (() => void);
  syncArticles: () => (() => void);
  syncSettings: () => (() => void);
  updateAILastGenerated: (aiType: AIType) => void;
  addTopic: (topic: Omit<Topic, 'id' | 'createdAt'>) => Promise<Topic>;
  deleteTopic: (id: string) => Promise<void>;
  addArticle: (article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Article>;
  updateArticle: (id: string, updates: Partial<Article>) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  addOrganization: (org: Omit<Organization, 'id' | 'createdAt'>) => Promise<Organization | null>;
  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  setEmergencyContacts: (contacts: EmergencyContact[]) => void;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<EmergencyContact | null>;
  deleteEmergencyContact: (id: string) => Promise<void>;
  updateEmergencyContact: (id: string, updates: Partial<EmergencyContact>) => Promise<void>;
  addFacility: (facility: Omit<Facility, 'id'>) => Promise<Facility | null>;
  updateFacility: (id: string, updates: Partial<Facility>) => Promise<void>;
  deleteFacility: (id: string) => Promise<void>;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'referenceNumber' | 'createdAt'>) => Promise<Appointment | null>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  setSavedUser: (user: User | null) => void;
  setLanguage: (lang: Language) => void;
  toggleAI: (aiType: AIType) => void;
  addCarouselPhoto: (photo: Omit<CarouselPhoto, 'id'>) => Promise<CarouselPhoto>;
  updateCarouselPhoto: (id: string, updates: Partial<CarouselPhoto>) => Promise<void>;
  deleteCarouselPhoto: (id: string) => Promise<void>;
  setCarouselPhotoAtIndex: (index: number, url: string | null) => Promise<void>;
  addStatusUpdate: (update: Omit<StatusUpdate, 'id' | 'timestamp' | 'expiresAt'>) => Promise<StatusUpdate | null>;
  deleteStatusUpdate: (id: string) => Promise<void>;
  markStatusViewed: (id: string, userId: string) => void;
  clearAllData: () => void;
  
  // Feed Algorithm
  getPersonalizedFeed: (userId: string) => AIPost[];
  
  // Follow Actions
  follow: (followerId: string, following: { id: string; type: 'ai' | 'facilitator' | 'user'; name: string; avatar?: string; badge?: string }) => void;
  unfollow: (followerId: string, followingId: string) => void;
  isFollowing: (followerId: string, followingId: string) => boolean;
  getUserFollows: (userId: string) => Follow[];
  getFollowers: (userId: string) => Follow[];
  
  // Engagement Actions
  trackEngagement: (engagement: Omit<UserEngagement, 'viewedAt'>) => void;
  getUserEngagements: (userId: string) => UserEngagement[];
  getPostEngagement: (postId: string) => UserEngagement[];
  getUserInterestScores: (userId: string) => Record<string, number>;

  // Notification Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'readBy'>) => Notification;
  deleteNotification: (id: string) => void;
  markNotificationRead: (id: string, userId: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  getUnreadNotifications: (userId: string) => Notification[];
  getUnreadAnnouncements: (userId: string) => Notification[];
  getUnreadCount: (userId: string) => number;
  generateAINotifications: () => Notification[];
  clearExpiredNotifications: () => void;

  // RM Admin AI Floating Actions
  rmAdminMessages: RMAdminAIMessage[];
  addRMAdminMessage: (message: Omit<RMAdminAIMessage, 'id' | 'createdAt'>) => RMAdminAIMessage;
  removeRMAdminMessage: (id: string) => void;
  hideRMAdminMessage: (id: string) => void;
  showRMAdminMessage: (id: string, position: { x: number; y: number }) => void;
  updateRMAdminPosition: (id: string, position: { x: number; y: number }) => void;
  generateWelcomeMessage: (userId: string, userName: string, page: string) => RMAdminAIMessage | null;
  generateGuidanceMessage: (userId: string, context: string, page: string) => RMAdminAIMessage | null;
  generateHomeEngagementMessage: (userId: string) => RMAdminAIMessage | null;
  generateSRHREngagementMessage: (userId: string) => RMAdminAIMessage | null;
  generateChatEngagementMessage: (userId: string) => RMAdminAIMessage | null;
  generateServicesEngagementMessage: (userId: string) => RMAdminAIMessage | null;
  generatePageEngagementMessage: (userId: string, page: string) => RMAdminAIMessage | null;
  getLastMessageTime: (userId: string, page: string) => number;
  trackUserActivity: (userId: string, activity: string, metadata?: Record<string, any>) => void;
  getUserActivity: (userId: string) => UserActivity[];
  generateAnnouncements: () => Notification[];

  // User Profile Management
  updateUserProfile: (userId: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string; canEdit: boolean; nextEditDate?: Date }>;
  canEditProfile: (userId: string) => { canEdit: boolean; nextEditDate?: Date };

  // Admin User Management
  adminUpdateUserName: (userId: string, newName: string) => Promise<boolean>;
  getAllUsers: () => Promise<User[]>;
}

// User Activity Tracking
export interface UserActivity {
  id: string;
  userId: string;
  activity: string;
  page?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// Privacy Policy Content
export interface PrivacySection {
  id: string;
  icon: string;
  title: string;
  titleKinyarwanda?: string;
  titleFrench?: string;
  titleSwahili?: string;
  content: string;
  contentKinyarwanda?: string;
  contentFrench?: string;
  contentSwahili?: string;
}

export interface PrivacyPolicyContent {
  lastUpdated: string;
  introduction: string;
  introductionKinyarwanda?: string;
  introductionFrench?: string;
  introductionSwahili?: string;
  sections: PrivacySection[];
  contactEmail: string;
  dataRetentionDays: number;
}

// Help Center Content
export interface FAQContent {
  id: string;
  question: string;
  questionKinyarwanda?: string;
  questionFrench?: string;
  questionSwahili?: string;
  answer: string;
  answerKinyarwanda?: string;
  answerFrench?: string;
  answerSwahili?: string;
  category: string;
}

export interface GuideContent {
  id: string;
  icon: string;
  title: string;
  titleKinyarwanda?: string;
  titleFrench?: string;
  titleSwahili?: string;
  description: string;
  descriptionKinyarwanda?: string;
  descriptionFrench?: string;
  descriptionSwahili?: string;
  steps: string[];
  stepsKinyarwanda?: string[];
  stepsFrench?: string[];
  stepsSwahili?: string[];
}

export interface HelpCenterContent {
  lastUpdated: string;
  faqs: FAQContent[];
  guides: GuideContent[];
  contactEmail: string;
  supportPhone?: string;
}

// Default Privacy Policy Content
const getDefaultPrivacyContent = (): PrivacyPolicyContent => ({
  lastUpdated: new Date().toISOString(),
  introduction: 'RM Ubuzima is committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our application.',
  introductionKinyarwanda: 'RM Ubuzima yiyemeje kurinda amabwiriza yawe bwite no kureba ko amakuru yawe bwite arinzwe. Iyi Poritiki y\'Amabwiriza y\'Ibanga igaragaza uko tukusanya, tukoresha, no kurinda amakuru yawe igihe ukoresha aplikasyon yacu.',
  introductionFrench: 'RM Ubuzima s\'engage à protéger votre vie privée et à assurer la sécurité de vos informations personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos données lorsque vous utilisez notre application.',
  introductionSwahili: 'RM Ubuzima inaelekea kulinda faragha yako na kuhakikisha usalama wa taarifa zako za kibinafsi. Sera hii ya faragha inaeleza jinsi tunavyokusanya, kutumia, na kulinda data yako unapotumia programu yetu.',
  sections: [
    {
      id: 'data-protection',
      icon: 'Shield',
      title: 'Data Protection',
      titleKinyarwanda: 'Kurinda Amakuru',
      titleFrench: 'Protection des Données',
      titleSwahili: 'Ulinzi wa Data',
      content: 'We take your privacy seriously. All personal data is encrypted and stored securely. We never share your information with third parties without your explicit consent. Your data is stored locally on your device and is never transmitted to external servers.',
      contentKinyarwanda: 'Dukeneye amabwiriza yawe bwite. Amakuru yose y\'ibwite yaranzwe no kubitsa neza. Ntabwo tugabanya amakuru yawe n\'abantu banyamahanga utabize. Amakuru yawe yabitswe mu kirahuri cyawe gikomereye ntigahita gihuzwa na seriveri hanze y\'igihugu.',
      contentFrench: 'Nous prenons votre vie privée au sérieux. Toutes les données personnelles sont chiffrées et stockées en toute sécurité. Nous ne partageons jamais vos informations avec des tiers sans votre consentement explicite. Vos données sont stockées localement sur votre appareil et ne sont jamais transmises à des serveurs externes.',
      contentSwahili: 'Tunachukua faragha yako kwa uzito. Data yote ya kibinafsi imesimbwa kwa njia fiche na kuhifadhiwa kwa usalama. Hatuwagi taarifa zako na wahusika wengine bila idhini yako ya dhahiri. Data yako inahifadhiwa kwenye kifaa chako na kamwe haitumwi kwenda seva za nje.',
    },
    {
      id: 'anonymous-browsing',
      icon: 'Eye',
      title: 'Anonymous Browsing',
      titleKinyarwanda: 'Gucuranga Utazwi',
      titleFrench: 'Navigation Anonyme',
      titleSwahili: 'Kuvinjari kwa Kimasihara',
      content: 'RM Ubuzima allows you to browse anonymously. You can use a pseudonym and avatar instead of your real identity. Your posts and interactions are not linked to your real-world identity. We do not require email, phone number, or any personally identifiable information.',
      contentKinyarwanda: 'RM Ubuzima ikorera uburyo bw\'izina rya makimbirane n\'ifoto y\'ikigirwamana mu kigize umuntu. Ibisobanuro byawe n\'ibikorwa byawe ntibihuza n\'izina ryawe nyakuri. Ntidukeneye imeyili, numero ya telefoni, cyangwa amakuru yawe bwite.',
      contentFrench: 'RM Ubuzima vous permet de naviguer anonymement. Vous pouvez utiliser un pseudonyme et un avatar au lieu de votre véritable identité. Vos publications et interactions ne sont pas liées à votre identité réelle. Nous ne demandons pas d\'email, de numéro de téléphone ou d\'informations personnelles identifiables.',
      contentSwahili: 'RM Ubuzima inakuwezesha kuvinjari bila kujulikana. Unaweza kutumia jina bandia na picha ya avatar badala ya utambulisho wako wa kweli. Machapisho yako na mwingiliano wako hayaunganishwi na utambulisho wako wa ulimwengu halisi. Hatutaki barua pepe, namba ya simu, au taarifa zozote za kibinafsi zinazoweza kutambuliwa.',
    },
    {
      id: 'encryption',
      icon: 'Lock',
      title: 'Encryption & Security',
      titleKinyarwanda: 'Gushinga Amabanga & Umutekano',
      titleFrench: 'Chiffrement et Sécurité',
      titleSwahili: 'Usimbaji fiche na Usalama',
      content: 'All communications between the app and our servers are encrypted using industry-standard SSL/TLS protocols. Your messages and personal information are protected from unauthorized access. We implement regular security updates to ensure your data remains safe.',
      contentKinyarwanda: 'Ibiganiro byose hagati ya aplikasyon na seriveri zacu biranzwe ukoreshesha porotokole SSL/TLS. Ubutumwa bwawe n\'amakuru yawe bwite birarindwa kugirango ntawe ubifata. Dukoresha imezirizamutekano nshya buri gihe kugirango amakuru yawe arinde.',
      contentFrench: 'Toutes les communications entre l\'application et nos serveurs sont chiffrées à l\'aide des protocoles SSL/TLS standard de l\'industrie. Vos messages et informations personnelles sont protégés contre tout accès non autorisé. Nous mettons en œuvre des mises à jour de sécurité régulières pour garantir la sécurité de vos données.',
      contentSwahili: 'Mawasiliano yote kati ya programu na seva zetu yamesimbwa kwa kutumia itifaki za SSL/TLS za kiwango cha viwanda. Ujumbe wako na taarifa zako za kibinafsi zinalindwa dhidi ya ufikiaji usioidhinishwa. Tunatekeleza visasaisho vya usalama mara kwa mara kuhakikisha data yako inabaki salama.',
    },
    {
      id: 'data-retention',
      icon: 'Trash2',
      title: 'Data Retention & Deletion',
      titleKinyarwanda: 'Kubika no Gusiba Amakuru',
      titleFrench: 'Conservation et Suppression des Données',
      titleSwahili: 'Kuhifadhi na Kufuta Data',
      content: 'You have full control over your data. You can delete your account and all associated data at any time from the Settings page. Session data is automatically cleared when you log out. Chat messages are stored locally and can be deleted by facilitators only when necessary.',
      contentKinyarwanda: 'Ufite ubuyobozi bwuzuye ku makuru yawe. Urashobora gusiba konti yawe n\'amakuru yose yihuriyeho igihe cyose uvuye mu mpangamiterere. Amakuru y\'igikorwa cyasibwe kimwe igihe usohotse. Ubutumwa bwo mu biganiro bihabwa bihagaze mu kirahuri gikoreye kandi bushobora gusibwa n\'abafasha gusa igihe bikenewe.',
      contentFrench: 'Vous avez un contrôle total sur vos données. Vous pouvez supprimer votre compte et toutes les données associées à tout moment depuis la page des paramètres. Les données de session sont automatiquement effacées lorsque vous vous déconnectez. Les messages de chat sont stockés localement et ne peuvent être supprimés par les animateurs que lorsque cela est nécessaire.',
      contentSwahili: 'Una udhibiti wa kikamilifu juu ya data yako. Unaweza kufuta akaunti yako na data yote husika wakati wowote kutoka kwenye ukurasa wa Mipangilio. Data ya kikao inafutwa kiotomatiki unapolog out. Ujumbe wa gumzo unahifadhiwa kwenye ndani na unaweza kufutwa na wasimamizi tu wanapohitajika.',
    },
    {
      id: 'cookies',
      icon: 'Cookie',
      title: 'Cookies & Local Storage',
      titleKinyarwanda: 'Cookies n\'Ububiko bwa Ndangagaciro',
      titleFrench: 'Cookies et Stockage Local',
      titleSwahili: 'Vidakuzi na Hifadhi ya Ndani',
      content: 'We use local storage only to save your preferences and session data. No tracking cookies are used. Your data never leaves your device unless you explicitly choose to share it. We do not use third-party analytics or tracking services.',
      contentKinyarwanda: 'Dukoresha ububiko bwa gikoresho gusa kugirango tubike amahitamo yawe n\'amakuru y\'igikorwa. Nta cookies zikurikirana zikoreshwa. Amakuru yawe atahava mu kirahuri cyawe keretse witoye gusangira. Ntidukoresha imiterere ya gatatu cyangwa serivisi zikurikirana.',
      contentFrench: 'Nous utilisons le stockage local uniquement pour enregistrer vos préférences et les données de session. Aucun cookie de suivi n\'est utilisé. Vos données ne quittent jamais votre appareil à moins que vous choisissiez explicitement de les partager. Nous n\'utilisons pas d\'analyses tierces ou de services de suivi.',
      contentSwahili: 'Tunatumia hifadhi ya ndani tu kuhifadhi mapendeleo yako na data ya kikao. Hakuna vidakuzi vya ufuatiliaji vinavyotumika. Data yako haiachi kifaa chako kamwe isipokuwa umechagua kushiriki kwa dhahiri. Hatutumii uchanganuzi wa wahusika wengine au huduma za ufuatiliaji.',
    },
    {
      id: 'third-party',
      icon: 'Users',
      title: 'Third-Party Services',
      titleKinyarwanda: 'Serivisi z\'Abantu banyamahanga',
      titleFrench: 'Services Tiers',
      titleSwahili: 'Huduma za Wahusika Wengine',
      content: 'We do not share your data with third-party advertisers or marketers. The only external services we use are for map functionality (Google Maps) and video conferencing (Jitsi Meet), which operate under their own privacy policies. No personal data is transmitted to these services.',
      contentKinyarwanda: 'Ntaguhacza amakuru yawe n\'abamamaza cyangwa abacuruzi b\'abantu banyamahanga. Serivisi hanze zacu zikoresha zikoresha ni mapu (Google Maps) n\'igikorwa cy\'amajwi (Jitsi Meet), zikora munsi y\'amategeko y\'amabwiriza y\'ibanga yazo. Nta makuru y\'ibwite atoherezwa kuri izo serivisi.',
      contentFrench: 'Nous ne partageons pas vos données avec des annonceurs ou des marketeurs tiers. Les seuls services externes que nous utilisons sont pour la fonctionnalité de carte (Google Maps) et la vidéoconférence (Jitsi Meet), qui opèrent sous leurs propres politiques de confidentialité. Aucune donnée personnelle n\'est transmise à ces services.',
      contentSwahili: 'Hugawi data yako na watangazaji wengine au wauzaji. Huduma za nje pekee tunazotumia ni kwa kazi ya ramani (Google Maps) na mkutano wa video (Jitsi Meet), zinazofanya kazi chini ya sera zao za faragha. Hakuna data ya kibinafsi inayotumwa kwa huduma hizi.',
    },
  ],
  contactEmail: 'privacy@rmubuzima.org',
  dataRetentionDays: 30,
});

// Default Help Center Content
const getDefaultHelpContent = (): HelpCenterContent => ({
  lastUpdated: new Date().toISOString(),
  faqs: [
    {
      id: 'what-is',
      question: 'What is RM Ubuzima?',
      questionKinyarwanda: 'RM Ubuzima ni iki?',
      questionFrench: 'Qu\'est-ce que RM Ubuzima?',
      questionSwahili: 'RM Ubuzima ni nini?',
      answer: 'RM Ubuzima is a secure, anonymous platform for Sexual and Reproductive Health and Rights (SRHR) information and support. It provides a safe space for users to access health information, connect with AI assistants for educational purposes, and find nearby health facilities.',
      answerKinyarwanda: 'RM Ubuzima ni urubuga rwizewe, rutazwi rw\'amakuru ya Sosiyete no Kubahiriza Ubuzima (SRHR). Rutanga ahantu hizewe kugirango abakoresha bashobore kubona amakuru y\'ubuzima, baganire na ba muderi b\'imashini kugihe cy\'amahugurwa, no kubona ibiro vya ngenga vya muganga.',
      answerFrench: 'RM Ubuzima est une plateforme sécurisée et anonyme pour l\'information et le soutien en matière de santé sexuelle et reproductive (SRHR). Elle offre un espace sûr aux utilisateurs pour accéder à des informations sur la santé, se connecter avec des assistants IA à des fins éducatives, et trouver des établissements de santé à proximité.',
      answerSwahili: 'RM Ubuzima ni jukwaa salama na la kiusiri la habari na usaidizi wa Afya ya Uzazi na Jinsia (SRHR). Inatoa nafasi salama kwa watumiaji kupata habari za afya, kuunganishwa na wasaidizi wa AI kwa madhumuni ya elimu, na kupata vituo vya afya vilivyopo karibu.',
      category: 'general',
    },
    {
      id: 'is-secure',
      question: 'Is my data secure?',
      questionKinyarwanda: 'Amakuru yande arinzwe?',
      questionFrench: 'Mes données sont-elles sécurisées?',
      questionSwahili: 'Je, data yango iko salama?',
      answer: 'Yes! Your data is stored locally on your device with encryption. We never share your personal information with third parties. You can use the app anonymously with a username and avatar of your choice. No email or phone number is required.',
      answerKinyarwanda: 'Yego! Amakuru yawe yabitswe mu kirahuri cyawe gikoreye harinzwe. Ntituge amakuru yawe bwite n\'abantu banyamahanga. Urashobora gukoresha aplikasyon utazwi ukoresheje izina ndenga n\'ifoto y\'ikigirwamana. Nta imeyili cyangwa numero ya telefoni bisabwa.',
      answerFrench: 'Oui! Vos données sont stockées localement sur votre appareil avec chiffrement. Nous ne partageons jamais vos informations personnelles avec des tiers. Vous pouvez utiliser l\'application anonymement avec un nom d\'utilisateur et un avatar de votre choix. Aucun email ou numéro de téléphone n\'est requis.',
      answerSwahili: 'Ndiyo! Data yako inahifadhiwa kwenye kifaa chako kwa usimbaji fiche. Hatuwagi taarifa zako za kibinafsi na wahusika wengine. Unaweza kutumia programu bila kujulikana na jina la mtumiaji na avatar unavyochagua. Barua pepe au namba ya simu haihitajiki.',
      category: 'privacy',
    },
    {
      id: 'change-language',
      question: 'How do I change the language?',
      questionKinyarwanda: 'Nahindura ururimi gute?',
      questionFrench: 'Comment changer la langue?',
      questionSwahili: 'Jinsi ya kubadili lugha?',
      answer: 'Go to Settings and select Language. We support English, Kinyarwanda, French, and Swahili. Your language preference will be saved automatically.',
      answerKinyarwanda: 'Jya mu Igenamiterere uhitemo Ururimi. Dukoresha Icyongereza, Ikinyarwanda, Igifaransa, na Kiswahili. Icyihutirwa cyawe cy\'ururumi kizabitswa kimwe.',
      answerFrench: 'Allez dans Paramètres et sélectionnez Langue. Nous prenons en charge l\'anglais, le kinyarwanda, le français et le swahili. Votre préférence linguistique sera enregistrée automatiquement.',
      answerSwahili: 'Nenda kwenye Mipangilio uchague Lugha. Tunasaidia Kiingereza, Kinyarwanda, Kifaransa, na Kiswahili. Mapendeleo yako ya lugha yatahifadhiwa kiotomatiki.',
      category: 'settings',
    },
    {
      id: 'enable-notifications',
      question: 'How do I enable notifications?',
      questionKinyarwanda: 'Nakoresha imenyekanisha gute?',
      questionFrench: 'Comment activer les notifications?',
      questionSwahili: 'Jinsi ya kuwasha arifa?',
      answer: 'Go to Settings and toggle the Notifications option. You will receive important updates about SRHR Library, emergency alerts, and community announcements when enabled. You can disable them at any time.',
      answerKinyarwanda: 'Jya mu Igenamiterere uhitemo Imenyekanisha. Uzamenyekanishwa ku makuru y\'ubuzima, imenyesha za biza, n\'amatangazo y\'abaturage igihe byakoreshwa. Urashobora kuyahagarika igihe cyose.',
      answerFrench: 'Allez dans Paramètres et activez l\'option Notifications. Vous recevrez des mises à jour importantes sur les informations de santé sexuelle et reproductive, des alertes d\'urgence et des annonces communautaires lorsque activé. Vous pouvez les désactiver à tout moment.',
      answerSwahili: 'Nenda kwenye Mipangilio na washa chaguo la Arifa. Utapokea visasisho muhimu kuhusu habari za SRHR, tahadhari za dharura, na tangazo za jamii zinapowashwa. Unaweza kuzima wakati wowote.',
      category: 'settings',
    },
    {
      id: 'use-dark-mode',
      question: 'How do I use dark mode?',
      questionKinyarwanda: 'Nakoresha uburyo bw\'ijima gute?',
      questionFrench: 'Comment utiliser le mode sombre?',
      questionSwahili: 'Jinsi ya kutumia hali ya giza?',
      answer: 'Dark mode can be enabled in Settings. Toggle the Dark Mode option to switch between light and dark themes. This can help reduce eye strain, especially at night or in low-light environments.',
      answerKinyarwanda: 'Uburyo bw\'ijima burashobora gukoreshwa mu Igenamiterere. Hindura uburyo bw\'Ijima kugirango uhindure hagati y\'imiterere y\'urumuri n\'ubw\'ijima. Ibi birashobora gufasha kugabanya kurara amaso, by\'umwihariko nijoro cyangwa mu kindi gicuma kibisi.',
      answerFrench: 'Le mode sombre peut être activé dans les Paramètres. Activez l\'option Mode sombre pour basculer entre les thèmes clair et sombre. Cela peut aider à réduire la fatigue oculaire, surtout la nuit ou dans des environnements peu éclairés.',
      answerSwahili: 'Hali ya giza inaweza kuwashwa katika Mipangilio. Washa chaguo la Hali ya Giza ili kubadili kati ya mandhari ya mwanga na ya giza. Hii inaweza kusaidia kupunguza uchovu wa macho, haswa usiku au katika mazingira ya mwanga chini.',
      category: 'settings',
    },
    {
      id: 'find-services',
      question: 'How do I find health services?',
      questionKinyarwanda: 'Nabona serivisi z\'ubuzima gute?',
      questionFrench: 'Comment trouver des services de santé?',
      questionSwahili: 'Jinsi ya kupata huduma za afya?',
      answer: 'Use the "Find Health Services" feature in the navigation menu. Enable location services to find nearby hospitals, pharmacies, and clinics. The map shows both roadmap and satellite views to help you locate facilities easily. You can also get directions and call facilities directly.',
      answerKinyarwanda: 'Koresha igikorwa cyo "Kubona Serivisi zo Kubagara" mu myandikire. Komeza serivisi z\'ahantu kugirango ubone ibiro vya muganga, farumasi, n\'ivuriro. Ikarita igaragaza umuhanda n\'amashusho ya satelite kugirango ugufashe kubona ibiro byoroshye. Urashobora kandi kubona ama directions no guhamagara ibiro ubutumire.',
      answerFrench: 'Utilisez la fonction "Trouver des services de santé" dans le menu de navigation. Activez les services de localisation pour trouver les hôpitaux, pharmacies et cliniques à proximité. La carte affiche à la fois la vue routière et satellite pour vous aider à localiser facilement les établissements. Vous pouvez également obtenir des directions et appeler les établissements directement.',
      answerSwahili: 'Tumia kipengele cha "Kupata Huduma za Afya" katika menyu ya uabiriji. Washa huduma za mahali kupata hospitali, maduka ya dawa, na vituo vya afya vilivyopo karibu. Ramani inaonyesha both maoni ya barabara na satellite kukusaidia kupata vituo kwa urahisi. Unaweza pia kupata maelekezo na kupiga simu kwa vituo moja kwa moja.',
      category: 'services',
    },
    {
      id: 'talk-to-ai',
      question: 'Can I talk to an AI doctor?',
      questionKinyarwanda: 'Nshobora kuganira na muganga wa muderi?',
      questionFrench: 'Puis-je parler à un médecin IA?',
      questionSwahili: 'Ninaweza kuzungumza na daktari wa AI?',
      answer: 'Yes! Our AI assistants are available 24/7 to provide SRHR Library and guidance for educational purposes. They can answer questions about sexual health, reproductive health, and general wellness. Remember that AI advice is for educational purposes only and NOT a substitute for professional medical care. Always consult a qualified healthcare provider for medical concerns.',
      answerKinyarwanda: 'Yego! Abafasha bacu b\'imashini bafite 24/7 kugirango batange amakuru ya SRHR n\'ubuyobozi kugihe cy\'amahugurwa. Bashobora gusubiza ibibazo bijyanye n\'ubuzima bw\'imyororokere, ubuzima bw\'imbyara, n\'ubuzima rusange. Ibuka ko inama za muderi ni kugirango amahugurwa gusa KANDI SI inama zo kubagara. Buri gihe usabe umuhanga w\'ubuzima wemewe kubagara ku bibazo by\'ubuzima.',
      answerFrench: 'Oui! Nos assistants IA sont disponibles 24h/24 et 7j/7 pour fournir des informations et des conseils sur la santé sexuelle et reproductive à des fins éducatives. Ils peuvent répondre aux questions sur la santé sexuelle, la santé reproductive et le bien-être général. N\'oubliez pas que les conseils de l\'IA sont uniquement à des fins éducatives et NE remplacent PAS les soins médicaux professionnels. Consultez toujours un professionnel de santé qualifié pour les problèmes médicaux.',
      answerSwahili: 'Ndiyo! Wasaidizi wetu wa AI wanapatikana 24/7 kutoa habari na mwongozo wa SRHR kwa madhumuni ya elimu. Wanaweza kujibu maswali kuhusu afya ya ngono, afya ya uzazi, na ustawi wa jumla. Kumbuka kwamba ushauri wa AI ni kwa madhumuni ya elimu pekee na SIO mbadala wa huduma za matibabu za kitaalamu. Washauri daima mtoa huduma wa afya aliye na sifa kwa masuala ya matibabu.',
      category: 'ai',
    },
    {
      id: 'decoy-mode',
      question: 'What is Decoy Mode?',
      questionKinyarwanda: 'Uburyo bw\'Indorerwamo ni iki?',
      questionFrench: 'Qu\'est-ce que le Mode Leurre?',
      questionSwahili: 'Hali ya Kushangaza ni nini?',
      answer: 'Decoy Mode is a privacy feature that allows you to quickly switch to a decoy screen by pressing Ctrl+B. This helps protect your privacy if someone unexpectedly sees your screen. The decoy screen appears as a generic document viewer, helping you maintain your privacy in sensitive situations.',
      answerKinyarwanda: 'Uburyo bw\'Indorerwamo ni igikorwa cy\'ibanga gikorera guhindura igishushanyo byihuse ukoresheje Ctrl+B. Ibi bifasha kurinda ibanga ryawe niba hahise umuntu akareba mu mushinga wawe. Igishushanyo cy\'indorerwamo kigaragaza nk\'igisoma inyandiko rusange, kikagufasha kurinda ibanga ryawe mu bihe byihutirwa.',
      answerFrench: 'Le Mode Leurre est une fonctionnalité de confidentialité qui vous permet de passer rapidement à un écran de leurre en appuyant sur Ctrl+B. Cela aide à protéger votre vie privée si quelqu\'un voit votre écran de manière inattendue. L\'écran de leurre apparaît comme un visionneur de documents générique, vous aidant à maintenir votre confidentialité dans des situations sensibles.',
      answerSwahili: 'Hali ya Kushangaza ni kipengele cha faragha kinachokuwezesha kubadilisha haraka kwenye skrini ya kushangaza kwa kubonyeza Ctrl+B. Hii husaidia kulinda faragha yako ikiwa mtu anaona skrini yako kwa bahati mbaya. Skrini ya kushangaza inaonekana kama kitazamaji hati jeneriki, ikikusaidia kudumisha faragha yako katika hali nyeti.',
      category: 'privacy',
    },
    {
      id: 'book-doctor',
      question: 'How do I book a doctor appointment?',
      questionKinyarwanda: 'Nabigenza gute gusaba gukurikirana muganga?',
      questionFrench: 'Comment prendre rendez-vous avec un médecin?',
      questionSwahili: 'Jinsi ya kuhudumu na daktari?',
      answer: 'Go to the "Book a Doctor" section from the home page or menu. Fill in your details, select your preferred date and time, and submit your request. You will receive a reference number and confirmation. Your information is kept confidential and only shared with the healthcare provider.',
      answerKinyarwanda: 'Jya mu gice cyo "Gusaba Gukurikirana Muganga" ukubutse ku ipaji y\'a nyuma cyangwa mu myandikire. Uzuza amakuru yawe, hitamo itariki n\'isaha ushaka, kohereza gusaba. Uzahabwa numero y\'icyemezo n\'icyemezo. Amakuru yawe agumya ibanga kandi agahabwa gusa umuhanga w\'ubuzima.',
      answerFrench: 'Allez dans la section "Réserver un médecin" depuis la page d\'accueil ou le menu. Remplissez vos coordonnées, sélectionnez la date et l\'heure souhaitées, et soumettez votre demande. Vous recevrez un numéro de référence et une confirmation. Vos informations sont gardées confidentielles et uniquement partagées avec le professionnel de santé.',
      answerSwahili: 'Nenda kwenye sehemu ya "Weka Daktari" kutoka kwa ukurasa wa nyumbani au menyu. Jaza maelezo yako, chagua tarehe na wakati unaopendelea, na wasilisha ombo lako. Utapokea namba ya kumbukumbu na uthibitisho. Taarifa zako zinahifadhiwa kwa siri na kushirikiwa tu na mtoa huduma wa afya.',
      category: 'services',
    },
    {
      id: 'emergency',
      question: 'What should I do in an emergency?',
      questionKinyarwanda: 'Nakora iki mu bihe by\'ihutirwa?',
      questionFrench: 'Que dois-je faire en cas d\'urgence?',
      questionSwahili: 'Nifanye nini katika dharura?',
      answer: 'Go to the Emergency section for immediate access to emergency contacts. You can call emergency services directly from the app. For medical emergencies, call the ambulance or go to the nearest hospital. For gender-based violence, call the GBV hotline. All emergency numbers are available 24/7.',
      answerKinyarwanda: 'Jya mu gice cy\'Ibiza kugirango ubone byihuse numero zimutabara. Urashobora guhamagara serivisi zimutabara ubutumire ukoresheje aplikasyon. Ku bihe by\'ubuzima by\'ihutirwa, hamagara imodoka z\'abagwayi cyangwa jya ku bitaro bihafi. Ku bihe by\'ihohoterwa rishingiye ku gitsina, hamagara inamba ya GBV. Numero zimutabara zose zifite 24/7.',
      answerFrench: 'Allez dans la section Urgence pour un accès immédiat aux contacts d\'urgence. Vous pouvez appeler les services d\'urgence directement depuis l\'application. Pour les urgences médicales, appelez l\'ambulance ou rendez-vous à l\'hôpital le plus proche. Pour les violences basées sur le genre, appelez la ligne d\'assistance GBV. Tous les numéros d\'urgence sont disponibles 24h/24 et 7j/7.',
      answerSwahili: 'Nenda kwenye sehemu ya Dharura kwa ufikiaji wa haraka wa anwani za dharura. Unaweza kupiga simu kwa huduma za dharura moja kwa moja kutoka kwa programu. Kwa dharura za matibabu, piga ambulance au nenda kwenye hospitali iliyo karibu zaidi. Kwa ukatili wa kijinsia, piga simu ya mstari wa GBV. Namba zote za dharura zinapatikana 24/7.',
      category: 'emergency',
    },
  ],
  guides: [
    {
      id: 'getting-started',
      icon: 'Rocket',
      title: 'Getting Started',
      titleKinyarwanda: 'Gutangira',
      titleFrench: 'Commencer',
      titleSwahili: 'Kuanza',
      description: 'Learn the basics of using RM Ubuzima',
      descriptionKinyarwanda: 'Menya iby\'ingenzi byo gukoresha RM Ubuzima',
      descriptionFrench: 'Apprenez les bases de l\'utilisation de RM Ubuzima',
      descriptionSwahili: 'Jifunze misingi ya kutumia RM Ubuzima',
      steps: [
        'Create your anonymous profile with an avatar',
        'Explore the Daily Feed for SRHR Library',
        'Use the menu to find services and resources',
        'Enable notifications for important updates',
        'Use Decoy Mode (Ctrl+B) for privacy when needed',
      ],
      stepsKinyarwanda: [
        'Kora umwirondoro wawe utazwishiriwe hamwe n\'ifoto',
        'Kuzura amakuru ya buri munsi ya SRHR',
        'Koresha myandikire kugirango ubone serivisi n\'ibisomwa',
        'Koresha imenyekanisha ku makuru y\'ingenzi',
        'Koresha Uburyo bw\'Indorerwamo (Ctrl+B) kugirango wibinge igihe bikenewe',
      ],
      stepsFrench: [
        'Créez votre profil anonyme avec un avatar',
        'Explorez le fil quotidien pour les informations de santé sexuelle et reproductive',
        'Utilisez le menu pour trouver des services et des ressources',
        'Activez les notifications pour les mises à jour importantes',
        'Utilisez le mode Leurre (Ctrl+B) pour la confidentialité si nécessaire',
      ],
      stepsSwahili: [
        'Tengeneza wasifu wako wa kiusiri na avatar',
        'Chunguza Chakula cha Kila Siku kwa habari za SRHR',
        'Tumia menyu kupata huduma na rasilimali',
        'Washa arifa kwa visasisho muhimu',
        'Tumia Hali ya Kushangaza (Ctrl+B) kwa faragha inapohitajika',
      ],
    },
    {
      id: 'using-chat',
      icon: 'MessageCircle',
      title: 'Using Community Chat',
      titleKinyarwanda: 'Gukoresha Chat y\'Abaturage',
      titleFrench: 'Utiliser le Chat Communautaire',
      titleSwahili: 'Kutumia Gumzo la Jamii',
      description: 'Connect with the community safely',
      descriptionKinyarwanda: 'Guhuza n\'abaturage mu buryo bwizewe',
      descriptionFrench: 'Connectez-vous avec la communauté en toute sécurité',
      descriptionSwahili: 'Ungana na jamii kwa usalama',
      steps: [
        'Join the community chat from the main menu',
        'Read and accept the chat rules and guidelines',
        'Use @mentions to tag AI assistants or facilitators',
        'Be respectful and supportive to other members',
        'Use Inbox for private conversations with facilitators',
      ],
      stepsKinyarwanda: [
        'Injira mu biganiro by\'abaturage ubutumire bwa myandikire',
        'Soma wemeze amategeko n\'amabwiriza y\'ibiganiro',
        'Koresha @mentions kugirango uhuze abafasha cyangwa abafasha',
        'Baha abanye uko bikwiye kandi ufashe abandi',
        'Koresha Inbox kugirango baganire n\'abafasha mu bwiru',
      ],
      stepsFrench: [
        'Rejoignez le chat communautaire depuis le menu principal',
        'Lisez et acceptez les règles et directives du chat',
        'Utilisez les @mentions pour taguer les assistants IA ou les animateurs',
        'Soyez respectueux et solidaire envers les autres membres',
        'Utilisez la Boîte de réception pour les conversations privées avec les animateurs',
      ],
      stepsSwahili: [
        'Ungana na gumzo la jamii kutoka kwa menyu kuu',
        'Soma na kubali sheria na mwongozo wa gumzo',
        'Tumia @mentions kuweka alama wasaidizi wa AI au wasimamizi',
        'Kuwa na heshima na msaada kwa wanajamii wengine',
        'Tumia Kikasha kwa mazungumzo ya faragha na wasimamizi',
      ],
    },
  ],
  contactEmail: 'support@rmubuzima.org',
  supportPhone: '+250 783 679 400',
});

const defaultAIConfigs: Record<AIType, AIConfig> = {
  'ubuzima-admin': { enabled: true, schedule: '0 9 * * 1', lastGenerated: null },
  'hekimo': { enabled: true, schedule: '0 6 * * *', lastGenerated: null },
};

export const usePersistentStore = create<PersistentState>()(
  (set, get) => ({
      // Initial State
      adminPassword: DEFAULT_ADMIN_PASSWORD,
      isAdminLoggedIn: false,
      platformLogo: null,
      appEmail: 'rmubuzima@gmail.com',
      aiAvatars: getDefaultAIAvatars(),
      bookDoctorEmail: '',
      bazaMugangaLink: 'https://meet.jit.si/rm-ubuzima-baza-muganga',
      bazaMugangaTopic: 'Sexual and Reproductive Health Q&A',
      groqApiKey: '',
      googleApiKey: '',
      groqModel: 'llama-3.3-70b-versatile',
      notificationsEnabled: true,
      darkModeEnabled: false,
      termsContent: '',
      privacyContent: getDefaultPrivacyContent(),
      helpContent: getDefaultHelpContent(),
      aiPosts: [],
      aiConfigs: defaultAIConfigs,
      topics: [],
      articles: [],
      organizations: [],
      emergencyContacts: [],
      facilities: [],
      appointments: [],
      savedUser: null,
      users: [],
      language: 'en',
      enabledAIs: ['ubuzima-admin'] as AIType[],
      carouselPhotos: [],
      statusUpdates: [],
      chatMessages: [],
      chatSettings: null,

      // Social Features Initial State
      follows: [],
      userEngagements: [],

      // User Activity Tracking Initial State
      userActivities: [],
      lastMessageTimes: {},

      // Notifications Initial State
      notifications: [],
      lastNotificationCheck: null,

      // RM Admin AI Floating Messages Initial State
      rmAdminMessages: [],

      // Actions
      changeAdminPassword: (currentPassword, newPassword) => {
        const state = get();
        if (state.adminPassword !== currentPassword) {
          return false;
        }
        set({ adminPassword: newPassword });
        return true;
      },
      setAdminPassword: (password) => set({ adminPassword: password }),
      setAdminLoggedIn: (loggedIn) => set({ isAdminLoggedIn: loggedIn }),
      loginAdmin: () => set({ isAdminLoggedIn: true }),
      
      setPlatformLogo: async (logo) => {
        let finalUrl = logo;
        
        // If logo is base64, upload to Storage and save URL
        if (logo && isBase64Image(logo)) {
          try {
            const blob = base64ToBlob(logo);
            finalUrl = await uploadImage(blob, 'logos', `platform_logo_${Date.now()}`);
            console.log('[Store] Logo uploaded to Storage:', finalUrl);
          } catch (error) {
            console.error('[Store] Failed to upload logo:', error);
            // Keep base64 as fallback
            finalUrl = logo;
          }
        }
        
        // Update local state
        set({ platformLogo: finalUrl });
        
        // Sync to Firebase settings
        try {
          await updateSettings({ platformLogo: finalUrl });
          console.log('[Store] Logo synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync logo:', error);
        }
      },
      
      setAppEmail: async (email) => {
        set({ appEmail: email });
        await updateSettings({ appEmail: email });
      },
      
      setAiAvatars: async (avatars) => {
        const uploadedAvatars: Record<AIType, string | null> = { ...avatars };
        
        // Upload any base64 avatars to Storage
        for (const [aiType, avatar] of Object.entries(avatars)) {
          if (avatar && isBase64Image(avatar)) {
            try {
              const blob = base64ToBlob(avatar);
              const url = await uploadImage(blob, 'avatars', `${aiType}_${Date.now()}`);
              uploadedAvatars[aiType as AIType] = url;
            } catch (error) {
              console.error(`Failed to upload avatar for ${aiType}:`, error);
            }
          }
        }
        
        set({ aiAvatars: uploadedAvatars });
        await updateSettings({ aiAvatars: uploadedAvatars });
      },
      
      setAIAvatar: async (aiType, avatar) => {
        let finalAvatar = avatar;
        
        // If avatar is base64, upload to Storage
        if (avatar && isBase64Image(avatar)) {
          try {
            const blob = base64ToBlob(avatar);
            finalAvatar = await uploadImage(blob, 'avatars', `${aiType}_${Date.now()}`);
            console.log(`[Store] Avatar uploaded for ${aiType}:`, finalAvatar);
          } catch (error) {
            console.error(`Failed to upload avatar for ${aiType}:`, error);
            throw error; // Re-throw so caller can handle it
          }
        }
        
        set((state) => {
          const newAvatars = { ...state.aiAvatars, [aiType]: finalAvatar };
          // Sync to Firebase (fire and forget)
          updateSettings({ aiAvatars: newAvatars });
          return { aiAvatars: newAvatars };
        });
        
        return finalAvatar; // Return the final URL so caller knows it succeeded
      },
      setBookDoctorEmail: async (email) => {
        set({ bookDoctorEmail: email });
        // Sync to Firebase
        try {
          await updateSettings({ bookDoctorEmail: email });
          console.log('[Store] Book doctor email synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync book doctor email:', error);
        }
      },
      setBazaMugangaLink: async (link) => {
        set({ bazaMugangaLink: link });
        // Sync to Firebase
        try {
          await updateSettings({ bazaMugangaLink: link });
          console.log('[Store] Baza Muganga link synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync Baza Muganga link:', error);
        }
      },
      setBazaMugangaTopic: async (topic) => {
        set({ bazaMugangaTopic: topic });
        // Sync to Firebase
        try {
          await updateSettings({ bazaMugangaTopic: topic });
          console.log('[Store] Baza Muganga topic synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync Baza Muganga topic:', error);
        }
      },
      setGroqApiKey: async (key) => {
        set({ groqApiKey: key });
        // Sync to Firebase so all devices can use the same API key
        try {
          await updateSettings({ groqApiKey: key });
          console.log('[Store] Groq API key synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync Groq API key:', error);
        }
      },
      setGoogleApiKey: async (key) => {
        set({ googleApiKey: key });
        // Sync to Firebase so all devices can use the same API key
        try {
          await updateSettings({ googleApiKey: key });
          console.log('[Store] Google API key synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync Google API key:', error);
        }
      },
      setGroqModel: async (model) => {
        set({ groqModel: model });
        // Sync to Firebase so all devices use the same model
        try {
          await updateSettings({ groqModel: model });
          console.log('[Store] Groq model synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync Groq model:', error);
        }
      },
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setDarkModeEnabled: (enabled) => set({ darkModeEnabled: enabled }),
      setTermsContent: (content) => set({ termsContent: content }),
      setPrivacyContent: (content: Partial<PrivacyPolicyContent>) => set((state) => ({ 
        privacyContent: { ...state.privacyContent, ...content, lastUpdated: new Date().toISOString() } 
      })),
      setHelpContent: (content: Partial<HelpCenterContent>) => set((state) => ({ 
        helpContent: { ...state.helpContent, ...content, lastUpdated: new Date().toISOString() } 
      })),

      // Firebase Sync Actions
      syncAIPosts: () => {
        const unsubscribe = subscribeToAIPosts((posts) => {
          set({ aiPosts: posts });
        });
        return unsubscribe;
      },
      syncAppointments: () => {
        const unsubscribe = subscribeToAppointments((appointments) => {
          set({ appointments });
        });
        return unsubscribe;
      },
      syncOrganizations: () => {
        const unsubscribe = subscribeToOrganizations((organizations) => {
          set({ organizations });
        });
        return unsubscribe;
      },
      syncStatusUpdates: () => {
        const unsubscribe = subscribeToStatusUpdates((statusUpdates) => {
          set({ statusUpdates });
        });
        return unsubscribe;
      },
      syncEmergencyContacts: () => {
        const unsubscribe = subscribeToEmergencyContacts((emergencyContacts) => {
          set({ emergencyContacts });
        });
        return unsubscribe;
      },
      syncFacilities: () => {
        const unsubscribe = subscribeToFacilities((facilities) => {
          set({ facilities });
        });
        return unsubscribe;
      },

      addAIPost: async (post) => {
        const result = await addAIPostToFirebase(post);
        if (result) {
          set((state) => ({ aiPosts: [result, ...state.aiPosts] }));
        }
        return result;
      },

      updateAIPost: async (id, updates) => {
        await updateAIPostToFirebase(id, updates);
        set((state) => ({
          aiPosts: state.aiPosts.map((post) =>
            post.id === id ? { ...post, ...updates } : post
          ),
        }));
      },

      deleteAIPost: async (id) => {
        await deleteAIPostFromFirebase(id);
        set((state) => ({
          aiPosts: state.aiPosts.filter((post) => post.id !== id),
        }));
      },

      updateAILastGenerated: (aiType) => {
        set((state) => ({
          aiConfigs: {
            ...state.aiConfigs,
            [aiType]: {
              ...state.aiConfigs[aiType],
              lastGenerated: new Date().toISOString(),
            },
          },
        }));
      },

      addTopic: async (topic) => {
        const newTopic: Topic = {
          ...topic,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        
        // Sync to Firebase first
        try {
          const fbTopic = await addTopicToFirebase(newTopic);
          if (fbTopic) {
            set((state) => ({ topics: [...state.topics, fbTopic] }));
            console.log('[Store] Topic synced to Firebase:', fbTopic.id);
            return fbTopic;
          }
        } catch (error) {
          console.error('[Store] Failed to sync topic to Firebase:', error);
        }
        
        // Fallback to local only
        set((state) => ({ topics: [...state.topics, newTopic] }));
        return newTopic;
      },

      deleteTopic: async (id) => {
        // Delete from Firebase first
        try {
          await deleteTopicFromFirebase(id);
          console.log('[Store] Topic deleted from Firebase:', id);
        } catch (error) {
          console.error('[Store] Failed to delete topic from Firebase:', error);
        }
        
        // Update local state
        set((state) => ({
          topics: state.topics.filter((t) => t.id !== id),
          articles: state.articles.filter((a) => a.topicId !== id),
        }));
      },

      addArticle: async (article) => {
        const newArticle: Article = {
          ...article,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Sync to Firebase first
        try {
          const fbArticle = await addArticleToFirebase(newArticle);
          if (fbArticle) {
            set((state) => ({ articles: [...state.articles, fbArticle] }));
            console.log('[Store] Article synced to Firebase:', fbArticle.id);
            return fbArticle;
          }
        } catch (error) {
          console.error('[Store] Failed to sync article to Firebase:', error);
        }
        
        // Fallback to local only
        set((state) => ({ articles: [...state.articles, newArticle] }));
        return newArticle;
      },

      updateArticle: async (id, updates) => {
        // Sync to Firebase first
        try {
          await updateArticleToFirebase(id, updates);
          console.log('[Store] Article updated in Firebase:', id);
        } catch (error) {
          console.error('[Store] Failed to update article in Firebase:', error);
        }
        
        // Update local state
        set((state) => ({
          articles: state.articles.map((article) =>
            article.id === id
              ? { ...article, ...updates, updatedAt: new Date().toISOString() }
              : article
          ),
        }));
      },

      deleteArticle: async (id) => {
        // Delete from Firebase first
        try {
          await deleteArticleFromFirebase(id);
          console.log('[Store] Article deleted from Firebase:', id);
        } catch (error) {
          console.error('[Store] Failed to delete article from Firebase:', error);
        }
        
        // Update local state
        set((state) => ({
          articles: state.articles.filter((a) => a.id !== id),
        }));
      },

      addOrganization: async (org) => {
        const result = await addOrganizationToFirebase(org);
        if (result) {
          set((state) => ({ organizations: [...state.organizations, result] }));
        }
        return result;
      },

      updateOrganization: async (id, updates) => {
        await updateOrganizationToFirebase(id, updates);
        set((state) => ({
          organizations: state.organizations.map((org) =>
            org.id === id ? { ...org, ...updates } : org
          ),
        }));
      },

      deleteOrganization: async (id) => {
        await deleteOrganizationFromFirebase(id);
        set((state) => ({
          organizations: state.organizations.filter((o) => o.id !== id),
        }));
      },

      setEmergencyContacts: (contacts) => set({ emergencyContacts: contacts }),
      
      addEmergencyContact: async (contact) => {
        const result = await addEmergencyContactToFirebase(contact);
        if (result) {
          set((state) => ({
            emergencyContacts: [...state.emergencyContacts, result],
          }));
        }
        return result;
      },

      deleteEmergencyContact: async (id) => {
        await deleteEmergencyContactFromFirebase(id);
        set((state) => ({
          emergencyContacts: state.emergencyContacts.filter((e) => e.id !== id),
        }));
      },

      updateEmergencyContact: async (id, updates) => {
        await updateEmergencyContactToFirebase(id, updates);
        set((state) => ({
          emergencyContacts: state.emergencyContacts.map((contact) =>
            contact.id === id ? { ...contact, ...updates } : contact
          ),
        }));
      },

      addFacility: async (facility) => {
        const result = await addFacilityToFirebase(facility);
        if (result) {
          set((state) => ({ facilities: [...state.facilities, result] }));
        }
        return result;
      },

      updateFacility: async (id, updates) => {
        await updateFacilityToFirebase(id, updates);
        set((state) => ({
          facilities: state.facilities.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        }));
      },

      deleteFacility: async (id) => {
        await deleteFacilityFromFirebase(id);
        set((state) => ({
          facilities: state.facilities.filter((f) => f.id !== id),
        }));
      },

      addAppointment: async (appointment) => {
        try {
          console.log('[Store] Adding appointment:', appointment);
          const result = await addAppointmentToFirebase(appointment);
          if (result) {
            console.log('[Store] Appointment added successfully:', result);
            set((state) => ({ appointments: [...state.appointments, result] }));
          } else {
            console.error('[Store] Failed to add appointment - null result');
            throw new Error('Failed to create appointment in Firebase');
          }
          return result;
        } catch (error: any) {
          console.error('[Store] Error in addAppointment:', error);
          throw error;
        }
      },

      updateAppointment: async (id, updates) => {
        await updateAppointmentToFirebase(id, updates);
        set((state) => ({
          appointments: state.appointments.map((apt) =>
            apt.id === id ? { ...apt, ...updates } : apt
          ),
        }));
      },

      deleteAppointment: async (id) => {
        await deleteAppointmentFromFirebase(id);
        set((state) => ({
          appointments: state.appointments.filter((apt) => apt.id !== id),
        }));
      },

      setSavedUser: (user) => set({ savedUser: user }),
      setLanguage: (lang) => set({ language: lang }),

      // Authentication
      loginUser: (email, password) => {
        const state = get();
        const user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user && user.password === password) {
          set({ savedUser: user });
          return user;
        }
        return null;
      },

      registerUser: (userData) => {
        const state = get();
        const existingUser = state.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
        if (existingUser) {
          return null; // Email already exists
        }
        const newUser: User = {
          ...userData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set({ users: [...state.users, newUser] });
        return newUser;
      },

      getUserByEmail: (email) => {
        const state = get();
        return state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      },

      toggleAI: (aiType) => {
        set((state) => {
          const enabled = state.enabledAIs.includes(aiType);
          return {
            enabledAIs: enabled
              ? state.enabledAIs.filter((t) => t !== aiType)
              : [...state.enabledAIs, aiType],
          };
        });
      },

      addCarouselPhoto: async (photo) => {
        let finalUrl = photo.url;
        
        // If image is base64, upload to Storage
        if (photo.url && isBase64Image(photo.url)) {
          try {
            const blob = base64ToBlob(photo.url);
            finalUrl = await uploadImage(blob, 'carousel', `carousel_${Date.now()}`);
            console.log('[Store] Carousel photo uploaded to Storage:', finalUrl);
          } catch (error) {
            console.error('[Store] Failed to upload carousel photo:', error);
            // Keep base64 as fallback but still continue
            finalUrl = photo.url;
          }
        }
        
        const newPhoto: CarouselPhoto = {
          ...photo,
          url: finalUrl,
          id: generateId(),
        };
        
        // Get current photos and add new one
        const currentPhotos = get().carouselPhotos;
        const updatedPhotos = [...currentPhotos, newPhoto];
        
        // Update local state
        set({ carouselPhotos: updatedPhotos });
        
        // Sync to Firebase settings
        try {
          await updateSettings({ carouselPhotos: updatedPhotos });
          console.log('[Store] Carousel photos synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync carousel photos:', error);
        }
        
        return newPhoto;
      },

      updateCarouselPhoto: async (id, updates) => {
        let finalUpdates = updates;
        
        // If updating image and it's base64, upload to Storage
        if (updates.url && isBase64Image(updates.url)) {
          try {
            const blob = base64ToBlob(updates.url);
            const url = await uploadImage(blob, 'carousel', `carousel_${Date.now()}`);
            finalUpdates = { ...updates, url };
            console.log('[Store] Carousel photo updated in Storage:', url);
          } catch (error) {
            console.error('[Store] Failed to upload updated carousel photo:', error);
            // Keep base64 as fallback
            finalUpdates = updates;
          }
        }
        
        // Get current photos and update
        const currentPhotos = get().carouselPhotos;
        const updatedPhotos = currentPhotos.map((p) =>
          p.id === id ? { ...p, ...finalUpdates } : p
        );
        
        // Update local state
        set({ carouselPhotos: updatedPhotos });
        
        // Sync to Firebase settings
        try {
          await updateSettings({ carouselPhotos: updatedPhotos });
          console.log('[Store] Updated carousel photos synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync updated carousel photos:', error);
        }
      },

      deleteCarouselPhoto: async (id) => {
        const currentPhotos = get().carouselPhotos;
        const photo = currentPhotos.find(p => p.id === id);
        
        // Delete image from Storage if it's a Firebase URL
        if (photo?.url && photo.url.includes('firebasestorage.googleapis.com')) {
          try {
            await deleteImageByUrl(photo.url);
            console.log('[Store] Carousel photo deleted from Storage');
          } catch (error) {
            console.error('[Store] Failed to delete carousel photo from storage:', error);
          }
        }
        
        // Filter out deleted photo
        const updatedPhotos = currentPhotos.filter((p) => p.id !== id);
        
        // Update local state
        set({ carouselPhotos: updatedPhotos });
        
        // Sync to Firebase settings
        try {
          await updateSettings({ carouselPhotos: updatedPhotos });
          console.log('[Store] Deleted carousel photo synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync deleted carousel photo:', error);
        }
      },

      setCarouselPhotoAtIndex: async (index, url) => {
        const currentPhotos = get().carouselPhotos;
        const existingPhoto = currentPhotos.find(p => p.order === index);
        
        let updatedPhotos: CarouselPhoto[];
        
        if (url === null || url === '') {
          updatedPhotos = currentPhotos.filter(p => p.order !== index);
        } else if (existingPhoto) {
          updatedPhotos = currentPhotos.map(p =>
            p.order === index ? { ...p, url, order: index } : p
          );
        } else {
          updatedPhotos = [...currentPhotos, {
            id: generateId(),
            url,
            caption: '',
            order: index,
          }];
        }
        
        // Update UI immediately
        set({ carouselPhotos: updatedPhotos });
        
        // CRITICAL: Save to Firestore and WAIT for it to complete
        try {
          await updateSettings({ carouselPhotos: updatedPhotos });
          console.log(`[Store] Photo ${index} saved to Firebase successfully`);
        } catch (error) {
          console.error(`[Store] FAILED to save photo ${index}:`, error);
          throw error; // Re-throw so caller knows it failed
        }
      },

      addStatusUpdate: async (update) => {
        const result = await addStatusUpdateToFirebase(update);
        if (result) {
          set((state) => ({ statusUpdates: [result, ...state.statusUpdates] }));
        }
        return result;
      },

      deleteStatusUpdate: async (id) => {
        await deleteStatusUpdateFromFirebase(id);
        set((state) => ({
          statusUpdates: state.statusUpdates.filter((u) => u.id !== id),
        }));
      },

      markStatusViewed: (id, userId) => {
        set((state) => ({
          statusUpdates: state.statusUpdates.map((u) =>
            u.id === id ? { ...u, viewedBy: [...u.viewedBy, userId] } : u
          ),
        }));
      },

      // Firebase sync for SRHR
      syncTopics: () => {
        console.log('[Store] Starting topics sync...');
        const unsubscribe = subscribeToTopics((topics) => {
          console.log('[Store] Topics synced from Firebase:', topics.length);
          set({ topics });
        });
        return unsubscribe;
      },
      syncArticles: () => {
        console.log('[Store] Starting articles sync...');
        const unsubscribe = subscribeToArticles((articles) => {
          console.log('[Store] Articles synced from Firebase:', articles.length);
          set({ articles });
        });
        return unsubscribe;
      },

      syncSettings: () => {
        console.log('[Store] Starting settings sync...');
        const unsubscribe = subscribeToSettings((settings) => {
          console.log('[Store] Settings synced from Firebase:', settings);
          // Get current chatSettings or create default
          const currentChatSettings = get().chatSettings;
          const defaultChatSettings = {
            groupName: 'RM Ubuzima Community Chat',
            groupDescription: '',
            facilitators: [],
            facilitatorRequests: [],
            bannedUsers: [],
            isEnabled: true,
            facilitatorPassword: DEFAULT_FACILITATOR_PASSWORD,
          };

          // Clean up stale facilitator statuses before applying new data
          // This ensures offline facilitators are properly marked
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          const cleanedFacilitators = settings.chatSettings?.facilitators?.map((f: Facilitator) => {
            if (f.isOnline && f.lastSeen && new Date(f.lastSeen).getTime() < fiveMinutesAgo) {
              return { ...f, isOnline: false };
            }
            return f;
          }) ?? currentChatSettings?.facilitators ?? defaultChatSettings.facilitators;

          // Update all settings-related state when Firebase changes
          set({
            platformLogo: settings.platformLogo || null,
            appEmail: settings.appEmail || 'rmubuzima@gmail.com',
            aiAvatars: settings.aiAvatars || get().aiAvatars,
            carouselPhotos: settings.carouselPhotos || [],
            termsContent: settings.termsContent || '',
            notificationsEnabled: settings.notificationsEnabled ?? true,
            darkModeEnabled: settings.darkModeEnabled ?? false,
            // API Keys - synced across all devices
            groqApiKey: settings.groqApiKey ?? get().groqApiKey ?? '',
            googleApiKey: settings.googleApiKey ?? get().googleApiKey ?? '',
            groqModel: settings.groqModel ?? get().groqModel ?? 'llama-3.3-70b-versatile',
            // Other shared settings
            bookDoctorEmail: settings.bookDoctorEmail ?? get().bookDoctorEmail ?? '',
            bazaMugangaLink: settings.bazaMugangaLink ?? get().bazaMugangaLink ?? 'https://meet.jit.si/rm-ubuzima-baza-muganga',
            bazaMugangaTopic: settings.bazaMugangaTopic ?? get().bazaMugangaTopic ?? 'Sexual and Reproductive Health Q&A',
            // Always use Firebase chatSettings if available, merging with defaults to ensure all fields exist
            chatSettings: settings.chatSettings ? {
              ...defaultChatSettings,
              ...currentChatSettings,
              ...settings.chatSettings,
              // Use cleaned facilitators (stale statuses removed) or fallback to existing/current/default
              facilitators: cleanedFacilitators,
              facilitatorRequests: settings.chatSettings.facilitatorRequests ?? currentChatSettings?.facilitatorRequests ?? defaultChatSettings.facilitatorRequests,
              bannedUsers: settings.chatSettings.bannedUsers ?? currentChatSettings?.bannedUsers ?? defaultChatSettings.bannedUsers,
            } : {
              // If no chatSettings in Firebase, use current or create defaults
              ...defaultChatSettings,
              ...currentChatSettings,
            },
          });
        });
        return unsubscribe;
      },

      // Chat Actions
      syncChatMessages: () => {
        console.log('[Store] Starting chat messages sync...');
        const unsubscribe = subscribeToChatMessages((messages) => {
          console.log('[Store] Chat messages synced:', messages.length);
          set({ chatMessages: messages });
        });
        return unsubscribe;
      },

      sendChatMessage: async (message) => {
        console.log('[Store] sendChatMessage called with:', message);
        const result = await sendChatMessageToFirebase(message);
        console.log('[Store] sendChatMessage result from Firebase:', result);
        if (result) {
          set((state) => ({ chatMessages: [...state.chatMessages, result] }));
        } else {
          console.error('[Store] sendChatMessage failed - no result from Firebase');
        }
        return result;
      },

      deleteChatMessage: async (messageId) => {
        return await deleteChatMessageFromFirebase(messageId);
      },

      updateChatSettings: async (settings) => {
        const currentSettings = get().chatSettings || {
          groupName: 'RM Ubuzima Community Chat',
          groupDescription: '',
          facilitators: [],
          facilitatorRequests: [],
          bannedUsers: [],
          isEnabled: true,
          facilitatorPassword: DEFAULT_FACILITATOR_PASSWORD,
        };
        const newSettings = { ...currentSettings, ...settings };
        set({ chatSettings: newSettings });
        
        // Sync to Firebase to ensure persistence across all devices
        try {
          await updateSettings({ chatSettings: newSettings });
          console.log('[Store] Chat settings synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync chat settings to Firebase:', error);
        }
        
        return true;
      },

      addFacilitator: async (facilitator) => {
        const currentSettings = get().chatSettings || {
          groupName: 'RM Ubuzima Community Chat',
          groupDescription: '',
          facilitators: [],
          facilitatorRequests: [],
          bannedUsers: [],
          isEnabled: true,
          facilitatorPassword: DEFAULT_FACILITATOR_PASSWORD,
        };
        // Check by userId first (for logged-in users)
        const existsById = currentSettings.facilitators.find(f => f.userId === facilitator.userId);
        if (existsById) return false;
        
        // Check by userName for password-auth facilitators (prevent duplicates)
        if (facilitator.userName && facilitator.userName !== 'Facilitator') {
          const existsByName = currentSettings.facilitators.find(f => 
            f.userName === facilitator.userName && f.assignedBy === 'password-auth'
          );
          if (existsByName) return false;
        }
        
        const newFacilitator: Facilitator = {
          ...facilitator,
          assignedAt: new Date().toISOString(),
          isOnline: true,
          lastSeen: new Date().toISOString(),
          // Ensure badges array exists
          badges: facilitator.badges || ['F'],
          isBigSister: facilitator.isBigSister ?? facilitator.badges?.includes('S') ?? false,
          isHealthcareProvider: facilitator.isHealthcareProvider ?? facilitator.badges?.includes('H') ?? false,
        };
        
        const updatedSettings = {
          ...currentSettings,
          facilitators: [...currentSettings.facilitators, newFacilitator],
        };
        
        set({ chatSettings: updatedSettings });

        // Sync to Firebase settings
        try {
          await updateSettings({ chatSettings: updatedSettings });
          console.log('[Store] Facilitator added and synced to Firebase settings');
        } catch (error) {
          console.error('[Store] Failed to sync facilitator to Firebase settings:', error);
        }

        // CRITICAL: Also save facilitator status to user document for cross-device persistence
        try {
          await saveFacilitatorStatusToUser(facilitator.userId, {
            isFacilitator: true,
            assignedAt: newFacilitator.assignedAt,
            assignedBy: facilitator.assignedBy,
            role: facilitator.role || 'Facilitator',
            badges: newFacilitator.badges || ['F'],
            permissions: {
              canDeleteMessages: facilitator.canDeleteMessages ?? true,
              canBanUsers: facilitator.canBanUsers ?? true,
              canSendAnnouncements: facilitator.canSendAnnouncements ?? true,
              canPostDailyFeed: facilitator.canPostDailyFeed ?? true,
              canPostNewsFeed: facilitator.canPostNewsFeed ?? true,
              canPostStatus: facilitator.canPostStatus ?? true,
              canManageSRHR: facilitator.canManageSRHR ?? true,
              canManageEmergency: facilitator.canManageEmergency ?? true,
            },
          });
          console.log('[Store] Facilitator status saved to user document for cross-device persistence');
        } catch (error) {
          console.error('[Store] Failed to save facilitator status to user document:', error);
        }

        return true;
      },

      removeFacilitator: async (userId) => {
        const currentSettings = get().chatSettings;
        if (!currentSettings) return false;

        const updatedSettings = {
          ...currentSettings,
          facilitators: currentSettings.facilitators.filter(f => f.userId !== userId),
        };

        set({ chatSettings: updatedSettings });

        // Sync to Firebase settings
        try {
          await updateSettings({ chatSettings: updatedSettings });
          console.log('[Store] Facilitator removed and synced to Firebase settings');
        } catch (error) {
          console.error('[Store] Failed to sync facilitator removal to Firebase settings:', error);
        }

        // CRITICAL: Also remove facilitator status from user document
        try {
          await removeFacilitatorStatusFromUser(userId);
          console.log('[Store] Facilitator status removed from user document');
        } catch (error) {
          console.error('[Store] Failed to remove facilitator status from user document:', error);
        }

        return true;
      },

      banUser: async (userId) => {
        const currentSettings = get().chatSettings || {
          groupName: 'RM Ubuzima Community Chat',
          groupDescription: '',
          facilitators: [],
          facilitatorRequests: [],
          bannedUsers: [],
          isEnabled: true,
          facilitatorPassword: DEFAULT_FACILITATOR_PASSWORD,
        };
        
        if (currentSettings.bannedUsers.includes(userId)) return false;
        
        const updatedSettings = {
          ...currentSettings,
          bannedUsers: [...currentSettings.bannedUsers, userId],
        };
        
        set({ chatSettings: updatedSettings });
        
        // Sync to Firebase settings
        try {
          await updateSettings({ chatSettings: updatedSettings });
          console.log('[Store] Banned user and synced to Firebase settings');
        } catch (error) {
          console.error('[Store] Failed to sync ban to Firebase settings:', error);
        }
        
        // CRITICAL: Also ban user in their user document for app-wide ban
        try {
          const { banUserInFirebase } = await import('../services/firebaseService');
          await banUserInFirebase(userId, 'admin', 'Banned by admin');
          console.log('[Store] User banned in Firebase user document:', userId);
        } catch (error) {
          console.error('[Store] Failed to ban user in Firebase:', error);
        }
        
        // Update local users array if user exists
        const state = get();
        const userIndex = state.users.findIndex((u) => u.id === userId);
        if (userIndex !== -1) {
          const updatedUsers = [...state.users];
          updatedUsers[userIndex] = {
            ...updatedUsers[userIndex],
            isBanned: true,
            bannedAt: new Date().toISOString(),
            bannedBy: 'admin',
          };
          set({ users: updatedUsers });
        }
        
        return true;
      },

      // Facilitator Request Actions
      requestFacilitator: async (request) => {
        const currentSettings = get().chatSettings || {
          groupName: 'RM Ubuzima Community Chat',
          groupDescription: '',
          facilitators: [],
          facilitatorRequests: [],
          bannedUsers: [],
          isEnabled: true,
          facilitatorPassword: DEFAULT_FACILITATOR_PASSWORD,
        };
        
        // Check if user already has a pending request
        const existingRequest = currentSettings.facilitatorRequests?.find(
          r => r.userId === request.userId && r.status === 'pending'
        );
        if (existingRequest) return false;
        
        // Check if user is already a facilitator
        const isFacilitator = currentSettings.facilitators.some(f => f.userId === request.userId);
        if (isFacilitator) return false;
        
        const newRequest: FacilitatorRequest = {
          ...request,
          id: generateId(),
          requestedAt: new Date().toISOString(),
          status: 'pending',
        };
        
        const updatedSettings = {
          ...currentSettings,
          facilitatorRequests: [...(currentSettings.facilitatorRequests || []), newRequest],
        };
        
        set({ chatSettings: updatedSettings });
        
        // Sync to Firebase
        try {
          await updateSettings({ chatSettings: updatedSettings });
          console.log('[Store] Facilitator request submitted and synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync facilitator request to Firebase:', error);
        }
        
        return true;
      },

      approveFacilitatorRequest: async (requestId, adminId, badges?: ('F' | 'S' | 'H' | 'L')[]) => {
        const currentSettings = get().chatSettings;
        if (!currentSettings) return false;

        const request = currentSettings.facilitatorRequests?.find(r => r.id === requestId);
        if (!request || request.status !== 'pending') return false;

        // Default badges - always include F (Facilitator)
        const assignedBadges = badges?.length ? badges : ['F'];

        // Add user as facilitator with all new permissions enabled by default
        const newFacilitator: Facilitator = {
          userId: request.userId,
          userName: request.userName,
          userAvatar: request.userAvatar,
          assignedBy: adminId,
          assignedAt: new Date().toISOString(),
          canDeleteMessages: true,
          canBanUsers: true,
          canSendAnnouncements: true,
          canPostDailyFeed: true,
          canPostNewsFeed: true,
          canPostStatus: true,
          canManageSRHR: true,
          canManageEmergency: true,
          role: 'Facilitator',
          badges: assignedBadges as ('F' | 'S' | 'H' | 'L')[],
          isBigSister: assignedBadges.includes('S'),
          isHealthcareProvider: assignedBadges.includes('H'),
          isLegalAdvisor: assignedBadges.includes('L'),
        };

        const updatedSettings: ChatSettings = {
          ...currentSettings,
          facilitators: [...currentSettings.facilitators, newFacilitator],
          facilitatorRequests: currentSettings.facilitatorRequests?.map(r =>
            r.id === requestId
              ? { ...r, status: 'approved' as const, reviewedAt: new Date().toISOString(), reviewedBy: adminId }
              : r
          ) || [],
        };

        set({ chatSettings: updatedSettings });

        // Sync to Firebase settings
        try {
          await updateSettings({ chatSettings: updatedSettings });
          console.log('[Store] Facilitator request approved and synced to Firebase settings');
        } catch (error) {
          console.error('[Store] Failed to sync approval to Firebase settings:', error);
        }

        // CRITICAL: Also save facilitator status to user document for cross-device persistence
        try {
          await saveFacilitatorStatusToUser(request.userId, {
            isFacilitator: true,
            assignedAt: new Date().toISOString(),
            assignedBy: adminId,
            role: 'Facilitator',
            badges: assignedBadges as ('F' | 'S' | 'H' | 'L')[],
            permissions: {
              canDeleteMessages: true,
              canBanUsers: true,
              canSendAnnouncements: true,
              canPostDailyFeed: true,
              canPostNewsFeed: true,
              canPostStatus: true,
              canManageSRHR: true,
              canManageEmergency: true,
            },
          });
          console.log('[Store] Facilitator status saved to user document for cross-device persistence');
        } catch (error) {
          console.error('[Store] Failed to save facilitator status to user document:', error);
        }

        return true;
      },

      denyFacilitatorRequest: async (requestId, adminId, reason) => {
        const currentSettings = get().chatSettings;
        if (!currentSettings) return false;
        
        const request = currentSettings.facilitatorRequests?.find(r => r.id === requestId);
        if (!request || request.status !== 'pending') return false;
        
        const updatedSettings: ChatSettings = {
          ...currentSettings,
          facilitatorRequests: currentSettings.facilitatorRequests?.map(r =>
            r.id === requestId
              ? { ...r, status: 'denied' as const, reviewedAt: new Date().toISOString(), reviewedBy: adminId, denialReason: reason }
              : r
          ) || [],
        };
        
        set({ chatSettings: updatedSettings });
        
        // Sync to Firebase
        try {
          await updateSettings({ chatSettings: updatedSettings });
          console.log('[Store] Facilitator request denied and synced to Firebase');
        } catch (error) {
          console.error('[Store] Failed to sync denial to Firebase:', error);
        }
        
        return true;
      },

      isUserFacilitator: (userId: string, sessionUser?: User) => {
        const currentSettings = get().chatSettings;
        const savedUser = get().savedUser;

        // Check chatSettings first (real-time from Firebase)
        if (currentSettings?.facilitators?.some(f => f.userId === userId)) {
          return true;
        }

        // Also check savedUser's facilitator status (persisted in Firestore user document)
        // This ensures cross-device persistence even if chatSettings hasn't synced yet
        if (savedUser?.id === userId && savedUser?.isFacilitator) {
          return true;
        }

        // CRITICAL: Also check session user's facilitator status for freshly logged-in users
        // This catches cases where savedUser hasn't been fully synced yet but session has latest data
        if (sessionUser?.id === userId && sessionUser?.isFacilitator) {
          return true;
        }

        return false;
      },

      hasPendingFacilitatorRequest: (userId) => {
        const currentSettings = get().chatSettings;
        if (!currentSettings) return false;
        return currentSettings.facilitatorRequests?.some(
          r => r.userId === userId && r.status === 'pending'
        ) ?? false;
      },

      getFacilitator: (userId: string) => {
        const currentSettings = get().chatSettings;
        const savedUser = get().savedUser;

        // First check chatSettings (real-time from Firebase)
        if (currentSettings?.facilitators) {
          const facilitator = currentSettings.facilitators.find(f => f.userId === userId);
          if (facilitator) return facilitator;
        }

        // If not found in chatSettings but user has facilitator status in savedUser,
        // build facilitator data from savedUser (cross-device persistence)
        if (savedUser?.id === userId && savedUser?.isFacilitator) {
          return {
            userId: savedUser.id,
            userName: savedUser.name,
            userAvatar: savedUser.avatar,
            assignedBy: savedUser.facilitatorAssignedBy || 'admin',
            assignedAt: savedUser.facilitatorAssignedAt || new Date().toISOString(),
            role: savedUser.facilitatorRole || 'Facilitator',
            badges: savedUser.facilitatorBadges || ['F'],
            isBigSister: savedUser.facilitatorBadges?.includes('S') || false,
            isHealthcareProvider: savedUser.facilitatorBadges?.includes('H') || false,
            canDeleteMessages: savedUser.facilitatorPermissions?.canDeleteMessages ?? true,
            canBanUsers: savedUser.facilitatorPermissions?.canBanUsers ?? true,
            canSendAnnouncements: savedUser.facilitatorPermissions?.canSendAnnouncements ?? true,
            canPostDailyFeed: savedUser.facilitatorPermissions?.canPostDailyFeed ?? true,
            canPostNewsFeed: savedUser.facilitatorPermissions?.canPostNewsFeed ?? true,
            canPostStatus: savedUser.facilitatorPermissions?.canPostStatus ?? true,
            canManageSRHR: savedUser.facilitatorPermissions?.canManageSRHR ?? true,
            canManageEmergency: savedUser.facilitatorPermissions?.canManageEmergency ?? true,
          };
        }

        return undefined;
      },

      // Update facilitator online status
      updateFacilitatorStatus: async (userId: string, isOnline: boolean) => {
        const currentSettings = get().chatSettings;
        if (!currentSettings) return false;
        
        const facilitatorIndex = currentSettings.facilitators.findIndex(f => f.userId === userId);
        if (facilitatorIndex === -1) return false;
        
        const updatedFacilitators = [...currentSettings.facilitators];
        updatedFacilitators[facilitatorIndex] = {
          ...updatedFacilitators[facilitatorIndex],
          isOnline,
          lastSeen: new Date().toISOString(),
        };
        
        const updatedSettings = {
          ...currentSettings,
          facilitators: updatedFacilitators,
        };
        
        set({ chatSettings: updatedSettings });
        
        // Sync to Firebase
        try {
          await updateSettings({ chatSettings: updatedSettings });
        } catch (error) {
          console.error('[Store] Failed to sync facilitator status:', error);
        }
        
        return true;
      },

      isUserBigSister: (userId: string) => {
        const currentSettings = get().chatSettings;
        const savedUser = get().savedUser;

        // Check chatSettings first
        const facilitator = currentSettings?.facilitators?.find(f => f.userId === userId);
        if (facilitator?.isBigSister) return true;

        // Also check savedUser's badges (cross-device persistence)
        if (savedUser?.id === userId && savedUser?.facilitatorBadges?.includes('S')) {
          return true;
        }

        return false;
      },

      isUserHealthcareProvider: (userId: string) => {
        const currentSettings = get().chatSettings;
        const savedUser = get().savedUser;

        // Check chatSettings first
        const facilitator = currentSettings?.facilitators?.find(f => f.userId === userId);
        if (facilitator?.isHealthcareProvider) return true;

        // Also check savedUser's badges (cross-device persistence)
        if (savedUser?.id === userId && savedUser?.facilitatorBadges?.includes('H')) {
          return true;
        }

        return false;
      },

      getBigSisters: () => {
        const currentSettings = get().chatSettings;
        if (!currentSettings) return [];
        return currentSettings.facilitators.filter(f => f.isBigSister);
      },

      // Get active facilitators (online or recently active)
      getActiveFacilitators: () => {
        const currentSettings = get().chatSettings;
        if (!currentSettings) return [];
        
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return currentSettings.facilitators.filter(f => {
          // Consider online if explicitly marked online AND recently seen
          if (f.isOnline && f.lastSeen) {
            return new Date(f.lastSeen).getTime() > fiveMinutesAgo;
          }
          return false;
        });
      },

      // Cleanup stale facilitator statuses (those offline for >5 minutes)
      cleanupStaleFacilitators: () => {
        const currentSettings = get().chatSettings;
        if (!currentSettings) return;
        
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        let hasChanges = false;
        
        const updatedFacilitators = currentSettings.facilitators.map(f => {
          // If marked online but lastSeen is stale (>5 min), mark offline
          if (f.isOnline && f.lastSeen) {
            const lastSeenTime = new Date(f.lastSeen).getTime();
            if (lastSeenTime < fiveMinutesAgo) {
              hasChanges = true;
              return { ...f, isOnline: false };
            }
          }
          return f;
        });
        
        if (hasChanges) {
          const updatedSettings = {
            ...currentSettings,
            facilitators: updatedFacilitators,
          };
          set({ chatSettings: updatedSettings });
          
          // Sync to Firebase in background
          updateSettings({ chatSettings: updatedSettings }).catch((error) => {
            console.error('[Store] Failed to sync stale facilitator cleanup:', error);
          });
        }
      },

      unbanUser: async (userId) => {
        const currentSettings = get().chatSettings;
        if (!currentSettings) return false;
        
        const updatedSettings = {
          ...currentSettings,
          bannedUsers: currentSettings.bannedUsers.filter(id => id !== userId),
        };
        
        set({ chatSettings: updatedSettings });
        
        // Sync to Firebase settings
        try {
          await updateSettings({ chatSettings: updatedSettings });
          console.log('[Store] User unbanned and synced to Firebase settings');
        } catch (error) {
          console.error('[Store] Failed to sync unban to Firebase settings:', error);
        }
        
        // CRITICAL: Also unban user in their user document
        try {
          const { unbanUserInFirebase } = await import('../services/firebaseService');
          await unbanUserInFirebase(userId);
          console.log('[Store] User unbanned in Firebase user document:', userId);
        } catch (error) {
          console.error('[Store] Failed to unban user in Firebase:', error);
        }
        
        // Update local users array if user exists
        const state = get();
        const userIndex = state.users.findIndex((u) => u.id === userId);
        if (userIndex !== -1) {
          const updatedUsers = [...state.users];
          updatedUsers[userIndex] = {
            ...updatedUsers[userIndex],
            isBanned: false,
          };
          set({ users: updatedUsers });
        }
        
        return true;
      },

      // Follow Actions Implementation
      follow: (followerId, following) => {
        const state = get();
        const existingFollow = state.follows.find(
          f => f.followerId === followerId && f.followingId === following.id
        );
        if (existingFollow) return;

        const newFollow: Follow = {
          id: generateId(),
          followerId,
          followingId: following.id,
          followingType: following.type,
          followingName: following.name,
          followingAvatar: following.avatar,
          followingBadge: following.badge,
          followedAt: new Date().toISOString(),
        };
        set({ follows: [...state.follows, newFollow] });
      },
      
      unfollow: (followerId, followingId) => {
        const state = get();
        set({
          follows: state.follows.filter(
            f => !(f.followerId === followerId && f.followingId === followingId)
          ),
        });
      },
      
      isFollowing: (followerId, followingId) => {
        const state = get();
        return state.follows.some(
          f => f.followerId === followerId && f.followingId === followingId
        );
      },
      
      getUserFollows: (userId) => {
        const state = get();
        return state.follows.filter(f => f.followerId === userId);
      },
      
      getFollowers: (userId) => {
        const state = get();
        return state.follows.filter(f => f.followingId === userId);
      },
      
      // Engagement Actions Implementation
      trackEngagement: (engagement) => {
        const state = get();
        // Remove any existing engagement for this user/post combo
        const filtered = state.userEngagements.filter(
          e => !(e.userId === engagement.userId && e.postId === engagement.postId)
        );
        
        const newEngagement: UserEngagement = {
          ...engagement,
          viewedAt: new Date().toISOString(),
        };
        set({ userEngagements: [...filtered, newEngagement] });
      },
      
      getUserEngagements: (userId) => {
        const state = get();
        return state.userEngagements.filter(e => e.userId === userId);
      },
      
      getPostEngagement: (postId) => {
        const state = get();
        return state.userEngagements.filter(e => e.postId === postId);
      },
      
      getUserInterestScores: (userId) => {
        const state = get();
        const userEngagements = state.userEngagements.filter(e => e.userId === userId);
        const scores: Record<string, number> = {};
        
        // Calculate scores based on AI type engagement
        userEngagements.forEach(e => {
          if (e.aiType) {
            scores[e.aiType] = (scores[e.aiType] || 0) + 1;
            if (e.liked) scores[e.aiType] += 2;
            if (e.shared) scores[e.aiType] += 3;
          }
        });
        
        // Add scores for followed accounts
        const userFollows = state.follows.filter(f => f.followerId === userId);
        userFollows.forEach(f => {
          if (f.followingType === 'ai') {
            scores[f.followingId] = (scores[f.followingId] || 0) + 5;
          }
        });
        
        return scores;
      },
      
      // Feed Algorithm - Get Personalized Feed
      getPersonalizedFeed: (userId) => {
        const state = get();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        
        // Get user follows and interest scores
        const userFollows = state.follows.filter(f => f.followerId === userId);
        const followedIds = new Set(userFollows.map(f => f.followingId));
        const interestScores = get().getUserInterestScores(userId);
        
        // Calculate score for each post
        const scoredPosts = state.aiPosts.filter(post => post.isActive).map(post => {
          let score = 0;
          const postTime = new Date(post.timestamp).getTime();
          const age = now - postTime;
          
          // Recency factor (higher for newer posts)
          if (age < oneDay) score += 100;
          else if (age < oneWeek) score += 50;
          else score += 10;
          
          // Follow bonus
          if (followedIds.has(post.aiType)) score += 50;
          if (post.createdBy && followedIds.has(post.createdBy)) score += 50;
          
          // Interest score bonus based on AI type
          const aiInterest = interestScores[post.aiType] || 0;
          score += aiInterest * 3;
          
          // Engagement bonus (views)
          score += (post.views || 0) * 0.5;
          
          // Facilitator post bonus
          if (post.createdByName) score += 20;
          
          return { post, score };
        });
        
        // Sort by score descending
        scoredPosts.sort((a, b) => b.score - a.score);
        
        return scoredPosts.map(sp => sp.post);
      },

      clearAllData: () => {
        set({
          isAdminLoggedIn: false,
          platformLogo: null,
          appEmail: 'rmubuzima@gmail.com',
          aiAvatars: getDefaultAIAvatars(),
          bookDoctorEmail: '',
          bazaMugangaLink: 'https://meet.jit.si/rm-ubuzima-baza-muganga',
          bazaMugangaTopic: 'Sexual and Reproductive Health Q&A',
          groqApiKey: '',
          groqModel: 'llama-3.3-70b-versatile',
          notificationsEnabled: true,
          darkModeEnabled: false,
          termsContent: '',
          privacyContent: getDefaultPrivacyContent(),
          helpContent: getDefaultHelpContent(),
          aiPosts: [],
          aiConfigs: defaultAIConfigs,
          topics: [],
          articles: [],
          organizations: [],
          emergencyContacts: [],
          facilities: [],
          appointments: [],
          savedUser: null,
          users: [],
          language: 'en',
          enabledAIs: ['ubuzima-admin'] as AIType[],
          carouselPhotos: [],
          statusUpdates: [],
          chatMessages: [],
          chatSettings: null,
          follows: [],
          userEngagements: [],
          notifications: [],
          lastNotificationCheck: null,
          rmAdminMessages: [],
        });
      },

      // Notification Actions Implementation
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: generateId(),
          createdAt: new Date().toISOString(),
          readBy: [],
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));
        return newNotification;
      },

      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      markNotificationRead: (id, userId) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id && !n.readBy.includes(userId)
              ? { ...n, readBy: [...n.readBy, userId] }
              : n
          ),
        }));
      },

      markAllNotificationsRead: (userId) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            !n.readBy.includes(userId)
              ? { ...n, readBy: [...n.readBy, userId] }
              : n
          ),
        }));
      },

      getUnreadNotifications: (userId) => {
        const state = get();
        return state.notifications.filter(
          (n) =>
            n.category === 'notification' &&
            !n.readBy.includes(userId) &&
            (!n.expiresAt || new Date(n.expiresAt) > new Date()) &&
            // Filter by target audience - only show notifications meant for this user or for all
            (!n.targetAudience || n.targetAudience === 'all' ||
              (n.targetAudience === 'specific_user' && n.targetUserId === userId))
        );
      },

      getUnreadAnnouncements: (userId) => {
        const state = get();
        return state.notifications.filter(
          (n) =>
            n.category === 'announcement' &&
            !n.readBy.includes(userId) &&
            (!n.expiresAt || new Date(n.expiresAt) > new Date()) &&
            // Filter by target audience - only show announcements meant for this user or for all
            (!n.targetAudience || n.targetAudience === 'all' ||
              (n.targetAudience === 'specific_user' && n.targetUserId === userId))
        );
      },

      getUnreadCount: (userId) => {
        const state = get();
        return state.notifications.filter(
          (n) =>
            !n.readBy.includes(userId) &&
            (!n.expiresAt || new Date(n.expiresAt) > new Date()) &&
            // Filter by target audience
            (!n.targetAudience || n.targetAudience === 'all' ||
              (n.targetAudience === 'specific_user' && n.targetUserId === userId))
        ).length;
      },

      generateAINotifications: () => {
        const state = get();
        const notifications: Notification[] = [];
        const now = new Date();
        const dayOfWeek = now.getDay();
        const hour = now.getHours();
        const aiAvatar = state.aiAvatars?.['ubuzima-admin'] || '/avatars/admin-avatar.png';

        // Check if we already have recent AI notifications to avoid spam
        const recentAINotifications = state.notifications.filter(
          (n) => n.source === 'rm_admin_ai' &&
          new Date(n.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
        );

        // Helper to check if notification already exists
        const alreadyNotified = (type: string, metadataKey?: string, metadataValue?: string) => {
          return recentAINotifications.some((n) => {
            if (n.type !== type) return false;
            if (metadataKey && metadataValue) {
              return n.metadata?.[metadataKey] === metadataValue;
            }
            return true;
          });
        };

        // ========== NOTIFICATIONS (App Changes, News, Updates) ==========

        // 1. NEW ARTICLE ADDED - Notify when new article is published
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const newArticles = state.articles.filter(
          (a) => new Date(a.createdAt).getTime() > oneDayAgo
        );
        if (newArticles.length > 0) {
          newArticles.forEach((article) => {
            if (!alreadyNotified('article', 'articleId', article.id)) {
              notifications.push({
                id: generateId(),
                title: '📚 New Article Available',
                content: `A new SRHR article "${article.title}" has been published. Explore the latest information on sexual and reproductive health.`,
                fullContent: `New Article Published\n\nTitle: ${article.title}\nPublished: ${new Date(article.createdAt).toLocaleDateString()}\n\nThis article contains valuable information about sexual and reproductive health topics. Click below to read the full content and enhance your knowledge.`,
                type: 'article',
                priority: 'medium',
                source: 'rm_admin_ai',
                category: 'notification',
                createdAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                isRead: false,
                readBy: [],
                actionUrl: `/srhr?article=${article.id}`,
                actionLabel: 'Read Article',
                icon: '📖',
                aiAvatar,
                metadata: { articleId: article.id },
                targetAudience: 'all',
              });
            }
          });
        }

        // 2. BAZA MUGANGA - 3 DAYS REMAINDER (Wednesday reminder)
        if (dayOfWeek === 3 && hour >= 9 && hour < 18) {
          if (!alreadyNotified('weekly_baza', 'reminderType', '3day')) {
            const bazaTopic = state.bazaMugangaTopic || 'Sexual and Reproductive Health Q&A';
            notifications.push({
              id: generateId(),
              title: '📅 Baza Muganga - 3 Days Away',
              content: `Mark your calendar! Weekly Baza Muganga is this Friday at 7:00 PM. Join us for "${bazaTopic}" with healthcare professionals.`,
              fullContent: `Baza Muganga Reminder - 3 Days to Go\n\nTopic: ${bazaTopic}\nDate: This Friday\nTime: 7:00 PM Rwanda Time\n\nThis is your opportunity to ask questions directly to healthcare professionals about hot SRHR topics. Come prepared with your questions in a safe, judgment-free environment.`,
              type: 'weekly_baza',
              priority: 'medium',
              source: 'rm_admin_ai',
              category: 'notification',
              createdAt: now.toISOString(),
              expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
              isRead: false,
              readBy: [],
              actionUrl: '/baza-muganga',
              actionLabel: 'Learn More',
              icon: '📅',
              aiAvatar,
              metadata: { reminderType: '3day' },
              targetAudience: 'all',
            });
          }
        }

        // 3. FIND SERVICES REMINDER - App feature highlight
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const servicesNotified = state.notifications.some(
          (n) => n.type === 'system' && n.title.includes('Find Health Services') && new Date(n.createdAt).getTime() > oneWeekAgo
        );
        if (!servicesNotified && dayOfWeek === 2 && hour >= 10 && hour < 14) {
          notifications.push({
            id: generateId(),
            title: '🏥 Did You Know? Find Services Near You',
            content: `You can find healthcare facilities near your location using our app. Discover hospitals, clinics, and pharmacies with just a few taps.`,
            fullContent: `App Feature Highlight\n\nOur "Find Health Services" feature helps you locate nearby healthcare facilities including:\n• Hospitals\n• Health Centers\n• Pharmacies\n• Private Clinics\n\nSimply allow location access or enter your area to see facilities with contact information and directions.`,
            type: 'system',
            priority: 'low',
            source: 'rm_admin_ai',
            category: 'notification',
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            isRead: false,
            readBy: [],
            actionUrl: '/find-service',
            actionLabel: 'Find Services',
            icon: '🏥',
            aiAvatar,
            targetAudience: 'all',
          });
        }

        // 4. NEW POSTS - Notify about new posts from AI or facilitators
        // Check for recent AI posts from specific creators
        const newPosts = state.aiPosts.filter(
          (post) => new Date(post.timestamp).getTime() > oneDayAgo && post.category !== 'daily'
        );
        if (newPosts.length > 0) {
          newPosts.forEach((post) => {
            if (!alreadyNotified('info', 'postId', post.id)) {
              const posterName = post.createdByName || post.aiType || 'RM Ubuzima';
              notifications.push({
                id: generateId(),
                title: '📰 New Post Available',
                content: `New content posted by ${posterName}: "${post.content.substring(0, 80)}${post.content.length > 80 ? '...' : ''}"`,
                fullContent: `New Post\n\nPosted by: ${posterName}\nDate: ${new Date(post.timestamp).toLocaleString()}\n\n${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}\n\nClick below to read the full post and stay informed.`,
                type: 'info',
                priority: 'medium',
                source: 'rm_admin_ai',
                category: 'notification',
                createdAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                isRead: false,
                readBy: [],
                actionUrl: '/',
                actionLabel: 'Read Post',
                icon: '📰',
                aiAvatar,
                metadata: { postId: post.id, posterName },
                targetAudience: 'all',
              });
            }
          });
        }

        // 5. Critical Appointments - URGENT (within 24 hours)
        // Only notify the specific user who owns the appointment
        const criticalAppointments = state.appointments.filter(
          (a) => a.status === 'pending' &&
          a.userId && // Only process appointments linked to a user
          new Date(a.preferredDate).getTime() > Date.now() &&
          new Date(a.preferredDate).getTime() - Date.now() < 24 * 60 * 60 * 1000
        );
        if (criticalAppointments.length > 0) {
          criticalAppointments.forEach((apt) => {
            if (!alreadyNotified('appointment', 'appointmentId', apt.id)) {
              notifications.push({
                id: generateId(),
                title: '⏰ Appointment Tomorrow',
                content: `You have an appointment scheduled for ${new Date(apt.preferredDate).toLocaleDateString()} at ${apt.preferredTime}. Please arrive 15 minutes early.`,
                fullContent: `Appointment Reminder:\n\nDate: ${new Date(apt.preferredDate).toLocaleDateString()}\nTime: ${apt.preferredTime}\nReason: ${apt.reason}\nStatus: ${apt.status}\nReference: ${apt.referenceNumber}\n\nPlease arrive 15 minutes early for check-in. If you need to reschedule, please contact us as soon as possible.`,
                type: 'appointment',
                priority: 'high',
                source: 'rm_admin_ai',
                category: 'notification',
                createdAt: now.toISOString(),
                expiresAt: new Date(apt.preferredDate).getTime() > Date.now()
                  ? new Date(new Date(apt.preferredDate).getTime() + 60 * 60 * 1000).toISOString()
                  : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                isRead: false,
                readBy: [],
                actionUrl: '/settings',
                actionLabel: 'View Details',
                icon: '📅',
                aiAvatar,
                metadata: { appointmentId: apt.id },
                targetAudience: 'specific_user',
                targetUserId: apt.userId, // Only show to the user who owns this appointment
              });
            }
          });
        }

        // Add generated notifications to state
        if (notifications.length > 0) {
          set((state) => ({
            notifications: [...notifications, ...state.notifications].slice(0, 30),
            lastNotificationCheck: now.toISOString(),
          }));
        }

        return notifications;
      },

      generateAnnouncements: () => {
        const state = get();
        const announcements: Notification[] = [];
        const now = new Date();
        const dayOfWeek = now.getDay();
        const hour = now.getHours();
        const aiAvatar = state.aiAvatars?.['ubuzima-admin'] || '/avatars/admin-avatar.png';

        // RM Admin AI Signature
        const rmAdminSignature = '\n\n— RM Admin AI\nRM Ubuzima Platform';

        // Check existing announcements
        const recentAnnouncements = state.notifications.filter(
          (n) => n.category === 'announcement' &&
          new Date(n.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
        );

        const alreadyAnnounced = (type: string) => {
          return recentAnnouncements.some((n) => n.type === type);
        };

        // ========== PROFESSIONAL ANNOUNCEMENTS (Signed by RM Admin AI) ==========

        // 1. WEEKLY BAZA MUGANGA - Tomorrow (Thursday announcement)
        if (dayOfWeek === 4 && hour >= 9 && hour < 18) {
          if (!alreadyAnnounced('weekly_baza')) {
            const bazaTopic = state.bazaMugangaTopic || 'Hot SRHR Topics Q&A';
            announcements.push({
              id: generateId(),
              title: '📢 ANNOUNCEMENT: Weekly Baza Muganga Tomorrow',
              content: `Tomorrow we host our Weekly Baza Muganga session with healthcare professionals on "${bazaTopic}". Join us Friday at 7:00 PM CAT.`,
              fullContent: `OFFICIAL ANNOUNCEMENT${rmAdminSignature}\n\nWeekly Baza Muganga Session\n\nDate: Tomorrow (Friday)\nTime: 7:00 PM CAT (Central Africa Time)\nTopic: ${bazaTopic}\nPlatform: Secure Video Conference\n\nThis is a professional healthcare session where you can ask questions anonymously to qualified healthcare providers. All discussions are confidential and conducted in a respectful, judgment-free environment.\n\nPlease join on time and prepare your questions in advance.`,
              type: 'weekly_baza',
              priority: 'high',
              source: 'rm_admin_ai',
              category: 'announcement',
              createdAt: now.toISOString(),
              expiresAt: new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString(),
              isRead: false,
              readBy: [],
              actionUrl: '/baza-muganga',
              actionLabel: 'Join Session',
              icon: '📢',
              aiAvatar,
              targetAudience: 'all',
            });
          }
        }

        // 2. TERMS AND CONDITIONS REMINDER (Monthly - professional)
        const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const termsNotified = state.notifications.some(
          (n) => n.type === 'system' && n.title.includes('Terms') && new Date(n.createdAt).getTime() > oneMonthAgo
        );
        if (!termsNotified && dayOfWeek === 1 && hour >= 10 && hour < 12) {
          announcements.push({
            id: generateId(),
            title: '📋 ANNOUNCEMENT: Platform Terms & Guidelines',
            content: `Please remember to adhere to our community guidelines and terms of use. Professional conduct ensures a safe space for everyone.`,
            fullContent: `OFFICIAL ANNOUNCEMENT${rmAdminSignature}\n\nPlatform Terms & Community Guidelines Reminder\n\nAs members of the RM Ubuzima community, we kindly remind all users to:\n\n• Respect confidentiality and privacy of all discussions\n• Maintain professional and respectful communication\n• Use anonymous features appropriately\n• Report any concerns through proper channels\n• Follow healthcare advice responsibly\n\nFor Chat:\n• No spam or promotional content\n• No harassment or discriminatory language\n• Support fellow community members\n• Keep discussions SRHR-focused\n\nViolations may result in account suspension. Thank you for helping us maintain a safe, professional environment.`,
            type: 'system',
            priority: 'medium',
            source: 'rm_admin_ai',
            category: 'announcement',
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            isRead: false,
            readBy: [],
            actionUrl: '/settings',
            actionLabel: 'View Terms',
            icon: '📋',
            aiAvatar,
            targetAudience: 'all',
          });
        }

        // 3. PLATFORM MAINTENANCE/UPDATES (As needed - professional)
        if (dayOfWeek === 0 && hour >= 8 && hour < 10) {
          if (!alreadyAnnounced('system')) {
            announcements.push({
              id: generateId(),
              title: '📢 ANNOUNCEMENT: Platform Updates',
              content: `RM Ubuzima has been updated with new features and improvements to better serve your SRHR Library needs.`,
              fullContent: `OFFICIAL ANNOUNCEMENT${rmAdminSignature}\n\nPlatform Update Notice\n\nWe have implemented updates to enhance your experience:\n\n• Improved notification system\n• Enhanced privacy features\n• New SRHR resources added\n• Performance improvements\n\nIf you experience any issues, please contact support. We remain committed to providing a secure, professional platform for sexual and reproductive health information.`,
              type: 'system',
              priority: 'low',
              source: 'rm_admin_ai',
              category: 'announcement',
              createdAt: now.toISOString(),
              expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              isRead: false,
              readBy: [],
              actionUrl: '/settings',
              actionLabel: 'Learn More',
              icon: '📢',
              aiAvatar,
              targetAudience: 'all',
            });
          }
        }

        // Add generated announcements to state
        if (announcements.length > 0) {
          set((state) => ({
            notifications: [...announcements, ...state.notifications].slice(0, 30),
          }));
        }

        return announcements;
      },

      clearExpiredNotifications: () => {
        set((state) => ({
          notifications: state.notifications.filter(
            (n) => !n.expiresAt || new Date(n.expiresAt) > new Date()
          ),
        }));
      },

      // RM Admin AI Floating Messages Implementation
      addRMAdminMessage: (message) => {
        const newMessage: RMAdminAIMessage = {
          ...message,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          rmAdminMessages: [...state.rmAdminMessages, newMessage],
        }));
        return newMessage;
      },

      removeRMAdminMessage: (id) => {
        set((state) => ({
          rmAdminMessages: state.rmAdminMessages.filter((m) => m.id !== id),
        }));
      },

      hideRMAdminMessage: (id) => {
        set((state) => ({
          rmAdminMessages: state.rmAdminMessages.map((m) =>
            m.id === id ? { ...m, isVisible: false } : m
          ),
        }));
      },

      showRMAdminMessage: (id, position) => {
        set((state) => ({
          rmAdminMessages: state.rmAdminMessages.map((m) =>
            m.id === id ? { ...m, isVisible: true, position } : m
          ),
        }));
      },

      updateRMAdminPosition: (id, position) => {
        set((state) => ({
          rmAdminMessages: state.rmAdminMessages.map((m) =>
            m.id === id ? { ...m, position } : m
          ),
        }));
      },

      generateWelcomeMessage: (userId, userName, page) => {
        const state = get();
        const now = new Date();
        const pageKey = `welcome_${page}`;

        // Check if welcome message was already shown today for this page
        const lastWelcomeTime = state.lastMessageTimes[`${userId}_${pageKey}`] || 0;
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (lastWelcomeTime > oneDayAgo) {
          return null; // Already shown welcome for this page today
        }

        const welcomeMessages = [
          `Welcome to RM Ubuzima, ${userName}! I'm your AI admin assistant. Feel free to explore or ask me anything.`,
          `Hello ${userName}! Welcome back. I'm here to help you navigate RM Ubuzima.`,
          `Welcome ${userName}! Your sexual and reproductive health journey starts here. How can I assist you today?`,
        ];
        const message = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        const newMessage: RMAdminAIMessage = {
          id: generateId(),
          content: message,
          type: 'welcome',
          duration: 8000, // 8 seconds
          position: { x: window.innerWidth - 350, y: 100 },
          isVisible: true,
          userId,
          page,
          createdAt: now.toISOString(),
        };
        set((state) => ({
          rmAdminMessages: [...state.rmAdminMessages, newMessage],
          lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${pageKey}`]: Date.now() },
        }));
        return newMessage;
      },

      generateGuidanceMessage: (userId, context, page) => {
        const state = get();
        const now = new Date();
        const pageKey = `guidance_${page}`;

        // Check if guidance message was already shown today for this page
        const lastGuidanceTime = state.lastMessageTimes[`${userId}_${pageKey}`] || 0;
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (lastGuidanceTime > oneDayAgo) {
          return null; // Already shown guidance for this page today
        }

        const guidanceMap: Record<string, string> = {
          'home': 'Explore our Daily Feed for SRHR content, or check the menu for services.',
          'chat': 'Join the community chat to connect with others. Remember to be respectful and supportive.',
          'srhr-info': 'Browse our articles to learn more about sexual and reproductive health topics.',
          'emergency': 'If this is an emergency, please call one of the emergency contacts immediately.',
          'settings': 'Update your preferences here. You can also schedule appointments and view your history.',
          'baza-muganga': 'Join our weekly live Q&A sessions with healthcare professionals every Friday at 7 PM.',
          'inbox': 'Check your private messages here. Only you can see these conversations.',
        };
        const content = guidanceMap[context] || 'How can I help you today?';
        const newMessage: RMAdminAIMessage = {
          id: generateId(),
          content,
          type: 'guidance',
          duration: 6000, // 6 seconds
          position: { x: window.innerWidth - 350, y: 100 },
          isVisible: true,
          userId,
          page,
          createdAt: now.toISOString(),
        };
        set((state) => ({
          rmAdminMessages: [...state.rmAdminMessages, newMessage],
          lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${pageKey}`]: Date.now() },
        }));
        return newMessage;
      },

      generateHomeEngagementMessage: (userId) => {
        const state = get();
        const now = new Date();
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        // Rate limiting: Max 2 messages per hour
        const recentMessages = state.rmAdminMessages.filter(
          (m) => m.userId === userId && new Date(m.createdAt).getTime() > oneHourAgo
        );
        if (recentMessages.length >= 2) {
          return null; // Already sent 2 messages this hour
        }

        // Get already shown message types to avoid repetition
        const shownMessageTypes = new Set(
          state.rmAdminMessages
            .filter((m) => m.userId === userId && new Date(m.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000)
            .map((m) => m.content)
        );

        // Check for priority posts (news category or special posts)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const priorityPosts = state.aiPosts.filter(
          (post) => post.category === 'news' && new Date(post.timestamp).getTime() > oneDayAgo
        );
        for (const newsPost of priorityPosts) {
          const posterName = newsPost.createdByName || newsPost.aiType || 'RM Ubuzima';
          const message = `📰 Breaking news: ${posterName} just posted an important update. Check it out!`;
          if (!shownMessageTypes.has(message)) {
            const newMessage: RMAdminAIMessage = {
              id: generateId(),
              content: message,
              type: 'private_notification',
              duration: 7000,
              position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
              isVisible: true,
              userId,
              createdAt: now.toISOString(),
            };
            set((state) => ({
              rmAdminMessages: [...state.rmAdminMessages, newMessage],
            }));
            return newMessage;
          }
        }

        // Check for facilitator posts from followed facilitators
        const userFollows = state.follows.filter((f) => f.followerId === userId);
        const followedFacilitatorIds = userFollows
          .filter((f) => f.followingType === 'facilitator')
          .map((f) => f.followingId);
        const recentFacilitatorPosts = state.aiPosts.filter(
          (post) =>
            post.createdBy && followedFacilitatorIds.includes(post.createdBy) &&
            new Date(post.timestamp).getTime() > oneDayAgo
        );
        for (const post of recentFacilitatorPosts.slice(0, 1)) {
          const facilitator = state.chatSettings?.facilitators?.find((f) => f.userId === post.createdBy);
          const facilitatorName = facilitator?.userName || post.createdByName || 'A facilitator you follow';
          const messages = [
            `${facilitatorName} just shared a new post. Check it out!`,
            `New content from ${facilitatorName} is available on the Daily Feed.`,
            `A facilitator you follow has posted something interesting!`,
          ];
          for (const message of messages) {
            if (!shownMessageTypes.has(message)) {
              const newMessage: RMAdminAIMessage = {
                id: generateId(),
                content: message,
                type: 'private_notification',
                duration: 7000,
                position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
                isVisible: true,
                userId,
                createdAt: now.toISOString(),
              };
              set((state) => ({
                rmAdminMessages: [...state.rmAdminMessages, newMessage],
              }));
              return newMessage;
            }
          }
        }

        // Check for general posts from followed accounts
        const followedIds = state.follows.filter((f) => f.followerId === userId).map((f) => f.followingId);
        const recentPosts = state.aiPosts.filter(
          (post) =>
            followedIds.includes(post.createdBy || post.aiType) &&
            new Date(post.timestamp).getTime() > oneDayAgo &&
            post.category !== 'news'
        );
        if (recentPosts.length > 0) {
          const messages = [
            'Someone you follow just posted new content!',
            'New updates available from accounts you follow.',
            `There are ${recentPosts.length} new post${recentPosts.length > 1 ? 's' : ''} from people you follow!`,
          ];
          for (const message of messages) {
            if (!shownMessageTypes.has(message)) {
              const newMessage: RMAdminAIMessage = {
                id: generateId(),
                content: message,
                type: 'private_notification',
                duration: 7000,
                position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
                isVisible: true,
                userId,
                createdAt: now.toISOString(),
              };
              set((state) => ({
                rmAdminMessages: [...state.rmAdminMessages, newMessage],
              }));
              return newMessage;
            }
          }
        }

        // General engagement messages (fallback)
        const generalMessages = [
          'Welcome to RM Ubuzima! Explore the latest SRHR content on your Daily Feed.',
          'Stay informed with our latest articles and community updates.',
          'Your Daily Feed has fresh content waiting for you!',
          'Discover new SRHR resources and connect with the community.',
          'Check out the latest posts from our community members!',
        ];
        for (const message of generalMessages) {
          if (!shownMessageTypes.has(message)) {
            const newMessage: RMAdminAIMessage = {
              id: generateId(),
              content: message,
              type: 'tip',
              duration: 7000,
              position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
              isVisible: true,
              userId,
              createdAt: now.toISOString(),
            };
            set((state) => ({
              rmAdminMessages: [...state.rmAdminMessages, newMessage],
            }));
            return newMessage;
          }
        }

        return null; // No new messages to show
      },

      // ========== SRHR PAGE ENGAGEMENT ==========
      generateSRHREngagementMessage: (userId) => {
        const state = get();
        const now = new Date();
        const pageKey = 'srhr';

        // Rate limiting: Max 1 message per hour per page
        const lastTime = state.lastMessageTimes[`${userId}_${pageKey}`] || 0;
        const timeSinceLastMessage = Date.now() - lastTime;
        if (timeSinceLastMessage < 60 * 60 * 1000) return null;

        const shownMessageTypes = new Set(
          state.rmAdminMessages
            .filter((m) => m.userId === userId && new Date(m.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000)
            .map((m) => m.content)
        );

        // 1. NEW ARTICLES (highest priority)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const newArticles = state.articles.filter(
          (a) => new Date(a.createdAt).getTime() > oneDayAgo
        );
        if (newArticles.length > 0) {
          const article = newArticles[0];
          const messages = [
            `📚 New article: "${article.title.substring(0, 50)}${article.title.length > 50 ? '...' : ''}" Click to read!`,
            `Fresh SRHR content just added! Check out "${article.title.substring(0, 40)}..."`,
            `New educational resource just published! Tap to explore and enhance your knowledge.`,
          ];
          for (const message of messages) {
            if (!shownMessageTypes.has(message)) {
              const newMessage: RMAdminAIMessage = {
                id: generateId(),
                content: message,
                type: 'private_notification',
                duration: 7000,
                position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
                isVisible: true,
                userId,
                createdAt: now.toISOString(),
              };
              set((state) => ({
                rmAdminMessages: [...state.rmAdminMessages, newMessage],
                lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${pageKey}`]: Date.now() },
              }));
              return newMessage;
            }
          }
        }

        // 2. SRHR TOPICS
        if (state.topics.length > 0) {
          const messages = [
            `💡 Did you know? We have ${state.topics.length} SRHR topics to explore. Find what interests you!`,
            `Learn about different aspects of sexual and reproductive health in our Topics section.`,
            `Knowledge is power! Browse our ${state.topics.length} SRHR educational topics.`,
          ];
          for (const message of messages) {
            if (!shownMessageTypes.has(message)) {
              const newMessage: RMAdminAIMessage = {
                id: generateId(),
                content: message,
                type: 'tip',
                duration: 7000,
                position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
                isVisible: true,
                userId,
                createdAt: now.toISOString(),
              };
              set((state) => ({
                rmAdminMessages: [...state.rmAdminMessages, newMessage],
                lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${pageKey}`]: Date.now() },
              }));
              return newMessage;
            }
          }
        }

        // 3. BOOKMARK/FAVORITE REMINDER
        const messages = [
          'Bookmark articles you find useful to read them again later!',
          'SRHR Library is constantly updated. Check back regularly for new content!',
          'Have questions about what you read? Click on me to chat with RM Admin AI!',
        ];
        for (const message of messages) {
          if (!shownMessageTypes.has(message)) {
            const newMessage: RMAdminAIMessage = {
              id: generateId(),
              content: message,
              type: 'tip',
              duration: 7000,
              position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
              isVisible: true,
              userId,
              createdAt: now.toISOString(),
            };
            set((state) => ({
              rmAdminMessages: [...state.rmAdminMessages, newMessage],
              lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${pageKey}`]: Date.now() },
            }));
            return newMessage;
          }
        }

        return null;
      },

      // ========== CHAT PAGE ENGAGEMENT ==========
      generateChatEngagementMessage: (userId) => {
        const state = get();
        const now = new Date();
        const pageKey = 'chat';

        // Rate limiting: Max 1 message per hour per page
        const lastTime = state.lastMessageTimes[`${userId}_${pageKey}`] || 0;
        if (Date.now() - lastTime < 60 * 60 * 1000) return null;

        const shownMessageTypes = new Set(
          state.rmAdminMessages
            .filter((m) => m.userId === userId && new Date(m.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000)
            .map((m) => m.content)
        );

        // 1. FACILITATORS AVAILABLE
        const onlineFacilitators = state.chatSettings?.facilitators?.filter((f) => f.isOnline) || [];
        if (onlineFacilitators.length > 0) {
          const messages = [
            `👥 ${onlineFacilitators.length} facilitator${onlineFacilitators.length > 1 ? 's are' : ' is'} online now! Feel free to ask questions.`,
            `Good news! ${onlineFacilitators.length} trained facilitator${onlineFacilitators.length > 1 ? 's are' : ' is'} available to help in the chat.`,
            `Facilitators are standing by to support the community discussion.`,
          ];
          for (const message of messages) {
            if (!shownMessageTypes.has(message)) {
              const newMessage: RMAdminAIMessage = {
                id: generateId(),
                content: message,
                type: 'private_notification',
                duration: 7000,
                position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
                isVisible: true,
                userId,
                createdAt: now.toISOString(),
              };
              set((state) => ({
                rmAdminMessages: [...state.rmAdminMessages, newMessage],
                lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${pageKey}`]: Date.now() },
              }));
              return newMessage;
            }
          }
        }

        // 2. HEALTHCARE PROVIDERS
        const messages = [
          '💬 This is a safe space. Healthcare providers and facilitators monitor this chat to provide accurate information.',
          'Need professional advice? Our healthcare providers review chat discussions regularly.',
          'Remember: Chat is anonymous. Feel free to share and ask questions openly!',
        ];
        for (const message of messages) {
          if (!shownMessageTypes.has(message)) {
            const newMessage: RMAdminAIMessage = {
              id: generateId(),
              content: message,
              type: 'tip',
              duration: 7000,
              position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
              isVisible: true,
              userId,
              createdAt: now.toISOString(),
            };
            set((state) => ({
              rmAdminMessages: [...state.rmAdminMessages, newMessage],
              lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${pageKey}`]: Date.now() },
            }));
            return newMessage;
          }
        }

        return null;
      },

      // ========== SERVICES PAGE ENGAGEMENT ==========
      generateServicesEngagementMessage: (userId) => {
        const state = get();
        const now = new Date();
        const pageKey = 'services';

        // Rate limiting: Max 1 message per hour per page
        const lastTime = state.lastMessageTimes[`${userId}_${pageKey}`] || 0;
        if (Date.now() - lastTime < 60 * 60 * 1000) return null;

        const shownMessageTypes = new Set(
          state.rmAdminMessages
            .filter((m) => m.userId === userId && new Date(m.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000)
            .map((m) => m.content)
        );

        // 1. BAZA MUGANGA - TRENDING
        const dayOfWeek = now.getDay();
        if (dayOfWeek === 5 || dayOfWeek === 4) {
          const bazaTopic = state.bazaMugangaTopic || 'Hot SRHR Topics';
          const messages = [
            `🔥 Trending now: Weekly Baza Muganga is ${dayOfWeek === 5 ? 'today' : 'tomorrow'} at 7:00 PM! Topic: "${bazaTopic}"`,
            `Don't miss out! Baza Muganga ${dayOfWeek === 5 ? 'starts soon' : 'is tomorrow'} - join the live Q&A with healthcare professionals.`,
          ];
          for (const message of messages) {
            if (!shownMessageTypes.has(message)) {
              const newMessage: RMAdminAIMessage = {
                id: generateId(),
                content: message,
                type: 'private_notification',
                duration: 7000,
                position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
                isVisible: true,
                userId,
                createdAt: now.toISOString(),
              };
              set((state) => ({
                rmAdminMessages: [...state.rmAdminMessages, newMessage],
                lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${pageKey}`]: Date.now() },
              }));
              return newMessage;
            }
          }
        }

        // 2. MOST NEEDED SERVICES - Based on time/context
        const hour = now.getHours();
        if (hour >= 18 || hour <= 6) {
          const messages = [
            '🌙 Evening hours: Emergency services are available 24/7 if you need urgent assistance.',
            'Need help after hours? Emergency contacts and Book Doctor services are always available.',
          ];
          for (const message of messages) {
            if (!shownMessageTypes.has(message)) {
              const newMessage: RMAdminAIMessage = {
                id: generateId(),
                content: message,
                type: 'tip',
                duration: 7000,
                position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
                isVisible: true,
                userId,
                createdAt: now.toISOString(),
              };
              set((state) => ({
                rmAdminMessages: [...state.rmAdminMessages, newMessage],
                lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${pageKey}`]: Date.now() },
              }));
              return newMessage;
            }
          }
        }

        // 3. APPOINTMENTS REMINDER
        // Filter by userId (for new appointments) or email (for legacy appointments)
        const userAppointments = state.appointments.filter(
          (a) =>
            a.status === 'pending' &&
            (a.userId === userId || a.email === state.savedUser?.email)
        );
        if (userAppointments.length > 0) {
          const messages = [
            `📅 You have ${userAppointments.length} upcoming appointment${userAppointments.length > 1 ? 's' : ''}. View details in your appointments.`,
            'Remember to check your appointment schedule and prepare any questions for your healthcare provider.',
          ];
          for (const message of messages) {
            if (!shownMessageTypes.has(message)) {
              const newMessage: RMAdminAIMessage = {
                id: generateId(),
                content: message,
                type: 'private_notification',
                duration: 7000,
                position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
                isVisible: true,
                userId,
                createdAt: now.toISOString(),
              };
              set((state) => ({
                rmAdminMessages: [...state.rmAdminMessages, newMessage],
                lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${pageKey}`]: Date.now() },
              }));
              return newMessage;
            }
          }
        }

        // 4. GENERAL SERVICES ENGAGEMENT
        const messages = [
          '💡 Tip: You can find healthcare facilities near you using our Find Health Services feature!',
          'Need to talk to a doctor privately? Use the Book Doctor service for confidential consultations.',
          'Explore all our SRHR services designed to support your health journey.',
        ];
        for (const message of messages) {
          if (!shownMessageTypes.has(message)) {
            const newMessage: RMAdminAIMessage = {
              id: generateId(),
              content: message,
              type: 'tip',
              duration: 7000,
              position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
              isVisible: true,
              userId,
              createdAt: now.toISOString(),
            };
            set((state) => ({
              rmAdminMessages: [...state.rmAdminMessages, newMessage],
              lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${pageKey}`]: Date.now() },
            }));
            return newMessage;
          }
        }

        return null;
      },

      // ========== PAGE-SPECIFIC ENGAGEMENT (for individual service pages) ==========
      generatePageEngagementMessage: (userId, page) => {
        const state = get();
        const now = new Date();

        // Rate limiting: Max 1 message per hour per page
        const lastTime = state.lastMessageTimes[`${userId}_${page}`] || 0;
        if (Date.now() - lastTime < 60 * 60 * 1000) return null;

        const shownMessageTypes = new Set(
          state.rmAdminMessages
            .filter((m) => m.userId === userId && new Date(m.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000)
            .map((m) => m.content)
        );

        const pageMessages: Record<string, string[]> = {
          'baza-muganga': [
            '🔥 Join our weekly live Q&A! Ask healthcare professionals anything about SRHR.',
            'Baza Muganga happens every Friday at 7:00 PM. Mark your calendar!',
            'Have burning SRHR questions? Baza Muganga is the perfect place to get answers.',
          ],
          'book-doctor': [
            '👨‍⚕️ Need a private consultation? Book an appointment with a healthcare provider.',
            'Your health matters. Schedule a confidential appointment today.',
            'Professional healthcare advice is just one booking away.',
          ],
          'emergency': [
            '🚨 If this is a medical emergency, call emergency services immediately!',
            'Emergency contacts are available 24/7. Do not hesitate to seek help.',
            'Your safety is priority. Use these contacts for urgent medical situations.',
          ],
          'find-service': [
            '🏥 Find hospitals, clinics, and pharmacies near your location.',
            'Need healthcare nearby? Use our location-based service finder.',
            'Discover trusted healthcare facilities in your area with just a few taps.',
          ],
          'mpuza': [
            '🤝 Connect with the right people through Mpuza.',
            'Find legal aid, family planning, and GBV support.',
            'Mpuza helps you meet those who can help you.',
          ],
        };

        const messages = pageMessages[page] || ['Explore this page to discover helpful SRHR resources!'];
        for (const message of messages) {
          if (!shownMessageTypes.has(message)) {
            const newMessage: RMAdminAIMessage = {
              id: generateId(),
              content: message,
              type: 'guidance',
              duration: 7000,
              position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
              isVisible: true,
              userId,
              createdAt: now.toISOString(),
            };
            set((state) => ({
              rmAdminMessages: [...state.rmAdminMessages, newMessage],
              lastMessageTimes: { ...state.lastMessageTimes, [`${userId}_${page}`]: Date.now() },
            }));
            return newMessage;
          }
        }

        return null;
      },

      // ========== USER ACTIVITY TRACKING ==========
      trackUserActivity: (userId, activity, metadata) => {
        const newActivity: UserActivity = {
          id: generateId(),
          userId,
          activity,
          metadata,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          userActivities: [...state.userActivities.slice(-99), newActivity], // Keep last 100 activities
        }));
      },

      getUserActivity: (userId) => {
        const state = get();
        return state.userActivities.filter((a) => a.userId === userId);
      },

      getLastMessageTime: (userId, page) => {
        const state = get();
        return state.lastMessageTimes[`${userId}_${page}`] || 0;
      },

      // ========== USER PROFILE MANAGEMENT ==========
      canEditProfile: (userId) => {
        const state = get();
        const user = state.users.find((u) => u.id === userId) || state.savedUser;
        
        if (!user?.lastProfileEdit) {
          return { canEdit: true };
        }

        const lastEdit = new Date(user.lastProfileEdit);
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        
        // Can edit if last edit was more than a month ago
        const canEdit = lastEdit <= oneMonthAgo;
        
        // Calculate next edit date (1 month from last edit)
        const nextEditDate = new Date(lastEdit.getFullYear(), lastEdit.getMonth() + 1, lastEdit.getDate());
        
        return { canEdit, nextEditDate: canEdit ? undefined : nextEditDate };
      },

      updateUserProfile: async (userId, updates) => {
        const state = get();
        const { canEdit, nextEditDate } = state.canEditProfile(userId);
        
        if (!canEdit) {
          return { success: false, canEdit: false, nextEditDate, error: 'Profile can only be edited once per month' };
        }

        const now = new Date().toISOString();
        const updatedFields = {
          ...updates,
          lastProfileEdit: now,
        };

        try {
          // Update in users array
          const userIndex = state.users.findIndex((u) => u.id === userId);
          if (userIndex !== -1) {
            const updatedUser = { ...state.users[userIndex], ...updatedFields };
            
            // Update local state
            set((state) => ({
              users: state.users.map((u) => (u.id === userId ? updatedUser : u)),
              savedUser: state.savedUser?.id === userId ? updatedUser : state.savedUser,
            }));

            // Sync to Firestore if available
            try {
              const { updateUserInFirebase } = await import('../services/firebaseService');
              await updateUserInFirebase(userId, updatedFields);
            } catch (firebaseError) {
              console.warn('[Store] Firebase update failed, keeping local changes:', firebaseError);
              // Local changes are already applied, continue with success
            }

            return { success: true, canEdit: true };
          }

          // If user not in array but is savedUser
          if (state.savedUser?.id === userId) {
            const updatedUser = { ...state.savedUser, ...updatedFields };
            set({ savedUser: updatedUser });

            // Also add to users array for persistence
            set((state) => ({
              users: [...state.users, updatedUser],
            }));

            // Sync to Firestore
            try {
              const { updateUserInFirebase } = await import('../services/firebaseService');
              await updateUserInFirebase(userId, updatedFields);
            } catch (firebaseError) {
              console.warn('[Store] Firebase update failed, keeping local changes:', firebaseError);
            }

            return { success: true, canEdit: true };
          }

          return { success: false, canEdit: true, error: 'User not found' };
        } catch (error) {
          console.error('[Store] Error updating user profile:', error);
          return { success: false, canEdit: true, error: 'Failed to update profile' };
        }
      },

      // ========== ADMIN USER MANAGEMENT ==========
      adminUpdateUserName: async (userId, newName) => {
        if (!newName.trim()) return false;
        
        try {
          // Update in Firebase
          const { adminUpdateUserNameInFirebase } = await import('../services/firebaseService');
          const success = await adminUpdateUserNameInFirebase(userId, newName.trim(), 'admin');
          
          if (!success) {
            console.error('[Store] Failed to update user name in Firebase');
            return false;
          }
          
          // Update in local users array
          const state = get();
          const userIndex = state.users.findIndex((u) => u.id === userId);
          if (userIndex !== -1) {
            const updatedUsers = [...state.users];
            updatedUsers[userIndex] = {
              ...updatedUsers[userIndex],
              name: newName.trim(),
            };
            set({ users: updatedUsers });
          }
          
          // Update savedUser if it's the same user
          if (state.savedUser?.id === userId) {
            set({
              savedUser: {
                ...state.savedUser,
                name: newName.trim(),
              },
            });
          }
          
          console.log('[Store] User name updated by admin:', userId, '->', newName.trim());
          return true;
        } catch (error) {
          console.error('[Store] Error updating user name:', error);
          return false;
        }
      },

      getAllUsers: async () => {
        try {
          const { getAllUsersFromFirebase } = await import('../services/firebaseService');
          const users = await getAllUsersFromFirebase();
          
          // Update local users array with fetched users
          if (users.length > 0) {
            set({ users: users as User[] });
          }
          
          return users as User[];
        } catch (error) {
          console.error('[Store] Error getting all users:', error);
          // Return local users if Firebase fails
          return get().users;
        }
      }
    })
  );

// ============== EPHEMERAL STATE (sessionStorage) ==============

interface EphemeralState {
  session: Session | null;
  decoyMode: boolean;
  lowDataMode: boolean;
  highContrastMode: boolean;
  currentPage: string;
  loadingStates: Record<string, boolean>;
  postViews: Record<string, number>;
  chatFullScreen: boolean;
  
  // Actions
  createSession: (userData: Partial<User> & { name: string; email: string }, persistent: boolean) => User;
  endSession: () => void;
  toggleDecoyMode: () => void;
  toggleLowDataMode: () => void;
  toggleHighContrastMode: () => void;
  setCurrentPage: (page: string) => void;
  setLoading: (key: string, loading: boolean) => void;
  incrementPostView: (postId: string) => void;
  setChatFullScreen: (fullScreen: boolean) => void;
  clearEphemeralData: () => void;
}

export const useEphemeralStore = create<EphemeralState>()(
  persist(
    (set, get) => ({
      // Initial State
      session: null,
      decoyMode: false,
      lowDataMode: false,
      highContrastMode: false,
      currentPage: '/',
      loadingStates: {},
      postViews: {},
      chatFullScreen: false,

      // Actions
      createSession: (userData: Partial<User> & { name: string; email: string }, persistent) => {
        // Use existing user ID if provided, otherwise generate new one
        const user: User = {
          id: userData.id || generateId(),
          name: userData.name || generateAnonymousName(),
          email: userData.email || '',
          avatar: userData.avatar || getRandomAvatar(),
          createdAt: userData.createdAt || new Date().toISOString(),
          // CRITICAL: Preserve facilitator status from Firestore user document
          isFacilitator: userData.isFacilitator,
          facilitatorAssignedAt: userData.facilitatorAssignedAt,
          facilitatorAssignedBy: userData.facilitatorAssignedBy,
          facilitatorRole: userData.facilitatorRole,
          facilitatorBadges: userData.facilitatorBadges,
          facilitatorPermissions: userData.facilitatorPermissions,
        };

        const session: Session = {
          user,
          startTime: new Date().toISOString(),
          isPersistent: persistent,
        };

        set({ session });

        // Also save to persistent store if remember me
        // Only update savedUser if we have new data - don't overwrite existing facilitator data
        if (persistent) {
          const currentSavedUser = usePersistentStore.getState().savedUser;
          if (currentSavedUser?.id === user.id) {
            // Merge with existing saved user data to preserve any fields we might have missed
            usePersistentStore.getState().setSavedUser({
              ...currentSavedUser,
              ...user,
              // Ensure facilitator data is preserved
              isFacilitator: user.isFacilitator ?? currentSavedUser.isFacilitator,
              facilitatorAssignedAt: user.facilitatorAssignedAt ?? currentSavedUser.facilitatorAssignedAt,
              facilitatorAssignedBy: user.facilitatorAssignedBy ?? currentSavedUser.facilitatorAssignedBy,
              facilitatorRole: user.facilitatorRole ?? currentSavedUser.facilitatorRole,
              facilitatorBadges: user.facilitatorBadges ?? currentSavedUser.facilitatorBadges,
              facilitatorPermissions: user.facilitatorPermissions ?? currentSavedUser.facilitatorPermissions,
            });
          } else {
            usePersistentStore.getState().setSavedUser(user);
          }
        }

        return user;
      },

      endSession: () => {
        set({ session: null });
      },

      toggleDecoyMode: () => {
        set((state) => ({ decoyMode: !state.decoyMode }));
      },

      toggleLowDataMode: () => {
        set((state) => ({ lowDataMode: !state.lowDataMode }));
      },

      toggleHighContrastMode: () => {
        set((state) => ({ highContrastMode: !state.highContrastMode }));
      },

      setCurrentPage: (page) => set({ currentPage: page }),

      setLoading: (key, loading) => {
        set((state) => ({
          loadingStates: { ...state.loadingStates, [key]: loading },
        }));
      },

      incrementPostView: (postId) => {
        set((state) => ({
          postViews: {
            ...state.postViews,
            [postId]: (state.postViews[postId] || 0) + 1,
          },
        }));
      },

      setChatFullScreen: (fullScreen) => {
        set({ chatFullScreen: fullScreen });
      },

      clearEphemeralData: () => {
        set({
          session: null,
          decoyMode: false,
          lowDataMode: false,
          highContrastMode: false,
          currentPage: '/',
          loadingStates: {},
          postViews: {},
          chatFullScreen: false,
        });
      },
    }),
    {
      name: 'rm-ubuzima-ephemeral',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

// Export local storage store for group profile photos (WhatsApp-style local storage)
export { useLocalStorageStore, getGroupPhotosStorageUsage, getGroupPhotosStorageWarning } from './localStorageStore';
