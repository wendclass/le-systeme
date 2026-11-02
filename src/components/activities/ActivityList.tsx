import React, { useState } from 'react';
import { Activity, HunterRank, Transaction, RecurringExpense } from '../../types';
import { GlassCard } from '../common/GlassCard';
import { HunterBadge } from '../common/HunterBadge';
import { formatUSD } from '../../lib/utils';
import { getAppCurrency, convertAmount } from '../../lib/currency';
import { Plus, Edit2, Archive, Sparkles, Layers, ArrowUpRight } from 'lucide-react';
import { ActivityDetailModal } from './ActivityDetailModal';
import { ActivityFormModal } from './ActivityFormModal';

interface ActivityListProps {
  activities: Activity[];
  transactions: Transaction[];
  recurringExpenses: RecurringExpense[];
  onAddActivity: (activity: Omit<Activity, 'id' | 'uid' | 'date_creation'>) => Promise<Activity>;
  onUpdateActivity: (id: string, updates: Partial<Activity>) => Promise<void>;
  onUpdateRank: (activityId: string, rank: HunterRank) => Promise<void>;
}

export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  transactions,
  recurringExpenses,
  onAddActivity,
  onUpdateActivity,
  onUpdateRank,
}) => {
  const [selectedActivityForDetail, setSelectedActivityForDetail] = useState<Activity | null>(null);
  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Banner Action */}
      <GlassCard className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#190F2E] to-[#120B24]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight font-jost">
            Gestion des Branches & Rangs Chris Do
          </h2>
          <p className="text-xs text-white/60 max-w-xl mt-1 leading-relaxed">
            Chaque activité économique est suivie individuellement. Ajuste manuellement le rang (E à S) chaque mois en fonction de sa stabilité et son organisation.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-cta px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6600CC] to-[#A87FE8] text-white text-xs font-bold shadow-lg shadow-[#6600CC]/30 hover:opacity-95 flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Activité</span>
        </button>
      </GlassCard>

      {/* Grid of activities */}
      {activities.length === 0 ? (
        <GlassCard className="p-12 text-center flex flex-col items-center justify-center border-dashed border-[#A87FE8]/25">
          <div className="w-14 h-14 rounded-2xl bg-[#6600CC]/20 border border-[#A87FE8]/30 flex items-center justify-center text-[#A87FE8] mb-3">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Crée ta première activité pour commencer ton ascension
          </h3>
          <p className="text-xs text-white/50 max-w-sm mb-4">
            Branding, UI/UX, Direction Artistique... Donne un nom à ton premier pôle de compétences.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-cta px-4 py-2 rounded-xl bg-gradient-to-r from-[#6600CC] to-[#A87FE8] text-white text-xs font-bold"
          >
            + Créer une activité
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activities.map((act) => {
            const actTx = transactions.filter((t) => t.activite_id === act.id);
            const actExp = recurringExpenses.filter((e) => e.activite_id === act.id);
            const activeCurrency = getAppCurrency();
            const totalRev = actTx
              .filter((t) => t.type === 'revenu')
              .reduce((sum, t) => {
                const orig = t.montant_original ?? t.montant_usd ?? 0;
                const fromCurr = t.devise_origine || 'USD';
                return sum + convertAmount(orig, fromCurr, activeCurrency);
              }, 0);
            const totalCost = actTx
              .filter((t) => t.type === 'depense')
              .reduce((sum, t) => {
                const orig = t.montant_original ?? t.montant_usd ?? 0;
                const fromCurr = t.devise_origine || 'USD';
                return sum + convertAmount(orig, fromCurr, activeCurrency);
              }, 0);

            return (
              <GlassCard
                key={act.id}
                className="p-6 flex flex-col justify-between group hover:border-[#A87FE8]/40 transition-all cursor-pointer"
                onClick={() => setSelectedActivityForDetail(act)}
              >
                <div>
                  {/* Header: Color badge + Edit button + Rank */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md"
                        style={{
                          backgroundColor: `${act.couleur}25`,
                          borderColor: `${act.couleur}60`,
                          borderWidth: 1,
                          color: act.couleur,
                        }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-[#A87FE8] transition-colors line-clamp-1">
                          {act.nom}
                        </h3>
                        <span className="text-[11px] text-white/50">
                          {actTx.length} flux • {actExp.length} charge{actExp.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <HunterBadge rank={act.rang_actuel} size="md" />
                  </div>

                  {/* Financials overview */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/5 my-3">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-white/40 block">
                        Revenu cumulé
                      </span>
                      <span className="text-base font-bold text-[#4ADE9A] tabular-nums mt-0.5 block">
                        {formatUSD(totalRev, 0)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-white/40 block">
                        Dépenses
                      </span>
                      <span className="text-base font-bold text-rose-400 tabular-nums mt-0.5 block">
                        {formatUSD(totalCost, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="flex items-center justify-between pt-2 text-xs text-white/60 group-hover:text-white transition-colors">
                  <span className="text-[11px] font-semibold text-[#A87FE8]">
                    Évaluer le rang mensuel
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-[#A87FE8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Activity Detail Modal with Monthly Evaluation */}
      <ActivityDetailModal
        activity={selectedActivityForDetail}
        isOpen={!!selectedActivityForDetail}
        onClose={() => setSelectedActivityForDetail(null)}
        transactions={transactions}
        recurringExpenses={recurringExpenses}
        onUpdateRank={onUpdateRank}
        onOpenEditActivity={(act) => {
          setSelectedActivityForDetail(null);
          setActivityToEdit(act);
        }}
      />

      {/* Activity Create / Edit Modal */}
      <ActivityFormModal
        isOpen={isCreateModalOpen || !!activityToEdit}
        onClose={() => {
          setIsCreateModalOpen(false);
          setActivityToEdit(null);
        }}
        activityToEdit={activityToEdit}
        onSave={async (data) => {
          if (activityToEdit) {
            await onUpdateActivity(activityToEdit.id, data);
          } else {
            await onAddActivity(data);
          }
        }}
      />
    </div>
  );
};
