import React, { useState } from 'react';
import {
  CsLivreDeCompteRow,
  LivreRecapCategorie,
  LivreRecapClient,
  CsClient,
  CsFacture,
  CsReglages,
} from '../../types';
import { exportLivreExcel, exportLivreCSV } from '../../lib/exportLivre';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FileSpreadsheet, FileText, UserCheck, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateDebut: string;
  dateFin: string;
  rows: CsLivreDeCompteRow[];
  recapCategories: LivreRecapCategorie[];
  recapClients: LivreRecapClient[];
  clients: CsClient[];
  factures: CsFacture[];
  reglages: CsReglages | null;
  onOpenMySummaryPreview: () => void;
  onOpenClientRelevePreview: (client: CsClient, clientFactures: CsFacture[]) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  dateDebut,
  dateFin,
  rows,
  recapCategories,
  recapClients,
  clients,
  factures,
  reglages,
  onOpenMySummaryPreview,
  onOpenClientRelevePreview,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'moi' | 'comptable' | 'client'>('moi');

  const hasOperations = rows.length > 0;

  // Filtrer les clients qui ont au moins une facture ou une opération
  const availableClients = clients.filter((c) =>
    factures.some((f) => {
      const dossierMatch = f.dossier?.client_id === c.id;
      return dossierMatch;
    }) ||
    rows.some((r) => r.client_id === c.id)
  );

  const handleExportExcel = () => {
    exportLivreExcel({
      dateDebut,
      dateFin,
      rows,
      recapCategories,
      recapClients,
      destinataire: 'Comptable',
    });
    onClose();
  };

  const handleExportCSV = () => {
    exportLivreCSV({
      dateDebut,
      dateFin,
      rows,
      destinataire: 'Comptable',
    });
    onClose();
  };

  const handleOpenClientReleve = () => {
    if (!selectedClientId) return;
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;

    // Récupérer les factures pour ce client
    const clientFactures = factures.filter((f) => f.dossier?.client_id === client.id);
    onOpenClientRelevePreview(client, clientFactures);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exporter le livre de compte"
      size="md"
    >
      <div className="space-y-5 font-body">
        {/* Période active reprise */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
          <div className="flex items-center gap-2 text-white/70">
            <Calendar className="w-4 h-4 text-[#A87FE8]" />
            <span>Période active d’export :</span>
          </div>
          <span className="font-semibold text-white">
            Du {dateDebut} au {dateFin}
          </span>
        </div>

        {!hasOperations && (
          <div className="p-3.5 rounded-xl bg-[#C9A070]/15 border border-[#C9A070]/30 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-[#C9A070] shrink-0 mt-0.5" />
            <p className="text-xs text-[#F8F5FF]">
              Aucune opération enregistrée sur cette période. Les exports sont temporairement
              désactivés. Modifiez la période pour inclure des opérations.
            </p>
          </div>
        )}

        {/* Onglets de destinataire */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('moi')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'moi'
                ? 'bg-[#6600CC] text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Pour moi (Scott)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comptable')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'comptable'
                ? 'bg-[#6600CC] text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Pour le comptable
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('client')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'client'
                ? 'bg-[#6600CC] text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Pour un client
          </button>
        </div>

        {/* 1. Onglet Scott */}
        {activeTab === 'moi' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#6600CC]/10 border border-[#6600CC]/30 space-y-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#A87FE8]" />
                Synthèse de gestion PDF A4
              </h4>
              <p className="text-xs text-white/70 leading-relaxed">
                Document imprimable élégant incluant les totaux généraux, la répartition par
                catégorie de flux, les encaissements par client et le récapitulatif mensuel.
                Aperçu à l’écran avant impression.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                onOpenMySummaryPreview();
                onClose();
              }}
              disabled={!hasOperations}
            >
              Afficher l’aperçu de la synthèse PDF A4
            </Button>
          </div>
        )}

        {/* 2. Onglet Comptable */}
        {activeTab === 'comptable' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2.5 text-xs text-white/70">
              <p className="font-semibold text-white text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#2FA77A]" />
                Fichiers normalisés pour l’expert-comptable
              </p>
              <ul className="list-disc list-inside space-y-1 text-white/80">
                <li>
                  <strong className="text-white">Excel (.xlsx) :</strong> 3 feuilles (Journal,
                  Récap catégories, Récap clients) avec totaux automatiques.
                </li>
                <li>
                  <strong className="text-white">CSV du journal :</strong> UTF-8 avec BOM,
                  séparateur point-virgule (;), dates ISO et montants numériques sans espace.
                </li>
                <li>
                  Les opérations annulées sont conservées pour la piste d’audit et exclues des
                  totaux.
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full justify-center bg-[#2FA77A]/10 border-[#2FA77A]/30 text-[#2FA77A] hover:bg-[#2FA77A]/20"
                onClick={handleExportExcel}
                disabled={!hasOperations}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Fichier Excel (.xlsx)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center border-white/20 text-white hover:bg-white/10"
                onClick={handleExportCSV}
                disabled={!hasOperations}
              >
                <FileText className="w-4 h-4 mr-2" />
                Fichier CSV (.csv)
              </Button>
            </div>
          </div>
        )}

        {/* 3. Onglet Client */}
        {activeTab === 'client' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs text-white/70">
              <div className="flex items-center gap-2 font-semibold text-white text-sm">
                <ShieldCheck className="w-4 h-4 text-[#2FA77A]" />
                Relevé certifié de paiements client
              </div>
              <p className="leading-relaxed">
                Génère un relevé PDF aux couleurs de Class S strictement limité au client
                sélectionné (factures, paiements reçus, solde restant dû).
              </p>
              <p className="text-[11px] text-[#A87FE8]">
                Étanchéité garantie : aucune dépense du studio ni aucune donnée d’autres clients
                n’apparaît sur ce document.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1 uppercase tracking-wider">
                Sélectionner le client
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#6600CC]"
              >
                <option value="" className="bg-[#0D0A18] text-white">
                  Sélectionnez un client...
                </option>
                {(availableClients.length > 0 ? availableClients : clients).map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0D0A18] text-white">
                    {c.entreprise ? `${c.entreprise} (${c.nom})` : c.nom}
                  </option>
                ))}
              </select>
            </div>

            <Button
              className="w-full"
              onClick={handleOpenClientReleve}
              disabled={!selectedClientId}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Générer le relevé du client
            </Button>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-white/10">
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
