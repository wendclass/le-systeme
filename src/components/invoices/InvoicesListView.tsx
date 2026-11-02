import React, { useState, useEffect } from 'react';
import { CsFacture, CsFactureStatut, CsReglages, CsClient } from '../../types';
import {
  getFacturesList,
  markFactureSent,
  getReglages,
  cancelPaiement,
  formatFCFA,
} from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatutPill } from '../ui/StatutPill';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { InvoiceBuilderModal } from './InvoiceBuilderModal';
import { PaymentModal } from './PaymentModal';
import { InvoicePrintPreview } from './InvoicePrintPreview';
import {
  Receipt,
  Plus,
  Search,
  ArrowUpDown,
  CreditCard,
  Printer,
  Send,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  ChevronRight,
} from 'lucide-react';

export const InvoicesListView: React.FC = () => {
  const { showToast } = useToast();
  const [factures, setFactures] = useState<CsFacture[]>([]);
  const [loading, setLoading] = useState(true);
  const [reglages, setReglages] = useState<CsReglages | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('Tous');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [paymentFacture, setPaymentFacture] = useState<CsFacture | null>(null);
  const [previewFacture, setPreviewFacture] = useState<CsFacture | null>(null);

  // Modal d'annulation de paiement
  const [cancelModalData, setCancelModalData] = useState<{
    factureId: string;
    paiementId: string;
    montant: number;
    recu: string;
  } | null>(null);
  const [cancelMotif, setCancelMotif] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, reg] = await Promise.all([
        getFacturesList(),
        getReglages(),
      ]);
      setFactures(list);
      setReglages(reg);
    } catch {
      showToast('Impossible de charger les factures.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkSent = async (factureId: string) => {
    try {
      const updated = await markFactureSent(factureId);
      setFactures((prev) =>
        prev.map((f) => (f.id === factureId ? updated : f))
      );
      showToast(`Facture ${updated.numero} marquée comme envoyée.`, 'success');
    } catch {
      showToast('Erreur lors de la mise à jour de la facture.', 'error');
    }
  };

  const handleConfirmCancelPaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalData) return;
    if (!cancelMotif.trim()) {
      showToast('Le motif d’annulation est obligatoire.', 'warning');
      return;
    }

    setCancelling(true);
    try {
      const updated = await cancelPaiement(
        cancelModalData.paiementId,
        cancelModalData.factureId,
        cancelMotif.trim()
      );
      setFactures((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f))
      );
      showToast('Paiement annulé et retiré des totaux.', 'info');
      setCancelModalData(null);
      setCancelMotif('');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l’annulation.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const filteredFactures = factures
    .filter((f) => {
      const matchStatut =
        selectedStatut === 'Tous' || f.statut === selectedStatut;
      const numero = f.numero.toLowerCase();
      const clientNom = f.dossier?.client?.nom?.toLowerCase() || '';
      const entreprise = f.dossier?.client?.entreprise?.toLowerCase() || '';
      const search = searchQuery.toLowerCase();
      return (
        matchStatut &&
        (numero.includes(search) ||
          clientNom.includes(search) ||
          entreprise.includes(search))
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.date_emission).getTime();
      const dateB = new Date(b.date_emission).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6600CC] ring-4 ring-[#6600CC]/20" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#A87FE8]">
              Facturation & Règlements
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Factures Class S
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Factures d’acompte, de solde et reçus de paiement officiels validés par Scott.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouvelle facture
          </Button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filtres de statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {[
            'Tous',
            'brouillon',
            'envoyee',
            'partielle',
            'payee',
            'annulee',
          ].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatut(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatut === st
                  ? 'bg-[#A87FE8]/20 text-[#A87FE8] border border-[#A87FE8]/40'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              {st === 'envoyee' ? 'Envoyée' : st === 'partielle' ? 'Partielle' : st === 'payee' ? 'Payée' : st === 'annulee' ? 'Annulée' : st === 'brouillon' ? 'Brouillon' : 'Toutes'}
            </button>
          ))}
        </div>

        {/* Recherche et tri */}
        <div className="flex items-center gap-2">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Numéro ou client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-white/40" />}
            />
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title={sortOrder === 'desc' ? 'Plus récentes en premier' : 'Plus anciennes en premier'}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Liste des factures */}
      {loading ? (
        <div className="p-12 text-center text-white/40 text-sm">
          Chargement des factures...
        </div>
      ) : filteredFactures.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8" />}
          title="Aucune facture trouvée"
          description={
            factures.length === 0
              ? 'Aucune facture n’a encore été émise. Vous pouvez créer votre première facture d’acompte à partir d’un devis accepté.'
              : 'Aucune facture ne correspond aux critères de filtre.'
          }
          actionLabel="Créer une facture"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <>
          {/* Mobile (Cartes) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredFactures.map((fac) => {
              const clientNom = fac.dossier?.client?.nom || 'Client';
              const entreprise = fac.dossier?.client?.entreprise;
              const dateStr = new Date(fac.date_emission).toLocaleDateString(
                'fr-FR',
                { day: '2-digit', month: 'short', year: 'numeric' }
              );

              const totalPaye = (fac.paiements || [])
                .filter((p) => !p.annule)
                .reduce((acc, p) => acc + p.montant_fcfa, 0);
              const resteDu = Math.max(0, fac.total_fcfa - totalPaye);

              return (
                <div
                  key={fac.id}
                  className="p-4 rounded-2xl bg-[#16112A]/60 border border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">
                          {fac.numero}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/5 text-white/60">
                          {fac.type}
                        </span>
                      </div>
                      <p className="text-xs text-white/70 font-medium mt-0.5">
                        {clientNom} {entreprise && `(${entreprise})`}
                      </p>
                    </div>
                    <StatutPill statut={fac.statut} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-white/60 pt-2 border-t border-white/5">
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase">
                        Total Facturé
                      </span>
                      <span className="font-bold text-white tabular-nums">
                        {formatFCFA(fac.total_fcfa)}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase">
                        Reste dû
                      </span>
                      <span className={`font-bold tabular-nums ${resteDu > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {formatFCFA(resteDu)}
                      </span>
                    </div>
                  </div>

                  {/* Actions mobile */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewFacture(fac)}
                      leftIcon={<Printer className="w-3.5 h-3.5" />}
                    >
                      Aperçu
                    </Button>

                    {resteDu > 0 && fac.statut !== 'annulee' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setPaymentFacture(fac)}
                        leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                      >
                        Encaisser
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop (Tableau) */}
          <div className="hidden md:block rounded-2xl border border-white/10 bg-[#16112A]/40 backdrop-blur-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-white/50">
                <tr>
                  <th className="py-3.5 px-4">Numéro</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Émission</th>
                  <th className="py-3.5 px-4">Échéance</th>
                  <th className="py-3.5 px-4 text-right">Total FCFA</th>
                  <th className="py-3.5 px-4 text-right">Reste dû</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredFactures.map((fac) => {
                  const clientNom = fac.dossier?.client?.nom || 'Client';
                  const entreprise = fac.dossier?.client?.entreprise;
                  const dateEmission = new Date(fac.date_emission).toLocaleDateString('fr-FR');
                  const dateEcheance = new Date(fac.echeance).toLocaleDateString('fr-FR');

                  const totalPaye = (fac.paiements || [])
                    .filter((p) => !p.annule)
                    .reduce((acc, p) => acc + p.montant_fcfa, 0);
                  const resteDu = Math.max(0, fac.total_fcfa - totalPaye);

                  return (
                    <tr
                      key={fac.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-4 px-4 font-semibold text-white">
                        {fac.numero}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-[11px] font-semibold text-[#A87FE8] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#6600CC]/20 border border-[#6600CC]/30">
                          {fac.type === 'acompte' ? 'Acompte' : fac.type === 'solde' ? 'Solde' : 'Complète'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-white">{clientNom}</div>
                        {entreprise && (
                          <div className="text-xs text-white/50">{entreprise}</div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <StatutPill statut={fac.statut} size="sm" />
                      </td>
                      <td className="py-4 px-4 text-white/60 tabular-nums">
                        {dateEmission}
                      </td>
                      <td className="py-4 px-4 text-white/60 tabular-nums">
                        {dateEcheance}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-white tabular-nums">
                        {formatFCFA(fac.total_fcfa)}
                      </td>
                      <td className={`py-4 px-4 text-right font-bold tabular-nums ${resteDu > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {formatFCFA(resteDu)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {fac.statut === 'brouillon' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkSent(fac.id)}
                              title="Marquer envoyée (visible du client)"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewFacture(fac)}
                            title="Aperçu officiel A4 / Imprimer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>

                          {resteDu > 0 && fac.statut !== 'annulee' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPaymentFacture(fac)}
                              leftIcon={<CreditCard className="w-3.5 h-3.5 text-emerald-400" />}
                            >
                              Encaisser
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Créer une Facture */}
      <InvoiceBuilderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onInvoiceCreated={() => loadData()}
      />

      {/* Modal Enregistrer Paiement */}
      <PaymentModal
        isOpen={!!paymentFacture}
        onClose={() => setPaymentFacture(null)}
        facture={paymentFacture}
        onPaymentRecorded={() => loadData()}
      />

      {/* Aperçu Officiel Imprimable A4 */}
      {previewFacture && (
        <InvoicePrintPreview
          facture={previewFacture}
          client={
            previewFacture.dossier?.client || {
              id: 'cli_anon',
              nom: 'Client',
              whatsapp: '',
              created_at: '',
              updated_at: '',
            }
          }
          reglages={reglages || {
            id: 'class_s',
            created_at: '',
            updated_at: '',
            prefixe_devis: 'DEV',
            prefixe_facture: 'FAC',
            compteur_devis: 1,
            compteur_facture: 1,
            pourcentage_acompte: 50,
            validite_devis_jours: 15,
            revisions_incluses: 3,
            moyens_paiement: [],
            etapes_base: [],
            modeles_whatsapp: {},
          }}
          onClose={() => setPreviewFacture(null)}
        />
      )}

      {/* Modal Annulation Paiement */}
      <Modal
        isOpen={!!cancelModalData}
        onClose={() => setCancelModalData(null)}
        title="Annuler un versement"
        description="L’annulation d’un paiement exige un motif obligatoire. L’opération est journalisée et le paiement est retiré des totaux."
        size="md"
      >
        <form onSubmit={handleConfirmCancelPaiement} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
            <span className="font-bold block">Reçu {cancelModalData?.recu}</span>
            <span>Montant : {formatFCFA(cancelModalData?.montant)}</span>
          </div>

          <Textarea
            label="Motif d’annulation obligatoire *"
            placeholder="Ex : Erreur de saisie de compte, chèque rejeté, virement non parvenu..."
            rows={3}
            value={cancelMotif}
            onChange={(e) => setCancelMotif(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelModalData(null)}
            >
              Fermer
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={cancelling}
            >
              Confirmer l’annulation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
