import React from 'react';
import { RecurringExpense, Activity } from '../../types';
import { GlassCard } from '../common/GlassCard';
import { formatUSD, formatDateFr } from '../../lib/utils';
import { formatTransactionAmount } from '../../lib/currency';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

interface RecurringTimelineProps {
  recurringExpenses: RecurringExpense[];
  activities: Activity[];
}

export const RecurringTimeline: React.FC<RecurringTimelineProps> = ({
  recurringExpenses,
  activities,
}) => {
  const activeExpenses = recurringExpenses.filter((e) => e.statut === 'actif');

  // Compute upcoming simulated charge dates for the next 30 days
  const now = new Date();
  const timelineItems: Array<{
    id: string;
    expense: RecurringExpense;
    activity?: Activity;
    dueDate: Date;
  }> = [];

  activeExpenses.forEach((exp) => {
    const act = activities.find((a) => a.id === exp.activite_id);
    const start = new Date(exp.date_premier_paiement);
    const dayOfMonth = start.getDate() || 1;

    // Next charge date
    let nextDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    if (nextDate.getTime() < now.getTime()) {
      nextDate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
    }

    timelineItems.push({
      id: `${exp.id}-${nextDate.toISOString()}`,
      expense: exp,
      activity: act,
      dueDate: nextDate,
    });
  });

  timelineItems.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-[#A87FE8]" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/80 font-jost">
          Timeline des 30 Prochains Prélèvements
        </h3>
      </div>

      {timelineItems.length === 0 ? (
        <p className="text-xs text-white/50 text-center py-4">
          Aucun prélèvement prévu dans les 30 prochains jours.
        </p>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
          {timelineItems.slice(0, 8).map((item) => (
            <div key={item.id} className="relative flex items-center justify-between gap-4">
              {/* Timeline Dot */}
              <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-[#A87FE8] ring-4 ring-[#0D0A18]" />

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{item.expense.nom}</span>
                  {item.activity && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: `${item.activity.couleur}25`,
                        color: item.activity.couleur,
                      }}
                    >
                      {item.activity.nom}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-white/50">
                  Prélèvement prévu le {formatDateFr(item.dueDate.toISOString())}
                </span>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold text-white tabular-nums">
                  {formatTransactionAmount(item.expense.montant_original, item.expense.devise_origine, item.expense.montant_usd, 0)}
                </span>
                <span className="text-[10px] text-white/40 block uppercase">
                  {item.expense.frequence}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};
