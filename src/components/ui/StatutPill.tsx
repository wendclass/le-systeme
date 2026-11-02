import React from 'react';
import { Badge, BadgeVariant } from './Badge';

export type StatusCategory =
  | 'nouvelle'
  | 'examinee'
  | 'appel_planifie'
  | 'appel_realise'
  | 'devis_preparation'
  | 'devis_envoye'
  | 'devis_accepte'
  | 'en_projet'
  | 'livre'
  | 'clos'
  | 'decline'
  | 'sans_suite'
  | 'brouillon'
  | 'pret'
  | 'envoye'
  | 'accepte'
  | 'refuse'
  | 'expire'
  | 'remplace'
  | 'partielle'
  | 'payee'
  | 'annulee'
  | 'a_venir'
  | 'en_cours'
  | 'terminee'
  | string;

export interface StatutPillProps {
  status?: StatusCategory;
  statut?: StatusCategory;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const StatutPill: React.FC<StatutPillProps> = ({
  status,
  statut,
  size = 'md',
  label,
  className,
}) => {
  const effectiveStatus = (status || statut || 'brouillon');
  const normalized = effectiveStatus.toLowerCase().replace(/[\s-]/g, '_');

  let variant: BadgeVariant = 'default';
  let defaultLabel = label || effectiveStatus;

  switch (normalized) {
    case 'nouvelle':
    case 'nouveau':
      variant = 'info';
      defaultLabel = label || 'Nouvelle';
      break;
    case 'examinee':
      variant = 'purple';
      defaultLabel = label || 'Examinée';
      break;
    case 'appel_planifie':
      variant = 'warning';
      defaultLabel = label || 'Appel planifié';
      break;
    case 'appel_realise':
      variant = 'purple';
      defaultLabel = label || 'Appel réalisé';
      break;
    case 'devis_preparation':
    case 'brouillon':
      variant = 'default';
      defaultLabel = label || (normalized === 'brouillon' ? 'Brouillon' : 'Devis en prép.');
      break;
    case 'pret':
      variant = 'purple';
      defaultLabel = label || 'Prêt';
      break;
    case 'devis_envoye':
    case 'envoye':
    case 'envoyee':
      variant = 'info';
      defaultLabel = label || 'Envoyé';
      break;
    case 'devis_accepte':
    case 'accepte':
    case 'payee':
    case 'terminee':
      variant = 'success';
      defaultLabel = label || (normalized === 'payee' ? 'Payée' : normalized === 'terminee' ? 'Terminée' : 'Accepté');
      break;
    case 'partielle':
      variant = 'warning';
      defaultLabel = label || 'Partielle';
      break;
    case 'en_projet':
    case 'en_cours':
    case 'ouvert':
      variant = 'champagne';
      defaultLabel = label || (normalized === 'ouvert' ? 'Ouvert' : normalized === 'en_projet' ? 'En projet' : 'En cours');
      break;
    case 'livre':
      variant = 'success';
      defaultLabel = label || 'Livré';
      break;
    case 'clos':
      variant = 'default';
      defaultLabel = label || 'Clos';
      break;
    case 'decline':
    case 'refuse':
    case 'annulee':
    case 'expire':
      variant = 'error';
      defaultLabel =
        label ||
        (normalized === 'decline'
          ? 'Décliné'
          : normalized === 'refuse'
          ? 'Refusé'
          : normalized === 'annulee'
          ? 'Annulée'
          : 'Expiré');
      break;
    case 'remplace':
    case 'sans_suite':
      variant = 'default';
      defaultLabel = label || (normalized === 'remplace' ? 'Remplacé' : 'Sans suite');
      break;
    case 'a_venir':
      variant = 'default';
      defaultLabel = label || 'À venir';
      break;
    default:
      variant = 'default';
      defaultLabel = label || effectiveStatus;
  }

  return (
    <Badge variant={variant} className={className}>
      {defaultLabel}
    </Badge>
  );
};
