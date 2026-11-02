import React, { useState, useEffect } from 'react';
import {
  CsDevis,
  CsDevisLigne,
  CsDossier,
  CsClient,
  CsReglages,
  CsService,
} from '../../types';
import {
  getDevisById,
  createDevis,
  updateDevis,
  duplicateDevisNewVersion,
  markDevisReady,
  getReglages,
  getServices,
  getDossiers,
  getClients,
  isBaseModelComplete,
  calculateModalitesEcarts,
  formatFCFA,
} from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { StatutPill } from '../ui/StatutPill';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { QuotePrintPreview } from './QuotePrintPreview';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Copy,
  Printer,
  Sparkles,
  Plus,
  Trash2,
  BookOpen,
  AlertTriangle,
  Info,
  Sliders,
  Layers,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface QuoteBuilderViewProps {
  quoteId?: string;
  initialDossierId?: string;
  initialData?: any;
  onBack: () => void;
  onNavigateToSettings: () => void;
  onQuoteSaved?: (savedQuoteId: string) => void;
}

export const QuoteBuilderView: React.FC<QuoteBuilderViewProps> = ({
  quoteId,
  initialDossierId,
  initialData,
  onBack,
  onNavigateToSettings,
  onQuoteSaved,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [devis, setDevis] = useState<CsDevis | null>(null);
  const [reglages, setReglages] = useState<CsReglages | null>(null);
  const [availableServices, setAvailableServices] = useState<CsService[]>([]);
  const [dossiers, setDossiers] = useState<CsDossier[]>([]);
  const [clients, setClients] = useState<CsClient[]>([]);

  // État du formulaire
  const [selectedDossierId, setSelectedDossierId] = useState(initialDossierId || '');
  const [dateEmission, setDateEmission] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [validiteJours, setValiditeJours] = useState(15);
  const [lignes, setLignes] = useState<Partial<CsDevisLigne>[]>([]);
  const [remiseFcfa, setRemiseFcfa] = useState<number>(0);
  const [remiseLibelle, setRemiseLibelle] = useState<string>('');

  // Bloc Conception
  const [resumeConception, setResumeConception] = useState('');
  const [universConception, setUniversConception] = useState('');
  const [livrables, setLivrables] = useState<string[]>([]);
  const [newLivrable, setNewLivrable] = useState('');
  const [horsPerimetre, setHorsPerimetre] = useState<string[]>([]);
  const [newHorsPerimetre, setNewHorsPerimetre] = useState('');

  // Bloc Modalités
  const [modalites, setModalites] = useState<Record<string, any>>({});

  // Modals & Aperçu
  const [isGrimoireModalOpen, setIsGrimoireModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reg, srvs, dosList, cliList] = await Promise.all([
        getReglages(),
        getServices(),
        getDossiers(),
        getClients(),
      ]);

      setReglages(reg);
      setAvailableServices(srvs);
      setDossiers(dosList);
      setClients(cliList);

      if (quoteId) {
        const found = await getDevisById(quoteId);
        if (found) {
          setDevis(found);
          setSelectedDossierId(found.dossier_id);
          setDateEmission(found.date_emission);
          setLignes(found.lignes || []);
          setRemiseFcfa(found.remise_fcfa || 0);
          setRemiseLibelle(found.remise_libelle || '');
          setResumeConception(found.conception?.resume || '');
          setUniversConception(found.conception?.univers || '');
          setLivrables(found.conception?.livrables || []);
          setHorsPerimetre(found.conception?.hors_perimetre || []);
          setModalites(found.modalites || {});
          setValiditeJours(
            found.modalites?.validite_devis_jours ?? reg.validite_devis_jours ?? 15
          );
        }
      } else {
        // Nouveau devis
        setValiditeJours(reg.validite_devis_jours || 15);
        setModalites({
          pourcentage_acompte: reg.pourcentage_acompte || 50,
          validite_devis_jours: reg.validite_devis_jours || 15,
          revisions_incluses: reg.revisions_incluses || 3,
          delai_livraison: reg.delai_livraison || '',
          coordonnees_paiement: reg.coordonnees_paiement || '',
          remise_fichiers: reg.remise_fichiers || '',
          droits: reg.droits || '',
          conditions_complementaires: reg.conditions_complementaires || '',
        });

        // Données d'appel préremplies si transmises
        if (initialData) {
          if (initialData.conception?.resume) {
            setResumeConception(initialData.conception.resume);
          }
          if (initialData.conception?.univers) {
            setUniversConception(initialData.conception.univers);
          }
        }
      }
    } catch {
      showToast('Erreur lors du chargement des informations du devis.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [quoteId]);

  // Calcul dynamique de la date de validité
  const dateValiditeCalculee = (() => {
    try {
      const d = new Date(dateEmission);
      d.setDate(d.getDate() + (Number(validiteJours) || 15));
      return d.toISOString().split('T')[0];
    } catch {
      return dateEmission;
    }
  })();

  // Calcul des sous-totaux
  const sousTotal = lignes.reduce((acc, l) => {
    const qte = Number(l.quantite) || 1;
    const pu = Number(l.prix_unitaire_fcfa) || 0;
    return acc + Math.round(qte * pu);
  }, 0);

  const totalGeneral = Math.max(0, sousTotal - (Number(remiseFcfa) || 0));

  // Statut lecture seule si le devis est prêt, envoyé ou accepté
  const isReadOnly = Boolean(
    devis && (devis.statut === 'pret' || devis.statut === 'envoye' || devis.statut === 'accepte')
  );

  // Gestion des lignes de prestations
  const handleAddCustomLine = () => {
    setLignes([
      ...lignes,
      {
        libelle: 'Nouvelle prestation',
        description: '',
        quantite: 1,
        prix_unitaire_fcfa: 0,
        total_ligne_fcfa: 0,
        ordre: lignes.length + 1,
      },
    ]);
  };

  const handleAddFromGrimoire = (service: CsService) => {
    setLignes([
      ...lignes,
      {
        service_id: service.id,
        libelle: service.nom,
        description: service.description_client || '',
        quantite: 1,
        prix_unitaire_fcfa: service.prix_base_fcfa,
        total_ligne_fcfa: service.prix_base_fcfa,
        ordre: lignes.length + 1,
      },
    ]);
    setIsGrimoireModalOpen(false);
    showToast(`Prestation « ${service.nom} » ajoutée au devis.`, 'info');
  };

  const handleUpdateLine = (
    index: number,
    field: keyof CsDevisLigne,
    value: any
  ) => {
    const updated = [...lignes];
    const current = { ...updated[index], [field]: value };
    const qte = Number(current.quantite) || 1;
    const pu = Number(current.prix_unitaire_fcfa) || 0;
    current.total_ligne_fcfa = Math.round(qte * pu);
    updated[index] = current;
    setLignes(updated);
  };

  const handleRemoveLine = (index: number) => {
    const updated = [...lignes];
    updated.splice(index, 1);
    setLignes(updated);
  };

  // Livrables et Hors périmètre
  const handleAddLivrable = () => {
    if (!newLivrable.trim()) return;
    setLivrables([...livrables, newLivrable.trim()]);
    setNewLivrable('');
  };

  const handleRemoveLivrable = (idx: number) => {
    setLivrables(livrables.filter((_, i) => i !== idx));
  };

  const handleAddHorsPerimetre = () => {
    if (!newHorsPerimetre.trim()) return;
    setHorsPerimetre([...horsPerimetre, newHorsPerimetre.trim()]);
    setNewHorsPerimetre('');
  };

  const handleRemoveHorsPerimetre = (idx: number) => {
    setHorsPerimetre(horsPerimetre.filter((_, i) => i !== idx));
  };

  // Reprendre les notes de l'appel du dossier
  const handleReprendreNotesAppel = () => {
    const targetDossier = dossiers.find((d) => d.id === selectedDossierId);
    if (!targetDossier) {
      showToast('Veuillez d’abord sélectionner un dossier client.', 'warning');
      return;
    }
    // Lecture de l'appel depuis le store local
    const appelsStr = localStorage.getItem('class_s_storage_cs_appels');
    if (appelsStr) {
      try {
        const appels = JSON.parse(appelsStr);
        const app = appels.find((a: any) => a.dossier_id === selectedDossierId);
        if (app) {
          if (app.elements_conception) setResumeConception(app.elements_conception);
          if (app.notes_libres) setUniversConception(app.notes_libres);
          showToast('Notes de l’appel intégrées avec succès.', 'success');
          return;
        }
      } catch {
        /* ignorer */
      }
    }
    showToast('Aucune note d’appel trouvée pour ce dossier.', 'info');
  };

  // Enregistrement du devis (Brouillon)
  const handleSaveDevis = async () => {
    if (!selectedDossierId) {
      showToast('Veuillez sélectionner un dossier client.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const devisData: Partial<CsDevis> = {
        dossier_id: selectedDossierId,
        date_emission: dateEmission,
        date_validite: dateValiditeCalculee,
        conception: {
          resume: resumeConception,
          univers: universConception,
          livrables,
          hors_perimetre: horsPerimetre,
        },
        modalites: {
          ...modalites,
          validite_devis_jours: Number(validiteJours) || 15,
        },
        remise_fcfa: Number(remiseFcfa) || 0,
        remise_libelle: remiseLibelle.trim() || null,
      };

      let saved: CsDevis;
      if (devis) {
        saved = await updateDevis(devis.id, devisData, lignes);
        showToast('Devis mis à jour avec succès.', 'success');
      } else {
        saved = await createDevis(devisData, lignes);
        showToast(`Devis ${saved.numero} créé avec succès.`, 'success');
      }

      setDevis(saved);
      onQuoteSaved?.(saved.id);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l’enregistrement.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Marquer comme prêt
  const handleMarkAsReady = async () => {
    if (!devis) {
      showToast('Veuillez d’abord enregistrer le brouillon du devis.', 'warning');
      return;
    }

    const res = await markDevisReady(devis.id);
    if (!res.success) {
      showToast(res.error || 'Impossible de marquer le devis prêt.', 'error');
      return;
    }

    setDevis(res.devis!);
    showToast(`Devis ${devis.numero} marqué comme prêt.`, 'success');
  };

  // Duplication en nouvelle version (v2)
  const handleDuplicateNewVersion = async () => {
    if (!devis) return;
    try {
      const newDevis = await duplicateDevisNewVersion(devis.id);
      showToast(`Nouvelle version ${newDevis.numero} créée.`, 'success');
      setDevis(newDevis);
      setLignes(newDevis.lignes || []);
    } catch {
      showToast('Erreur lors de la création d’une nouvelle version.', 'error');
    }
  };

  if (loading || !reglages) {
    return (
      <div className="p-12 text-center text-white/40 text-sm">
        Chargement de l’atelier de devis...
      </div>
    );
  }

  // Calcul des écarts avec la base
  const ecartsBase = calculateModalitesEcarts(reglages, modalites);

  // Retrouver le client sélectionné
  const currentDossier = dossiers.find((d) => d.id === selectedDossierId);
  const currentClient =
    currentDossier?.client ||
    clients.find((c) => c.id === currentDossier?.client_id) || {
      id: 'cli_anon',
      nom: 'Client Prospect',
      whatsapp: '',
      created_at: '',
      updated_at: '',
    };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Retour
          </Button>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
                {devis ? devis.numero : 'Nouveau devis Class S'}
              </h1>
              {devis && <StatutPill statut={devis.statut} size="sm" />}
            </div>
            <p className="text-xs text-white/50">
              {devis
                ? `Version ${devis.version}, émis le ${new Date(devis.date_emission).toLocaleDateString('fr-FR')}`
                : 'Constructeur de proposition commerciale sur mesure'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Aperçu fidèle / Imprimer */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Aperçu / Imprimer
          </Button>

          {/* Nouvelle version si devis prêt ou envoyé */}
          {isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDuplicateNewVersion}
              leftIcon={<Copy className="w-4 h-4" />}
            >
              Nouvelle version
            </Button>
          )}

          {/* Boutons d'édition si brouillon */}
          {!isReadOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDevis}
                loading={saving}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Enregistrer brouillon
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleMarkAsReady}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Marquer comme prêt
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Avertissement lecture seule */}
      {isReadOnly && (
        <div className="p-4 rounded-2xl bg-[#6600CC]/20 border border-[#A87FE8]/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-[#A87FE8] shrink-0" />
            <p className="text-xs text-white/80">
              Ce devis est au statut <strong className="text-white">{devis?.statut}</strong> et se trouve en lecture seule. Pour modifier les prestations ou les modalités, créez une nouvelle version.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicateNewVersion}
            leftIcon={<Copy className="w-4 h-4" />}
          >
            Créer v{(devis?.version || 1) + 1}
          </Button>
        </div>
      )}

      {/* BLOC 0 : EN-TÊTE DU DEVIS (CLIENT & DATES) */}
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1.5">
              Dossier client associé *
            </label>
            <select
              value={selectedDossierId}
              disabled={isReadOnly || !!quoteId}
              onChange={(e) => setSelectedDossierId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#A87FE8] disabled:opacity-50"
            >
              <option value="" disabled>
                Sélectionnez un dossier
              </option>
              {dossiers.map((dos) => (
                <option key={dos.id} value={dos.id} className="bg-[#16112A]">
                  {dos.client?.nom || 'Client'} {dos.client?.entreprise ? `(${dos.client.entreprise})` : ''} • {dos.statut}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Date d’émission"
            type="date"
            disabled={isReadOnly}
            value={dateEmission}
            onChange={(e) => setDateEmission(e.target.value)}
          />

          <Input
            label="Validité calculée"
            type="text"
            disabled
            value={`Valide jusqu’au ${new Date(dateValiditeCalculee).toLocaleDateString('fr-FR')} (${validiteJours} j)`}
            helperText="Calculée depuis la durée de validité en jours."
          />
        </div>
      </Card>

      {/* BLOC 1 : ÉLÉMENTS DE CONCEPTION */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#A87FE8]" />
            <h2 className="text-lg font-serif font-bold text-white">
              1. Éléments de conception
            </h2>
          </div>

          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReprendreNotesAppel}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#A87FE8]" />}
            >
              Reprendre les notes de l’appel
            </Button>
          )}
        </div>

        <Textarea
          label="Résumé du projet & Positionnement"
          disabled={isReadOnly}
          placeholder="Présentation concise des enjeux visuels, cible et objectifs du client..."
          rows={3}
          value={resumeConception}
          onChange={(e) => setResumeConception(e.target.value)}
        />

        <Textarea
          label="Univers graphique & Références"
          disabled={isReadOnly}
          placeholder="Mots-clés, tons de couleur envisagés, moodboard ou références discutées..."
          rows={2}
          value={universConception}
          onChange={(e) => setUniversConception(e.target.value)}
        />

        {/* Livrables prévus */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <label className="text-xs font-semibold text-white/70 block">
            Livrables prévus
          </label>
          <div className="flex flex-wrap gap-2">
            {livrables.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white"
              >
                <span>{item}</span>
                {!isReadOnly && (
                  <button
                    onClick={() => handleRemoveLivrable(idx)}
                    className="text-white/40 hover:text-rose-400"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2 max-w-md pt-1">
              <Input
                placeholder="Ex : Fichiers vectoriels .AI, .SVG, .PNG haute définition..."
                value={newLivrable}
                onChange={(e) => setNewLivrable(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddLivrable}
              >
                Ajouter
              </Button>
            </div>
          )}
        </div>

        {/* Hors périmètre */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <label className="text-xs font-semibold text-white/70 block">
            Hors périmètre (Exclusions explicites)
          </label>
          <div className="flex flex-wrap gap-2">
            {horsPerimetre.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300"
              >
                <span>{item}</span>
                {!isReadOnly && (
                  <button
                    onClick={() => handleRemoveHorsPerimetre(idx)}
                    className="text-rose-300/40 hover:text-rose-100"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2 max-w-md pt-1">
              <Input
                placeholder="Ex : Impression physique, retouches photos lourdes..."
                value={newHorsPerimetre}
                onChange={(e) => setNewHorsPerimetre(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddHorsPerimetre}
              >
                Ajouter
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* BLOC 2 : PRESTATIONS & HONORAIRES */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#A87FE8]" />
            <h2 className="text-lg font-serif font-bold text-white">
              2. Prestations & Honoraires
            </h2>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGrimoireModalOpen(true)}
                leftIcon={<BookOpen className="w-3.5 h-3.5 text-[#A87FE8]" />}
              >
                Ajouter depuis le Grimoire
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddCustomLine}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Ligne libre
              </Button>
            </div>
          )}
        </div>

        {/* Tableau des lignes */}
        {lignes.length === 0 ? (
          <div className="p-8 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-2">
            <p className="text-xs text-white/50">
              Aucune prestation ajoutée pour le moment.
            </p>
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGrimoireModalOpen(true)}
                leftIcon={<BookOpen className="w-3.5 h-3.5 text-[#A87FE8]" />}
              >
                Choisir dans le Grimoire
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {lignes.map((ligne, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Intitulé de la prestation *"
                      disabled={isReadOnly}
                      value={ligne.libelle || ''}
                      onChange={(e) =>
                        handleUpdateLine(idx, 'libelle', e.target.value)
                      }
                    />
                    <Textarea
                      placeholder="Descriptif client sobre..."
                      rows={2}
                      disabled={isReadOnly}
                      value={ligne.description || ''}
                      onChange={(e) =>
                        handleUpdateLine(idx, 'description', e.target.value)
                      }
                    />
                  </div>

                  {!isReadOnly && (
                    <button
                      onClick={() => handleRemoveLine(idx)}
                      className="p-2 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                  <Input
                    label="Quantité"
                    type="number"
                    min={1}
                    disabled={isReadOnly}
                    value={ligne.quantite || 1}
                    onChange={(e) =>
                      handleUpdateLine(idx, 'quantite', Number(e.target.value))
                    }
                  />

                  <Input
                    label="Prix unitaire en FCFA"
                    type="number"
                    min={0}
                    step={1000}
                    disabled={isReadOnly}
                    value={ligne.prix_unitaire_fcfa || 0}
                    onChange={(e) =>
                      handleUpdateLine(
                        idx,
                        'prix_unitaire_fcfa',
                        Number(e.target.value)
                      )
                    }
                  />

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/50 block">
                      Total ligne
                    </label>
                    <div className="h-10 flex items-center text-sm font-bold text-white tabular-nums px-3 rounded-xl bg-white/5 border border-white/10">
                      {formatFCFA(ligne.total_ligne_fcfa)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Remise & Total Général */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Libellé de la remise (facultatif)"
              placeholder="Ex : Tarif lancement, Partenariat..."
              disabled={isReadOnly}
              value={remiseLibelle}
              onChange={(e) => setRemiseLibelle(e.target.value)}
            />
            <Input
              label="Montant de la remise en FCFA"
              type="number"
              min={0}
              step={1000}
              disabled={isReadOnly}
              value={remiseFcfa}
              onChange={(e) => setRemiseFcfa(Number(e.target.value) || 0)}
            />
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-xs text-white/50 space-y-0.5">
              <div>Sous-total brut : {formatFCFA(sousTotal)}</div>
              {remiseFcfa > 0 && (
                <div className="text-rose-400">
                  Remise déduite : -{formatFCFA(remiseFcfa)}
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-white/40 block">
                Total Général Class S
              </span>
              <span className="text-2xl font-bold font-serif text-white tabular-nums tracking-tight">
                {formatFCFA(totalGeneral)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* BLOC 3 : MODALITÉS & PANNEAU D'ÉCARTS */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#A87FE8]" />
            <h2 className="text-lg font-serif font-bold text-white">
              3. Modalités de collaboration
            </h2>
          </div>

          {ecartsBase.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <span>{ecartsBase.length} adaptation(s)</span>
            </span>
          )}
        </div>

        {/* Panneau des écarts avec la base (visible de Scott seul) */}
        {ecartsBase.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Écarts avec le modèle de base (visible de Scott seul)
              </h3>
            </div>
            <div className="space-y-1.5 text-xs text-amber-200/90">
              {ecartsBase.map((ecart, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-semibold text-white">{ecart.libelle} :</span>
                  <span className="line-through text-amber-200/50">
                    {String(ecart.valeur_base)}
                  </span>
                  <span>→</span>
                  <span className="font-bold text-amber-300">
                    {String(ecart.valeur_devis)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-white/70">
                Acompte (%) *
              </label>
              {modalites.pourcentage_acompte !== reglages.pourcentage_acompte && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Adapté
                </span>
              )}
            </div>
            <Input
              type="number"
              min={10}
              max={100}
              disabled={isReadOnly}
              value={modalites.pourcentage_acompte || 50}
              onChange={(e) =>
                setModalites({
                  ...modalites,
                  pourcentage_acompte: Number(e.target.value) || 0,
                })
              }
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-white/70">
                Validité (jours) *
              </label>
              {validiteJours !== reglages.validite_devis_jours && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Adapté
                </span>
              )}
            </div>
            <Input
              type="number"
              min={1}
              max={90}
              disabled={isReadOnly}
              value={validiteJours}
              onChange={(e) => setValiditeJours(Number(e.target.value) || 15)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-white/70">
                Révisions incluses *
              </label>
              {modalites.revisions_incluses !== reglages.revisions_incluses && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Adapté
                </span>
              )}
            </div>
            <Input
              type="number"
              min={0}
              max={10}
              disabled={isReadOnly}
              value={modalites.revisions_incluses || 3}
              onChange={(e) =>
                setModalites({
                  ...modalites,
                  revisions_incluses: Number(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-white/70">
              Délai de réalisation indicatif
            </label>
            {modalites.delai_livraison !== reglages.delai_livraison && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                Adapté
              </span>
            )}
          </div>
          <Input
            disabled={isReadOnly}
            value={modalites.delai_livraison || ''}
            onChange={(e) =>
              setModalites({ ...modalites, delai_livraison: e.target.value })
            }
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-white/70">
              Coordonnées de règlement
            </label>
            {modalites.coordonnees_paiement !== reglages.coordonnees_paiement && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                Adapté
              </span>
            )}
          </div>
          <Textarea
            rows={2}
            disabled={isReadOnly}
            value={modalites.coordonnees_paiement || ''}
            onChange={(e) =>
              setModalites({
                ...modalites,
                coordonnees_paiement: e.target.value,
              })
            }
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-white/70">
              Modalités de remise des fichiers finaux
            </label>
            {modalites.remise_fichiers !== reglages.remise_fichiers && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                Adapté
              </span>
            )}
          </div>
          <Textarea
            rows={2}
            disabled={isReadOnly}
            value={modalites.remise_fichiers || ''}
            onChange={(e) =>
              setModalites({ ...modalites, remise_fichiers: e.target.value })
            }
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-white/70">
              Droits et propriété intellectuelle
            </label>
            {modalites.droits !== reglages.droits && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                Adapté
              </span>
            )}
          </div>
          <Textarea
            rows={2}
            disabled={isReadOnly}
            value={modalites.droits || ''}
            onChange={(e) =>
              setModalites({ ...modalites, droits: e.target.value })
            }
          />
        </div>
      </Card>

      {/* Modal Grimoire (Sélection de service) */}
      <Modal
        isOpen={isGrimoireModalOpen}
        onClose={() => setIsGrimoireModalOpen(false)}
        title="Ajouter une prestation depuis le Grimoire"
        description="Sélectionnez une prestation du catalogue pour l’insérer dans le devis."
        size="lg"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {availableServices.filter((s) => s.actif).length === 0 ? (
            <p className="text-xs text-white/50 text-center py-6">
              Aucune prestation active dans le Grimoire.
            </p>
          ) : (
            availableServices
              .filter((s) => s.actif)
              .map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => handleAddFromGrimoire(srv)}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#A87FE8]/60 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-[#A87FE8] uppercase tracking-wider">
                      {srv.categorie}
                    </span>
                    <h4 className="text-sm font-semibold text-white group-hover:text-[#A87FE8] transition-colors">
                      {srv.nom}
                    </h4>
                    {srv.description_client && (
                      <p className="text-xs text-white/50 line-clamp-1">
                        {srv.description_client}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-white tabular-nums block">
                      {formatFCFA(srv.prix_base_fcfa)}
                    </span>
                    <span className="text-[10px] text-white/40">
                      / {srv.unite}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </Modal>

      {/* Modal d'Aperçu Officiel A4 */}
      {isPreviewOpen && (
        <QuotePrintPreview
          devis={{
            id: devis?.id || 'temp',
            created_at: devis?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            numero: devis?.numero || 'DEV-PROVISOIRE',
            dossier_id: selectedDossierId,
            version: devis?.version || 1,
            statut: devis?.statut || 'brouillon',
            date_emission: dateEmission,
            date_validite: dateValiditeCalculee,
            conception: {
              resume: resumeConception,
              univers: universConception,
              livrables,
              hors_perimetre: horsPerimetre,
            },
            modalites,
            ecarts_base: ecartsBase,
            remise_fcfa: remiseFcfa,
            remise_libelle: remiseLibelle,
            total_fcfa: totalGeneral,
            lignes: lignes as CsDevisLigne[],
          }}
          client={currentClient}
          reglages={reglages}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};
