import React, { useState, useEffect } from 'react';
import { CsFacture, CsReglages } from '../../types';
import {
  getReglages,
  recordPaiement,
  formatFCFA,
} from '../../lib/classSStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../ui/Toast';
import { CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  facture: CsFacture | null;
  onPaymentRecorded: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  facture,
  onPaymentRecorded,
}) => {
  const { showToast } = useToast();
  const [reglages, setReglages] = useState<CsReglages | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Formulaire
  const [montant, setMontant] = useState<number>(0);
  const [dateReception, setDateReception] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [moyen, setMoyen] = useState('Mobile Money (Orange Money, Moov Money)');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && facture) {
      loadReglagesAndInit();
    }
  }, [isOpen, facture]);

  const loadReglagesAndInit = async () => {
    const reg = await getReglages();
    setReglages(reg);

    if (reg.moyens_paiement && reg.moyens_paiement.length > 0) {
      setMoyen(reg.moyens_paiement[0]);
    }

    if (facture) {
      const totalDejaPaye = (facture.paiements || [])
        .filter((p) => !p.annule)
        .reduce((acc, p) => acc + p.montant_fcfa, 0);
      const resteDu = Math.max(0, facture.total_fcfa - totalDejaPaye);
      setMontant(resteDu);
    }
    setDateReception(new Date().toISOString().split('T')[0]);
    setReference('');
    setNote('');
    setErrorMsg(null);
  };

  if (!facture) return null;

  const totalDejaPaye = (facture.paiements || [])
    .filter((p) => !p.annule)
    .reduce((acc, p) => acc + p.montant_fcfa, 0);
  const resteDu = Math.max(0, facture.total_fcfa - totalDejaPaye);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const montantNum = Number(montant) || 0;
    if (montantNum <= 0) {
      setErrorMsg('Le montant doit être supérieur à 0 FCFA.');
      return;
    }

    if (montantNum > resteDu) {
      setErrorMsg(
        `Le montant saisi (${formatFCFA(montantNum)}) dépasse le reste dû (${formatFCFA(
          resteDu
        )}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await recordPaiement(facture.id, {
        montant_fcfa: montantNum,
        date_reception: dateReception,
        moyen,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });

      showToast(
        `Paiement validé avec succès. Reçu ${res.paiement.numero_recu} généré.`,
        'success'
      );

      if (res.projetOuvert) {
        showToast(
          `Projet « ${res.projetOuvert.titre} » ouvert automatiquement dans le Donjon !`,
          'info'
        );
      }

      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la validation du paiement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enregistrer un paiement"
      description={`Facture ${facture.numero} • Reste dû : ${formatFCFA(resteDu)}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Montant reçu en FCFA *"
            type="number"
            min={1}
            max={resteDu}
            step={1000}
            value={montant}
            onChange={(e) => setMontant(Number(e.target.value) || 0)}
            helperText={`Reste dû maximal : ${formatFCFA(resteDu)}`}
            required
          />

          <Input
            label="Date de réception *"
            type="date"
            value={dateReception}
            onChange={(e) => setDateReception(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-white/70 block mb-1.5">
            Moyen de paiement *
          </label>
          <select
            value={moyen}
            onChange={(e) => setMoyen(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#A87FE8]"
          >
            {(reglages?.moyens_paiement || [
              'Mobile Money (Orange Money, Moov Money)',
              'Virement bancaire',
              'Espèces',
            ]).map((m) => (
              <option key={m} value={m} className="bg-[#16112A]">
                {m}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Référence de transaction (facultative)"
          placeholder="Ex : ID transaction Orange Money, n° virement..."
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />

        <Textarea
          label="Note interne (Scott seul)"
          placeholder="Remarque libre sur ce versement..."
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="p-3 rounded-xl bg-[#6600CC]/10 border border-[#A87FE8]/20 text-xs text-white/70 space-y-1">
          <p className="font-semibold text-white">Validation immédiate :</p>
          <p>
            En cliquant sur Valider, vous confirmez avoir reçu les fonds. Un reçu officiel (REC-AAAA-NNN) sera instantanément généré et mis à disposition du client.
          </p>
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
            loading={submitting}
            leftIcon={<CheckCircle className="w-4 h-4" />}
          >
            Valider la réception
          </Button>
        </div>
      </form>
    </Modal>
  );
};
