export type HunterRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface HunterRankDetail {
  rank: HunterRank;
  chrisDoStage: string;
  subtitle: string;
  criteria: string;
  colorClass: string;
  badgeBorder: string;
  badgeBg: string;
  glowColor: string;
}

export interface Client {
  id: string;
  uid: string;
  nom: string;
  entreprise?: string;
  email?: string;
  telephone?: string;
  activite_ids?: string[];
  statut: 'prospect' | 'actif' | 'dormant';
  date_creation: string;
  note?: string;
}

export interface Activity {
  id: string;
  uid: string;
  nom: string;
  couleur: string;
  icone: string;
  date_creation: string;
  statut: 'active' | 'pause' | 'archivee';
  rang_actuel: HunterRank;
}

export interface Transaction {
  id: string;
  uid: string;
  date: string;
  montant_original: number;
  devise_origine: 'USD' | 'XOF' | string;
  montant_usd: number;
  type: 'revenu' | 'depense';
  activite_id: string;
  client_id?: string;
  categorie: string;
  note?: string;
}

export type RecurringExpenseNature =
  | 'abonnement'
  | 'loyer'
  | 'salaire'
  | 'cotisation'
  | 'telecom'
  | 'assurance'
  | 'autre';

export interface RecurringExpense {
  id: string;
  uid: string;
  nom: string;
  nature: RecurringExpenseNature;
  activite_id?: string;
  montant_original: number;
  devise_origine: 'USD' | 'XOF' | string;
  montant_usd: number;
  frequence: 'mensuelle' | 'trimestrielle' | 'annuelle';
  date_premier_paiement: string;
  date_fin?: string;
  statut: 'actif' | 'pause' | 'termine';
}

export interface DailyTask {
  id: string;
  uid: string;
  titre: string;
  activite_id?: string;
  date: string; // YYYY-MM-DD
  est_la_priorite: boolean; // strictly max one per date
  statut: 'a_faire' | 'en_cours' | 'terminee';
  note?: string;
}

export interface ProfitFirstSettings {
  profit: number;     // default 5%
  owner_pay: number;  // default 50%
  tax: number;        // default 15%
  opex: number;       // default 30%
}

export interface UserObjective {
  id: string;
  uid: string;
  montant_cible: number;
  date_cible: string;     // YYYY-MM-DD
  date_creation: string;
  devise_cible?: string;
}

export interface UserSettings {
  uid: string;
  profit_first: ProfitFirstSettings;
  primary_currency?: string; // 'XOF' | 'USD' | 'EUR' | 'GBP' | 'CAD'
  xof_to_usd_rate: number; // default 0.00165 (~606 XOF / USD)
  rate_updated_at: string;
  currency_api_url?: string;
  opex_alert_threshold: number; // default 30%
  showcase_interests: string[]; // ['portal', 'shadows', 'dungeon', 'grimoire']
}

export type SyncState = 'synced' | 'syncing' | 'error' | 'offline';

export type ActivePage =
  | 'status'
  | 'transactions'
  | 'recurring'
  | 'activities'
  | 'daily'
  | 'forecast'
  | 'portal'
  | 'livre'
  | 'shadows'
  | 'dungeon'
  | 'grimoire'
  | 'settings_class_s'
  | 'settings';

// ==============================================================================
// MODÈLE DE DONNÉES CLASS S (S5)
// ==============================================================================

export interface CsClient {
  id: string;
  created_at: string;
  updated_at: string;
  nom: string;
  entreprise?: string | null;
  whatsapp: string;
  email?: string | null;
  lien_social?: string | null;
  notes_internes?: string | null;
}

export type CsDossierStatut =
  | 'Nouvelle'
  | 'Examinée'
  | 'Appel planifié'
  | 'Appel réalisé'
  | 'Devis en préparation'
  | 'Devis envoyé'
  | 'Devis accepté'
  | 'En projet'
  | 'Livré'
  | 'Clos'
  | 'Décliné'
  | 'Sans suite';

