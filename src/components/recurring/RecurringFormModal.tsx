import React, { useState } from 'react';
import { Activity, RecurringExpense, RecurringExpenseNature } from '../../types';
import { Modal } from '../common/Modal';
import { SUPPORTED_CURRENCIES, convertToUSD, getAppCurrency } from '../../lib/currency';
import { formatUSD } from '../../lib/utils';
import { Check, AlertCircle } from 'lucide-react';

interface RecurringFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  onAddRecurringExpense: (
    exp: Omit<RecurringExpense, 'id' | 'uid' | 'montant_usd'>
  ) => Promise<RecurringExpense>;
}

export const RecurringFormModal: React.FC<RecurringFormModalProps> = ({
  isOpen,
  onClose,
  activities,
  onAddRecurringExpense,
}) => {
  const [nom, setNom] = useState('');
  const [nature, setNature] = useState<RecurringExpenseNature>('abonnement');
  const [activiteId, setActiviteId] = useState<string>('');
  const [montant, setMontant] = useState<string>('');
  const [devise, setDevise] = useState<string>(() => getAppCurrency());
  const [frequence, setFrequence] = useState<'mensuelle' | 'trimestrielle' | 'annuelle'>('mensuelle');
  const [datePremierPaiement, setDatePremierPaiement] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dateFin, setDateFin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numMontant = parseFloat(montant) || 0;
  const convertedUSD = convertToUSD(numMontant, devise);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nom.trim()) {
      setErrorMsg('Veuillez entrer un nom pour cette charge.');
      return;
    }

    if (isNaN(numMontant) || numMontant <= 0) {
      setErrorMsg('Veuillez entrer un montant valide supérieur à 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddRecurringExpense({
        nom: nom.trim(),
        nature,
        activite_id: activiteId || undefined,
        montant_original: numMontant,
        devise_origine: devise,
        frequence,
        date_premier_paiement: datePremierPaiement,
        date_fin: dateFin || undefined,
        statut: 'actif',
      });
      onClose();
      // Reset
      setNom('');
      setMontant('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajouter une Charge Récurrente"
      subtitle="Abonnement logiciel, loyer, salaire, télécom ou charge fixe"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Nom & Nature */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Nom de la charge *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Adobe Creative Cloud, Figma Pro, Loyer"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#A87FE8]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Nature de la charge *
            </label>
            <select
              value={nature}
              onChange={(e) => setNature(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8]"
            >
              <option value="abonnement" className="bg-[#140F26]">
                Abonnement Logiciel
              </option>
              <option value="loyer" className="bg-[#140F26]">
                Loyer Studio / Bureau
              </option>
              <option value="salaire" className="bg-[#140F26]">
                Salaire / Prestation Fixe
              </option>
              <option value="telecom" className="bg-[#140F26]">
                Télécom & Connexion Internet
              </option>
              <option value="cotisation" className="bg-[#140F26]">
                Cotisation / Assurance
              </option>
              <option value="autre" className="bg-[#140F26]">
                Autre Charge Fixe
              </option>
            </select>
          </div>
        </div>

        {/* Montant, Devise & Fréquence */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Montant *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="ex: 55"
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white placeholder-white/30 text-sm font-semibold tabular-nums focus:outline-none focus:border-[#A87FE8]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Devise *
            </label>
            <select
              value={devise}
              onChange={(e) => setDevise(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8]"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-[#140F26] text-white">
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Fréquence *
            </label>
            <select
              value={frequence}
              onChange={(e) => setFrequence(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8]"
            >
              <option value="mensuelle" className="bg-[#140F26]">
                Mensuelle
              </option>
              <option value="trimestrielle" className="bg-[#140F26]">
                Trimestrielle
              </option>
              <option value="annuelle" className="bg-[#140F26]">
                Annuelle
              </option>
            </select>
          </div>
        </div>

        {/* Currency preview badge if not USD */}
        {numMontant > 0 && devise !== 'USD' && (
          <div className="px-3.5 py-2 rounded-xl bg-[#6600CC]/15 border border-[#A87FE8]/30 flex items-center justify-between text-xs">
            <span className="text-white/70">Coût converti en USD :</span>
            <span className="font-bold text-[#C9A070] tabular-nums">
              ≈ {formatUSD(convertedUSD, 2)}
            </span>
          </div>
        )}

        {/* Activité liée (Optionnel) */}
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1">
            Activité liée (Optionnel — sinon globale studio)
          </label>
          <select
            value={activiteId}
            onChange={(e) => setActiviteId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8]"
          >
            <option value="" className="bg-[#140F26] text-white/40">
              -- Charge Globale / Frais Studio --
            </option>
            {activities.map((a) => (
              <option key={a.id} value={a.id} className="bg-[#140F26] text-white">
                {a.nom} (Rang {a.rang_actuel})
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Date du premier prélèvement *
            </label>
            <input
              type="date"
              required
              value={datePremierPaiement}
              onChange={(e) => setDatePremierPaiement(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Date de fin (Optionnel)
            </label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8]"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-cta px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#6600CC] to-[#A87FE8] text-white text-xs font-bold shadow-lg shadow-[#6600CC]/30 hover:opacity-95 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Enregistrer la charge</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
