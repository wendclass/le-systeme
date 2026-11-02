import React, { useState } from 'react';
import { Transaction, Activity, Client } from '../../types';
import { formatUSD, formatOriginalCurrency, formatDateFr } from '../../lib/utils';
import { formatTransactionAmount, getAppCurrency } from '../../lib/currency';
import { GlassCard } from '../common/GlassCard';
import {
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  activities: Activity[];
  clients: Client[];
  onDeleteTransaction: (id: string) => void;
  onOpenNewTransaction: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  activities,
  clients,
  onDeleteTransaction,
  onOpenNewTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'revenu' | 'depense'>('all');
  const [filterActivity, setFilterActivity] = useState<string>('all');

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterActivity !== 'all' && t.activite_id !== filterActivity) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const act = activities.find((a) => a.id === t.activite_id)?.nom.toLowerCase() || '';
      const cli = clients.find((c) => c.id === t.client_id)?.nom.toLowerCase() || '';
      const cat = t.categorie.toLowerCase();
      const note = (t.note || '').toLowerCase();
      return act.includes(q) || cli.includes(q) || cat.includes(q) || note.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      <GlassCard className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par activité, client, catégorie, note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#A87FE8]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#A87FE8]"
          >
            <option value="all" className="bg-[#140F26]">
              Tous les flux
            </option>
            <option value="revenu" className="bg-[#140F26]">
              Revenus uniquement
            </option>
            <option value="depense" className="bg-[#140F26]">
              Dépenses uniquement
            </option>
          </select>

          {/* Activity Filter */}
          <select
            value={filterActivity}
            onChange={(e) => setFilterActivity(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#A87FE8]"
          >
            <option value="all" className="bg-[#140F26]">
              Toutes les activités
            </option>
            {activities.map((a) => (
              <option key={a.id} value={a.id} className="bg-[#140F26]">
                {a.nom}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* Transactions Table / List */}
      {filtered.length === 0 ? (
        <GlassCard className="p-12 text-center flex flex-col items-center justify-center border-dashed border-[#A87FE8]/20">
          <p className="text-sm font-semibold text-white mb-1">
            {transactions.length === 0
              ? 'Aucune transaction enregistrée.'
              : 'Aucun résultat correspondant aux filtres.'}
          </p>
          <p className="text-xs text-white/50 max-w-sm mb-4">
            {transactions.length === 0
              ? 'Enregistre ta première transaction pour alimenter le Système.'
              : 'Essaie de modifier tes critères de recherche.'}
          </p>
          {transactions.length === 0 && (
            <button
              onClick={onOpenNewTransaction}
              className="btn-cta px-4 py-2 rounded-xl bg-gradient-to-r from-[#6600CC] to-[#A87FE8] text-white text-xs font-semibold shadow-md"
            >
              + Nouvelle Transaction
            </button>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/50 bg-white/5 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type & Catégorie</th>
                  <th className="py-3 px-4">Activité</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4 text-right">Montant (USD)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((tx) => {
                  const activity = activities.find((a) => a.id === tx.activite_id);
                  const client = clients.find((c) => c.id === tx.client_id);
                  const isRevenue = tx.type === 'revenu';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-medium text-white/80 whitespace-nowrap">
                        {formatDateFr(tx.date)}
                      </td>

                      {/* Type & Categorie */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                              isRevenue
                                ? 'bg-emerald-500/20 text-[#4ADE9A]'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {isRevenue ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">
                              {tx.categorie}
                            </span>
                            {tx.note && (
                              <span className="text-[10px] text-white/50 block line-clamp-1">
                                {tx.note}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Activity */}
                      <td className="py-3.5 px-4">
                        {activity ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                            style={{
                              backgroundColor: `${activity.couleur}20`,
                              borderColor: `${activity.couleur}50`,
                              color: activity.couleur,
                            }}
                          >
                            {activity.nom}
                          </span>
                        ) : (
                          <span className="text-white/40 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        {client ? (
                          <div>
                            <span className="font-semibold text-white block">
                              {client.nom}
                            </span>
                            {client.entreprise && (
                              <span className="text-[10px] text-white/40 block">
                                {client.entreprise}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/40 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Montant in Tabular-nums */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`text-sm font-bold tabular-nums block ${
                            isRevenue ? 'text-[#4ADE9A]' : 'text-rose-400'
                          }`}
                        >
                          {isRevenue ? '+' : '-'} {formatTransactionAmount(tx.montant_original, tx.devise_origine, tx.montant_usd, 0)}
                        </span>
                        {tx.devise_origine !== getAppCurrency() && (
                          <span className="text-[10px] text-white/40 tabular-nums block">
                            {formatOriginalCurrency(tx.montant_original, tx.devise_origine)}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-950/30 transition-colors opacity-0 group-hover:opacity-100"
                          title="Supprimer la transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
