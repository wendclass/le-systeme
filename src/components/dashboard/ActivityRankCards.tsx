import React from 'react';
import { Activity, Transaction, RecurringExpense } from '../../types';
import { HunterBadge } from '../common/HunterBadge';
import { GlassCard } from '../common/GlassCard';
import { StatCounter } from '../common/StatCounter';
import { formatUSD, getMonthYearKey } from '../../lib/utils';
import { getAppCurrency, convertAmount } from '../../lib/currency';
import { Sparkles, ArrowUpRight, Plus, Layers } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface ActivityRankCardsProps {
  activities: Activity[];
  transactions: Transaction[];
  recurringExpenses: RecurringExpense[];
  onSelectActivity: (activity: Activity) => void;
  onOpenNewActivity: () => void;
  onOpenNewTransactionForActivity?: (activityId: string) => void;
}

export const ActivityRankCards: React.FC<ActivityRankCardsProps> = ({
  activities,
  transactions,
  recurringExpenses,
  onSelectActivity,
  onOpenNewActivity,
}) => {
  const currentMonthKey = getMonthYearKey(new Date().toISOString());

  if (activities.length === 0) {
    return (
      <GlassCard className="p-8 border-dashed border-[#A87FE8]/30 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#6600CC]/20 border border-[#A87FE8]/30 flex items-center justify-center text-[#A87FE8] mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">
          Crée ta première activité pour commencer ton ascension
        </h3>
        <p className="text-xs text-white/60 max-w-md mb-4">
          Chaque activité économique est un personnage qui progresse du rang E au rang S.
        </p>
        <button
          onClick={onOpenNewActivity}
          className="btn-cta px-4 py-2 rounded-xl bg-gradient-to-r from-[#6600CC] to-[#A87FE8] text-white text-xs font-semibold flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Créer une activité</span>
        </button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#A87FE8]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/80 font-jost">
            Mes Branches d'Activités & Rangs de Chasseur
          </h2>
        </div>
        <button
          onClick={onOpenNewActivity}
          className="text-xs text-[#A87FE8] hover:text-white flex items-center gap-1 font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouvelle activité</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activities.map((activity) => {
          const actTx = transactions.filter((t) => t.activite_id === activity.id);
          const activeCurrency = getAppCurrency();
          const totalRevenue = actTx
            .filter((t) => t.type === 'revenu')
            .reduce((sum, t) => {
              const orig = t.montant_original ?? t.montant_usd ?? 0;
              const fromCurr = t.devise_origine || 'USD';
              return sum + convertAmount(orig, fromCurr, activeCurrency);
            }, 0);

          const monthRevenue = actTx
            .filter((t) => t.type === 'revenu' && getMonthYearKey(t.date) === currentMonthKey)
            .reduce((sum, t) => {
              const orig = t.montant_original ?? t.montant_usd ?? 0;
              const fromCurr = t.devise_origine || 'USD';
              return sum + convertAmount(orig, fromCurr, activeCurrency);
            }, 0);

          // Build last 6 months sparkline data
          const sparklineData = Array.from({ length: 6 }).map((_, idx) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - idx));
            const mKey = getMonthYearKey(d.toISOString());
            const rev = actTx
              .filter((t) => t.type === 'revenu' && getMonthYearKey(t.date) === mKey)
              .reduce((s, t) => {
                const orig = t.montant_original ?? t.montant_usd ?? 0;
                const fromCurr = t.devise_origine || 'USD';
                return s + convertAmount(orig, fromCurr, activeCurrency);
              }, 0);
            return { month: mKey, val: rev };
          });

          return (
            <GlassCard
              key={activity.id}
              onClick={() => onSelectActivity(activity)}
              className="p-5 cursor-pointer group hover:border-[#A87FE8]/50 transition-all flex flex-col justify-between"
            >
              {/* Top row: Name, Icon, Rank Badge */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md"
                    style={{
                      backgroundColor: `${activity.couleur}25`,
                      borderColor: `${activity.couleur}60`,
                      borderWidth: 1,
                      color: activity.couleur,
                    }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-[#A87FE8] transition-colors line-clamp-1">
                      {activity.nom}
                    </h3>
                    <span className="text-[11px] text-white/50">
                      {actTx.length} transaction{actTx.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Hunter Rank Badge */}
                <HunterBadge rank={activity.rang_actuel} size="md" showDetails={false} />
              </div>

              {/* Middle row: Month Revenue Countup & Sparkline */}
              <div className="grid grid-cols-2 gap-2 items-end mb-4 pt-2 border-t border-white/5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/40 block font-semibold">
                    Revenu du mois
                  </span>
                  <div className="text-lg font-bold text-white tabular-nums mt-0.5">
                    <StatCounter value={monthRevenue} currency="USD" />
                  </div>
                  <span className="text-[10px] text-white/50">
                    Total: {formatUSD(totalRevenue, 0)}
                  </span>
                </div>

                {/* Mini Sparkline */}
                <div className="h-10 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                      <defs>
                        <linearGradient id={`grad_${activity.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={activity.couleur} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={activity.couleur} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="val"
                        stroke={activity.couleur}
                        strokeWidth={2}
                        fill={`url(#grad_${activity.id})`}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bottom row: Click to inspect & evaluate */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10 text-white/50 group-hover:text-white transition-colors">
                <span className="text-[11px]">Ajuster le rang & détails</span>
                <ArrowUpRight className="w-4 h-4 text-[#A87FE8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
