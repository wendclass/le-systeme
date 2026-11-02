import React, { useState, useEffect } from 'react';
import { CsDossier, CsDossierStatut } from '../../types';
import {
  getDossiers,
  syncDemandesFromSite,
  createManualDossier,
  formatFCFA,
  getRetoursList,
} from '../../lib/classSStore';
import { RetoursListView } from './RetoursListView';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatutPill } from '../ui/StatutPill';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import {
  Users,
  RefreshCw,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  Clock,
  Briefcase,
  Phone,
  MessageSquare,
} from 'lucide-react';

interface ShadowsListViewProps {
  onSelectDossier: (dossierId: string) => void;
  onCreateQuoteForDossier: (dossierId: string) => void;
}

const STATUTS_FILTRE: (CsDossierStatut | 'Tous')[] = [
  'Tous',
  'Nouvelle',
  'Examinée',
  'Appel planifié',
  'Appel réalisé',
  'Devis en préparation',
  'Devis envoyé',
  'Devis accepté',
  'En projet',
  'Livré',
  'Clos',
  'Décliné',
  'Sans suite',
];

export const ShadowsListView: React.FC<ShadowsListViewProps> = ({
  onSelectDossier,
  onCreateQuoteForDossier,
}) => {
  const { showToast } = useToast();
  const [dossiers, setDossiers] = useState<CsDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('Tous');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dossiers' | 'retours'>(() => {
    if (typeof window !== 'undefined') {
      if (
        window.location.hash.includes('retours') ||
        window.location.pathname.includes('/ombres/retours')
      ) {
        return 'retours';
      }
    }
    return 'dossiers';
  });
  const [pendingRetoursCount, setPendingRetoursCount] = useState<number>(0);

  // Formulaire de création manuelle
  const [manualForm, setManualForm] = useState({
    nom: '',
    entreprise: '',
    whatsapp: '',
    email: '',
    lien_social: '',
    budget: '',
  });

  const loadData = async (shouldSync = false) => {
    if (shouldSync) setSyncing(true);
    else setLoading(true);

    try {
      if (shouldSync) {
        const { addedCount, dossiers: updated } = await syncDemandesFromSite();
        setDossiers(updated);
        if (addedCount > 0) {
          showToast(`${addedCount} nouveau(x) dossier(s) synchronisé(s).`, 'success');
        } else {
          showToast('À jour : aucune nouvelle soumission sur le site.', 'info');
        }
      } else {
        const list = await getDossiers();
        setDossiers(list);
      }

      // Décompte des retours clients en attente de validation
      try {
        const allRetours = await getRetoursList();
        const pending = allRetours.filter((r) => r.statut === 'a_valider').length;
        setPendingRetoursCount(pending);
      } catch {
        // Silencieux
      }
    } catch {
      showToast('Impossible de charger les dossiers clients.', 'error');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Détection automatique au premier chargement
    loadData(true);
  }, []);

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.nom.trim() || !manualForm.whatsapp.trim()) {
      showToast('Le nom et le numéro WhatsApp sont requis.', 'warning');
      return;
    }

    try {
      const created = await createManualDossier({
        nom: manualForm.nom.trim(),
        entreprise: manualForm.entreprise.trim() || undefined,
        whatsapp: manualForm.whatsapp.trim(),
        email: manualForm.email.trim() || undefined,
        lien_social: manualForm.lien_social.trim() || undefined,
        budget: manualForm.budget.trim() || undefined,
      });

      showToast('Dossier client créé avec succès.', 'success');
      setIsManualModalOpen(false);
      setManualForm({
        nom: '',
        entreprise: '',
        whatsapp: '',
        email: '',
        lien_social: '',
        budget: '',
      });
      loadData(false);
      onSelectDossier(created.id);
    } catch {
      showToast('Erreur lors de la création du dossier.', 'error');
    }
  };

  // Déterminer la prochaine action recommandée selon le statut
  const getNextAction = (dossier: CsDossier): string => {
    switch (dossier.statut) {
      case 'Nouvelle':
        return 'Examiner la soumission';
      case 'Examinée':
        return 'Planifier l’appel de découverte';
      case 'Appel planifié':
        return 'Réaliser et cadrer l’appel';
      case 'Appel réalisé':
        return 'Créer le devis';
      case 'Devis en préparation':
        return 'Finaliser et marquer prêt';
      case 'Devis envoyé':
        return 'En attente d’acceptation';
      case 'Devis accepté':
        return 'Émettre facture d’acompte';
      case 'En projet':
        return 'Suivre la production';
      case 'Livré':
        return 'Émettre facture de solde';
      case 'Clos':
        return 'Dossier archivé';
      case 'Décliné':
        return 'Classé sans suite';
      default:
        return 'Consulter le dossier';
    }
  };

  const filteredDossiers = dossiers
    .filter((d) => {
      const matchStatut =
        selectedStatut === 'Tous' || d.statut === selectedStatut;
      const clientNom = d.client?.nom?.toLowerCase() || '';
      const entreprise = d.client?.entreprise?.toLowerCase() || '';
      const budget = d.budget_annonce?.toLowerCase() || '';
      const search = searchQuery.toLowerCase();
      const matchSearch =
        clientNom.includes(search) ||
        entreprise.includes(search) ||
        budget.includes(search);
      return matchStatut && matchSearch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
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
              Parcours & Prospection
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Armée des Ombres
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Suivi des dossiers clients, de la soumission du questionnaire jusqu’au devis et projet.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => loadData(true)}
            loading={syncing}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Actualiser
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsManualModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouveau dossier direct
          </Button>
        </div>
      </div>

      {/* Sous-onglets de l'Armée des Ombres */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('dossiers')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'dossiers'
              ? 'bg-[#6600CC] text-white shadow-lg shadow-[#6600CC]/30'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Dossiers clients ({dossiers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('retours')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'retours'
              ? 'bg-[#6600CC] text-white shadow-lg shadow-[#6600CC]/30'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Avis & Témoignages</span>
          {pendingRetoursCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#A87FE8] text-[#0D0A18]">
              {pendingRetoursCount} à valider
            </span>
          )}
        </button>
      </div>

      {activeTab === 'retours' ? (
        <RetoursListView onSelectDossier={onSelectDossier} />
      ) : (
        <div className="space-y-6">
          {/* Barre de recherche et filtres */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filtres de statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {STATUTS_FILTRE.map((st) => (
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

        {/* Recherche et tri */}
        <div className="flex items-center gap-2">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Rechercher un client..."
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

      {/* Liste des dossiers */}
      {loading ? (
        <div className="p-12 text-center text-white/40 text-sm">
          Chargement de l’Armée des Ombres...
        </div>
      ) : filteredDossiers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="Aucun dossier client"
          description={
            dossiers.length === 0
              ? 'Aucune soumission n’a encore été enregistrée dans le Système. Cliquez sur Actualiser pour vérifier la base du site.'
              : 'Aucun dossier ne correspond aux critères de filtre.'
          }
          actionLabel="Actualiser depuis le site"
          onAction={() => loadData(true)}
        />
      ) : (
        <>
          {/* Vue Mobile (Cartes) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredDossiers.map((dos) => {
              const clientNom = dos.client?.nom || 'Client';
              const entreprise = dos.client?.entreprise;
              const dateStr = new Date(dos.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={dos.id}
                  onClick={() => onSelectDossier(dos.id)}
                  className="p-4 rounded-2xl bg-[#16112A]/60 border border-white/10 hover:border-[#A87FE8]/40 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {clientNom}
                      </h3>
                      {entreprise && (
                        <p className="text-xs text-[#A87FE8] font-medium mt-0.5">
                          {entreprise}
                        </p>
                      )}
                    </div>
                    <StatutPill statut={dos.statut} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-white/60 pt-2 border-t border-white/5">
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase">
                        Budget annoncé
                      </span>
                      <span className="text-white font-medium">
                        {dos.budget_annonce || 'Non précisé'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase">
                        Reçu le
                      </span>
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-[#A87FE8] font-semibold">
                      {getNextAction(dos)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vue Desktop (Tableau) */}
          <div className="hidden md:block rounded-2xl border border-white/10 bg-[#16112A]/40 backdrop-blur-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-white/50">
                <tr>
                  <th className="py-3.5 px-4">Client / Entreprise</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Budget annoncé</th>
                  <th className="py-3.5 px-4">Date réception</th>
                  <th className="py-3.5 px-4">Prochaine action</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDossiers.map((dos) => {
                  const clientNom = dos.client?.nom || 'Client';
                  const entreprise = dos.client?.entreprise;
                  const dateStr = new Date(dos.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={dos.id}
                      onClick={() => onSelectDossier(dos.id)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white group-hover:text-[#A87FE8] transition-colors">
                          {clientNom}
                        </div>
                        {entreprise && (
                          <div className="text-xs text-white/50 font-medium">
                            {entreprise}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <StatutPill statut={dos.statut} size="sm" />
                      </td>
                      <td className="py-4 px-4 text-white/80 font-medium">
                        {dos.budget_annonce || 'Non précisé'}
                      </td>
                      <td className="py-4 px-4 text-white/60 tabular-nums">
                        {dateStr}
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold text-[#A87FE8]">
                        {getNextAction(dos)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDossier(dos.id);
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
      )}

      {/* Modal Création Manuelle */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Nouveau dossier direct"
        description="Créez un dossier client pour un prospect venu hors questionnaire (recommandation, WhatsApp, direct)."
        size="md"
      >
        <form onSubmit={handleCreateManual} className="space-y-4">
          <Input
            label="Nom complet du client *"
            placeholder="Ex : Moussa Traoré"
            value={manualForm.nom}
            onChange={(e) => setManualForm({ ...manualForm, nom: e.target.value })}
            required
          />

          <Input
            label="Entreprise ou marque"
            placeholder="Ex : Faso Bio Tech"
            value={manualForm.entreprise}
            onChange={(e) =>
              setManualForm({ ...manualForm, entreprise: e.target.value })
            }
          />

          <Input
            label="Numéro WhatsApp *"
            placeholder="Ex : +226 70 00 00 00"
            value={manualForm.whatsapp}
            onChange={(e) =>
              setManualForm({ ...manualForm, whatsapp: e.target.value })
            }
            helperText="Le numéro sera normalisé automatiquement pour les liens directs."
            required
          />

          <Input
            label="Adresse e-mail"
            placeholder="Ex : contact@fasobiotech.bf"
            type="email"
            value={manualForm.email}
            onChange={(e) =>
              setManualForm({ ...manualForm, email: e.target.value })
            }
          />

          <Input
            label="Lien réseaux sociaux ou site"
            placeholder="Ex : instagram.com/fasobio"
            value={manualForm.lien_social}
            onChange={(e) =>
              setManualForm({ ...manualForm, lien_social: e.target.value })
            }
          />

          <Input
            label="Budget estimé"
            placeholder="Ex : 300 000 FCFA"
            value={manualForm.budget}
            onChange={(e) =>
              setManualForm({ ...manualForm, budget: e.target.value })
            }
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsManualModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Créer le dossier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
