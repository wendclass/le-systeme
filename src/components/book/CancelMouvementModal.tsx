import React, { useState } from 'react';
import { CsMouvement } from '../../types';
import { cancelMouvement, formatFCFA } from '../../lib/classSStore';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

interface CancelMouvementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cancelled: CsMouvement) => void;
  mouvement: CsMouvement | null;
}

export const CancelMouvementModal: React.FC<CancelMouvementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mouvement,
}) => {
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mouvement) return null;

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motif.trim()) {
      setError('Le motif d’annulation est obligatoire pour la traçabilité comptable.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cancelled = await cancelMouvement(mouvement.id, motif.trim());
      onSuccess(cancelled);
      setMotif('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l’annulation de l’opération.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Annuler une opération du livre de compte"
      size="sm"
    >
      <form onSubmit={handleCancel} className="space-y-4 font-body">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#E8546B]/15 border border-[#E8546B]/30">
          <AlertTriangle className="w-5 h-5 text-[#E8546B] shrink-0 mt-0.5" />
          <div className="text-xs text-white/80 space-y-1">
            <p className="font-semibold text-white">Attention : action comptable tracée</p>
            <p>
              L’opération restera inscrite dans le journal en mode barré et sera exclue des
              totaux. L’historique d’audit conservera la trace de cette annulation.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5">
          <div className="flex justify-between text-white/60">
            <span>Date de l’opération :</span>
            <span className="text-white font-medium">{mouvement.date}</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Libellé :</span>
            <span className="text-white font-medium">{mouvement.libelle}</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Montant :</span>
            <span className="text-white font-bold">{formatFCFA(mouvement.montant_fcfa)}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#E8546B]/20 text-[#E8546B] text-xs">
            {error}
          </div>
        )}

        <Textarea
          label="Motif obligatoire de l’annulation"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Ex : Erreur de saisie de montant, doublon d'écriture, opération non aboutie..."
          rows={3}
          required
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Retour
          </Button>
          <Button
            type="submit"
            className="bg-[#E8546B] hover:bg-[#E8546B]/90 text-white"
            loading={loading}
          >
            Confirmer l’annulation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
