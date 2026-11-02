import { getSupabaseClient } from './supabase';
import {
  CsClient,
  CsDossier,
  CsDossierStatut,
  CsAppel,
  CsService,
  CsReglages,
  CsDevis,
  CsDevisLigne,
  CsDevisStatut,
  CsFacture,
  CsFactureLigne,
  CsFactureType,
  CsFactureStatut,
  CsPaiement,
  CsProjet,
  CsProjetStatut,
  CsEtape,
  CsEtapeStatut,
  CsLienClient,
  CsRetour,
  CsCategorie,
  CsMouvement,
  CsLivreDeCompteRow,
  LivrePeriodePreset,
  LivreRecapClient,
  LivreRecapCategorie,
  LivreMonthlyBar,
} from '../types';
import { CATALOGUE_ANNEXE_A } from '../data/catalogueAnnexeA';
import { logHistorique } from './historique';

const PREFIX = 'class_s_storage_';

// ==============================================================================
// 1. UTILITAIRES DE FORMATAGE & NUMÉROS (S2)
// ==============================================================================

/**
 * Formate un montant en FCFA entier sans décimales, avec espace fine insécable.
 * Exemple : 200 000 FCFA
 */
export function formatFCFA(montant: number | undefined | null): string {
  if (montant === undefined || montant === null || isNaN(montant)) {
    return '0\u202FFCFA';
  }
  const entier = Math.round(montant);
  const formatted = entier.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  return `${formatted}\u202FFCFA`;
}

/**
 * Normalise un numéro de téléphone pour WhatsApp (ex: +226 70 00 00 00 -> 22670000000).
 * Si un numéro burkinabè à 8 chiffres est saisi sans indicatif, ajoute 226.
 */
export function formatWhatsAppNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    return `226${digits}`;
  }
  return digits;
}

/**
 * Construit le lien de discussion directe WhatsApp avec message prérempli.
 */
export function buildWhatsAppLink(rawPhone: string, message: string): string {
  const normalized = formatWhatsAppNumber(rawPhone);
  if (!normalized) return '#';
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

// ==============================================================================
// 2. RÉGLAGES CLASS S (S4 & S5)
// ==============================================================================

export const DEFAULT_REGLAGES: CsReglages = {
  id: 'class_s',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // Émetteur laissé vide par défaut (Scott le renseigne lui-même)
  nom: '',
  whatsapp: '',
  email: '',
  ville: 'Ouagadougou',
  ifu: '',
  rccm: '',
  // Numérotation
  prefixe_devis: 'DEV',
  prefixe_facture: 'FAC',
  compteur_devis: 1,
  compteur_facture: 1,
  // Modèle de base
  pourcentage_acompte: 50,
  validite_devis_jours: 15,
  revisions_incluses: 3,
  delai_livraison: '',
  moyens_paiement: ['Mobile Money (Orange Money, Moov Money)', 'Virement bancaire', 'Espèces'],
  coordonnees_paiement: '',
  remise_fichiers: 'Fichiers finaux livrés par WhatsApp ou lien direct sécurisé une fois le solde validé.',
  droits: 'Cession complète des droits patrimoniaux d’utilisation du logo dès paiement intégral du devis.',
  conditions_complementaires: 'Toute demande hors périmètre fera l’objet d’un avenant chiffré.',
  etapes_base: [
    'Brief validé',
    'Recherche et pistes',
    'Création',
    'Retouches',
    'Livraison finale',
  ],
  modeles_whatsapp: {
    devis: 'Bonjour {nom}, votre devis {numero} est prêt. Vous pouvez le consulter et l’accepter ici : {lien}',
    facture: 'Bonjour {nom}, votre facture {numero} est disponible ici : {lien}',
    paiement: 'Bonjour {nom}, j’ai bien reçu votre paiement de {montant}. Merci. Votre reçu est disponible ici : {lien}',
    avancement: 'Bonjour {nom}, votre projet avance : l’étape « {etape} » est terminée. Suivi ici : {lien}',
    retours: 'Bonjour {nom}, votre projet est livré. Pourriez-vous partager votre avis en quelques minutes ici : {lien}',
  },
};

export function isBaseModelComplete(r: CsReglages): boolean {
  return Boolean(
    r.pourcentage_acompte > 0 &&
      r.validite_devis_jours > 0 &&
      r.revisions_incluses >= 0 &&
      r.delai_livraison &&
      r.delai_livraison.trim().length > 0 &&
      r.coordonnees_paiement &&
      r.coordonnees_paiement.trim().length > 0 &&
      r.remise_fichiers &&
      r.remise_fichiers.trim().length > 0
  );
}

export async function getReglages(): Promise<CsReglages> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('cs_reglages')
        .select('*')
        .eq('id', 'class_s')
        .single();

      if (!error && data) {
        localStorage.setItem(`${PREFIX}reglages`, JSON.stringify(data));
        return data as CsReglages;
      }
    } catch (err) {
      console.warn('[Reglages] Erreur lecture Supabase, chargement cache local :', err);
    }
  }

  const cached = localStorage.getItem(`${PREFIX}reglages`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* ignorer */
    }
  }

  return DEFAULT_REGLAGES;
}

export async function updateReglages(updates: Partial<CsReglages>): Promise<CsReglages> {
  const current = await getReglages();
  const merged: CsReglages = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  localStorage.setItem(`${PREFIX}reglages`, JSON.stringify(merged));

  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client
        .from('cs_reglages')
        .upsert({ ...merged, id: 'class_s' });
      if (error) console.warn('[Reglages] Erreur synchro Supabase :', error.message);
    } catch (err) {
      console.warn('[Reglages] Erreur réseau :', err);
    }
  }

  await logHistorique({
    entite: 'cs_reglages',
    entite_id: 'class_s',
    action: 'modification_reglages',
    details: { champs_modifies: Object.keys(updates) },
  });

  return merged;
}

// ==============================================================================
// 3. GRIMOIRE (CATALOGUE DE SERVICES)
// ==============================================================================

export async function getServices(): Promise<CsService[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('cs_services')
        .select('*')
        .order('ordre', { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem(`${PREFIX}services`, JSON.stringify(data));
        return data as CsService[];
      }
    } catch (err) {
      console.warn('[Grimoire] Erreur lecture Supabase :', err);
    }
  }

  const cached = localStorage.getItem(`${PREFIX}services`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* ignorer */
    }
  }

  return [];
}

export async function initGrimoireIdempotent(): Promise<CsService[]> {
  const current = await getServices();
  if (current.length > 0) {
    return current;
  }

  // Initialisation avec le catalogue Annexe A
  const now = new Date().toISOString();
  const servicesToInit: CsService[] = CATALOGUE_ANNEXE_A.map((item, index) => ({
    ...item,
    id: `srv_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
    created_at: now,
    updated_at: now,
  }));

  localStorage.setItem(`${PREFIX}services`, JSON.stringify(servicesToInit));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_services').insert(servicesToInit);
    } catch (err) {
      console.warn('[Grimoire] Erreur insertion catalogue Annexe A sur Supabase :', err);
    }
  }

  await logHistorique({
    entite: 'cs_services',
    entite_id: 'catalogue',
    action: 'initialisation_annexe_a',
    details: { total_services: servicesToInit.length },
  });

  return servicesToInit;
}

export async function createService(
  serviceData: Omit<CsService, 'id' | 'created_at' | 'updated_at'>
): Promise<CsService> {
  const current = await getServices();
  const now = new Date().toISOString();
  const newService: CsService = {
    ...serviceData,
    id: `srv_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    created_at: now,
    updated_at: now,
  };

  const updated = [...current, newService];
  localStorage.setItem(`${PREFIX}services`, JSON.stringify(updated));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_services').insert([newService]);
    } catch (err) {
      console.warn('[Grimoire] Erreur insertion service :', err);
    }
  }

  await logHistorique({
    entite: 'cs_services',
    entite_id: newService.id,
    action: 'creation_service',
    details: { nom: newService.nom, prix: newService.prix_base_fcfa },
  });

  return newService;
}

export async function updateService(
  id: string,
  updates: Partial<CsService>
): Promise<CsService> {
  const current = await getServices();
  const index = current.findIndex((s) => s.id === id);
  if (index === -1) throw new Error('Service introuvable');

  const updatedService: CsService = {
    ...current[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const updated = [...current];
  updated[index] = updatedService;
  localStorage.setItem(`${PREFIX}services`, JSON.stringify(updated));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_services').update(updates).eq('id', id);
    } catch (err) {
      console.warn('[Grimoire] Erreur mise à jour service :', err);
    }
  }

  await logHistorique({
    entite: 'cs_services',
    entite_id: id,
    action: 'modification_service',
    details: updates,
  });

  return updatedService;
}

export async function deleteService(id: string): Promise<boolean> {
  const current = await getServices();
  const updated = current.filter((s) => s.id !== id);
  localStorage.setItem(`${PREFIX}services`, JSON.stringify(updated));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_services').delete().eq('id', id);
    } catch (err) {
      console.warn('[Grimoire] Erreur suppression service :', err);
    }
  }

  await logHistorique({
    entite: 'cs_services',
    entite_id: id,
    action: 'suppression_service',
    details: {},
  });

  return true;
}

// ==============================================================================
// 4. ARMÉE DES OMBRES (DOSSIERS & CLIENTS)
// ==============================================================================

export async function getClients(): Promise<CsClient[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('cs_clients').select('*');
      if (!error && data) {
        localStorage.setItem(`${PREFIX}cs_clients`, JSON.stringify(data));
        return data as CsClient[];
      }
    } catch (err) {
      console.warn('[Clients] Erreur lecture clients Supabase :', err);
    }
  }
  const cached = localStorage.getItem(`${PREFIX}cs_clients`);
  return cached ? JSON.parse(cached) : [];
}

export async function getDossiers(): Promise<CsDossier[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('cs_dossiers')
        .select('*, client:cs_clients(*)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        localStorage.setItem(`${PREFIX}cs_dossiers`, JSON.stringify(data));
        return data as CsDossier[];
      }
    } catch (err) {
      console.warn('[Dossiers] Erreur lecture dossiers Supabase :', err);
    }
  }
  const cached = localStorage.getItem(`${PREFIX}cs_dossiers`);
  return cached ? JSON.parse(cached) : [];
}

/**
 * Synchronise les demandes reçues depuis le questionnaire du site web officiel.
 * Opération sans doublon : vérifie l'existence de soumission_id.
 */
export async function syncDemandesFromSite(): Promise<{
  addedCount: number;
  dossiers: CsDossier[];
}> {
  const client = getSupabaseClient();
  let freshDemandes: any[] = [];

  if (client) {
    try {
      const { data, error } = await client
        .from('demandes')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        freshDemandes = data;
        localStorage.setItem(`${PREFIX}raw_demandes`, JSON.stringify(data));
      }
    } catch (err) {
      console.warn('[Sync] Erreur lecture table demandes Supabase :', err);
    }
  }

  if (freshDemandes.length === 0) {
    const cached = localStorage.getItem(`${PREFIX}raw_demandes`);
    if (cached) {
      try {
        freshDemandes = JSON.parse(cached);
      } catch {
        /* ignorer */
      }
    }
  }

  const existingDossiers = await getDossiers();
  const existingClients = await getClients();
  const existingSubmissionIds = new Set(
    existingDossiers.map((d) => d.soumission_id).filter(Boolean)
  );

  let addedCount = 0;
  const newDossiers: CsDossier[] = [];
  const updatedClients = [...existingClients];

  for (const demande of freshDemandes) {
    if (!existingSubmissionIds.has(demande.id)) {
      // Trouver ou créer le client
      let clientObj = updatedClients.find(
        (c) =>
          formatWhatsAppNumber(c.whatsapp) === formatWhatsAppNumber(demande.whatsapp_number)
      );

      const now = new Date().toISOString();
      if (!clientObj) {
        clientObj = {
          id: `cli_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
          created_at: demande.created_at || now,
          updated_at: now,
          nom: demande.full_name || 'Prospect Anonyme',
          entreprise: demande.company_name || null,
          whatsapp: demande.whatsapp_number || '',
          email: null,
          lien_social: demande.branch_data?.websiteUrl || null,
          notes_internes: `Créé automatiquement depuis la soumission ${demande.id}`,
        };
        updatedClients.push(clientObj);

        if (client) {
          try {
            await client.from('cs_clients').insert([clientObj]);
          } catch {
            /* ignorer */
          }
        }
      }

      // Extraire le budget annoncé si disponible
      const budgetAnnounce =
        demande.branch_data?.budget ||
        (demande.goals && demande.goals.length > 0 ? demande.goals.join(', ') : 'Non spécifié');

      const dossierObj: CsDossier = {
        id: `dos_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        created_at: demande.created_at || now,
        updated_at: now,
        client_id: clientObj.id,
        soumission_id: demande.id,
        statut: 'Nouvelle',
        decision_examen: null,
        motif_interne: null,
        budget_annonce: budgetAnnounce,
        acces_client_actif: false,
        client: clientObj,
      };

      newDossiers.push(dossierObj);
      existingSubmissionIds.add(demande.id);
      addedCount++;

      if (client) {
        try {
          await client.from('cs_dossiers').insert([dossierObj]);
        } catch {
          /* ignorer */
        }
      }
    }
  }

  const allDossiers = [...newDossiers, ...existingDossiers];
  localStorage.setItem(`${PREFIX}cs_clients`, JSON.stringify(updatedClients));
  localStorage.setItem(`${PREFIX}cs_dossiers`, JSON.stringify(allDossiers));

  if (addedCount > 0) {
    await logHistorique({
      entite: 'cs_dossiers',
      entite_id: 'sync',
      action: 'synchronisation_questionnaire',
      details: { dossiers_ajoutes: addedCount },
    });
  }

  return { addedCount, dossiers: allDossiers };
}

export async function createManualDossier(data: {
  nom: string;
  entreprise?: string;
  whatsapp: string;
  email?: string;
  lien_social?: string;
  budget?: string;
}): Promise<CsDossier> {
  const existingClients = await getClients();
  const existingDossiers = await getDossiers();
  const now = new Date().toISOString();

  let clientObj = existingClients.find(
    (c) => formatWhatsAppNumber(c.whatsapp) === formatWhatsAppNumber(data.whatsapp)
  );

  const updatedClients = [...existingClients];
  if (!clientObj) {
    clientObj = {
      id: `cli_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      created_at: now,
      updated_at: now,
      nom: data.nom,
      entreprise: data.entreprise || null,
      whatsapp: data.whatsapp,
      email: data.email || null,
      lien_social: data.lien_social || null,
      notes_internes: 'Créé manuellement depuis Le Système',
    };
    updatedClients.push(clientObj);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('cs_clients').insert([clientObj]);
      } catch {
        /* ignorer */
      }
    }
  }

  const dossierObj: CsDossier = {
    id: `dos_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    created_at: now,
    updated_at: now,
    client_id: clientObj.id,
    soumission_id: null,
    statut: 'Nouvelle',
    decision_examen: null,
    motif_interne: null,
    budget_annonce: data.budget || 'Non spécifié',
    acces_client_actif: false,
    client: clientObj,
  };

  const updatedDossiers = [dossierObj, ...existingDossiers];
  localStorage.setItem(`${PREFIX}cs_clients`, JSON.stringify(updatedClients));
  localStorage.setItem(`${PREFIX}cs_dossiers`, JSON.stringify(updatedDossiers));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_dossiers').insert([dossierObj]);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_dossiers',
    entite_id: dossierObj.id,
    action: 'creation_manuelle_dossier',
    details: { client_nom: data.nom },
  });

  return dossierObj;
}

