import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';

export interface AccessDeniedViewProps {
  onReturnToStatus: () => void;
  onLogout: () => void;
}

/**
 * Page sobre affichée aux comptes Google non super admin qui tentent d'accéder aux modules Class S.
 * Aucune fuite d'information sur la structure interne.
 */
export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  onReturnToStatus,
  onLogout,
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 font-body animate-in fade-in duration-300">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#0D0A18]/90 border border-[#A87FE8]/20 shadow-2xl backdrop-blur-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#A87FE8]">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white font-body">
            Accès réservé
          </h2>
          <p className="text-xs text-[#F8F5FF]/60 leading-relaxed max-w-sm mx-auto font-body">
            Ce module est réservé à l’administration officielle de Class S.
            Votre compte personnel reste actif sur votre Fenêtre de Statut et votre Quête Quotidienne.
          </p>
        </div>

        <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="primary" size="sm" onClick={onReturnToStatus}>
            Retourner à ma Fenêtre de Statut
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<LogOut className="w-4 h-4" />}
            onClick={onLogout}
          >
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  );
};
