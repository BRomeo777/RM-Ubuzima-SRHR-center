import { useEffect, useState, useRef } from 'react';
import { 
  Heart, MessageCircle, Stethoscope, Users, Sparkles, 
  ChevronRight, Menu, X, Download, Globe, Lock, Zap, Smartphone, 
  Clock, ArrowRight, Star, Check, Monitor, Play, Activity,
  Fingerprint, Eye, BadgeCheck, Rocket, Bell, ChevronDown,
  HeartPulse, Brain, MapPin, MessageSquare, Phone,
  BookOpen, Building2, Mail, HelpCircle, Shield, ChevronLeft,
  Apple, Loader2, Share2, PlusSquare
} from 'lucide-react';
import { usePWAInstall, type Platform } from '../hooks/usePWAInstall';
import { IOSInstallPrompt } from '../components/IOSInstallPrompt';
import { getLandingPagePhotos, uploadLandingPagePhoto, deleteLandingPagePhoto, type LandingPagePhotos } from '../services/landingPagePhotoService';
import { landingPhotos as defaultLandingPhotos } from '../utils/landingPhotos';

// App Features Data
const APP_FEATURES = [
  {
    id: 'ai',
    title: 'RM Admin AI',
    subtitle: 'App Navigation Guide',
    description: 'Get help navigating the app and finding the right resources quickly',
    color: 'bg-slate-700',
    icon: Sparkles,
    bgGlow: 'bg-slate-700/20'
  },
  {
    id: 'doctor',
    title: 'Book SRHR Provider',
    subtitle: 'Online Consultations',
    description: 'Schedule online consultations with SRHR healthcare providers in seconds',
    color: 'bg-srhr-dark',
    icon: Stethoscope,
    bgGlow: 'bg-srhr-dark/20'
  },
  { 
    id: 'girls', 
    title: 'Girls Room', 
    subtitle: 'Safe Private Space',
    description: 'A confidential space designed exclusively for girls and young women',
    color: 'bg-pink-500',
    icon: Heart,
    bgGlow: 'bg-pink-500/20'
  },
  { 
    id: 'chat', 
    title: 'Community', 
    subtitle: 'Connect & Share',
    description: 'Join supportive discussions and connect with others anonymously',
    color: 'bg-violet-600',
    icon: MessageCircle,
    bgGlow: 'bg-violet-600/20'
  }
];

