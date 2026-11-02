import React from 'react';
import { ActivePage } from '../../types';
import {
  LayoutDashboard,
  Target,
  Users,
  Receipt,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileNavProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  onOpenMore: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activePage,
  onSelectPage,
  onOpenMore,
}) => {
  const mainTabs: { id: ActivePage; label: string; icon: React.ElementType }[] = [
    { id: 'status', label: 'Statut', icon: LayoutDashboard },
    { id: 'daily', label: 'Quête', icon: Target },
    { id: 'shadows', label: 'Ombres', icon: Users },
    { id: 'portal', label: 'Portail', icon: Receipt },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0A18]/95 backdrop-blur-2xl border-t border-[#A87FE8]/20 px-2 py-2 flex items-center justify-around font-body">
      {mainTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activePage === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectPage(tab.id)}
            className={cn(
              'flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all min-h-[44px] min-w-[44px] justify-center',
              isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
            )}
          >
            <div
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isActive ? 'bg-[#6600CC] text-white shadow-md' : 'text-inherit'
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
          </button>
        );
      })}

      {/* Bouton Plus pour ouvrir le tiroir des autres modules */}
      <button
        onClick={onOpenMore}
        className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-white/50 hover:text-white transition-all min-h-[44px] min-w-[44px] justify-center"
        aria-label="Ouvrir le menu complet"
      >
        <div className="p-1.5 rounded-lg text-inherit">
          <MoreHorizontal className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-medium tracking-tight">Plus</span>
      </button>
    </nav>
  );
};
