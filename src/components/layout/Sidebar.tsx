import React, { useState, useEffect } from 'react';
import { ActivePage } from '../../types';
import {
  LayoutDashboard,
  Target,
  Users,
  BookOpen,
  Receipt,
  Swords,
  Sliders,
  FileSpreadsheet,
  ArrowLeftRight,
  Repeat,
  Layers,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSystemData } from '../../context/SystemDataContext';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdmin } from '../../lib/guard';
import { formatUSD } from '../../lib/utils';
import { calculateMilestones } from '../../lib/calculations';

interface SidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  onExpandChange?: (expanded: boolean) => void;
}

interface NavItem {
  id: ActivePage;
  label: string;
  icon: React.ElementType;
  section?: 'main' | 'class_s' | 'finances' | 'config';
  isClassSOnly?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  onExpandChange,
}) => {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { objective, transactions } = useSystemData();
  const { user } = useAuth();
  const userIsAdmin = isSuperAdmin(user);

  const isExpanded = isPinned || isHovered;

  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded, onExpandChange]);

  const milestone = objective
    ? calculateMilestones(transactions, objective.montant_cible, objective.date_cible)
    : null;

  const navItems: NavItem[] = [
    // Socle principal existant
    { id: 'status', label: 'Fenêtre de Statut', icon: LayoutDashboard, section: 'main' },
    { id: 'daily', label: 'Quête Quotidienne', icon: Target, section: 'main' },

    // Modules Class S (Prompt 1 à 5)
    { id: 'shadows', label: 'Armée des Ombres', icon: Users, section: 'class_s', isClassSOnly: true },
    { id: 'grimoire', label: 'Grimoire', icon: BookOpen, section: 'class_s', isClassSOnly: true },
    { id: 'portal', label: 'Portail', icon: Receipt, section: 'class_s', isClassSOnly: true },
    { id: 'livre', label: 'Livre de compte', icon: FileSpreadsheet, section: 'class_s', isClassSOnly: true },
    { id: 'dungeon', label: 'Donjon', icon: Swords, section: 'class_s', isClassSOnly: true },
    { id: 'settings_class_s', label: 'Réglages Class S', icon: Sliders, section: 'class_s', isClassSOnly: true },

    // Gestion financière existante
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, section: 'finances' },
    { id: 'recurring', label: 'Charges récurrentes', icon: Repeat, section: 'finances' },
    { id: 'activities', label: 'Mes Activités', icon: Layers, section: 'finances' },
    { id: 'forecast', label: 'Prévisions', icon: TrendingUp, section: 'finances' },

    // Paramètres généraux
    { id: 'settings', label: 'Réglages', icon: Settings, section: 'config' },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed top-0 left-0 bottom-0 z-40 flex flex-col justify-between transition-all duration-300 ease-out',
        'bg-[#0D0A18]/95 backdrop-blur-2xl border-r border-[#A87FE8]/20 shadow-[8px_0_32px_rgba(13,10,24,0.5)]',
        isExpanded ? 'w-64' : 'w-[72px]',
        'hidden md:flex font-body'
      )}
    >
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Header */}
        <div className="flex items-center justify-between h-20 px-4 border-b border-white/10 shrink-0">
          <div
            onClick={() => onSelectPage('status')}
            className="flex items-center gap-3 cursor-pointer select-none overflow-hidden"
          >
            <div className="w-10 h-10 min-w-[40px] rounded-2xl bg-gradient-to-tr from-[#6600CC] to-[#A87FE8] flex items-center justify-center shadow-lg shadow-[#6600CC]/30 overflow-hidden p-2">
              <img
                src="/brand/favicon-32x32.png"
                alt="Logo Class S"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            {isExpanded && (
              <div className="flex flex-col whitespace-nowrap animate-in fade-in duration-200">
                <span className="font-extrabold text-base tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F8F5FF] to-[#C9A070] font-body">
                  LE SYSTÈME
                </span>
                <span className="text-[10px] text-[#A87FE8] font-bold tracking-widest uppercase">
                  Class S · Rang S
                </span>
              </div>
            )}
          </div>

          {isExpanded && (
            <button
              onClick={() => setIsPinned(!isPinned)}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title={isPinned ? 'Désépingler' : 'Épingler'}
            >
              {isPinned ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-left font-medium transition-all duration-200 group relative',
                  isActive
                    ? 'bg-gradient-to-r from-[#6600CC]/80 to-[#A87FE8]/40 text-white shadow-md border border-[#A87FE8]/40'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <div
                  className={cn(
                    'p-1.5 rounded-xl transition-colors shrink-0',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-[#A87FE8]/80 group-hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>

                {isExpanded && (
                  <div className="flex items-center justify-between flex-1 overflow-hidden whitespace-nowrap animate-in fade-in duration-200">
                    <span className="text-sm font-medium tracking-tight truncate">{item.label}</span>
                    {item.isClassSOnly && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#6600CC]/30 text-[#A87FE8] border border-[#A87FE8]/30 font-semibold uppercase tracking-wider flex items-center gap-1">
                        {userIsAdmin ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-[#2FA77A]" />
                            <span>Class S</span>
                          </>
                        ) : (
                          <span>Pro</span>
                        )}
                      </span>
                    )}
                  </div>
                )}

                {/* Tooltip when collapsed */}
                {!isExpanded && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#0D0A18] border border-[#A87FE8]/30 shadow-xl text-xs font-semibold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.label}
                    {item.isClassSOnly && (
                      <span className="ml-2 text-[10px] text-[#A87FE8] font-bold">· Class S</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Dynamic Objective Progress Pill */}
      {isExpanded && objective && (
        <div className="p-4 m-3 rounded-2xl bg-[#6600CC]/20 border border-[#A87FE8]/30 backdrop-blur-md animate-in fade-in shrink-0 font-body">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-white/70 font-medium">Objectif Rang S</span>
            <span className="text-[#C9A070] font-bold tabular-nums">
              {formatUSD(objective.montant_cible, 0)}
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#6600CC] via-[#A87FE8] to-[#C9A070] h-full rounded-full transition-all duration-700"
              style={{ width: `${milestone?.percentage ?? 0}%` }}
            />
          </div>
          <p className="text-[10px] text-white/50 mt-1.5 truncate">
            Cible :{' '}
            {new Date(objective.date_cible + 'T12:00:00').toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      )}
    </aside>
  );
};
