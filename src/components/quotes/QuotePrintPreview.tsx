import React from 'react';
import { CsDevis, CsReglages, CsClient } from '../../types';
import { formatFCFA } from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Printer, X, Download } from 'lucide-react';

interface QuotePrintPreviewProps {
  devis: CsDevis;
  client: CsClient;
  reglages: CsReglages;
  onClose: () => void;
}

export const QuotePrintPreview: React.FC<QuotePrintPreviewProps> = ({
  devis,
  client,
  reglages,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const acomptePct = devis.modalites?.pourcentage_acompte ?? reglages.pourcentage_acompte ?? 50;
  const montantAcompte = Math.round((devis.total_fcfa * acomptePct) / 100);
  const montantSolde = Math.max(0, devis.total_fcfa - montantAcompte);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex flex-col items-center p-4 sm:p-8 font-body print:p-0 print:bg-white print:static">
      {/* Barre d'actions non imprimable */}
      <div className="w-full max-w-[800px] flex items-center justify-between pb-4 print:hidden text-white">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
            Aperçu officiel A4, thème clair
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
        id="devis-print-sheet"
        className="w-full max-w-[800px] bg-white text-[#1A1A1A] rounded-2xl shadow-2xl p-8 sm:p-12 print:p-0 print:shadow-none print:rounded-none print:max-w-none print:w-full space-y-8"
        data-theme="light"
      >
        {/* EN-TÊTE : LOGO + ÉMETTEUR & NUMÉRO DE DEVIS */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-neutral-200">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/brand/logo-violet.png"
                alt="Class S Studio"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  // Fallback si l'image est indisponible
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
                Proposition commerciale
              </span>
              <h1 className="text-2xl font-serif font-bold text-[#1A1A1A] tracking-tight">
                {devis.numero}
              </h1>
            </div>

            <div className="text-xs text-neutral-600 space-y-0.5">
              <div>
                <span className="text-neutral-400">Date d’émission :</span>{' '}
                <span className="font-semibold text-neutral-800">
                  {new Date(devis.date_emission).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Date de validité :</span>{' '}
                <span className="font-semibold text-neutral-800">
                  {new Date(devis.date_validite).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BLOC DESTINATAIRE (CLIENT) */}
        <div className="p-5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
            Destinataire
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

        {/* ÉLÉMENTS DE CONCEPTION */}
        {devis.conception?.resume && (
          <div className="space-y-3">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1">
              Cadrage & Conception
            </h2>
            <div className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line">
              {devis.conception.resume}
            </div>

            {devis.conception.univers && (
              <div className="text-xs text-neutral-600 italic pt-1">
                <strong className="not-italic text-neutral-800">Univers & références :</strong>{' '}
                {devis.conception.univers}
              </div>
            )}

            {devis.conception.livrables && devis.conception.livrables.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-neutral-800 block mb-1">
                  Livrables prévus :
                </span>
                <ul className="list-disc list-inside text-xs text-neutral-600 space-y-0.5">
                  {devis.conception.livrables.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* TABLEAU DES PRESTATIONS */}
        <div className="space-y-3">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1">
            Prestations & Honoraires
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
              {(devis.lignes || []).map((ligne, idx) => (
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
              {devis.remise_fcfa > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Remise ({devis.remise_libelle || 'Accord commercial'}) :</span>
                  <span className="tabular-nums text-rose-600 font-medium">
                    -{formatFCFA(devis.remise_fcfa)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-t-2 border-neutral-900 text-sm font-bold text-neutral-900">
                <span className="font-serif uppercase tracking-wider">Total Général :</span>
                <span className="text-base tabular-nums font-serif">
                  {formatFCFA(devis.total_fcfa)}
                </span>
              </div>

              {/* Échéancier acompte / solde */}
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80 space-y-1 text-[11px] text-neutral-600">
                <div className="flex justify-between">
                  <span>Acompte de lancement ({acomptePct}%) :</span>
                  <span className="font-bold text-neutral-900 tabular-nums">
                    {formatFCFA(montantAcompte)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Solde à la livraison ({100 - acomptePct}%) :</span>
                  <span className="font-medium text-neutral-700 tabular-nums">
                    {formatFCFA(montantSolde)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODALITÉS DE COLLABORATION */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-1">
            Modalités de collaboration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-700">
            <div>
              <span className="font-bold text-neutral-900 block">Délai de réalisation :</span>
              <p className="mt-0.5">
                {devis.modalites?.delai_livraison ||
                  reglages.delai_livraison ||
                  '10 à 15 jours ouvrés à compter de la réception de l’acompte.'}
              </p>
            </div>

            <div>
              <span className="font-bold text-neutral-900 block">Allers-retours inclus :</span>
              <p className="mt-0.5">
                {devis.modalites?.revisions_incluses ?? reglages.revisions_incluses ?? 3} cycles de retouches inclus.
              </p>
            </div>

            <div className="sm:col-span-2">
              <span className="font-bold text-neutral-900 block">Coordonnées de règlement :</span>
              <p className="mt-0.5 whitespace-pre-line text-neutral-600 font-mono text-[11px] bg-neutral-50 p-2.5 rounded border border-neutral-200/60">
                {devis.modalites?.coordonnees_paiement ||
                  reglages.coordonnees_paiement ||
                  'Mobile Money ou virement bancaire.'}
              </p>
            </div>

            <div className="sm:col-span-2">
              <span className="font-bold text-neutral-900 block">Remise des fichiers finaux :</span>
              <p className="mt-0.5">
                {devis.modalites?.remise_fichiers ||
                  reglages.remise_fichiers ||
                  'Livraison des fichiers vectoriels et formats web une fois le solde validé.'}
              </p>
            </div>

            <div className="sm:col-span-2">
              <span className="font-bold text-neutral-900 block">Droits & Cession :</span>
              <p className="mt-0.5 text-neutral-600">
                {devis.modalites?.droits ||
                  reglages.droits ||
                  'Cession complète des droits patrimoniaux dès acquittement intégral du montant total.'}
              </p>
            </div>
          </div>
        </div>

        {/* BON POUR ACCORD / SIGNATURE */}
        <div className="pt-6 border-t border-neutral-200 grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-12">
            <span className="font-bold text-neutral-900 block">Pour le Studio Class S :</span>
            <div className="text-[11px] text-neutral-400">Scott Nana</div>
          </div>

          <div className="space-y-12 text-right">
            <div>
              <span className="font-bold text-neutral-900 block">Bon pour accord :</span>
              <span className="text-[10px] text-neutral-400">Date et signature précédées de « Bon pour accord »</span>
            </div>
            <div className="text-[11px] text-neutral-400">Signature du client</div>
          </div>
        </div>
      </div>
    </div>
  );
};
