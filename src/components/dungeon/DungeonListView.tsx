import React, { useState, useEffect } from 'react';
import { CsProjet, CsDossier, CsReglages } from '../../types';
import {
  getProjetsList,
  getDossiers,
  openProjetSansAcompte,
} from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatutPill } from '../ui/StatutPill';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import {
  Swords,
  Plus,
  Search,
  ArrowUpDown,
  ChevronRight,
  ShieldAlert,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface DungeonListViewProps {
  onSelectProject: (projectId: string) => void;
}

export const DungeonListView: React.FC<DungeonListViewProps> = ({
  onSelectProject,
}) => {
  const { showToast } = useToast();
  const [projets, setProjets] = useState<CsProjet[]>([]);
  const [dossiers, setDossiers] = useState<CsDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('Tous');

  // Modal Dérogation Sans Acompte
  const [isDerogationModalOpen, setIsDerogationModalOpen] = useState(false);
  const [derogationDossierId, setDerogationDossierId] = useState('');
  const [derogationMotif, setDerogationMotif] = useState('');
  const [submittingDerogation, setSubmittingDerogation] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pList, dList] = await Promise.all([
        getProjetsList(),
        getDossiers(),
      ]);
      setProjets(pList);
      setDossiers(dList);
      if (dList.length > 0) {
        setDerogationDossierId(dList[0].id);
      }
    } catch {
      showToast('Impossible de charger les projets du Donjon.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenSansAcompte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!derogationDossierId) {
      showToast('Veuillez sélectionner un dossier client.', 'warning');
      return;
    }
    if (!derogationMotif.trim()) {
      showToast('Le motif de dérogation est obligatoire.', 'warning');
      return;
    }

    setSubmittingDerogation(true);
    try {
      const created = await openProjetSansAcompte(
        derogationDossierId,
        derogationMotif.trim()
      );
      showToast(
        `Projet « ${created.titre} » ouvert par dérogation sans acompte.`,
        'success'
      );
      setIsDerogationModalOpen(false);
      setDerogationMotif('');
      loadData();
      onSelectProject(created.id);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l’ouverture du projet.', 'error');
    } finally {
      setSubmittingDerogation(false);
    }
  };

  const filteredProjets = projets.filter((p) => {
    const matchStatut =
      selectedStatut === 'Tous' || p.statut === selectedStatut;
    const titre = p.titre.toLowerCase();
    const clientNom = p.dossier?.client?.nom?.toLowerCase() || '';
    const entreprise = p.dossier?.client?.entreprise?.toLowerCase() || '';
    const search = searchQuery.toLowerCase();
    return (
      matchStatut &&
      (titre.includes(search) ||
        clientNom.includes(search) ||
        entreprise.includes(search))
    );
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6600CC] ring-4 ring-[#6600CC]/20" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#A87FE8]">
              Pilotage de la production
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Donjon
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Gestion opérationnelle des projets actifs, passage d’étapes et notifications client.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsDerogationModalOpen(true)}
            leftIcon={<ShieldAlert className="w-4 h-4 text-amber-400" />}
          >
            Ouvrir sans acompte
          </Button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filtres de statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {['Tous', 'ouvert', 'livre', 'clos'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatut(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatut === st
                  ? 'bg-[#A87FE8]/20 text-[#A87FE8] border border-[#A87FE8]/40'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              {st === 'ouvert' ? 'En cours' : st === 'livre' ? 'Livré' : st === 'clos' ? 'Clos' : 'Tous les projets'}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Rechercher un projet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-white/40" />}
          />
        </div>
      </div>

      {/* Liste des projets */}
      {loading ? (
        <div className="p-12 text-center text-white/40 text-sm">
          Chargement du Donjon...
        </div>
      ) : filteredProjets.length === 0 ? (
        <EmptyState
          icon={<Swords className="w-8 h-8" />}
          title="Aucun projet en cours"
          description={
            projets.length === 0
              ? 'Le Donjon s’alimente automatiquement dès qu’un acompte est validé par Scott sur une facture. Vous pouvez aussi ouvrir un projet par dérogation.'
              : 'Aucun projet ne correspond aux critères de filtre.'
          }
          actionLabel="Ouvrir un projet sans acompte"
          onAction={() => setIsDerogationModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjets.map((proj) => {
            const etapes = (proj.etapes || []).sort((a, b) => a.ordre - b.ordre);
            const currentEtape = etapes.find((e) => e.statut === 'en_cours');
            const clientNom = proj.dossier?.client?.nom || 'Client';
            const entreprise = proj.dossier?.client?.entreprise;

            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className="p-5 rounded-2xl bg-[#16112A]/60 border border-white/10 hover:border-[#A87FE8]/40 transition-all cursor-pointer flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        proj.statut === 'livre'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-[#6600CC]/30 text-[#A87FE8] border border-[#6600CC]/40'
                      }`}
                    >
                      {proj.statut === 'livre' ? 'Livré' : 'En production'}
                    </span>

                    {proj.derogation_acompte && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Dérogation
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#A87FE8] transition-colors tracking-tight">
                      {proj.titre}
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      {clientNom} {entreprise ? `(${entreprise})` : ''}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Étape active :</span>
                    <span className="font-semibold text-white">
                      {currentEtape ? currentEtape.nom : proj.statut === 'livre' ? 'Projet terminé' : 'Aucune'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#A87FE8] font-semibold pt-1">
                    <span>Ouvrir le suivi</span>
                    <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Ouverture Projet Sans Acompte */}
      <Modal
        isOpen={isDerogationModalOpen}
        onClose={() => setIsDerogationModalOpen(false)}
        title="Ouvrir un projet sans acompte"
        description="Cette action dérogatoire permet de démarrer immédiatement la production. Un motif explicite est obligatoire et sera journalisé."
        size="md"
      >
        <form onSubmit={handleOpenSansAcompte} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1.5">
              Dossier client associé *
            </label>
            <select
              value={derogationDossierId}
              onChange={(e) => setDerogationDossierId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#A87FE8]"
            >
              {dossiers.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#16112A]">
                  {d.client?.nom || 'Client'} {d.client?.entreprise ? `(${d.client.entreprise})` : ''} • {d.statut}
                </option>
              ))}
            </select>
          </div>

          <Textarea
            label="Motif obligatoire de la dérogation *"
            placeholder="Ex : Partenaire institutionnel, accord de paiement à 30 jours, client historique..."
            rows={3}
            value={derogationMotif}
            onChange={(e) => setDerogationMotif(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDerogationModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submittingDerogation}
              leftIcon={<ShieldAlert className="w-4 h-4" />}
            >
              Confirmer et ouvrir le projet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