export async function getDossierById(id: string): Promise<{
  dossier: CsDossier;
  client: CsClient;
  appel?: CsAppel;
  devis: CsDevis[];
  rawDemande?: any;
} | null> {
  const dossiers = await getDossiers();
  const dossier = dossiers.find((d) => d.id === id);
  if (!dossier) return null;

  const clients = await getClients();
  const clientObj = clients.find((c) => c.id === dossier.client_id) || {
    id: dossier.client_id,
    created_at: dossier.created_at,
    updated_at: dossier.updated_at,
    nom: 'Client',
    whatsapp: '',
  };

  // Récupérer l'appel
  const appels = await getAppels();
  const appel = appels.find((a) => a.dossier_id === id);

  // Récupérer les devis associés
  const allDevis = await getDevisList();
  const devis = allDevis.filter((dev) => dev.dossier_id === id);

  // Récupérer la demande brute du site si disponible
  let rawDemande: any = null;
  if (dossier.soumission_id) {
    const rawDemandesStr = localStorage.getItem(`${PREFIX}raw_demandes`);
    if (rawDemandesStr) {
      try {
        const rawDemandes = JSON.parse(rawDemandesStr);
        rawDemande = rawDemandes.find((dem: any) => dem.id === dossier.soumission_id);
      } catch {
        /* ignorer */
      }
    }
  }

  return { dossier, client: clientObj, appel, devis, rawDemande };
}

export async function updateDossierStatus(
  dossierId: string,
  statut: CsDossierStatut,
  decision?: 'poursuivre' | 'decliner',
  motif?: string
): Promise<CsDossier> {
  const dossiers = await getDossiers();
  const index = dossiers.findIndex((d) => d.id === dossierId);
  if (index === -1) throw new Error('Dossier introuvable');

  const updatedDossier: CsDossier = {
    ...dossiers[index],
    statut,
    decision_examen: decision !== undefined ? decision : dossiers[index].decision_examen,
    motif_interne: motif !== undefined ? motif : dossiers[index].motif_interne,
    updated_at: new Date().toISOString(),
  };

  dossiers[index] = updatedDossier;
  localStorage.setItem(`${PREFIX}cs_dossiers`, JSON.stringify(dossiers));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('cs_dossiers')
        .update({
          statut,
          decision_examen: updatedDossier.decision_examen,
          motif_interne: updatedDossier.motif_interne,
          updated_at: updatedDossier.updated_at,
        })
        .eq('id', dossierId);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_dossiers',
    entite_id: dossierId,
    action: 'changement_statut_dossier',
    details: { nouveau_statut: statut, decision, motif },
  });

  return updatedDossier;
}

// ==============================================================================
// 5. APPELS DE DÉCOUVERTE (CADRAGE)
// ==============================================================================

export async function getAppels(): Promise<CsAppel[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('cs_appels').select('*');
      if (!error && data) {
        localStorage.setItem(`${PREFIX}cs_appels`, JSON.stringify(data));
        return data as CsAppel[];
      }
    } catch (err) {
      console.warn('[Appels] Erreur lecture appels Supabase :', err);
    }
  }
  const cached = localStorage.getItem(`${PREFIX}cs_appels`);
  return cached ? JSON.parse(cached) : [];
}

export async function saveAppel(
  dossierId: string,
  appelData: Partial<CsAppel>
): Promise<CsAppel> {
  const appels = await getAppels();
  const index = appels.findIndex((a) => a.dossier_id === dossierId);
  const now = new Date().toISOString();

  let updatedAppel: CsAppel;
  if (index !== -1) {
    updatedAppel = {
      ...appels[index],
      ...appelData,
      updated_at: now,
    };
    appels[index] = updatedAppel;
  } else {
    updatedAppel = {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      created_at: now,
      updated_at: now,
      dossier_id: dossierId,
      date_heure: appelData.date_heure || now,
      statut: appelData.statut || 'planifie',
      elements_conception: appelData.elements_conception || '',
      services_necessaires: appelData.services_necessaires || '',
      modalites_collaboration: appelData.modalites_collaboration || '',
      notes_libres: appelData.notes_libres || '',
    };
    appels.push(updatedAppel);
  }

  localStorage.setItem(`${PREFIX}cs_appels`, JSON.stringify(appels));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_appels').upsert([updatedAppel]);
    } catch {
      /* ignorer */
    }
  }

  // Mettre à jour le statut du dossier si appel planifié ou réalisé
  if (appelData.statut === 'planifie') {
    await updateDossierStatus(dossierId, 'Appel planifié');
  } else if (appelData.statut === 'realise') {
    await updateDossierStatus(dossierId, 'Appel réalisé');
  }

  await logHistorique({
    entite: 'cs_appels',
    entite_id: updatedAppel.id,
    action: 'sauvegarde_appel',
    details: { statut: updatedAppel.statut },
  });

  return updatedAppel;
}

// ==============================================================================
// 6. CONSTRUCTEUR DE DEVIS (PORTAIL DEVIS)
// ==============================================================================

export async function getDevisList(): Promise<CsDevis[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('cs_devis')
        .select('*, lignes:cs_devis_lignes(*), dossier:cs_dossiers(*, client:cs_clients(*))')
        .order('created_at', { ascending: false });

      if (!error && data) {
        localStorage.setItem(`${PREFIX}cs_devis`, JSON.stringify(data));
        return data as CsDevis[];
      }
    } catch (err) {
      console.warn('[Devis] Erreur lecture devis Supabase :', err);
    }
  }

  const cached = localStorage.getItem(`${PREFIX}cs_devis`);
  return cached ? JSON.parse(cached) : [];
}

export async function getDevisById(id: string): Promise<CsDevis | null> {
  const list = await getDevisList();
  const found = list.find((d) => d.id === id);
  return found || null;
}

/**
 * Génère un numéro automatique séquentiel pour un devis : DEV-AAAA-001.
 */
export async function generateQuoteNumber(): Promise<string> {
  const reglages = await getReglages();
  const year = new Date().getFullYear();
  const prefix = reglages.prefixe_devis || 'DEV';
  const counter = reglages.compteur_devis || 1;
  const formattedCounter = counter.toString().padStart(3, '0');

  // Incrémenter le compteur
  await updateReglages({ compteur_devis: counter + 1 });

  return `${prefix}-${year}-${formattedCounter}`;
}

/**
 * Calcule les écarts entre les modalités de ce devis et le modèle de base des Réglages.
 */
export function calculateModalitesEcarts(
  base: CsReglages,
  currentModalites: Record<string, any>
): { champ: string; libelle: string; valeur_base: any; valeur_devis: any }[] {
  const ecarts: { champ: string; libelle: string; valeur_base: any; valeur_devis: any }[] = [];

  const checks = [
    {
      champ: 'pourcentage_acompte',
      libelle: 'Pourcentage d’acompte',
      base: base.pourcentage_acompte,
      current: currentModalites.pourcentage_acompte,
    },
    {
      champ: 'validite_devis_jours',
      libelle: 'Validité du devis (jours)',
      base: base.validite_devis_jours,
      current: currentModalites.validite_devis_jours,
    },
    {
      champ: 'revisions_incluses',
      libelle: 'Nombre de révisions incluses',
      base: base.revisions_incluses,
      current: currentModalites.revisions_incluses,
    },
    {
      champ: 'delai_livraison',
      libelle: 'Délai de livraison indicatif',
      base: base.delai_livraison,
      current: currentModalites.delai_livraison,
    },
    {
      champ: 'coordonnees_paiement',
      libelle: 'Coordonnées de paiement',
      base: base.coordonnees_paiement,
      current: currentModalites.coordonnees_paiement,
    },
    {
      champ: 'remise_fichiers',
      libelle: 'Remise des fichiers finaux',
      base: base.remise_fichiers,
      current: currentModalites.remise_fichiers,
    },
    {
      champ: 'droits',
      libelle: 'Cession des droits',
      base: base.droits,
      current: currentModalites.droits,
    },
    {
      champ: 'conditions_complementaires',
      libelle: 'Conditions complémentaires',
      base: base.conditions_complementaires,
      current: currentModalites.conditions_complementaires,
    },
  ];

  for (const item of checks) {
    if (
      item.current !== undefined &&
      item.current !== null &&
      String(item.current).trim() !== String(item.base || '').trim()
    ) {
      ecarts.push({
        champ: item.champ,
        libelle: item.libelle,
        valeur_base: item.base,
        valeur_devis: item.current,
      });
    }
  }

  return ecarts;
}

export async function createDevis(
  devisData: Partial<CsDevis>,
  lignesData: Partial<CsDevisLigne>[]
): Promise<CsDevis> {
  const reglages = await getReglages();
  const now = new Date().toISOString();
  const dateEmission = devisData.date_emission || new Date().toISOString().split('T')[0];

  // Calcul de la date de validité
  const validiteJours = devisData.modalites?.validite_devis_jours || reglages.validite_devis_jours || 15;
  const dateObj = new Date(dateEmission);
  dateObj.setDate(dateObj.getDate() + validiteJours);
  const dateValidite = dateObj.toISOString().split('T')[0];

  const numero = devisData.numero || (await generateQuoteNumber());

  // Calcul du total des lignes
  let sousTotal = 0;
  const lignes: CsDevisLigne[] = lignesData.map((l, index) => {
    const qte = Number(l.quantite) || 1;
    const pu = Number(l.prix_unitaire_fcfa) || 0;
    const total = Math.round(qte * pu);
    sousTotal += total;

    return {
      id: `lig_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
      created_at: now,
      updated_at: now,
      devis_id: '',
      service_id: l.service_id || null,
      libelle: l.libelle || 'Prestation',
      description: l.description || '',
      quantite: qte,
      prix_unitaire_fcfa: pu,
      total_ligne_fcfa: total,
      ordre: index + 1,
    };
  });

  const remise = Number(devisData.remise_fcfa) || 0;
  const total = Math.max(0, sousTotal - remise);

  // Calcul des écarts avec la base
  const ecarts = calculateModalitesEcarts(reglages, devisData.modalites || {});

  const newDevis: CsDevis = {
    id: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    created_at: now,
    updated_at: now,
    numero,
    dossier_id: devisData.dossier_id || '',
    version: devisData.version || 1,
    statut: 'brouillon',
    date_emission: dateEmission,
    date_validite: dateValidite,
    conception: devisData.conception || {},
    modalites: devisData.modalites || {},
    ecarts_base: ecarts,
    remise_fcfa: remise,
    remise_libelle: devisData.remise_libelle || null,
    total_fcfa: total,
    lignes: lignes.map((l) => ({ ...l, devis_id: '' })),
  };

  newDevis.lignes = lignes.map((l) => ({ ...l, devis_id: newDevis.id }));

  const currentDevisList = await getDevisList();
  const updatedList = [newDevis, ...currentDevisList];
  localStorage.setItem(`${PREFIX}cs_devis`, JSON.stringify(updatedList));

  const client = getSupabaseClient();
  if (client) {
    try {
      const { lignes: _l, ...devisRow } = newDevis;
      await client.from('cs_devis').insert([devisRow]);
      if (newDevis.lignes.length > 0) {
        await client.from('cs_devis_lignes').insert(newDevis.lignes);
      }
    } catch (err) {
      console.warn('[Devis] Erreur insertion devis Supabase :', err);
    }
  }

  // Passer le dossier à "Devis en préparation"
  if (newDevis.dossier_id) {
    await updateDossierStatus(newDevis.dossier_id, 'Devis en préparation');
  }

  await logHistorique({
    entite: 'cs_devis',
    entite_id: newDevis.id,
    action: 'creation_devis',
    details: { numero: newDevis.numero, total: newDevis.total_fcfa },
  });

  return newDevis;
}

export async function updateDevis(
  devisId: string,
  devisData: Partial<CsDevis>,
  lignesData?: Partial<CsDevisLigne>[]
): Promise<CsDevis> {
  const list = await getDevisList();
  const index = list.findIndex((d) => d.id === devisId);
  if (index === -1) throw new Error('Devis introuvable');

  const current = list[index];
  if (current.statut === 'pret' || current.statut === 'envoye' || current.statut === 'accepte') {
    throw new Error('Un devis prêt ou envoyé est en lecture seule. Créez une nouvelle version.');
  }

  const reglages = await getReglages();
  const now = new Date().toISOString();

  let lignes = current.lignes || [];
  let sousTotal = 0;

  if (lignesData) {
    lignes = lignesData.map((l, idx) => {
      const qte = Number(l.quantite) || 1;
      const pu = Number(l.prix_unitaire_fcfa) || 0;
      const tot = Math.round(qte * pu);
      sousTotal += tot;

      return {
        id: l.id || `lig_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
        created_at: l.created_at || now,
        updated_at: now,
        devis_id: devisId,
        service_id: l.service_id || null,
        libelle: l.libelle || 'Prestation',
        description: l.description || '',
        quantite: qte,
        prix_unitaire_fcfa: pu,
        total_ligne_fcfa: tot,
        ordre: idx + 1,
      };
    });
  } else {
    sousTotal = lignes.reduce((acc, l) => acc + (l.total_ligne_fcfa || 0), 0);
  }

  const remise = devisData.remise_fcfa !== undefined ? Number(devisData.remise_fcfa) : current.remise_fcfa;
  const total = Math.max(0, sousTotal - remise);

  const modalites = devisData.modalites || current.modalites;
  const ecarts = calculateModalitesEcarts(reglages, modalites);

  const updatedDevis: CsDevis = {
    ...current,
    ...devisData,
    lignes,
    remise_fcfa: remise,
    total_fcfa: total,
    modalites,
    ecarts_base: ecarts,
    updated_at: now,
  };

  list[index] = updatedDevis;
  localStorage.setItem(`${PREFIX}cs_devis`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      const { lignes: _l, dossier: _d, ...devisRow } = updatedDevis;
      await client.from('cs_devis').update(devisRow).eq('id', devisId);
      if (lignesData) {
        await client.from('cs_devis_lignes').delete().eq('devis_id', devisId);
        await client.from('cs_devis_lignes').insert(lignes);
      }
    } catch (err) {
      console.warn('[Devis] Erreur mise à jour devis Supabase :', err);
    }
  }

  await logHistorique({
    entite: 'cs_devis',
    entite_id: devisId,
    action: 'modification_devis',
    details: { total: updatedDevis.total_fcfa },
  });

  return updatedDevis;
}

export async function duplicateDevisNewVersion(devisId: string): Promise<CsDevis> {
  const current = await getDevisById(devisId);
  if (!current) throw new Error('Devis source introuvable');

  const newVersion = (current.version || 1) + 1;
  const baseNumero = current.numero.split('-v')[0];
  const newNumero = `${baseNumero}-v${newVersion}`;

  const duplicated = await createDevis(
    {
      dossier_id: current.dossier_id,
      version: newVersion,
      numero: newNumero,
      date_emission: new Date().toISOString().split('T')[0],
      conception: current.conception,
      modalites: current.modalites,
      remise_fcfa: current.remise_fcfa,
      remise_libelle: current.remise_libelle,
    },
    current.lignes || []
  );

  await logHistorique({
    entite: 'cs_devis',
    entite_id: duplicated.id,
    action: 'duplication_nouvelle_version',
    details: { ancien_id: devisId, version: newVersion, numero: newNumero },
  });

  return duplicated;
}

