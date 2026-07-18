import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  User,
  Calendar,
  Building2,
  MapPin,
  Users,
  HeartPulse
} from 'lucide-react';
import { cn } from '../utils/helpers';
import GirlIcon from '../components/GirlIcon';

interface ServiceItem {
  path: string;
  icon: React.ElementType;
  label: string;
  description: string;
  gradient: string;
  textColor: string;
  bgHover: string;
}

export default function ServicesPage() {
  const { t } = useTranslation();

  const services: ServiceItem[] = [
    {
      path: '/book-doctor',
      icon: User,
      label: t('common.bookDoctor'),
      description: 'Schedule online consultations with SRHR healthcare providers',
      gradient: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-700',
      bgHover: 'hover:bg-blue-50',
    },
    {
      path: '/baza-muganga',
      icon: Calendar,
      label: t('baza.title'),
      description: 'Meet a doctor weekly',
      gradient: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-700',
      bgHover: 'hover:bg-purple-50',
    },
    {
      path: '/clinics',
      icon: MapPin,
      label: t('home.findNearFacility'),
      description: 'Locate nearby health facilities',
      gradient: 'from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-700',
      bgHover: 'hover:bg-emerald-50',
    },
    {
      path: '/mpuza',
      icon: Building2,
      label: t('mpuza.title'),
      description: t('mpuza.subtitle'),
      gradient: 'from-amber-500 to-orange-500',
      textColor: 'text-amber-700',
      bgHover: 'hover:bg-amber-50',
    },
    {
      path: '/girls-room',
      icon: GirlIcon,
      label: t('home.girlsRoom'),
      description: 'Baza Shangazi, consent training & lessons',
      gradient: 'from-srhr-dark to-cool-700',
      textColor: 'text-srhr-dark',
      bgHover: 'hover:bg-srhr/10',
    },
    {
      path: '/groups',
      icon: Users,
      label: t('groups.title'),
      description: 'Create and join discussion groups',
      gradient: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-700',
      bgHover: 'hover:bg-emerald-50',
    },
  ];

  return (
    <div className="min-h-full bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">{t('common.services')}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Services Grid */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((service: any) => (
            <Link
              key={service.path}
              to={service.path}
              className={cn(
                'group bg-white rounded-2xl p-4 border border-slate-200 shadow-sm',
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
            </Link>
          ))}
        </div>

        {/* Quick Info Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
          <h2 className="font-semibold text-slate-900 mb-2">{t('home.needHelp')}</h2>
          <p className="text-sm text-slate-600 mb-4">
            Access emergency services or get assistance with using the app.
          </p>
          <Link
            to="/emergency"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            <HeartPulse className="w-4 h-4" />
            {t('common.emergency')}
          </Link>
        </div>
      </main>
    </div>
  );
}
