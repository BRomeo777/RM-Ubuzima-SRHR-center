import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileText, Edit, Save, X, Eye, Shield, Scale, Users, Clock } from 'lucide-react';
import { usePersistentStore } from '../store';

interface TermsConditionsPageProps {
  onBack: () => void;
}

export default function TermsConditionsPage({ onBack }: TermsConditionsPageProps) {
  const { t } = useTranslation();
  const { isAdminLoggedIn, termsContent, setTermsContent } = usePersistentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(termsContent || defaultTermsContent);

  const handleSave = () => {
    setTermsContent(editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(termsContent || defaultTermsContent);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h1 className="text-xl font-bold text-slate-900">
                {t('terms.title', 'Terms & Conditions')}
              </h1>
            </div>
            
            {/* Admin Edit Button */}
            {isAdminLoggedIn && (
              <div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      <Save className="w-4 h-4" />
                      {t('common.save', 'Save')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    {t('common.edit', 'Edit')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Last Updated */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8">
          <p className="text-sm text-blue-700">
            {t('terms.lastUpdated', 'Last Updated')}: {new Date().toLocaleDateString()}
          </p>
        </div>

        {isEditing ? (
          /* Edit Mode */
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm text-yellow-800">
                {t('terms.adminEditing', 'You are editing the Terms & Conditions. This content will be visible to all users.')}
              </p>
            </div>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-96 p-6 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm leading-relaxed"
              placeholder={t('terms.enterContent', 'Enter terms and conditions content...')}
            />
          </div>
        ) : (
          /* View Mode */
          <div className="prose prose-slate max-w-none">
            {/* Content Sections */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6">
                <div className="whitespace-pre-wrap text-slate-600 leading-relaxed">
                  {(termsContent || defaultTermsContent).split('\n\n').map((paragraph, index) => {
                    // Check if it's a heading (starts with ##)
                    if (paragraph.startsWith('## ')) {
                      return (
                        <h2 key={index} className="text-xl font-bold text-slate-900 mt-8 mb-4">
                          {paragraph.replace('## ', '')}
                        </h2>
                      );
                    }
                    // Check if it's a bullet point
                    if (paragraph.startsWith('- ')) {
                      return (
                        <ul key={index} className="list-disc pl-6 mb-4 space-y-2">
                          {paragraph.split('\n').map((item, i) => (
                            <li key={i} className="text-slate-600">{item.replace('- ', '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    // Regular paragraph
                    return (
                      <p key={index} className="mb-4">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Key Points */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{t('terms.anonymous', 'Anonymous Usage')}</h3>
                </div>
                <p className="text-sm text-slate-600">
                  {t('terms.anonymousDesc', 'Use the app anonymously without revealing your identity')}
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{t('terms.privacy', 'Privacy Protection')}</h3>
                </div>
                <p className="text-sm text-slate-600">
                  {t('terms.privacyDesc', 'Your data is encrypted and protected')}
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{t('terms.community', 'Community Guidelines')}</h3>
                </div>
                <p className="text-sm text-slate-600">
                  {t('terms.communityDesc', 'Respectful and supportive community environment')}
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{t('terms.updates', 'Regular Updates')}</h3>
                </div>
                <p className="text-sm text-slate-600">
                  {t('terms.updatesDesc', 'Terms may be updated periodically')}
                </p>
              </div>
            </div>

            {/* Acceptance Notice */}
            <div className="mt-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Scale className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2">{t('terms.agreement', 'Agreement')}</h2>
                  <p className="text-blue-100">
                    {t('terms.agreementDesc', 'By using RM Ubuzima, you agree to these Terms & Conditions. If you do not agree, please do not use the application.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back to Top */}
        <div className="mt-8 text-center">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
          >
            {t('terms.backToTop', 'Back to Top')} ↑
          </button>
        </div>
      </main>
    </div>
  );
}

// Default Terms Content
const defaultTermsContent = `## Welcome to RM Ubuzima

RM Ubuzima is a secure, anonymous platform for Sexual and Reproductive Health and Rights (SRHR) information and support. By accessing or using our application, you agree to be bound by these Terms and Conditions.

## AI-Generated Content Disclaimer

**RM Ubuzima connects you with trained healthcare providers and facilitators for professional SRHR support.** Educational content is for informational purposes only and does not constitute medical diagnosis, treatment, or professional medical advice. Content from healthcare providers and trained facilitators is professional medical information. Platform navigation assistance is provided by RM Admin AI to help you find resources. For medical concerns, you can consult qualified healthcare professionals directly through the platform. In case of medical emergency, contact emergency services immediately (call 112).

## 1. Acceptance of Terms

By accessing or using RM Ubuzima, you confirm that you are at least 16 years of age or have obtained parental/guardian consent. You agree to comply with all applicable laws and regulations. If you do not agree to these terms, please do not use the platform.

## 2. Anonymous Usage & Privacy

- Users may access the platform anonymously using pseudonyms
- No real identity information is required
- Users are responsible for maintaining the confidentiality of their session
- We use encryption to protect your data
- You can delete your data at any time through settings

## 3. User Conduct & Community Guidelines

You agree to:
- Treat all community members with respect, dignity, and without discrimination
- Not share false, misleading, or harmful health information
- Not harass, bully, threaten, or discriminate against others
- Not use the platform for illegal activities or to exploit others
- Report inappropriate content or behavior to administrators
- Respect the anonymity and privacy of other users

## 4. Content Guidelines

- **Healthcare Provider Content:** Content from trained healthcare providers and facilitators is professional medical information
- **RM Admin AI:** Platform navigation assistance is provided to help you find resources and navigate the app
- User-generated content should be respectful, appropriate, and truthful
- The platform reserves the right to remove harmful, offensive, or inappropriate content
- Facilitators and administrators moderate content to ensure community safety

## 5. Emergency Services

RM Ubuzima is not an emergency service. If you are experiencing a medical emergency, call 112 immediately or go to the nearest hospital. Do not wait for responses on this platform during emergencies.

## 6. Limitation of Liability

To the maximum extent permitted by law, RM Ubuzima and its operators shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of the platform, including but not limited to health decisions made based on information obtained through the platform.

## 7. Data Protection & Privacy

- We prioritize user privacy and use industry-standard security measures
- Personal data is encrypted and stored securely
- We do not sell or share your personal information with third parties
- You have the right to access, modify, or delete your data
- See our Privacy Policy for detailed information

## 8. Modifications to Terms

We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Continued use of the platform after changes constitutes acceptance of the new terms. We will notify users of significant changes through the app.

## 9. Account Termination

We reserve the right to suspend or terminate accounts that violate these terms, engage in harmful behavior, or misuse the platform. Users may delete their accounts at any time through the settings page.

## 10. Contact Information

For questions about these terms, privacy concerns, or to report issues, please contact us at: support@rmubuzima.org or through the Help Center in the app.

## Agreement

By using RM Ubuzima, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions and AI-Generated Content Disclaimer.`;
