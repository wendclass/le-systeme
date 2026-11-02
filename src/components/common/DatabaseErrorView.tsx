import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DatabaseErrorViewProps {
  onRetry: () => void;
  errorMessage?: string | null;
}

/**
 * Vue sobre affichée lorsque la base de données est inaccessible.
 */
export const DatabaseErrorView: React.FC<DatabaseErrorViewProps> = ({
  onRetry,
  errorMessage,
}) => {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4 font-body animate-in fade-in">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#0D0A18]/90 border border-[#E5484D]/30 shadow-2xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-[#E5484D]/10 border border-[#E5484D]/25 flex items-center justify-center mx-auto text-[#E5484D]">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white font-body">
            Connexion au serveur interrompue
          </h2>
          <p className="text-xs text-[#F8F5FF]/60 leading-relaxed font-body">
            {errorMessage ||
              'Impossible de contacter la base de données pour le moment. Veuillez vérifier votre connexion internet.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={onRetry}
        >
          Réessayer
        </Button>
      </div>
    </div>
  );
};
