import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/Button';

type AuthMode = 'login' | 'signup' | 'forgot';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, signupWithEmail, resetPassword, loading, authError, clearAuthError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = localError || (authError && !authError.startsWith('Compte') && !authError.startsWith('Email') ? authError : null);
  const successMsg = authError && (authError.startsWith('Compte') || authError.startsWith('Email')) ? authError : null;

  const handleGoogleLogin = async () => {
    clearAuthError();
    setLocalError(null);
    await loginWithGoogle();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLocalError(null);

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setLocalError('Les mots de passe ne correspondent pas.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Le mot de passe doit comporter au moins 6 caractères.');
        return;
      }
      if (!displayName.trim()) {
        setLocalError('Veuillez saisir votre prénom ou nom.');
        return;
      }
      await signupWithEmail(email, password, displayName.trim());
    } else if (mode === 'login') {
      await loginWithEmail(email, password);
    } else if (mode === 'forgot') {
      await resetPassword(email);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearAuthError();
    setLocalError(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#0D0A18] flex items-center justify-center p-4 relative overflow-hidden font-body">
      {/* Halo améthyste discret plafonné à 0.12 */}
      <div className="ambient-halo-nocturne" />

      <div className="relative z-10 w-full max-w-md">
        {/* En-tête de marque */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#6600CC] via-[#A87FE8] to-[#C9A070] p-[2px] shadow-2xl shadow-[#6600CC]/30 mb-4">
            <div className="w-full h-full rounded-[22px] bg-[#0D0A18] flex items-center justify-center p-3.5">
              <img
                src="/brand/favicon-180x180.png"
                alt="Logo Class S"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            LE SYSTÈME
          </h1>
          <p className="text-xs text-[#A87FE8] font-bold tracking-widest uppercase mt-1">
            Class S · Studio d’identité visuelle
          </p>
        </div>

        {/* Boîte d'authentification */}
        <div className="p-7 sm:p-8 rounded-3xl bg-[#0D0A18]/90 border border-[#A87FE8]/30 shadow-[0_20px_60px_rgba(13,10,24,0.9)] backdrop-blur-2xl">
          {/* Message de succès */}
          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#2FA77A]/15 border border-[#2FA77A]/30 text-[#2FA77A] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#E5484D]/15 border border-[#E5484D]/30 text-[#E5484D] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Connexion Google OAuth principale */}
          {mode !== 'forgot' && (
            <div className="space-y-4 mb-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-full bg-white text-[#0D0A18] font-semibold text-sm hover:bg-gray-100 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50 select-none cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continuer avec Google</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[11px] text-[#F8F5FF]/40 uppercase tracking-widest font-semibold">
                  ou avec email
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          )}

          {/* Formulaire email */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#F8F5FF]/80 uppercase tracking-wider block">
                  Nom ou Prénom
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#F8F5FF]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Scott Nana"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D0A18] border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8] transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#F8F5FF]/80 uppercase tracking-wider block">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#F8F5FF]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D0A18] border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8] transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#F8F5FF]/80 uppercase tracking-wider block">
                    Mot de passe
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-[#A87FE8] hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#F8F5FF]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0D0A18] border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#F8F5FF]/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#F8F5FF]/80 uppercase tracking-wider block">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#F8F5FF]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D0A18] border border-white/15 text-white text-sm focus:outline-none focus:border-[#A87FE8] transition-colors"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              className="w-full mt-2"
            >
              {mode === 'login' && 'Se connecter'}
              {mode === 'signup' && 'Créer mon compte'}
              {mode === 'forgot' && 'Envoyer le lien de réinitialisation'}
            </Button>
          </form>

          {/* Liens de bascule */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-[#F8F5FF]/60">
            {mode === 'login' && (
              <p>
                Pas encore de compte ?{' '}
                <button
                  onClick={() => switchMode('signup')}
                  className="text-[#A87FE8] font-semibold hover:underline"
                >
                  Créer un compte
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Déjà un compte ?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="text-[#A87FE8] font-semibold hover:underline"
                >
                  Se connecter
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1.5 text-[#A87FE8] font-semibold hover:underline"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Retour à la connexion</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
