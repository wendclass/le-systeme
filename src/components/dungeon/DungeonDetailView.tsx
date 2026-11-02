import React, { useState, useEffect } from 'react';
import { CsProjet, CsEtape, CsClient, CsDossier } from '../../types';
import {
  getProjetById,
  advanceEtape,
  updateEtape,
  addEtapeToProjet,
  deleteEtapeFromProjet,
  reorderEtapes,
  getLienClient,
  buildClientFullUrl,
  generateWhatsAppMessage,
  buildWhatsAppLink,
} from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit2,
  MessageCircle,
  Sparkles,
  Receipt,
  AlertTriangle,
  Send,
} from 'lucide-react';

interface DungeonDetailViewProps {
  projectId: string;
  onBack: () => void;
  onCreateSoldeInvoice: (devisId?: string, dossierId?: string) => void;
}

export const DungeonDetailView: React.FC<DungeonDetailViewProps> = ({
  projectId,
  onBack,
  onCreateSoldeInvoice,
}) => {
  const { showToast } = useToast();
  const [projet, setProjet] = useState<CsProjet | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  // Étape en cours d'avancement
  const [currentStepMessage, setCurrentStepMessage] = useState('');
  const [isFinalConfirmOpen, setIsFinalConfirmOpen] = useState(false);

  // Nouvelle étape
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [newStepName, setNewStepName] = useState('');

  // WhatsApp Modal
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppText, setWhatsAppText] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const found = await getProjetById(projectId);
      if (found) {
        setProjet(found);
      } else {
        showToast('Projet introuvable.', 'error');
        onBack();
      }
    } catch {
      showToast('Erreur lors du chargement du projet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  if (loading || !projet) {
    return (
      <div className="p-12 text-center text-white/40 text-sm">
        Chargement de l’atelier Donjon...
      </div>
    );
  }

  const etapes = (projet.etapes || []).sort((a, b) => a.ordre - b.ordre);
  const currentEtape = etapes.find((e) => e.statut === 'en_cours');
  const isFinalStep = currentEtape && etapes.indexOf(currentEtape) === etapes.length - 1;
  const isProjectLivre = projet.statut === 'livre';

  // Terminer l'étape courante
  const handleAdvanceStep = async () => {
    if (!currentEtape) return;

    // Si c'est la dernière étape, demander confirmation
    if (isFinalStep && !isFinalConfirmOpen) {
      setIsFinalConfirmOpen(true);
      return;
    }

    setAdvancing(true);
    try {
      const res = await advanceEtape(
        projet.id,
        currentEtape.id,
        currentStepMessage.trim() || undefined
      );

      setProjet(res.projet);
      setCurrentStepMessage('');
      setIsFinalConfirmOpen(false);

      if (res.estLivre) {
        showToast('Toutes les étapes sont validées. Le projet est marqué Livré !', 'success');
      } else {
        showToast(`Étape « ${currentEtape.nom} » validée. Passage à la suivante.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l’avancement de l’étape.', 'error');
    } finally {
      setAdvancing(false);
    }
  };

  // Prévenir le client par WhatsApp
  const handleNotifyClient = async (etape: CsEtape) => {
    const client = projet.dossier?.client;
    if (!client) return;

    const lien = await getLienClient(projet.dossier_id);
    const linkUrl = lien ? buildClientFullUrl(lien.token) : 'https://lesysteme.wendclass.com';

    const msg = await generateWhatsAppMessage('avancement', {
      nom: client.nom,
      etape: etape.nom,
      lien: linkUrl,
    });

    setWhatsAppText(msg);
    setIsWhatsAppModalOpen(true);
  };

  // Réordonner les étapes
  const handleMoveStep = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= etapes.length) return;

    const newOrder = [...etapes];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const updated = await reorderEtapes(
      projet.id,
      newOrder.map((e) => e.id)
    );
    setProjet(updated);
    showToast('Ordre des étapes mis à jour.', 'info');
  };

  // Ajouter une étape
  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepName.trim()) return;

    try {
      const updated = await addEtapeToProjet(projet.id, newStepName.trim());
      setProjet(updated);
      setNewStepName('');
      setIsAddStepOpen(false);
      showToast('Nouvelle étape ajoutée au projet.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l’ajout.', 'error');
    }
  };

  // Supprimer une étape
  const handleDeleteStep = async (etapeId: string) => {
    if (!confirm('Confirmez-vous la suppression de cette étape ?')) return;
    try {
      const updated = await deleteEtapeFromProjet(projet.id, etapeId);
      setProjet(updated);
      showToast('Étape retirée.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Retour aux projets
          </Button>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
                {projet.titre}
              </h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isProjectLivre
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-[#6600CC]/30 text-[#A87FE8] border border-[#6600CC]/40'
                }`}
              >
                {isProjectLivre ? 'Livré' : 'En production'}
              </span>
            </div>
            <p className="text-xs text-white/50">
              Client : {projet.dossier?.client?.nom || 'Client'}
              {projet.dossier?.client?.entreprise ? ` (${projet.dossier.client.entreprise})` : ''}
              {projet.ouvert_le && ` • Ouvert le ${new Date(projet.ouvert_le).toLocaleDateString('fr-FR')}`}
            </p>
          </div>
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddStepOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Ajouter une étape
          </Button>
        </div>
      </div>

      {/* BANNIÈRE DE LIVRAISON & FACTURE DE SOLDE */}
      {isProjectLivre && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600/20 to-[#6600CC]/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white">
                Projet validé et marqué Livré !
              </h3>
              <p className="text-xs text-white/70">
                Toutes les étapes de création sont achevées. Vous pouvez maintenant émettre la facture de solde.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onCreateSoldeInvoice(undefined, projet.dossier_id)}
            leftIcon={<Receipt className="w-4 h-4" />}
          >
            Créer la facture de solde
          </Button>
        </div>
      )}

      {/* ACTION SUR L'ÉTAPE ACTIVE */}
      {currentEtape && !isProjectLivre && (
        <Card className="p-6 space-y-4 border-[#A87FE8]/30 bg-[#6600CC]/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Étape en cours : {currentEtape.nom}
              </h3>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNotifyClient(currentEtape)}
              leftIcon={<MessageCircle className="w-3.5 h-3.5 text-emerald-400" />}
            >
              Prévenir le client (WhatsApp)
            </Button>
          </div>

          <Textarea
            label="Message d’avancement pour le client (facultatif, 280 caractères max)"
            placeholder="Ex : Les trois premières pistes de logo sont prêtes et vous attendent..."
            rows={2}
            maxLength={280}
            value={currentStepMessage}
            onChange={(e) => setCurrentStepMessage(e.target.value)}
            helperText={`${currentStepMessage.length} / 280 caractères`}
          />

          <div className="flex justify-end pt-1">
            <Button
              variant="primary"
              size="md"
              onClick={handleAdvanceStep}
              loading={advancing}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {isFinalStep
                ? 'Terminer l’étape finale & Marquer le projet Livré'
                : 'Terminer l’étape et passer à la suivante'}
            </Button>
          </div>
        </Card>
      )}

      {/* SÉQUENCE DES ÉTAPES */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <h2 className="text-base font-serif font-bold text-white">
            Séquence des étapes de création ({etapes.length})
          </h2>
          <span className="text-xs text-white/50">
            Une seule étape en cours à la fois
          </span>
        </div>

        <div className="space-y-3">
          {etapes.map((etape, index) => {
            const isCompleted = etape.statut === 'terminee';
            const isCurrent = etape.statut === 'en_cours';

            return (
              <div
                key={etape.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-[#6600CC]/20 border-[#A87FE8]/40 shadow-sm ring-1 ring-[#A87FE8]/20'
                    : isCompleted
                    ? 'bg-white/[0.02] border-white/10'
                    : 'bg-white/[0.01] border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  {/* Boutons monter / descendre faciles à toucher (min 44px sur mobile) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveStep(index, 'up')}
                      className="p-2 rounded-lg text-white/40 hover:text-white disabled:opacity-20 hover:bg-white/5 transition-colors"
                      title="Monter l’étape"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === etapes.length - 1}
                      onClick={() => handleMoveStep(index, 'down')}
                      className="p-2 rounded-lg text-white/40 hover:text-white disabled:opacity-20 hover:bg-white/5 transition-colors"
                      title="Descendre l’étape"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white/10 text-xs font-bold flex items-center justify-center text-white/70">
                        {index + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-white">
                        {etape.nom}
                      </h4>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isCurrent
                            ? 'bg-[#6600CC]/30 text-[#A87FE8]'
                            : 'bg-white/5 text-white/40'
                        }`}
                      >
                        {isCompleted
                          ? 'Terminée'
                          : isCurrent
                          ? 'En cours'
                          : 'À venir'}
                      </span>
                    </div>

                    {etape.message_client && (
                      <p className="text-xs text-white/60 italic pl-7 line-clamp-2">
                        « {etape.message_client} »
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-white/5">
                  {isCompleted && etape.terminee_le && (
                    <span className="text-xs text-white/40 tabular-nums">
                      {new Date(etape.terminee_le).toLocaleDateString('fr-FR')}
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleNotifyClient(etape)}
                      className="p-2 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-white/5 transition-colors"
                      title="Prévenir le client"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={etapes.length <= 1}
                      onClick={() => handleDeleteStep(etape.id)}
                      className="p-2 rounded-lg text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-20"
                      title="Supprimer l’étape"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modal Confirmation Étape Finale */}
      <Modal
        isOpen={isFinalConfirmOpen}
        onClose={() => setIsFinalConfirmOpen(false)}
        title="Valider la livraison finale ?"
        description="Cette action validera la dernière étape du projet. Le projet et le dossier passeront au statut Livré, et la facture de solde pourra être émise."
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
            <span className="font-bold block">Confirmation requise</span>
            <span>Vous confirmez avoir remis tous les fichiers finaux convenus au client.</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setIsFinalConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              loading={advancing}
              onClick={handleAdvanceStep}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirmer la livraison
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Ajouter Étape */}
      <Modal
        isOpen={isAddStepOpen}
        onClose={() => setIsAddStepOpen(false)}
        title="Ajouter une étape personnalisée"
        description="Insérez une étape spécifique pour ce projet de création."
        size="md"
      >
        <form onSubmit={handleAddStep} className="space-y-4">
          <Input
            label="Nom de l’étape *"
            placeholder="Ex : Validation des maquettes imprimées, Shooting packaging..."
            value={newStepName}
            onChange={(e) => setNewStepName(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddStepOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Ajouter l’étape
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal WhatsApp Avancement */}
      <Modal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        title="Prévenir le client sur WhatsApp"
        description={`Envoyez le message d’avancement à ${projet.dossier?.client?.nom || 'Client'}.`}
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label="Message prérempli modifiable"
            rows={4}
            value={whatsAppText}
            onChange={(e) => setWhatsAppText(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setIsWhatsAppModalOpen(false)}
            >
              Annuler
            </Button>
            <a
              href={buildWhatsAppLink(
                projet.dossier?.client?.whatsapp || '',
                whatsAppText
              )}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsWhatsAppModalOpen(false)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Ouvrir dans WhatsApp</span>
            </a>
          </div>
        </div>
      </Modal>
    </div>
  );
};
