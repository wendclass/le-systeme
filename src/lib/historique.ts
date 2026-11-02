import { getSupabaseClient } from './supabase';

export interface CsHistoriqueEntry {
  id?: string;
  entite: string;
  entite_id: string;
  action: string;
  details?: Record<string, any>;
  auteur?: string;
  date?: string;
}

export const SUPER_ADMIN_EMAIL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPER_ADMIN_EMAIL) || 'wendclasss@gmail.com';

/**
 * Enregistre une trace immuable dans cs_historique.
 * Chaque changement critique (statut, paiement, devis, acompte, dérogation) y écrit une ligne.
 */
export async function logHistorique({
  entite,
  entite_id,
  action,
  details = {},
  auteur = SUPER_ADMIN_EMAIL,
}: CsHistoriqueEntry): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('[Historique] Pas de client Supabase connecté, trace locale ignorée :', action);
    return false;
  }

  try {
    const { error } = await client.from('cs_historique').insert([
      {
        entite,
        entite_id,
        action,
        details,
        auteur,
        date: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('[Historique] Erreur écriture cs_historique :', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Historique] Exception inattendue :', err);
    return false;
  }
}
