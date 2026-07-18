import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistentStore, useEphemeralStore } from '../store';
import type { AIPost, StatusUpdate, Organization } from '../types';
import { getRelativeTime, cn } from '../utils/helpers';
import { Heart, User, Calendar, Building2, ArrowUpRight, ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react';
import { VideoPlayer, YouTubePlayer } from '../components/VideoPlayer';
import { useVideo } from '../contexts/VideoContext';
import NotificationBell from '../components/NotificationBell';
import ProfileModal from '../components/ProfileModal';
import RMAdminAIButton from '../components/RMAdminAIButton';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { 
    aiPosts, 
    aiAvatars, 
    platformLogo, 
    carouselPhotos, 
    statusUpdates,
    organizations,
  } = usePersistentStore();
  const { 
    session,
    incrementPostView 
  } = useEphemeralStore();
  const { pauseAllVideos } = useVideo();

  const [selectedStatus, setSelectedStatus] = useState<StatusUpdate | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showUbuzimaHelper, setShowUbuzimaHelper] = useState(false);
  const [helperMessage, setHelperMessage] = useState('');
  const [expandedPost, setExpandedPost] = useState<AIPost | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Phone back button navigation for modals
  usePhoneBackNavigation({
    isOpen: !!expandedPost,
    onClose: () => {
      pauseAllVideos();
      setExpandedPost(null);
    },
    modalId: 'expanded-post'
  });

  usePhoneBackNavigation({
    isOpen: !!selectedStatus,
    onClose: () => {
      pauseAllVideos();
      setSelectedStatus(null);
    },
    modalId: 'status-viewer'
  });

  usePhoneBackNavigation({
    isOpen: showProfileModal,
    onClose: () => setShowProfileModal(false),
    modalId: 'profile-modal'
  });

  usePhoneBackNavigation({
    isOpen: showUbuzimaHelper,
    onClose: () => setShowUbuzimaHelper(false),
    modalId: 'ubuzima-helper'
  });

  // Get personalized feed using the algorithm
  const { getPersonalizedFeed, follow, unfollow, isFollowing } = usePersistentStore();
  const userId = session?.user.id;
  
  // Use personalized feed if user is logged in, otherwise use chronological
  const filteredPosts = userId 
    ? getPersonalizedFeed(userId)
    : aiPosts.filter((post) => post.isActive)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const activeStatuses = statusUpdates.filter((status) => {
    const expiresAt = new Date(status.expiresAt);
    return expiresAt > new Date();
  });

  useEffect(() => {
    if (carouselPhotos.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselPhotos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselPhotos.length]);

  const handlePostClick = (postId: string) => {
    incrementPostView(postId);
    // Also update the persistent store to save the view count
    const { aiPosts, updateAIPost, trackEngagement } = usePersistentStore.getState();
    const post = aiPosts.find(p => p.id === postId);
    if (post) {
      updateAIPost(postId, { views: (post.views || 0) + 1 });
      // Track engagement for logged in users
      if (userId) {
        trackEngagement({
          userId,
          postId,
          aiType: post.aiType,
        });
      }
    }
  };

  const handleReadMore = (e: React.MouseEvent, post: AIPost) => {
    e.stopPropagation();
    setExpandedPost(post);
    incrementPostView(post.id);
    // Also update the persistent store to save the view count
    const { updateAIPost, trackEngagement } = usePersistentStore.getState();
    updateAIPost(post.id, { views: (post.views || 0) + 1 });
    // Track engagement for logged in users
    if (userId) {
      trackEngagement({
        userId,
        postId: post.id,
        aiType: post.aiType,
      });
    }
  };

  const handleStatusClick = (status: StatusUpdate) => {
    // Pause any playing video before opening status
    pauseAllVideos();
    setSelectedStatus(status);
    if (session?.user.id) {
      usePersistentStore.getState().markStatusViewed(status.id, session.user.id);
    }
  };

  const handleCloseStatus = () => {
    pauseAllVideos();
    setSelectedStatus(null);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselPhotos.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselPhotos.length) % carouselPhotos.length);
  };

  const askUbuzima = (question: string) => {
    setShowUbuzimaHelper(true);
    setHelperMessage('Thinking...');
    setTimeout(() => {
      const responses: Record<string, string> = {
        'find': 'I can help you find the nearest health facility. Click on "Find Service" in the menu below.',
        'emergency': 'For emergencies, please call 112 or go to the nearest hospital immediately.',
        'appointment': 'You can book an online consultation with a SRHR healthcare provider through the "Book SRHR Provider" option.',
        'help': 'I am Ubuzima, your SRHR assistant. I can help you find services, answer questions, or guide you to resources.',
      };
      const response = responses[question.toLowerCase()] || 'I am here to help with SRHR information and guide you to appropriate services. How can I assist you today?';
      setHelperMessage(response);
    }, 1000);
  };

  return (
    <div className="min-h-full bg-white">
      {/* Ubuzima Helper Popup */}
      {showUbuzimaHelper && (
        <div className="fixed inset-0 z-50 flex items-end justify-start p-4 pointer-events-none">
          <div className="bg-white border border-cool-200 rounded-2xl p-4 max-w-sm w-full shadow-2xl pointer-events-auto mb-20 ml-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-cool-100 rounded-full flex items-center justify-center overflow-hidden">
                <span className="text-2xl">Lion</span>
              </div>
              <div>
                <h3 className="font-semibold text-cool-900 text-sm">Ubuzima Assistant</h3>
                <p className="text-xs text-cool-500">Always here to help</p>
              </div>
              <button 
                onClick={() => setShowUbuzimaHelper(false)}
                className="ml-auto p-1 text-cool-400 hover:text-cool-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-cool-50 rounded-xl p-3 mb-3">
              <p className="text-sm text-cool-700">{helperMessage}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => askUbuzima('find')}
                className="flex items-center gap-2 px-3 py-2 bg-cool-100 rounded-lg text-sm text-cool-700 hover:bg-cool-200"
              >
                <MapPin className="w-4 h-4" />
                Find Service
              </button>
              <button
                onClick={() => askUbuzima('appointment')}
                className="flex items-center gap-2 px-3 py-2 bg-cool-100 rounded-lg text-sm text-cool-700 hover:bg-cool-200"
              >
                <User className="w-4 h-4" />
                Book SRHR Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Viewer Modal */}
      {selectedStatus && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button 
            onClick={handleCloseStatus}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <X className="w-8 h-8" />
          </button>
          <div className="w-full max-w-lg p-4">
            {selectedStatus.type === 'image' && selectedStatus.mediaUrl && (
              <img src={selectedStatus.mediaUrl} alt="Status" className="w-full rounded-lg" />
            )}
            {selectedStatus.type === 'video' && selectedStatus.mediaUrl && (
              <>
                {selectedStatus.mediaUrl.includes('youtube.com') || selectedStatus.mediaUrl.includes('youtu.be') ? (
                  <YouTubePlayer
                    src={selectedStatus.mediaUrl}
                    className="aspect-video w-full rounded-lg"
                    videoId={`status-${selectedStatus.id}`}
                  />
                ) : (
                  <VideoPlayer 
                    src={selectedStatus.mediaUrl} 
                    autoPlay
                    playsInline
                    className="w-full rounded-lg max-h-[70vh]" 
                  />
                )}
              </>
            )}
            <div className="mt-4 bg-white/10 rounded-xl p-4">
              <p className="text-white text-center">{selectedStatus.content}</p>
              <div className="text-white/50 text-xs text-center mt-2 flex items-center justify-center gap-2 flex-wrap">
                {selectedStatus.createdByName && (
                  <span className="flex items-center gap-1">
                    <span>By {selectedStatus.createdByName}</span>
                    {selectedStatus.createdByBadge && (
                      <span className="px-1.5 py-0.5 bg-purple-500/50 text-white text-[10px] rounded-full">
                        {selectedStatus.createdByBadge}
                      </span>
                    )}
                  </span>
                )}
                <span>• Expires in {Math.ceil((new Date(selectedStatus.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))} hours</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Post Modal */}
      {expandedPost && (
        <ExpandedPostModal 
          post={expandedPost} 
          onClose={() => {
            pauseAllVideos();
            setExpandedPost(null);
          }} 
        />
      )}

      {/* Mobile Header with Logo, Carousel & Nav */}
      <div className="lg:hidden bg-cool-50 border-b border-cool-200">
        <div className="p-3 space-y-3">
          {/* Logo & Profile Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {platformLogo ? (
                <img src={platformLogo} alt="RM Ubuzima" className="w-10 h-10 object-contain rounded-lg bg-white border border-cool-200" />
              ) : (
                <div className="w-10 h-10 bg-srhr rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-base font-bold text-emerald-700">RM Ubuzima</h1>
                <p className="text-[10px] text-cool-500">Anonymous SRHR community</p>
              </div>
            </div>
            {/* Mobile Profile & Notifications */}
            <div className="flex items-center gap-2">
              {/* RM Admin AI Button - beside Notification Bell */}
              <RMAdminAIButton />

              {/* Notification Bell */}
              {session?.user && <NotificationBell variant="minimal" />}
              {/* Profile - Clickable to open modal */}
              <button
                onClick={() => session?.user && setShowProfileModal(true)}
                className="flex items-center gap-2"
              >
                <span className="text-xs font-medium text-emerald-700">
                  {session?.user.name || 'Guest'}
                </span>
                <div className="w-8 h-8 bg-cool-100 rounded-full flex items-center justify-center overflow-hidden border border-cool-200 cursor-pointer hover:border-srhr transition-colors">
                  {session?.user.avatar ? (
                    <img src={session.user.avatar} alt={session.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-cool-400" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Carousel - Very Compact */}
          {carouselPhotos.length > 0 && (
            <div className="relative bg-gray-900 rounded-lg overflow-hidden max-w-[120px] mx-auto">
              <div 
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {carouselPhotos.sort((a, b) => a.order - b.order).map((photo) => (
                  <div key={photo.id} className="w-full flex-shrink-0">
                    <div className="relative aspect-square max-h-[100px]">
                      <img src={photo.url} alt={photo.caption || 'Community photo'} className="w-full h-full object-cover" />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                          <p className="text-white text-[8px] truncate">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {carouselPhotos.length > 1 && (
                <>
                  <button onClick={prevSlide} className="absolute left-0.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center text-white">
                    <ChevronLeft className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={nextSlide} className="absolute right-0.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center text-white">
                    <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {carouselPhotos.map((_, idx) => (
                      <button key={idx} onClick={() => setCurrentSlide(idx)} className={cn('w-1 h-1 rounded-full', idx === currentSlide ? 'bg-white' : 'bg-white/50')} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex min-h-full">
        {/* Left Sidebar - Desktop Only */}
        <div className="hidden lg:block w-64 bg-cool-50 border-r border-cool-200 flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              {platformLogo ? (
                <img src={platformLogo} alt="RM Ubuzima" className="w-12 h-12 object-contain rounded-lg bg-white border border-cool-200" />
              ) : (
                <div className="w-12 h-12 bg-srhr rounded-lg flex items-center justify-center">
                  <Heart className="w-7 h-7 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-emerald-700">RM Ubuzima</h1>
                <p className="text-xs text-cool-500">Anonymous SRHR community</p>
              </div>
            </div>

            {/* Carousel Photos - Smaller and compact */}
            {carouselPhotos.length > 0 && (
              <div>
                <div className="relative bg-gray-900 rounded-lg overflow-hidden max-w-[180px]">
                  <div 
                    className="flex transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                    {carouselPhotos.sort((a, b) => a.order - b.order).map((photo) => (
                      <div key={photo.id} className="w-full flex-shrink-0">
                        <div className="relative aspect-square max-h-[180px]">
                          <img 
                            src={photo.url} 
                            alt={photo.caption || 'Community photo'} 
                            className="w-full h-full object-cover"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                              <p className="text-white text-[10px]">{photo.caption}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {carouselPhotos.length > 1 && (
                    <>
                      <button 
                        onClick={prevSlide}
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={nextSlide}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {carouselPhotos.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            className={cn(
                              'w-1 h-1 rounded-full transition-colors',
                              idx === currentSlide ? 'bg-white' : 'bg-white/50'
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Full Width */}
        <div className="flex-1 bg-white min-w-0">
          {/* Header - Desktop Only */}
          <header className="hidden lg:block bg-white border-b border-cool-200 sticky top-0 z-10">
            <div className="px-8 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-cool-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-srhr rounded-full"></span>
                {t('home.dailyFeed')}
              </h2>

              {/* Profile & Notifications - Top Right */}
              <div className="flex items-center gap-4">
                {/* RM Admin AI Button - beside Notification Bell */}
                <RMAdminAIButton />

                {/* Notification Bell */}
                {session?.user && <NotificationBell />}
                {/* Profile - Clickable to open modal */}
                <button
                  onClick={() => session?.user && setShowProfileModal(true)}
                  className="flex items-center gap-3 hover:bg-cool-50 px-3 py-2 rounded-xl transition-colors"
                >
                  <span className="text-sm font-medium text-emerald-700">
                    {session?.user.name || 'Guest'}
                  </span>
                  <div className="w-10 h-10 bg-cool-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-cool-200 hover:border-srhr transition-colors">
                    {session?.user.avatar ? (
                      <img
                        src={session.user.avatar}
                        alt={session.user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-cool-400" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Daily Feed Title */}
          <div className="lg:hidden px-4 py-1 border-b border-cool-200">
            <h2 className="text-lg font-semibold text-cool-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-srhr rounded-full"></span>
              {t('home.dailyFeed')}
            </h2>
          </div>

          {/* News Feed - Full Width - Responsive height */}
          <div className="flex flex-col h-auto lg:h-[calc(100vh-80px)] overflow-hidden">
            {/* Status Updates Rings - Normal size */}
            {activeStatuses.length > 0 && (
              <div className="sticky top-0 px-4 py-1 border-b border-cool-200 bg-white z-20 flex-shrink-0">
                <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
                  {/* Admin Status Ring */}
                  <button
                    onClick={() => activeStatuses[0] && handleStatusClick(activeStatuses[0])}
                    className="flex-shrink-0 flex flex-col items-center gap-1 group"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-srhr via-srhr-light to-cool-300 p-1">
                        <div className="w-full h-full rounded-full bg-white p-0.5">
                          <div className="w-full h-full rounded-full bg-cool-100 overflow-hidden flex items-center justify-center">
                            {activeStatuses[0].type === 'image' || activeStatuses[0].type === 'video' ? (
                              <div className="relative w-full h-full">
                                <img 
                                  src={activeStatuses[0].mediaUrl} 
                                  alt="Admin" 
                                  className="w-full h-full object-cover"
                                />
                                {activeStatuses[0].type === 'video' && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center">
                                      <span className="text-sm ml-0.5">▶</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xl">📢</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-cool-700">
                      {activeStatuses[0].type === 'video' 
                        ? '' 
                        : (activeStatuses[0].createdByName || 'Admin')}
                    </span>
                  </button>

                  {/* Other Status Rings */}
                  {activeStatuses.slice(1, 8).map((status) => {
                    const isViewed = session?.user.id && status.viewedBy.includes(session.user.id);
                    return (
                      <button
                        key={status.id}
                        onClick={() => handleStatusClick(status)}
                        className="flex-shrink-0 flex flex-col items-center gap-1"
                      >
                        <div className={cn(
                          'w-14 h-14 rounded-full p-0.5',
                          isViewed 
                            ? 'bg-cool-300' 
                            : 'bg-gradient-to-tr from-srhr via-srhr-light to-cool-300'
                        )}>
                          <div className="w-full h-full rounded-full bg-white p-0.5">
                            <div className="w-full h-full rounded-full bg-cool-100 overflow-hidden flex items-center justify-center">
                              {status.type === 'image' || status.type === 'video' ? (
                                <div className="relative w-full h-full">
                                  <img 
                                    src={status.mediaUrl} 
                                    alt="Status" 
                                    className="w-full h-full object-cover"
                                  />
                                  {status.type === 'video' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                      <div className="w-5 h-5 bg-white/90 rounded-full flex items-center justify-center">
                                        <span className="text-xs ml-0.5">▶</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-lg font-bold text-cool-600">
                                  {status.content.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-cool-500 truncate w-14 text-center">
                          {getRelativeTime(status.timestamp)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scrollable Posts Area - Responsive padding */}
            <div className="flex-1 overflow-y-auto p-3 lg:p-6 relative">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 pb-20">
              {filteredPosts.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-cool-50 rounded-2xl border border-cool-100">
                  <div className="w-16 h-16 bg-cool-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl text-cool-400">News</span>
                  </div>
                  <p className="text-cool-500 text-sm">No posts available yet</p>
                  <p className="text-cool-400 text-xs mt-1">Check back later for updates</p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <AIPostCard
                    key={post.id}
                    post={post}
                    aiAvatar={aiAvatars[post.aiType]}
                    userId={userId}
                    onClick={() => handlePostClick(post.id)}
                    onReadMore={(e) => handleReadMore(e, post)}
                  />
                ))
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}

// Post Card - Shows full AI content with AI name and avatar
function AIPostCard({ 
  post, 
  aiAvatar, 
  userId,
  onClick,
  onReadMore
}: { 
  post: AIPost; 
  aiAvatar: string | null;
  userId?: string;
  onClick: () => void;
  onReadMore: (e: React.MouseEvent) => void;
}) {
  const { t, i18n } = useTranslation();
  const { follow, unfollow, isFollowing } = usePersistentStore();
  
  let content = post.content;
  if (i18n.language === 'rw' && post.contentKinyarwanda) {
    content = post.contentKinyarwanda;
  } else if (i18n.language === 'fr' && post.contentFrench) {
    content = post.contentFrench;
  } else if (i18n.language === 'sw' && post.contentSwahili) {
    content = post.contentSwahili;
  }

  // Check if this is a facilitator-created post
  const isFacilitatorPost = post.createdByName && (post.category === 'facilitator' || post.category === 'news');

  // Get AI name based on aiType
  const getAIName = (aiType: string) => {
    return 'RM Admin';
  };

  // Get AI initials for fallback avatar
  const getAIInitials = (aiType: string) => {
    return 'RA';
  };

  // Get AI color for fallback avatar
  const getAIColor = (aiType: string) => {
    return 'bg-slate-700';
  };

  // Use facilitator info if available, otherwise use AI info
  const displayName = isFacilitatorPost ? post.createdByName : getAIName(post.aiType);
  const displayAvatar = isFacilitatorPost ? post.createdByAvatar : aiAvatar;
  const displayInitials = isFacilitatorPost 
    ? (post.createdByName?.charAt(0).toUpperCase() || 'F')
    : getAIInitials(post.aiType);
  const displayColor = isFacilitatorPost ? 'bg-purple-500' : getAIColor(post.aiType);
  const displayBadge = isFacilitatorPost ? post.createdByBadge : null;
  
  // Determine who to follow (AI or facilitator)
  const followingId = isFacilitatorPost ? post.createdBy : post.aiType;
  const followingType = isFacilitatorPost ? 'facilitator' : 'ai';
  const userIsFollowing = userId && followingId ? isFollowing(userId, followingId) : false;
  
  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !followingId) return;
    
    if (userIsFollowing) {
      unfollow(userId, followingId);
    } else {
      follow(userId, {
        id: followingId,
        type: followingType,
        name: displayName || '',
        avatar: displayAvatar || undefined,
        badge: displayBadge || undefined,
      });
    }
  };

  // Parse markdown bold (**text**) to styled headings
  const parseContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Remove ** and style as black heading
        const headingText = part.slice(2, -2);
        return (
          <span key={index} className="font-bold text-cool-900">
            {headingText}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Truncate content for preview
  const displayContent = content.length > 150 ? content.slice(0, 150) + '...' : content;

  return (
    <article
      onClick={onClick}
      className="bg-white rounded-xl border border-cool-200 shadow-soft hover:shadow-card transition-all cursor-pointer overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* Avatar - Facilitator or AI avatar */}
          <div className="flex-shrink-0">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName || ''}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-cool-100"
              />
            ) : (
              <div className={`w-10 h-10 rounded-full ${displayColor} flex items-center justify-center text-white text-sm font-bold`}>
                {displayInitials}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author - Facilitator or AI Name with Badge */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-semibold text-cool-900 text-sm">{displayName}</span>
              {displayBadge && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                  {displayBadge}
                </span>
              )}
              <span className="text-cool-300">-</span>
              <span className="text-xs text-cool-400">{getRelativeTime(post.timestamp)}</span>
              {userId && followingId && (
                <button
                  onClick={handleFollow}
                  className={`ml-2 px-3 py-0.5 text-xs font-medium rounded-full transition-colors ${
                    userIsFollowing
                      ? 'bg-cool-100 text-cool-600 hover:bg-cool-200'
                      : 'bg-srhr text-white hover:bg-srhr-dark'
                  }`}
                >
                  {userIsFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            
            {/* Content - Truncated preview with styled headings */}
            <p className="text-sm text-cool-700 leading-relaxed line-clamp-3">{parseContent(displayContent)}</p>
            
            {/* Media - Image or Video */}
            {post.mediaUrl && post.type === 'image' && (
              <div className="mt-3 rounded-lg overflow-hidden">
                <img 
                  src={post.mediaUrl} 
                  alt="Post media" 
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
            {post.mediaUrl && post.type === 'video' && (
              <div className="mt-3 rounded-lg overflow-hidden">
                {post.mediaUrl.includes('youtube.com') || post.mediaUrl.includes('youtu.be') ? (
                  <YouTubePlayer
                    src={post.mediaUrl}
                    className="aspect-video w-full rounded-lg"
                    videoId={`post-${post.id}`}
                  />
                ) : (
                  <VideoPlayer 
                    src={post.mediaUrl} 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
              </div>
            )}
            
            {/* Footer */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-cool-100">
              <span className="text-xs text-cool-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-cool-300 rounded-full"></span>
                {post.views} {t('home.views')}
              </span>
              <button 
                onClick={onReadMore}
                className="text-xs text-srhr font-medium flex items-center gap-1 hover:text-srhr-dark"
              >
                Read more <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </article>
  );
}

// Expanded Post Modal Component
function ExpandedPostModal({ post, onClose }: { post: AIPost; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { aiAvatars } = usePersistentStore.getState();
  
  let content = post.content;
  if (i18n.language === 'rw' && post.contentKinyarwanda) {
    content = post.contentKinyarwanda;
  } else if (i18n.language === 'fr' && post.contentFrench) {
    content = post.contentFrench;
  } else if (i18n.language === 'sw' && post.contentSwahili) {
    content = post.contentSwahili;
  }

  // Parse markdown bold (**text**) to styled headings
  const parseContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const headingText = part.slice(2, -2);
        return (
          <span key={index} className="font-bold text-cool-900">
            {headingText}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <ExpandedPostHeader post={post} />
            <button 
              onClick={onClose}
              className="p-2 text-cool-400 hover:text-cool-600 hover:bg-cool-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="prose prose-cool max-w-none">
            <p className="text-cool-700 leading-relaxed whitespace-pre-wrap text-base">
              {parseContent(content)}
            </p>
            
            {/* Media - Image or Video */}
            {post.mediaUrl && post.type === 'image' && (
              <div className="mt-4 rounded-lg overflow-hidden">
                <img 
                  src={post.mediaUrl} 
                  alt="Post media" 
                  className="w-full max-h-[60vh] object-contain rounded-lg"
                />
              </div>
            )}
            {post.mediaUrl && post.type === 'video' && (
              <div className="mt-4 rounded-lg overflow-hidden">
                {post.mediaUrl.includes('youtube.com') || post.mediaUrl.includes('youtu.be') ? (
                  <YouTubePlayer
                    src={post.mediaUrl}
                    className="aspect-video w-full rounded-lg"
                    videoId={`expanded-${post.id}`}
                  />
                ) : (
                  <VideoPlayer 
                    src={post.mediaUrl} 
                    autoPlay
                    className="w-full max-h-[60vh] rounded-lg"
                  />
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-cool-100">
            <span className="text-sm text-cool-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-cool-300 rounded-full"></span>
              {post.views} {t('home.views')}
            </span>
            <span className="text-sm text-cool-400">
              {new Date(post.timestamp).toLocaleDateString()}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

// Quick Action Button - Monochrome
function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof User;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 px-4 py-2 bg-cool-100 rounded-lg hover:bg-cool-200 transition-colors"
    >
      <Icon className="w-4 h-4 text-cool-600" />
      <span className="text-sm font-medium text-cool-700">{label}</span>
    </a>
  );
}

// Expanded Post Header Component
function ExpandedPostHeader({ post }: { post: AIPost }) {
  const { aiAvatars } = usePersistentStore.getState();
  const aiAvatar = aiAvatars[post.aiType];
  
  // Check if this is a facilitator-created post
  const isFacilitatorPost = post.createdByName && (post.category === 'facilitator' || post.category === 'news');
  
  const getAIName = (aiType: string) => {
    return 'RM Admin';
  };

  const getAIInitials = (aiType: string) => {
    return 'RA';
  };

  const getAIColor = (aiType: string) => {
    return 'bg-slate-700';
  };
  
  // Use facilitator info if available, otherwise use AI info
  const displayName = isFacilitatorPost ? post.createdByName : getAIName(post.aiType);
  const displayAvatar = isFacilitatorPost ? post.createdByAvatar : aiAvatar;
  const displayInitials = isFacilitatorPost 
    ? (post.createdByName?.charAt(0).toUpperCase() || 'F')
    : getAIInitials(post.aiType);
  const displayColor = isFacilitatorPost ? 'bg-purple-500' : getAIColor(post.aiType);
  const displayBadge = isFacilitatorPost ? post.createdByBadge : null;
  
  return (
    <div className="flex items-center gap-3">
      {displayAvatar ? (
        <img
          src={displayAvatar}
          alt={displayName || ''}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-cool-100"
        />
      ) : (
        <div className={`w-12 h-12 rounded-full ${displayColor} flex items-center justify-center text-white font-bold`}>
          {displayInitials}
        </div>
      )}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-cool-900">{displayName}</h3>
          {displayBadge && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
              {displayBadge}
            </span>
          )}
        </div>
        <p className="text-xs text-cool-500">{getRelativeTime(post.timestamp)}</p>
      </div>
    </div>
  );
}
