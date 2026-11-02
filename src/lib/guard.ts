import { UserProfile } from '../context/AuthContext';
import { ActivePage } from '../types';

export const SUPER_ADMIN_EMAIL =
  ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPER_ADMIN_EMAIL) || 'wendclasss@gmail.com')
    .toLowerCase()
    .trim();

/**
 * Vérifie si l'utilisateur connecté est le super administrateur de Class S.
 */
export function isSuperAdmin(user?: UserProfile | null): boolean {
  if (!user || !user.email) return false;
  return user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
}

/**
 * Liste des modules réservés exclusivement à Scott Nana (Class S).
 */
export const CLASS_S_MODULES: ActivePage[] = [
  'shadows',
  'grimoire',
  'portal',
  'dungeon',
  'settings_class_s',
];

export function isClassSModule(page: ActivePage): boolean {
  return CLASS_S_MODULES.includes(page);
}
