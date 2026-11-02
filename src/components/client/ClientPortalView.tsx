import React, { useState, useEffect } from 'react';
import {
  getClientPortalData,
  acceptQuoteByClient,
  submitClientFeedback,
  buildWhatsAppLink,
  formatFCFA,
  ClientPortalPayload,
} from '../../lib/classSStore';
import {
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText,
  CreditCard,
  Layers,
  HelpCircle,
  Lock,
  WifiOff,
  Star,
  Upload,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface ClientPortalViewProps {
  token: string;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({ token }) => {
  const [data, setData] = useState<ClientPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Formulaire d'acceptation du devis
  const [hasReadAndAgreed, setHasReadAndAgreed] = useState(false);
  const [clientSignName, setClientSignName] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  // Formulaire de feedback & avis (Prompt 5)
  const [feedbackNote, setFeedbackNote] = useState(5);
  const [feedbackPrive, setFeedbackPrive] = useState('');
  const [ameliorationPrive, setAmeliorationPrive] = useState('');
  const [temoignage, setTemoignage] = useState('');
  const [nomAffiche, setNomAffiche] = useState('');
  const [fonctionEntreprise, setFonctionEntreprise] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [accordPublication, setAccordPublication] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPortal = async () => {
    setLoading(true);
    try {
      const res = await getClientPortalData(token);
      setData(res);
      if (res.client?.nom) {
        setClientSignName(res.client.nom);
        if (!nomAffiche) {
          setNomAffiche(res.client.nom);
        }
      }
      if (res.client?.entreprise && !fonctionEntreprise) {
        setFonctionEntreprise(res.client.entreprise);
      }
      if (res.retour) {
        setFeedbackNote(res.retour.note_satisfaction || 5);
        setFeedbackPrive(res.retour.commentaire_prive || '');
        setAmeliorationPrive(res.retour.amelioration_prive || '');
        setTemoignage(res.retour.temoignage_original || '');
        if (res.retour.nom_affiche) setNomAffiche(res.retour.nom_affiche);
        if (res.retour.fonction_entreprise) setFonctionEntreprise(res.retour.fonction_entreprise);
        if (res.retour.photo_url) setPhotoUrl(res.retour.photo_url);
        setAccordPublication(Boolean(res.retour.accord_publication));
      }
    } catch {
      setData({ valid: false, reason: 'invalide', studio: { nom: 'Class S Studio', whatsapp: '22670000000' }, factures: [] });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedbackError('La photo ne doit pas dépasser 2 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setPhotoUrl(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (temoignage.trim().length < 40 || temoignage.trim().length > 600) {
      setFeedbackError(
        `Votre témoignage doit contenir entre 40 et 600 caractères (actuellement : ${temoignage.trim().length}).`
      );
      return;
    }
    if (!accordPublication) {
      setFeedbackError('Veuillez cocher la case autorisant la publication de votre témoignage.');
      return;
    }

    setSubmittingFeedback(true);
    setFeedbackError(null);

    const res = await submitClientFeedback(token, {
      note_satisfaction: feedbackNote,
      commentaire_prive: feedbackPrive.trim(),
      amelioration_prive: ameliorationPrive.trim() || undefined,
      temoignage: temoignage.trim(),
      nom_affiche: nomAffiche.trim() || data?.client?.nom || 'Client Class S',
      fonction_entreprise: fonctionEntreprise.trim() || undefined,
      photo_url: photoUrl || undefined,
      accord_publication: true,
    });

    setSubmittingFeedback(false);

    if (res.success) {
      setFeedbackSuccess(true);
      await loadPortal();
    } else {
      setFeedbackError(res.error || 'Erreur lors de l’envoi de votre avis.');
    }
  };

  useEffect(() => {
    loadPortal();
  }, [token]);

  const handleAcceptQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasReadAndAgreed) {
      setAcceptError('Veuillez cocher la case attestant de la lecture et de l’acceptation des termes du devis.');
      return;
    }
    if (!clientSignName.trim()) {
      setAcceptError('Veuillez renseigner votre nom complet pour valider votre accord.');
      return;
    }

    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await acceptQuoteByClient(token, clientSignName.trim());
      if (res.success) {
        setAcceptSuccess(true);
        loadPortal();
      } else {
        setAcceptError(res.error || 'Impossible de valider le devis.');
      }
    } catch (err: any) {
      setAcceptError(err.message || 'Une erreur est survenue lors de l’acceptation.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCFE] text-[#1A1A1A] flex items-center justify-center p-4 font-body">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#6600CC] border-t-transparent animate-spin" />
          <span className="text-xs uppercase tracking-widest text-[#6600CC] font-bold">
            Chargement de votre espace...
          </span>
        </div>
      </div>
    );
  }

  // Écran d'erreur : Jeton invalide, expiré ou révoqué
  if (!data || !data.valid) {
    const reasonText =
      data?.reason === 'expire'
        ? 'Ce lien d’accès est expiré.'
        : data?.reason === 'revoque'
        ? 'Ce lien d’accès a été révoqué et remplacé.'
        : 'Ce lien d’accès n’est pas valide.';

    return (
      <div className="min-h-screen bg-[#FDFCFE] text-[#1A1A1A] flex items-center justify-center p-6 font-body">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-neutral-200/80 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold text-neutral-900 tracking-tight">
              Lien indisponible
            </h1>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {reasonText} Pour toute question ou pour recevoir un nouveau lien d’accès, contactez Class S directement sur WhatsApp.
            </p>
          </div>

          <div className="pt-2">
            <a
              href={buildWhatsAppLink(
                data?.studio.whatsapp || '22670000000',
                'Bonjour Scott, mon lien d’accès au Système semble indisponible. Pourriez-vous me renvoyer un lien actif ?'
              )}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contacter Class S sur WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { client, devis, factures, projet, studio } = data;
  const devisAccepte = devis?.statut === 'accepte';
  const devisEnvoye = devis?.statut === 'envoye';
  const devisExpireOuRemplace = devis?.statut === 'expire' || devis?.statut === 'remplace';

  return (
    <div
      className="min-h-screen bg-[#F8F5FF]/60 text-[#1A1A1A] font-body selection:bg-[#6600CC]/10 pb-20"
      data-theme="light"
    >
      {/* Alerte hors ligne */}
      {isOffline && (
        <div className="bg-amber-600 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>Connexion Internet interrompue. Vos modifications locales ne sont pas synchronisées.</span>
        </div>
      )}

      {/* En-tête officiel Class S */}
      <header className="border-b border-neutral-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/brand/logo-violet.png"
              alt="Class S Studio"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <span className="font-serif font-bold text-base text-[#1A1A1A] block leading-tight">
                {studio.nom}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#6600CC]">
                Espace Projet Client
              </span>
            </div>
          </div>

          {/* Bouton WhatsApp toujours accessible */}
          <a
            href={buildWhatsAppLink(
              studio.whatsapp,
              `Bonjour Scott, j’ai une question à propos de mon projet avec Class S.`
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 border border-emerald-600/20 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Échanger avec Scott</span>
            <span className="sm:hidden">WhatsApp</span>
          </a>
        </div>
      </header>

      {/* Titre principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#6600CC] block">
            Suivi & Collaboration
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A1A1A] tracking-tight">
            Votre projet avec Class S
          </h1>
          {client && (
            <p className="text-sm text-neutral-600">
              Espace sécurisé préparé pour <strong className="text-neutral-900">{client.nom}</strong>
              {client.entreprise ? ` (${client.entreprise})` : ''}.
            </p>
          )}
        </div>

        {/* ================= SECTION 1 : DEVIS ================= */}
        {devis && (
          <section className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#6600CC]/10 text-[#6600CC] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-neutral-900">
                    Proposition commerciale ({devis.numero})
                  </h2>
                  <span className="text-xs text-neutral-500">
                    Émise le {new Date(devis.date_emission).toLocaleDateString('fr-FR')} • Validité jusqu’au {new Date(devis.date_validite).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div>
                {devisAccepte && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Devis accepté</span>
                  </span>
                )}
                {devisEnvoye && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-[#6600CC] border border-[#6600CC]/20">
                    <Clock className="w-3.5 h-3.5" />
                    <span>En attente de votre accord</span>
                  </span>
                )}
              </div>
            </div>

            {/* Cadrage & Univers */}
            {devis.conception?.resume && (
              <div className="space-y-2 text-sm text-neutral-700 leading-relaxed bg-neutral-50/60 p-4 rounded-2xl border border-neutral-100">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
                  Cadrage du projet
                </span>
                <p>{devis.conception.resume}</p>
                {devis.conception.univers && (
                  <p className="text-xs text-neutral-500 pt-1">
                    <strong className="text-neutral-700">Univers visuel :</strong> {devis.conception.univers}
                  </p>
                )}
              </div>
            )}

            {/* Livrables & Hors Périmètre */}
            {(devis.conception?.livrables && devis.conception.livrables.length > 0) ||
            (devis.conception?.hors_perimetre && devis.conception.hors_perimetre.length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {devis.conception?.livrables && devis.conception.livrables.length > 0 && (
                  <div className="space-y-1.5 p-4 rounded-2xl bg-neutral-50/50 border border-neutral-100">
                    <span className="font-bold text-neutral-800 block">
                      Livrables prévus :
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-neutral-600">
                      {devis.conception.livrables.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {devis.conception?.hors_perimetre && devis.conception.hors_perimetre.length > 0 && (
                  <div className="space-y-1.5 p-4 rounded-2xl bg-rose-50/40 border border-rose-100/60">
                    <span className="font-bold text-rose-800 block">
                      Hors périmètre (Exclusions) :
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-rose-700/80">
                      {devis.conception.hors_perimetre.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            {/* Tableau des prestations */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
                Prestations & Détail des honoraires
              </span>
              <div className="rounded-2xl border border-neutral-200/80 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100/70 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Prestation</th>
                      <th className="py-2.5 px-3 text-center w-14">Qté</th>
                      <th className="py-2.5 px-4 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {devis.lignes.map((ligne, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="py-3 px-4">
                          <div className="font-bold text-neutral-900">{ligne.libelle}</div>
                          {ligne.description && (
                            <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                              {ligne.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center tabular-nums text-neutral-600">
                          {ligne.quantite}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-neutral-900 whitespace-nowrap">
                          {formatFCFA(ligne.total_ligne_fcfa)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total et Remise */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-72 space-y-1.5 text-xs text-right">
                  {devis.remise_fcfa > 0 && (
                    <div className="flex justify-between text-neutral-500">
                      <span>Remise ({devis.remise_libelle || 'Accord commercial'}) :</span>
                      <span className="tabular-nums text-rose-600 font-medium">
                        -{formatFCFA(devis.remise_fcfa)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2.5 border-t-2 border-neutral-900 text-base font-bold text-neutral-900">
                    <span className="font-serif uppercase tracking-wider">Total à régler :</span>
                    <span className="text-xl tabular-nums font-serif text-[#6600CC]">
                      {formatFCFA(devis.total_fcfa)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modalités de collaboration */}
            <div className="p-5 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-3 text-xs text-neutral-600">
              <span className="font-bold text-neutral-900 uppercase tracking-wider text-[11px] block">
                Modalités de collaboration
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 leading-relaxed">
                <div>
                  <strong className="text-neutral-800">Délai estimé :</strong>{' '}
                  {devis.modalites.delai_livraison || '10 à 15 jours ouvrés à compter de l’acompte.'}
                </div>
                <div>
                  <strong className="text-neutral-800">Allers-retours inclus :</strong>{' '}
                  {devis.modalites.revisions_incluses || 3} cycles de retouches.
                </div>
                <div className="sm:col-span-2">
                  <strong className="text-neutral-800">Règlement de l’acompte :</strong>{' '}
                  {devis.modalites.pourcentage_acompte || 50}% à la commande pour lancer la production.
                </div>
                {devis.modalites.coordonnees_paiement && (
                  <div className="sm:col-span-2 bg-white p-3 rounded-xl border border-neutral-200/60 font-mono text-[11px]">
                    <strong className="text-neutral-800 block mb-1">Moyens de paiement acceptés :</strong>
                    <div className="whitespace-pre-line text-neutral-700">
                      {devis.modalites.coordonnees_paiement}
                    </div>
                  </div>
                )}
                {devis.modalites.droits && (
                  <div className="sm:col-span-2">
                    <strong className="text-neutral-800">Cession des droits :</strong>{' '}
                    {devis.modalites.droits}
                  </div>
                )}
              </div>
            </div>

            {/* Formulaire d'acceptation ou Confirmation */}
            {devisEnvoye && (
              <form
                onSubmit={handleAcceptQuote}
                className="p-6 rounded-2xl bg-purple-50/50 border border-[#6600CC]/20 space-y-4"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-serif font-bold text-neutral-900">
                    Valider et accepter ce devis
                  </h3>
                  <p className="text-xs text-neutral-600">
                    Votre acceptation déclenche la commande et ouvre la phase de conception dès confirmation de l’acompte.
                  </p>
                </div>

                {acceptError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    {acceptError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Votre nom et prénom (valant signature numérique) *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientSignName}
                      onChange={(e) => setClientSignName(e.target.value)}
                      placeholder="Ex : Moussa Traoré"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6600CC] bg-white"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer pt-1 select-none">
                    <input
                      type="checkbox"
                      checked={hasReadAndAgreed}
                      onChange={(e) => setHasReadAndAgreed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#6600CC] focus:ring-[#6600CC]"
                    />
                    <span className="text-xs text-neutral-700 leading-relaxed font-medium">
                      J’ai pris connaissance des éléments de conception, des prestations et des modalités indiquées ci-dessus, et j’accepte ce devis.
                    </span>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={accepting}
                    className="px-8 py-3 rounded-full text-sm font-semibold bg-[#6600CC] hover:bg-[#5200A3] text-white shadow-md shadow-[#6600CC]/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
                  >
                    {accepting ? 'Validation en cours...' : 'J’accepte le devis'}
                  </button>

                  <a
                    href={buildWhatsAppLink(
                      studio.whatsapp,
                      `Bonjour Scott, j’ai une question au sujet de mon devis ${devis.numero}.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6600CC] hover:underline"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Poser une question avant de signer</span>
                  </a>
                </div>
              </form>
            )}

            {devisAccepte && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-emerald-900">
                    Devis formellement accepté
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Accord confirmé le{' '}
                    <strong className="font-semibold">
                      {new Date(devis.accepte_le || '').toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>{' '}
                    par <strong className="font-semibold">{devis.accepte_par_nom}</strong>.
                  </p>
                </div>
              </div>
            )}

            {devisExpireOuRemplace && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900">
                    Devis plus disponible
                  </h4>
                  <p className="text-xs text-amber-800">
                    La validité de ce devis a expiré ou une nouvelle version a été émise. Contactez Scott sur WhatsApp pour recevoir une proposition actualisée.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= SECTION 2 : FACTURES & PAIEMENTS ================= */}
        {factures && factures.length > 0 && (
          <section className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
              <div className="w-9 h-9 rounded-xl bg-[#6600CC]/10 text-[#6600CC] flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-neutral-900">
                  Factures & Règlements ({factures.length})
                </h2>
                <span className="text-xs text-neutral-500">
                  Suivi des factures d’acompte et reçus de paiement validés.
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {factures.map((fac) => {
                const isPaid = fac.statut === 'payee';
                const isPartial = fac.statut === 'partielle';

                return (
                  <div
                    key={fac.id}
                    className="p-5 rounded-2xl border border-neutral-200/80 space-y-4 bg-neutral-50/40"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 text-sm">
                            {fac.numero}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-neutral-600">
                            {fac.type === 'acompte' ? 'Acompte' : fac.type === 'solde' ? 'Solde final' : 'Facture intégrale'}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isPartial
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-purple-50 text-[#6600CC] border border-[#6600CC]/20'
                            }`}
                          >
                            {isPaid ? 'Réglée' : isPartial ? 'Partiellement payée' : 'En attente'}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-500 mt-0.5 block">
                          Émise le {new Date(fac.date_emission).toLocaleDateString('fr-FR')} • Échéance : {new Date(fac.echeance).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xs text-neutral-400 block uppercase font-bold text-[10px]">
                          Montant
                        </span>
                        <span className="text-lg font-bold text-neutral-900 tabular-nums">
                          {formatFCFA(fac.total_fcfa)}
                        </span>
                      </div>
                    </div>

                    {/* Lignes de facture */}
                    <div className="pt-2 border-t border-neutral-200/60 text-xs text-neutral-600 space-y-1">
                      {fac.lignes.map((fl, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{fl.libelle}</span>
                          <span className="font-medium tabular-nums text-neutral-800">
                            {formatFCFA(fl.total_ligne_fcfa)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Coordonnées de paiement si non payée */}
                    {!isPaid && fac.coordonnees_paiement && (
                      <div className="p-3.5 rounded-xl bg-white border border-neutral-200 text-xs space-y-1">
                        <span className="font-bold text-neutral-800 block">
                          Coordonnées de règlement :
                        </span>
                        <p className="whitespace-pre-line text-neutral-600 font-mono text-[11px]">
                          {fac.coordonnees_paiement}
                        </p>
                      </div>
                    )}

                    {/* Paiements reçus & Reçus officiels */}
                    {fac.paiements && fac.paiements.length > 0 && (
                      <div className="pt-3 border-t border-neutral-200/60 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                          Reçus de paiement validés
                        </span>
                        <div className="space-y-1.5">
                          {fac.paiements.map((p, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-900">
                                    {p.numero_recu}
                                  </span>
                                  <span className="text-[10px] text-emerald-700 font-medium">
                                    • {p.moyen}
                                  </span>
                                </div>
                                <span className="text-[11px] text-emerald-800/80">
                                  Reçu le {new Date(p.date_reception).toLocaleDateString('fr-FR')} • Validé par Scott
                                </span>
                              </div>

                              <span className="font-bold text-emerald-900 tabular-nums text-sm">
                                {formatFCFA(p.montant_fcfa)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ================= SECTION 3 : AVANCEMENT DU PROJET ================= */}
        {projet && (
          <section className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#6600CC]/10 text-[#6600CC] flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-neutral-900">
                    Avancement de la création
                  </h2>
                  <span className="text-xs text-neutral-500">
                    {projet.titre}
                  </span>
                </div>
              </div>

              <div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    projet.statut === 'livre'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-purple-50 text-[#6600CC] border border-[#6600CC]/20'
                  }`}
                >
                  {projet.statut === 'livre' ? 'Projet Livré' : 'En production'}
                </span>
              </div>
            </div>

            {/* Liste verticale des étapes (SANS POURCENTAGE) */}
            <div className="space-y-4">
              {projet.etapes.map((etape, idx) => {
                const isCompleted = etape.statut === 'terminee';
                const isCurrent = etape.statut === 'en_cours';

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                      isCurrent
                        ? 'bg-[#6600CC]/5 border-[#6600CC]/30 ring-1 ring-[#6600CC]/20'
                        : isCompleted
                        ? 'bg-neutral-50/50 border-neutral-200'
                        : 'bg-white border-neutral-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                          isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-[#6600CC] text-white shadow-sm'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {isCompleted ? '✓' : idx + 1}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-neutral-900">
                            {etape.nom}
                          </h4>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700'
                                : isCurrent
                                ? 'bg-[#6600CC]/10 text-[#6600CC]'
                                : 'bg-neutral-100 text-neutral-500'
                            }`}
                          >
                            {isCompleted
                              ? 'Terminée'
                              : isCurrent
                              ? 'En cours'
                              : 'À venir'}
                          </span>
                        </div>

                        {etape.message_client && (
                          <p className="text-xs text-neutral-600 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-neutral-200/60 max-w-lg mt-1">
                            {etape.message_client}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isCompleted && etape.terminee_le && (
                        <span className="text-[11px] text-neutral-400">
                          Validé le {new Date(etape.terminee_le).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[11px] text-[#6600CC] font-semibold">
                          Étape active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ================= SECTION 4 : VOTRE RETOUR D’EXPÉRIENCE ================= */}
        {(data?.projet?.statut === 'livre' || Boolean(data?.retour)) && (
          <section className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
              <div className="w-9 h-9 rounded-xl bg-[#6600CC]/10 text-[#6600CC] flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-neutral-900">
                  Votre retour d’expérience
                </h2>
                <span className="text-xs text-neutral-500">
                  Votre projet est livré. Partagez votre avis pour nous aider à progresser.
                </span>
              </div>
            </div>

            {/* Cas où le retour a déjà été validé par Scott */}
            {data?.retour && (data.retour.statut === 'valide' || data.retour.statut === 'publie') ? (
              <div className="p-6 rounded-2xl bg-[#F8F5FF] border border-[#6600CC]/20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#2FA77A]/15 text-[#2FA77A] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">
                  Merci pour votre confiance !
                </h3>
                <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
                  Votre retour d’expérience a été validé par Scott. Votre témoignage contribue à
                  faire rayonner le travail du studio Class S.
                </p>
                {data.retour.note_satisfaction && (
                  <div className="flex justify-center items-center gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-5 h-5 ${
                          n <= (data?.retour?.note_satisfaction || 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-neutral-200'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-6">
                {feedbackSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Votre avis a été transmis avec succès. Scott le relira avant toute publication. Merci !
                    </span>
                  </div>
                )}

                {feedbackError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {feedbackError}
                  </div>
                )}

                {/* 1. Bloc Feedback privé */}
                <div className="p-5 rounded-2xl bg-neutral-50/60 border border-neutral-200/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-neutral-400" />
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">
                        Feedback privé (Strictement confidentiel)
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        Destiné exclusivement à Scott pour améliorer les services du studio. Ne sera jamais publié.
                      </p>
                    </div>
                  </div>

                  {/* Note de satisfaction 1 à 5 */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-2">
                      Note globale de satisfaction
                    </label>
                    <div className="flex items-center gap-2" role="radiogroup" aria-label="Note de satisfaction">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isFilled = starVal <= feedbackNote;
                        return (
                          <button
                            key={starVal}
                            type="button"
                            role="radio"
                            aria-checked={feedbackNote === starVal}
                            aria-label={`Attribuer une note de ${starVal} sur 5`}
                            onClick={() => setFeedbackNote(starVal)}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowRight' && starVal < 5) setFeedbackNote(starVal + 1);
                              if (e.key === 'ArrowLeft' && starVal > 1) setFeedbackNote(starVal - 1);
                            }}
                            className="p-1 rounded-lg hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#6600CC] transition-transform"
                          >
                            <Star
                              className={`w-7 h-7 transition-colors ${
                                isFilled
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-neutral-300 hover:text-amber-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                      <span className="text-xs font-semibold text-neutral-600 ml-2">
                        {feedbackNote} / 5
                      </span>
                    </div>
                  </div>

                  {/* Ce qui a été le plus apprécié */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Qu’avez-vous le plus apprécié dans notre collaboration ? *
                    </label>
                    <textarea
                      value={feedbackPrive}
                      onChange={(e) => setFeedbackPrive(e.target.value)}
                      placeholder="Ex : La créativité des pistes, la clarté du process, la réactivité sur WhatsApp..."
                      rows={2}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs placeholder:text-neutral-400 focus:outline-none focus:border-[#6600CC] focus:ring-1 focus:ring-[#6600CC]"
                    />
                  </div>

                  {/* Ce qui pourrait être amélioré */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Qu’aurions-nous pu améliorer ? (facultatif)
                    </label>
                    <textarea
                      value={ameliorationPrive}
                      onChange={(e) => setAmeliorationPrive(e.target.value)}
                      placeholder="Ex : Explications techniques, formats de fichiers additionnels..."
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs placeholder:text-neutral-400 focus:outline-none focus:border-[#6600CC] focus:ring-1 focus:ring-[#6600CC]"
                    />
                  </div>
                </div>

                {/* 2. Bloc Témoignage public pour le site wendclass.com */}
                <div className="p-5 rounded-2xl bg-white border border-neutral-200/90 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#6600CC]" />
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">
                        Témoignage public pour le site
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        Partagez votre avis qui pourra être affiché sur le site wendclass.com après validation.
                      </p>
                    </div>
                  </div>

                  {/* Texte du témoignage (40 à 600 caractères) */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-neutral-700">
                        Votre témoignage * (40 à 600 caractères)
                      </label>
                      <span
                        className={`text-[11px] font-mono ${
                          temoignage.trim().length >= 40 && temoignage.trim().length <= 600
                            ? 'text-emerald-600'
                            : 'text-neutral-400'
                        }`}
                      >
                        {temoignage.trim().length} / 600
                      </span>
                    </div>
                    <textarea
                      value={temoignage}
                      onChange={(e) => setTemoignage(e.target.value)}
                      placeholder="Décrivez votre expérience avec Class S, la qualité du travail accompli et l’impact sur votre projet..."
                      rows={4}
                      maxLength={600}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs placeholder:text-neutral-400 focus:outline-none focus:border-[#6600CC] focus:ring-1 focus:ring-[#6600CC]"
                    />
                  </div>

                  {/* Nom affiché et Fonction / Entreprise */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Nom à afficher *
                      </label>
                      <input
                        type="text"
                        value={nomAffiche}
                        onChange={(e) => setNomAffiche(e.target.value)}
                        placeholder="Ex : Moussa Ouedraogo"
                        required
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-[#6600CC]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Fonction ou entreprise (facultatif)
                      </label>
                      <input
                        type="text"
                        value={fonctionEntreprise}
                        onChange={(e) => setFonctionEntreprise(e.target.value)}
                        placeholder="Ex : Fondateur, Faso Tech"
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs focus:outline-none focus:border-[#6600CC]"
                      />
                    </div>
                  </div>

                  {/* Photo facultative */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Photo de profil (facultative, 2 Mo max)
                    </label>
                    <div className="flex items-center gap-3">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="Aperçu"
                          className="w-12 h-12 rounded-full object-cover border border-neutral-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                          <Upload className="w-5 h-5" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoUpload}
                        className="text-xs text-neutral-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#6600CC]/10 file:text-[#6600CC] hover:file:bg-[#6600CC]/20 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Accord obligatoire de publication */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accordPublication}
                        onChange={(e) => setAccordPublication(e.target.checked)}
                        className="w-4 h-4 rounded text-[#6600CC] border-neutral-300 mt-0.5 focus:ring-[#6600CC]"
                        required
                      />
                      <span className="text-xs text-neutral-700 leading-relaxed">
                        J’autorise la publication de ce témoignage avec mon nom et mon projet sur le
                        site officiel de Class S (wendclass.com).
                      </span>
                    </label>
                  </div>
                </div>

                {/* Bouton d'envoi */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="px-6 py-3 rounded-full bg-[#6600CC] text-white text-xs font-semibold tracking-wide hover:bg-[#6600CC]/90 transition-all shadow-md shadow-[#6600CC]/20 disabled:opacity-50"
                  >
                    {submittingFeedback ? 'Envoi en cours...' : 'Envoyer mon avis'}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* Pied de page */}
        <footer className="text-center text-xs text-neutral-400 pt-8 pb-4 space-y-1">
          <p>© {new Date().getFullYear()} Class S Studio. Tous droits réservés.</p>
          <p>Identité visuelle et branding d’exception • Ouagadougou, Burkina Faso.</p>
        </footer>
      </main>
    </div>
  );
};
