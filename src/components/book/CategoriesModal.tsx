import React, { useState } from 'react';
import { CsCategorie } from '../../types';
import {
  saveCategorie,
  deleteCategorie,
  reorderCategories,
} from '../../lib/classSStore';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Plus, ArrowUp, ArrowDown, Trash2, Edit2, Check, X } from 'lucide-react';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CsCategorie[];
  onCategoriesUpdated: () => void;
}

export const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesUpdated,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editType, setEditType] = useState<'entree' | 'sortie' | 'mixte'>('sortie');

  // Nouvelle catégorie
  const [isAdding, setIsAdding] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newType, setNewType] = useState<'entree' | 'sortie' | 'mixte'>('sortie');
  const [loading, setLoading] = useState(false);

  const startEdit = (cat: CsCategorie) => {
    setEditingId(cat.id);
    setEditNom(cat.nom);
    setEditType(cat.type);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNom('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editNom.trim()) return;
    setLoading(true);
    try {
      await saveCategorie({ nom: editNom.trim(), type: editType, ordre: 0 }, id);
      setEditingId(null);
      onCategoriesUpdated();
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom.trim()) return;
    setLoading(true);
    try {
      await saveCategorie({
        nom: newNom.trim(),
        type: newType,
        ordre: categories.length + 1,
      });
      setNewNom('');
      setIsAdding(false);
      onCategoriesUpdated();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return;
    setLoading(true);
    try {
      await deleteCategorie(id);
      onCategoriesUpdated();
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const list = [...categories];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    setLoading(true);
    try {
      await reorderCategories(list.map((c) => c.id));
      onCategoriesUpdated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catégories du livre de compte"
      size="md"
    >
      <div className="space-y-4 font-body">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <p className="text-xs text-white/60">
            Personnalisez vos catégories d’entrées et de dépenses.
          </p>
          {!isAdding && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAdding(true)}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Ajouter
            </Button>
          )}
        </div>

        {/* Formulaire d'ajout rapide */}
        {isAdding && (
          <form
            onSubmit={handleAdd}
            className="p-3.5 rounded-xl bg-white/5 border border-[#6600CC]/30 space-y-3"
          >
            <div className="text-xs font-semibold text-[#A87FE8]">
              Nouvelle catégorie
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <Input
                  value={newNom}
                  onChange={(e) => setNewNom(e.target.value)}
                  placeholder="Nom de la catégorie..."
                  autoFocus
                  required
                />
              </div>
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as 'entree' | 'sortie' | 'mixte')
                }
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none"
              >
                <option value="sortie" className="bg-[#0D0A18] text-white">
                  Dépense (Sortie)
                </option>
                <option value="entree" className="bg-[#0D0A18] text-white">
                  Recette (Entrée)
                </option>
                <option value="mixte" className="bg-[#0D0A18] text-white">
                  Mixte (Les deux)
                </option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" loading={loading}>
                Enregistrer
              </Button>
            </div>
          </form>
        )}

        {/* Liste des catégories */}
        <div className="divide-y divide-white/10 max-h-80 overflow-y-auto">
          {categories.map((cat, idx) => {
            const isEditingThis = editingId === cat.id;

            return (
              <div
                key={cat.id}
                className="py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-white/5 px-2 rounded-lg transition-colors"
              >
                {isEditingThis ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editNom}
                      onChange={(e) => setEditNom(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs focus:outline-none"
                      autoFocus
                    />
                    <select
                      value={editType}
                      onChange={(e) =>
                        setEditType(e.target.value as 'entree' | 'sortie' | 'mixte')
                      }
                      className="px-2 py-1.5 rounded-lg bg-[#0D0A18] border border-white/20 text-white text-xs focus:outline-none"
                    >
                      <option value="sortie">Sortie</option>
                      <option value="entree">Entrée</option>
                      <option value="mixte">Mixte</option>
                    </select>
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      className="p-1.5 rounded-md bg-[#2FA77A] text-white hover:bg-[#2FA77A]/80"
                      title="Valider"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 rounded-md bg-white/10 text-white/60 hover:text-white"
                      title="Annuler"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs text-white/40 w-4 font-mono">
                        {idx + 1}.
                      </span>
                      <span className="font-medium text-white truncate text-xs sm:text-sm">
                        {cat.nom}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                          cat.type === 'entree'
                            ? 'bg-[#2FA77A]/20 text-[#2FA77A]'
                            : cat.type === 'sortie'
                            ? 'bg-[#E8546B]/20 text-[#E8546B]'
                            : 'bg-[#A87FE8]/20 text-[#A87FE8]'
                        }`}
                      >
                        {cat.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0 || loading}
                        className="p-1 text-white/40 hover:text-white disabled:opacity-20"
                        title="Monter"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === categories.length - 1 || loading}
                        className="p-1 text-white/40 hover:text-white disabled:opacity-20"
                        title="Descendre"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1 text-white/40 hover:text-[#A87FE8]"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1 text-white/40 hover:text-[#E8546B]"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-white/10">
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
