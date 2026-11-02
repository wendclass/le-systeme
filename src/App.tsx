import React, { useState, useCallback } from 'react';
import { ActivePage, Activity } from './types';
import { useAuth } from './context/AuthContext';
import { useSystemData } from './context/SystemDataContext';
import { calculateMilestones } from './lib/calculations';
import { getAppCurrency } from './lib/currency';
import { DEFAULT_TARGET_USD, DEFAULT_TARGET_DATE } from './lib/constants';
import { isClassSModule } from './lib/guard';
import { AccessDeniedView } from './components/common/AccessDeniedView';

// Layout & Common
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { LoginView } from './components/auth/LoginView';
import { OnboardingView } from './components/auth/OnboardingView';

// UI Design System
import { ToastProvider } from './components/ui/Toast';
import { EmptyState } from './components/ui/EmptyState';
import { Button } from './components/ui/Button';

// Views & Components existants (Fenêtre de Statut & Quête)
import { HeroProgress } from './components/dashboard/HeroProgress';
import { OneThingPriority } from './components/dashboard/OneThingPriority';
import { ActivityRankCards } from './components/dashboard/ActivityRankCards';
import { ProfitFirstRings } from './components/dashboard/ProfitFirstRings';
import { UpcomingExpenses } from './components/dashboard/UpcomingExpenses';

import { TransactionList } from './components/transactions/TransactionList';
import { TransactionFormModal } from './components/transactions/TransactionFormModal';

import { RecurringKPIs } from './components/recurring/RecurringKPIs';
import { RecurringCard } from './components/recurring/RecurringCard';
import { RecurringTimeline } from './components/recurring/RecurringTimeline';
import { RecurringFormModal } from './components/recurring/RecurringFormModal';

import { ActivityList } from './components/activities/ActivityList';
import { ActivityFormModal } from './components/activities/ActivityFormModal';
import { ActivityDetailModal } from './components/activities/ActivityDetailModal';

import { DailyQuestView } from './components/daily/DailyQuestView';
import { TaskFormModal } from './components/daily/TaskFormModal';

import { ForecastChart } from './components/forecast/ForecastChart';
import { SettingsView } from './components/settings/SettingsView';

// Modules Class S (Prompts 1, 2 & 3)
import { GrimoireView } from './components/grimoire/GrimoireView';
import { SettingsClassSView } from './components/settings/SettingsClassSView';
import { ShadowsListView } from './components/shadows/ShadowsListView';
import { DossierDetailView } from './components/shadows/DossierDetailView';
import { QuotesListView } from './components/quotes/QuotesListView';
import { QuoteBuilderView } from './components/quotes/QuoteBuilderView';
import { InvoicesListView } from './components/invoices/InvoicesListView';
import { DungeonListView } from './components/dungeon/DungeonListView';
import { DungeonDetailView } from './components/dungeon/DungeonDetailView';
import { ClientPortalView } from './components/client/ClientPortalView';
import { LivreDeCompteView } from './components/book/LivreDeCompteView';

import { Plus, Users, BookOpen, Receipt, Swords, Sliders, Sparkles } from 'lucide-react';

const SIDEBAR_COLLAPSED_PX = 72;
const SIDEBAR_EXPANDED_PX = 256;

