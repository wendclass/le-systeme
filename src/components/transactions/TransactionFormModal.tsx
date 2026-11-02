import React, { useState } from 'react';
import { Activity, Client, Transaction } from '../../types';
import { Modal } from '../common/Modal';
import { REVENUE_CATEGORIES, EXPENSE_CATEGORIES } from '../../lib/constants';
import { SUPPORTED_CURRENCIES, convertToUSD, getAppCurrency } from '../../lib/currency';
import { formatUSD } from '../../lib/utils';
import { Plus, Check, AlertCircle, Sparkles, UserPlus } from 'lucide-react';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  clients: Client[];
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'uid' | 'montant_usd'>) => Promise<Transaction>;
  onAddActivity: (activity: Omit<Activity, 'id' | 'uid' | 'date_creation'>) => Promise<Activity>;
  onAddClient: (client: Omit<Client, 'id' | 'uid' | 'date_creation'>) => Promise<Client>;
  defaultActivityId?: string;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  activities,
  clients,
  onAddTransaction,
  onAddActivity,
  onAddClient,
  defaultActivityId,
}) => {
  const [type, setType] = useState<'revenu' | 'depense'>('revenu');
  const [montant, setMontant] = useState<string>('');
  const [devise, setDevise] = useState<string>(() => getAppCurrency());
  const [activiteId, setActiviteId] = useState<string>(defaultActivityId || activities[0]?.id || '');
  const [clientId, setClientId] = useState<string>('');
  const [categorie, setCategorie] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');

  // Inline activity creation sub-state
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityColor, setNewActivityColor] = useState('#6600CC');

  // Inline client creation sub-state
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-set category when type changes if not selected
  const categoriesList = type === 'revenu' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;

  const numMontant = parseFloat(montant) || 0;
  const convertedUSD = convertToUSD(numMontant, devise);

  const handleCreateInlineActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim()) return;
    try {
      const created = await onAddActivity({
        nom: newActivityName.trim(),
        couleur: newActivityColor,
        icone: 'Sparkles',
        statut: 'active',
        rang_actuel: 'E',
      });
      setActiviteId(created.id);
      setIsCreatingActivity(false);
      setNewActivityName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateInlineClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    try {
      const created = await onAddClient({
        nom: newClientName.trim(),
        entreprise: newClientCompany.trim() || undefined,
        statut: 'actif',
        activite_ids: activiteId ? [activiteId] : [],
      });
      setClientId(created.id);
      setIsCreatingClient(false);
      setNewClientName('');
      setNewClientCompany('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isNaN(numMontant) || numMontant <= 0) {
      setErrorMsg('Veuillez entrer un montant valide supérieur à 0.');
      return;
    }

    if (!activiteId) {
      setErrorMsg('Veuillez sélectionner ou créer une activité économique.');
      return;
    }

    if (!categorie) {
      setErrorMsg('Veuillez choisir une catégorie pour cette transaction.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTransaction({
        type,
        montant_original: numMontant,
        devise_origine: devise,
        activite_id: activiteId,
        client_id: clientId || undefined,
        categorie,
        date,
        note: note.trim() || undefined,
      });
      onClose();
      // Reset form
      setMontant('');
      setNote('');
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors de l\'enregistrement de la transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enregistrer une Transaction"
      subtitle="Chaque revenu nourrit ta progression vers le rang Class S"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Type toggle: Revenu / Dépense */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/5 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setType('revenu');
              setCategorie(REVENUE_CATEGORIES[0]);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              type === 'revenu'
                ? 'bg-gradient-to-r from-[#6600CC] to-[#A87FE8] text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            + Revenu (XP Vers Rang S)
          </button>
          <button
            type="button"
            onClick={() => {
              setType('depense');
              setCategorie(EXPENSE_CATEGORIES[0]);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              type === 'depense'
                ? 'bg-gradient-to-r from-rose-900 to-rose-700 text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            - Dépense
          </button>
        </div>

        {/* Montant & Devise */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
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
              placeholder="ex: 2500"
              className="w-full px-4 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white placeholder-white/30 text-sm font-semibold focus:outline-none focus:border-[#A87FE8] tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Devise *
            </label>
            <select
              value={devise}
              onChange={(e) => setDevise(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm font-semibold focus:outline-none focus:border-[#A87FE8]"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-[#140F26] text-white">
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Currency preview badge if not USD */}
        {numMontant > 0 && devise !== 'USD' && (
          <div className="px-3.5 py-2 rounded-xl bg-[#6600CC]/15 border border-[#A87FE8]/30 flex items-center justify-between text-xs">
            <span className="text-white/70">Conversion enregistrée en USD :</span>
            <span className="font-bold text-[#C9A070] tabular-nums">
              ≈ {formatUSD(convertedUSD, 2)}
            </span>
          </div>
        )}

        {/* Activité Économique (Obligatoire) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-white/80">
              Activité liée *
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingActivity(!isCreatingActivity)}
              className="text-[11px] text-[#A87FE8] hover:text-white font-semibold flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Créer à la volée</span>
            </button>
          </div>

          {isCreatingActivity ? (
            <div className="p-3 rounded-xl bg-white/5 border border-[#A87FE8]/40 space-y-2 mb-2 animate-in fade-in">
              <span className="text-xs font-bold text-white block">Nouvelle activité</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nom de l'activité (ex: Identité Visuelle)"
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#0D0A18] border border-white/20 text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleCreateInlineActivity}
                  className="px-3 py-1.5 rounded-lg bg-[#6600CC] text-white text-xs font-semibold"
                >
                  Ajouter
                </button>
              </div>
            </div>
          ) : (
            <select
              value={activiteId}
              onChange={(e) => setActiviteId(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8]"
            >
              <option value="" disabled className="bg-[#140F26] text-white/40">
                -- Sélectionner une activité --
              </option>
              {activities.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#140F26] text-white">
                  {a.nom} (Rang {a.rang_actuel})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Client Lié (Optionnel) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-white/80">
              Client lié (Optionnel)
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingClient(!isCreatingClient)}
              className="text-[11px] text-[#C9A070] hover:text-white font-semibold flex items-center gap-1"
            >
              <UserPlus className="w-3 h-3" />
              <span>Nouveau client</span>
            </button>
          </div>

          {isCreatingClient ? (
            <div className="p-3 rounded-xl bg-white/5 border border-[#C9A070]/40 space-y-2 mb-2 animate-in fade-in">
              <span className="text-xs font-bold text-white block">Nouveau Client</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nom du client"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#0D0A18] border border-white/20 text-white text-xs"
                />
                <input
                  type="text"
                  placeholder="Entreprise (optionnel)"
                  value={newClientCompany}
                  onChange={(e) => setNewClientCompany(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#0D0A18] border border-white/20 text-white text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateInlineClient}
                className="w-full py-1.5 rounded-lg bg-[#C9A070]/30 hover:bg-[#C9A070]/50 text-[#C9A070] border border-[#C9A070]/50 text-xs font-semibold"
              >
                Valider le client
              </button>
            </div>
          ) : (
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8]"
            >
              <option value="" className="bg-[#140F26] text-white/40">
                -- Aucun client spécifique --
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#140F26] text-white">
                  {c.nom} {c.entreprise ? `(${c.entreprise})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Catégorie & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Catégorie *
            </label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8]"
            >
              <option value="" disabled className="bg-[#140F26] text-white/40">
                -- Choisir une catégorie --
              </option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat} className="bg-[#140F26] text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8]"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1">
            Note / Description (Optionnel)
          </label>
          <input
            type="text"
            placeholder="Détails, numéro de facture, référence..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#A87FE8]"
          />
        </div>

        {/* Submit */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-cta px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#6600CC] to-[#A87FE8] text-white text-xs font-bold shadow-lg shadow-[#6600CC]/30 hover:opacity-95 transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>Enregistrement...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Enregistrer la transaction</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
