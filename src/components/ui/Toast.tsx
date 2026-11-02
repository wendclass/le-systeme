import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      addToast({ type, message });
    },
    [addToast]
  );

  const success = useCallback((message: string, title?: string) => addToast({ type: 'success', message, title }), [addToast]);
  const warning = useCallback((message: string, title?: string) => addToast({ type: 'warning', message, title }), [addToast]);
  const error = useCallback((message: string, title?: string) => addToast({ type: 'error', message, title }), [addToast]);
  const info = useCallback((message: string, title?: string) => addToast({ type: 'info', message, title }), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showToast, success, warning, error, info }}>
      {children}
      {/* Toast viewport */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none font-body">
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-[#2FA77A] shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-[#C9A070] shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-[#E5484D] shrink-0" />,
            info: <Info className="w-5 h-5 text-[#A87FE8] shrink-0" />,
          };

          const borders = {
            success: 'border-[#2FA77A]/30 bg-[#0D0A18]/95',
            warning: 'border-[#C9A070]/30 bg-[#0D0A18]/95',
            error: 'border-[#E5484D]/30 bg-[#0D0A18]/95',
            info: 'border-[#A87FE8]/30 bg-[#0D0A18]/95',
          };

          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto p-4 rounded-2xl border shadow-xl backdrop-blur-xl flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2',
                borders[t.type]
              )}
            >
              {icons[t.type]}
              <div className="flex-1 min-w-0">
                {t.title && (
                  <h4 className="text-xs font-bold text-[#F8F5FF] uppercase tracking-wider mb-0.5">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs text-[#F8F5FF]/90 font-medium leading-relaxed">
                  {t.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-[#F8F5FF]/40 hover:text-white transition-colors p-1"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
