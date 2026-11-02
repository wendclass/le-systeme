import React, { useState, useEffect } from 'react';
import { CsDevis, CsDevisStatut } from '../../types';
import { getDevisList, formatFCFA } from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatutPill } from '../ui/StatutPill';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import {
  Receipt,
  Plus,
  Search,
  ArrowUpDown,
  ChevronRight,
  Filter,
  FileCheck,
} from 'lucide-react';

interface QuotesListViewProps {
  onSelectQuote: (quoteId: string) => void;
  onCreateNewQuote: () => void;
}

const STATUTS_DEVIS: (CsDevisStatut | 'Tous')[] = [
  'Tous',
  'brouillon',
  'pret',
  'envoye',
  'accepte',
  'refuse',
  'expire',
  'remplace',
];

export const QuotesListView: React.FC<QuotesListViewProps> = ({
  onSelectQuote,
  onCreateNewQuote,
}) => {
  const { showToast } = useToast();
  const [quotes, setQuotes] = useState<CsDevis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('Tous');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getDevisList();
      setQuotes(list);
    } catch {
      showToast('Impossible de charger la liste des devis.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredQuotes = quotes
    .filter((q) => {
      const matchStatut =
        selectedStatut === 'Tous' || q.statut === selectedStatut;
      const numero = q.numero?.toLowerCase() || '';
      const clientNom = q.dossier?.client?.nom?.toLowerCase() || '';
      const clientEntreprise =
        q.dossier?.client?.entreprise?.toLowerCase() || '';
      const search = searchQuery.toLowerCase();
      const matchSearch =
        numero.includes(search) ||
        clientNom.includes(search) ||
        clientEntreprise.includes(search);
      return matchStatut && matchSearch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date_emission).getTime();
      const dateB = new Date(b.date_emission).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6600CC] ring-4 ring-[#6600CC]/20" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#A87FE8]">
              Devis & Propositions
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Portail Devis
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Création, adaptation des modalités et gestion des propositions commerciales Class S.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={onCreateNewQuote}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Créer un devis
          </Button>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filtres de statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {STATUTS_DEVIS.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatut(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatut === st
                  ? 'bg-[#A87FE8]/20 text-[#A87FE8] border border-[#A87FE8]/40'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Champ de recherche */}
        <div className="flex items-center gap-2">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Numéro ou client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-white/40" />}
            />
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title={sortOrder === 'desc' ? 'Plus récents en premier' : 'Plus anciens en premier'}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Liste des devis */}
      {loading ? (
        <div className="p-12 text-center text-white/40 text-sm">
          Chargement des devis...
        </div>
      ) : filteredQuotes.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8" />}
          title="Aucun devis trouvé"
          description={
            quotes.length === 0
              ? 'Vous n’avez encore créé aucun devis. Rendez-vous dans un dossier client ou cliquez ci-dessous pour initier une proposition.'
              : 'Aucun devis ne correspond aux critères de filtre.'
          }
          actionLabel="Créer un premier devis"
          onAction={onCreateNewQuote}
        />
      ) : (
        <>
          {/* Mobile (Cartes) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredQuotes.map((q) => {
              const clientNom = q.dossier?.client?.nom || 'Client';
              const entreprise = q.dossier?.client?.entreprise;
              const dateStr = new Date(q.date_emission).toLocaleDateString(
                'fr-FR',
                { day: '2-digit', month: 'short', year: 'numeric' }
              );

              return (
                <div
                  key={q.id}
                  onClick={() => onSelectQuote(q.id)}
                  className="p-4 rounded-2xl bg-[#16112A]/60 border border-white/10 hover:border-[#A87FE8]/40 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">
                          {q.numero}
                        </span>
                        <span className="text-xs text-white/40">
                          v{q.version}
                        </span>
                      </div>
                      <p className="text-xs text-white/70 font-medium mt-0.5">
                        {clientNom} {entreprise && `(${entreprise})`}
                      </p>
                    </div>
                    <StatutPill statut={q.statut} size="sm" />
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-white/40">Émis le {dateStr}</span>
                    <span className="text-base font-bold text-white tabular-nums">
                      {formatFCFA(q.total_fcfa)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop (Tableau) */}
          <div className="hidden md:block rounded-2xl border border-white/10 bg-[#16112A]/40 backdrop-blur-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-white/50">
                <tr>
                  <th className="py-3.5 px-4">Numéro</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Date d’émission</th>
                  <th className="py-3.5 px-4">Validité</th>
                  <th className="py-3.5 px-4 text-right">Total FCFA</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredQuotes.map((q) => {
                  const clientNom = q.dossier?.client?.nom || 'Client';
                  const entreprise = q.dossier?.client?.entreprise;
                  const dateEmission = new Date(q.date_emission).toLocaleDateString('fr-FR');
                  const dateValidite = new Date(q.date_validite).toLocaleDateString('fr-FR');

                  return (
                    <tr
                      key={q.id}
                      onClick={() => onSelectQuote(q.id)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4 font-semibold text-white group-hover:text-[#A87FE8] transition-colors">
                        <span>{q.numero}</span>
                        {q.version > 1 && (
                          <span className="ml-2 text-xs text-white/40">
                            v{q.version}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-white">{clientNom}</div>
                        {entreprise && (
                          <div className="text-xs text-white/50">{entreprise}</div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <StatutPill statut={q.statut} size="sm" />
                      </td>
                      <td className="py-4 px-4 text-white/60 tabular-nums">
                        {dateEmission}
                      </td>
                      <td className="py-4 px-4 text-white/60 tabular-nums">
                        {dateValidite}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-white tabular-nums">
                        {formatFCFA(q.total_fcfa)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectQuote(q.id);
                          }}
                          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                        >
                          Ouvrir
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
