import React, { useState, useEffect } from 'react';
import { CsMouvement, CsCategorie, CsClient } from '../../types';
import { recordMouvement, updateMouvement, formatFCFA } from '../../lib/classSStore';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface MouvementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (mouvement: CsMouvement) => void;
  categories: CsCategorie[];
  clients: CsClient[];
  initialMouvement?: CsMouvement | null;
}

export const MouvementModal: React.FC<MouvementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  clients,
  initialMouvement,
}) => {
  const isEditing = Boolean(initialMouvement);

  const [type, setType] = useState<'entree' | 'sortie'>('sortie');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [libelle, setLibelle] = useState('');
  const [montantFcfa, setMontantFcfa] = useState<number | ''>('');
  const [categorieId, setCategorieId] = useState('');
  const [clientId, setClientId] = useState('');
  const [moyen, setMoyen] = useState('Mobile Money');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMouvement) {
      setType(initialMouvement.type);
      setDate(initialMouvement.date);
      setLibelle(initialMouvement.libelle);
      setMontantFcfa(initialMouvement.montant_fcfa);
      setCategorieId(initialMouvement.categorie_id || '');
      setClientId(initialMouvement.client_id || '');
      setMoyen(initialMouvement.moyen || 'Mobile Money');
      setReference(initialMouvement.reference || '');
      setNote(initialMouvement.note || '');
    } else {
      setType('sortie');
      setDate(new Date().toISOString().split('T')[0]);
      setLibelle('');
      setMontantFcfa('');
      setCategorieId('');
      setClientId('');
      setMoyen('Mobile Money');
      setReference('');
      setNote('');
    }
    setError(null);
  }, [initialMouvement, isOpen]);

  // Filtrer les catégories selon le type choisi
  const filteredCategories = categories.filter(
    (c) => c.type === 'mixte' || c.type === type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libelle.trim()) {
      setError('Veuillez renseigner un libellé pour l’opération.');
      return;
    }
    const montant = Number(montantFcfa);
    if (!montant || montant <= 0) {
      setError('Veuillez saisir un montant supérieur à 0 FCFA.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && initialMouvement) {
        const updated = await updateMouvement(initialMouvement.id, {
          type,
          date,
          libelle: libelle.trim(),
          montant_fcfa: Math.round(montant),
          categorie_id: categorieId || null,
          client_id: clientId || null,
          moyen,
          reference: reference.trim() || null,
          note: note.trim() || null,
        });
        onSuccess(updated);
      } else {
        const created = await recordMouvement({
          type,
          date,
          libelle: libelle.trim(),
          montant_fcfa: Math.round(montant),
          categorie_id: categorieId || null,
          client_id: clientId || null,
          dossier_id: null,
          moyen,
          reference: reference.trim() || null,
          note: note.trim() || null,
        });
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l’enregistrement de l’opération.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Modifier l’opération' : 'Nouvelle opération manuelle'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5 font-body">
        {error && (
          <div className="p-3 rounded-xl bg-[#E8546B]/15 border border-[#E8546B]/30 text-[#E8546B] text-sm">
            {error}
          </div>
        )}

        {/* Sélecteur de type : Entrée vs Sortie */}
        <div>
          <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">
            Nature du flux
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('sortie')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                type === 'sortie'
                  ? 'bg-[#E8546B]/20 border-[#E8546B] text-[#E8546B]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Dépense (Sortie)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('entree')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                type === 'entree'
                  ? 'bg-[#2FA77A]/20 border-[#2FA77A] text-[#2FA77A]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Recette (Entrée)</span>
            </button>
          </div>
        </div>

        {/* Date et Montant */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Date de l’opération"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <div>
            <Input
              label="Montant (FCFA)"
              type="number"
              min="1"
              step="1"
              value={montantFcfa}
              onChange={(e) =>
                setMontantFcfa(e.target.value === '' ? '' : Math.round(Number(e.target.value)))
              }
              placeholder="Ex : 25000"
              required
            />
            {montantFcfa !== '' && Number(montantFcfa) > 0 && (
              <p className="mt-1 text-xs text-[#A87FE8]">
                {formatFCFA(Number(montantFcfa))}
              </p>
            )}
          </div>
        </div>

        {/* Libellé */}
        <Input
          label="Libellé de l’opération"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          placeholder="Ex : Abonnement Adobe Creative Cloud, Impression cartes..."
          required
        />

        {/* Catégorie et Moyen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1 uppercase tracking-wider">
              Catégorie
            </label>
            <select
              value={categorieId}
              onChange={(e) => setCategorieId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#6600CC]"
            >
              <option value="" className="bg-[#0D0A18] text-white">
                Non catégorisé
              </option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0D0A18] text-white">
                  {c.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1 uppercase tracking-wider">
              Moyen de règlement
            </label>
            <select
              value={moyen}
              onChange={(e) => setMoyen(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#6600CC]"
            >
              <option value="Mobile Money" className="bg-[#0D0A18] text-white">
                Mobile Money (Orange, Moov)
              </option>
              <option value="Virement bancaire" className="bg-[#0D0A18] text-white">
                Virement bancaire
              </option>
              <option value="Espèces" className="bg-[#0D0A18] text-white">
                Espèces
              </option>
              <option value="Carte bancaire" className="bg-[#0D0A18] text-white">
                Carte bancaire
              </option>
              <option value="Autre" className="bg-[#0D0A18] text-white">
                Autre
              </option>
            </select>
          </div>
        </div>

        {/* Client (facultatif) et Référence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1 uppercase tracking-wider">
              Client associé (facultatif)
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#6600CC]"
            >
              <option value="" className="bg-[#0D0A18] text-white">
                Aucun client associé
              </option>
              {clients.map((cli) => (
                <option key={cli.id} value={cli.id} className="bg-[#0D0A18] text-white">
                  {cli.entreprise ? `${cli.entreprise} (${cli.nom})` : cli.nom}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Référence (facultative)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ex : Facture N° 8492, N° Transaction..."
          />
        </div>

        {/* Note libre */}
        <Textarea
          label="Note ou précisions (facultatif)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Détails internes ou observations..."
          rows={2}
        />

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            className={type === 'entree' ? 'bg-[#2FA77A] hover:bg-[#2FA77A]/90' : 'bg-[#6600CC] hover:bg-[#6600CC]/90'}
            loading={loading}
          >
            {isEditing ? 'Enregistrer les modifications' : 'Ajouter au livre de compte'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
