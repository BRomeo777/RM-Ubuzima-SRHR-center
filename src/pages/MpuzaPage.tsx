import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, Baby, HeartCrack, ShieldAlert } from 'lucide-react';
import { cn } from '../utils/helpers';

interface MpuzaService {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  gradient: string;
  textColor: string;
  bgHover: string;
}

export default function MpuzaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const services: MpuzaService[] = [
    {
      id: 'legal-human-rights',
      icon: Scale,
      label: t('mpuza.legalHumanRights'),
      description: t('mpuza.legalHumanRightsDesc'),
      gradient: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-700',
      bgHover: 'hover:bg-blue-50',
    },
    {
      id: 'family-planning',
      icon: Baby,
      label: t('mpuza.familyPlanning'),
      description: t('mpuza.familyPlanningDesc'),
      gradient: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-700',
      bgHover: 'hover:bg-emerald-50',
    },
    {
      id: 'abortion',
      icon: HeartCrack,
      label: t('mpuza.abortion'),
      description: t('mpuza.abortionDesc'),
      gradient: 'from-rose-500 to-pink-600',
      textColor: 'text-rose-700',
      bgHover: 'hover:bg-rose-50',
    },
    {
      id: 'gender-based-violence',
      icon: ShieldAlert,
      label: t('mpuza.genderBasedViolence'),
      description: t('mpuza.genderBasedViolenceDesc'),
      gradient: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-700',
      bgHover: 'hover:bg-amber-50',
    },
  ];

  return (
    <div className="min-h-full bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/services')}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{t('mpuza.title')}</h1>
              <p className="text-xs text-slate-500">{t('mpuza.subtitle')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Services Grid */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => navigate(`/mpuza/${service.id}`)}
              className={cn(
                'group bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-left',
                'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
                service.bgHover
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    'bg-gradient-to-r shadow-lg',
                    service.gradient
                  )}
                >
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    'font-semibold text-base transition-colors',
                    service.textColor
                  )}>
                    {service.label}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                    {service.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
