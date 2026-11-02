import React, { useState } from 'react';
import { useSystemData } from '../../context/SystemDataContext';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../common/GlassCard';
import { saveSupabaseConfig, DEFAULT_SUPABASE_URL } from '../../lib/supabase';
import { formatUSD } from '../../lib/utils';
import {
  SUPPORTED_CURRENCIES,
  getAppCurrency,
  setAppCurrency,
  formatCurrency,
} from '../../lib/currency';
import {
  Sliders,
  Database,
  Globe,
  Download,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Target,
  Calendar,
  Trash2,
  Shield,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, exportDataJSON, exportDataCSV, objective, saveObjective } = useSystemData();
  const { user, logout, deleteAccount } = useAuth();

  // Active Currency state
  const [selectedCurrency, setSelectedCurrency] = useState(
    settings.primary_currency || getAppCurrency()
  );

  // Objective
  const [objMontant, setObjMontant] = useState(String(objective?.montant_cible || 100000));
  const [objDate, setObjDate] = useState(objective?.date_cible || '2027-01-11');

  // Profit First sliders state
  const [pfProfit, setPfProfit] = useState(settings.profit_first.profit);
  const [pfOwner, setPfOwner] = useState(settings.profit_first.owner_pay);
  const [pfTax, setPfTax] = useState(settings.profit_first.tax);
  const [pfOpex, setPfOpex] = useState(settings.profit_first.opex);

  const [opexThreshold, setOpexThreshold] = useState(settings.opex_alert_threshold);
  const [currencyApiUrl, setCurrencyApiUrl] = useState(settings.currency_api_url || '');

  // Supabase cloud credentials
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('class_s_supabase_url') || DEFAULT_SUPABASE_URL
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem('class_s_supabase_key') || ''
  );

  const [saveFeedback, setSaveFeedback] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const pfTotal = pfProfit + pfOwner + pfTax + pfOpex;
  const isPfValid = pfTotal === 100;
  const numObjMontant = parseFloat(objMontant) || 0;

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPfValid) return;

    // Save objective if valid
    if (numObjMontant > 0 && objDate) {
      await saveObjective({ montant_cible: numObjMontant, date_cible: objDate });
    }

    setAppCurrency(selectedCurrency);

    await updateSettings({
      primary_currency: selectedCurrency,
      profit_first: {
        profit: pfProfit,
        owner_pay: pfOwner,
        tax: pfTax,
        opex: pfOpex,
      },
      opex_alert_threshold: opexThreshold,
      currency_api_url: currencyApiUrl.trim() || undefined,
    });

    saveSupabaseConfig(supabaseUrl.trim(), supabaseKey.trim());

    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') return;
    await deleteAccount();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <form onSubmit={handleSaveAll} className="space-y-6">

        {/* User Account / Hunter Profile */}
        <GlassCard className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6600CC] via-[#A87FE8] to-[#C9A070] p-[2px] shadow-lg">
              <div className="w-full h-full rounded-[14px] bg-[#0D0A18] flex items-center justify-center overflow-hidden">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-xl font-black text-[#A87FE8]">
                    {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white font-jost">{user?.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#6600CC]/30 border border-[#A87FE8]/40 text-[10px] font-bold text-[#A87FE8] uppercase">
                  Chasseur Rang S
                </span>
              </div>
              <p className="text-xs text-white/60">{user?.email}</p>
              {user?.provider === 'google' && (
                <p className="text-[11px] text-[#4ADE9A] mt-0.5">Connecté via Google</p>
              )}
              {user?.provider === 'email' && (
                <p className="text-[11px] text-[#C9A070] mt-0.5">Compte email · Le Système</p>
              )}
              {user?.provider === 'demo' && (
                <p className="text-[11px] text-white/40 mt-0.5">Mode démo (sans Supabase)</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-rose-950/40 text-white/70 hover:text-rose-300 border border-white/10 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </GlassCard>

        {/* Mon Objectif */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Target className="w-5 h-5 text-[#C9A070]" />
            <h3 className="text-base font-bold text-white tracking-tight font-jost">Mon Objectif de Chasseur</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Modifie à tout moment ton objectif financier et ta date cible.
            Tous les calculs et prévisions s'adaptent instantanément à ta devise ({selectedCurrency}).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Montant cible ({SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency)?.code || selectedCurrency})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 font-bold text-sm pointer-events-none">
                  {SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency)?.symbol || '$'}
                </span>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={objMontant}
                  onChange={(e) => setObjMontant(e.target.value)}
                  className="w-full pl-14 pr-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm font-semibold tabular-nums focus:outline-none focus:border-[#A87FE8] transition-colors"
                />
              </div>
              {numObjMontant > 0 && (
                <p className="text-xs text-[#C9A070] mt-1 font-semibold">
                  {formatCurrency(numObjMontant, selectedCurrency, 0)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Date cible
                </div>
              </label>
              <input
                type="date"
                value={objDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setObjDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8] transition-colors"
              />
            </div>
          </div>
        </GlassCard>

        {/* Profit First Distribution */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#C9A070]" />
              <h3 className="text-base font-bold text-white tracking-tight font-jost">
                Répartition des Enveloppes Profit First
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">Total :</span>
              <span
                className={`text-sm font-bold tabular-nums px-2.5 py-0.5 rounded-full border ${
                  isPfValid
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-[#4ADE9A]'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {pfTotal}%
              </span>
            </div>
          </div>

          {!isPfValid && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>La somme des 4 enveloppes doit être exactement égale à 100%.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Rémunération du Fondateur", value: pfOwner, setter: setPfOwner, color: 'text-[#6600CC]', accent: 'accent-[#6600CC]' },
              { label: "Frais d'Exploitation (OPEX)", value: pfOpex, setter: setPfOpex, color: 'text-[#A87FE8]', accent: 'accent-[#A87FE8]' },
              { label: "Impôts & Taxes", value: pfTax, setter: setPfTax, color: 'text-[#C9A070]', accent: 'accent-[#C9A070]' },
              { label: "Profit Net", value: pfProfit, setter: setPfProfit, color: 'text-[#4ADE9A]', accent: 'accent-[#4ADE9A]' },
            ].map((env) => (
              <div key={env.label} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white">{env.label}</span>
                  <span className={`${env.color} font-bold tabular-nums`}>{env.value}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={env.value}
                  onChange={(e) => env.setter(Number(e.target.value))}
                  className={`w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer ${env.accent}`}
                />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Currency & Live Rates API */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Globe className="w-5 h-5 text-[#A87FE8]" />
            <h3 className="text-base font-bold text-white tracking-tight font-jost">
              Devise Principale & Taux de Change
            </h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Choisis la devise de référence pour l'ensemble de ton tableau de bord, tes objectifs financiers et tes transactions.
            Pour Class S à Ouagadougou, le Franc CFA (XOF) est la devise par excellence.
          </p>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-2">
              Devise active du Système
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {SUPPORTED_CURRENCIES.map((curr) => {
                const isSelected = selectedCurrency === curr.code;
                return (
                  <button
                    type="button"
                    key={curr.code}
                    onClick={() => setSelectedCurrency(curr.code)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#6600CC]/30 border-[#A87FE8] shadow-lg shadow-[#6600CC]/20 ring-1 ring-[#A87FE8]'
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{curr.flag}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-[#A87FE8] text-[#0D0A18]'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {curr.symbol}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs font-bold text-white block">
                        {curr.code}
                      </span>
                      <span className="text-[10px] text-white/50 block truncate">
                        {curr.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-white/80 mb-1">
              URL de l'API de Taux de Change (Optionnelle)
            </label>
            <input
              type="url"
              placeholder="https://api.exchangerate-api.com/v4/latest/USD"
              value={currencyApiUrl}
              onChange={(e) => setCurrencyApiUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#A87FE8]"
            />
          </div>
        </GlassCard>

        {/* Supabase Cloud Sync Configuration */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Database className="w-5 h-5 text-[#6600CC]" />
            <h3 className="text-base font-bold text-white tracking-tight font-jost">
              Synchronisation Cloud Supabase
            </h3>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#6600CC]/15 border border-[#A87FE8]/30 text-xs text-white/80 space-y-1">
            <span className="font-bold text-white block">Projet configuré :</span>
            <code className="text-[#C9A070] text-[11px] block break-all">{DEFAULT_SUPABASE_URL}</code>
            <p className="text-[11px] text-white/60 mt-1">
              Définis la variable d'environnement <code className="text-[#A87FE8]">VITE_SUPABASE_ANON_KEY</code> dans Vercel,
              ou colle-la ci-dessous pour un test local.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">Supabase URL</label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Supabase Anon Key (test local uniquement)
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0D0A18]/80 border border-white/15 text-white placeholder-white/30 text-xs font-mono"
              />
            </div>
          </div>
        </GlassCard>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {saveFeedback ? (
            <span className="text-xs text-[#4ADE9A] font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Réglages enregistrés avec succès !
            </span>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={!isPfValid}
            className="btn-cta px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#6600CC] to-[#A87FE8] text-white text-xs font-bold shadow-lg shadow-[#6600CC]/30 hover:opacity-95 disabled:opacity-50"
          >
            Enregistrer les Réglages
          </button>
        </div>

        {/* Export Data */}
        <GlassCard className="p-6 space-y-3">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Download className="w-5 h-5 text-white/80" />
            <h3 className="text-base font-bold text-white tracking-tight font-jost">
              Sauvegarde & Export des Données
            </h3>
          </div>
          <p className="text-xs text-white/60">
            Télécharge à tout moment une copie complète de ta base de données (JSON structuré ou CSV pour tableur).
          </p>
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={exportDataCSV}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[#A87FE8]" />
              <span>Exporter en CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const json = exportDataJSON();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Le_Systeme_Backup_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[#C9A070]" />
              <span>Exporter en JSON</span>
            </button>
          </div>
        </GlassCard>

        {/* Danger Zone */}
        <GlassCard className="p-6 space-y-4 border-rose-500/20">
          <div className="flex items-center gap-2 border-b border-rose-500/20 pb-3">
            <Shield className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-rose-300 tracking-tight font-jost">Zone de Danger</h3>
          </div>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer mon compte et toutes mes données</span>
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-rose-200 leading-relaxed">
                Cette action est irréversible. Toutes tes données (transactions, activités, charges, tâches)
                seront définitivement supprimées. Pour confirmer, tape{' '}
                <strong className="text-rose-100">SUPPRIMER</strong> ci-dessous.
              </p>
              <input
                type="text"
                placeholder="SUPPRIMER"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 placeholder-rose-400/40 text-sm font-bold focus:outline-none focus:border-rose-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="px-4 py-2 rounded-xl bg-white/5 text-white/70 text-xs font-semibold hover:bg-white/10 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'SUPPRIMER'}
                  className="px-4 py-2 rounded-xl bg-rose-700 disabled:opacity-40 text-white text-xs font-bold hover:bg-rose-600 transition-colors"
                >
                  Confirmer la suppression
                </button>
              </div>
            </div>
          )}
        </GlassCard>

      </form>
    </div>
  );
};