const AppContent: React.FC = () => {
  const { user, isSuperAdmin, loading: authLoading, logout } = useAuth();
  const {
    activities,
    clients,
    transactions,
    recurringExpenses,
    dailyTasks,
    settings,
    objective,
    addClient,
    addActivity,
    updateActivity,
    updateActivityRank,
    addTransaction,
    deleteTransaction,
    addRecurringExpense,
    updateRecurringExpense,
    toggleRecurringExpenseStatus,
    deleteRecurringExpense,
    addDailyTask,
    setDailyPriority,
    updateDailyTaskStatus,
    deleteDailyTask,
  } = useSystemData();

  const [activePage, setActivePage] = useState<ActivePage>(() => {
    if (typeof window !== 'undefined') {
      if (
        window.location.hash.includes('livre') ||
        window.location.pathname.includes('/portail/livre')
      ) {
        return 'portal';
      }
    }
    return 'status';
  });
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quoteBuilderDossierId, setQuoteBuilderDossierId] = useState<string | null>(null);
  const [quoteBuilderInitialData, setQuoteBuilderInitialData] = useState<any | null>(null);
  const [isCreatingNewQuote, setIsCreatingNewQuote] = useState(false);
  const [portalTab, setPortalTab] = useState<'devis' | 'factures' | 'livre'>(() => {
    if (typeof window !== 'undefined') {
      if (
        window.location.hash.includes('livre') ||
        window.location.pathname.includes('/portail/livre')
      ) {
        return 'livre';
      }
    }
    return 'devis';
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Détection d'un lien client public (/c/[token] ou ?c=[token] ou #/c/[token])
  const [clientToken, setClientToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/c/')) {
        return pathname.replace('/c/', '').split('/')[0].split('?')[0];
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('c')) {
        return params.get('c');
      }
      if (window.location.hash.startsWith('#/c/')) {
        return window.location.hash.replace('#/c/', '').split('?')[0];
      }
    }
    return null;
  });

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [isActModalOpen, setIsActModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedActivityForDetail, setSelectedActivityForDetail] = useState<Activity | null>(null);
  const [filterRecurringTab, setFilterRecurringTab] = useState<'all' | 'abonnement' | 'autres'>('all');
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const handleExpandChange = useCallback((expanded: boolean) => {
    setSidebarExpanded(expanded);
  }, []);

  const handleSelectPage = useCallback((page: ActivePage) => {
    if (page === 'shadows') {
      setSelectedDossierId(null);
    }
    if (page === 'portal') {
      setIsCreatingNewQuote(false);
      setSelectedQuoteId(null);
    }
    if (page === 'dungeon') {
      setSelectedProjectId(null);
    }
    setActivePage(page);
  }, []);

  const activeCurrency = settings.primary_currency || getAppCurrency();
  const targetUSD =
    objective?.montant_cible ?? (activeCurrency === 'XOF' ? 60000000 : DEFAULT_TARGET_USD);
  const targetDateStr = objective?.date_cible ?? DEFAULT_TARGET_DATE;
  const milestones = calculateMilestones(transactions, targetUSD, targetDateStr, activeCurrency);

  // Accès public client sans authentification (S6)
  if (clientToken) {
    return <ClientPortalView token={clientToken} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0D0A18] flex items-center justify-center font-body">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6600CC] to-[#A87FE8] flex items-center justify-center animate-pulse p-2.5">
            <img
              src="/brand/favicon-32x32.png"
              alt="Logo Class S"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xs font-bold text-[#A87FE8] uppercase tracking-widest">
            Chargement du Système...
          </span>
        </div>
      </div>
    );
  }

  // Non connecté -> Page de connexion
  if (!user) return <LoginView />;

  // Connecté sans objectif financier -> Écran d'onboarding
  if (!objective) return <OnboardingView />;

  // Garde d'accès Super Admin pour les modules Class S
  const isTargetClassS = isClassSModule(activePage);
  if (isTargetClassS && !isSuperAdmin) {
    return (
      <AccessDeniedView
        onReturnToStatus={() => setActivePage('status')}
        onLogout={logout}
      />
    );
  }

  const currentSidebarWidth = sidebarExpanded ? SIDEBAR_EXPANDED_PX : SIDEBAR_COLLAPSED_PX;

  return (
    <div className="min-h-screen bg-[#0D0A18] text-[#F8F5FF] font-body relative overflow-x-hidden">
      {/* Halo nocturne décoratif plafonné à 0.12 */}
      <div className="ambient-halo-nocturne" />

      {/* Sidebar Desktop Fixe */}
      <Sidebar
        activePage={activePage}
        onSelectPage={handleSelectPage}
        onExpandChange={handleExpandChange}
      />

      {/* Contenu Principal avec min-w-0 */}
      <div
        className="flex flex-col min-h-screen min-w-0 pb-20 md:pb-8 transition-all duration-300 ease-out"
        style={{
          marginLeft: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${currentSidebarWidth}px` : undefined,
        }}
      >
        <Header
          activePage={activePage}
          onOpenNewTransaction={() => setIsTxModalOpen(true)}
          onSelectPage={handleSelectPage}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {/* ================= 1. FENÊTRE DE STATUT (DASHBOARD) ================= */}
          {activePage === 'status' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <HeroProgress
                milestone={milestones}
                targetDateStr={targetDateStr}
                onOpenNewTransaction={() => setIsTxModalOpen(true)}
              />

              <OneThingPriority
                tasks={dailyTasks}
                activities={activities}
                onToggleStatus={(taskId, currentStat) =>
                  updateDailyTaskStatus(taskId, currentStat === 'terminee' ? 'a_faire' : 'terminee')
                }
                onNavigateToDaily={() => setActivePage('daily')}
                onOpenNewTask={() => setIsTaskModalOpen(true)}
              />

              <ActivityRankCards
                activities={activities}
                transactions={transactions}
                recurringExpenses={recurringExpenses}
                onSelectActivity={(act) => setSelectedActivityForDetail(act)}
                onOpenNewActivity={() => setIsActModalOpen(true)}
              />

              <ProfitFirstRings
                totalRevenueUSD={milestones.totalRevenueUSD}
                settings={settings.profit_first}
                recurringExpenses={recurringExpenses}
                onOpenSettings={() => setActivePage('settings')}
              />

              <UpcomingExpenses
                recurringExpenses={recurringExpenses}
                activities={activities}
                onNavigateToRecurring={() => setActivePage('recurring')}
                onOpenNewRecurring={() => setIsRecModalOpen(true)}
              />
            </div>
          )}

          {/* ================= 2. TRANSACTIONS ================= */}
          {activePage === 'transactions' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight font-body">
                    Flux de Trésorerie
                  </h2>
                  <p className="text-xs text-white/50 font-body">
                    Historique des revenus et dépenses convertis en USD
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsTxModalOpen(true)}
                >
                  Nouvelle Transaction
                </Button>
              </div>

              <TransactionList
                transactions={transactions}
                activities={activities}
                clients={clients}
                onDeleteTransaction={deleteTransaction}
                onOpenNewTransaction={() => setIsTxModalOpen(true)}
              />
            </div>
          )}

          {/* ================= 3. CHARGES RÉCURRENTES ================= */}
          {activePage === 'recurring' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <RecurringKPIs
                recurringExpenses={recurringExpenses}
                activities={activities}
              />

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10">
                  {(['all', 'abonnement', 'autres'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterRecurringTab(tab)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        filterRecurringTab === tab
                          ? 'bg-[#6600CC] text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {tab === 'all'
                        ? `Tout (${recurringExpenses.length})`
                        : tab === 'abonnement'
                        ? 'Abonnements Logiciels'
                        : 'Autres Charges Fixes'}
                    </button>
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsRecModalOpen(true)}
                >
                  Ajouter une charge
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recurringExpenses
                  .filter((e) => {
                    if (filterRecurringTab === 'abonnement') return e.nature === 'abonnement';
                    if (filterRecurringTab === 'autres') return e.nature !== 'abonnement';
                    return true;
                  })
                  .map((exp) => (
                    <RecurringCard
                      key={exp.id}
                      expense={exp}
                      activity={activities.find((a) => a.id === exp.activite_id)}
                      onToggleStatus={toggleRecurringExpenseStatus}
                      onDelete={deleteRecurringExpense}
                    />
                  ))}
              </div>

              <RecurringTimeline
                recurringExpenses={recurringExpenses}
                activities={activities}
              />
            </div>
          )}

          {/* ================= 4. MES ACTIVITÉS ================= */}
          {activePage === 'activities' && (
            <ActivityList
              activities={activities}
              transactions={transactions}
              recurringExpenses={recurringExpenses}
              onAddActivity={addActivity}
              onUpdateActivity={updateActivity}
              onUpdateRank={updateActivityRank}
            />
          )}

          {/* ================= 5. QUÊTE QUOTIDIENNE ================= */}
          {activePage === 'daily' && (
            <DailyQuestView
              tasks={dailyTasks}
              activities={activities}
              onAddTask={addDailyTask}
              onSetPriority={setDailyPriority}
              onUpdateStatus={updateDailyTaskStatus}
              onDeleteTask={deleteDailyTask}
            />
          )}

          {/* ================= 6. PRÉVISIONS ================= */}
          {activePage === 'forecast' && (
            <ForecastChart
              transactions={transactions}
              targetUSD={targetUSD}
              targetDateStr={targetDateStr}
              onOpenNewTransaction={() => setIsTxModalOpen(true)}
            />
          )}

          {/* ================= MODULES CLASS S (PROMPTS 1 & 2) ================= */}
          {activePage === 'shadows' && (
            <div className="animate-in fade-in duration-300">
              {selectedDossierId ? (
                <DossierDetailView
                  dossierId={selectedDossierId}
                  onBack={() => setSelectedDossierId(null)}
                  onCreateQuote={(dId, initialData) => {
                    setSelectedDossierId(null);
                    setQuoteBuilderDossierId(dId);
                    setQuoteBuilderInitialData(initialData);
                    setSelectedQuoteId(null);
                    setIsCreatingNewQuote(true);
                    setActivePage('portal');
                  }}
                  onOpenQuote={(qId) => {
                    setSelectedDossierId(null);
                    setSelectedQuoteId(qId);
                    setIsCreatingNewQuote(false);
                    setActivePage('portal');
                  }}
                />
              ) : (
                <ShadowsListView
                  onSelectDossier={(dId) => setSelectedDossierId(dId)}
                  onCreateQuoteForDossier={(dId) => {
                    setQuoteBuilderDossierId(dId);
                    setQuoteBuilderInitialData(null);
                    setSelectedQuoteId(null);
                    setIsCreatingNewQuote(true);
                    setActivePage('portal');
                  }}
                />
              )}
            </div>
          )}

          {activePage === 'grimoire' && (
            <div className="animate-in fade-in duration-300">
              <GrimoireView />
            </div>
          )}

          {activePage === 'portal' && (
            <div className="animate-in fade-in duration-300 space-y-6">
              {/* Onglets Portail : Devis vs Factures vs Livre de compte */}
              {!isCreatingNewQuote && !selectedQuoteId && (
                <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setPortalTab('devis')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      portalTab === 'devis'
                        ? 'bg-[#6600CC] text-white shadow-lg shadow-[#6600CC]/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Devis & Propositions
                  </button>
                  <button
                    onClick={() => setPortalTab('factures')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      portalTab === 'factures'
                        ? 'bg-[#6600CC] text-white shadow-lg shadow-[#6600CC]/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Factures & Règlements
                  </button>
                  <button
                    onClick={() => setPortalTab('livre')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      portalTab === 'livre'
                        ? 'bg-[#6600CC] text-white shadow-lg shadow-[#6600CC]/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Livre de compte
                  </button>
                </div>
              )}

              {portalTab === 'livre' && !isCreatingNewQuote && !selectedQuoteId ? (
                <LivreDeCompteView onNavigateToInvoices={() => setPortalTab('factures')} />
              ) : portalTab === 'factures' && !isCreatingNewQuote && !selectedQuoteId ? (
                <InvoicesListView />
              ) : isCreatingNewQuote || selectedQuoteId ? (
                <QuoteBuilderView
                  quoteId={selectedQuoteId || undefined}
                  initialDossierId={quoteBuilderDossierId || undefined}
                  initialData={quoteBuilderInitialData}
                  onBack={() => {
                    setIsCreatingNewQuote(false);
                    setSelectedQuoteId(null);
                    setQuoteBuilderDossierId(null);
                    setQuoteBuilderInitialData(null);
                  }}
                  onNavigateToSettings={() => setActivePage('settings_class_s')}
                  onQuoteSaved={(savedId) => {
                    setSelectedQuoteId(savedId);
                    setIsCreatingNewQuote(false);
                  }}
                />
              ) : (
                <QuotesListView
                  onSelectQuote={(qId) => {
                    setSelectedQuoteId(qId);
                    setIsCreatingNewQuote(false);
                  }}
                  onCreateNewQuote={() => {
                    setSelectedQuoteId(null);
                    setQuoteBuilderDossierId(null);
                    setQuoteBuilderInitialData(null);
                    setIsCreatingNewQuote(true);
                  }}
                />
              )}
            </div>
          )}

          {activePage === 'livre' && (
            <div className="animate-in fade-in duration-300">
              <LivreDeCompteView
                onNavigateToInvoices={() => {
                  setActivePage('portal');
                  setPortalTab('factures');
                }}
              />
            </div>
          )}

          {activePage === 'dungeon' && (
            <div className="animate-in fade-in duration-300">
              {selectedProjectId ? (
                <DungeonDetailView
                  projectId={selectedProjectId}
                  onBack={() => setSelectedProjectId(null)}
                  onCreateSoldeInvoice={(devisId, dossierId) => {
                    setSelectedProjectId(null);
                    setActivePage('portal');
                    setPortalTab('factures');
                  }}
                />
              ) : (
                <DungeonListView
                  onSelectProject={(pId) => setSelectedProjectId(pId)}
                />
              )}
            </div>
          )}

          {activePage === 'settings_class_s' && (
            <div className="animate-in fade-in duration-300">
              <SettingsClassSView />
            </div>
          )}

          {/* ================= RÉGLAGES GÉNÉRAUX ================= */}
          {activePage === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Navigation Mobile en bas */}
      <MobileNav
        activePage={activePage}
        onSelectPage={(p) => {
          handleSelectPage(p);
          setIsMobileMoreOpen(false);
        }}
        onOpenMore={() => setIsMobileMoreOpen(!isMobileMoreOpen)}
      />

      {/* Tiroir Mobile "Plus" */}
      {isMobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#0D0A18]/95 backdrop-blur-2xl p-6 flex flex-col justify-between animate-in fade-in font-body">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Tous les modules
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'status', label: 'Fenêtre de Statut' },
                { id: 'daily', label: 'Quête Quotidienne' },
                { id: 'shadows', label: 'Armée des Ombres' },
                { id: 'grimoire', label: 'Grimoire' },
                { id: 'portal', label: 'Portail' },
                { id: 'livre', label: 'Livre de compte' },
                { id: 'dungeon', label: 'Donjon' },
                { id: 'settings_class_s', label: 'Réglages Class S' },
                { id: 'transactions', label: 'Transactions' },
                { id: 'recurring', label: 'Charges' },
                { id: 'activities', label: 'Activités' },
                { id: 'forecast', label: 'Prévisions' },
                { id: 'settings', label: 'Réglages' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    handleSelectPage(m.id as ActivePage);
                    setIsMobileMoreOpen(false);
                  }}
                  className={`p-3.5 rounded-2xl text-left text-xs font-semibold transition-all border ${
                    activePage === m.id
                      ? 'bg-[#6600CC] text-white border-[#A87FE8]/50 shadow-md'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsMobileMoreOpen(false)}
            className="w-full py-3.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-colors"
          >
            Fermer le menu
          </button>
        </div>
      )}

      {/* Modals Globales existantes */}
      <TransactionFormModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        activities={activities}
        clients={clients}
        onAddTransaction={addTransaction}
        onAddActivity={addActivity}
        onAddClient={addClient}
      />

      <RecurringFormModal
        isOpen={isRecModalOpen}
        onClose={() => setIsRecModalOpen(false)}
        activities={activities}
        onAddRecurringExpense={addRecurringExpense}
      />

      <ActivityFormModal
        isOpen={isActModalOpen}
        onClose={() => setIsActModalOpen(false)}
        onSave={addActivity}
      />

      <ActivityDetailModal
        isOpen={!!selectedActivityForDetail}
        onClose={() => setSelectedActivityForDetail(null)}
        activity={selectedActivityForDetail}
        transactions={transactions}
        recurringExpenses={recurringExpenses}
        onUpdateRank={updateActivityRank}
        onOpenEditActivity={() => {
          setSelectedActivityForDetail(null);
          setIsActModalOpen(true);
        }}
      />

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        activities={activities}
        onAddTask={addDailyTask}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