// Phone Mockup Component
function PhoneMockup({ feature, isActive }: { feature: typeof APP_FEATURES[0], isActive: boolean }) {
  const Icon = feature.icon;
  return (
    <div className={`relative transition-all duration-700 ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-50'}`}>
      <div className={`absolute -inset-4 ${feature.bgGlow} rounded-3xl blur-xl transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
      <div className="relative w-[280px] h-[570px] bg-slate-900 rounded-[40px] p-3 shadow-2xl border-8 border-slate-800">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-800 rounded-full" />
        <div className="w-full h-full bg-white rounded-[28px] overflow-hidden flex flex-col">
          <div className={`${feature.color} p-6 pt-10`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{feature.title}</h3>
                <p className="text-white/80 text-sm">{feature.subtitle}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-slate-50 p-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
              <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-srhr/10 rounded-xl p-3 flex items-center justify-center">
                <Check className="w-6 h-6 text-srhr" />
              </div>
              <div className="flex-1 bg-srhr/10 rounded-xl p-3 flex items-center justify-center">
                <Heart className="w-6 h-6 text-srhr" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hero Photos Slider - 4 Photos Display with proper loading and error handling
function HeroPhotosSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [isInitializing, setIsInitializing] = useState(true);

  const heroPhotos = [
    '/landing-photos/hero-1.png',
    '/landing-photos/hero-2.png',
    '/landing-photos/hero-3.png',
    '/landing-photos/hero-4.jpg'
  ];

  // Preload all images on mount
  useEffect(() => {
    const preloadImages = async () => {
      const loadPromises = heroPhotos.map((src, idx) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            setLoadedImages(prev => new Set([...prev, idx]));
            resolve();
          };
          img.onerror = () => {
            console.error(`Failed to preload hero image: ${src}`);
            setFailedImages(prev => new Set([...prev, idx]));
            resolve();
          };
          img.src = src;
        });
      });

      await Promise.all(loadPromises);
      setIsInitializing(false);
    };

    preloadImages();
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroPhotos.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, heroPhotos.length]);

  const nextSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev + 1) % heroPhotos.length);
  };

  const prevSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev - 1 + heroPhotos.length) % heroPhotos.length);
  };

  const handleImageLoad = (idx: number) => {
    setLoadedImages(prev => new Set([...prev, idx]));
  };

  const handleImageError = (idx: number, photo: string) => {
    console.error(`Failed to load hero photo ${idx + 1}: ${photo}`);
    setFailedImages(prev => new Set([...prev, idx]));
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Main Photo Display with gradient border */}
      <div className="relative p-1.5 bg-gradient-to-br from-srhr/30 via-purple-500/20 to-pink-500/30 rounded-2xl shadow-2xl">
        <div className="relative h-[280px] sm:h-[340px] md:h-[400px] lg:h-[450px] rounded-xl overflow-hidden bg-gray-100">
          {/* Loading State */}
          {isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
              <div className="text-center">
                <div className="animate-spin w-10 h-10 border-4 border-srhr border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-gray-500 text-sm">Loading photos...</p>
              </div>
            </div>
          )}

          {/* Photo Slides */}
          {heroPhotos.map((photo, idx) => {
            const isLoaded = loadedImages.has(idx);
            const hasFailed = failedImages.has(idx);

            return (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                {/* Image or Fallback - showing full photo with contain */}
                {!hasFailed ? (
                  <div className={`w-full h-full flex items-center justify-center bg-gray-50 transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
                    <img
                      src={photo}
                      alt={`Hero Photo ${idx + 1}`}
                      className="max-w-full max-h-full object-contain"
                      onLoad={() => handleImageLoad(idx)}
                      onError={() => handleImageError(idx, photo)}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <div className="text-center p-6">
                      <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">📷</span>
                      </div>
                      <p className="text-gray-500 text-sm">Photo {idx + 1}</p>
                      <p className="text-gray-400 text-xs mt-1">Not available</p>
                    </div>
                  </div>
                )}

                {/* Loading placeholder for this slide */}
                {!isLoaded && !hasFailed && idx === currentSlide && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="animate-pulse w-full h-full bg-gray-200"></div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all z-20"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all z-20"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6 text-gray-700" />
          </button>

          {/* Slide Counter */}
          <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm z-20">
            {currentSlide + 1} / {heroPhotos.length}
          </div>
        </div>

        {/* Dots Indicator - Outside the image container but inside gradient wrapper */}
        <div className="flex justify-center gap-2 mt-4">
          {heroPhotos.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsAutoPlaying(false);
                setCurrentSlide(idx);
              }}
              className={`h-2 rounded-full transition-all ${
                idx === currentSlide ? 'bg-srhr w-8' : 'bg-gray-300 w-2 hover:bg-gray-400'
              }`}
              aria-label={`Go to photo ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Showcase Slider Component (phone mockup - kept for reference)
function ShowcaseSlider() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % APP_FEATURES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative h-[600px] flex items-center justify-center">
        {APP_FEATURES.map((feature, idx) => {
          const offset = idx - activeSlide;
          const isActive = idx === activeSlide;
          
          return (
            <div
              key={feature.id}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
              style={{
                transform: `translate(-50%, -50%) translateX(${offset * 120}px) translateZ(${isActive ? 0 : -200}px) rotateY(${offset * -15}deg)`,
                zIndex: APP_FEATURES.length - Math.abs(offset),
                opacity: Math.abs(offset) > 1 ? 0 : 1 - Math.abs(offset) * 0.3,
              }}
            >
              <PhoneMockup feature={feature} isActive={isActive} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-2 mt-8">
        {APP_FEATURES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveSlide(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === activeSlide ? 'bg-srhr w-8' : 'bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon: Icon, title, description, color }: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  color: string;
}) {
  return (
    <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 hover:border-srhr/20">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// Main Photo Slider Component - Below "What is RM Ubuzima?"
function MainPhotoSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<(string | null)[]>([null, null, null, null]);
  const [isLoading, setIsLoading] = useState(true);
  const totalSlides = 4;
  
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  
  // Fetch photos from localStorage, merging with 4 permanent defaults
  useEffect(() => {
    const fetchPhotos = () => {
      const photos = getLandingPagePhotos();
      // Merge with defaults: use default if localStorage slot is null
      const mergedMainHero = photos.mainHero.map((photo, index) => 
        photo || defaultLandingPhotos.mainHero[index]
      );
      setUploadedImages(mergedMainHero);
      setIsLoading(false);
    };
    fetchPhotos();
  }, []);
  
  // Auto-advance slides every 5 seconds
  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto mt-12">
        <div className="relative bg-[#f0f2f5] rounded-2xl overflow-hidden shadow-xl h-96 md:h-[500px] lg:h-[550px] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-srhr border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-5xl mx-auto mt-12">
      <div className="relative bg-[#f0f2f5] rounded-2xl overflow-hidden shadow-xl">
        {/* Main Slider Container */}
        <div className="relative h-96 md:h-[500px] lg:h-[550px] overflow-hidden">
          {/* Slides */}
          <div 
            className="absolute inset-0 flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {uploadedImages.map((image, index) => (
              <div 
                key={index}
                className="min-w-full h-full flex items-center justify-center bg-gray-100"
              >
                {image ? (
                  <img 
                    src={image} 
                    alt={`RM Ubuzima Photo ${index + 1}`} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-4">
                      <img src="/logo.png" alt="RM Ubuzima" className="w-12 h-12 rounded-lg" />
                    </div>
                    <p className="text-gray-400 font-medium text-lg">Photo {index + 1}</p>
                    <p className="text-gray-400 text-sm mt-2">Coming soon</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Slider Controls - Left Arrow */}
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          
          {/* Slider Controls - Right Arrow */}
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-110 active:scale-95"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Slider Indicators */}
        <div className="flex justify-center gap-3 py-4 bg-white">
          {uploadedImages.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === index ? 'bg-srhr w-8' : 'bg-gray-300 w-2 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Photo Slider Component for Services
function ServicePhotoSlider({ serviceName, icon: Icon, color, serviceId }: { serviceName: string; icon: React.ElementType; color: string; serviceId: string }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<(string | null)[]>([null, null, null]);
  const [isLoading, setIsLoading] = useState(true);
  const totalSlides = 3;
  
  const sectionMap: Record<string, keyof LandingPagePhotos> = {
    'ai-assistant': 'rmAdminAI',
    'anonymous-chat': 'anonymousChat',
    'book-doctor': 'bookDoctor',
    'girls-room': 'girlsRoom',
    'find-services': 'findServices',
    'emergency': 'emergency',
    'srhr-library': 'srhrLibrary',
    'daily-feeds': 'dailyFeeds',
    'baza-muganga': 'bazaMuganga'
  };
  
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  
  // Fetch photos from Firebase
  useEffect(() => {
    const fetchPhotos = async () => {
      const photos = await getLandingPagePhotos();
      const section = sectionMap[serviceId];
      if (section) {
        setUploadedImages(photos[section]);
      }
      setIsLoading(false);
    };
    fetchPhotos();
  }, [serviceId]);
  
  // Auto-advance slides every 4 seconds
  useEffect(() => {
    const timer = setInterval(nextSlide, 4000);
    return () => clearInterval(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="h-48 bg-[#f0f2f5] flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-3 border-srhr border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="h-48 bg-[#f0f2f5] relative overflow-hidden group">
      {/* Slides Container */}
      <div 
        className="absolute inset-0 flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {[0, 1, 2].map((index) => (
          <div 
            key={index}
            className="min-w-full h-full flex items-center justify-center bg-[#f0f2f5] overflow-hidden"
          >
            <div className="w-full h-full flex items-center justify-center">
              {uploadedImages[index] ? (
                <img 
                  src={uploadedImages[index]!} 
                  alt={`${serviceName} ${index + 1}`} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <Icon className={`w-12 h-12 ${color} mx-auto mb-2 opacity-30`} />
                  <p className="text-xs text-gray-400 opacity-60">Photo {index + 1}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Navigation Arrows - visible on hover */}
      <button 
        onClick={prevSlide}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
      >
        <ChevronLeft className="w-4 h-4 text-gray-600" />
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
      >
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </button>
      
      {/* Dot Indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {[0, 1, 2].map((index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              currentSlide === index ? 'bg-srhr w-4' : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Platform icon component
function PlatformIcon({ platform, className = 'w-4 h-4' }: { platform: Platform; className?: string }) {
  switch (platform) {
    case 'ios':
      return <Apple className={className} />;
    case 'android':
      return <Smartphone className={className} />;
    case 'windows':
    case 'macos':
    case 'linux':
      return <Monitor className={className} />;
    default:
      return <Download className={className} />;
  }
}

// Platform-aware download button component
function PlatformDownloadButton({ 
  platform, 
  isCurrentDevice, 
  onClick,
  isInstalling,
  isInstalled: installed 
}: { 
  platform: Platform; 
  isCurrentDevice: boolean; 
  onClick: () => void;
  isInstalling: boolean;
  isInstalled: boolean;
}) {
  const getPlatformStyles = () => {
    if (installed) return 'bg-green-100 text-green-700 border-green-300';
    if (!isCurrentDevice) return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
    
    switch (platform) {
      case 'ios':
        return 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800';
      case 'android':
        return 'bg-green-600 text-white border-green-600 hover:bg-green-700';
      case 'windows':
        return 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700';
      default:
        return 'bg-srhr text-white border-srhr hover:bg-srhr-dark';
    }
  };

  const getLabel = () => {
    if (installed) return 'Installed';
    switch (platform) {
      case 'ios': return 'iOS';
      case 'android': return 'Android';
      case 'windows': return 'Windows';
      default: return 'Download';
    }
  };

  return (
    <button 
      onClick={onClick}
      disabled={installed || isInstalling}
      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg transition-all text-xs font-medium ${getPlatformStyles()} ${installed || isInstalling ? 'cursor-default' : 'hover:shadow-sm'}`}
    >
      <PlatformIcon platform={platform} className="w-3.5 h-3.5" />
      <span>{getLabel()}</span>
      {isInstalling && <Loader2 className="w-3 h-3 animate-spin" />}
      {installed && <Check className="w-3 h-3" />}
    </button>
  );
}

