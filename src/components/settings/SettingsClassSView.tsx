import React, { useState, useEffect } from 'react';
import { CsReglages } from '../../types';
import {
  getReglages,
  updateReglages,
  isBaseModelComplete,
} from '../../lib/classSStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileText,
  CreditCard,
  Plus,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export const SettingsClassSView: React.FC = () => {
  const { showToast } = useToast();
  const [reglages, setReglages] = useState<CsReglages | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');
  const [newEtape, setNewEtape] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getReglages();
      setReglages(data);
    } catch {
      showToast('Impossible de charger les réglages Class S.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!reglages) return;

    setSaving(true);
    try {
      const updated = await updateReglages(reglages);
      setReglages(updated);
      showToast('Réglages Class S enregistrés avec succès.', 'success');
    } catch {
      showToast('Erreur lors de l’enregistrement des réglages.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaymentMethod = (method: string) => {
    if (!reglages) return;
    const current = reglages.moyens_paiement || [];
    const exists = current.includes(method);
    const updated = exists
      ? current.filter((m) => m !== method)
      : [...current, method];
    setReglages({ ...reglages, moyens_paiement: updated });
  };

  const handleAddCustomPayment = () => {
    if (!customPaymentMethod.trim() || !reglages) return;
    const current = reglages.moyens_paiement || [];
    if (!current.includes(customPaymentMethod.trim())) {
      setReglages({
        ...reglages,
        moyens_paiement: [...current, customPaymentMethod.trim()],
      });
    }
    setCustomPaymentMethod('');
  };

  const handleAddEtape = () => {
    if (!newEtape.trim() || !reglages) return;
    const current = reglages.etapes_base || [];
    setReglages({
      ...reglages,
      etapes_base: [...current, newEtape.trim()],
    });
    setNewEtape('');
  };

  const handleRemoveEtape = (index: number) => {
    if (!reglages) return;
    const current = [...(reglages.etapes_base || [])];
    current.splice(index, 1);
    setReglages({ ...reglages, etapes_base: current });
  };

  const handleMoveEtape = (index: number, direction: 'up' | 'down') => {
    if (!reglages) return;
    const current = [...(reglages.etapes_base || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;
    setReglages({ ...reglages, etapes_base: current });
  };

  if (loading || !reglages) {
    return (
      <div className="p-12 text-center text-white/40 text-sm">
        Chargement des réglages Class S...
      </div>
    );
  }

  const modelComplete = isBaseModelComplete(reglages);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6600CC] ring-4 ring-[#6600CC]/20" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#A87FE8]">
              Configuration globale
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Réglages Class S
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Coordonnées de l’émetteur officiel, modèle de base des devis et paramètres de facturation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => handleSave()}
            loading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Enregistrer les réglages
          </Button>
        </div>
      </div>

      {/* Alerte si le modèle de base n'est pas encore complet */}
      {!modelComplete && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-300">
              Modèle de base incomplet
            </h4>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Pour pouvoir marquer vos devis comme prêts et les envoyer aux clients, vous devez
              renseigner vos modalités de base (acompte, délai indicatif, coordonnées de paiement,
              modalités de remise des fichiers).
            </p>
          </div>
        </div>
      )}

      {modelComplete && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300">
            Votre modèle de base est complet. Les nouveaux devis hériteront automatiquement de ces conditions.
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* BLOC 1 : ÉMETTEUR OFFICIEL */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <Building2 className="w-5 h-5 text-[#A87FE8]" />
            <div>
              <h2 className="text-lg font-serif font-bold text-white">
                Émetteur officiel
              </h2>
              <p className="text-xs text-white/50">
                Ces mentions facultatives n’apparaissent sur les devis et factures que si elles sont renseignées.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nom ou enseigne commerciale"
              placeholder="Ex : Scott Nana / Class S Studio"
              value={reglages.nom || ''}
              onChange={(e) => setReglages({ ...reglages, nom: e.target.value })}
            />
            <Input
              label="Numéro WhatsApp professionnel"
              placeholder="Ex : +226 70 00 00 00"
              value={reglages.whatsapp || ''}
              onChange={(e) => setReglages({ ...reglages, whatsapp: e.target.value })}
            />
            <Input
              label="Adresse e-mail"
              placeholder="Ex : contact@wendclass.com"
              type="email"
              value={reglages.email || ''}
              onChange={(e) => setReglages({ ...reglages, email: e.target.value })}
            />
            <Input
              label="Ville / Pays"
              placeholder="Ex : Ouagadougou, Burkina Faso"
              value={reglages.ville || ''}
              onChange={(e) => setReglages({ ...reglages, ville: e.target.value })}
            />
            <Input
              label="Identifiant Fiscal Unique (IFU)"
              placeholder="Laisser vide si non applicable"
              value={reglages.ifu || ''}
              onChange={(e) => setReglages({ ...reglages, ifu: e.target.value })}
            />
            <Input
              label="Numéro RCCM"
              placeholder="Laisser vide si non applicable"
              value={reglages.rccm || ''}
              onChange={(e) => setReglages({ ...reglages, rccm: e.target.value })}
            />
          </div>
        </Card>

        {/* BLOC 2 : MODÈLE DE BASE DES DEVIS */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <FileText className="w-5 h-5 text-[#A87FE8]" />
            <div>
              <h2 className="text-lg font-serif font-bold text-white">
                Modèle de base des devis
              </h2>
              <p className="text-xs text-white/50">
                Conditions par défaut du studio. Chaque devis pourra adapter librement ces valeurs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Pourcentage d’acompte *"
              type="number"
              min={10}
              max={100}
              value={reglages.pourcentage_acompte}
              onChange={(e) =>
                setReglages({
                  ...reglages,
                  pourcentage_acompte: Number(e.target.value) || 0,
                })
              }
              helperText="Ex : 50% à la commande pour lancer le projet"
            />
            <Input
              label="Validité du devis (en jours) *"
              type="number"
              min={1}
              max={90}
              value={reglages.validite_devis_jours}
              onChange={(e) =>
                setReglages({
                  ...reglages,
                  validite_devis_jours: Number(e.target.value) || 0,
                })
              }
              helperText="Ex : 15 jours à compter de l’émission"
            />
            <Input
              label="Nombre de révisions incluses *"
              type="number"
              min={0}
              max={10}
              value={reglages.revisions_incluses}
              onChange={(e) =>
                setReglages({
                  ...reglages,
                  revisions_incluses: Number(e.target.value) || 0,
                })
              }
              helperText="Ex : 3 allers-retours de retouches"
            />
          </div>

          <Input
            label="Délai de livraison indicatif *"
            placeholder="Ex : 10 à 15 jours ouvrés à compter de la validation du brief et réception de l’acompte"
            value={reglages.delai_livraison || ''}
            onChange={(e) =>
              setReglages({ ...reglages, delai_livraison: e.target.value })
            }
          />

          {/* Moyens de paiement acceptés */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-white/70 block">
              Moyens de paiement acceptés *
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'Mobile Money (Orange Money, Moov Money)',
                'Virement bancaire',
                'Espèces',
              ].map((m) => {
                const checked = (reglages.moyens_paiement || []).includes(m);
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => handleTogglePaymentMethod(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      checked
                        ? 'bg-[#6600CC]/30 border-[#A87FE8]/60 text-white'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {m} {checked ? '✓' : '+'}
                  </button>
                );
              })}

              {(reglages.moyens_paiement || [])
                .filter(
                  (m) =>
                    ![
                      'Mobile Money (Orange Money, Moov Money)',
                      'Virement bancaire',
                      'Espèces',
                    ].includes(m)
                )
                .map((custom) => (
                  <button
                    type="button"
                    key={custom}
                    onClick={() => handleTogglePaymentMethod(custom)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium border bg-[#6600CC]/30 border-[#A87FE8]/60 text-white"
                  >
                    {custom} ✕
                  </button>
                ))}
            </div>

            <div className="flex items-center gap-2 max-w-sm pt-1">
              <Input
                placeholder="Ajouter un autre moyen..."
                value={customPaymentMethod}
                onChange={(e) => setCustomPaymentMethod(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomPayment}
              >
                Ajouter
              </Button>
            </div>
          </div>

          {/* Coordonnées de paiement (JAMAIS "coordonnées bancaires") */}
          <Textarea
            label="Coordonnées de paiement *"
            placeholder="Détaillez vos comptes Mobile Money (numéro, nom exact) et informations de virement si applicable..."
            rows={3}
            value={reglages.coordonnees_paiement || ''}
            onChange={(e) =>
              setReglages({ ...reglages, coordonnees_paiement: e.target.value })
            }
            helperText="Ce bloc sera affiché sur les devis et factures d’acompte."
          />

          <Textarea
            label="Modalités de remise des fichiers finaux *"
            placeholder="Ex : Fichiers vectoriels et formats web livrés par lien direct sécurisé une fois le solde validé."
            rows={2}
            value={reglages.remise_fichiers || ''}
            onChange={(e) =>
              setReglages({ ...reglages, remise_fichiers: e.target.value })
            }
          />

          <Textarea
            label="Droits et propriété intellectuelle *"
            placeholder="Ex : Cession complète des droits patrimoniaux d’utilisation du logo dès le règlement intégral."
            rows={2}
            value={reglages.droits || ''}
            onChange={(e) =>
              setReglages({ ...reglages, droits: e.target.value })
            }
          />

          <Textarea
            label="Conditions complémentaires"
            placeholder="Ex : Toute demande de modification majeure en dehors du périmètre initial fera l’objet d’un avenant chiffré."
            rows={2}
            value={reglages.conditions_complementaires || ''}
            onChange={(e) =>
              setReglages({
                ...reglages,
                conditions_complementaires: e.target.value,
              })
            }
          />
        </Card>

        {/* BLOC 3 : ÉTAPES DE BASE DU PROJET */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <Sliders className="w-5 h-5 text-[#A87FE8]" />
            <div>
              <h2 className="text-lg font-serif font-bold text-white">
                Étapes de base du projet (Donjon)
              </h2>
              <p className="text-xs text-white/50">
                Séquence standard suivie par les projets après validation de l’acompte.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {(reglages.etapes_base || []).map((etape, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#6600CC]/30 border border-[#A87FE8]/30 text-[#A87FE8] text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-white">{etape}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveEtape(index, 'up')}
                    className="p-1 rounded text-white/40 hover:text-white disabled:opacity-20"
                    title="Monter"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === (reglages.etapes_base || []).length - 1}
                    onClick={() => handleMoveEtape(index, 'down')}
                    className="p-1 rounded text-white/40 hover:text-white disabled:opacity-20"
                    title="Descendre"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveEtape(index)}
                    className="p-1 rounded text-rose-400/60 hover:text-rose-400"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-md pt-2">
            <Input
              placeholder="Nouvelle étape standard..."
              value={newEtape}
              onChange={(e) => setNewEtape(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddEtape}
            >
              Ajouter l’étape
            </Button>
          </div>
        </Card>

        {/* BLOC 4 : NUMÉROTATION */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <CreditCard className="w-5 h-5 text-[#A87FE8]" />
            <div>
              <h2 className="text-lg font-serif font-bold text-white">
                Numérotation automatique
              </h2>
              <p className="text-xs text-white/50">
                Préfixes et compteurs de la numérotation séquentielle annuelle.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label="Préfixe devis"
              value={reglages.prefixe_devis || 'DEV'}
              onChange={(e) =>
                setReglages({ ...reglages, prefixe_devis: e.target.value })
              }
            />
            <Input
              label="Compteur devis"
              type="number"
              min={1}
              value={reglages.compteur_devis || 1}
              onChange={(e) =>
                setReglages({
                  ...reglages,
                  compteur_devis: Number(e.target.value) || 1,
                })
              }
            />
            <Input
              label="Préfixe factures"
              value={reglages.prefixe_facture || 'FAC'}
              onChange={(e) =>
                setReglages({ ...reglages, prefixe_facture: e.target.value })
              }
            />
            <Input
              label="Compteur factures"
              type="number"
              min={1}
              value={reglages.compteur_facture || 1}
              onChange={(e) =>
                setReglages({
                  ...reglages,
                  compteur_facture: Number(e.target.value) || 1,
                })
              }
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Enregistrer les réglages
          </Button>
        </div>
      </form>
    </div>
  );
};
