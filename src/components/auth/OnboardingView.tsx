import React, { useState } from 'react';
import { useSystemData } from '../../context/SystemDataContext';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_TARGET_DATE } from '../../lib/constants';
import { SUPPORTED_CURRENCIES, setAppCurrency, formatCurrency } from '../../lib/currency';
import { Target, Calendar, ArrowRight, Sparkles, AlertCircle, Globe } from 'lucide-react';

export const OnboardingView: React.FC = () => {
  const { saveObjective, updateSettings } = useSystemData();
  const { user, logout } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState('XOF');
  const [montantCible, setMontantCible] = useState<string>('60000000');
  const [dateCible, setDateCible] = useState<string>(DEFAULT_TARGET_DATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numMontant = parseFloat(montantCible) || 0;
  const isValid = numMontant > 0 && dateCible.length > 0;

  const handleCurrencySelect = (code: string) => {
    setSelectedCurrency(code);
    if (code === 'XOF') {
      setMontantCible('60000000');
    } else if (code === 'USD') {
      setMontantCible('100000');
    } else if (code === 'EUR') {
      setMontantCible('90000');
    } else if (code === 'GBP') {
      setMontantCible('80000');
    } else if (code === 'CAD') {
      setMontantCible('135000');
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValid) {
      setError('Saisis un montant valide et une date cible.');
      return;
    }
    const targetDateObj = new Date(dateCible);
    if (targetDateObj <= new Date()) {
      setError('La date cible doit être dans le futur.');
      return;
    }
    setIsSubmitting(true);
    try {
      setAppCurrency(selectedCurrency);
      await updateSettings({ primary_currency: selectedCurrency });
      await saveObjective({ montant_cible: numMontant, date_cible: dateCible });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  // Extract first name gracefully
  const firstName = user?.name?.split(' ')[0] || 'Chasseur';
  const currentCurrObj =
    SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency) || SUPPORTED_CURRENCIES[0];

  return (
    <div className="min-h-screen w-full bg-[#0D0A18] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#6600CC]/20 via-[#A87FE8]/15 to-[#C9A070]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-72 h-72 bg-[#6600CC]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#6600CC]/30 border border-[#A87FE8]/40 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A070]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#A87FE8]">
              Protocole d'Éveil - Première Connexion
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-jost">
            Bienvenue, {firstName} 👋
          </h1>
          <p className="text-sm text-white/70 mt-2 max-w-md mx-auto leading-relaxed">
            Pour lancer Le Système, définis ta devise, ton objectif financier et ta date cible.
            Chaque chasseur définit le sien - toutes tes données seront isolées du reste.
          </p>
        </div>

        <div className="p-7 sm:p-8 rounded-3xl bg-[#140F26]/90 border border-[#A87FE8]/30 shadow-[0_20px_60px_rgba(13,10,24,0.8)] backdrop-blur-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLaunch} className="space-y-5">
            {/* Choix de la devise */}
            <div className="p-4 rounded-2xl bg-white/5 border border-[#A87FE8]/30 space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#A87FE8]" />
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Devise de référence
                </label>
              </div>
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {SUPPORTED_CURRENCIES.map((curr) => {
                  const isSel = selectedCurrency === curr.code;
                  return (
                    <button
                      type="button"
                      key={curr.code}
                      onClick={() => handleCurrencySelect(curr.code)}
                      className={`py-2 px-1 rounded-xl text-center border transition-all ${
                        isSel
                          ? 'bg-[#6600CC]/40 border-[#A87FE8] text-white shadow-md ring-1 ring-[#A87FE8]'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <span className="text-base block">{curr.flag}</span>
                      <span className="text-[10px] font-bold block mt-0.5">{curr.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Objectif Montant */}
            <div className="p-5 rounded-2xl bg-white/5 border border-[#A87FE8]/30 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#C9A070]" />
                <label className="text-sm font-bold text-white">
                  Quel est ton objectif de chiffre d'affaires ({currentCurrObj.code}) ?
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-white/50 pointer-events-none">
                  {currentCurrObj.symbol}
                </span>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  required
                  value={montantCible}
                  onChange={(e) => setMontantCible(e.target.value)}
                  placeholder="60000000"
                  className="w-full pl-16 pr-4 py-3 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-xl font-bold tabular-nums placeholder-white/20 focus:outline-none focus:border-[#A87FE8] transition-colors"
                />
              </div>
              {numMontant > 0 && (
                <p className="text-xs text-[#C9A070] font-semibold">
                  Objectif : {formatCurrency(numMontant, selectedCurrency, 0)}
                </p>
              )}
            </div>

            {/* Date Cible */}
            <div className="p-5 rounded-2xl bg-white/5 border border-[#A87FE8]/30 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#A87FE8]" />
                <label className="text-sm font-bold text-white">
                  Pour quelle date veux-tu atteindre cet objectif ?
                </label>
              </div>
              <input
                type="date"
                required
                value={dateCible}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDateCible(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8] transition-colors"
              />
            </div>

            {/* Preview Card */}
            {isValid && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6600CC]/20 to-[#A87FE8]/10 border border-[#A87FE8]/40 text-center animate-in fade-in">
                <p className="text-xs text-white/60 mb-1">Ton Objectif Rang S</p>
                <p className="text-lg font-extrabold text-white font-jost">
                  {formatCurrency(numMontant, selectedCurrency, 0)}
                  <span className="text-sm font-normal text-white/60 ml-2">
                    d'ici le{' '}
                    {new Date(dateCible + 'T12:00:00').toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="btn-cta w-full py-4 rounded-2xl bg-gradient-to-r from-[#6600CC] via-[#A87FE8] to-[#C9A070] text-white text-base font-bold shadow-xl shadow-[#6600CC]/35 hover:opacity-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? (
                'Lancement...'
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Lancer Le Système</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sign out link */}
        <div className="text-center mt-4">
          <button
            onClick={logout}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Se déconnecter et changer de compte
          </button>
        </div>
      </div>
    </div>
  );
};
