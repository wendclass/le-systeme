import React, { useState } from 'react';
import { Activity, HunterRank, Transaction, RecurringExpense } from '../../types';
import { HUNTER_RANKS } from '../../lib/constants';
import { Modal } from '../common/Modal';
import { HunterBadge } from '../common/HunterBadge';
import { formatUSD, formatOriginalCurrency, formatDateFr, getMonthYearKey } from '../../lib/utils';
import { getAppCurrency, convertAmount, formatTransactionAmount } from '../../lib/currency';
import { GlassCard } from '../common/GlassCard';
import {
  Sparkles,
  TrendingUp,
  BarChart2,
  Calendar,
  Layers,
  Repeat,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import confetti from 'canvas-confetti';

interface ActivityDetailModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  recurringExpenses: RecurringExpense[];
  onUpdateRank: (activityId: string, rank: HunterRank) => Promise<void>;
  onOpenEditActivity: (activity: Activity) => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  isOpen,
  onClose,
  transactions,
  recurringExpenses,
  onUpdateRank,
  onOpenEditActivity,
}) => {
  if (!activity) return null;

  const [selectedRank, setSelectedRank] = useState<HunterRank>(activity.rang_actuel);
  const [isSavingRank, setIsSavingRank] = useState(false);
  const [rankSavedFeedback, setRankSavedFeedback] = useState(false);

  const actTx = transactions.filter((t) => t.activite_id === activity.id);
  const actExpenses = recurringExpenses.filter((e) => e.activite_id === activity.id);
  const activeCurrency = getAppCurrency();

  const totalRevenue = actTx
    .filter((t) => t.type === 'revenu')
    .reduce((sum, t) => {
      const orig = t.montant_original ?? t.montant_usd ?? 0;
      const fromCurr = t.devise_origine || 'USD';
      return sum + convertAmount(orig, fromCurr, activeCurrency);
    }, 0);

  const totalExpenses = actTx
    .filter((t) => t.type === 'depense')
    .reduce((sum, t) => {
      const orig = t.montant_original ?? t.montant_usd ?? 0;
      const fromCurr = t.devise_origine || 'USD';
      return sum + convertAmount(orig, fromCurr, activeCurrency);
    }, 0);

  const netProfit = totalRevenue - totalExpenses;

  // Monthly breakdown for BarChart (last 6 months)
  const monthlyChartData = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - idx));
    const mKey = getMonthYearKey(d.toISOString());
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d);

    const rev = actTx
      .filter((t) => t.type === 'revenu' && getMonthYearKey(t.date) === mKey)
      .reduce((sum, t) => {
        const orig = t.montant_original ?? t.montant_usd ?? 0;
        const fromCurr = t.devise_origine || 'USD';
        return sum + convertAmount(orig, fromCurr, activeCurrency);
      }, 0);

    const exp = actTx
      .filter((t) => t.type === 'depense' && getMonthYearKey(t.date) === mKey)
      .reduce((sum, t) => {
        const orig = t.montant_original ?? t.montant_usd ?? 0;
        const fromCurr = t.devise_origine || 'USD';
        return sum + convertAmount(orig, fromCurr, activeCurrency);
      }, 0);

    return { month: label, revenu: rev, depense: exp };
  });

  const handleSaveRank = async () => {
    setIsSavingRank(true);
    try {
      await onUpdateRank(activity.id, selectedRank);
      if (selectedRank === 'S') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6600CC', '#A87FE8', '#C9A070', '#FFFFFF'],
        });
      }
      setRankSavedFeedback(true);
      setTimeout(() => setRankSavedFeedback(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingRank(false);
    }
  };

  const ranksList: HunterRank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activity.nom}
      subtitle={`Détails de l'activité • Rang ${activity.rang_actuel}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">
              Revenus Totaux
            </span>
            <span className="text-lg font-bold text-[#4ADE9A] tabular-nums block mt-0.5">
              {formatUSD(totalRevenue, 0)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">
              Dépenses Directes
            </span>
            <span className="text-lg font-bold text-rose-400 tabular-nums block mt-0.5">
              {formatUSD(totalExpenses, 0)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">
              Profit Net
            </span>
            <span
              className={`text-lg font-bold tabular-nums block mt-0.5 ${
                netProfit >= 0 ? 'text-white' : 'text-rose-400'
              }`}
            >
              {formatUSD(netProfit, 0)}
            </span>
          </div>
        </div>

        {/* Monthly Evaluation Form (Chris Do Framework) */}
        <div className="p-5 rounded-3xl bg-[#1D1438]/80 border border-[#A87FE8]/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C9A070]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-jost">
                Évaluation Mensuelle du Rang (Framework Chris Do)
              </h3>
            </div>
            {rankSavedFeedback && (
              <span className="text-xs text-[#4ADE9A] font-semibold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Rang actualisé !
              </span>
            )}
          </div>

          <p className="text-xs text-white/60">
            Le rang n'est jamais deviné automatiquement : évalue le niveau de maturité de cette activité selon les critères méthodologiques de Chris Do.
          </p>

          {/* Ranks selection bar */}
          <div className="grid grid-cols-6 gap-2">
            {ranksList.map((r) => {
              const info = HUNTER_RANKS[r];
              const isSelected = selectedRank === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRank(r)}
                  className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#6600CC] border-2 border-[#C9A070] shadow-lg shadow-[#6600CC]/50 scale-105'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <span
                    className={`text-lg font-black font-jost ${
                      r === 'S'
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-[#C9A070]'
                        : 'text-white'
                    }`}
                  >
                    {r}
                  </span>
                  <span className="text-[10px] text-white/70 font-semibold truncate max-w-full">
                    {info.chrisDoStage}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detailed Criteria Box for Selected Rank */}
          {selectedRank && (
            <div className="p-4 rounded-2xl bg-[#0D0A18]/80 border border-white/10 text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#A87FE8]">
                  Critères du Rang {selectedRank} — {HUNTER_RANKS[selectedRank].chrisDoStage} ({HUNTER_RANKS[selectedRank].subtitle})
                </span>
                <span className="text-[10px] text-[#C9A070] uppercase font-bold">Méthode Chris Do</span>
              </div>
              <p className="text-white/80 leading-relaxed">
                {HUNTER_RANKS[selectedRank].criteria}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSaveRank}
              disabled={isSavingRank || selectedRank === activity.rang_actuel}
              className={`btn-cta px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                selectedRank === activity.rang_actuel
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#6600CC] to-[#A87FE8] text-white'
              }`}
            >
              {isSavingRank ? 'Sauvegarde...' : 'Confirmer le nouveau rang'}
            </button>
          </div>
        </div>

        {/* BarChart: Revenus vs Dépenses Mensuels */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 mb-2 font-jost">
            Historique Revenus vs Dépenses (6 derniers mois)
          </h4>
          <div className="h-44 w-full bg-white/5 rounded-2xl p-3 border border-white/10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#140F26',
                    border: '1px solid rgba(168,127,232,0.3)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="revenu" fill="#4ADE9A" radius={[4, 4, 0, 0]} name="Revenus ($)" />
                <Bar dataKey="depense" fill="#E8546B" radius={[4, 4, 0, 0]} name="Dépenses ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Linked Recurring Expenses */}
        {actExpenses.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 mb-2 font-jost">
              Charges Récurrentes liées ({actExpenses.length})
            </h4>
            <div className="space-y-2">
              {actExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-white block">{exp.nom}</span>
                    <span className="text-[10px] text-white/50">{exp.nature} • {exp.frequence}</span>
                  </div>
                  <span className="font-bold text-white tabular-nums">
                    {formatTransactionAmount(exp.montant_original, exp.devise_origine, exp.montant_usd, 0)}/m
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
