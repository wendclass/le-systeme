import * as XLSX from 'xlsx';
import {
  CsLivreDeCompteRow,
  LivreRecapCategorie,
  LivreRecapClient,
} from '../types';

/**
 * Génère le nom de fichier d'export normalisé :
 * ClassS_LivreDeCompte_{début}_{fin}_{destinataire}.{ext}
 */
export function getLivreExportFilename(
  dateDebut: string,
  dateFin: string,
  destinataire: string,
  extension: 'xlsx' | 'csv' | 'pdf'
): string {
  const sanitize = (str: string) =>
    str.replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_');
  const dDebut = sanitize(dateDebut || 'debut');
  const dFin = sanitize(dateFin || 'fin');
  const dest = sanitize(destinataire || 'Comptable');
  return `ClassS_LivreDeCompte_${dDebut}_${dFin}_${dest}.${extension}`;
}

/**
 * Exporte le livre de compte au format Excel multi-feuilles (.xlsx)
 * avec SheetJS (XLSX).
 * Feuilles :
 * 1. Journal (avec ligne de totaux)
 * 2. Récap catégories (avec ligne de total)
 * 3. Récap clients (avec ligne de total)
 */
export function exportLivreExcel(options: {
  dateDebut: string;
  dateFin: string;
  rows: CsLivreDeCompteRow[];
  recapCategories: LivreRecapCategorie[];
  recapClients: LivreRecapClient[];
  destinataire?: string;
}) {
  const { dateDebut, dateFin, rows, recapCategories, recapClients, destinataire = 'Comptable' } = options;
  const wb = XLSX.utils.book_new();

  const exportDate = new Date().toISOString().split('T')[0];

  // ================= 1. FEUILLE JOURNAL =================
  const journalData: any[] = [];

  // En-tête informatif
  journalData.push(['Class S • Studio d’identité visuelle • Livre de compte']);
  journalData.push([`Période du : ${dateDebut} au ${dateFin} • Date d’export : ${exportDate}`]);
  journalData.push([]); // ligne vide

  // Entêtes de colonnes
  const journalHeaders = [
    'Date ISO',
    'Numéro de pièce',
    'Type',
    'Libellé',
    'Client',
    'Projet',
    'Catégorie',
    'Moyen de paiement',
    'Référence',
    'Entrée FCFA',
    'Sortie FCFA',
    'Statut',
  ];
  journalData.push(journalHeaders);

  let totalEntrees = 0;
  let totalSorties = 0;

  rows.forEach((r) => {
    const isEntree = r.type === 'entree';
    const entreeVal = isEntree && !r.annule ? r.montant_fcfa : isEntree ? r.montant_fcfa : 0;
    const sortieVal = !isEntree && !r.annule ? r.montant_fcfa : !isEntree ? r.montant_fcfa : 0;

    if (!r.annule) {
      if (isEntree) totalEntrees += r.montant_fcfa;
      else totalSorties += r.montant_fcfa;
    }

    journalData.push([
      r.date,
      r.numero_piece || '',
      r.type === 'entree' ? 'Entrée' : 'Sortie',
      r.libelle,
      r.client_nom || '',
      r.projet_titre || '',
      r.categorie_nom || '',
      r.moyen,
      r.reference || '',
      isEntree ? entreeVal : '',
      !isEntree ? sortieVal : '',
      r.annule ? `Annulé (${r.motif_annulation || 'Sans motif'})` : 'Validé',
    ]);
  });

  // Ligne de totaux
  journalData.push([]);
  journalData.push([
    'TOTAL (hors opérations annulées)',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalEntrees,
    totalSorties,
    `Solde Net : ${totalEntrees - totalSorties} FCFA`,
  ]);

  const wsJournal = XLSX.utils.aoa_to_sheet(journalData);
  // Largeur des colonnes
  wsJournal['!cols'] = [
    { wch: 12 }, // Date
    { wch: 16 }, // Num pièce
    { wch: 10 }, // Type
    { wch: 35 }, // Libellé
    { wch: 22 }, // Client
    { wch: 22 }, // Projet
    { wch: 24 }, // Catégorie
    { wch: 18 }, // Moyen
    { wch: 16 }, // Référence
    { wch: 15 }, // Entrée FCFA
    { wch: 15 }, // Sortie FCFA
    { wch: 20 }, // Statut
  ];
  XLSX.utils.book_append_sheet(wb, wsJournal, 'Journal');

  // ================= 2. FEUILLE RÉCAP CATÉGORIES =================
  const catData: any[] = [];
  catData.push(['Class S • Récapitulatif par catégorie']);
  catData.push([`Période du : ${dateDebut} au ${dateFin}`]);
  catData.push([]);
  catData.push(['Catégorie', 'Total Entrées FCFA', 'Total Sorties FCFA', 'Solde Net FCFA']);

  let catTotalEntrees = 0;
  let catTotalSorties = 0;

  recapCategories.forEach((c) => {
    catTotalEntrees += c.total_entrees_fcfa;
    catTotalSorties += c.total_sorties_fcfa;
    catData.push([c.nom, c.total_entrees_fcfa, c.total_sorties_fcfa, c.net_fcfa]);
  });

  catData.push([]);
  catData.push([
    'TOTAL GÉNÉRAL',
    catTotalEntrees,
    catTotalSorties,
    catTotalEntrees - catTotalSorties,
  ]);

  const wsCat = XLSX.utils.aoa_to_sheet(catData);
  wsCat['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'Récap catégories');

  // ================= 3. FEUILLE RÉCAP CLIENTS =================
  const clientData: any[] = [];
  clientData.push(['Class S • Récapitulatif par client (Encaissements)']);
  clientData.push([`Période du : ${dateDebut} au ${dateFin}`]);
  clientData.push([]);
  clientData.push(['Client', 'Total Encaissé FCFA', 'Nombre d’opérations']);

  let clientTotalEncaisse = 0;
  let clientTotalOps = 0;

  recapClients.forEach((cl) => {
    clientTotalEncaisse += cl.total_encaisse_fcfa;
    clientTotalOps += cl.nb_operations;
    clientData.push([cl.nom, cl.total_encaisse_fcfa, cl.nb_operations]);
  });

  clientData.push([]);
  clientData.push(['TOTAL ENCAISSÉ', clientTotalEncaisse, clientTotalOps]);

  const wsClient = XLSX.utils.aoa_to_sheet(clientData);
  wsClient['!cols'] = [{ wch: 35 }, { wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsClient, 'Récap clients');

  // Sauvegarde / Téléchargement
  const filename = getLivreExportFilename(dateDebut, dateFin, destinataire, 'xlsx');
  XLSX.writeFile(wb, filename);
}

/**
 * Exporte le journal au format CSV standard :
 * - UTF-8 avec BOM (\uFEFF)
 * - Séparateur point-virgule (;)
 * - Montants numériques purs sans espaces
 * - Dates ISO (YYYY-MM-DD)
 */
export function exportLivreCSV(options: {
  dateDebut: string;
  dateFin: string;
  rows: CsLivreDeCompteRow[];
  destinataire?: string;
}) {
  const { dateDebut, dateFin, rows, destinataire = 'Comptable' } = options;

  const escapeCSV = (str: string | undefined | null): string => {
    if (!str) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headers = [
    'Date ISO',
    'Numero de piece',
    'Type',
    'Libelle',
    'Client',
    'Projet',
    'Categorie',
    'Moyen de paiement',
    'Reference',
    'Entree FCFA',
    'Sortie FCFA',
    'Statut',
  ];

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += `# Class S Livre de compte; Periode: ${dateDebut} au ${dateFin}; Export: ${
    new Date().toISOString().split('T')[0]
  }\n`;
  csvContent += headers.join(';') + '\n';

  let totalEntrees = 0;
  let totalSorties = 0;

  rows.forEach((r) => {
    const isEntree = r.type === 'entree';
    const entreeVal = isEntree ? r.montant_fcfa : 0;
    const sortieVal = !isEntree ? r.montant_fcfa : 0;

    if (!r.annule) {
      if (isEntree) totalEntrees += r.montant_fcfa;
      else totalSorties += r.montant_fcfa;
    }

    const statutText = r.annule
      ? `Annule (${r.motif_annulation || 'Sans motif'})`
      : 'Valide';

    const line = [
      r.date,
      escapeCSV(r.numero_piece || ''),
      isEntree ? 'Entree' : 'Sortie',
      escapeCSV(r.libelle),
      escapeCSV(r.client_nom || ''),
      escapeCSV(r.projet_titre || ''),
      escapeCSV(r.categorie_nom || ''),
      escapeCSV(r.moyen),
      escapeCSV(r.reference || ''),
      isEntree ? entreeVal : '',
      !isEntree ? sortieVal : '',
      escapeCSV(statutText),
    ].join(';');

    csvContent += line + '\n';
  });

  // Ligne de totaux
  csvContent += [
    'TOTAL (hors annulations)',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalEntrees,
    totalSorties,
    `Solde Net: ${totalEntrees - totalSorties}`,
  ].join(';') + '\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getLivreExportFilename(dateDebut, dateFin, destinataire, 'csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