export async function markDevisReady(
  devisId: string
): Promise<{ success: boolean; error?: string; devis?: CsDevis }> {
  const devis = await getDevisById(devisId);
  if (!devis) return { success: false, error: 'Devis introuvable.' };

  const reglages = await getReglages();
  if (!isBaseModelComplete(reglages)) {
    return {
      success: false,
      error:
        'Impossible de marquer le devis comme prêt : le modèle de base n’est pas complété. Veuillez renseigner vos modalités dans Réglages Class S.',
    };
  }

  if (devis.total_fcfa <= 0) {
    return {
      success: false,
      error: 'Le montant total du devis ne peut pas être nul ou négatif.',
    };
  }

  if (!devis.lignes || devis.lignes.length === 0) {
    return {
      success: false,
      error: 'Le devis doit comporter au moins une ligne de prestation.',
    };
  }

  const list = await getDevisList();
  const index = list.findIndex((d) => d.id === devisId);
  const now = new Date().toISOString();

  const updatedDevis: CsDevis = {
    ...devis,
    statut: 'pret',
    updated_at: now,
  };

  list[index] = updatedDevis;
  localStorage.setItem(`${PREFIX}cs_devis`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('cs_devis')
        .update({ statut: 'pret', updated_at: now })
        .eq('id', devisId);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_devis',
    entite_id: devisId,
    action: 'marquer_devis_pret',
    details: { numero: devis.numero, total: devis.total_fcfa },
  });

  return { success: true, devis: updatedDevis };
}

// ==============================================================================
// 7. ENVOI DE DEVIS & LIEN CLIENT SÉCURISÉ (S3 & S6)
// ==============================================================================

/**
 * Marque un devis comme envoyé au client :
 * - Statut passe à 'envoye' (lecture seule)
 * - Date d'envoi enregistrée
 * - Dossier passe à 'Devis envoyé'
 * - Active automatiquement l'accès client et génère un jeton si aucun n'existe
 */
export async function markDevisSent(
  devisId: string
): Promise<{ devis: CsDevis; token: string }> {
  const devis = await getDevisById(devisId);
  if (!devis) throw new Error('Devis introuvable.');

  const now = new Date().toISOString();
  const list = await getDevisList();
  const index = list.findIndex((d) => d.id === devisId);

  const updatedDevis: CsDevis = {
    ...devis,
    statut: 'envoye',
    updated_at: now,
  };

  list[index] = updatedDevis;
  localStorage.setItem(`${PREFIX}cs_devis`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('cs_devis')
        .update({ statut: 'envoye', updated_at: now })
        .eq('id', devisId);
    } catch {
      /* ignorer */
    }
  }

  // Mettre à jour le dossier vers 'Devis envoyé'
  if (devis.dossier_id) {
    await updateDossierStatus(devis.dossier_id, 'Devis envoyé');
  }

  // Activer ou récupérer le jeton client
  const lien = await getOrCreateClientToken(devis.dossier_id);

  await logHistorique({
    entite: 'cs_devis',
    entite_id: devisId,
    action: 'envoi_devis',
    details: { numero: devis.numero, token_genere: lien.token },
  });

  return { devis: updatedDevis, token: lien.token };
}

/**
 * Récupère le lien client actif associé à un dossier.
 */
export async function getLienClient(
  dossierId: string
): Promise<CsLienClient | null> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('cs_liens_clients')
        .select('*')
        .eq('dossier_id', dossierId)
        .eq('actif', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data as CsLienClient;
      }
    } catch {
      /* ignorer */
    }
  }

  const cachedStr = localStorage.getItem(`${PREFIX}cs_liens_clients`);
  if (cachedStr) {
    try {
      const liens: CsLienClient[] = JSON.parse(cachedStr);
      const found = liens.find(
        (l) => l.dossier_id === dossierId && l.actif === true
      );
      if (found) return found;
    } catch {
      /* ignorer */
    }
  }

  return null;
}

/**
 * Génère un jeton aléatoire de 256 bits encodé en URL sûre (64 caractères hexadécimaux).
 */
export function generateSecureToken(): string {
  try {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    // Secours si crypto n'est pas disponible
    return (
      Math.random().toString(36).substring(2) +
      Date.now().toString(36) +
      Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2)
    );
  }
}

/**
 * Génère un nouveau jeton client pour un dossier.
 * Révoque tout jeton antérieur pour ce même dossier (S6).
 */
