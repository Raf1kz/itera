import { Sparkles, FileText, GraduationCap, Library } from 'lucide-react';
import type { ViewType, NavigationView } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: NavigationView) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const navItems = [
    { id: 'generate', icon: Sparkles, label: 'Generate' },
    { id: 'study', icon: GraduationCap, label: 'Study' },
    { id: 'summaries', icon: FileText, label: 'Summaries' },
    { id: 'decks', icon: Library, label: 'Decks' },
  ] as const;

  return (
    <aside className="w-60 border-r border-border bg-sidebar flex flex-col">
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm tracking-tight text-sidebar-foreground">FlashStudy</span>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || 
              (item.id === 'summaries' && currentView === 'summary-detail');
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as any)}
                className={`
                  w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm
                  transition-colors duration-150
                  ${isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