export interface CsDossier {
  id: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  soumission_id?: string | null;
  statut: CsDossierStatut;
  decision_examen?: 'poursuivre' | 'decliner' | null;
  motif_interne?: string | null;
  budget_annonce?: string | null;
  acces_client_actif: boolean;
  // Relations jointes optionnelles
  client?: CsClient;
}

export interface CsAppel {
  id: string;
  created_at: string;
  updated_at: string;
  dossier_id: string;
  date_heure: string;
  statut: 'planifie' | 'realise' | 'annule';
  elements_conception?: string | null;
  services_necessaires?: string | null;
  modalites_collaboration?: string | null;
  notes_libres?: string | null;
}

export interface CsService {
  id: string;
  created_at: string;
  updated_at: string;
  categorie: string;
  nom: string;
  description_client?: string | null;
  prix_base_fcfa: number;
  unite: 'forfait' | 'unité' | 'mois' | 'lot' | 'face' | 'type' | string;
  actif: boolean;
  ordre: number;
}

export interface CsReglages {
  id: string;
  created_at: string;
  updated_at: string;
  nom?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  ville?: string | null;
  ifu?: string | null;
  rccm?: string | null;
  prefixe_devis: string;
  prefixe_facture: string;
  compteur_devis: number;
  compteur_facture: number;
  pourcentage_acompte: number;
  validite_devis_jours: number;
  revisions_incluses: number;
  delai_livraison?: string | null;
  moyens_paiement: string[];
  coordonnees_paiement?: string | null;
  remise_fichiers?: string | null;
  droits?: string | null;
  conditions_complementaires?: string | null;
  etapes_base: string[];
  modeles_whatsapp: Record<string, string>;
}

export type CsDevisStatut =
  | 'brouillon'
  | 'pret'
  | 'envoye'
  | 'accepte'
  | 'refuse'
  | 'expire'
  | 'remplace';

export interface CsDevisLigne {
  id: string;
  created_at: string;
  updated_at: string;
  devis_id: string;
  service_id?: string | null;
  libelle: string;
  description?: string | null;
  quantite: number;
  prix_unitaire_fcfa: number;
  total_ligne_fcfa?: number;
  ordre: number;
}

export interface CsDevis {
  id: string;
  created_at: string;
  updated_at: string;
  numero: string;
  dossier_id: string;
  version: number;
  statut: CsDevisStatut;
  date_emission: string;
  date_validite: string;
  conception: Record<string, any>;
  modalites: Record<string, any>;
  ecarts_base: any[];
  remise_fcfa: number;
  remise_libelle?: string | null;
  total_fcfa: number;
  accepte_le?: string | null;
  accepte_par_nom?: string | null;
  accepte_ip?: string | null;
  // Relations jointes optionnelles
  lignes?: CsDevisLigne[];
  dossier?: CsDossier;
}

export type CsFactureType = 'acompte' | 'solde' | 'complete';
export type CsFactureStatut = 'brouillon' | 'envoyee' | 'partielle' | 'payee' | 'annulee';

export interface CsFactureLigne {
  id: string;
  created_at: string;
  updated_at: string;
  facture_id: string;
  service_id?: string | null;
  libelle: string;
  description?: string | null;
  quantite: number;
  prix_unitaire_fcfa: number;
  total_ligne_fcfa?: number;
  ordre: number;
}

export interface CsFacture {
  id: string;
  created_at: string;
  updated_at: string;
  numero: string;
  dossier_id: string;
  devis_id?: string | null;
  type: CsFactureType;
  statut: CsFactureStatut;
  date_emission: string;
  echeance: string;
  total_fcfa: number;
  // Relations jointes optionnelles
  lignes?: CsFactureLigne[];
  paiements?: CsPaiement[];
  dossier?: CsDossier;
  devis?: CsDevis;
}

export interface CsPaiement {
  id: string;
  created_at: string;
  updated_at: string;
  facture_id: string;
  montant_fcfa: number;
  date_reception: string;
  moyen: string;
  reference?: string | null;
  numero_recu: string;
  valide_le: string;
  annule: boolean;
  motif_annulation?: string | null;
}

