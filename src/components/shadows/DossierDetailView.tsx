import React, { useState, useEffect, useRef } from 'react';
import {
  CsDossier,
  CsClient,
  CsAppel,
  CsDevis,
  CsDossierStatut,
  CsLienClient,
  CsRetour,
} from '../../types';
import {
  getDossierById,
  updateDossierStatus,
  saveAppel,
  buildWhatsAppLink,
  formatFCFA,
  getLienClient,
  generateClientToken,
  revokeClientToken,
  buildClientFullUrl,
  markDevisSent,
  generateWhatsAppMessage,
  getRetourByDossierId,
  updateRetour,
  publishTestimonialToSite,
  unpublishTestimonialFromSite,
} from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { StatutPill } from '../ui/StatutPill';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  FileText,
  Plus,
  Coins,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Save,
  AlertCircle,
  Sparkles,
  Copy,
  RotateCcw,
  Share2,
  Send,
  Eye,
  Link as LinkIcon,
  MessageSquare,
  Star,
  Globe,
  EyeOff,
  Edit3,
  Lock,
} from 'lucide-react';

interface DossierDetailViewProps {
  dossierId: string;
  onBack: () => void;
  onCreateQuote: (dossierId: string, initialData?: any) => void;
  onOpenQuote: (quoteId: string) => void;
}

