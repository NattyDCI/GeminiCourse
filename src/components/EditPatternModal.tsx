import { useState } from 'react';
import { X } from 'lucide-react';
import type { CraftType, PatternRecord } from '../types/pattern';

interface EditPatternModalProps {
  pattern: PatternRecord | null;
  onClose: () => void;
  onSave: (updated: PatternRecord) => void;
}

export function EditPatternModal({
  pattern,
  onClose,
  onSave,
}: EditPatternModalProps) {
  const [title, setTitle] = useState(pattern?.title ?? '');
  const [designer, setDesigner] = useState(pattern?.designer ?? '');
  const [craft, setCraft] = useState<CraftType>(pattern?.craft ?? 'knitting');
  const [ravelryUrl, setRavelryUrl] = useState(pattern?.ravelryUrl ?? '');

  if (!pattern) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...pattern,
      title: title.trim() || pattern.fileName,
      designer: designer.trim(),
      craft,
      ravelryUrl: ravelryUrl.trim(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EFE7DC] px-5 py-4">
          <h2 className="font-display text-lg font-bold text-[#2C241E]">
            Editar datos del patrón
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-[#75665A] hover:bg-[#F3ECE2]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5E5045]">
              Nombre del patrón
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[#DFD5C7] bg-white px-3 py-2 text-sm focus:border-[#C84B31] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5E5045]">
              Diseñador / Autor en Ravelry
            </label>
            <input
              type="text"
              value={designer}
              onChange={(e) => setDesigner(e.target.value)}
              placeholder="Ej. PetiteKnit, Stephen West..."
              className="w-full rounded-xl border border-[#DFD5C7] bg-white px-3 py-2 text-sm focus:border-[#C84B31] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5E5045]">
              Técnica
            </label>
            <select
              value={craft}
              onChange={(e) => setCraft(e.target.value as CraftType)}
              className="w-full rounded-xl border border-[#DFD5C7] bg-white px-3 py-2 text-sm focus:border-[#C84B31] focus:outline-none"
            >
              <option value="knitting">Dos agujas</option>
              <option value="crochet">Crochet</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5E5045]">
              Enlace de Ravelry (opcional)
            </label>
            <input
              type="url"
              value={ravelryUrl}
              onChange={(e) => setRavelryUrl(e.target.value)}
              placeholder="https://www.ravelry.com/patterns/library/..."
              className="w-full rounded-xl border border-[#DFD5C7] bg-white px-3 py-2 text-sm focus:border-[#C84B31] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[#6B5D52] hover:bg-[#F3ECE2]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#C84B31] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B03E26]"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
