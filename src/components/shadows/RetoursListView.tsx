import React, { useState, useEffect } from 'react';
import { CsRetour, CsDossier } from '../../types';
import {
  getRetoursList,
  updateRetour,
  publishTestimonialToSite,
  unpublishTestimonialFromSite,
  getDossiers,
} from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { StatutPill } from '../ui/StatutPill';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import {
  MessageSquare,
  Star,
  Globe,
  CheckCircle,
  XCircle,
  EyeOff,
  Edit3,
  AlertTriangle,
  Lock,
  Sparkles,
  Search,
  FolderOpen,
} from 'lucide-react';

interface RetoursListViewProps {
  onSelectDossier?: (dossierId: string) => void;
}

export const RetoursListView: React.FC<RetoursListViewProps> = ({ onSelectDossier }) => {
  const { showToast } = useToast();
  const [retours, setRetours] = useState<CsRetour[]>([]);
  const [dossiers, setDossiers] = useState<CsDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatut, setSelectedStatut] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal d'édition du témoignage par Scott
  const [editingRetour, setEditingRetour] = useState<CsRetour | null>(null);
  const [editedText, setEditedText] = useState('');
  const [editedNom, setEditedNom] = useState('');
  const [editedFonction, setEditedFonction] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, dosList] = await Promise.all([getRetoursList(), getDossiers()]);
      setRetours(list);
      setDossiers(dosList);
    } catch {
      showToast('Erreur de chargement des retours', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const dossiersMap = new Map(dossiers.map((d) => [d.id, d]));

  const filtered = retours.filter((r) => {
    if (selectedStatut !== 'tous' && r.statut !== selectedStatut) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNom = r.nom_affiche?.toLowerCase().includes(q);
      const matchTexte = (r.temoignage_edite || r.temoignage_original)?.toLowerCase().includes(q);
      const matchPrive = r.commentaire_prive?.toLowerCase().includes(q);
      if (!matchNom && !matchTexte && !matchPrive) return false;
    }
    return true;
  });

  const handleStartEdit = (ret: CsRetour) => {
    setEditingRetour(ret);
    setEditedText(ret.temoignage_edite || ret.temoignage_original || '');
    setEditedNom(ret.nom_affiche || '');
    setEditedFonction(ret.fonction_entreprise || '');
  };

  const handleSaveEdit = async () => {
    if (!editingRetour) return;
    setSavingEdit(true);
    try {
      await updateRetour(editingRetour.id, {
        temoignage_edite: editedText.trim(),
        nom_affiche: editedNom.trim(),
        fonction_entreprise: editedFonction.trim() || null,
        statut: editingRetour.statut === 'a_valider' ? 'valide' : editingRetour.statut,
      });
      showToast('Témoignage mis à jour', 'success');
      setEditingRetour(null);
      await loadData();
    } catch {
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleValidate = async (id: string) => {
    try {
      await updateRetour(id, { statut: 'valide' });
      showToast('Retour validé', 'success');
      await loadData();
    } catch {
      showToast('Erreur lors de la validation', 'error');
    }
  };

  const handleRefuse = async (id: string) => {
    if (!confirm('Refuser ce retour client ?')) return;
    try {
      await updateRetour(id, { statut: 'refuse' });
      showToast('Retour refusé', 'info');
      await loadData();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await publishTestimonialToSite(id);
      if (res.success) {
        showToast('Témoignage publié sur le site wendclass.com !', 'success');
        await loadData();
      } else {
        showToast(res.error || 'Erreur lors de la publication', 'error');
      }
    } catch {
      showToast('Erreur lors de la publication', 'error');
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await unpublishTestimonialFromSite(id);
      showToast('Témoignage retiré du site', 'info');
      await loadData();
    } catch {
      showToast('Erreur', 'error');
    }
  };

  return (
    <div className="space-y-6 font-body">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-[#A87FE8]" />
            Avis & Témoignages clients
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-1">
            Examen du feedback privé, relecture des témoignages et publication contrôlée sur wendclass.com.
          </p>
        </div>

        {/* Filtres par statut */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10 text-xs overflow-x-auto">
          {[
            { id: 'tous', label: 'Tous' },
            { id: 'a_valider', label: 'À valider' },
            { id: 'valide', label: 'Validés' },
            { id: 'publie', label: 'Publiés' },
            { id: 'refuse', label: 'Refusés' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedStatut(item.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                selectedStatut === item.id
                  ? 'bg-[#6600CC] text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom, commentaire..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#6600CC]"
        />
      </div>

      {/* Liste des retours */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-6 h-6" />}
          title="Aucun retour client trouvé"
          description="Les avis et témoignages déposés par vos clients apparaîtront ici dès la livraison finale de leurs projets."
        />
      ) : (
        <div className="space-y-5">
          {filtered.map((ret) => {
            const dossier = dossiersMap.get(ret.dossier_id);
            const clientNom = dossier?.client?.entreprise || dossier?.client?.nom || ret.nom_affiche || 'Client';
            const hasModifications = Boolean(ret.temoignage_edite && ret.temoignage_edite !== ret.temoignage_original);

            return (
              <div
                key={ret.id}
                className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5 relative overflow-hidden"
              >
                {/* Ligne d'en-tête de la carte */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    {ret.photo_url ? (
                      <img
                        src={ret.photo_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-white/20"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#6600CC]/20 text-[#A87FE8] flex items-center justify-center font-bold text-sm">
                        {ret.nom_affiche?.slice(0, 2).toUpperCase() || 'CL'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">
                          {ret.nom_affiche || clientNom}
                        </h3>
                        {ret.fonction_entreprise && (
                          <span className="text-xs text-white/50">
                            • {ret.fonction_entreprise}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/40">
                        Soumis le {new Date(ret.created_at).toLocaleDateString('fr-FR')}
                        {ret.publie_le && (
                          <span className="text-[#2FA77A] ml-2">
                            • Publié le {new Date(ret.publie_le).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        ret.statut === 'publie'
                          ? 'bg-[#2FA77A]/20 text-[#2FA77A] border border-[#2FA77A]/30'
                          : ret.statut === 'valide'
                          ? 'bg-[#6600CC]/20 text-[#A87FE8] border border-[#6600CC]/30'
                          : ret.statut === 'refuse'
                          ? 'bg-[#E8546B]/20 text-[#E8546B]'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {ret.statut === 'publie'
                        ? 'Publié sur le site'
                        : ret.statut === 'valide'
                        ? 'Validé (prêt)'
                        : ret.statut === 'refuse'
                        ? 'Refusé'
                        : 'À valider'}
                    </span>

                    {/* Badge accord de publication */}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        ret.accord_publication
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {ret.accord_publication ? 'Accord publication : OUI' : 'Accord : NON'}
                    </span>

                    {onSelectDossier && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectDossier(ret.dossier_id)}
                        className="text-xs text-white/60 hover:text-white"
                        leftIcon={<FolderOpen className="w-3.5 h-3.5 text-[#A87FE8]" />}
                      >
                        Voir le dossier
                      </Button>
                    )}
                  </div>
                </div>

                {/* 1. Bloc Feedback Privé (Scott uniquement) */}
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/70 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Feedback privé (ne sera jamais publié)
                    </span>
                    {ret.note_satisfaction && (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= ret.note_satisfaction!
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-white/10'
                            }`}
                          />
                        ))}
                        <span className="text-white/60 text-xs ml-1 font-semibold">
                          {ret.note_satisfaction}/5
                        </span>
                      </div>
                    )}
                  </div>

                  {ret.commentaire_prive && (
                    <div className="text-xs text-white/80">
                      <span className="text-white/40 block text-[10px] uppercase font-bold">
                        Ce que le client a le plus apprécié :
                      </span>
                      <p className="mt-0.5 leading-relaxed">{ret.commentaire_prive}</p>
                    </div>
                  )}

                  {ret.amelioration_prive && (
                    <div className="text-xs text-white/80 pt-1">
                      <span className="text-white/40 block text-[10px] uppercase font-bold">
                        Pistes d’amélioration suggérées :
                      </span>
                      <p className="mt-0.5 leading-relaxed text-amber-200/90">
                        {ret.amelioration_prive}
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Bloc Témoignage Public (Comparaison Original vs Édité) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#A87FE8]" />
                      Témoignage destiné au site wendclass.com
                    </span>
                    {hasModifications && (
                      <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                        Texte corrigé par Scott
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Texte original du client */}
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-white/40 block">
                        Version originale du client (intacte)
                      </span>
                      <p className="text-white/80 italic leading-relaxed">
                        « {ret.temoignage_original} »
                      </p>
                    </div>

                    {/* Texte édité ou prêt pour publication */}
                    <div className="p-3.5 rounded-xl bg-[#6600CC]/10 border border-[#6600CC]/30 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#A87FE8] block">
                        Version finale à publier
                      </span>
                      <p className="text-white font-medium leading-relaxed">
                        « {ret.temoignage_edite || ret.temoignage_original} »
                      </p>
                    </div>
                  </div>
                </div>

                {/* Barre d'actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartEdit(ret)}
                    className="text-xs border-white/20 text-white hover:bg-white/10"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5 text-[#A87FE8]" />
                    Corriger le texte
                  </Button>

                  <div className="flex flex-wrap items-center gap-2">
                    {ret.statut === 'publie' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnpublish(ret.id)}
                        className="text-xs border-[#E8546B]/40 text-[#E8546B] hover:bg-[#E8546B]/15"
                      >
                        <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                        Dépublier du site
                      </Button>
                    ) : (
                      <>
                        {ret.statut === 'a_valider' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleValidate(ret.id)}
                            className="text-xs border-[#2FA77A]/40 text-[#2FA77A] hover:bg-[#2FA77A]/15"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            Valider
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={() => handlePublish(ret.id)}
                          disabled={!ret.accord_publication}
                          title={
                            !ret.accord_publication
                              ? 'Publication impossible sans l’accord du client'
                              : 'Publier sur wendclass.com'
                          }
                          className="text-xs bg-[#6600CC] hover:bg-[#6600CC]/90 text-white disabled:opacity-40"
                        >
                          <Globe className="w-3.5 h-3.5 mr-1.5" />
                          Publier sur le site
                        </Button>

                        {ret.statut !== 'refuse' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRefuse(ret.id)}
                            className="text-xs text-white/40 hover:text-[#E8546B]"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Refuser
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'édition du témoignage par Scott */}
      {editingRetour && (
        <Modal
          isOpen={Boolean(editingRetour)}
          onClose={() => setEditingRetour(null)}
          title="Corriger le témoignage client"
          size="md"
        >
          <div className="space-y-4 font-body">
            <p className="text-xs text-white/60">
              Vous pouvez corriger les éventuelles coquilles orthographiques ou ajuster la
              longueur. Le texte original du client restera archivé et consultable.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  Nom affiché
                </label>
                <input
                  type="text"
                  value={editedNom}
                  onChange={(e) => setEditedNom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-[#6600CC]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">
                  Fonction / Entreprise
                </label>
                <input
                  type="text"
                  value={editedFonction}
                  onChange={(e) => setEditedFonction(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-[#6600CC]"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-white/70">
                  Texte du témoignage (version finale à publier)
                </label>
                <span className="text-[11px] font-mono text-white/40">
                  {editedText.trim().length} / 600
                </span>
              </div>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={4}
                maxLength={600}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-[#6600CC]"
              />
            </div>

            <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-[11px] text-white/50 space-y-1">
              <span className="font-semibold text-white/70">Rappel du texte original :</span>
              <p className="italic">« {editingRetour.temoignage_original} »</p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={() => setEditingRetour(null)}
                disabled={savingEdit}
              >
                Annuler
              </Button>
              <Button onClick={handleSaveEdit} loading={savingEdit}>
                Enregistrer les corrections
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
