import { Brain, Layers, Sparkles, BookOpen, FileText, BarChart3, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { SignedIn, SignedOut, UserButton, SignInButton, useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { isAdmin } from '../lib/roles';
import type { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  id: ViewType;
  labelKey: string;
  icon: React.ReactNode;
  badgeKey?: string;
  adminOnly?: boolean;
}

export function Sidebar({ currentView, onNavigate, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const { user } = useUser();
  const { t } = useTranslation();
  const userIsAdmin = isAdmin(user?.id);

  const navItems: NavItem[] = [
    { id: 'generate', labelKey: 'nav.generate', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'decks', labelKey: 'nav.flashcards', icon: <Layers className="w-5 h-5" /> },
    { id: 'summaries', labelKey: 'nav.summaries', icon: <FileText className="w-5 h-5" /> },
    { id: 'notebook', labelKey: 'nav.notebook', icon: <BookOpen className="w-5 h-5" />, adminOnly: true },
    { id: 'study', labelKey: 'nav.dashboard', icon: <BarChart3 className="w-5 h-5" />, badgeKey: 'nav.soon', adminOnly: true },
  ];

  return (
    <motion.aside
      className="bg-neutral-50 border-r border-neutral-200 flex flex-col relative"
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Logo */}
      <div className="h-16 border-b border-neutral-200 flex items-center px-5 gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-2xl" />
        <div className="w-9 h-9 bg-gradient-to-br from-neutral-900 to-neutral-700 rounded-xl flex items-center justify-center shadow-lg relative">
          <Brain className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="relative">
            <span className="text-neutral-900">Itera</span>
            <SignedIn>
              {userIsAdmin && (
                <div className="absolute -top-1 -right-9">
                  <div className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-1.5 py-0.5 rounded-full shadow-sm">
                    <Shield className="w-2.5 h-2.5" />
                  </div>
                </div>
              )}
            </SignedIn>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-[70px] -right-3 z-10 w-6 h-6 bg-white border border-neutral-200 rounded-full shadow-sm flex items-center justify-center hover:bg-neutral-50 transition-colors"
          aria-label={isCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-neutral-600" /> : <ChevronLeft className="w-3.5 h-3.5 text-neutral-600" />}
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 pt-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const isDisabled = item.adminOnly && !userIsAdmin;
            return (
              <motion.button
                key={item.id}
                onClick={() => !isDisabled && onNavigate(item.id)}
                disabled={isDisabled}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative
                  ${isCollapsed ? 'justify-center' : ''}
                  ${isDisabled
                    ? 'text-neutral-400 opacity-50 cursor-not-allowed pointer-events-none'
                    : isActive
                      ? 'text-neutral-900 bg-white shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                  }
                `}
                whileHover={isDisabled ? {} : { x: isActive ? 0 : 2 }}
                whileTap={isDisabled ? {} : { scale: 0.98 }}
                title={isCollapsed ? t(item.labelKey) : undefined}
              >
                {item.icon}
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{t(item.labelKey)}</span>
                    {item.adminOnly && !userIsAdmin && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-neutral-500 border border-neutral-500/40">
                        {item.badgeKey ? t(item.badgeKey) : t('nav.soon')}
                      </span>
                    )}
                  </>
                )}
                {isActive && !isDisabled && (
                  <motion.div
                    className="absolute inset-0 border-2 border-neutral-900 rounded-xl"
                    layoutId="activeNav"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* User Profile / Login */}
      <div className="p-3 border-t border-neutral-200">
        <SignedIn>
          <div className={`bg-white rounded-xl p-3 border border-neutral-200 shadow-sm ${isCollapsed ? 'flex justify-center' : ''}`}>
            <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9"
                  }
                }}
              />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-900">{t('auth.signedIn')}</p>
                  <p className="text-xs text-neutral-500">{t('auth.manageAccount')}</p>
                </div>
              )}
            </div>
          </div>
        </SignedIn>
        <SignedOut>
          {!isCollapsed ? (
            <div className="space-y-2">
              <SignInButton mode="modal">
                <button className="w-full bg-neutral-900 hover:bg-neutral-800 h-10 shadow-sm rounded-lg text-white text-sm transition-colors">
                  {t('auth.signIn')}
                </button>
              </SignInButton>
              <div className="text-center">
                <p className="text-xs text-neutral-500">
                  {t('auth.saveProgress')}
                </p>
              </div>
            </div>
          ) : (
            <SignInButton mode="modal">
              <button className="w-full bg-neutral-900 hover:bg-neutral-800 h-10 shadow-sm rounded-lg text-white text-sm transition-colors flex items-center justify-center">
                <span className="text-xl">→</span>
              </button>
            </SignInButton>
          )}
        </SignedOut>
      </div>
    </motion.aside>
  );
}