// Main Landing Page Component
function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const [isInstalling, setIsInstalling] = useState(false);

  // Use the new PWA install hook
  const { 
    install, 
    isInstalled, 
    platform: detectedPlatform, 
    isIOS, 
    isAndroid,
    showIOSInstructions,
    dismissIOSPrompt,
    isInstallable,
    deferredPrompt,
    isStandalone,
  } = usePWAInstall();

  // Handle download/install with loading state
  const handleDownload = async (targetPlatform?: Platform) => {
    if (isInstalling || isStandalone) return;

    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .font-sans { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* Navigation - WhatsApp Style */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="RM Ubuzima Logo" 
                className="w-10 h-10 rounded-lg object-contain bg-white"
              />
              <div>
                <span className="text-lg font-bold text-gray-900">RM Ubuzima</span>
                <span className="block text-xs text-gray-500">Anonymous SRHR Community</span>
              </div>
            </div>

            {/* Page Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => window.location.href = '#services'} className="text-gray-600 hover:text-srhr font-medium text-sm transition-colors">Services</button>
              <button onClick={() => window.location.href = '#resources'} className="text-gray-600 hover:text-srhr font-medium text-sm transition-colors">Resources</button>
              <button onClick={() => window.location.href = '#about'} className="text-gray-600 hover:text-srhr font-medium text-sm transition-colors">About</button>
              <div className="flex flex-col items-center gap-1">
                <button 
                  onClick={onEnterApp}
                  className="px-3 py-1.5 text-srhr font-semibold text-xs hover:text-srhr-dark transition-colors"
                >
                  Sign up/Sign in
                </button>
                {/* Platform Buttons - Device Aware */}
                <div className="flex items-center gap-2">
                  <PlatformDownloadButton 
                    platform="windows" 
                    isCurrentDevice={detectedPlatform === 'windows'} 
                    onClick={() => handleDownload()}
                    isInstalling={isInstalling}
                    isInstalled={isStandalone}
                  />
                  <PlatformDownloadButton 
                    platform="ios" 
                    isCurrentDevice={detectedPlatform === 'ios'} 
                    onClick={() => handleDownload()}
                    isInstalling={isInstalling}
                    isInstalled={isStandalone}
                  />
                  <PlatformDownloadButton 
                    platform="android" 
                    isCurrentDevice={detectedPlatform === 'android'} 
                    onClick={() => handleDownload()}
                    isInstalling={isInstalling}
                    isInstalled={isStandalone}
                  />
                </div>
              </div>
              <button 
                onClick={() => handleDownload()}
                disabled={isStandalone}
                className={`px-3 py-1.5 font-semibold rounded-full text-xs border transition-colors flex items-center gap-1.5 ${
                  isStandalone 
                    ? 'bg-green-100 text-green-700 border-green-300 cursor-default' 
                    : 'bg-green-500 text-black border-green-600 hover:bg-green-600'
                }`}
              >
                {isStandalone ? (
                  <><Check className="w-3.5 h-3.5" /> App Installed</>
                ) : isInstalling ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Installing...</>
                ) : (
                  <>Download App</>
                )}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-4 space-y-3">
              <button 
                onClick={onEnterApp}
                className="w-full text-left px-4 py-3 text-srhr font-semibold hover:bg-gray-50 rounded-lg"
              >
                Sign up/Sign in
              </button>
              <button 
                onClick={() => handleDownload()}
                disabled={isStandalone}
                className={`w-full px-4 py-3 font-semibold rounded-full border transition-colors flex items-center justify-center gap-2 ${
                  isStandalone 
                    ? 'bg-green-100 text-green-700 border-green-300 cursor-default' 
                    : 'bg-green-500 text-black border-green-600 hover:bg-green-600'
                }`}
              >
                {isStandalone ? (
                  <><Check className="w-5 h-5" /> App Installed</>
                ) : isInstalling ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Installing...</>
                ) : (
                  <>Download App</>
                )}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - WhatsApp Style */}
      <section className="pt-24 pb-16 bg-[#f0f2f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Do more with<br />conversations
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0">
                Engage audiences, accelerate health outcomes and drive better SRHR support on the platform with users across Africa and beyond.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-start">
                <button 
                  onClick={onEnterApp}
                  className="px-8 py-3 bg-srhr hover:bg-srhr-dark text-white font-semibold rounded-full transition-colors"
                >
                  Sign up/Sign in
                </button>
                <div className="flex flex-col items-center gap-3">
                  <button 
                    onClick={() => handleDownload()}
                    disabled={isStandalone}
                    className={`px-8 py-3 font-semibold rounded-full border transition-colors flex items-center gap-2 ${
                      isStandalone 
                        ? 'bg-green-100 text-green-700 border-green-300 cursor-default' 
                        : 'bg-green-500 text-black border-green-600 hover:bg-green-600'
                    }`}
                  >
                    {isStandalone ? (
                      <><Check className="w-5 h-5" /> App Installed</>
                    ) : isInstalling ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Installing...</>
                    ) : (
                      <>Download App</>
                    )}
                  </button>
                  {/* Platform Buttons with Icons - Device Aware */}
                  <div className="flex items-center gap-3">
                    <PlatformDownloadButton 
                      platform="windows" 
                      isCurrentDevice={detectedPlatform === 'windows'} 
                      onClick={() => handleDownload()}
                      isInstalling={isInstalling}
                      isInstalled={isStandalone}
                    />
                    <PlatformDownloadButton 
                      platform="ios" 
                      isCurrentDevice={detectedPlatform === 'ios'} 
                      onClick={() => handleDownload()}
                      isInstalling={isInstalling}
                      isInstalled={isStandalone}
                    />
                    <PlatformDownloadButton 
                      platform="android" 
                      isCurrentDevice={detectedPlatform === 'android'} 
                      onClick={() => handleDownload()}
                      isInstalling={isInstalling}
                      isInstalled={isStandalone}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Phone Mockup Slider */}
            <div className="hidden lg:flex justify-center">
              <ShowcaseSlider />
            </div>
          </div>
        </div>
      </section>

      {/* iOS Install Section - ONLY visible to iPhone/iPad users who haven't installed */}
      {isIOS && !isStandalone && (
        <section className="py-12 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4">
                <Apple className="w-5 h-5" />
                <span className="text-sm font-medium">iPhone & iPad</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Install RM Ubuzima on Your iPhone
              </h2>
              <p className="text-gray-300 max-w-xl mx-auto">
                Add this app to your Home Screen for instant access. No App Store needed!
              </p>
            </div>

            {/* iOS Install Steps */}
            <div className="grid sm:grid-cols-3 gap-6 mb-8">
              {/* Step 1 */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 text-center border border-white/10">
                <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">1. Tap Share</h3>
                <p className="text-sm text-gray-400">
                  Tap the Share button at the bottom of Safari
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 text-center border border-white/10">
                <div className="w-14 h-14 bg-srhr/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PlusSquare className="w-7 h-7 text-srhr" />
                </div>
                <h3 className="font-semibold mb-2">2. Add to Home Screen</h3>
                <p className="text-sm text-gray-400">
                  Scroll down and tap "Add to Home Screen"
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white/5 backdrop-blur rounded-2xl p-6 text-center border border-white/10">
                <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">3. Done!</h3>
                <p className="text-sm text-gray-400">
                  The app icon appears on your Home Screen
                </p>
              </div>
            </div>

            {/* iOS Browser Support Note */}
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-400">
                <strong className="text-white">Works on:</strong> Safari, Chrome, Edge, Firefox, and all browsers on iOS
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Products Section - WhatsApp Style */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              What is RM Ubuzima?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              RM Ubuzima is Rwanda anonymous SRHR community platform with all services. We empower individuals to access sexual and reproductive health resources completely confidentially. Our platform combines AI-powered health guidance, instant doctor booking, anonymous community chat, emergency assistance, educational resources, and dedicated safe spaces. Every service is designed with complete privacy, security, and a judgment-free environment at its core.
            </p>
          </div>

        </div>
      </section>

      {/* 4 Photos Slider Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <HeroPhotosSlider />
        </div>
      </section>

      {/* All Services Section - Professional Cards */}
      <section className="py-20 bg-gradient-to-b from-[#f0f2f5] to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive SRHR Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Access a complete suite of health tools designed for your privacy and wellbeing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Service 1 - RM Admin AI */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-slate-200">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">RM Admin AI</h3>
                  <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full mb-3">
                    Navigation Guide
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Your personal app navigator helping you find resources, book appointments, and connect with services.
                  </p>
                </div>
              </div>
            </div>

            {/* Service 2 - Anonymous Chat */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-violet-200">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Anonymous Chat</h3>
                  <span className="inline-flex items-center px-3 py-1 bg-violet-100 text-violet-700 text-xs font-semibold rounded-full mb-3">
                    100% Private
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Connect with certified health professionals and community members completely anonymously.
                  </p>
                </div>
              </div>
            </div>

            {/* Service 3 - Book SRHR Provider */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-srhr/30">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-srhr to-srhr-dark rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Book SRHR Provider</h3>
                  <span className="inline-flex items-center px-3 py-1 bg-srhr/10 text-srhr text-xs font-semibold rounded-full mb-3">
                    Instant Booking
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Schedule online consultations with verified SRHR healthcare providers.
                  </p>
                </div>
              </div>
            </div>

            {/* Service 4 - Girls Room */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-pink-200">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Girls Room</h3>
                  <span className="inline-flex items-center px-3 py-1 bg-pink-100 text-pink-600 text-xs font-semibold rounded-full mb-3">
                    Girls-Only
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    A dedicated safe space exclusively for girls and young women with certified female facilitators.
                  </p>
                </div>
              </div>
            </div>

            {/* Service 5 - Find Services */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Find Services</h3>
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full mb-3">
                    Location-Based
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Locate nearby healthcare facilities, clinics, and hospitals with complete anonymity.
                  </p>
                </div>
              </div>
            </div>

            {/* Service 6 - Emergency */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-red-200">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Phone className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Emergency</h3>
                  <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full mb-3">
                    24/7 Available
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    24/7 emergency hotline access with immediate connection to healthcare providers.
                  </p>
                </div>
              </div>
            </div>

            {/* Service 7 - SRHR Library */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-amber-200">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">SRHR Library</h3>
                  <span className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-600 text-xs font-semibold rounded-full mb-3">
                    Educational
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Comprehensive educational resources, articles, and guides on sexual and reproductive health.
                  </p>
                </div>
              </div>
            </div>

            {/* Service 8 - Daily SRHR Feeds */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-200">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Bell className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Daily SRHR Feeds</h3>
                  <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-600 text-xs font-semibold rounded-full mb-3">
                    Daily Updates
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Stay updated with daily health news, tips, and SRHR Library curated by experts.
                  </p>
                </div>
              </div>
            </div>

            {/* Service 9 - Baza Muganga */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-200">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Baza Muganga</h3>
                  <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full mb-3">
                    Weekly Live
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Weekly interactive Q&A sessions with doctors and health professionals. Ask anything anonymously.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section - Professional */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why RM Ubuzima?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Trusted by individuals and organizations across Africa for confidential SRHR support
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#f0f2f5] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Users className="w-8 h-8 text-srhr" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Anonymous Community
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Access SRHR services without revealing your identity. Connect with health professionals and peers in a completely confidential environment designed for your privacy.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#f0f2f5] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Stethoscope className="w-8 h-8 text-srhr" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Professional Healthcare
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Book appointments with verified doctors, access emergency hotlines, and receive AI-powered health guidance available 24/7 in multiple languages.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#f0f2f5] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Shield className="w-8 h-8 text-srhr" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Complete Privacy
              </h3>
              <p className="text-gray-600 leading-relaxed">
                End-to-end encryption protects every conversation. Your data remains secure and anonymous, ensuring you can seek help without fear or judgment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Compact with White Background */}
      <footer className="bg-white py-8 pb-12 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {/* Column 1 - Logo */}
            <div className="col-span-2 md:col-span-1">
              <img 
                src="/logo.png" 
                alt="RM Ubuzima Logo" 
                className="w-8 h-8 rounded-lg object-contain bg-white mb-2"
              />
              <span className="text-xs text-gray-500">RM Ubuzima</span>
              <p className="text-xs text-gray-400">Anonymous SRHR Community</p>
            </div>

            {/* Column 2 - Pages */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2 text-sm">Pages</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li><a href="#home" className="hover:text-srhr">Home</a></li>
                <li><a href="#services" className="hover:text-srhr">Services</a></li>
                <li><a href="#about" className="hover:text-srhr">About</a></li>
                <li><a href="#contact" className="hover:text-srhr">Contact</a></li>
              </ul>
            </div>

            {/* Column 3 - Privacy */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2 text-sm">Privacy</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li><a href="#" className="hover:text-srhr">Data Policy</a></li>
                <li><a href="#" className="hover:text-srhr">Privacy</a></li>
                <li><a href="#" className="hover:text-srhr">Terms</a></li>
              </ul>
            </div>

            {/* Column 4 - Resources */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2 text-sm">Resources</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li><a href="#" className="hover:text-srhr">Blog</a></li>
                <li><a href="#" className="hover:text-srhr">FAQ</a></li>
                <li><a href="#" className="hover:text-srhr">Help</a></li>
              </ul>
            </div>

            {/* Column 5 - Contact */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2 text-sm">Contact</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>bananeza777@gmail.com</li>
                <li>+250 783 679 400</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-300 pt-4 flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-xs text-gray-500">2026 © RM Ubuzima</p>
            <span className="text-xs text-gray-600">EN</span>
          </div>
        </div>
      </footer>

      {/* iOS Install Instructions Modal */}
      <IOSInstallPrompt 
        isOpen={showIOSInstructions} 
        onClose={dismissIOSPrompt} 
      />
    </div>
  );
}

export default LandingPage;
