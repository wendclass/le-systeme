import React from 'react';
import { CsFacture, CsReglages, CsClient } from '../../types';
import { formatFCFA } from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Printer, X } from 'lucide-react';

interface InvoicePrintPreviewProps {
  facture: CsFacture;
  client: CsClient;
  reglages: CsReglages;
  onClose: () => void;
}

export const InvoicePrintPreview: React.FC<InvoicePrintPreviewProps> = ({
  facture,
  client,
  reglages,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const totalPaye = (facture.paiements || [])
    .filter((p) => !p.annule)
    .reduce((acc, p) => acc + p.montant_fcfa, 0);

  const resteDu = Math.max(0, facture.total_fcfa - totalPaye);
  const isPaid = facture.statut === 'payee' || resteDu === 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex flex-col items-center p-4 sm:p-8 font-body print:p-0 print:bg-white print:static">
      {/* Barre d'actions non imprimable */}
      <div className="w-full max-w-[800px] flex items-center justify-between pb-4 print:hidden text-white">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
            Facture officielle A4, thème clair
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Imprimer / PDF
          </Button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            title="Fermer l’aperçu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Feuille A4 imprimable */}
      <div
        id="facture-print-sheet"
        className="w-full max-w-[800px] bg-white text-[#1A1A1A] rounded-2xl shadow-2xl p-8 sm:p-12 print:p-0 print:shadow-none print:rounded-none print:max-w-none print:w-full space-y-8"
        data-theme="light"
      >
        {/* EN-TÊTE : LOGO + ÉMETTEUR & NUMÉRO DE FACTURE */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-neutral-200">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/brand/logo-violet.png"
                alt="Class S Studio"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <span className="font-serif font-bold text-xl text-[#1A1A1A] tracking-tight block">
                  {reglages.nom || 'Class S Studio'}
                </span>
                <span className="text-[11px] uppercase tracking-widest text-[#6600CC] font-semibold block">
                  Identités visuelles d’exception
                </span>
              </div>
            </div>

            <div className="text-xs text-neutral-500 space-y-0.5 leading-relaxed">
              {reglages.ville && <div>{reglages.ville}</div>}
              {reglages.whatsapp && <div>WhatsApp : {reglages.whatsapp}</div>}
              {reglages.email && <div>Email : {reglages.email}</div>}
              {reglages.ifu && <div>IFU : {reglages.ifu}</div>}
              {reglages.rccm && <div>RCCM : {reglages.rccm}</div>}
            </div>
          </div>

          <div className="text-left sm:text-right space-y-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">
                {facture.type === 'acompte'
                  ? 'Facture d’acompte'
                  : facture.type === 'solde'
                  ? 'Facture de solde'
                  : 'Facture'}
              </span>
              <h1 className="text-2xl font-serif font-bold text-[#1A1A1A] tracking-tight">
                {facture.numero}
              </h1>
            </div>

            <div className="text-xs text-neutral-600 space-y-0.5">
              <div>
                <span className="text-neutral-400">Date d’émission :</span>{' '}
                <span className="font-semibold text-neutral-800">
                  {new Date(facture.date_emission).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Date d’échéance :</span>{' '}
                <span className="font-semibold text-neutral-800">
                  {new Date(facture.echeance).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BLOC DESTINATAIRE (CLIENT) */}
        <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
            Facturé à
          </span>
          <div className="text-base font-bold text-neutral-900">
            {client.nom}
          </div>
          {client.entreprise && (
            <div className="text-xs font-semibold text-[#6600CC]">
              {client.entreprise}
            </div>
          )}
          <div className="text-xs text-neutral-500 pt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            {client.whatsapp && <span>WhatsApp : {client.whatsapp}</span>}
            {client.email && <span>Email : {client.email}</span>}
          </div>
        </div>

        {/* TABLEAU DES LIGNES DE FACTURE */}
        <div className="space-y-3">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1">
            Prestations facturées
          </h2>

          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-100/60 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center w-16">Qté</th>
                <th className="py-2.5 px-3 text-right w-28">Prix unitaire</th>
                <th className="py-2.5 px-3 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(facture.lignes || []).map((ligne, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-3 px-3">
                    <div className="font-bold text-neutral-900">{ligne.libelle}</div>
                    {ligne.description && (
                      <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                        {ligne.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-neutral-700">
                    {ligne.quantite}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-neutral-700 whitespace-nowrap">
                    {formatFCFA(ligne.prix_unitaire_fcfa)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-semibold text-neutral-900 whitespace-nowrap">
                    {formatFCFA(ligne.total_ligne_fcfa)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* RÉCAPITULATIF FINANCIER */}
          <div className="flex justify-end pt-3">
            <div className="w-full sm:w-72 space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-2 border-t-2 border-neutral-900 text-sm font-bold text-neutral-900">
                <span className="font-serif uppercase tracking-wider">Total Facturé :</span>
                <span className="text-base tabular-nums font-serif">
                  {formatFCFA(facture.total_fcfa)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80 space-y-1 text-[11px]">
                <div className="flex justify-between text-neutral-600">
                  <span>Total encaissé :</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">
                    {formatFCFA(totalPaye)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-900 font-bold pt-1 border-t border-neutral-200/60">
                  <span>Reste à régler :</span>
                  <span className="tabular-nums">
                    {formatFCFA(resteDu)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COORDONNÉES DE PAIEMENT */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1">
            Coordonnées de règlement
          </h2>
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs font-mono text-neutral-700 whitespace-pre-line leading-relaxed">
            {reglages.coordonnees_paiement || 'Mobile Money ou virement bancaire.'}
          </div>
        </div>

        {/* REÇUS DE PAIEMENTS RATTACHÉS */}
        {facture.paiements && facture.paiements.length > 0 && (
          <div className="space-y-2 pt-2">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1">
              Paiements reçus & Reçus officiels
            </h2>
            <div className="space-y-1.5 text-xs">
              {facture.paiements.map((p, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    p.annule
                      ? 'bg-neutral-100 text-neutral-400 line-through border-neutral-200'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div>
                    <span className="font-bold">{p.numero_recu}</span>
                    <span className="ml-2 text-neutral-500">
                      • Reçu le {new Date(p.date_reception).toLocaleDateString('fr-FR')} via {p.moyen}
                    </span>
                    {p.reference && (
                      <span className="ml-1 text-neutral-400">({p.reference})</span>
                    )}
                    {p.annule && (
                      <span className="ml-2 text-rose-600 font-bold no-underline">
                        (Annulé : {p.motif_annulation})
                      </span>
                    )}
                  </div>
                  <span className="font-bold tabular-nums">
                    {formatFCFA(p.montant_fcfa)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PIED DE FACTURE */}
        <div className="pt-6 border-t border-neutral-200 flex justify-between items-center text-xs text-neutral-500">
          <div>
            Scott Nana • Class S Studio • Ouagadougou
          </div>
          <div className="font-serif italic text-neutral-400">
            Merci pour votre confiance.
          </div>
        </div>
      </div>
    </div>
  );
};
