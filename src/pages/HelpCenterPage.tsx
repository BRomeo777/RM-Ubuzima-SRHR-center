import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { usePersistentStore } from '../store';
import type { FAQContent, GuideContent } from '../store';
import {
  ArrowLeft,
  Search,
  HelpCircle,
  MessageCircle,
  Shield,
  Bell,
  Moon,
  Smartphone,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  Lock,
  User,
  MapPin,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Heart,
  Zap,
  Mail,
  Phone,
  Rocket,
  FileText,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';
import { cn } from '../utils/helpers';

interface HelpCenterPageProps {
  onBack?: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  Rocket,
  MessageCircle,
  Shield,
  Bell,
  Moon,
  Smartphone,
  Users,
  BookOpen,
  Lock,
  User,
  MapPin,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Heart,
  Zap,
  Mail,
  Phone,
  FileText,
  CheckCircle2,
  Sparkles,
  ExternalLink,
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  general: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  privacy: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  settings: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  services: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  ai: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  emergency: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

export default function HelpCenterPage({ onBack }: HelpCenterPageProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { helpContent, darkModeEnabled } = usePersistentStore();
  const currentLang = i18n.language as 'en' | 'rw' | 'fr' | 'sw';

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'faqs' | 'guides'>('faqs');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // Get localized content
  const getLocalizedFAQ = (faq: FAQContent, field: 'question' | 'answer') => {
    const langMap: Record<string, string> = { en: '', rw: 'Kinyarwanda', fr: 'French', sw: 'Swahili' };
    const suffix = langMap[currentLang];
    if (suffix && currentLang !== 'en') {
      const key = `${field}${suffix}` as keyof FAQContent;
      const value = faq[key] as string;
      if (value) return value;
    }
    return faq[field];
  };

  const getLocalizedGuide = (guide: GuideContent, field: 'title' | 'description') => {
    const langMap: Record<string, string> = { en: '', rw: 'Kinyarwanda', fr: 'French', sw: 'Swahili' };
    const suffix = langMap[currentLang];
    if (suffix && currentLang !== 'en') {
      const key = `${field}${suffix}` as keyof GuideContent;
      const value = guide[key] as string;
      if (value) return value;
    }
    return guide[field];
  };

  const getLocalizedSteps = (guide: GuideContent) => {
    const langMap: Record<string, string> = { en: 'steps', rw: 'stepsKinyarwanda', fr: 'stepsFrench', sw: 'stepsSwahili' };
    const key = langMap[currentLang] as keyof GuideContent;
    const value = guide[key] as string[] | undefined;
    return value || guide.steps;
  };

  // Filter FAQs based on search and category
  const filteredFAQs = helpContent.faqs.filter(faq => {
    const matchesSearch = getLocalizedFAQ(faq, 'question').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         getLocalizedFAQ(faq, 'answer').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(helpContent.faqs.map(f => f.category)))];

  // Category labels
  const categoryLabels: Record<string, string> = {
    all: t('help.categoryAll', 'All'),
    general: t('help.categoryGeneral', 'General'),
    privacy: t('help.categoryPrivacy', 'Privacy'),
    settings: t('help.categorySettings', 'Settings'),
    services: t('help.categoryServices', 'Services'),
    ai: t('help.categoryAI', 'AI Assistants'),
    emergency: t('help.categoryEmergency', 'Emergency'),
  };

  return (
    <div className={cn(
      "min-h-screen pb-24 transition-colors duration-300",
      darkModeEnabled ? "bg-slate-950" : "bg-slate-50"
    )}>
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        darkModeEnabled ? "bg-slate-900 border-b border-slate-800" : "bg-white shadow-sm"
      )}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className={cn(
                "p-2 -ml-2 rounded-lg transition-colors",
                darkModeEnabled ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
              )}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className={cn(
                "text-xl font-bold transition-colors",
                darkModeEnabled ? "text-white" : "text-slate-900"
              )}>
                {t('help.title', 'Help Center')}
              </h1>
              <p className={cn(
                "text-xs mt-0.5 transition-colors",
                darkModeEnabled ? "text-slate-400" : "text-slate-500"
              )}>
                {t('help.subtitle', 'Find answers and get support')}
              </p>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5",
              darkModeEnabled ? "bg-srhr/20 text-srhr-light" : "bg-srhr/10 text-srhr"
            )}>
              <Sparkles className="w-3.5 h-3.5" />
              {t('help.aiPowered', 'AI Powered')}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5",
            darkModeEnabled ? "text-slate-500" : "text-slate-400"
          )} />
          <input
            type="text"
            placeholder={t('help.searchPlaceholder', 'Search for help...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-12 pr-4 py-3.5 rounded-2xl transition-all focus:outline-none focus:ring-2",
              darkModeEnabled 
                ? "bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-srhr focus:ring-srhr/20" 
                : "bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-srhr focus:ring-srhr/20"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors",
                darkModeEnabled ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-400"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: Shield, label: t('help.privacy', 'Privacy'), link: '/privacy', color: 'green' },
            { icon: FileText, label: t('help.terms', 'Terms'), link: '/terms', color: 'blue' },
            { icon: MessageCircle, label: t('help.chat', 'Chat'), link: '/chat', color: 'purple' },
            { icon: Phone, label: t('help.emergency', 'Emergency'), link: '/emergency', color: 'red' },
          ].map((item, i) => (
            <Link
              key={i}
              to={item.link}
              className={cn(
                "rounded-xl p-3 text-center transition-all hover:scale-105",
                darkModeEnabled ? "bg-slate-900 border border-slate-800 hover:border-slate-700" : "bg-white border border-slate-200 hover:border-slate-300"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 mx-auto mb-1.5",
                item.color === 'green' ? "text-green-500" :
                item.color === 'blue' ? "text-blue-500" :
                item.color === 'purple' ? "text-purple-500" : "text-red-500"
              )} />
              <span className={cn(
                "text-xs font-medium",
                darkModeEnabled ? "text-slate-300" : "text-slate-600"
              )}>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'faqs', label: t('help.faqs', 'FAQs'), icon: HelpCircle },
            { key: 'guides', label: t('help.guides', 'Guides'), icon: BookOpen },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'faqs' | 'guides')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.key
                  ? darkModeEnabled 
                    ? "bg-srhr/20 text-srhr-light border border-srhr/30" 
                    : "bg-srhr/10 text-srhr border border-srhr/30"
                  : darkModeEnabled
                    ? "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* FAQs Tab */}
        {activeTab === 'faqs' && (
          <>
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    activeCategory === cat
                      ? darkModeEnabled
                        ? "bg-srhr/20 text-srhr-light border border-srhr/30"
                        : "bg-srhr text-white"
                      : darkModeEnabled
                        ? "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  )}
                >
                  {categoryLabels[cat] || cat}
                </button>
              ))}
            </div>

            {/* FAQ List */}
            <div className="space-y-3">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq) => {
                  const isExpanded = expandedFAQ === faq.id;
                  const colors = categoryColors[faq.category] || categoryColors.general;
                  return (
                    <div
                      key={faq.id}
                      className={cn(
                        "rounded-2xl overflow-hidden transition-all duration-300",
                        darkModeEnabled 
                          ? "bg-slate-900 border border-slate-800" 
                          : "bg-white border border-slate-200"
                      )}
                    >
                      <button
                        onClick={() => setExpandedFAQ(isExpanded ? null : faq.id)}
                        className="w-full p-5 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0",
                            darkModeEnabled ? colors.bg.replace('bg-', 'bg-opacity-20 bg-') + ' ' + colors.text : colors.bg + ' ' + colors.text
                          )}>
                            {categoryLabels[faq.category] || faq.category}
                          </span>
                          <span className={cn(
                            "flex-1 font-medium",
                            darkModeEnabled ? "text-white" : "text-slate-900"
                          )}>
                            {getLocalizedFAQ(faq, 'question')}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className={cn(
                              "w-5 h-5 flex-shrink-0",
                              darkModeEnabled ? "text-slate-500" : "text-slate-400"
                            )} />
                          ) : (
                            <ChevronDown className={cn(
                              "w-5 h-5 flex-shrink-0",
                              darkModeEnabled ? "text-slate-500" : "text-slate-400"
                            )} />
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className={cn(
                          "px-5 pb-5",
                          darkModeEnabled ? "border-t border-slate-800" : "border-t border-slate-100"
                        )}>
                          <p className={cn(
                            "pt-4 text-sm leading-relaxed",
                            darkModeEnabled ? "text-slate-300" : "text-slate-600"
                          )}>
                            {getLocalizedFAQ(faq, 'answer')}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className={cn(
                  "rounded-2xl p-8 text-center",
                  darkModeEnabled ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"
                )}>
                  <HelpCircle className={cn(
                    "w-12 h-12 mx-auto mb-3",
                    darkModeEnabled ? "text-slate-700" : "text-slate-300"
                  )} />
                  <p className={cn(
                    "font-medium mb-1",
                    darkModeEnabled ? "text-slate-300" : "text-slate-600"
                  )}>{t('help.noResults', 'No results found')}</p>
                  <p className={cn(
                    "text-sm",
                    darkModeEnabled ? "text-slate-500" : "text-slate-400"
                  )}>{t('help.tryDifferentSearch', 'Try a different search term or category')}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Guides Tab */}
        {activeTab === 'guides' && (
          <div className="grid gap-4">
            {helpContent.guides.map((guide) => {
              const IconComponent = iconMap[guide.icon] || BookOpen;
              const steps = getLocalizedSteps(guide);
              return (
                <div
                  key={guide.id}
                  className={cn(
                    "rounded-2xl overflow-hidden",
                    darkModeEnabled 
                      ? "bg-slate-900 border border-slate-800" 
                      : "bg-white border border-slate-200"
                  )}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                        darkModeEnabled ? "bg-srhr/20" : "bg-srhr/10"
                      )}>
                        <IconComponent className="w-6 h-6 text-srhr" />
                      </div>
                      <div className="flex-1">
                        <h3 className={cn(
                          "font-semibold mb-1",
                          darkModeEnabled ? "text-white" : "text-slate-900"
                        )}>
                          {getLocalizedGuide(guide, 'title')}
                        </h3>
                        <p className={cn(
                          "text-sm mb-4",
                          darkModeEnabled ? "text-slate-400" : "text-slate-500"
                        )}>
                          {getLocalizedGuide(guide, 'description')}
                        </p>
                        <div className="space-y-2">
                          {steps.map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                                darkModeEnabled ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
                              )}>
                                <span className="text-xs font-bold">{i + 1}</span>
                              </div>
                              <span className={cn(
                                "text-sm",
                                darkModeEnabled ? "text-slate-300" : "text-slate-600"
                              )}>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Contact Section */}
        <div className={cn(
          "rounded-2xl p-6 mt-8",
          darkModeEnabled 
            ? "bg-gradient-to-r from-srhr-dark/30 to-srhr/30 border border-srhr/30" 
            : "bg-gradient-to-r from-srhr to-srhr-dark"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
              darkModeEnabled ? "bg-white/10" : "bg-white/20"
            )}>
              <MessageCircle className={cn(
                "w-6 h-6",
                darkModeEnabled ? "text-srhr-light" : "text-white"
              )} />
            </div>
            <div className="flex-1">
              <h2 className={cn(
                "text-lg font-semibold mb-2",
                darkModeEnabled ? "text-white" : "text-white"
              )}>
                {t('help.stillNeedHelp', 'Still need help?')}
              </h2>
              <p className={cn(
                "text-sm mb-4",
                darkModeEnabled ? "text-slate-300" : "text-white/90"
              )}>
                {t('help.contactDesc', 'Our support team is here to assist you. Reach out to us:')}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`mailto:${helpContent.contactEmail}`}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                    darkModeEnabled 
                      ? "bg-srhr text-white hover:bg-srhr-dark" 
                      : "bg-white text-srhr hover:bg-slate-100"
                  )}
                >
                  <Mail className="w-4 h-4" />
                  {helpContent.contactEmail}
                </a>
                {helpContent.supportPhone && (
                  <a
                    href={`tel:${helpContent.supportPhone}`}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      darkModeEnabled 
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700" 
                        : "bg-white/20 text-white hover:bg-white/30"
                    )}
                  >
                    <Phone className="w-4 h-4" />
                    {helpContent.supportPhone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <div className="mt-8 text-center">
          <p className={cn(
            "text-xs",
            darkModeEnabled ? "text-slate-600" : "text-slate-400"
          )}>
            {t('help.version', 'Version')} {new Date(helpContent.lastUpdated).toLocaleDateString()} • {t('help.lastUpdated', 'Last Updated')}
          </p>
        </div>
      </main>
    </div>
  );
}
