import React from 'react';
import { CsClient, CsFacture, CsReglages } from '../../types';
import { formatFCFA } from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Printer, X } from 'lucide-react';

interface ClientRelevePrintPreviewProps {
  client: CsClient;
  factures: CsFacture[];
  dateDebut: string;
  dateFin: string;
  reglages: CsReglages | null;
  onClose: () => void;
}

export const ClientRelevePrintPreview: React.FC<ClientRelevePrintPreviewProps> = ({
  client,
  factures,
  dateDebut,
  dateFin,
  reglages,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const exportDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Factures du client
  const clientFactures = factures.filter((f) => f.statut !== 'annulee');

  // Paiements validés reçus pour ce client
  const paiementsRecus: Array<{
    id: string;
    date: string;
    numero_recu: string;
    factureNumero: string;
    moyen: string;
    reference?: string | null;
    montant: number;
  }> = [];

  let totalFacture = 0;
  let totalRegle = 0;

  clientFactures.forEach((f) => {
    totalFacture += f.total_fcfa;
    (f.paiements || []).forEach((p) => {
      if (!p.annule) {
        totalRegle += p.montant_fcfa;
        paiementsRecus.push({
          id: p.id,
          date: p.date_reception,
          numero_recu: p.numero_recu,
          factureNumero: f.numero,
          moyen: p.moyen,
          reference: p.reference,
          montant: p.montant_fcfa,
        });
      }
    });
  });

  // Trier les paiements par date
  paiementsRecus.sort((a, b) => a.date.localeCompare(b.date));

  const resteDu = Math.max(0, totalFacture - totalRegle);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      {/* Conteneur principal A4 */}
      <div className="bg-white text-[#0D0A18] w-full max-w-4xl min-h-[1050px] rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none flex flex-col justify-between font-sans">
        {/* Barre d'actions écran (masquée à l'impression) */}
        <div className="bg-[#0D0A18] text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-wide">
              Aperçu avant impression • Relevé de paiements client
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-[#6600CC] text-white border-none hover:bg-[#6600CC]/90"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Imprimer / Enregistrer en PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Corps du relevé (thème clair) */}
        <div className="p-8 sm:p-12 space-y-8 flex-1">
          {/* En-tête officiel Class S */}
          <div className="flex items-start justify-between border-b border-gray-200 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src="/brand/favicon-32x32.png"
                  alt="Logo Class S"
                  className="w-10 h-10 rounded-xl object-contain p-1 bg-[#F8F5FF] border border-[#6600CC]/20"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[#0D0A18]">
                    CLASS S
                  </h2>
                  <p className="text-xs uppercase tracking-widest text-[#6600CC] font-semibold">
                    Studio d’identité visuelle
                  </p>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-0.5 pt-1">
                <p>{reglages?.nom || 'Scott Nana'}</p>
                <p>{reglages?.ville || 'Ouagadougou, Burkina Faso'}</p>
                {reglages?.email && <p>{reglages.email}</p>}
                {reglages?.whatsapp && <p>WhatsApp : {reglages.whatsapp}</p>}
                {reglages?.ifu && <p>IFU : {reglages.ifu}</p>}
                {reglages?.rccm && <p>RCCM : {reglages.rccm}</p>}
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#F8F5FF] text-[#6600CC] border border-[#6600CC]/20">
                RELEVÉ DE PAIEMENTS
              </span>
              <p className="text-xs text-gray-500 pt-1">Date d’édition : {exportDate}</p>
              <p className="text-xs text-gray-500">
                Période : {dateDebut} au {dateFin}
              </p>
            </div>
          </div>

          {/* Destinataire (Client) */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Destinataire
              </span>
              <h3 className="text-base font-bold text-[#0D0A18] mt-0.5">
                {client.entreprise || client.nom}
              </h3>
              {client.entreprise && (
                <p className="text-xs text-gray-600">Contact : {client.nom}</p>
              )}
            </div>

            <div className="text-left sm:text-right text-xs text-gray-600 space-y-0.5">
              {client.whatsapp && <p>WhatsApp : {client.whatsapp}</p>}
              {client.email && <p>Email : {client.email}</p>}
            </div>
          </div>

          {/* Titre officiel Cormorant Garamond */}
          <div>
            <h1
              className="text-3xl sm:text-4xl font-normal text-[#0D0A18] tracking-tight"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
            >
              Relevé de paiements
            </h1>
            <p className="text-xs text-gray-600 mt-1">
              État récapitulatif des factures émises et des règlements perçus par le studio.
            </p>
          </div>

          {/* Tableau des factures émises */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0D0A18] mb-3 pb-1 border-b border-gray-200">
              Factures émises
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-2 font-semibold">Numéro</th>
                    <th className="py-2 font-semibold">Date</th>
                    <th className="py-2 font-semibold">Type</th>
                    <th className="py-2 font-semibold">Échéance</th>
                    <th className="py-2 text-right font-semibold">Montant (FCFA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientFactures.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-gray-400">
                        Aucune facture enregistrée pour ce client.
                      </td>
                    </tr>
                  ) : (
                    clientFactures.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50">
                        <td className="py-2.5 font-mono font-medium text-gray-900">
                          {f.numero}
                        </td>
                        <td className="py-2.5 text-gray-600">{f.date_emission}</td>
                        <td className="py-2.5 text-gray-700 capitalize">
                          {f.type === 'acompte'
                            ? 'Acompte'
                            : f.type === 'solde'
                            ? 'Solde'
                            : 'Complète'}
                        </td>
                        <td className="py-2.5 text-gray-600">{f.echeance || '—'}</td>
                        <td className="py-2.5 text-right font-semibold tabular-nums text-gray-900">
                          {formatFCFA(f.total_fcfa)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tableau des règlements reçus */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0D0A18] mb-3 pb-1 border-b border-gray-200">
              Règlements reçus et validés
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-2 font-semibold">Numéro de reçu</th>
                    <th className="py-2 font-semibold">Date</th>
                    <th className="py-2 font-semibold">Facture associée</th>
                    <th className="py-2 font-semibold">Moyen & Réf</th>
                    <th className="py-2 text-right font-semibold">Montant perçu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paiementsRecus.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-gray-400">
                        Aucun paiement validé sur cette période.
                      </td>
                    </tr>
                  ) : (
                    paiementsRecus.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-2.5 font-mono font-medium text-[#6600CC]">
                          {p.numero_recu}
                        </td>
                        <td className="py-2.5 text-gray-600">{p.date}</td>
                        <td className="py-2.5 font-mono text-gray-700">{p.factureNumero}</td>
                        <td className="py-2.5 text-gray-600">
                          {p.moyen} {p.reference ? `(${p.reference})` : ''}
                        </td>
                        <td className="py-2.5 text-right font-semibold tabular-nums text-[#2FA77A]">
                          {formatFCFA(p.montant)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Récapitulatif et Reste dû */}
          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-gray-600">
                <span>Total facturé :</span>
                <span className="font-semibold tabular-nums text-gray-900">
                  {formatFCFA(totalFacture)}
                </span>
              </div>
              <div className="flex justify-between py-1 text-gray-600">
                <span>Total règlements validés :</span>
                <span className="font-semibold tabular-nums text-[#2FA77A]">
                  {formatFCFA(totalRegle)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-[#0D0A18] text-sm font-bold">
                <span className="text-[#0D0A18]">Reste dû :</span>
                <span
                  className={`tabular-nums ${
                    resteDu > 0 ? 'text-[#E8546B]' : 'text-[#2FA77A]'
                  }`}
                >
                  {formatFCFA(resteDu)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de page A4 officiel */}
        <div className="p-8 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-[11px] text-gray-500">
          <div>
            <p className="font-semibold text-gray-700">Studio Class S</p>
            <p>Ce document certifie les encaissements perçus pour ce client.</p>
          </div>
          <div className="text-right">
            <p>lesysteme.wendclass.com</p>
            <p>Page 1 / 1</p>
          </div>
        </div>
      </div>
    </div>
  );
};