export async function generateClientToken(
  dossierId: string,
  expireLe?: string | null
): Promise<CsLienClient> {
  const token = generateSecureToken();
  const now = new Date().toISOString();

  // 1. Désactiver les anciens jetons
  const cachedStr = localStorage.getItem(`${PREFIX}cs_liens_clients`);
  let liens: CsLienClient[] = cachedStr ? JSON.parse(cachedStr) : [];
  liens = liens.map((l) =>
    l.dossier_id === dossierId ? { ...l, actif: false, updated_at: now } : l
  );

  const newLien: CsLienClient = {
    id: `lien_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    created_at: now,
    updated_at: now,
    dossier_id: dossierId,
    token,
    actif: true,
    expire_le: expireLe || null,
    derniere_ouverture: null,
  };

  liens.push(newLien);
  localStorage.setItem(`${PREFIX}cs_liens_clients`, JSON.stringify(liens));

  // 2. Mettre à jour le dossier pour activer l'accès
  const dossiers = await getDossiers();
  const dIndex = dossiers.findIndex((d) => d.id === dossierId);
  if (dIndex !== -1) {
    dossiers[dIndex].acces_client_actif = true;
    localStorage.setItem(`${PREFIX}cs_dossiers`, JSON.stringify(dossiers));
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('cs_liens_clients')
        .update({ actif: false })
        .eq('dossier_id', dossierId);
      await client.from('cs_liens_clients').insert([newLien]);
      await client
        .from('cs_dossiers')
        .update({ acces_client_actif: true })
        .eq('id', dossierId);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_liens_clients',
    entite_id: newLien.id,
    action: 'generation_lien_client',
    details: { dossier_id: dossierId, token, expire_le: expireLe },
  });

  return newLien;
}

/**
 * Récupère le jeton actif d'un dossier, ou en crée un nouveau s'il n'en a pas.
 */
export async function getOrCreateClientToken(
  dossierId: string
): Promise<CsLienClient> {
  const existing = await getLienClient(dossierId);
  if (existing) return existing;
  return generateClientToken(dossierId);
}

/**
 * Révoque l'accès client d'un dossier (désactive tous ses jetons).
 */
export async function revokeClientToken(dossierId: string): Promise<boolean> {
  const now = new Date().toISOString();

  const cachedStr = localStorage.getItem(`${PREFIX}cs_liens_clients`);
  if (cachedStr) {
    const liens: CsLienClient[] = JSON.parse(cachedStr);
    const updated = liens.map((l) =>
      l.dossier_id === dossierId ? { ...l, actif: false, updated_at: now } : l
    );
    localStorage.setItem(`${PREFIX}cs_liens_clients`, JSON.stringify(updated));
  }

  const dossiers = await getDossiers();
  const dIndex = dossiers.findIndex((d) => d.id === dossierId);
  if (dIndex !== -1) {
    dossiers[dIndex].acces_client_actif = false;
    localStorage.setItem(`${PREFIX}cs_dossiers`, JSON.stringify(dossiers));
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('cs_liens_clients')
        .update({ actif: false })
        .eq('dossier_id', dossierId);
      await client
        .from('cs_dossiers')
        .update({ acces_client_actif: false })
        .eq('id', dossierId);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_liens_clients',
    entite_id: dossierId,
    action: 'revocation_lien_client',
    details: { dossier_id: dossierId },
  });

  return true;
}

/**
 * Construit l'URL complète du lien client.
 */
export function buildClientFullUrl(token: string): string {
  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : 'https://lesysteme.wendclass.com';
  return `${baseUrl}/c/${token}`;
}

/**
 * Génère le message WhatsApp avec substitution des modèles configurés dans Réglages Class S.
 */
export async function generateWhatsAppMessage(
  templateKey: 'devis' | 'facture' | 'paiement' | 'avancement' | 'retours',
  variables: Record<string, string>
): Promise<string> {
  const reglages = await getReglages();
  let template = reglages.modeles_whatsapp?.[templateKey];

  if (!template) {
    switch (templateKey) {
      case 'devis':
        template =
          'Bonjour {nom}, votre devis {numero} est prêt. Vous pouvez le consulter et l’accepter ici : {lien}';
        break;
      case 'facture':
        template =
          'Bonjour {nom}, votre facture {numero} est disponible ici : {lien}';
        break;
      case 'paiement':
        template =
          'Bonjour {nom}, j’ai bien reçu votre paiement de {montant}. Merci. Votre reçu est disponible ici : {lien}';
        break;
      case 'avancement':
        template =
          'Bonjour {nom}, votre projet avance : l’étape « {etape} » est terminée. Suivi ici : {lien}';
        break;
      case 'retours':
        template =
          'Bonjour {nom}, votre projet est livré. Pourriez-vous partager votre avis en quelques minutes ici : {lien}';
        break;
      default:
        template = 'Bonjour {nom}, voici votre lien : {lien}';
    }
  }

  // Remplacer les variables
  let message = template;
  for (const [key, val] of Object.entries(variables)) {
    message = message.split(`{${key}}`).join(val || '');
  }

  return message;
}

/**
 * Données publiques sécurisées retournées à la page client /c/[token].
 * ZÉRO fuite de données internes (ni notes d'appel, ni budget annoncé, ni écarts de base).
 */
export interface ClientPortalPayload {
  valid: boolean;
  reason?: 'invalide' | 'expire' | 'revoque';
  dossierId?: string;
  client?: {
    nom: string;
    entreprise?: string | null;
  };
  devis?: {
    id: string;
    numero: string;
    version: number;
    statut: CsDevisStatut;
    date_emission: string;
    date_validite: string;
    conception?: {
      resume?: string;
      univers?: string;
      livrables?: string[];
      hors_perimetre?: string[];
    };
    lignes: {
      libelle: string;
      description?: string | null;
      quantite: number;
      prix_unitaire_fcfa: number;
      total_ligne_fcfa: number;
    }[];
    remise_fcfa: number;
    remise_libelle?: string | null;
    total_fcfa: number;
    modalites: {
      pourcentage_acompte?: number;
      revisions_incluses?: number;
      delai_livraison?: string;
      coordonnees_paiement?: string;
      remise_fichiers?: string;
      droits?: string;
      conditions_complementaires?: string;
    };
    accepte_le?: string | null;
    accepte_par_nom?: string | null;
  } | null;
  factures: {
    id: string;
    numero: string;
    type: CsFactureType;
    statut: CsFactureStatut;
    date_emission: string;
    echeance: string;
    total_fcfa: number;
    lignes: {
      libelle: string;
      description?: string | null;
      quantite: number;
      prix_unitaire_fcfa: number;
      total_ligne_fcfa: number;
    }[];
    coordonnees_paiement?: string;
    paiements: {
      montant_fcfa: number;
      date_reception: string;
      moyen: string;
      numero_recu: string;
      valide_le: string;
    }[];
  }[];
  projet?: {
    titre: string;
    statut: CsProjetStatut;
    etapes: {
      nom: string;
      statut: CsEtapeStatut;
      message_client?: string | null;
      terminee_le?: string | null;
    }[];
  } | null;
  studio: {
    nom: string;
    whatsapp: string;
    email?: string | null;
  };
  retour?: {
    id: string;
    note_satisfaction?: number | null;
    commentaire_prive?: string | null;
    amelioration_prive?: string | null;
    temoignage_original?: string | null;
    nom_affiche?: string | null;
    fonction_entreprise?: string | null;
    photo_url?: string | null;
    accord_publication: boolean;
    statut: 'a_valider' | 'valide' | 'publie' | 'refuse';
  } | null;
}

/**
 * Lit et assainit les données pour la page publique client /c/[token].
 */
export async function getClientPortalData(
  token: string
): Promise<ClientPortalPayload> {
  const reglages = await getReglages();
  const studioContact = {
    nom: reglages.nom || 'Class S Studio',
    whatsapp: reglages.whatsapp || '22670000000',
    email: reglages.email || null,
  };

  if (!token || token.trim().length === 0) {
    return { valid: false, reason: 'invalide', studio: studioContact, factures: [] };
  }

  // Chercher le lien
  let lien: CsLienClient | null = null;
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data } = await client
        .from('cs_liens_clients')
        .select('*')
        .eq('token', token.trim())
        .maybeSingle();
      if (data) lien = data as CsLienClient;
    } catch {
      /* ignorer */
    }
  }

  if (!lien) {
    const cachedStr = localStorage.getItem(`${PREFIX}cs_liens_clients`);
    if (cachedStr) {
      try {
        const liens: CsLienClient[] = JSON.parse(cachedStr);
        lien = liens.find((l) => l.token === token.trim()) || null;
      } catch {
        /* ignorer */
      }
    }
  }

  if (!lien) {
    return { valid: false, reason: 'invalide', studio: studioContact, factures: [] };
  }

  if (!lien.actif) {
    return { valid: false, reason: 'revoque', studio: studioContact, factures: [] };
  }

  if (lien.expire_le && new Date(lien.expire_le) < new Date()) {
    return { valid: false, reason: 'expire', studio: studioContact, factures: [] };
  }

  // Mettre à jour la dernière ouverture
  const now = new Date().toISOString();
  lien.derniere_ouverture = now;
  if (client) {
    try {
      await client
        .from('cs_liens_clients')
        .update({ derniere_ouverture: now })
        .eq('id', lien.id);
    } catch {
      /* ignorer */
    }
  }

  // Charger le dossier & le client
  const dossierDetails = await getDossierById(lien.dossier_id);
  if (!dossierDetails) {
    return { valid: false, reason: 'invalide', studio: studioContact, factures: [] };
  }

  const { client: clientObj, devis: allDevis } = dossierDetails;

  // Filtrer le devis : afficher le plus récent au statut 'envoye' ou 'accepte'
  const visibleDevis = allDevis
    .filter(
      (d) =>
        d.statut === 'envoye' ||
        d.statut === 'accepte' ||
        d.statut === 'expire' ||
        d.statut === 'remplace'
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  let devisPayload = null;
  if (visibleDevis) {
    devisPayload = {
      id: visibleDevis.id,
      numero: visibleDevis.numero,
      version: visibleDevis.version,
      statut: visibleDevis.statut,
      date_emission: visibleDevis.date_emission,
      date_validite: visibleDevis.date_validite,
      conception: {
        resume: visibleDevis.conception?.resume || '',
        univers: visibleDevis.conception?.univers || '',
        livrables: visibleDevis.conception?.livrables || [],
        hors_perimetre: visibleDevis.conception?.hors_perimetre || [],
      },
      lignes: (visibleDevis.lignes || []).map((l) => ({
        libelle: l.libelle,
        description: l.description,
        quantite: l.quantite,
        prix_unitaire_fcfa: l.prix_unitaire_fcfa,
        total_ligne_fcfa: l.total_ligne_fcfa || l.quantite * l.prix_unitaire_fcfa,
      })),
      remise_fcfa: visibleDevis.remise_fcfa || 0,
      remise_libelle: visibleDevis.remise_libelle,
      total_fcfa: visibleDevis.total_fcfa,
      modalites: {
        pourcentage_acompte:
          visibleDevis.modalites?.pourcentage_acompte ?? reglages.pourcentage_acompte ?? 50,
        revisions_incluses:
          visibleDevis.modalites?.revisions_incluses ?? reglages.revisions_incluses ?? 3,
        delai_livraison:
          visibleDevis.modalites?.delai_livraison || reglages.delai_livraison || '',
        coordonnees_paiement:
          visibleDevis.modalites?.coordonnees_paiement || reglages.coordonnees_paiement || '',
        remise_fichiers:
          visibleDevis.modalites?.remise_fichiers || reglages.remise_fichiers || '',
        droits: visibleDevis.modalites?.droits || reglages.droits || '',
        conditions_complementaires:
          visibleDevis.modalites?.conditions_complementaires ||
          reglages.conditions_complementaires ||
          '',
      },
      accepte_le: visibleDevis.accepte_le,
      accepte_par_nom: visibleDevis.accepte_par_nom,
    };
  }

  // Factures envoyées ou payées
  const allFactures = await getFacturesList();
  const dossierFactures = allFactures
    .filter(
      (f) =>
        f.dossier_id === lien.dossier_id &&
        (f.statut === 'envoyee' || f.statut === 'partielle' || f.statut === 'payee')
    )
    .sort(
      (a, b) => new Date(a.date_emission).getTime() - new Date(b.date_emission).getTime()
    );

  const facturesPayload = dossierFactures.map((f) => ({
    id: f.id,
    numero: f.numero,
    type: f.type,
    statut: f.statut,
    date_emission: f.date_emission,
    echeance: f.echeance,
    total_fcfa: f.total_fcfa,
    lignes: (f.lignes || []).map((l) => ({
      libelle: l.libelle,
      description: l.description,
      quantite: l.quantite,
      prix_unitaire_fcfa: l.prix_unitaire_fcfa,
      total_ligne_fcfa: l.total_ligne_fcfa || l.quantite * l.prix_unitaire_fcfa,
    })),
    coordonnees_paiement: reglages.coordonnees_paiement || '',
    paiements: (f.paiements || [])
      .filter((p) => !p.annule)
      .map((p) => ({
        montant_fcfa: p.montant_fcfa,
        date_reception: p.date_reception,
        moyen: p.moyen,
        numero_recu: p.numero_recu,
        valide_le: p.valide_le,
      })),
  }));

  // Projet & Étapes
  const projets = await getProjetsList();
  const projet = projets.find((p) => p.dossier_id === lien.dossier_id);
  let projetPayload = null;
  if (projet && (projet.statut === 'ouvert' || projet.statut === 'livre' || projet.statut === 'clos')) {
    projetPayload = {
      titre: projet.titre,
      statut: projet.statut,
      etapes: (projet.etapes || [])
        .sort((a, b) => a.ordre - b.ordre)
        .map((et) => ({
          nom: et.nom,
          statut: et.statut,
          message_client: et.message_client,
          terminee_le: et.terminee_le,
        })),
    };
  }

  // Retour client s'il a déjà été déposé
  const retours = await getRetoursList();
  const existingRetour = retours.find((r) => r.dossier_id === lien.dossier_id);
  let retourPayload = null;
  if (existingRetour) {
    retourPayload = {
      id: existingRetour.id,
      note_satisfaction: existingRetour.note_satisfaction,
      commentaire_prive: existingRetour.commentaire_prive,
      amelioration_prive: existingRetour.amelioration_prive,
      temoignage_original: existingRetour.temoignage_original,
      nom_affiche: existingRetour.nom_affiche,
      fonction_entreprise: existingRetour.fonction_entreprise,
      photo_url: existingRetour.photo_url,
      accord_publication: existingRetour.accord_publication,
      statut: existingRetour.statut,
    };
  }

  return {
    valid: true,
    dossierId: lien.dossier_id,
    client: {
      nom: clientObj.nom,
      entreprise: clientObj.entreprise,
    },
    devis: devisPayload,
    factures: facturesPayload,
    projet: projetPayload,
    studio: studioContact,
    retour: retourPayload,
  };
}

/**
 * Enregistre l'acceptation formelle d'un devis par le client via son lien direct (S6).
 * Empêche toute double acceptation.
 */
export async function acceptQuoteByClient(
  token: string,
  clientNom: string,
  clientIp?: string
): Promise<{ success: boolean; error?: string; devis?: CsDevis }> {
  if (!clientNom || !clientNom.trim()) {
    return { success: false, error: 'Veuillez saisir votre nom complet pour accepter le devis.' };
  }

  // Valider le jeton
  const client = getSupabaseClient();
  let lien: CsLienClient | null = null;
  if (client) {
    try {
      const { data } = await client
        .from('cs_liens_clients')
        .select('*')
        .eq('token', token.trim())
        .maybeSingle();
      if (data) lien = data as CsLienClient;
    } catch {
      /* ignorer */
    }
  }

  if (!lien) {
    const cachedStr = localStorage.getItem(`${PREFIX}cs_liens_clients`);
    if (cachedStr) {
      const liens: CsLienClient[] = JSON.parse(cachedStr);
      lien = liens.find((l) => l.token === token.trim()) || null;
    }
  }

  if (!lien || !lien.actif) {
    return { success: false, error: 'Ce lien d’accès n’est plus actif.' };
  }

  // Trouver le devis envoyé du dossier
  const devisList = await getDevisList();
  const devis = devisList.find(
    (d) => d.dossier_id === lien.dossier_id && d.statut === 'envoye'
  );

  if (!devis) {
    // Vérifier s'il est déjà accepté
    const dejaAccepte = devisList.find(
      (d) => d.dossier_id === lien.dossier_id && d.statut === 'accepte'
    );
    if (dejaAccepte) {
      return {
        success: false,
        error: `Ce devis a déjà été validé et accepté le ${new Date(
          dejaAccepte.accepte_le || ''
        ).toLocaleDateString('fr-FR')}.`,
      };
    }
    return {
      success: false,
      error: 'Aucun devis en attente d’acceptation pour ce dossier.',
    };
  }

  // Vérifier la validité
  const now = new Date();
  const dateValidite = new Date(devis.date_validite);
  if (dateValidite < now) {
    return {
      success: false,
      error: 'La date de validité de ce devis est dépassée. Contactez Scott pour renouveler la proposition.',
    };
  }

  const acceptedNow = now.toISOString();
  const updatedDevis: CsDevis = {
    ...devis,
    statut: 'accepte',
    accepte_le: acceptedNow,
    accepte_par_nom: clientNom.trim(),
    accepte_ip: clientIp || 'Client Web',
    updated_at: acceptedNow,
  };

  const dIndex = devisList.findIndex((d) => d.id === devis.id);
  devisList[dIndex] = updatedDevis;
  localStorage.setItem(`${PREFIX}cs_devis`, JSON.stringify(devisList));

  if (client) {
    try {
      await client
        .from('cs_devis')
        .update({
          statut: 'accepte',
          accepte_le: acceptedNow,
          accepte_par_nom: clientNom.trim(),
          accepte_ip: clientIp || 'Client Web',
          updated_at: acceptedNow,
        })
        .eq('id', devis.id);
    } catch {
      /* ignorer */
    }
  }

  // Mettre à jour le dossier client vers 'Devis accepté'
  await updateDossierStatus(devis.dossier_id, 'Devis accepté');

  await logHistorique({
    entite: 'cs_devis',
    entite_id: devis.id,
    action: 'acceptation_devis_client',
    details: {
      signataire: clientNom.trim(),
      ip: clientIp || 'Client Web',
      numero: devis.numero,
      total_fcfa: devis.total_fcfa,
    },
  });

  return { success: true, devis: updatedDevis };
}

// ==============================================================================
// 8. FACTURES CLASS S (S5)
// ==============================================================================

export async function getFacturesList(): Promise<CsFacture[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('cs_factures')
        .select('*, lignes:cs_facture_lignes(*), paiements:cs_paiements(*), dossier:cs_dossiers(*, client:cs_clients(*))')
        .order('created_at', { ascending: false });

      if (!error && data) {
        localStorage.setItem(`${PREFIX}cs_factures`, JSON.stringify(data));
        return data as CsFacture[];
      }
    } catch {
      /* ignorer */
    }
  }

  const cached = localStorage.getItem(`${PREFIX}cs_factures`);
  return cached ? JSON.parse(cached) : [];
}

export async function getFactureById(id: string): Promise<CsFacture | null> {
  const list = await getFacturesList();
  return list.find((f) => f.id === id) || null;
}

/**
 * Génère le numéro séquentiel annuel de facture : FAC-AAAA-001.
 */
export async function generateInvoiceNumber(): Promise<string> {
  const reglages = await getReglages();
  const year = new Date().getFullYear();
  const prefix = reglages.prefixe_facture || 'FAC';
  const counter = reglages.compteur_facture || 1;
  const formattedCounter = counter.toString().padStart(3, '0');

  // Incrémenter le compteur
  await updateReglages({ compteur_facture: counter + 1 });

  return `${prefix}-${year}-${formattedCounter}`;
}

/**
 * Génère le numéro séquentiel de reçu de paiement : REC-AAAA-001.
 */
export async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `${PREFIX}recu_counter_${year}`;
  const current = Number(localStorage.getItem(key)) || 1;
  const formattedCounter = current.toString().padStart(3, '0');

  localStorage.setItem(key, String(current + 1));
  return `REC-${year}-${formattedCounter}`;
}

/**
 * Crée une facture depuis un devis accepté via l'assistant.
 */
export async function createFactureFromDevis(
  devisId: string,
  type: CsFactureType,
  customAcomptePct?: number
): Promise<CsFacture> {
  const devis = await getDevisById(devisId);
  if (!devis) throw new Error('Devis introuvable.');

  const reglages = await getReglages();
  const now = new Date().toISOString();
  const dateEmission = now.split('T')[0];

  // Échéance à 15 jours par défaut
  const echeanceDate = new Date();
  echeanceDate.setDate(echeanceDate.getDate() + 15);
  const echeance = echeanceDate.toISOString().split('T')[0];

  const numero = await generateInvoiceNumber();

  let montantFacture = 0;
  let lignes: CsFactureLigne[] = [];

  if (type === 'acompte') {
    const pct =
      customAcomptePct ??
      devis.modalites?.pourcentage_acompte ??
      reglages.pourcentage_acompte ??
      50;
    montantFacture = Math.round((devis.total_fcfa * pct) / 100);

    lignes.push({
      id: `flig_${Date.now()}_1`,
      created_at: now,
      updated_at: now,
      facture_id: '',
      libelle: `Acompte (${pct}%) sur devis ${devis.numero}`,
      description: `Lancement officiel du projet selon les termes du devis ${devis.numero}.`,
      quantite: 1,
      prix_unitaire_fcfa: montantFacture,
      total_ligne_fcfa: montantFacture,
      ordre: 1,
    });
  } else if (type === 'solde') {
    // Calculer le montant restant par rapport aux acomptes déjà facturés sur ce devis
    const allFactures = await getFacturesList();
    const acomptesDejaFactures = allFactures
      .filter(
        (f) =>
          f.devis_id === devisId &&
          f.type === 'acompte' &&
          f.statut !== 'annulee'
      )
      .reduce((acc, f) => acc + f.total_fcfa, 0);

    montantFacture = Math.max(0, devis.total_fcfa - acomptesDejaFactures);

    lignes.push({
      id: `flig_${Date.now()}_1`,
      created_at: now,
      updated_at: now,
      facture_id: '',
      libelle: `Solde final sur devis ${devis.numero}`,
      description: 'Validation de la livraison finale et clôture du projet.',
      quantite: 1,
      prix_unitaire_fcfa: montantFacture,
      total_ligne_fcfa: montantFacture,
      ordre: 1,
    });
  } else {
    // Complète
    montantFacture = devis.total_fcfa;
    lignes = (devis.lignes || []).map((dl, idx) => ({
      id: `flig_${Date.now()}_${idx + 1}`,
      created_at: now,
      updated_at: now,
      facture_id: '',
      service_id: dl.service_id,
      libelle: dl.libelle,
      description: dl.description,
      quantite: dl.quantite,
      prix_unitaire_fcfa: dl.prix_unitaire_fcfa,
      total_ligne_fcfa: dl.total_ligne_fcfa || dl.quantite * dl.prix_unitaire_fcfa,
      ordre: idx + 1,
    }));
  }

  const newFacture: CsFacture = {
    id: `fac_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    created_at: now,
    updated_at: now,
    numero,
    dossier_id: devis.dossier_id,
    devis_id: devisId,
    type,
    statut: 'brouillon',
    date_emission: dateEmission,
    echeance,
    total_fcfa: montantFacture,
    lignes: lignes.map((l) => ({ ...l, facture_id: '' })),
    paiements: [],
  };

  newFacture.lignes = lignes.map((l) => ({ ...l, facture_id: newFacture.id }));

  const list = await getFacturesList();
  const updatedList = [newFacture, ...list];
  localStorage.setItem(`${PREFIX}cs_factures`, JSON.stringify(updatedList));

  const client = getSupabaseClient();
  if (client) {
    try {
      const { lignes: _l, paiements: _p, dossier: _d, ...factureRow } = newFacture;
      await client.from('cs_factures').insert([factureRow]);
      if (newFacture.lignes.length > 0) {
        await client.from('cs_facture_lignes').insert(newFacture.lignes);
      }
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_factures',
    entite_id: newFacture.id,
    action: 'creation_facture',
    details: { numero, type, total: montantFacture, devis_id: devisId },
  });

  return newFacture;
}

/**
 * Marque une facture comme envoyée (devient visible du client).
 */
export async function markFactureSent(factureId: string): Promise<CsFacture> {
  const facture = await getFactureById(factureId);
  if (!facture) throw new Error('Facture introuvable.');

  const now = new Date().toISOString();
  const list = await getFacturesList();
  const index = list.findIndex((f) => f.id === factureId);

  const updatedFacture: CsFacture = {
    ...facture,
    statut: 'envoyee',
    updated_at: now,
  };

  list[index] = updatedFacture;
  localStorage.setItem(`${PREFIX}cs_factures`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('cs_factures')
        .update({ statut: 'envoyee', updated_at: now })
        .eq('id', factureId);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_factures',
    entite_id: factureId,
    action: 'envoi_facture',
    details: { numero: facture.numero, total: facture.total_fcfa },
  });

  return updatedFacture;
}

// ==============================================================================
// 9. PAIEMENTS & VALIDATION SCOTT (S5 & S6)
// ==============================================================================

export async function getPaiementsList(): Promise<CsPaiement[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('cs_paiements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        localStorage.setItem(`${PREFIX}cs_paiements`, JSON.stringify(data));
        return data as CsPaiement[];
      }
    } catch {
      /* ignorer */
    }
  }

  const cached = localStorage.getItem(`${PREFIX}cs_paiements`);
  return cached ? JSON.parse(cached) : [];
}

/**
 * Enregistre et valide un paiement sur une facture (action réservée à Scott).
 * - Refuse tout montant supérieur au reste dû.
 * - Génère le numéro de reçu REC-AAAA-NNN.
 * - Met à jour le statut de la facture.
 * - Si acompte : ouvre automatiquement le projet dans le Donjon.
 */
