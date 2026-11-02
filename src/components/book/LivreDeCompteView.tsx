import React, { useState, useEffect, useMemo } from 'react';
import {
  CsLivreDeCompteRow,
  CsCategorie,
  CsClient,
  CsFacture,
  CsReglages,
  LivrePeriodePreset,
  LivreMonthlyBar,
  LivreRecapCategorie,
  LivreRecapClient,
} from '../../types';
import {
  getLivreDeCompte,
  getCategories,
  getClients,
  getFacturesList,
  getReglages,
  getDateRangeForPreset,
  calculateLivreSynthesis,
  calculateLivreMonthlyBars,
  calculateLivreRecapCategories,
  calculateLivreRecapClients,
  formatFCFA,
} from '../../lib/classSStore';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdmin } from '../../lib/guard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatutPill } from '../ui/StatutPill';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { MouvementModal } from './MouvementModal';
import { CancelMouvementModal } from './CancelMouvementModal';
import { CategoriesModal } from './CategoriesModal';
import { ExportModal } from './ExportModal';
import { LivrePrintPreview } from './LivrePrintPreview';
import { ClientRelevePrintPreview } from './ClientRelevePrintPreview';
import {
  BookOpen,
  Plus,
  Download,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  BarChart3,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit2,
  Trash2,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface LivreDeCompteViewProps {
  onNavigateToInvoices?: () => void;
}

export const LivreDeCompteView: React.FC<LivreDeCompteViewProps> = ({
  onNavigateToInvoices,
}) => {
  const { user } = useAuth();
  const userIsAdmin = isSuperAdmin(user);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CsLivreDeCompteRow[]>([]);
  const [categories, setCategories] = useState<CsCategorie[]>([]);
  const [clients, setClients] = useState<CsClient[]>([]);
  const [factures, setFactures] = useState<CsFacture[]>([]);
  const [reglages, setReglages] = useState<CsReglages | null>(null);

  // Sélecteur de période
  const [preset, setPreset] = useState<LivrePeriodePreset>('ce_mois');
  const [customDebut, setCustomDebut] = useState('');
  const [customFin, setCustomFin] = useState('');

  // Vue graphique vs tableau alternatif
  const [chartMode, setChartMode] = useState<'chart' | 'table'>('chart');

  // Filtres du journal
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'tous' | 'entree' | 'sortie'>('tous');
  const [filterCategory, setFilterCategory] = useState<string>('tous');
  const [filterClient, setFilterClient] = useState<string>('tous');
  const [filterMoyen, setFilterMoyen] = useState<string>('tous');

  // Pagination (50 lignes par page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Modals
  const [isMouvementModalOpen, setIsMouvementModalOpen] = useState(false);
  const [editingMouvement, setEditingMouvement] = useState<any | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingMouvement, setCancellingMouvement] = useState<any | null>(null);

  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Aperçus d'impression
  const [isMySummaryPreviewOpen, setIsMySummaryPreviewOpen] = useState(false);
  const [clientReleveData, setClientReleveData] = useState<{
    client: CsClient;
    factures: CsFacture[];
  } | null>(null);

  // Motif modal consultatif pour opération annulée
  const [viewMotifModal, setViewMotifModal] = useState<string | null>(null);

  // Calcul des dates actives selon le sélecteur
  const { dateDebut, dateFin, libelle: periodeLibelle } = useMemo(() => {
    return getDateRangeForPreset(preset, customDebut, customFin);
  }, [preset, customDebut, customFin]);

  // Chargement des données du livre selon la période
  const loadData = async () => {
    setLoading(true);
    try {
      const [allRows, allCats, allClients, allFactures, reg] = await Promise.all([
        getLivreDeCompte({ dateDebut, dateFin }),
        getCategories(),
        getClients(),
        getFacturesList(),
        getReglages(),
      ]);
      setRows(allRows);
      setCategories(allCats);
      setClients(allClients);
      setFactures(allFactures);
      setReglages(reg);
    } catch (err) {
      console.error('[LivreDeCompte] Erreur de chargement :', err);
      showToast('Erreur lors du chargement du livre de compte', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setCurrentPage(1);
  }, [dateDebut, dateFin]);

  // Calcul des agrégations et métriques pour la période active
  const synthesis = useMemo(() => calculateLivreSynthesis(rows), [rows]);
  const monthlyBars = useMemo(
    () => calculateLivreMonthlyBars(rows, dateDebut, dateFin),
    [rows, dateDebut, dateFin]
  );
  const recapCategories = useMemo(
    () => calculateLivreRecapCategories(rows),
    [rows]
  );
  const recapClients = useMemo(
    () => calculateLivreRecapClients(rows),
    [rows]
  );

  // Filtrage du journal chronologique
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Filtre type
      if (filterType !== 'tous' && r.type !== filterType) return false;

      // Filtre catégorie
      if (filterCategory !== 'tous' && r.categorie_id !== filterCategory) return false;

      // Filtre client
      if (filterClient !== 'tous' && r.client_id !== filterClient) return false;

      // Filtre moyen
      if (filterMoyen !== 'tous' && r.moyen !== filterMoyen) return false;

      // Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLibelle = r.libelle.toLowerCase().includes(q);
        const matchesClient = r.client_nom?.toLowerCase().includes(q);
        const matchesPiece = r.numero_piece?.toLowerCase().includes(q);
        const matchesRef = r.reference?.toLowerCase().includes(q);
        const matchesNote = r.note?.toLowerCase().includes(q);
        if (!matchesLibelle && !matchesClient && !matchesPiece && !matchesRef && !matchesNote) {
          return false;
        }
      }

      return true;
    });
  }, [rows, filterType, filterCategory, filterClient, filterMoyen, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Contrôle d'accès strict Super Admin (S6)
  if (!userIsAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center font-body space-y-4">
        <ShieldAlert className="w-12 h-12 text-[#E8546B] mx-auto" />
        <h2 className="text-xl font-bold text-white">Accès restreint au Super Admin</h2>
        <p className="text-sm text-white/60 max-w-md mx-auto">
          Le livre de compte est strictement réservé à la direction de Class S.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-body">
      {/* 1. En-tête principal & Sélecteur de période */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-[#6600CC]" />
            Livre de compte
          </h1>
          <p className="text-xs sm:text-sm text-white/60 mt-1">
            Source de vérité consolidée des encaissements et charges de Class S • Aucune ressaisie.
          </p>
        </div>

        {/* Boutons d'action principaux */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoriesModalOpen(true)}
            className="border-white/20 text-white hover:bg-white/10 text-xs"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Catégories
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="border-[#6600CC]/40 text-white hover:bg-[#6600CC]/20 text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-[#A87FE8]" />
            Exporter
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingMouvement(null);
              setIsMouvementModalOpen(true);
            }}
            className="bg-[#6600CC] hover:bg-[#6600CC]/90 text-white text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nouvelle opération
          </Button>
        </div>
      </div>

      {/* 2. Barre du sélecteur de période */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs text-white/50 shrink-0 uppercase tracking-wider font-semibold mr-1">
            Période :
          </span>
          {[
            { id: 'ce_mois', label: 'Ce mois' },
            { id: 'mois_dernier', label: 'Mois dernier' },
            { id: 'trimestre_en_cours', label: 'Trimestre en cours' },
            { id: 'annee_en_cours', label: 'Année en cours' },
            { id: 'annee_precedente', label: 'Année précédente' },
            { id: 'libre', label: 'Période libre' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id as LivrePeriodePreset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                preset === item.id
                  ? 'bg-[#6600CC] text-white shadow-lg shadow-[#6600CC]/30'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Champs de date si 'libre' */}
        {preset === 'libre' ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customDebut || dateDebut}
              onChange={(e) => setCustomDebut(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs focus:outline-none"
            />
            <span className="text-white/40 text-xs">au</span>
            <input
              type="date"
              value={customFin || dateFin}
              onChange={(e) => setCustomFin(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs focus:outline-none"
            />
          </div>
        ) : (
          <div className="text-xs font-medium text-white/60">
            Du <strong className="text-white">{dateDebut}</strong> au{' '}
            <strong className="text-white">{dateFin}</strong>
          </div>
        )}
      </div>

      {/* 3. Cartes de synthèse financière (FCFA, chiffres tabulaires) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Encaissements */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-white/60 mb-2">
            <span className="uppercase tracking-wider font-semibold">Encaissements</span>
            <span className="p-1.5 rounded-lg bg-[#2FA77A]/20 text-[#2FA77A]">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#2FA77A] tabular-nums">
            {formatFCFA(synthesis.totalEncaissements)}
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Recettes validées sur la période
          </p>
        </div>

        {/* Dépenses */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-white/60 mb-2">
            <span className="uppercase tracking-wider font-semibold">Dépenses</span>
            <span className="p-1.5 rounded-lg bg-[#E8546B]/20 text-[#E8546B]">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#E8546B] tabular-nums">
            {formatFCFA(synthesis.totalDepenses)}
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Charges et sorties enregistrées
          </p>
        </div>

        {/* Solde Net */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-white/60 mb-2">
            <span className="uppercase tracking-wider font-semibold">Solde Net</span>
            <span
              className={`p-1.5 rounded-lg text-xs font-bold ${
                synthesis.soldeNet >= 0
                  ? 'bg-[#6600CC]/20 text-[#A87FE8]'
                  : 'bg-[#E8546B]/20 text-[#E8546B]'
              }`}
            >
              {synthesis.soldeNet >= 0 ? 'Positif' : 'Négatif'}
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold tabular-nums ${
              synthesis.soldeNet >= 0 ? 'text-[#A87FE8]' : 'text-[#E8546B]'
            }`}
          >
            {formatFCFA(synthesis.soldeNet)}
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Recettes déduites des dépenses
          </p>
        </div>

        {/* Nombre d'opérations */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-white/60 mb-2">
            <span className="uppercase tracking-wider font-semibold">Opérations</span>
            <span className="p-1.5 rounded-lg bg-white/10 text-white">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">
            {synthesis.nbOperations}
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Écritures comptables sur la période
          </p>
        </div>
      </div>

      {/* 4. Graphique mensuel & Tableau alternatif accessible */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#A87FE8]" />
            <h3 className="text-sm font-semibold text-white">
              Évolution mensuelle des flux
            </h3>
          </div>

          {/* Bascule graphique vs tableau */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <button
              onClick={() => setChartMode('chart')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                chartMode === 'chart'
                  ? 'bg-[#6600CC] text-white'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Afficher le graphique"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Graphique</span>
            </button>
            <button
              onClick={() => setChartMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                chartMode === 'table'
                  ? 'bg-[#6600CC] text-white'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Afficher le tableau de données accessible"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tableau</span>
            </button>
          </div>
        </div>

        {monthlyBars.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/40">
            Aucune écriture comptable sur cette période.
          </div>
        ) : chartMode === 'chart' ? (
          /* Graphique à barres stylisé en SVG / CSS */
          <div className="pt-4 pb-2 space-y-4">
            <div className="flex items-center justify-end gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#2FA77A]" />
                <span className="text-white/70">Encaissements</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#E8546B]" />
                <span className="text-white/70">Dépenses</span>
              </div>
            </div>

            <div className="space-y-3">
              {monthlyBars.map((m) => {
                const maxVal = Math.max(
                  ...monthlyBars.map((b) => Math.max(b.encaissements, b.depenses)),
                  1
                );
                const pctEnc = Math.min(100, Math.round((m.encaissements / maxVal) * 100));
                const pctDep = Math.min(100, Math.round((m.depenses / maxVal) * 100));

                return (
                  <div key={m.moisKey} className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60">
                      <span className="font-medium text-white">{m.labelMois}</span>
                      <span
                        className={`tabular-nums font-semibold ${
                          m.soldeNet >= 0 ? 'text-[#2FA77A]' : 'text-[#E8546B]'
                        }`}
                      >
                        Net : {formatFCFA(m.soldeNet)}
                      </span>
                    </div>

                    {/* Barres comparatives */}
                    <div className="space-y-1">
                      {/* Barre Encaissement */}
                      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex items-center">
                        <div
                          className="h-full bg-gradient-to-r from-[#2FA77A]/70 to-[#2FA77A] rounded-full transition-all duration-500"
                          style={{ width: `${pctEnc}%` }}
                          title={`Encaissements : ${formatFCFA(m.encaissements)}`}
                        />
                      </div>
                      {/* Barre Dépense */}
                      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex items-center">
                        <div
                          className="h-full bg-gradient-to-r from-[#E8546B]/70 to-[#E8546B] rounded-full transition-all duration-500"
                          style={{ width: `${pctDep}%` }}
                          title={`Dépenses : ${formatFCFA(m.depenses)}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Tableau alternatif accessible */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="py-2.5 font-semibold">Mois</th>
                  <th className="py-2.5 text-right font-semibold">Encaissements</th>
                  <th className="py-2.5 text-right font-semibold">Dépenses</th>
                  <th className="py-2.5 text-right font-semibold">Solde Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {monthlyBars.map((m) => (
                  <tr key={m.moisKey} className="hover:bg-white/5">
                    <td className="py-2.5 font-medium text-white">{m.labelMois}</td>
                    <td className="py-2.5 text-right tabular-nums text-[#2FA77A] font-semibold">
                      {formatFCFA(m.encaissements)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-[#E8546B] font-semibold">
                      {formatFCFA(m.depenses)}
                    </td>
                    <td
                      className={`py-2.5 text-right tabular-nums font-bold ${
                        m.soldeNet >= 0 ? 'text-white' : 'text-[#E8546B]'
                      }`}
                    >
                      {formatFCFA(m.soldeNet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Journal chronologique des opérations */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white">Journal chronologique</h3>
            <p className="text-xs text-white/50">
              {filteredRows.length} opération{filteredRows.length > 1 ? 's' : ''} trouvée
              {filteredRows.length > 1 ? 's' : ''} sur la période
            </p>
          </div>

          {/* Recherche */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un libellé, client..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#6600CC]"
            />
          </div>
        </div>

        {/* Barre de filtres secondaires */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Filtre Type */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-white/40 mb-1">
              Type de flux
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none"
            >
              <option value="tous" className="bg-[#0D0A18] text-white">
                Tous les flux
              </option>
              <option value="entree" className="bg-[#0D0A18] text-white">
                Entrées uniquement
              </option>
              <option value="sortie" className="bg-[#0D0A18] text-white">
                Sorties uniquement
              </option>
            </select>
          </div>

          {/* Filtre Catégorie */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-white/40 mb-1">
              Catégorie
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none"
            >
              <option value="tous" className="bg-[#0D0A18] text-white">
                Toutes les catégories
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0D0A18] text-white">
                  {c.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Client */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-white/40 mb-1">
              Client
            </label>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none"
            >
              <option value="tous" className="bg-[#0D0A18] text-white">
                Tous les clients
              </option>
              {clients.map((cli) => (
                <option key={cli.id} value={cli.id} className="bg-[#0D0A18] text-white">
                  {cli.entreprise ? `${cli.entreprise} (${cli.nom})` : cli.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Moyen */}
          <div>
            <label className="block text-[10px] uppercase font-semibold text-white/40 mb-1">
              Moyen de règlement
            </label>
            <select
              value={filterMoyen}
              onChange={(e) => setFilterMoyen(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none"
            >
              <option value="tous" className="bg-[#0D0A18] text-white">
                Tous les moyens
              </option>
              <option value="Mobile Money" className="bg-[#0D0A18] text-white">
                Mobile Money
              </option>
              <option value="Virement bancaire" className="bg-[#0D0A18] text-white">
                Virement bancaire
              </option>
              <option value="Espèces" className="bg-[#0D0A18] text-white">
                Espèces
              </option>
            </select>
          </div>
        </div>

        {/* Tableau du journal */}
        {filteredRows.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="Aucune opération sur cette période"
            description="Aucun mouvement de trésorerie ou paiement validé ne correspond à vos critères."
            actionLabel="Nouvelle opération"
            onAction={() => {
              setEditingMouvement(null);
              setIsMouvementModalOpen(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="py-3 px-2 font-semibold">Date</th>
                  <th className="py-3 px-2 font-semibold">Type</th>
                  <th className="py-3 px-2 font-semibold">Pièce / Source</th>
                  <th className="py-3 px-2 font-semibold">Libellé</th>
                  <th className="py-3 px-2 font-semibold">Client / Projet</th>
                  <th className="py-3 px-2 font-semibold">Catégorie</th>
                  <th className="py-3 px-2 font-semibold">Moyen</th>
                  <th className="py-3 px-2 text-right font-semibold">Montant</th>
                  <th className="py-3 px-2 text-center font-semibold">Statut</th>
                  <th className="py-3 px-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedRows.map((r) => {
                  const isEntree = r.type === 'entree';
                  const isAnnule = r.annule;

                  return (
                    <tr
                      key={r.operation_id}
                      className={`hover:bg-white/5 transition-colors ${
                        isAnnule ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-2 whitespace-nowrap text-white/80 font-mono">
                        {r.date}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isEntree
                              ? 'bg-[#2FA77A]/20 text-[#2FA77A]'
                              : 'bg-[#E8546B]/20 text-[#E8546B]'
                          }`}
                        >
                          {isEntree ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3" />
                          )}
                          {isEntree ? 'Entrée' : 'Sortie'}
                        </span>
                      </td>

                      {/* Pièce / Source */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <div className="font-mono text-[11px] text-white/90">
                          {r.numero_piece || '—'}
                        </div>
                        <div className="text-[10px] text-white/40">
                          {r.source === 'paiement' ? 'Paiement validé' : 'Saisie manuelle'}
                        </div>
                      </td>

                      {/* Libellé */}
                      <td className="py-3 px-2 max-w-xs truncate text-white font-medium">
                        {r.libelle}
                        {r.note && (
                          <span
                            className="ml-1 text-white/40 hover:text-white cursor-help"
                            title={r.note}
                          >
                            <Info className="w-3 h-3 inline" />
                          </span>
                        )}
                      </td>

                      {/* Client / Projet */}
                      <td className="py-3 px-2 text-white/70">
                        {r.client_nom ? (
                          <div>
                            <span className="font-medium text-white">{r.client_nom}</span>
                            {r.projet_titre && (
                              <div className="text-[10px] text-white/40 truncate max-w-[150px]">
                                {r.projet_titre}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>

                      {/* Catégorie */}
                      <td className="py-3 px-2 whitespace-nowrap text-white/70">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px]">
                          {r.categorie_nom || 'Non catégorisé'}
                        </span>
                      </td>

                      {/* Moyen & Réf */}
                      <td className="py-3 px-2 whitespace-nowrap text-white/70">
                        <div>{r.moyen}</div>
                        {r.reference && (
                          <div className="text-[10px] text-white/40 truncate max-w-[120px]">
                            Réf : {r.reference}
                          </div>
                        )}
                      </td>

                      {/* Montant */}
                      <td
                        className={`py-3 px-2 text-right whitespace-nowrap font-bold tabular-nums ${
                          isAnnule
                            ? 'text-white/40'
                            : isEntree
                            ? 'text-[#2FA77A]'
                            : 'text-[#E8546B]'
                        }`}
                      >
                        {isEntree ? '+' : '-'} {formatFCFA(r.montant_fcfa)}
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        {isAnnule ? (
                          <button
                            type="button"
                            onClick={() =>
                              setViewMotifModal(
                                r.motif_annulation || 'Aucun motif renseigné'
                              )
                            }
                            className="inline-block px-2 py-0.5 rounded-md bg-[#E8546B]/20 text-[#E8546B] text-[10px] font-bold hover:bg-[#E8546B]/30 cursor-pointer"
                            title="Cliquer pour voir le motif d'annulation"
                          >
                            Annulé
                          </button>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#2FA77A]/20 text-[#2FA77A] text-[10px] font-bold">
                            Validé
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-2 text-right whitespace-nowrap">
                        {r.source === 'paiement' ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToInvoices?.()}
                            className="p-1 rounded-md text-white/40 hover:text-[#A87FE8] hover:bg-white/5 transition-colors"
                            title="Voir la facture et le paiement associé"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        ) : !isAnnule ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMouvement({
                                  id: r.operation_id,
                                  type: r.type,
                                  date: r.date,
                                  libelle: r.libelle,
                                  montant_fcfa: r.montant_fcfa,
                                  categorie_id: r.categorie_id,
                                  client_id: r.client_id,
                                  moyen: r.moyen,
                                  reference: r.reference,
                                  note: r.note,
                                });
                                setIsMouvementModalOpen(true);
                              }}
                              className="p-1 rounded-md text-white/40 hover:text-[#A87FE8] hover:bg-white/5 transition-colors"
                              title="Modifier l'opération"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCancellingMouvement({
                                  id: r.operation_id,
                                  date: r.date,
                                  libelle: r.libelle,
                                  montant_fcfa: r.montant_fcfa,
                                });
                                setIsCancelModalOpen(true);
                              }}
                              className="p-1 rounded-md text-white/40 hover:text-[#E8546B] hover:bg-white/5 transition-colors"
                              title="Annuler avec motif"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Contrôles de pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
            <span className="text-white/40">
              Page {currentPage} sur {totalPages} (50 lignes par page)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODALS & PREVIEWS ================= */}

      {/* Modal Saisie / Modification opération manuelle */}
      <MouvementModal
        isOpen={isMouvementModalOpen}
        onClose={() => {
          setIsMouvementModalOpen(false);
          setEditingMouvement(null);
        }}
        onSuccess={() => {
          loadData();
          showToast(
            editingMouvement
              ? 'Opération modifiée avec succès'
              : 'Opération ajoutée au livre de compte',
            'success'
          );
        }}
        categories={categories}
        clients={clients}
        initialMouvement={editingMouvement}
      />

      {/* Modal Annulation d'opération avec motif obligatoire */}
      <CancelMouvementModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancellingMouvement(null);
        }}
        onSuccess={() => {
          loadData();
          showToast('Opération annulée et tracée au journal', 'success');
        }}
        mouvement={cancellingMouvement}
      />

      {/* Modal Gestion des catégories */}
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        onCategoriesUpdated={() => loadData()}
      />

      {/* Modal Export (Choix du destinataire) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        dateDebut={dateDebut}
        dateFin={dateFin}
        rows={rows}
        recapCategories={recapCategories}
        recapClients={recapClients}
        clients={clients}
        factures={factures}
        reglages={reglages}
        onOpenMySummaryPreview={() => setIsMySummaryPreviewOpen(true)}
        onOpenClientRelevePreview={(client, clientFactures) =>
          setClientReleveData({ client, factures: clientFactures })
        }
      />

      {/* Aperçu d'impression A4 pour Scott */}
      {isMySummaryPreviewOpen && (
        <LivrePrintPreview
          dateDebut={dateDebut}
          dateFin={dateFin}
          rows={rows}
          synthesis={synthesis}
          monthlyBars={monthlyBars}
          recapCategories={recapCategories}
          recapClients={recapClients}
          reglages={reglages}
          onClose={() => setIsMySummaryPreviewOpen(false)}
        />
      )}

      {/* Aperçu du relevé PDF client */}
      {clientReleveData && (
        <ClientRelevePrintPreview
          client={clientReleveData.client}
          factures={clientReleveData.factures}
          dateDebut={dateDebut}
          dateFin={dateFin}
          reglages={reglages}
          onClose={() => setClientReleveData(null)}
        />
      )}

      {/* Modal d'affichage du motif d'annulation d'une opération */}
      {viewMotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="p-5 rounded-2xl bg-[#0D0A18] border border-white/20 max-w-sm w-full space-y-3 font-body">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-[#E8546B]" />
              Motif de l’annulation
            </h4>
            <p className="text-xs text-white/80 p-3 rounded-xl bg-white/5 border border-white/10 leading-relaxed">
              {viewMotifModal}
            </p>
            <div className="flex justify-end pt-2">
              <Button size="sm" variant="ghost" onClick={() => setViewMotifModal(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
