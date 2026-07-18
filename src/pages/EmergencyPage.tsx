import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePersistentStore } from '../store';
import { Phone, AlertTriangle, Shield, MessageCircle, Flame, Baby, Heart, ArrowLeft } from 'lucide-react';

const CATEGORY_ICONS: Record<string, typeof Phone> = {
  police: Shield,
  ambulance: Heart,
  fire: Flame,
  suicide: MessageCircle,
  gbv: Shield,
  youth: Baby,
  other: Phone,
};

const CATEGORY_COLORS: Record<string, string> = {
  police: 'bg-blue-100 text-blue-700',
  ambulance: 'bg-red-100 text-red-700',
  fire: 'bg-orange-100 text-orange-700',
  suicide: 'bg-purple-100 text-purple-700',
  gbv: 'bg-pink-100 text-pink-700',
  youth: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function EmergencyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { emergencyContacts } = usePersistentStore();

const handleSMS = (number: string) => {
    window.location.href = `sms:${number}`;
  };

  // Group contacts by category
  const groupedContacts = emergencyContacts.reduce((acc, contact) => {
    if (!acc[contact.category]) {
      acc[contact.category] = [];
    }
    acc[contact.category].push(contact);
    return acc;
  }, {} as Record<string, typeof emergencyContacts>);

  return (
    <div className="page-container">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-rm-gray-600 hover:text-rm-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Home</span>
      </button>

      {/* Warning Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-red-800">{t('emergency.title')}</h1>
            <p className="text-sm text-red-600">{t('emergency.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      {Object.entries(groupedContacts).map(([category, contacts]) => {
        const Icon = CATEGORY_ICONS[category] || Phone;
        const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-700';

        return (
          <div key={category} className="mb-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 ${colorClass}`}>
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium capitalize">{category.replace('_', ' ')}</span>
            </div>

            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-rm-gray-900">{contact.name}</h3>
                      {contact.description && (
                        <p className="text-sm text-rm-gray-500">{contact.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSMS(contact.number)}
                        className="btn-secondary text-sm py-2 px-3"
                        title={t('emergency.smsOption')}
                      >
                        SMS
                      </button>
                      <a
                        href={`tel:${contact.number}`}
                        className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        {contact.number}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {emergencyContacts.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-rm-gray-300 mx-auto mb-4" />
          <p className="text-rm-gray-500">No emergency contacts configured</p>
          <p className="text-sm text-rm-gray-400 mt-2">Please contact the administrator</p>
        </div>
      )}

      {/* Safety Note */}
      <div className="bg-rm-gray-50 rounded-xl p-4 mt-6">
        <h3 className="font-semibold text-rm-gray-800 mb-2">Your Safety Matters</h3>
        <ul className="text-sm text-rm-gray-600 space-y-1">
          <li>• If you're in immediate danger, call emergency services</li>
          <li>• Use SMS for silent communication if needed</li>
          <li>• Your location is never automatically shared</li>
          <li>• All calls are confidential</li>
        </ul>
      </div>

    </div>
  );
}