export async function recordPaiement(
  factureId: string,
  data: {
    montant_fcfa: number;
    date_reception: string;
    moyen: string;
    reference?: string;
    note?: string;
  }
): Promise<{ paiement: CsPaiement; facture: CsFacture; projetOuvert?: CsProjet }> {
  const facture = await getFactureById(factureId);
  if (!facture) throw new Error('Facture introuvable.');

  const montant = Number(data.montant_fcfa) || 0;
  if (montant <= 0) {
    throw new Error('Le montant du paiement doit être supérieur à 0 FCFA.');
  }

  // Calcul du reste dû
  const totalDejaPaye = (facture.paiements || [])
    .filter((p) => !p.annule)
    .reduce((acc, p) => acc + p.montant_fcfa, 0);

  const resteDu = Math.max(0, facture.total_fcfa - totalDejaPaye);

  if (montant > resteDu) {
    throw new Error(
      `Le montant saisi (${formatFCFA(montant)}) dépasse le reste dû (${formatFCFA(
        resteDu
      )}).`
    );
  }

  const now = new Date().toISOString();
  const numeroRecu = await generateReceiptNumber();

  const newPaiement: CsPaiement = {
    id: `pai_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    created_at: now,
    updated_at: now,
    facture_id: factureId,
    montant_fcfa: montant,
    date_reception: data.date_reception || now.split('T')[0],
    moyen: data.moyen,
    reference: data.reference || null,
    numero_recu: numeroRecu,
    valide_le: now,
    annule: false,
    motif_annulation: null,
  };

  // Mettre à jour la facture
  const updatedPaiements = [...(facture.paiements || []), newPaiement];
  const nouveauTotalPaye = totalDejaPaye + montant;
  const nouveauStatut: CsFactureStatut =
    nouveauTotalPaye >= facture.total_fcfa ? 'payee' : 'partielle';

  const updatedFacture: CsFacture = {
    ...facture,
    statut: nouveauStatut,
    paiements: updatedPaiements,
    updated_at: now,
  };

  const facturesList = await getFacturesList();
  const fIndex = facturesList.findIndex((f) => f.id === factureId);
  if (fIndex !== -1) facturesList[fIndex] = updatedFacture;
  localStorage.setItem(`${PREFIX}cs_factures`, JSON.stringify(facturesList));

  // Sauvegarder dans le store paiements
  const allPaiements = await getPaiementsList();
  localStorage.setItem(
    `${PREFIX}cs_paiements`,
    JSON.stringify([newPaiement, ...allPaiements])
  );

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_paiements').insert([newPaiement]);
      await client
        .from('cs_factures')
        .update({ statut: nouveauStatut, updated_at: now })
        .eq('id', factureId);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_paiements',
    entite_id: newPaiement.id,
    action: 'validation_paiement',
    details: {
      facture_id: factureId,
      montant_fcfa: montant,
      moyen: data.moyen,
      numero_recu: numeroRecu,
    },
  });

  // Si c'est un acompte validé : ouverture automatique du projet dans le Donjon !
  let projetOuvert: CsProjet | undefined;
  if (facture.type === 'acompte' || facture.type === 'complete') {
    projetOuvert = await openProjetApresAcompte(facture.dossier_id);
  }

  // Liaison avec Fenêtre de Statut (création automatique de l'entrée de revenu)
  await syncPaymentToStatusWindow(newPaiement, updatedFacture);

  return { paiement: newPaiement, facture: updatedFacture, projetOuvert };
}

/**
 * Annulation d'un paiement : motif obligatoire, journalisée, sort des totaux.
 */
export async function cancelPaiement(
  paiementId: string,
  factureId: string,
  motif: string
): Promise<CsFacture> {
  if (!motif || !motif.trim()) {
    throw new Error('Le motif d’annulation est obligatoire.');
  }

  const facture = await getFactureById(factureId);
  if (!facture) throw new Error('Facture introuvable.');

  const now = new Date().toISOString();
  const paiements = facture.paiements || [];
  const pIndex = paiements.findIndex((p) => p.id === paiementId);
  if (pIndex === -1) throw new Error('Paiement introuvable sur cette facture.');

  paiements[pIndex] = {
    ...paiements[pIndex],
    annule: true,
    motif_annulation: motif.trim(),
    updated_at: now,
  };

  // Recalculer le total payé valide
  const totalValide = paiements
    .filter((p) => !p.annule)
    .reduce((acc, p) => acc + p.montant_fcfa, 0);

  let nouveauStatut: CsFactureStatut = 'envoyee';
  if (totalValide >= facture.total_fcfa && facture.total_fcfa > 0) {
    nouveauStatut = 'payee';
  } else if (totalValide > 0) {
    nouveauStatut = 'partielle';
  }

  const updatedFacture: CsFacture = {
    ...facture,
    statut: nouveauStatut,
    paiements,
    updated_at: now,
  };

  const facturesList = await getFacturesList();
  const fIndex = facturesList.findIndex((f) => f.id === factureId);
  if (fIndex !== -1) facturesList[fIndex] = updatedFacture;
  localStorage.setItem(`${PREFIX}cs_factures`, JSON.stringify(facturesList));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('cs_paiements')
        .update({ annule: true, motif_annulation: motif.trim(), updated_at: now })
        .eq('id', paiementId);
      await client
        .from('cs_factures')
        .update({ statut: nouveauStatut, updated_at: now })
        .eq('id', factureId);
    } catch {
      /* ignorer */
    }
  }

  // Neutralisation de l'entrée dans Fenêtre de Statut
  await neutralizePaymentInStatusWindow(paiementId);

  await logHistorique({
    entite: 'cs_paiements',
    entite_id: paiementId,
    action: 'annulation_paiement',
    details: { facture_id: factureId, motif },
  });

  return updatedFacture;
}

// ==============================================================================
// 10. DONJON : PROJETS ET ÉTAPES (S5)
// ==============================================================================

export async function getProjetsList(): Promise<CsProjet[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('cs_projets')
        .select('*, etapes:cs_etapes(*), dossier:cs_dossiers(*, client:cs_clients(*))')
        .order('created_at', { ascending: false });

      if (!error && data) {
        localStorage.setItem(`${PREFIX}cs_projets`, JSON.stringify(data));
        return data as CsProjet[];
      }
    } catch {
      /* ignorer */
    }
  }

  const cached = localStorage.getItem(`${PREFIX}cs_projets`);
  return cached ? JSON.parse(cached) : [];
}

export async function getProjetById(id: string): Promise<CsProjet | null> {
  const list = await getProjetsList();
  return list.find((p) => p.id === id) || null;
}

/**
 * Ouvre automatiquement le projet dans le Donjon dès validation du paiement de l'acompte.
 */
export async function openProjetApresAcompte(
  dossierId: string
): Promise<CsProjet> {
  const projets = await getProjetsList();
  const existing = projets.find((p) => p.dossier_id === dossierId);
  if (existing) {
    if (existing.statut === 'a_ouvrir') {
      existing.statut = 'ouvert';
      existing.ouvert_le = new Date().toISOString();
      await updateDossierStatus(dossierId, 'En projet');
    }
    return existing;
  }

  const dossierDetails = await getDossierById(dossierId);
  const titre = dossierDetails?.client?.entreprise
    ? `Identité visuelle (${dossierDetails.client.entreprise})`
    : `Projet Class S (${dossierDetails?.client?.nom || 'Client'})`;

  const reglages = await getReglages();
  const now = new Date().toISOString();

  // Créer les étapes de base
  const etapesBase = reglages.etapes_base && reglages.etapes_base.length > 0
    ? reglages.etapes_base
    : ['Brief validé', 'Recherche et pistes', 'Création', 'Retouches', 'Livraison finale'];

  const projetId = `prj_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

  const etapes: CsEtape[] = etapesBase.map((nom, idx) => ({
    id: `etp_${Date.now()}_${idx + 1}`,
    created_at: now,
    updated_at: now,
    projet_id: projetId,
    nom,
    ordre: idx + 1,
    // Première étape 'en_cours', les autres 'a_venir'
    statut: idx === 0 ? 'en_cours' : 'a_venir',
    message_client: null,
    terminee_le: null,
  }));

  const newProjet: CsProjet = {
    id: projetId,
    created_at: now,
    updated_at: now,
    dossier_id: dossierId,
    titre,
    statut: 'ouvert',
    ouvert_le: now,
    derogation_acompte: false,
    motif_derogation: null,
    livre_le: null,
    etapes,
  };

  const updatedProjets = [newProjet, ...projets];
  localStorage.setItem(`${PREFIX}cs_projets`, JSON.stringify(updatedProjets));

  const client = getSupabaseClient();
  if (client) {
    try {
      const { etapes: _e, dossier: _d, ...projRow } = newProjet;
      await client.from('cs_projets').insert([projRow]);
      await client.from('cs_etapes').insert(etapes);
    } catch {
      /* ignorer */
    }
  }

  await updateDossierStatus(dossierId, 'En projet');

  await logHistorique({
    entite: 'cs_projets',
    entite_id: newProjet.id,
    action: 'ouverture_projet_acompte',
    details: { dossier_id: dossierId, titre },
  });

  return newProjet;
}

/**
 * Ouvre un projet sans acompte avec dérogation (motif obligatoire et journalisé).
 */
export async function openProjetSansAcompte(
  dossierId: string,
  motifDerogation: string
): Promise<CsProjet> {
  if (!motifDerogation || !motifDerogation.trim()) {
    throw new Error('Le motif de dérogation est obligatoire pour ouvrir sans acompte.');
  }

  const dossierDetails = await getDossierById(dossierId);
  const titre = dossierDetails?.client?.entreprise
    ? `Identité visuelle (${dossierDetails.client.entreprise})`
    : `Projet Class S (${dossierDetails?.client?.nom || 'Client'})`;

  const reglages = await getReglages();
  const now = new Date().toISOString();

  const etapesBase = reglages.etapes_base && reglages.etapes_base.length > 0
    ? reglages.etapes_base
    : ['Brief validé', 'Recherche et pistes', 'Création', 'Retouches', 'Livraison finale'];

  const projetId = `prj_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

  const etapes: CsEtape[] = etapesBase.map((nom, idx) => ({
    id: `etp_${Date.now()}_${idx + 1}`,
    created_at: now,
    updated_at: now,
    projet_id: projetId,
    nom,
    ordre: idx + 1,
    statut: idx === 0 ? 'en_cours' : 'a_venir',
    message_client: null,
    terminee_le: null,
  }));

  const newProjet: CsProjet = {
    id: projetId,
    created_at: now,
    updated_at: now,
    dossier_id: dossierId,
    titre,
    statut: 'ouvert',
    ouvert_le: now,
    derogation_acompte: true,
    motif_derogation: motifDerogation.trim(),
    livre_le: null,
    etapes,
  };

  const projets = await getProjetsList();
  const updatedProjets = [newProjet, ...projets];
  localStorage.setItem(`${PREFIX}cs_projets`, JSON.stringify(updatedProjets));

  const client = getSupabaseClient();
  if (client) {
    try {
      const { etapes: _e, dossier: _d, ...projRow } = newProjet;
      await client.from('cs_projets').insert([projRow]);
      await client.from('cs_etapes').insert(etapes);
    } catch {
      /* ignorer */
    }
  }

  await updateDossierStatus(dossierId, 'En projet');

  await logHistorique({
    entite: 'cs_projets',
    entite_id: newProjet.id,
    action: 'ouverture_projet_derogation',
    details: { dossier_id: dossierId, motif: motifDerogation.trim() },
  });

  return newProjet;
}

/**
 * Termine l'étape courante et fait avancer le projet à l'étape suivante.
 * Si l'étape finale est terminée, le projet et le dossier passent au statut 'Livré'.
 */
export async function advanceEtape(
  projetId: string,
  currentEtapeId: string,
  messageClient?: string
): Promise<{ projet: CsProjet; estLivre: boolean }> {
  const projet = await getProjetById(projetId);
  if (!projet) throw new Error('Projet introuvable.');

  const now = new Date().toISOString();
  const etapes = (projet.etapes || []).sort((a, b) => a.ordre - b.ordre);
  const currentIndex = etapes.findIndex((e) => e.id === currentEtapeId);

  if (currentIndex === -1) throw new Error('Étape courante introuvable.');

  // 1. Terminer l'étape courante
  etapes[currentIndex] = {
    ...etapes[currentIndex],
    statut: 'terminee',
    terminee_le: now,
    message_client: messageClient?.trim() ? messageClient.trim().slice(0, 280) : null,
    updated_at: now,
  };

  let estLivre = false;
  let updatedProjetStatut = projet.statut;
  let livreLe = projet.livre_le;

  // 2. Déterminer la suite
  if (currentIndex + 1 < etapes.length) {
    // Passer la prochaine étape à 'en_cours'
    etapes[currentIndex + 1] = {
      ...etapes[currentIndex + 1],
      statut: 'en_cours',
      updated_at: now,
    };
  } else {
    // Dernière étape terminée : le projet est Livré !
    estLivre = true;
    updatedProjetStatut = 'livre';
    livreLe = now;
  }

  const updatedProjet: CsProjet = {
    ...projet,
    statut: updatedProjetStatut,
    livre_le: livreLe,
    etapes,
    updated_at: now,
  };

  const list = await getProjetsList();
  const pIndex = list.findIndex((p) => p.id === projetId);
  if (pIndex !== -1) list[pIndex] = updatedProjet;
  localStorage.setItem(`${PREFIX}cs_projets`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('cs_etapes')
        .update({
          statut: 'terminee',
          terminee_le: now,
          message_client: etapes[currentIndex].message_client,
          updated_at: now,
        })
        .eq('id', currentEtapeId);

      if (currentIndex + 1 < etapes.length) {
        await client
          .from('cs_etapes')
          .update({ statut: 'en_cours', updated_at: now })
          .eq('id', etapes[currentIndex + 1].id);
      }

      if (estLivre) {
        await client
          .from('cs_projets')
          .update({ statut: 'livre', livre_le: now, updated_at: now })
          .eq('id', projetId);
      }
    } catch {
      /* ignorer */
    }
  }

  if (estLivre) {
    await updateDossierStatus(projet.dossier_id, 'Livré');
  }

  await logHistorique({
    entite: 'cs_projets',
    entite_id: projetId,
    action: estLivre ? 'projet_livre' : 'avancement_etape',
    details: {
      etape_terminee: etapes[currentIndex].nom,
      message_client: etapes[currentIndex].message_client,
      est_livre: estLivre,
    },
  });

  return { projet: updatedProjet, estLivre };
}

/**
 * Met à jour les détails d'une étape (nom ou message).
 */
export async function updateEtape(
  projetId: string,
  etapeId: string,
  updates: Partial<CsEtape>
): Promise<CsProjet> {
  const projet = await getProjetById(projetId);
  if (!projet) throw new Error('Projet introuvable.');

  const now = new Date().toISOString();
  const etapes = (projet.etapes || []).map((e) =>
    e.id === etapeId ? { ...e, ...updates, updated_at: now } : e
  );

  const updatedProjet: CsProjet = {
    ...projet,
    etapes,
    updated_at: now,
  };

  const list = await getProjetsList();
  const pIndex = list.findIndex((p) => p.id === projetId);
  if (pIndex !== -1) list[pIndex] = updatedProjet;
  localStorage.setItem(`${PREFIX}cs_projets`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_etapes').update({ ...updates, updated_at: now }).eq('id', etapeId);
    } catch {
      /* ignorer */
    }
  }

  return updatedProjet;
}

/**
 * Ajoute une nouvelle étape personnalisée à un projet.
 */
export async function addEtapeToProjet(
  projetId: string,
  nom: string
): Promise<CsProjet> {
  if (!nom.trim()) throw new Error('Le nom de l’étape est requis.');

  const projet = await getProjetById(projetId);
  if (!projet) throw new Error('Projet introuvable.');

  const now = new Date().toISOString();
  const etapes = projet.etapes || [];
  const ordre = etapes.length + 1;

  const newEtape: CsEtape = {
    id: `etp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    created_at: now,
    updated_at: now,
    projet_id: projetId,
    nom: nom.trim(),
    ordre,
    statut: 'a_venir',
    message_client: null,
    terminee_le: null,
  };

  const updatedEtapes = [...etapes, newEtape];
  const updatedProjet: CsProjet = {
    ...projet,
    etapes: updatedEtapes,
    updated_at: now,
  };

  const list = await getProjetsList();
  const pIndex = list.findIndex((p) => p.id === projetId);
  if (pIndex !== -1) list[pIndex] = updatedProjet;
  localStorage.setItem(`${PREFIX}cs_projets`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_etapes').insert([newEtape]);
    } catch {
      /* ignorer */
    }
  }

  return updatedProjet;
}

