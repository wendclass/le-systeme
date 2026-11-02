import React from 'react';
import { RecurringExpense, Activity } from '../../types';
import { GlassCard } from '../common/GlassCard';
import { formatUSD, formatOriginalCurrency, formatDateFr } from '../../lib/utils';
import { formatTransactionAmount, getAppCurrency } from '../../lib/currency';
import { Repeat, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

interface UpcomingExpensesProps {
  recurringExpenses: RecurringExpense[];
  activities: Activity[];
  onNavigateToRecurring: () => void;
  onOpenNewRecurring: () => void;
}

export const UpcomingExpenses: React.FC<UpcomingExpensesProps> = ({
  recurringExpenses,
  activities,
  onNavigateToRecurring,
  onOpenNewRecurring,
}) => {
  const activeExpenses = recurringExpenses.filter((e) => e.statut === 'actif');

  // Compute next charge dates (for next 30 days)
  const upcomingList = activeExpenses.slice(0, 5).map((e) => {
    const act = activities.find((a) => a.id === e.activite_id);
    return {
      ...e,
      activity: act,
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-[#A87FE8]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/80 font-jost">
            Prochaines Échéances (Charges Récurrentes)
          </h2>
        </div>
        <button
          onClick={onNavigateToRecurring}
          className="text-xs text-[#A87FE8] hover:text-white flex items-center gap-1 font-semibold transition-colors"
        >
          <span>Gérer les charges</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {upcomingList.length === 0 ? (
        <GlassCard className="p-5 border-dashed border-[#A87FE8]/25 text-center flex flex-col items-center justify-center">
          <p className="text-xs text-white/60 mb-2">
            Ajoute ta première charge récurrente pour suivre tes frais fixes.
          </p>
          <button
            onClick={onOpenNewRecurring}
            className="text-xs text-[#A87FE8] font-bold hover:underline"
          >
            + Ajouter une charge récurrente
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {upcomingList.map((item) => (
            <GlassCard key={item.id} className="p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] uppercase font-bold text-[#A87FE8] px-2 py-0.5 rounded-md bg-[#6600CC]/20 border border-[#A87FE8]/30">
                    {item.frequence}
                  </span>
                  {item.activity && (
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[80px]"
                      style={{
                        backgroundColor: `${item.activity.couleur}20`,
                        color: item.activity.couleur,
                      }}
                    >
                      {item.activity.nom}
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-white truncate">{item.nom}</h4>
              </div>

              <div className="mt-3 pt-2 border-t border-white/10 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-bold text-white tabular-nums">
                    {formatTransactionAmount(item.montant_original, item.devise_origine, item.montant_usd, 0)}
                  </span>
                  {item.devise_origine !== getAppCurrency() && (
                    <span className="block text-[10px] text-white/40 tabular-nums">
                      {formatOriginalCurrency(item.montant_original, item.devise_origine)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/50">{item.nature}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