export const DossierDetailView: React.FC<DossierDetailViewProps> = ({
  dossierId,
  onBack,
  onCreateQuote,
  onOpenQuote,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<CsDossier | null>(null);
  const [client, setClient] = useState<CsClient | null>(null);
  const [appel, setAppel] = useState<CsAppel | null>(null);
  const [devisList, setDevisList] = useState<CsDevis[]>([]);
  const [rawDemande, setRawDemande] = useState<any>(null);
  const [lienClient, setLienClient] = useState<CsLienClient | null>(null);
  const [togglingAccess, setTogglingAccess] = useState(false);
  const [selectedWhatsAppTemplate, setSelectedWhatsAppTemplate] = useState<'devis' | 'facture' | 'paiement' | 'avancement' | 'retours'>('devis');

  // Retour d’expérience & Témoignage
  const [retour, setRetour] = useState<CsRetour | null>(null);
  const [isEditingRetourModalOpen, setIsEditingRetourModalOpen] = useState(false);
  const [editedNom, setEditedNom] = useState('');
  const [editedFonction, setEditedFonction] = useState('');
  const [editedTestimonial, setEditedTestimonial] = useState('');
  const [savingRetourEdit, setSavingRetourEdit] = useState(false);
  const [publishingRetour, setPublishingRetour] = useState(false);

  // Examen modal décliner
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [motifInterne, setMotifInterne] = useState('');

  // WhatsApp modal
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

  // Appel de découverte form & auto-save
  const [appelForm, setAppelForm] = useState({
    date_heure: '',
    statut: 'planifie' as 'planifie' | 'realise' | 'annule',
    elements_conception: '',
    services_necessaires: '',
    modalites_collaboration: '',
    notes_libres: '',
  });

  const [savingAppel, setSavingAppel] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, lien, ret] = await Promise.all([
        getDossierById(dossierId),
        getLienClient(dossierId),
        getRetourByDossierId(dossierId),
      ]);

      if (data) {
        setDossier(data.dossier);
        setClient(data.client);
        setDevisList(data.devis);
        setRawDemande(data.rawDemande);
        setLienClient(lien);
        setRetour(ret);

        if (data.appel) {
          setAppel(data.appel);
          setAppelForm({
            date_heure: data.appel.date_heure || '',
            statut: data.appel.statut,
            elements_conception: data.appel.elements_conception || '',
            services_necessaires: data.appel.services_necessaires || '',
            modalites_collaboration: data.appel.modalites_collaboration || '',
            notes_libres: data.appel.notes_libres || '',
          });
        }

        const clientNom = data.client.nom;
        setWhatsAppMessage(
          `Bonjour ${clientNom}, c’est Scott de Class S. J’ai bien reçu votre demande et j’aimerais échanger avec vous pour planifier notre appel de découverte.`
        );
      } else {
        showToast('Dossier introuvable.', 'error');
        onBack();
      }
    } catch {
      showToast('Erreur lors du chargement du dossier.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditRetour = () => {
    if (!retour) return;
    setEditedNom(retour.nom_affiche || client?.nom || '');
    setEditedFonction(retour.fonction_entreprise || client?.entreprise || '');
    setEditedTestimonial(retour.temoignage_edite || retour.temoignage_original || '');
    setIsEditingRetourModalOpen(true);
  };

  const handleSaveRetourEdit = async () => {
    if (!retour) return;
    if (!editedTestimonial.trim() || editedTestimonial.trim().length < 40) {
      showToast('Le texte du témoignage doit comporter au moins 40 caractères.', 'warning');
      return;
    }
    setSavingRetourEdit(true);
    try {
      const updated = await updateRetour(retour.id, {
        nom_affiche: editedNom.trim() || undefined,
        fonction_entreprise: editedFonction.trim() || undefined,
        temoignage_edite: editedTestimonial.trim(),
      });
      setRetour(updated);
      setIsEditingRetourModalOpen(false);
      showToast('Témoignage mis à jour avec succès.', 'success');
    } catch {
      showToast('Erreur lors de la mise à jour du retour.', 'error');
    } finally {
      setSavingRetourEdit(false);
    }
  };

  const handleUpdateRetourStatus = async (newStatut: 'valide' | 'refuse') => {
    if (!retour) return;
    try {
      const updated = await updateRetour(retour.id, { statut: newStatut });
      setRetour(updated);
      showToast(newStatut === 'valide' ? 'Témoignage validé.' : 'Témoignage classé comme refusé.', 'info');
    } catch {
      showToast('Erreur lors de la mise à jour du statut.', 'error');
    }
  };

  const handlePublishRetour = async () => {
    if (!retour) return;
    if (!retour.accord_publication) {
      showToast('Le client n’a pas donné son accord pour la publication de ce témoignage.', 'error');
      return;
    }
    setPublishingRetour(true);
    try {
      const res = await publishTestimonialToSite(retour.id);
      if (res.success) {
        const updated = await getRetourByDossierId(dossierId);
        setRetour(updated);
        showToast('Témoignage publié sur le site wendclass.com.', 'success');
      } else {
        showToast(res.error || 'Erreur lors de la publication.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de la publication.', 'error');
    } finally {
      setPublishingRetour(false);
    }
  };

  const handleUnpublishRetour = async () => {
    if (!retour) return;
    setPublishingRetour(true);
    try {
      const res = await unpublishTestimonialFromSite(retour.id);
      if (res.success) {
        const updated = await getRetourByDossierId(dossierId);
        setRetour(updated);
        showToast('Témoignage dépublié du site.', 'info');
      } else {
        showToast(res.error || 'Erreur lors de la dépublication.', 'error');
      }
    } catch {
      showToast('Erreur lors de la dépublication.', 'error');
    } finally {
      setPublishingRetour(false);
    }
  };

  const handleToggleClientAccess = async () => {
    if (!dossier) return;
    setTogglingAccess(true);
    try {
      if (lienClient && lienClient.actif) {
        await revokeClientToken(dossier.id);
        setLienClient(null);
        setDossier({ ...dossier, acces_client_actif: false });
        showToast('Accès client désactivé.', 'info');
      } else {
        const newLien = await generateClientToken(dossier.id);
        setLienClient(newLien);
        setDossier({ ...dossier, acces_client_actif: true });
        showToast('Accès client activé. Le lien direct est disponible.', 'success');
      }
    } catch {
      showToast('Erreur lors de la modification de l’accès client.', 'error');
    } finally {
      setTogglingAccess(false);
    }
  };

  const handleCopyClientLink = () => {
    if (!lienClient || !lienClient.token) return;
    const url = buildClientFullUrl(lienClient.token);
    navigator.clipboard.writeText(url);
    showToast('Lien client copié dans le presse-papier.', 'success');
  };

  const handleRevokeToken = async () => {
    if (!dossier) return;
    if (!confirm('Confirmez-vous la révocation du lien actuel ? L’ancien lien deviendra immédiatement invalide.')) return;
    try {
      const newLien = await generateClientToken(dossier.id);
      setLienClient(newLien);
      showToast('Ancien lien révoqué. Un nouveau lien direct a été généré.', 'success');
    } catch {
      showToast('Erreur lors de la révocation du lien.', 'error');
    }
  };

  const handleSendDevis = async (devisItem: CsDevis) => {
    if (!client) return;
    try {
      const res = await markDevisSent(devisItem.id);
      setDevisList((prev) =>
        prev.map((d) => (d.id === devisItem.id ? res.devis : d))
      );
      setLienClient(await getLienClient(dossierId));
      if (dossier) setDossier({ ...dossier, statut: 'Devis envoyé', acces_client_actif: true });

      const linkUrl = buildClientFullUrl(res.token);
      const msg = await generateWhatsAppMessage('devis', {
        nom: client.nom,
        numero: devisItem.numero,
        lien: linkUrl,
      });

      setWhatsAppMessage(msg);
      setSelectedWhatsAppTemplate('devis');
      setIsWhatsAppModalOpen(true);
      showToast(`Devis ${devisItem.numero} marqué comme envoyé.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l’envoi du devis.', 'error');
    }
  };

  const handleSelectTemplate = async (templateKey: 'devis' | 'facture' | 'paiement' | 'avancement' | 'retours') => {
    if (!client) return;
    setSelectedWhatsAppTemplate(templateKey);

    const token = lienClient?.token || (await getLienClient(dossierId))?.token || '';
    const linkUrl = token ? buildClientFullUrl(token) : 'https://lesysteme.wendclass.com';
    const dernierDevisItem = devisList[0];

    const msg = await generateWhatsAppMessage(templateKey, {
      nom: client.nom,
      numero: dernierDevisItem ? dernierDevisItem.numero : 'DEV',
      lien: linkUrl,
      montant: dernierDevisItem ? formatFCFA(dernierDevisItem.total_fcfa) : '0 FCFA',
      etape: 'Création',
    });

    setWhatsAppMessage(msg);
  };

  useEffect(() => {
    loadData();
  }, [dossierId]);

  // Sauvegarde automatique de l'appel (debounce 800ms)
  const triggerAutoSaveAppel = (updatedFields: Partial<typeof appelForm>) => {
    setAppelForm((prev) => ({ ...prev, ...updatedFields }));
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setSavingAppel(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const saved = await saveAppel(dossierId, {
          ...appelForm,
          ...updatedFields,
        });
        setAppel(saved);
      } catch {
        showToast('Erreur lors de la sauvegarde automatique.', 'error');
      } finally {
        setSavingAppel(false);
      }
    }, 800);
  };

  // Examen : Poursuivre
  const handlePoursuivre = async () => {
    try {
      const updated = await updateDossierStatus(
        dossierId,
        'Examinée',
        'poursuivre'
      );
      setDossier(updated);
      showToast('Dossier marqué comme examiné.', 'success');
    } catch {
      showToast('Erreur lors de la mise à jour.', 'error');
    }
  };

  // Examen : Décliner
  const handleDecliner = async () => {
    try {
      const updated = await updateDossierStatus(
        dossierId,
        'Décliné',
        'decliner',
        motifInterne.trim() || undefined
      );
      setDossier(updated);
      setIsDeclineModalOpen(false);
      showToast('Dossier classé comme décliné.', 'info');
    } catch {
      showToast('Erreur lors du classement du dossier.', 'error');
    }
  };

  // Création d'un devis pré-rempli depuis les notes de cadrage
  const handleCreateQuoteFromCall = () => {
    const initialData = {
      conception: {
        resume: appelForm.elements_conception || '',
        univers: appelForm.notes_libres || '',
        livrables: [],
        hors_perimetre: [],
      },
      services_notes: appelForm.services_necessaires || '',
      modalites_notes: appelForm.modalites_collaboration || '',
    };
    onCreateQuote(dossierId, initialData);
  };

  if (loading || !dossier || !client) {
    return (
      <div className="p-12 text-center text-white/40 text-sm">
        Chargement de la fiche dossier...
      </div>
    );
  }

  // Calcul du budget repère
  const dernierDevis = devisList.length > 0 ? devisList[0] : null;

  return (
    <div className="space-y-6">
      {/* Barre de retour et actions principales */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Retour aux dossiers
          </Button>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
              <span>{client.nom}</span>
              {client.entreprise && (
                <span className="text-base text-white/50 font-normal">
                  ({client.entreprise})
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatutPill statut={dossier.statut} size="md" />

          {/* Bouton WhatsApp */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWhatsAppModalOpen(true)}
            leftIcon={<MessageCircle className="w-4 h-4 text-emerald-400" />}
          >
            WhatsApp
          </Button>

          {/* Boutons d'examen si le dossier est nouveau */}
          {dossier.statut === 'Nouvelle' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePoursuivre}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Poursuivre
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeclineModalOpen(true)}
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Décliner
              </Button>
            </>
          )}

          {/* Bouton Décliner disponible aussi pour les autres statuts non clos */}
          {dossier.statut !== 'Nouvelle' &&
            dossier.statut !== 'Décliné' &&
            dossier.statut !== 'Clos' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeclineModalOpen(true)}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              >
                Décliner
              </Button>
            )}
        </div>
      </div>

      {/* Repère Budget & Info Clé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#16112A]/60 border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block">
            Budget annoncé par le client
          </span>
          <span className="text-lg font-bold text-white">
            {dossier.budget_annonce || 'Non précisé'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#16112A]/60 border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block">
            Total du dernier devis
          </span>
          <span className="text-lg font-bold text-[#A87FE8] tabular-nums">
            {dernierDevis ? formatFCFA(dernierDevis.total_fcfa) : 'Aucun devis émis'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#16112A]/60 border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block">
            Date de réception
          </span>
          <span className="text-lg font-bold text-white">
            {new Date(dossier.created_at).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Grille Principale à Deux Colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLONNE GAUCHE (5/12) : RÉPONSES AU QUESTIONNAIRE (LECTURE SEULE) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#A87FE8]" />
                <span>Réponses au questionnaire</span>
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                Lecture seule
              </span>
            </div>

            {rawDemande ? (
              <div className="space-y-5 text-sm">
                {/* Section Coordonnées */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A87FE8]">
                    1. Coordonnées & Contact
                  </span>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs">
                    <div>
                      <span className="text-white/40">Nom :</span>{' '}
                      <span className="text-white font-medium">
                        {rawDemande.full_name || client.nom}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40">Entreprise :</span>{' '}
                      <span className="text-white font-medium">
                        {rawDemande.company_name || client.entreprise || 'Non renseigné'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40">WhatsApp :</span>{' '}
                      <span className="text-white font-medium">
                        {rawDemande.whatsapp_number || client.whatsapp}
                      </span>
                    </div>
                    {rawDemande.branch_data?.websiteUrl && (
                      <div>
                        <span className="text-white/40">Lien social / site :</span>{' '}
                        <a
                          href={rawDemande.branch_data.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#A87FE8] hover:underline"
                        >
                          {rawDemande.branch_data.websiteUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Activité */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A87FE8]">
                    2. Activité & Domaine
                  </span>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs">
                    <div>
                      <span className="text-white/40">Type de projet :</span>{' '}
                      <span className="text-white font-medium">
                        {rawDemande.project_type || 'Non spécifié'}
                      </span>
                    </div>
                    {rawDemande.branch_data?.activity_description && (
                      <div className="pt-1">
                        <span className="text-white/40 block">Description :</span>
                        <p className="text-white/80 leading-relaxed mt-0.5">
                          {rawDemande.branch_data.activity_description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Objectifs & Usage de l'image */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A87FE8]">
                    3. Objectifs & Usage de l’image
                  </span>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                    {rawDemande.goals && rawDemande.goals.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {rawDemande.goals.map((goal: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-white/5 text-white/80 border border-white/10"
                          >
                            {goal}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-white/40">Aucun objectif coché.</span>
                    )}

                    {rawDemande.goals_other && (
                      <div className="pt-1">
                        <span className="text-white/40 block">Précisions :</span>
                        <p className="text-white/80 leading-relaxed mt-0.5">
                          {rawDemande.goals_other}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section L'argent et le temps */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A87FE8]">
                    4. L’argent et le temps
                  </span>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs">
                    <div>
                      <span className="text-white/40">Tranche de budget :</span>{' '}
                      <span className="text-white font-medium">
                        {rawDemande.branch_data?.budget || dossier.budget_annonce || 'Non spécifié'}
                      </span>
                    </div>
                    {rawDemande.branch_data?.deadline && (
                      <div>
                        <span className="text-white/40">Délai souhaité :</span>{' '}
                        <span className="text-white font-medium">
                          {rawDemande.branch_data.deadline}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Image importée */}
                {rawDemande.branch_data?.imageUrl && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A87FE8]">
                      5. Fichier / Image fournie
                    </span>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                      <img
                        src={rawDemande.branch_data.imageUrl}
                        alt="Image fournie par le prospect"
                        className="w-full max-h-48 object-cover rounded-lg border border-white/10"
                      />
                      <a
                        href={rawDemande.branch_data.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#A87FE8] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Ouvrir l’image originale</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/50 space-y-2">
                <p>
                  Ce dossier a été créé directement dans Le Système sans passage par le questionnaire du site.
                </p>
                <div className="space-y-1 pt-2 border-t border-white/5 text-white/70">
                  <div>
                    <strong className="text-white">Nom :</strong> {client.nom}
                  </div>
                  <div>
                    <strong className="text-white">WhatsApp :</strong> {client.whatsapp}
                  </div>
                  {client.entreprise && (
                    <div>
                      <strong className="text-white">Entreprise :</strong> {client.entreprise}
                    </div>
                  )}
                  {client.email && (
                    <div>
                      <strong className="text-white">Email :</strong> {client.email}
                    </div>
                  )}
                  {client.lien_social && (
                    <div>
                      <strong className="text-white">Lien social :</strong> {client.lien_social}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* COLONNE DROITE (7/12) : ACCÈS CLIENT, APPEL DE DÉCOUVERTE & DEVIS */}
        <div className="lg:col-span-7 space-y-6">
          {/* CARTE ACCÈS CLIENT (LIEN DIRECT S6) */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#A87FE8]" />
                <h2 className="text-lg font-serif font-bold text-white">
                  Accès client direct (Lien sécurisé)
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-white/60">
                  {lienClient && lienClient.actif ? 'Accès activé' : 'Accès désactivé'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleClientAccess}
                  disabled={togglingAccess}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    lienClient && lienClient.actif ? 'bg-[#6600CC]' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      lienClient && lienClient.actif ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {lienClient && lienClient.actif ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 font-mono text-xs text-white/90 break-all select-all">
                  <span className="text-[#A87FE8] shrink-0 font-bold">Lien :</span>
                  <span>{buildClientFullUrl(lienClient.token)}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyClientLink}
                      leftIcon={<Copy className="w-3.5 h-3.5" />}
                    >
                      Copier le lien
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRevokeToken}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
                    >
                      Révoquer
                    </Button>

                    <a
                      href={buildClientFullUrl(lienClient.token)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-white/15 text-white hover:bg-white/10 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#A87FE8]" />
                      <span>Tester l’aperçu client</span>
                    </a>
                  </div>

                  <span className="text-[11px] text-white/40">
                    {lienClient.derniere_ouverture
                      ? `Ouvert le ${new Date(lienClient.derniere_ouverture).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Pas encore ouvert par le client'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/50">
                Activez l’accès client pour générer le lien direct sécurisé. Le client pourra consulter et valider son devis, suivre son projet et régler ses acomptes sans créer de compte.
              </p>
            )}
          </Card>

          {/* CARTE APPEL DE DÉCOUVERTE */}
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#A87FE8]" />
                <h2 className="text-lg font-serif font-bold text-white">
                  Appel de découverte (Cadrage)
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {savingAppel && (
                  <span className="text-[11px] text-[#A87FE8] animate-pulse">
                    Enregistrement...
                  </span>
                )}
                <select
                  value={appelForm.statut}
                  onChange={(e) =>
                    triggerAutoSaveAppel({
                      statut: e.target.value as 'planifie' | 'realise' | 'annule',
                    })
                  }
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#A87FE8]"
                >
                  <option value="planifie">Planifié</option>
                  <option value="realise">Réalisé</option>
                  <option value="annule">Annulé</option>
                </select>
              </div>
            </div>

            {/* Date et heure de l'appel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date et heure de l’appel"
                type="datetime-local"
                value={appelForm.date_heure}
                onChange={(e) =>
                  triggerAutoSaveAppel({ date_heure: e.target.value })
                }
                leftIcon={<Calendar className="w-4 h-4 text-white/40" />}
              />
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={() =>
                    triggerAutoSaveAppel({ statut: 'realise' })
                  }
                  disabled={appelForm.statut === 'realise'}
                  leftIcon={<CheckCircle className="w-4 h-4 text-emerald-400" />}
                >
                  {appelForm.statut === 'realise' ? 'Appel marqué réalisé' : 'Marquer comme réalisé'}
                </Button>
              </div>
            </div>

            {/* Trois blocs de cadrage après l'appel */}
            <div className="space-y-4 pt-2 border-t border-white/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A87FE8]">
                Synthèse et cadrage du projet
              </h3>

              <Textarea
                label="1. Éléments de conception"
                placeholder="Idées créatives, positionnement, univers graphique, références et éléments visuels attendus..."
                rows={3}
                value={appelForm.elements_conception}
                onChange={(e) =>
                  triggerAutoSaveAppel({ elements_conception: e.target.value })
                }
                helperText="Ces éléments seront automatiquement repris dans le devis."
              />

              <Textarea
                label="2. Services nécessaires"
                placeholder="Prestations identifiées lors de l’échange (ex : Logo premium, guide de marque, cartes de visite)..."
                rows={3}
                value={appelForm.services_necessaires}
                onChange={(e) =>
                  triggerAutoSaveAppel({ services_necessaires: e.target.value })
                }
              />

              <Textarea
                label="3. Modalités de collaboration"
                placeholder="Attentes particulières du client sur les délais, les paiements ou les retours..."
                rows={3}
                value={appelForm.modalites_collaboration}
                onChange={(e) =>
                  triggerAutoSaveAppel({
                    modalites_collaboration: e.target.value,
                  })
                }
              />

              <Textarea
                label="Notes libres (Scott seul)"
                placeholder="Remarques personnelles, impressions sur le contact, points de vigilance..."
                rows={2}
                value={appelForm.notes_libres}
                onChange={(e) =>
                  triggerAutoSaveAppel({ notes_libres: e.target.value })
                }
              />
            </div>
          </Card>

          {/* CARTE DEVIS DU DOSSIER */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#A87FE8]" />
                <h2 className="text-lg font-serif font-bold text-white">
                  Devis associés ({devisList.length})
                </h2>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateQuoteFromCall}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Créer un devis
              </Button>
            </div>

            {devisList.length === 0 ? (
              <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                <p className="text-xs text-white/50">
                  Aucun devis créé pour ce dossier. Vous pouvez générer un premier devis en reprenant directement les notes de votre appel.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateQuoteFromCall}
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#A87FE8]" />}
                >
                  Créer depuis les notes de cadrage
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {devisList.map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => onOpenQuote(dev.id)}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-[#A87FE8]/40 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-[#A87FE8] transition-colors">
                          {dev.numero}
                        </span>
                        <span className="text-xs text-white/40">
                          v{dev.version}
                        </span>
                        <StatutPill statut={dev.statut} size="sm" />
                      </div>
                      <div className="text-xs text-white/40">
                        Émis le {new Date(dev.date_emission).toLocaleDateString('fr-FR')} • Valide jusqu’au {new Date(dev.date_validite).toLocaleDateString('fr-FR')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {dev.statut === 'pret' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendDevis(dev);
                          }}
                          leftIcon={<Send className="w-3.5 h-3.5" />}
                        >
                          Envoyer
                        </Button>
                      )}

                      <span className="text-sm font-bold text-white tabular-nums">
                        {formatFCFA(dev.total_fcfa)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* CARTE AVIS & TÉMOIGNAGE DU DOSSIER */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#A87FE8]" />
                <h2 className="text-lg font-serif font-bold text-white">
                  Avis & Témoignage client
                </h2>
              </div>

              {retour && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      retour.statut === 'publie'
                        ? 'bg-[#2FA77A]/20 text-[#2FA77A] border border-[#2FA77A]/30'
                        : retour.statut === 'valide'
                        ? 'bg-[#6600CC]/20 text-[#A87FE8] border border-[#6600CC]/30'
                        : retour.statut === 'refuse'
                        ? 'bg-[#E8546B]/20 text-[#E8546B]'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {retour.statut === 'publie'
                      ? 'Publié sur le site'
                      : retour.statut === 'valide'
                      ? 'Validé'
                      : retour.statut === 'refuse'
                      ? 'Refusé'
                      : 'À valider'}
                  </span>
                </div>
              )}
            </div>

            {retour ? (
              <div className="space-y-4">
                {/* 1. Note & Date */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/50 mr-1">Satisfaction :</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= (retour.note_satisfaction || 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-white/20'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-white ml-1">
                      {retour.note_satisfaction}/5
                    </span>
                  </div>
                  <span className="text-[11px] text-white/40">
                    Déposé le {new Date(retour.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                {/* 2. Feedback privé (confidentiel Scott) */}
                <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/70 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#A87FE8]" />
                      Feedback privé (Scott uniquement • non publié)
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-white/40 block text-[11px]">Ce qui a été le plus apprécié :</span>
                      <p className="text-white/80 italic mt-0.5">
                        « {retour.commentaire_prive} »
                      </p>
                    </div>

                    {retour.amelioration_prive && (
                      <div className="pt-1.5 border-t border-white/5">
                        <span className="text-white/40 block text-[11px]">Piste d’amélioration :</span>
                        <p className="text-white/70 italic mt-0.5">
                          « {retour.amelioration_prive} »
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Témoignage public */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                    <span className="font-semibold text-white">
                      Témoignage public
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        retour.accord_publication
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {retour.accord_publication ? 'Accord publication : OUI' : 'Accord : NON'}
                    </span>
                  </div>

                  {/* Auteur */}
                  <div className="flex items-center gap-2.5">
                    {retour.photo_url ? (
                      <img
                        src={retour.photo_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-white/20"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#6600CC]/20 text-[#A87FE8] flex items-center justify-center font-bold text-xs">
                        {retour.nom_affiche?.slice(0, 2).toUpperCase() || 'CL'}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-white">
                        {retour.nom_affiche || client.nom}
                      </p>
                      {retour.fonction_entreprise && (
                        <p className="text-[11px] text-white/50">
                          {retour.fonction_entreprise}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Texte original vs édité */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-white/40 mb-0.5">
                        <span>Texte original du client :</span>
                      </div>
                      <p className="p-2.5 rounded-lg bg-black/20 text-white/70 leading-relaxed border border-white/5">
                        « {retour.temoignage_original} »
                      </p>
                    </div>

                    {retour.temoignage_edite && retour.temoignage_edite !== retour.temoignage_original && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-[#A87FE8] mb-0.5">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Texte retouché par Scott :
                          </span>
                        </div>
                        <p className="p-2.5 rounded-lg bg-[#6600CC]/10 text-white leading-relaxed border border-[#6600CC]/20">
                          « {retour.temoignage_edite} »
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Boutons d'action Scott */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenEditRetour}
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    >
                      Corriger le texte
                    </Button>

                    {retour.statut !== 'valide' && retour.statut !== 'publie' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateRetourStatus('valide')}
                        leftIcon={<CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                      >
                        Valider
                      </Button>
                    )}

                    {retour.statut !== 'refuse' && retour.statut !== 'publie' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateRetourStatus('refuse')}
                        className="text-rose-400 hover:text-rose-300"
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Refuser
                      </Button>
                    )}

                    {retour.accord_publication && retour.statut !== 'publie' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handlePublishRetour}
                        loading={publishingRetour}
                        leftIcon={<Globe className="w-3.5 h-3.5" />}
                      >
                        Publier sur le site
                      </Button>
                    )}

                    {retour.statut === 'publie' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUnpublishRetour}
                        loading={publishingRetour}
                        className="text-white/60 hover:text-white"
                        leftIcon={<EyeOff className="w-3.5 h-3.5" />}
                      >
                        Dépublier du site
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                {dossier.statut === 'Livré' || dossier.statut === 'Clos' ? (
                  <>
                    <p className="text-white/70">
                      Ce projet est livré. Vous pouvez solliciter l’avis de votre client en lui envoyant le lien sécurisé par WhatsApp.
                    </p>
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleSelectTemplate('retours');
                          setIsWhatsAppModalOpen(true);
                        }}
                        leftIcon={<MessageCircle className="w-3.5 h-3.5 text-emerald-400" />}
                      >
                        Inviter par WhatsApp
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-white/40">
                    Le formulaire de retour d’expérience et de témoignage s’activera sur l’espace client une fois le projet marqué comme Livré.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Décliner */}
      <Modal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        title="Décliner ce dossier"
        description="Le dossier passera au statut Décliné. Le motif interne est réservé à Scott et ne sera jamais affiché au client."
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label="Motif interne (facultatif)"
            placeholder="Ex : Budget insuffisant, secteur non aligné, planning complet..."
            rows={3}
            value={motifInterne}
            onChange={(e) => setMotifInterne(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setIsDeclineModalOpen(false)}
            >
              Annuler
            </Button>
            <Button variant="danger" onClick={handleDecliner}>
              Confirmer et décliner
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal WhatsApp Direct */}
      <Modal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        title="Ouvrir WhatsApp"
        description={`Envoyez un message direct à ${client.nom} (${client.whatsapp}).`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Sélection des modèles */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/60 block">
              Modèles prédéfinis Class S
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'devis', label: 'Devis prêt' },
                { key: 'facture', label: 'Facture' },
                { key: 'paiement', label: 'Paiement reçu' },
                { key: 'avancement', label: 'Avancement projet' },
                { key: 'retours', label: 'Retour d’expérience' },
              ].map((tmpl) => (
                <button
                  type="button"
                  key={tmpl.key}
                  onClick={() =>
                    handleSelectTemplate(
                      tmpl.key as 'devis' | 'facture' | 'paiement' | 'avancement' | 'retours'
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedWhatsAppTemplate === tmpl.key
                      ? 'bg-[#6600CC] text-white border border-[#A87FE8]/60 shadow-sm'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Message prérempli modifiable"
            rows={4}
            value={whatsAppMessage}
            onChange={(e) => setWhatsAppMessage(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setIsWhatsAppModalOpen(false)}
            >
              Annuler
            </Button>
            <a
              href={buildWhatsAppLink(client.whatsapp, whatsAppMessage)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsWhatsAppModalOpen(false)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Ouvrir dans WhatsApp</span>
            </a>
          </div>
        </div>
      </Modal>

      {/* Modal d’édition du témoignage par Scott */}
      <Modal
        isOpen={isEditingRetourModalOpen}
        onClose={() => setIsEditingRetourModalOpen(false)}
        title="Corriger le témoignage"
        description="Vous pouvez ajuster l’orthographe ou la longueur du texte. Le texte original soumis par le client restera toujours conservé."
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom affiché"
            value={editedNom}
            onChange={(e) => setEditedNom(e.target.value)}
          />

          <Input
            label="Fonction ou entreprise (facultatif)"
            value={editedFonction}
            onChange={(e) => setEditedFonction(e.target.value)}
          />

          <Textarea
            label="Texte du témoignage (40 à 600 caractères) *"
            rows={5}
            value={editedTestimonial}
            onChange={(e) => setEditedTestimonial(e.target.value)}
            helperText={`${editedTestimonial.length}/600 caractères`}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setIsEditingRetourModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveRetourEdit}
              loading={savingRetourEdit}
            >
              Enregistrer les corrections
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