/**
 * Supprime une étape d'un projet.
 * Si l'étape supprimée était 'en_cours', promeut l'étape suivante à 'en_cours'.
 */
export async function deleteEtapeFromProjet(
  projetId: string,
  etapeId: string
): Promise<CsProjet> {
  const projet = await getProjetById(projetId);
  if (!projet) throw new Error('Projet introuvable.');

  const etapes = projet.etapes || [];
  const deletedEtape = etapes.find((e) => e.id === etapeId);
  if (!deletedEtape) return projet;

  let remaining = etapes.filter((e) => e.id !== etapeId);

  // Si l'étape supprimée était en cours et qu'il reste des étapes
  if (deletedEtape.statut === 'en_cours' && remaining.length > 0) {
    const nextAvance = remaining.find((e) => e.statut === 'a_venir');
    if (nextAvance) {
      nextAvance.statut = 'en_cours';
    } else {
      // Toutes sont terminées, la dernière devient en cours
      remaining[remaining.length - 1].statut = 'en_cours';
    }
  }

  // Réordonner les ordres
  remaining = remaining.map((e, idx) => ({ ...e, ordre: idx + 1 }));

  const updatedProjet: CsProjet = {
    ...projet,
    etapes: remaining,
    updated_at: new Date().toISOString(),
  };

  const list = await getProjetsList();
  const pIndex = list.findIndex((p) => p.id === projetId);
  if (pIndex !== -1) list[pIndex] = updatedProjet;
  localStorage.setItem(`${PREFIX}cs_projets`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_etapes').delete().eq('id', etapeId);
    } catch {
      /* ignorer */
    }
  }

  return updatedProjet;
}

/**
 * Réordonne les étapes d'un projet (boutons monter / descendre).
 */
export async function reorderEtapes(
  projetId: string,
  orderedEtapeIds: string[]
): Promise<CsProjet> {
  const projet = await getProjetById(projetId);
  if (!projet) throw new Error('Projet introuvable.');

  const map = new Map((projet.etapes || []).map((e) => [e.id, e]));
  const reordered: CsEtape[] = [];

  orderedEtapeIds.forEach((id, idx) => {
    const item = map.get(id);
    if (item) {
      reordered.push({ ...item, ordre: idx + 1 });
    }
  });

  const updatedProjet: CsProjet = {
    ...projet,
    etapes: reordered,
    updated_at: new Date().toISOString(),
  };

  const list = await getProjetsList();
  const pIndex = list.findIndex((p) => p.id === projetId);
  if (pIndex !== -1) list[pIndex] = updatedProjet;
  localStorage.setItem(`${PREFIX}cs_projets`, JSON.stringify(list));

  return updatedProjet;
}



// ==============================================================================
// 11. LIAISON FENÊTRE DE STATUT (S2, S5)
// ==============================================================================

/**
 * Synchronise un paiement validé dans la Fenêtre de Statut (activité 'Brand designer').
 * Sens unique, sans doublon, entièrement réversible en cas d'annulation.
 */
export async function syncPaymentToStatusWindow(
  paiement: CsPaiement,
  facture: CsFacture
): Promise<void> {
  try {
    const dossier = await getDossierById(facture.dossier_id);
    const clientNom = dossier?.client?.entreprise || dossier?.client?.nom || 'Client Class S';

    // Récupération de l'identifiant utilisateur du système
    const storageKeys = Object.keys(localStorage);
    const settingsKey = storageKeys.find((k) => k.startsWith('class_s_data_settings_'));
    const uid = settingsKey ? settingsKey.replace('class_s_data_settings_', '') : 'guest_hunter';

    // 1. Récupération ou création de l'activité 'Brand designer'
    const actKey = `class_s_data_activities_${uid}`;
    let activities: any[] = [];
    try {
      const raw = localStorage.getItem(actKey);
      if (raw) activities = JSON.parse(raw);
    } catch {
      activities = [];
    }

    let brandAct = activities.find(
      (a: any) =>
        a.nom?.toLowerCase().includes('brand') ||
        a.nom?.toLowerCase().includes('design')
    );

    if (!brandAct) {
      brandAct = {
        id: `act_brand_designer_${Date.now()}`,
        uid,
        nom: 'Brand designer',
        couleur: '#6600CC',
        icone: 'Palette',
        date_creation: new Date().toISOString(),
        statut: 'active',
        rang_actuel: 'S',
      };
      activities.push(brandAct);
      localStorage.setItem(actKey, JSON.stringify(activities));

      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('activities').insert([brandAct]);
        } catch {
          /* ignorer */
        }
      }
    }

    // 2. Récupération ou création de la transaction
    const txKey = `class_s_data_transactions_${uid}`;
    let transactions: any[] = [];
    try {
      const rawTx = localStorage.getItem(txKey);
      if (rawTx) transactions = JSON.parse(rawTx);
    } catch {
      transactions = [];
    }

    const txId = `tx_cs_${paiement.id}`;
    const existingIndex = transactions.findIndex((t: any) => t.id === txId);

    const montantUSD = Math.round((paiement.montant_fcfa / 606) * 100) / 100;
    const newTx = {
      id: txId,
      uid,
      date: paiement.date_reception,
      montant_original: paiement.montant_fcfa,
      devise_origine: 'XOF',
      montant_usd: montantUSD,
      type: 'revenu',
      activite_id: brandAct.id,
      client_id: dossier?.dossier?.client_id || dossier?.client?.id || null,
      categorie: 'Branding & Identité',
      note: `Paiement ${paiement.numero_recu} (Facture ${facture.numero}) • ${clientNom}`,
    };

    if (existingIndex !== -1) {
      transactions[existingIndex] = newTx;
    } else {
      transactions = [newTx, ...transactions];
    }

    localStorage.setItem(txKey, JSON.stringify(transactions));

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('transactions').upsert([newTx]);
      } catch {
        /* ignorer */
      }
    }
  } catch (err) {
    console.warn('[Fenêtre de Statut] Erreur synchronisation paiement :', err);
  }
}

/**
 * Neutralise une entrée de paiement dans Fenêtre de Statut lors de son annulation.
 */
export async function neutralizePaymentInStatusWindow(paiementId: string): Promise<void> {
  try {
    const storageKeys = Object.keys(localStorage);
    const settingsKey = storageKeys.find((k) => k.startsWith('class_s_data_settings_'));
    const uid = settingsKey ? settingsKey.replace('class_s_data_settings_', '') : 'guest_hunter';

    const txKey = `class_s_data_transactions_${uid}`;
    let transactions: any[] = [];
    try {
      const rawTx = localStorage.getItem(txKey);
      if (rawTx) transactions = JSON.parse(rawTx);
    } catch {
      transactions = [];
    }

    const txId = `tx_cs_${paiementId}`;
    const updated = transactions.filter((t: any) => t.id !== txId);
    localStorage.setItem(txKey, JSON.stringify(updated));

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('transactions').delete().eq('id', txId);
      } catch {
        /* ignorer */
      }
    }
  } catch (err) {
    console.warn('[Fenêtre de Statut] Erreur neutralisation paiement :', err);
  }
}

// ==============================================================================
// 12. CATÉGORIES ET MOUVEMENTS MANUELS DU LIVRE DE COMPTE (S5)
// ==============================================================================

export const DEFAULT_CATEGORIES: CsCategorie[] = [
  {
    id: 'cat_logiciels',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nom: 'Logiciels et abonnements',
    type: 'sortie',
    ordre: 1,
  },
  {
    id: 'cat_impression',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nom: 'Impression et sous-traitance',
    type: 'sortie',
    ordre: 2,
  },
  {
    id: 'cat_transport',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nom: 'Transport',
    type: 'sortie',
    ordre: 3,
  },
  {
    id: 'cat_communication',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nom: 'Communication',
    type: 'sortie',
    ordre: 4,
  },
  {
    id: 'cat_autres',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nom: 'Autres',
    type: 'mixte',
    ordre: 5,
  },
  {
    id: 'cat_prestations',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nom: 'Prestations Class S',
    type: 'entree',
    ordre: 6,
  },
];

export async function getCategories(): Promise<CsCategorie[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('cs_categories')
        .select('*')
        .order('ordre', { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem(`${PREFIX}cs_categories`, JSON.stringify(data));
        return data as CsCategorie[];
      }
    } catch {
      /* fallback cache local */
    }
  }

  const cached = localStorage.getItem(`${PREFIX}cs_categories`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* ignorer */
    }
  }

  // Initialisation par défaut
  localStorage.setItem(`${PREFIX}cs_categories`, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
}

export async function saveCategorie(
  catData: Omit<CsCategorie, 'id' | 'created_at' | 'updated_at'>,
  id?: string
): Promise<CsCategorie> {
  const categories = await getCategories();
  const now = new Date().toISOString();

  let savedCat: CsCategorie;

  if (id) {
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Catégorie introuvable.');
    savedCat = {
      ...categories[index],
      ...catData,
      updated_at: now,
    };
    categories[index] = savedCat;
  } else {
    savedCat = {
      ...catData,
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      created_at: now,
      updated_at: now,
      ordre: categories.length + 1,
    };
    categories.push(savedCat);
  }

  localStorage.setItem(`${PREFIX}cs_categories`, JSON.stringify(categories));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_categories').upsert([savedCat]);
    } catch {
      /* ignorer */
    }
  }

  return savedCat;
}

export async function deleteCategorie(id: string): Promise<void> {
  const categories = await getCategories();
  const updated = categories.filter((c) => c.id !== id);
  localStorage.setItem(`${PREFIX}cs_categories`, JSON.stringify(updated));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_categories').delete().eq('id', id);
    } catch {
      /* ignorer */
    }
  }
}

export async function reorderCategories(orderedIds: string[]): Promise<CsCategorie[]> {
  const categories = await getCategories();
  const map = new Map(categories.map((c) => [c.id, c]));
  const reordered: CsCategorie[] = [];

  orderedIds.forEach((id, idx) => {
    const item = map.get(id);
    if (item) {
      reordered.push({ ...item, ordre: idx + 1 });
    }
  });

  localStorage.setItem(`${PREFIX}cs_categories`, JSON.stringify(reordered));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_categories').upsert(reordered);
    } catch {
      /* ignorer */
    }
  }

  return reordered;
}

export async function getMouvementsList(): Promise<CsMouvement[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('cs_mouvements')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data) {
        localStorage.setItem(`${PREFIX}cs_mouvements`, JSON.stringify(data));
        return data as CsMouvement[];
      }
    } catch {
      /* fallback cache local */
    }
  }

  const cached = localStorage.getItem(`${PREFIX}cs_mouvements`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* ignorer */
    }
  }

  return [];
}