export type CsProjetStatut = 'a_ouvrir' | 'ouvert' | 'livre' | 'clos';

export interface CsProjet {
  id: string;
  created_at: string;
  updated_at: string;
  dossier_id: string;
  titre: string;
  statut: CsProjetStatut;
  ouvert_le?: string | null;
  derogation_acompte: boolean;
  motif_derogation?: string | null;
  livre_le?: string | null;
  etapes?: CsEtape[];
  dossier?: CsDossier;
}

export type CsEtapeStatut = 'a_venir' | 'en_cours' | 'terminee';

export interface CsEtape {
  id: string;
  created_at: string;
  updated_at: string;
  projet_id: string;
  nom: string;
  ordre: number;
  statut: CsEtapeStatut;
  message_client?: string | null;
  terminee_le?: string | null;
}

export interface CsLienClient {
  id: string;
  created_at: string;
  updated_at: string;
  dossier_id: string;
  token: string;
  actif: boolean;
  expire_le?: string | null;
  derniere_ouverture?: string | null;
}

export interface CsRetour {
  id: string;
  created_at: string;
  updated_at: string;
  dossier_id: string;
  note_satisfaction?: number | null;
  commentaire_prive?: string | null;
  amelioration_prive?: string | null;
  temoignage_original?: string | null;
  temoignage_edite?: string | null;
  nom_affiche?: string | null;
  fonction_entreprise?: string | null;
  photo_url?: string | null;
  accord_publication: boolean;
  statut: 'a_valider' | 'valide' | 'publie' | 'refuse';
  publie_le?: string | null;
  site_temoignage_id?: string | null;
}

export interface CsCategorie {
  id: string;
  created_at: string;
  updated_at: string;
  nom: string;
  type: 'entree' | 'sortie' | 'mixte';
  ordre: number;
}

export interface CsMouvement {
  id: string;
  created_at: string;
  updated_at: string;
  type: 'entree' | 'sortie';
  date: string;
  libelle: string;
  montant_fcfa: number;
  categorie_id?: string | null;
  client_id?: string | null;
  dossier_id?: string | null;
  moyen: string;
  reference?: string | null;
  note?: string | null;
  annule: boolean;
  motif_annulation?: string | null;
}

export interface CsHistorique {
  id: string;
  created_at: string;
  updated_at: string;
  entite: string;
  entite_id: string;
  action: string;
  details: Record<string, any>;
  auteur: string;
  date: string;
}

export interface CsLivreDeCompteRow {
  operation_id: string;
  source: 'paiement' | 'manuel';
  type: 'entree' | 'sortie';
  date: string;
  libelle: string;
  montant_fcfa: number;
  moyen: string;
  reference?: string | null;
  client_id?: string | null;
  client_nom?: string | null;
  dossier_id?: string | null;
  projet_id?: string | null;
  projet_titre?: string | null;
  facture_id?: string | null;
  paiement_id?: string | null;
  numero_piece?: string | null;
  categorie_id?: string | null;
  categorie_nom?: string | null;
  note?: string | null;
  annule: boolean;
  motif_annulation?: string | null;
  created_at: string;
}

export type LivrePeriodePreset =
  | 'ce_mois'
  | 'mois_dernier'
  | 'trimestre_en_cours'
  | 'annee_en_cours'
  | 'annee_precedente'
  | 'libre';

export interface LivreRecapClient {
  client_id: string;
  nom: string;
  total_encaisse_fcfa: number;
  nb_operations: number;
  pourcentage?: number;
}

export interface LivreRecapCategorie {
  categorie_id: string;
  nom: string;
  total_entrees_fcfa: number;
  total_sorties_fcfa: number;
  net_fcfa: number;
}

export interface LivreMonthlyBar {
  moisKey: string; // YYYY-MM
  labelMois: string; // ex: 'Octobre 2026'
  encaissements: number;
  depenses: number;
  soldeNet: number;
}
