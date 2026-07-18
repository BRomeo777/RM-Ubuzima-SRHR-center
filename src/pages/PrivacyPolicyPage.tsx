import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePersistentStore } from '../store';
import type { PrivacySection } from '../store';
import { 
  ArrowLeft, Shield, Eye, Lock, Trash2, Cookie, Users, FileText, Mail, Calendar,
  ShieldCheck, Fingerprint, Database, Globe, Clock, AlertCircle
} from 'lucide-react';
import { cn } from '../utils/helpers';

interface PrivacyPolicyPageProps {
  onBack?: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  Shield,
  Eye,
  Lock,
  Trash2,
  Cookie,
  Users,
  FileText,
  Globe,
  Clock,
  AlertCircle,
  ShieldCheck,
  Fingerprint,
  Database,
};

export default function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { privacyContent, darkModeEnabled } = usePersistentStore();
  const currentLang = i18n.language as 'en' | 'rw' | 'fr' | 'sw';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // Get localized content
  const getLocalizedText = (item: PrivacySection, field: 'title' | 'content') => {
    const langMap: Record<string, string> = {
      en: '',
      rw: 'Kinyarwanda',
      fr: 'French',
      sw: 'Swahili',
    };
    const suffix = langMap[currentLang];
    if (suffix && currentLang !== 'en') {
      const key = `${field}${suffix}` as keyof PrivacySection;
      const value = item[key] as string;
      if (value) return value;
    }
    return item[field];
  };

  const getLocalizedIntro = () => {
    const langMap: Record<string, string> = {
      en: 'introduction',
      rw: 'introductionKinyarwanda',
      fr: 'introductionFrench',
      sw: 'introductionSwahili',
    };
    const key = langMap[currentLang];
    const value = privacyContent[key as keyof typeof privacyContent] as string;
    return value || privacyContent.introduction;
  };

  const lastUpdated = new Date(privacyContent.lastUpdated).toLocaleDateString(currentLang === 'en' ? 'en-US' : currentLang === 'rw' ? 'rw-RW' : currentLang === 'fr' ? 'fr-FR' : 'sw-KE');

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
                {t('privacy.title', 'Privacy Policy')}
              </h1>
              <p className={cn(
                "text-xs mt-0.5 transition-colors",
                darkModeEnabled ? "text-slate-400" : "text-slate-500"
              )}>
                {t('privacy.subtitle', 'How we protect your data')}
              </p>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5",
              darkModeEnabled ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"
            )}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('privacy.verified', 'Verified')}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Last Updated Banner */}
        <div className={cn(
          "rounded-2xl p-4 mb-8 flex items-center gap-3",
          darkModeEnabled ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-100"
        )}>
          <Calendar className={cn(
            "w-5 h-5",
            darkModeEnabled ? "text-blue-400" : "text-blue-600"
          )} />
          <div>
            <p className={cn(
              "text-sm font-medium",
              darkModeEnabled ? "text-blue-300" : "text-blue-700"
            )}>
              {t('privacy.lastUpdated', 'Last Updated')}: {lastUpdated}
            </p>
            <p className={cn(
              "text-xs",
              darkModeEnabled ? "text-blue-400/70" : "text-blue-600/70"
            )}>
              {t('privacy.version', 'Version')}: 2.0
            </p>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: ShieldCheck, label: t('privacy.encrypted', 'Encrypted') },
            { icon: Fingerprint, label: t('privacy.anonymous', 'Anonymous') },
            { icon: Database, label: t('privacy.localStorage', 'Local Storage') },
            { icon: Globe, label: t('privacy.noTracking', 'No Tracking') },
          ].map((badge, i) => (
            <div key={i} className={cn(
              "rounded-xl p-3 text-center transition-colors",
              darkModeEnabled ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"
            )}>
              <badge.icon className={cn(
                "w-5 h-5 mx-auto mb-1.5",
                darkModeEnabled ? "text-srhr-light" : "text-srhr"
              )} />
              <span className={cn(
                "text-xs font-medium",
                darkModeEnabled ? "text-slate-300" : "text-slate-600"
              )}>{badge.label}</span>
            </div>
          ))}
        </div>

        {/* Introduction */}
        <div className={cn(
          "rounded-2xl p-6 mb-8",
          darkModeEnabled ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
              darkModeEnabled ? "bg-srhr/20" : "bg-srhr/10"
            )}>
              <FileText className="w-6 h-6 text-srhr" />
            </div>
            <div>
              <h2 className={cn(
                "text-lg font-semibold mb-2",
                darkModeEnabled ? "text-white" : "text-slate-900"
              )}>
                {t('privacy.overview', 'Privacy Overview')}
              </h2>
              <p className={cn(
                "leading-relaxed text-sm",
                darkModeEnabled ? "text-slate-300" : "text-slate-600"
              )}>
                {getLocalizedIntro()}
              </p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          <h3 className={cn(
            "text-sm font-semibold uppercase tracking-wider mb-4",
            darkModeEnabled ? "text-slate-400" : "text-slate-500"
          )}>
            {t('privacy.sections', 'Policy Sections')}
          </h3>
          
          {privacyContent.sections.map((section, index) => {
            const IconComponent = iconMap[section.icon] || Shield;
            return (
              <div
                key={section.id}
                className={cn(
                  "rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg",
                  darkModeEnabled ? "bg-slate-900 border border-slate-800 hover:border-slate-700" : "bg-white border border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                      darkModeEnabled ? "bg-slate-800" : "bg-slate-100"
                    )}>
                      <IconComponent className={cn(
                        "w-6 h-6",
                        darkModeEnabled ? "text-srhr-light" : "text-srhr"
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full",
                          darkModeEnabled ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                        )}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h2 className={cn(
                          "text-lg font-semibold",
                          darkModeEnabled ? "text-white" : "text-slate-900"
                        )}>
                          {getLocalizedText(section, 'title')}
                        </h2>
                      </div>
                      <p className={cn(
                        "leading-relaxed text-sm",
                        darkModeEnabled ? "text-slate-300" : "text-slate-600"
                      )}>
                        {getLocalizedText(section, 'content')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Retention Info */}
        <div className={cn(
          "rounded-2xl p-6 mt-8",
          darkModeEnabled ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-100"
        )}>
          <div className="flex items-start gap-4">
            <Clock className={cn(
              "w-6 h-6 flex-shrink-0",
              darkModeEnabled ? "text-amber-400" : "text-amber-600"
            )} />
            <div>
              <h3 className={cn(
                "font-semibold mb-1",
                darkModeEnabled ? "text-amber-300" : "text-amber-800"
              )}>
                {t('privacy.dataRetentionTitle', 'Data Retention Period')}
              </h3>
              <p className={cn(
                "text-sm",
                darkModeEnabled ? "text-amber-400/80" : "text-amber-700"
              )}>
                {t('privacy.dataRetentionInfo', 'Session data is automatically cleared after {{days}} days of inactivity. You can manually clear all data from Settings at any time.', { days: privacyContent.dataRetentionDays })}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className={cn(
          "rounded-2xl p-6 mt-8 text-center",
          darkModeEnabled 
            ? "bg-gradient-to-r from-srhr-dark/30 to-srhr/30 border border-srhr/30" 
            : "bg-gradient-to-r from-srhr to-srhr-dark"
        )}>
          <Mail className={cn(
            "w-8 h-8 mx-auto mb-3",
            darkModeEnabled ? "text-srhr-light" : "text-white"
          )} />
          <h2 className={cn(
            "text-lg font-semibold mb-2",
            darkModeEnabled ? "text-white" : "text-white"
          )}>
            {t('privacy.questions', 'Questions or Concerns?')}
          </h2>
          <p className={cn(
            "text-sm mb-4 max-w-md mx-auto",
            darkModeEnabled ? "text-slate-300" : "text-white/90"
          )}>
            {t('privacy.contactDesc', 'If you have any questions about our privacy practices, please contact our Data Protection Officer:')}
          </p>
          <a
            href={`mailto:${privacyContent.contactEmail}`}
            className={cn(
              "inline-block px-6 py-2.5 rounded-xl font-medium text-sm transition-all",
              darkModeEnabled 
                ? "bg-srhr text-white hover:bg-srhr-dark" 
                : "bg-white text-srhr hover:bg-slate-100"
            )}
          >
            {privacyContent.contactEmail}
          </a>
        </div>

        {/* Back to Top */}
        <div className="mt-8 text-center">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={cn(
              "text-sm font-medium transition-colors inline-flex items-center gap-1",
              darkModeEnabled ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t('privacy.backToTop', 'Back to Top')}
            <span className="text-lg">↑</span>
          </button>
        </div>
      </main>
    </div>
  );
}