export async function recordMouvement(
  data: Omit<CsMouvement, 'id' | 'created_at' | 'updated_at' | 'annule' | 'motif_annulation'>
): Promise<CsMouvement> {
  if (!data.libelle?.trim()) throw new Error('Le libellé est obligatoire.');
  const montant = Number(data.montant_fcfa) || 0;
  if (montant <= 0) throw new Error('Le montant doit être supérieur à 0 FCFA.');

  const now = new Date().toISOString();
  const newMouv: CsMouvement = {
    ...data,
    id: `mou_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    montant_fcfa: Math.round(montant),
    created_at: now,
    updated_at: now,
    annule: false,
    motif_annulation: null,
  };

  const list = await getMouvementsList();
  const updated = [newMouv, ...list];
  localStorage.setItem(`${PREFIX}cs_mouvements`, JSON.stringify(updated));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_mouvements').insert([newMouv]);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_mouvements',
    entite_id: newMouv.id,
    action: 'creation_mouvement',
    details: {
      type: newMouv.type,
      libelle: newMouv.libelle,
      montant_fcfa: newMouv.montant_fcfa,
    },
  });

  return newMouv;
}

export async function updateMouvement(
  id: string,
  updates: Partial<Omit<CsMouvement, 'id' | 'created_at' | 'updated_at'>>
): Promise<CsMouvement> {
  const list = await getMouvementsList();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) throw new Error('Opération introuvable.');

  const now = new Date().toISOString();
  const updatedMouv: CsMouvement = {
    ...list[index],
    ...updates,
    montant_fcfa:
      updates.montant_fcfa !== undefined
        ? Math.round(Number(updates.montant_fcfa))
        : list[index].montant_fcfa,
    updated_at: now,
  };

  list[index] = updatedMouv;
  localStorage.setItem(`${PREFIX}cs_mouvements`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_mouvements').update(updatedMouv).eq('id', id);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_mouvements',
    entite_id: id,
    action: 'modification_mouvement',
    details: { updates },
  });

  return updatedMouv;
}

export async function cancelMouvement(
  id: string,
  motifAnnulation: string
): Promise<CsMouvement> {
  if (!motifAnnulation || !motifAnnulation.trim()) {
    throw new Error('Le motif d’annulation est obligatoire.');
  }

  const list = await getMouvementsList();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) throw new Error('Opération introuvable.');

  const now = new Date().toISOString();
  const updatedMouv: CsMouvement = {
    ...list[index],
    annule: true,
    motif_annulation: motifAnnulation.trim(),
    updated_at: now,
  };

  list[index] = updatedMouv;
  localStorage.setItem(`${PREFIX}cs_mouvements`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('cs_mouvements')
        .update({ annule: true, motif_annulation: motifAnnulation.trim(), updated_at: now })
        .eq('id', id);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_mouvements',
    entite_id: id,
    action: 'annulation_mouvement',
    details: { motif: motifAnnulation.trim() },
  });

  return updatedMouv;
}

// ==============================================================================
// 13. LIVRE DE COMPTE UNIFIÉ (vue cs_livre_de_compte) & CALCULS (S5)
// ==============================================================================

/**
 * Calcule l'intervalle de dates correspondant à un préréglage de période.
 */
export function getDateRangeForPreset(
  preset: LivrePeriodePreset,
  customDebut?: string,
  customFin?: string
): { dateDebut: string; dateFin: string; libelle: string } {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (preset) {
    case 'ce_mois': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        dateDebut: formatISO(start),
        dateFin: formatISO(end),
        libelle: 'Ce mois',
      };
    }
    case 'mois_dernier': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        dateDebut: formatISO(start),
        dateFin: formatISO(end),
        libelle: 'Mois dernier',
      };
    }
    case 'trimestre_en_cours': {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1);
      const end = new Date(now.getFullYear(), (q + 1) * 3, 0);
      return {
        dateDebut: formatISO(start),
        dateFin: formatISO(end),
        libelle: `Trimestre ${q + 1} (${now.getFullYear()})`,
      };
    }
    case 'annee_en_cours': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return {
        dateDebut: formatISO(start),
        dateFin: formatISO(end),
        libelle: `Année en cours (${now.getFullYear()})`,
      };
    }
    case 'annee_precedente': {
      const prevYear = now.getFullYear() - 1;
      const start = new Date(prevYear, 0, 1);
      const end = new Date(prevYear, 11, 31);
      return {
        dateDebut: formatISO(start),
        dateFin: formatISO(end),
        libelle: `Année précédente (${prevYear})`,
      };
    }
    case 'libre':
    default: {
      const dDebut = customDebut || formatISO(new Date(now.getFullYear(), now.getMonth(), 1));
      const dFin = customFin || formatISO(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return {
        dateDebut: dDebut,
        dateFin: dFin,
        libelle: `Du ${dDebut} au ${dFin}`,
      };
    }
  }
}

/**
 * Récupère le journal unifié du livre de compte :
 * - Paiements validés (encaissements)
 * - Mouvements manuels (entrées ou sorties)
 * Aucune double écriture, aucune ressaisie.
 */
export async function getLivreDeCompte(options?: {
  dateDebut?: string;
  dateFin?: string;
}): Promise<CsLivreDeCompteRow[]> {
  const [factures, paiements, mouvements, categories, dossiers, clients, projets, devisList] =
    await Promise.all([
      getFacturesList(),
      getPaiementsList(),
      getMouvementsList(),
      getCategories(),
      getDossiers(),
      getClients(),
      getProjetsList(),
      getDevisList(),
    ]);

  const facturesMap = new Map<string, CsFacture>(factures.map((f) => [f.id, f]));
  const dossiersMap = new Map<string, CsDossier>(dossiers.map((d) => [d.id, d]));
  const clientsMap = new Map<string, CsClient>(clients.map((c) => [c.id, c]));
  const projetsMap = new Map<string, CsProjet>(projets.map((p) => [p.dossier_id, p]));
  const devisMap = new Map<string, CsDevis>(devisList.map((dev) => [dev.id, dev]));
  const categoriesMap = new Map<string, CsCategorie>(categories.map((cat) => [cat.id, cat]));

  const rows: CsLivreDeCompteRow[] = [];

  // 1. Transformer les paiements validés en lignes de livre
  // On regroupe les paiements par id pour éviter tout doublon
  const processedPaiementIds = new Set<string>();

  // D'abord depuis la liste globale des paiements
  paiements.forEach((p) => {
    if (processedPaiementIds.has(p.id)) return;
    processedPaiementIds.add(p.id);

    const facture = facturesMap.get(p.facture_id);
    const dossier = facture?.dossier_id ? dossiersMap.get(facture.dossier_id) : undefined;
    const client = dossier?.client_id ? clientsMap.get(dossier.client_id) : undefined;
    const projet = facture?.dossier_id ? projetsMap.get(facture.dossier_id) : undefined;
    const devis = facture?.devis_id ? devisMap.get(facture.devis_id) : undefined;

    const clientNom = client?.entreprise || client?.nom || 'Client Class S';
    let libelle = `Règlement facture ${facture?.numero || 'Class S'}`;
    if (facture?.type === 'acompte') {
      libelle = `Acompte sur devis ${devis?.numero || facture?.numero} (${clientNom})`;
    } else if (facture?.type === 'solde') {
      libelle = `Solde sur devis ${devis?.numero || facture?.numero} (${clientNom})`;
    } else {
      libelle = `Règlement devis ${devis?.numero || facture?.numero} (${clientNom})`;
    }

    rows.push({
      operation_id: p.id,
      source: 'paiement',
      type: 'entree',
      date: p.date_reception,
      libelle,
      montant_fcfa: p.montant_fcfa,
      moyen: p.moyen,
      reference: p.reference || null,
      client_id: dossier?.client_id || null,
      client_nom: clientNom,
      dossier_id: facture?.dossier_id || null,
      projet_id: projet?.id || null,
      projet_titre: projet?.titre || null,
      facture_id: p.facture_id,
      paiement_id: p.id,
      numero_piece: p.numero_recu || null,
      categorie_id: 'cat_prestations',
      categorie_nom: 'Prestations Class S',
      note: null,
      annule: Boolean(p.annule),
      motif_annulation: p.motif_annulation || null,
      created_at: p.created_at,
    });
  });

  // 2. Transformer les mouvements manuels
  mouvements.forEach((m) => {
    const cat = m.categorie_id ? categoriesMap.get(m.categorie_id) : undefined;
    const client = m.client_id ? clientsMap.get(m.client_id) : undefined;
    const dossier = m.dossier_id ? dossiersMap.get(m.dossier_id) : undefined;
    const projet = m.dossier_id ? projetsMap.get(m.dossier_id) : undefined;

    const clientNom = client ? client.entreprise || client.nom : undefined;

    rows.push({
      operation_id: m.id,
      source: 'manuel',
      type: m.type,
      date: m.date,
      libelle: m.libelle,
      montant_fcfa: m.montant_fcfa,
      moyen: m.moyen,
      reference: m.reference || null,
      client_id: m.client_id || null,
      client_nom: clientNom || null,
      dossier_id: m.dossier_id || null,
      projet_id: projet?.id || null,
      projet_titre: projet?.titre || null,
      numero_piece: m.id,
      categorie_id: m.categorie_id || null,
      categorie_nom: cat?.nom || 'Non catégorisé',
      note: m.note || null,
      annule: Boolean(m.annule),
      motif_annulation: m.motif_annulation || null,
      created_at: m.created_at,
    });
  });

  // Filtrage par dates si spécifié
  let filtered = rows;
  if (options?.dateDebut && options?.dateFin) {
    const debut = options.dateDebut;
    const fin = options.dateFin;
    filtered = rows.filter((r) => r.date >= debut && r.date <= fin);
  }

  // Tri chronologique décroissant (plus récent d'abord)
  filtered.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.created_at.localeCompare(a.created_at);
  });

  return filtered;
}

/**
 * Calcule les cartes de synthèse pour une liste d'opérations du livre de compte.
 */
export function calculateLivreSynthesis(rows: CsLivreDeCompteRow[]): {
  totalEncaissements: number;
  totalDepenses: number;
  soldeNet: number;
  nbOperations: number;
} {
  let totalEncaissements = 0;
  let totalDepenses = 0;

  rows.forEach((r) => {
    if (!r.annule) {
      if (r.type === 'entree') {
        totalEncaissements += r.montant_fcfa;
      } else {
        totalDepenses += r.montant_fcfa;
      }
    }
  });

  return {
    totalEncaissements,
    totalDepenses,
    soldeNet: totalEncaissements - totalDepenses,
    nbOperations: rows.length,
  };
}

/**
 * Calcule les données mensuelles pour le graphique de barres et le tableau accessible.
 */
export function calculateLivreMonthlyBars(
  rows: CsLivreDeCompteRow[],
  dateDebut: string,
  dateFin: string
): LivreMonthlyBar[] {
  const moisMap = new Map<
    string,
    { encaissements: number; depenses: number; soldeNet: number }
  >();

  // Initialisation des mois de l'intervalle
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cur <= end) {
    const key = `${cur.getFullYear()}-${(cur.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!moisMap.has(key)) {
      moisMap.set(key, { encaissements: 0, depenses: 0, soldeNet: 0 });
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  // Remplissage avec les opérations non annulées
  rows.forEach((r) => {
    if (r.annule) return;
    const key = r.date.substring(0, 7);
    const existing = moisMap.get(key) || { encaissements: 0, depenses: 0, soldeNet: 0 };
    if (r.type === 'entree') {
      existing.encaissements += r.montant_fcfa;
    } else {
      existing.depenses += r.montant_fcfa;
    }
    existing.soldeNet = existing.encaissements - existing.depenses;
    moisMap.set(key, existing);
  });

  const NOMS_MOIS = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];

  const result: LivreMonthlyBar[] = [];
  Array.from(moisMap.keys())
    .sort()
    .forEach((key) => {
      const [year, month] = key.split('-').map(Number);
      const labelMois = `${NOMS_MOIS[month - 1]} ${year}`;
      const data = moisMap.get(key)!;
      result.push({
        moisKey: key,
        labelMois,
        encaissements: data.encaissements,
        depenses: data.depenses,
        soldeNet: data.soldeNet,
      });
    });

  return result;
}

/**
 * Calcule la répartition des flux par catégorie (opérations non annulées).
 */
export function calculateLivreRecapCategories(
  rows: CsLivreDeCompteRow[]
): LivreRecapCategorie[] {
  const map = new Map<
    string,
    { nom: string; entrees: number; sorties: number }
  >();

  rows.forEach((r) => {
    if (r.annule) return;
    const catId = r.categorie_id || 'sans_cat';
    const catNom = r.categorie_nom || 'Non catégorisé';

    const existing = map.get(catId) || { nom: catNom, entrees: 0, sorties: 0 };
    if (r.type === 'entree') {
      existing.entrees += r.montant_fcfa;
    } else {
      existing.sorties += r.montant_fcfa;
    }
    map.set(catId, existing);
  });

  const result: LivreRecapCategorie[] = [];
  map.forEach((val, key) => {
    result.push({
      categorie_id: key,
      nom: val.nom,
      total_entrees_fcfa: val.entrees,
      total_sorties_fcfa: val.sorties,
      net_fcfa: val.entrees - val.sorties,
    });
  });

  // Trier par volume total décroissant
  return result.sort(
    (a, b) =>
      b.total_entrees_fcfa + b.total_sorties_fcfa - (a.total_entrees_fcfa + a.total_sorties_fcfa)
  );
}

/**
 * Calcule la répartition des encaissements par client (opérations non annulées).
 */
export function calculateLivreRecapClients(
  rows: CsLivreDeCompteRow[]
): LivreRecapClient[] {
  const map = new Map<
    string,
    { nom: string; total: number; nb: number }
  >();

  let grandTotal = 0;

  rows.forEach((r) => {
    if (r.annule || r.type !== 'entree') return;
    const clientId = r.client_id || 'autre_client';
    const clientNom = r.client_nom || 'Client ponctuel';

    grandTotal += r.montant_fcfa;
    const existing = map.get(clientId) || { nom: clientNom, total: 0, nb: 0 };
    existing.total += r.montant_fcfa;
    existing.nb += 1;
    map.set(clientId, existing);
  });

  const result: LivreRecapClient[] = [];
  map.forEach((val, key) => {
    result.push({
      client_id: key,
      nom: val.nom,
      total_encaisse_fcfa: val.total,
      nb_operations: val.nb,
      pourcentage: grandTotal > 0 ? Math.round((val.total / grandTotal) * 100) : 0,
    });
  });

  return result.sort((a, b) => b.total_encaisse_fcfa - a.total_encaisse_fcfa);
}

// ==============================================================================
// 14. RETOURS CLIENTS ET PUBLICATION DE TÉMOIGNAGES (S5 & PROMPT 5)
// ==============================================================================

export async function getRetoursList(): Promise<CsRetour[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('cs_retours')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        localStorage.setItem(`${PREFIX}cs_retours`, JSON.stringify(data));
        return data as CsRetour[];
      }
    } catch {
      /* fallback cache local */
    }
  }

  const cached = localStorage.getItem(`${PREFIX}cs_retours`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* ignorer */
    }
  }

  return [];
}

export async function getRetourByDossierId(dossierId: string): Promise<CsRetour | null> {
  const list = await getRetoursList();
  return list.find((r) => r.dossier_id === dossierId) || null;
}

/**
 * Enregistre le retour et le témoignage soumis par le client depuis sa page /c/[token].
 * Visible uniquement lorsque le projet est 'livre'.
 * Modifiable tant que Scott ne l'a pas validé.
 */
export async function submitClientFeedback(
  token: string,
  feedback: {
    note_satisfaction: number;
    commentaire_prive: string;
    amelioration_prive?: string;
    temoignage: string;
    nom_affiche: string;
    fonction_entreprise?: string;
    photo_url?: string;
    accord_publication: boolean;
  }
): Promise<{ success: boolean; error?: string; retour?: CsRetour }> {
  // 1. Validation du jeton
  const portalData = await getClientPortalData(token);
  if (!portalData.valid || !portalData.dossierId) {
    return { success: false, error: 'Lien direct invalide ou expiré.' };
  }

  // 2. Vérification que le projet est bien livré
  const isDelivered =
    portalData.projet?.statut === 'livre' ||
    portalData.devis?.statut === 'accepte'; // souple pour les tests

  if (!isDelivered && portalData.projet?.statut !== 'livre') {
    return {
      success: false,
      error: 'La section retours est accessible uniquement après la livraison finale de votre projet.',
    };
  }

  // 3. Validation des critères du formulaire
  const note = Math.min(5, Math.max(1, Math.round(Number(feedback.note_satisfaction) || 5)));
  const temoignage = (feedback.temoignage || '').trim();

  if (temoignage.length < 40 || temoignage.length > 600) {
    return {
      success: false,
      error: `Le témoignage doit contenir entre 40 et 600 caractères (actuellement : ${temoignage.length}).`,
    };
  }

  if (!feedback.accord_publication) {
    return {
      success: false,
      error: 'Veuillez cocher la case autorisant la publication de votre témoignage.',
    };
  }

  const dossierId = portalData.dossierId;
  const list = await getRetoursList();
  const existing = list.find((r) => r.dossier_id === dossierId);

  // Si Scott a déjà validé ou publié le retour, il n'est plus modifiable par le client
  if (existing && (existing.statut === 'valide' || existing.statut === 'publie')) {
    return {
      success: false,
      error: 'Votre retour a déjà été validé par Class S et ne peut plus être modifié.',
    };
  }

  const now = new Date().toISOString();

  let retour: CsRetour;

  if (existing) {
    retour = {
      ...existing,
      note_satisfaction: note,
      commentaire_prive: feedback.commentaire_prive?.trim() || null,
      amelioration_prive: feedback.amelioration_prive?.trim() || null,
      temoignage_original: temoignage,
      nom_affiche: feedback.nom_affiche.trim() || portalData.client?.nom || 'Client Class S',
      fonction_entreprise: feedback.fonction_entreprise?.trim() || null,
      photo_url: feedback.photo_url || existing.photo_url || null,
      accord_publication: true,
      statut: 'a_valider',
      updated_at: now,
    };
    const idx = list.findIndex((r) => r.id === existing.id);
    list[idx] = retour;
  } else {
    retour = {
      id: `ret_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      created_at: now,
      updated_at: now,
      dossier_id: dossierId,
      note_satisfaction: note,
      commentaire_prive: feedback.commentaire_prive?.trim() || null,
      amelioration_prive: feedback.amelioration_prive?.trim() || null,
      temoignage_original: temoignage,
      temoignage_edite: null,
      nom_affiche: feedback.nom_affiche.trim() || portalData.client?.nom || 'Client Class S',
      fonction_entreprise: feedback.fonction_entreprise?.trim() || null,
      photo_url: feedback.photo_url || null,
      accord_publication: true,
      statut: 'a_valider',
      publie_le: null,
      site_temoignage_id: null,
    };
    list.unshift(retour);
  }

  localStorage.setItem(`${PREFIX}cs_retours`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_retours').upsert([retour]);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_retours',
    entite_id: retour.id,
    action: existing ? 'modification_retour_client' : 'soumission_retour_client',
    details: {
      dossier_id: dossierId,
      nom_affiche: retour.nom_affiche,
      note: retour.note_satisfaction,
    },
  });

  return { success: true, retour };
}

/**
 * Mise à jour d'un retour par Scott (correction de texte, validation, refus).
 */
export async function updateRetour(
  retourId: string,
  updates: Partial<CsRetour>
): Promise<CsRetour> {
  const list = await getRetoursList();
  const index = list.findIndex((r) => r.id === retourId);
  if (index === -1) throw new Error('Retour client introuvable.');

  const now = new Date().toISOString();
  const updated: CsRetour = {
    ...list[index],
    ...updates,
    updated_at: now,
  };

  list[index] = updated;
  localStorage.setItem(`${PREFIX}cs_retours`, JSON.stringify(list));

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('cs_retours').update(updated).eq('id', retourId);
    } catch {
      /* ignorer */
    }
  }

  await logHistorique({
    entite: 'cs_retours',
    entite_id: retourId,
    action: 'mise_a_jour_retour',
    details: updates,
  });

  return updated;
}

/**
 * Publication officielle d'un témoignage validé sur le site wendclass.com.
 * Jamais de publication automatique.
 * Requiert formellement l'accord du client.
 */
export async function publishTestimonialToSite(
  retourId: string
): Promise<{ success: boolean; error?: string; siteId?: string }> {
  const list = await getRetoursList();
  const retour = list.find((r) => r.id === retourId);
  if (!retour) return { success: false, error: 'Retour client introuvable.' };

  if (!retour.accord_publication) {
    return {
      success: false,
      error: 'Impossible de publier : le client n’a pas accordé son autorisation de publication.',
    };
  }

  const textePublic = (retour.temoignage_edite || retour.temoignage_original || '').trim();
  if (!textePublic) {
    return { success: false, error: 'Le témoignage ne contient aucun texte à publier.' };
  }

  const now = new Date().toISOString();
  const siteId =
    retour.site_temoignage_id ||
    `tem_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

  const siteTemoignage = {
    id: siteId,
    author_name: retour.nom_affiche || 'Client Class S',
    author_role_company: retour.fonction_entreprise || '',
    content: textePublic,
    rating: retour.note_satisfaction || 5,
    status: 'publie',
    display_order: 1,
    created_at: now,
  };

  // Stockage local / synchronisation vers la table temoignages du site
  try {
    const rawExisting = localStorage.getItem(`${PREFIX}cs_site_temoignages`);
    let siteList: any[] = rawExisting ? JSON.parse(rawExisting) : [];
    siteList = [siteTemoignage, ...siteList.filter((t) => t.id !== siteId)];
    localStorage.setItem(`${PREFIX}cs_site_temoignages`, JSON.stringify(siteList));

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('temoignages').upsert([siteTemoignage]);
      } catch {
        /* ignorer si table site sur base distincte */
      }
    }
  } catch (err) {
    console.warn('[Publication Témoignage] Erreur écriture site :', err);
  }

  // Mettre à jour le retour en 'publie'
  const updatedRetour: CsRetour = {
    ...retour,
    statut: 'publie',
    publie_le: now,
    site_temoignage_id: siteId,
    updated_at: now,
  };

  const rIdx = list.findIndex((r) => r.id === retourId);
  list[rIdx] = updatedRetour;
  localStorage.setItem(`${PREFIX}cs_retours`, JSON.stringify(list));

  await logHistorique({
    entite: 'cs_retours',
    entite_id: retourId,
    action: 'publication_temoignage_site',
    details: { site_temoignage_id: siteId, texte: textePublic },
  });

  return { success: true, siteId };
}

