import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePersistentStore, useEphemeralStore } from '../../store';
import { Home, BookOpen, LayoutGrid, Settings, Shield, MessageCircle } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface BottomNavigationProps {
  currentPage?: string;
}

// Traditional Navigation - Uses React Router for all devices
const BottomNavigation = memo(({
  currentPage,
}: BottomNavigationProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdminLoggedIn, isUserFacilitator } = usePersistentStore();
  const { session } = useEphemeralStore();

  const isAdminPage = location.pathname === '/admin';
  const pathname = location.pathname;

  // Check if current user is a facilitator
  const currentUser = session?.user;
  const isFacilitator = currentUser?.id && isUserFacilitator
    ? isUserFacilitator(currentUser.id, currentUser)
    : false;

  // Navigation items - traditional routing
  // For facilitators, chat button goes to facilitator-inbox instead of chat
  const mainNavItems = [
    { path: '/', icon: Home, label: t('common.home') },
    { path: '/srhr', icon: BookOpen, label: t('common.srhrInfo') },
    { path: isFacilitator ? '/facilitator-inbox' : '/chat', icon: MessageCircle, label: t('chat.title') },
    { path: '/services', icon: LayoutGrid, label: t('common.services') },
    { path: '/settings', icon: Settings, label: t('common.settings') },
  ];

  // Traditional click handler - always uses React Router
  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Main Bottom Nav - Professional, no space below */}
      <nav className="bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-around items-center py-2 pb-3 sm:pb-2">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-150 min-w-[64px] cursor-pointer select-none active:scale-95',
                    isActive
                      ? 'text-emerald-600 scale-105'
                      : 'text-gray-400 hover:text-gray-600'
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className={cn(
                    'p-1.5 rounded-xl transition-all duration-150',
                    isActive ? 'bg-emerald-100 shadow-sm' : 'hover:bg-gray-50'
                  )}>
                    <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
                </button>
              );
            })}
            
            {/* Admin Button - Only when logged in as admin */}
            {isAdminLoggedIn && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-150 min-w-[64px] cursor-pointer select-none active:scale-95',
                  isAdminPage
                    ? 'text-emerald-600 scale-105'
                    : 'text-gray-400 hover:text-gray-600'
                )}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                aria-current={isAdminPage ? 'page' : undefined}
              >
                <div className={cn(
                  'p-1.5 rounded-xl transition-all duration-150',
                  isAdminPage ? 'bg-emerald-100 shadow-sm' : 'hover:bg-gray-50'
                )}>
                  <Shield className="w-5 h-5" strokeWidth={isAdminPage ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-semibold tracking-tight">{t('common.admin')}</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
});

BottomNavigation.displayName = 'BottomNavigation';

export default BottomNavigation;
