import React, { useState, useEffect } from 'react';
import { CsDevis, CsFactureType, CsReglages } from '../../types';
import {
  getDevisList,
  getReglages,
  createFactureFromDevis,
  formatFCFA,
} from '../../lib/classSStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { FileText, Plus, AlertCircle, Sparkles } from 'lucide-react';

interface InvoiceBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: (newFactureId: string) => void;
  preselectedDevisId?: string;
}

export const InvoiceBuilderModal: React.FC<InvoiceBuilderModalProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
  preselectedDevisId,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [acceptedDevis, setAcceptedDevis] = useState<CsDevis[]>([]);
  const [reglages, setReglages] = useState<CsReglages | null>(null);

  const [selectedDevisId, setSelectedDevisId] = useState(preselectedDevisId || '');
  const [factureType, setFactureType] = useState<CsFactureType>('acompte');
  const [customAcomptePct, setCustomAcomptePct] = useState(50);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, preselectedDevisId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allDevis, reg] = await Promise.all([
        getDevisList(),
        getReglages(),
      ]);

      // Filtrer les devis acceptés (ou prêts/envoyés pour tests si besoin)
      const eligibles = allDevis.filter(
        (d) => d.statut === 'accepte' || d.statut === 'envoye' || d.statut === 'pret'
      );
      setAcceptedDevis(eligibles);
      setReglages(reg);

      const defaultPct = reg.pourcentage_acompte || 50;
      setCustomAcomptePct(defaultPct);

      if (preselectedDevisId) {
        setSelectedDevisId(preselectedDevisId);
      } else if (eligibles.length > 0) {
        setSelectedDevisId(eligibles[0].id);
      }
    } catch {
      showToast('Impossible de charger les devis disponibles.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedDevis = acceptedDevis.find((d) => d.id === selectedDevisId);

  // Calcul du montant prévisionnel
  const montantEstime = (() => {
    if (!selectedDevis) return 0;
    if (factureType === 'acompte') {
      return Math.round((selectedDevis.total_fcfa * (customAcomptePct || 50)) / 100);
    }
    return selectedDevis.total_fcfa;
  })();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevisId) {
      showToast('Veuillez sélectionner un devis de référence.', 'warning');
      return;
    }

    setCreating(true);
    try {
      const created = await createFactureFromDevis(
        selectedDevisId,
        factureType,
        factureType === 'acompte' ? customAcomptePct : undefined
      );

      showToast(`Facture ${created.numero} créée avec succès.`, 'success');
      onInvoiceCreated(created.id);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la création de la facture.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer une nouvelle facture"
      description="Émettez une facture d’acompte, de solde ou complète rattachée à un devis."
      size="md"
    >
      {loading ? (
        <div className="p-8 text-center text-xs text-white/50">
          Chargement des devis éligibles...
        </div>
      ) : acceptedDevis.length === 0 ? (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-xs text-amber-200">
            Aucun devis disponible pour la facturation. Vous devez d’abord créer et faire accepter un devis dans l’Armée des Ombres ou le Portail.
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1.5">
              Devis de référence *
            </label>
            <select
              value={selectedDevisId}
              onChange={(e) => setSelectedDevisId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#A87FE8]"
            >
              {acceptedDevis.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#16112A]">
                  {d.numero} • {d.dossier?.client?.nom || 'Client'} ({formatFCFA(d.total_fcfa)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Type de facture *"
              value={factureType}
              onChange={(e) => setFactureType(e.target.value as CsFactureType)}
              options={[
                { value: 'acompte', label: 'Facture d’acompte' },
                { value: 'solde', label: 'Facture de solde' },
                { value: 'complete', label: 'Facture complète' },
              ]}
            />

            {factureType === 'acompte' && (
              <Input
                label="Pourcentage d’acompte (%)"
                type="number"
                min={10}
                max={100}
                value={customAcomptePct}
                onChange={(e) => setCustomAcomptePct(Number(e.target.value) || 50)}
              />
            )}
          </div>

          {/* Récapitulatif prévisionnel */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs">
            <span className="text-white/60">Montant total de la facture :</span>
            <span className="text-base font-bold text-white tabular-nums">
              {formatFCFA(montantEstime)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={creating}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Générer la facture
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