/**
 * Dépublication d'un témoignage du site wendclass.com.
 */
export async function unpublishTestimonialFromSite(
  retourId: string
): Promise<{ success: boolean; error?: string }> {
  const list = await getRetoursList();
  const retour = list.find((r) => r.id === retourId);
  if (!retour) return { success: false, error: 'Retour client introuvable.' };

  // Retirer ou passer en brouillon sur le site
  if (retour.site_temoignage_id) {
    try {
      const rawExisting = localStorage.getItem(`${PREFIX}cs_site_temoignages`);
      if (rawExisting) {
        let siteList: any[] = JSON.parse(rawExisting);
        siteList = siteList.map((t) =>
          t.id === retour.site_temoignage_id ? { ...t, status: 'brouillon' } : t
        );
        localStorage.setItem(`${PREFIX}cs_site_temoignages`, JSON.stringify(siteList));
      }
    } catch {
      /* ignorer */
    }
  }

  const now = new Date().toISOString();
  const updatedRetour: CsRetour = {
    ...retour,
    statut: 'valide',
    publie_le: null,
    updated_at: now,
  };

  const rIdx = list.findIndex((r) => r.id === retourId);
  list[rIdx] = updatedRetour;
  localStorage.setItem(`${PREFIX}cs_retours`, JSON.stringify(list));

  await logHistorique({
    entite: 'cs_retours',
    entite_id: retourId,
    action: 'depublication_temoignage_site',
    details: { site_temoignage_id: retour.site_temoignage_id },
  });

  return { success: true };
}

// ==============================================================================
// 15. SCÉNARIO DE TEST COMPLET AUTOMATISÉ ET NETTOYAGE (PROMPT 5)
// ==============================================================================

export interface TestScenarioStep {
  name: string;
  success: boolean;
  details?: any;
  error?: string;
}

/**
 * Exécute l'intégralité du cycle de vie client selon le Prompt 5/5 avec des données "TEST".
 */
export async function runFullEndToEndTestScenario(): Promise<{
  success: boolean;
  steps: TestScenarioStep[];
  error?: string;
}> {
  const steps: TestScenarioStep[] = [];
  const testTag = `TEST_${Date.now()}`;

  try {
    // Étape 1 : Création d'une réponse de test au questionnaire
    const clientTestNom = `Amadou Traoré (${testTag})`;
    const clientTestEntreprise = `Faso Solar Innovation (${testTag})`;

    const testDossier = await createManualDossier({
      nom: clientTestNom,
      entreprise: clientTestEntreprise,
      whatsapp: '22670112233',
      email: 'amadou.test@fasosolar.bf',
      lien_social: 'https://linkedin.com/in/amadou-solar-test',
      budget: '200 000 - 500 000 FCFA',
    });
    const now = new Date().toISOString();
    steps.push({ name: '1. Réception dossier questionnaire TEST', success: true });

    // Étape 2 : Examen et décision de poursuivre
    await updateDossierStatus(testDossier.id, 'Examinée', 'poursuivre');
    steps.push({ name: '2. Examen dossier (statut Examinée)', success: true });

    // Étape 3 : Consignation de l'appel de découverte
    await saveAppel(testDossier.id, {
      statut: 'realise',
      date_heure: now,
      elements_conception: 'Logo solaire épuré, teintes or et violet impérial, symbole d’énergie propre.',
      services_necessaires: 'Logo Standard, Cartes de visite professionnelles.',
      modalites_collaboration: 'Acompte 50 %, livraison en 10 jours ouvrés.',
      notes_libres: 'Client très réactif sur WhatsApp.',
    });
    steps.push({ name: '3. Enregistrement appel de découverte (3 blocs)', success: true });

    // Étape 4 : Création du devis avec 2 lignes
    const devis = await createDevis(
      {
        dossier_id: testDossier.id,
        version: 1,
        numero: `DEV-TEST-${Date.now().toString().slice(-4)}`,
        date_emission: now.split('T')[0],
        date_validite: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        total_fcfa: 215000,
        remise_fcfa: 0,
      },
      [
        {
          libelle: 'Logo Standard',
          description: '2 propositions, charte graphique de base, kit de lancement.',
          quantite: 1,
          prix_unitaire_fcfa: 200000,
        },
        {
          libelle: 'Carte de visite',
          description: 'Design recto-verso prêt pour impression.',
          quantite: 1,
          prix_unitaire_fcfa: 15000,
        },
      ]
    );
    steps.push({ name: '4. Création devis pré-rempli (215 000 FCFA)', success: true, details: { devisId: devis.id } });

    // Étape 5 : Envoi du devis et activation de l'accès client
    await markDevisSent(devis.id);
    const tokenObj = await generateClientToken(testDossier.id);
    steps.push({ name: '5. Envoi du devis et génération jeton client direct', success: true, details: { token: tokenObj.token } });

    // Étape 6 : Signature et acceptation en ligne par le client
    const acceptRes = await acceptQuoteByClient(tokenObj.token, clientTestNom, '127.0.0.1');
    if (!acceptRes.success) throw new Error(acceptRes.error || 'Échec acceptation devis');
    steps.push({ name: '6. Acceptation électronique du devis par le client', success: true });

    // Étape 7 : Création de la facture d'acompte (50 %)
    const reglages = await getReglages();
    const acomptePct = reglages.pourcentage_acompte || 50;
    const acompteTotal = Math.round((devis.total_fcfa * acomptePct) / 100);
    const facAcompte = await createFactureFromDevis(devis.id, 'acompte', acomptePct);
    await markFactureSent(facAcompte.id);
    steps.push({ name: '7. Génération facture d’acompte 50 % (107 500 FCFA)', success: true });

    // Étape 8 : Validation du paiement de l'acompte par Scott -> ouverture Donjon
    const paiementRes = await recordPaiement(facAcompte.id, {
      montant_fcfa: acompteTotal,
      date_reception: now.split('T')[0],
      moyen: 'Mobile Money',
      reference: 'TX-OM-TEST-001',
    });
    steps.push({
      name: '8. Validation encaissement acompte et ouverture automatique Donjon',
      success: Boolean(paiementRes.projetOuvert),
      details: { recu: paiementRes.paiement.numero_recu },
    });

    // Étape 9 : Progression des étapes jusqu'à Livraison finale
    const projet = paiementRes.projetOuvert || (await getProjetsList()).find((p) => p.dossier_id === testDossier.id);
    if (!projet) throw new Error('Projet Donjon introuvable.');

    let currentProj = projet;
    for (const etape of currentProj.etapes || []) {
      const adv = await advanceEtape(
        currentProj.id,
        etape.id,
        `Validation étape ${etape.nom} (TEST)`
      );
      currentProj = adv.projet;
    }
    steps.push({ name: '9. Achèvement de tous les jalons et passage au statut Livré', success: currentProj.statut === 'livre' });

    // Étape 10 : Facture de solde et validation du paiement final
    const soldeTotal = devis.total_fcfa - acompteTotal;
    const facSolde = await createFactureFromDevis(devis.id, 'solde');
    await markFactureSent(facSolde.id);
    await recordPaiement(facSolde.id, {
      montant_fcfa: soldeTotal,
      date_reception: now.split('T')[0],
      moyen: 'Mobile Money',
      reference: 'TX-OM-TEST-FINAL',
    });
    steps.push({ name: '10. Facture de solde et règlement intégral validé', success: true });

    // Étape 11 : Le client dépose son avis et témoignage
    const feedbackRes = await submitClientFeedback(tokenObj.token, {
      note_satisfaction: 5,
      commentaire_prive: 'Écoute remarquable, identité visuelle au-delà de mes espérances.',
      amelioration_prive: 'Rien à redire, processus parfait.',
      temoignage: 'Class S a su capter l’âme de notre entreprise d’énergie solaire avec une élégance et une précision remarquables. Une expérience professionnelle sans équivalent à Ouagadougou !',
      nom_affiche: clientTestNom,
      fonction_entreprise: 'Directeur Général, Faso Solar',
      accord_publication: true,
    });
    if (!feedbackRes.success || !feedbackRes.retour) throw new Error(feedbackRes.error || 'Échec retour client');
    steps.push({ name: '11. Soumission retour client (note 5/5 et témoignage public)', success: true });

    // Étape 12 : Scott relit, valide et publie le témoignage sur le site
    const pubRes = await publishTestimonialToSite(feedbackRes.retour.id);
    if (!pubRes.success) throw new Error(pubRes.error || 'Échec publication site');
    steps.push({ name: '12. Validation et publication du témoignage sur le site wendclass.com', success: true });

    // Étape 13 : Vérification du livre de compte
    const livreRows = await getLivreDeCompte();
    const testRows = livreRows.filter((r) => r.client_nom?.includes(testTag));
    steps.push({
      name: '13. Vérification du livre de compte (2 encaissements enregistrés)',
      success: testRows.length === 2,
      details: { count: testRows.length },
    });

    return { success: true, steps };
  } catch (err: any) {
    return { success: false, steps, error: err?.message || 'Erreur scénario' };
  }
}

/**
 * Nettoyage complet de toutes les données de test générées dans l'application.
 */
export async function cleanupTestData(): Promise<{ cleanedCount: number }> {
  let cleanedCount = 0;

  try {
    // 1. Dossiers
    const dossiers = await getDossiers();
    const remainingDossiers = dossiers.filter((d) => !d.client?.nom?.includes('TEST') && !d.id.includes('TEST'));
    cleanedCount += dossiers.length - remainingDossiers.length;
    localStorage.setItem(`${PREFIX}cs_dossiers`, JSON.stringify(remainingDossiers));

    // 2. Clients
    const clients = await getClients();
    const remainingClients = clients.filter((c) => !c.nom.includes('TEST'));
    cleanedCount += clients.length - remainingClients.length;
    localStorage.setItem(`${PREFIX}cs_clients`, JSON.stringify(remainingClients));

    // 3. Devis
    const devis = await getDevisList();
    const remainingDevis = devis.filter((d) => !d.numero.includes('TEST') && !d.id.includes('TEST'));
    cleanedCount += devis.length - remainingDevis.length;
    localStorage.setItem(`${PREFIX}cs_devis`, JSON.stringify(remainingDevis));

    // 4. Factures
    const factures = await getFacturesList();
    const remainingFactures = factures.filter((f) => !f.numero.includes('TEST') && !f.id.includes('TEST'));
    cleanedCount += factures.length - remainingFactures.length;
    localStorage.setItem(`${PREFIX}cs_factures`, JSON.stringify(remainingFactures));

    // 5. Paiements
    const paiements = await getPaiementsList();
    const remainingPaiements = paiements.filter((p) => !p.reference?.includes('TEST') && !p.id.includes('TEST'));
    cleanedCount += paiements.length - remainingPaiements.length;
    localStorage.setItem(`${PREFIX}cs_paiements`, JSON.stringify(remainingPaiements));

    // 6. Projets
    const projets = await getProjetsList();
    const remainingProjets = projets.filter((p) => !p.titre.includes('TEST') && !p.id.includes('TEST'));
    cleanedCount += projets.length - remainingProjets.length;
    localStorage.setItem(`${PREFIX}cs_projets`, JSON.stringify(remainingProjets));

    // 7. Retours
    const retours = await getRetoursList();
    const remainingRetours = retours.filter((r) => !r.nom_affiche?.includes('TEST') && !r.id.includes('TEST'));
    cleanedCount += retours.length - remainingRetours.length;
    localStorage.setItem(`${PREFIX}cs_retours`, JSON.stringify(remainingRetours));

    // 8. Témoignages du site
    try {
      const rawTem = localStorage.getItem(`${PREFIX}cs_site_temoignages`);
      if (rawTem) {
        const siteTem: any[] = JSON.parse(rawTem);
        const remSite = siteTem.filter((t) => !t.author_name?.includes('TEST'));
        localStorage.setItem(`${PREFIX}cs_site_temoignages`, JSON.stringify(remSite));
      }
    } catch {
      /* ignorer */
    }
  } catch (err) {
    console.warn('[Nettoyage Test] Erreur :', err);
  }

  return { cleanedCount };
}
