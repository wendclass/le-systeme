import React from 'react';
import { ActivePage } from '../../types';
import { SyncIndicator } from '../common/SyncIndicator';
import { useSystemData } from '../../context/SystemDataContext';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdmin } from '../../lib/guard';
import { PlusCircle, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activePage: ActivePage;
  onOpenNewTransaction: () => void;
  onSelectPage: (page: ActivePage) => void;
}

const PAGE_TITLES: Record<ActivePage, { title: string; subtitle: string }> = {
  status: {
    title: 'Fenêtre de Statut',
    subtitle: 'Tableau de bord financier · Progression vers le Rang S',
  },
  daily: {
    title: 'Quête Quotidienne',
    subtitle: 'The One Thing · La Question Ciblante de chaque journée',
  },
  shadows: {
    title: 'Armée des Ombres',
    subtitle: 'Dossiers clients, examen des demandes et appels de cadrage',
  },
  grimoire: {
    title: 'Grimoire',
    subtitle: 'Catalogue de services et prestations de Class S',
  },
  portal: {
    title: 'Portail',
    subtitle: 'Devis, factures, encaissements et livre de compte',
  },
  livre: {
    title: 'Livre de compte',
    subtitle: 'Journal chronologique consolidé et exports financiers',
  },
  dungeon: {
    title: 'Donjon',
    subtitle: 'Suivi de production des projets et jalons par étapes',
  },
  settings_class_s: {
    title: 'Réglages Class S',
    subtitle: 'Émetteur officiel, modèle de base et messages WhatsApp',
  },
  transactions: {
    title: 'Transactions & Trésorerie',
    subtitle: 'Historique des flux de revenus et dépenses',
  },
  recurring: {
    title: 'Charges Récurrentes',
    subtitle: 'Abonnements et charges fixes de fonctionnement',
  },
  activities: {
    title: 'Mes Activités Économiques',
    subtitle: 'Progression des pôles de valeur selon le framework Chris Do',
  },
  forecast: {
    title: 'Prévisions & Trajectoire',
    subtitle: 'Projections financières basées sur tes données historiques',
  },
  settings: {
    title: 'Réglages du Système',
    subtitle: 'Paramétrage Profit First, devises, cloud et options',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onOpenNewTransaction,
  onSelectPage,
}) => {
  const { syncState, syncErrorMessage, triggerManualSync } = useSystemData();
  const { user } = useAuth();
  const userIsAdmin = isSuperAdmin(user);

  const currentInfo = PAGE_TITLES[activePage] || {
    title: 'Le Système',
    subtitle: 'Class S',
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-20 px-4 sm:px-8 bg-[#0D0A18]/80 backdrop-blur-xl border-b border-[#A87FE8]/15 font-body">
      {/* Title block */}
      <div className="flex flex-col min-w-0 pr-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-display flex items-center gap-2 truncate">
          <span>{currentInfo.title}</span>
          {userIsAdmin && (activePage === 'shadows' || activePage === 'portal' || activePage === 'dungeon' || activePage === 'grimoire' || activePage === 'settings_class_s') && (
            <span title="Accès vérifié Super Admin">
              <ShieldCheck className="w-5 h-5 text-[#C9A070] shrink-0" />
            </span>
          )}
        </h1>
        <p className="text-xs text-white/50 hidden sm:block font-normal truncate mt-0.5">
          {currentInfo.subtitle}
        </p>
      </div>

      {/* Actions & Status */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Sync Status Badge */}
        <SyncIndicator
          state={syncState}
          errorMessage={syncErrorMessage}
          onRetry={triggerManualSync}
        />

        {/* Quick Add Transaction CTA */}
        <button
          onClick={onOpenNewTransaction}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 min-h-[44px] rounded-full bg-[#6600CC] text-[#F8F5FF] text-xs sm:text-sm font-semibold shadow-lg shadow-[#6600CC]/30 hover:bg-[#7711DD] hover:-translate-y-0.5 active:translate-y-0 transition-all select-none cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Nouvelle Transaction</span>
          <span className="sm:hidden">Ajouter</span>
        </button>

        {/* User profile button */}
        <button
          onClick={() => onSelectPage('settings')}
          className="flex items-center gap-2 p-1.5 min-h-[44px] min-w-[44px] rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 select-none cursor-pointer"
          title={`Connecté en tant que ${user?.email || 'Chasseur'}`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6600CC] via-[#A87FE8] to-[#C9A070] p-[1.5px] shadow-md">
            <div className="w-full h-full rounded-[10px] bg-[#0D0A18] flex items-center justify-center overflow-hidden">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-xs font-bold text-[#A87FE8]">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SN'}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};
