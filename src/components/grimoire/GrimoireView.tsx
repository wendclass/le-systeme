import React, { useState, useEffect } from 'react';
import { CsService } from '../../types';
import {
  getServices,
  createService,
  updateService,
  deleteService,
  initGrimoireIdempotent,
  formatFCFA,
} from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import {
  BookOpen,
  Plus,
  Sparkles,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  PowerOff,
  Layers,
  ArrowUpDown,
  Lock,
} from 'lucide-react';

const CATEGORIES = [
  'Toutes',
  'Identité visuelle',
  'Visuels récurrents',
  'Événementiel & Print',
  'Signalétique & Enseigne',
  'Web & Digital',
  'Pack & Stratégie',
  'Options & Retouches',
];

const UNITES = [
  { value: 'forfait', label: 'Forfait' },
  { value: 'unité', label: 'Unité' },
  { value: 'mois', label: 'Mois' },
  { value: 'lot', label: 'Lot' },
  { value: 'face', label: 'Face' },
  { value: 'type', label: 'Type' },
];

export const GrimoireView: React.FC = () => {
  const { showToast } = useToast();
  const [services, setServices] = useState<CsService[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalogue' | 'rentabilite'>('catalogue');
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<CsService | null>(null);

  // Formulaire d'édition / création
  const [formData, setFormData] = useState({
    nom: '',
    categorie: 'Identité visuelle',
    description_client: '',
    prix_base_fcfa: 0,
    unite: 'forfait',
    actif: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getServices();
      setServices(list);
    } catch {
      showToast('Impossible de charger le catalogue des services.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInitAnnexeA = async () => {
    try {
      const initialized = await initGrimoireIdempotent();
      setServices(initialized);
      showToast('Catalogue initialisé avec les services officiels Class S.', 'success');
    } catch {
      showToast('Erreur lors de l’initialisation du catalogue.', 'error');
    }
  };

  const handleOpenCreate = () => {
    setEditingService(null);
    setFormData({
      nom: '',
      categorie: selectedCategory !== 'Toutes' ? selectedCategory : 'Identité visuelle',
      description_client: '',
      prix_base_fcfa: 0,
      unite: 'forfait',
      actif: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (srv: CsService) => {
    setEditingService(srv);
    setFormData({
      nom: srv.nom,
      categorie: srv.categorie,
      description_client: srv.description_client || '',
      prix_base_fcfa: srv.prix_base_fcfa,
      unite: srv.unite || 'forfait',
      actif: srv.actif,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      showToast('Le nom de la prestation est requis.', 'warning');
      return;
    }

    try {
      if (editingService) {
        await updateService(editingService.id, {
          nom: formData.nom.trim(),
          categorie: formData.categorie,
          description_client: formData.description_client.trim(),
          prix_base_fcfa: Number(formData.prix_base_fcfa) || 0,
          unite: formData.unite,
          actif: formData.actif,
        });
        showToast('Prestation mise à jour.', 'success');
      } else {
        await createService({
          nom: formData.nom.trim(),
          categorie: formData.categorie,
          description_client: formData.description_client.trim(),
          prix_base_fcfa: Number(formData.prix_base_fcfa) || 0,
          unite: formData.unite,
          actif: formData.actif,
          ordre: services.length + 1,
        });
        showToast('Nouvelle prestation ajoutée au Grimoire.', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch {
      showToast('Une erreur est survenue lors de l’enregistrement.', 'error');
    }
  };

  const handleToggleActif = async (srv: CsService) => {
    try {
      await updateService(srv.id, { actif: !srv.actif });
      setServices((prev) =>
        prev.map((s) => (s.id === srv.id ? { ...s, actif: !s.actif } : s))
      );
      showToast(
        srv.actif ? 'Prestation désactivée.' : 'Prestation activée.',
        'info'
      );
    } catch {
      showToast('Erreur lors du changement de statut.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirmez-vous la suppression de cette prestation ?')) return;
    try {
      await deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      showToast('Prestation supprimée du catalogue.', 'info');
    } catch {
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  const filteredServices = services.filter((srv) => {
    const matchCat =
      selectedCategory === 'Toutes' || srv.categorie === selectedCategory;
    const matchSearch =
      srv.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (srv.description_client &&
        srv.description_client.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6600CC] ring-4 ring-[#6600CC]/20" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#A87FE8]">
              Catalogue officiel Class S
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Grimoire
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Référentiel des prestations, tarifs de base en FCFA et descriptifs clients sobres.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {services.length === 0 && (
            <Button
              variant="outline"
              size="md"
              onClick={handleInitAnnexeA}
              leftIcon={<Sparkles className="w-4 h-4 text-[#A87FE8]" />}
            >
              Initialiser (Annexe A)
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouvelle prestation
          </Button>
        </div>
      </div>

      {/* Onglets : Catalogue vs Rentabilité (Bientôt disponible) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('catalogue')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'catalogue'
              ? 'bg-[#6600CC] text-white shadow-lg shadow-[#6600CC]/30'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          Catalogue ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('rentabilite')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'rentabilite'
              ? 'bg-[#6600CC] text-white shadow-lg shadow-[#6600CC]/30'
              : 'text-white/40 hover:text-white/60 hover:bg-white/5'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Rentabilité</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[#A87FE8]">
            Bientôt disponible
          </span>
        </button>
      </div>

      {activeTab === 'rentabilite' ? (
        <div className="p-12 rounded-3xl bg-[#16112A]/60 border border-[#A87FE8]/20 backdrop-blur-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#6600CC]/20 border border-[#A87FE8]/30 flex items-center justify-center text-[#A87FE8]">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-serif font-bold text-white">
            Analyse de rentabilité
          </h3>
          <p className="text-sm text-white/60 max-w-md mx-auto">
            Le module de calcul du coût de revient horaire et de la marge réelle par prestation
            sera activé dans une future version du Système.
          </p>
          <div className="pt-2">
            <Button variant="secondary" onClick={() => setActiveTab('catalogue')}>
              Retourner au catalogue
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Barre de recherche et catégories */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filtres de catégorie */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#A87FE8]/20 text-[#A87FE8] border border-[#A87FE8]/40'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Champ de recherche */}
            <div className="w-full md:w-64">
              <Input
                placeholder="Rechercher une prestation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-white/40" />}
              />
            </div>
          </div>

          {/* Liste des prestations */}
          {loading ? (
            <div className="p-12 text-center text-white/40 text-sm">
              Chargement du Grimoire...
            </div>
          ) : filteredServices.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title="Aucune prestation trouvée"
              description={
                services.length === 0
                  ? 'Le Grimoire est encore vide. Vous pouvez l’initialiser en un clic avec le catalogue officiel de l’Annexe A.'
                  : 'Aucune prestation ne correspond à vos critères de recherche.'
              }
              actionLabel={services.length === 0 ? 'Initialiser avec l’Annexe A' : 'Créer une prestation'}
              onAction={services.length === 0 ? handleInitAnnexeA : handleOpenCreate}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((srv) => (
                <div
                  key={srv.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    srv.actif
                      ? 'bg-[#16112A]/60 border-white/10 hover:border-[#A87FE8]/40'
                      : 'bg-white/[0.02] border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[#A87FE8] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#6600CC]/20 border border-[#6600CC]/30">
                        {srv.categorie}
                      </span>
                      <button
                        onClick={() => handleToggleActif(srv)}
                        title={srv.actif ? 'Désactiver' : 'Activer'}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        {srv.actif ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <PowerOff className="w-4 h-4 text-white/30" />
                        )}
                      </button>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-white tracking-tight">
                        {srv.nom}
                      </h3>
                      {srv.description_client ? (
                        <p className="text-xs text-white/60 mt-1 line-clamp-3 leading-relaxed">
                          {srv.description_client}
                        </p>
                      ) : (
                        <p className="text-xs text-white/30 italic mt-1">
                          Aucun descriptif client.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-white tabular-nums">
                        {formatFCFA(srv.prix_base_fcfa)}
                      </span>
                      <span className="text-xs text-white/50 ml-1.5 font-medium">
                        / {srv.unite}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(srv)}
                        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(srv.id)}
                        className="p-1.5 rounded-lg text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal Création / Édition */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Modifier la prestation' : 'Nouvelle prestation'}
        description="Les informations de cette prestation serviront de base lors de l’élaboration des devis."
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nom de la prestation *"
            placeholder="Ex : Identité visuelle Complète"
            value={formData.nom}
            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Catégorie *"
              value={formData.categorie}
              onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
              options={CATEGORIES.filter((c) => c !== 'Toutes').map((c) => ({
                value: c,
                label: c,
              }))}
            />

            <Select
              label="Unité de facturation *"
              value={formData.unite}
              onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
              options={UNITES}
            />
          </div>

          <Input
            label="Tarif de base en FCFA *"
            type="number"
            min={0}
            step={1000}
            value={formData.prix_base_fcfa}
            onChange={(e) =>
              setFormData({ ...formData, prix_base_fcfa: Number(e.target.value) })
            }
            helperText={`Montant affiché : ${formatFCFA(formData.prix_base_fcfa)}`}
          />

          <Textarea
            label="Descriptif client"
            placeholder="Description sobre destinée à figurer sur les devis (sans mention de capacité interne)..."
            rows={4}
            value={formData.description_client}
            onChange={(e) =>
              setFormData({ ...formData, description_client: e.target.value })
            }
          />

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="srv_actif"
              checked={formData.actif}
              onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#6600CC] focus:ring-[#A87FE8]"
            />
            <label htmlFor="srv_actif" className="text-sm text-white/80 select-none">
              Prestation active et sélectionnable dans les devis
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              {editingService ? 'Mettre à jour' : 'Ajouter au Grimoire'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
