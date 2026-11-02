import React from 'react';
import {
  CsLivreDeCompteRow,
  CsReglages,
  LivreMonthlyBar,
  LivreRecapCategorie,
  LivreRecapClient,
} from '../../types';
import { formatFCFA } from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Printer, X } from 'lucide-react';

interface LivrePrintPreviewProps {
  dateDebut: string;
  dateFin: string;
  rows: CsLivreDeCompteRow[];
  synthesis: {
    totalEncaissements: number;
    totalDepenses: number;
    soldeNet: number;
    nbOperations: number;
  };
  monthlyBars: LivreMonthlyBar[];
  recapCategories: LivreRecapCategorie[];
  recapClients: LivreRecapClient[];
  reglages: CsReglages | null;
  onClose: () => void;
}

export const LivrePrintPreview: React.FC<LivrePrintPreviewProps> = ({
  dateDebut,
  dateFin,
  rows,
  synthesis,
  monthlyBars,
  recapCategories,
  recapClients,
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      {/* Conteneur principal A4 */}
      <div className="bg-white text-[#0D0A18] w-full max-w-4xl min-h-[1100px] rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none flex flex-col justify-between font-sans">
        {/* Barre d'actions écran (masquée à l'impression) */}
        <div className="bg-[#0D0A18] text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-wide">
              Aperçu avant impression • Synthèse de gestion
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

        {/* Corps de la page A4 (thème clair) */}
        <div className="p-8 sm:p-12 space-y-8 flex-1">
          {/* En-tête de la marque */}
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
                {reglages?.ifu && <p>IFU : {reglages.ifu}</p>}
                {reglages?.rccm && <p>RCCM : {reglages.rccm}</p>}
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#F8F5FF] text-[#6600CC] border border-[#6600CC]/20">
                LIVRE DE COMPTE
              </span>
              <p className="text-xs text-gray-500 pt-1">Édité le {exportDate}</p>
              <p className="text-sm font-semibold text-[#0D0A18]">
                Période : {dateDebut} au {dateFin}
              </p>
            </div>
          </div>

          {/* Titre officiel Cormorant Garamond */}
          <div>
            <h1
              className="text-3xl sm:text-4xl font-normal text-[#0D0A18] tracking-tight"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
            >
              Livre de compte • Synthèse de gestion
            </h1>
            <p className="text-xs text-gray-600 mt-1">
              Rapport financier consolidé des flux de trésorerie du studio Class S.
            </p>
          </div>

          {/* Cartes de synthèse chiffrée */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Total Encaissements
              </span>
              <span className="text-lg font-bold text-[#2FA77A] mt-1 block tabular-nums">
                {formatFCFA(synthesis.totalEncaissements)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Total Dépenses
              </span>
              <span className="text-lg font-bold text-[#E8546B] mt-1 block tabular-nums">
                {formatFCFA(synthesis.totalDepenses)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Solde Net
              </span>
              <span
                className={`text-lg font-bold mt-1 block tabular-nums ${
                  synthesis.soldeNet >= 0 ? 'text-[#6600CC]' : 'text-[#E8546B]'
                }`}
              >
                {formatFCFA(synthesis.soldeNet)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Opérations
              </span>
              <span className="text-lg font-bold text-[#0D0A18] mt-1 block tabular-nums">
                {synthesis.nbOperations}
              </span>
            </div>
          </div>

          {/* Répartition par catégorie */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0D0A18] mb-3 pb-1 border-b border-gray-200">
              1. Répartition par catégorie
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-2 font-semibold">Catégorie</th>
                    <th className="py-2 text-right font-semibold">Entrées (FCFA)</th>
                    <th className="py-2 text-right font-semibold">Sorties (FCFA)</th>
                    <th className="py-2 text-right font-semibold">Solde Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recapCategories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-gray-400">
                        Aucun flux sur cette période.
                      </td>
                    </tr>
                  ) : (
                    recapCategories.map((c) => (
                      <tr key={c.categorie_id} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-800">{c.nom}</td>
                        <td className="py-2.5 text-right tabular-nums text-[#2FA77A]">
                          {formatFCFA(c.total_entrees_fcfa)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-[#E8546B]">
                          {formatFCFA(c.total_sorties_fcfa)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-gray-900">
                          {formatFCFA(c.net_fcfa)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Répartition par client */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0D0A18] mb-3 pb-1 border-b border-gray-200">
              2. Encaissements par client
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-2 font-semibold">Client</th>
                    <th className="py-2 text-center font-semibold">Nombre de règlements</th>
                    <th className="py-2 text-right font-semibold">Total encaissé</th>
                    <th className="py-2 text-right font-semibold">Part</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recapClients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-gray-400">
                        Aucun encaissement client sur cette période.
                      </td>
                    </tr>
                  ) : (
                    recapClients.map((cl) => (
                      <tr key={cl.client_id} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-800">{cl.nom}</td>
                        <td className="py-2.5 text-center tabular-nums text-gray-600">
                          {cl.nb_operations}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-[#2FA77A]">
                          {formatFCFA(cl.total_encaisse_fcfa)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-gray-500">
                          {cl.pourcentage || 0} %
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Récapitulatif mensuel */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0D0A18] mb-3 pb-1 border-b border-gray-200">
              3. Détail mensuel de la période
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-2 font-semibold">Mois</th>
                    <th className="py-2 text-right font-semibold">Encaissements</th>
                    <th className="py-2 text-right font-semibold">Dépenses</th>
                    <th className="py-2 text-right font-semibold">Solde Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monthlyBars.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-gray-400">
                        Aucune donnée mensuelle.
                      </td>
                    </tr>
                  ) : (
                    monthlyBars.map((m) => (
                      <tr key={m.moisKey} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-800">{m.labelMois}</td>
                        <td className="py-2.5 text-right tabular-nums text-[#2FA77A]">
                          {formatFCFA(m.encaissements)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-[#E8546B]">
                          {formatFCFA(m.depenses)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-gray-900">
                          {formatFCFA(m.soldeNet)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pied de page A4 officiel */}
        <div className="p-8 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-[11px] text-gray-500">
          <div>
            <p className="font-semibold text-gray-700">Document interne Class S (Confidentiel)</p>
            <p>Conforme aux règles de gestion comptable et financière Class S.</p>
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
