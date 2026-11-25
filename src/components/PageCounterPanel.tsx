import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { createDefaultCounter } from '../storage/patternDb';
import type { PageCounter, PageProgress, PageStatus } from '../types/pattern';
import { PAGE_STATUS_META } from './StatusBadge';

interface PageCounterPanelProps {
  pageNumber: number;
  numPages: number;
  progress: PageProgress;
  lastSavedAt: string | null;
  onChangeProgress: (updated: PageProgress) => void;
}

const STEP_OPTIONS = [1, 2, 4, 5, 10];

export function PageCounterPanel({
  pageNumber,
  numPages,
  progress,
  lastSavedAt,
  onChangeProgress,
}: PageCounterPanelProps) {
  const [newCounterName, setNewCounterName] = useState('');
  const [addingCounter, setAddingCounter] = useState(false);

  const updateCounters = (
    nextCounters: PageCounter[],
    autoActivateStatus = false
  ) => {
    let nextStatus = progress.status;
    if (
      autoActivateStatus &&
      progress.status === 'pending' &&
      nextCounters.some((c) => c.value > 0)
    ) {
      nextStatus = 'in_progress';
    }

    onChangeProgress({
      ...progress,
      status: nextStatus,
      counters: nextCounters,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleStepChange = (counterId: string, delta: number) => {
    const next = progress.counters.map((c) => {
      if (c.id !== counterId) return c;
      const nextVal = Math.max(0, c.value + delta);
      return { ...c, value: nextVal };
    });
    updateCounters(next, delta > 0);
  };

  const handleDirectValue = (counterId: string, raw: string) => {
    const parsed = raw === '' ? 0 : parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(0, parsed);
    const next = progress.counters.map((c) =>
      c.id === counterId ? { ...c, value: clamped } : c
    );
    updateCounters(next, clamped > 0);
  };

  const handleUpdateCounterField = <K extends keyof PageCounter>(
    counterId: string,
    field: K,
    value: PageCounter[K]
  ) => {
    const next = progress.counters.map((c) =>
      c.id === counterId ? { ...c, [field]: value } : c
    );
    updateCounters(next);
  };

  const handleAddCounter = () => {
    const label = newCounterName.trim() || `Contador ${progress.counters.length + 1}`;
    const next = [...progress.counters, createDefaultCounter(label)];
    updateCounters(next);
    setNewCounterName('');
    setAddingCounter(false);
  };

  const handleDeleteCounter = (counterId: string) => {
    if (progress.counters.length <= 1) return;
    updateCounters(progress.counters.filter((c) => c.id !== counterId));
  };

  const handleStatusChange = (status: PageStatus) => {
    onChangeProgress({
      ...progress,
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleNotesChange = (notes: string) => {
    onChangeProgress({
      ...progress,
      notes,
      updatedAt: new Date().toISOString(),
    });
  };

  const formattedSavedTime = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-l border-[#E8DFD3] bg-[#FFFDF9] p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-2 border-b border-[#EFE7DC] pb-3.5">
        <div>
          <span className="text-[11px] font-bold tracking-wider text-[#B4432C] uppercase">
            Memoria de página
          </span>
          <h2 className="font-display text-xl font-bold text-[#2C241E]">
            Página {pageNumber}{' '}
            <span className="text-sm font-normal text-[#7A6B5F]">de {numPages}</span>
          </h2>
        </div>
        <div
          className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF5EE] px-2.5 py-1 text-[11px] font-medium text-[#255C3F]"
          title="Todo tu progreso en esta página se guarda automáticamente en la memoria local"
        >
          <Save className="h-3 w-3" />
          <span>{formattedSavedTime ? `Guardado ${formattedSavedTime}` : 'En memoria'}</span>
        </div>
      </div>

      {/* Page Status */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-semibold text-[#5E5045]">
          Estado de esta página
        </label>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#F4EFE6] p-1">
          {(['pending', 'in_progress', 'completed'] as PageStatus[]).map((status) => {
            const meta = PAGE_STATUS_META[status];
            const active = progress.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                  active
                    ? 'bg-white text-[#2C241E] shadow-sm ring-1 ring-[#DFD5C7]'
                    : 'text-[#75665A] hover:text-[#2C241E]'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <span className="truncate">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-page Counters */}
      <div className="mb-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#5E5045]">
            Contadores de la página {pageNumber}
          </span>
          {!addingCounter && (
            <button
              type="button"
              onClick={() => setAddingCounter(true)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#B4432C] transition hover:bg-[#FDF0E6]"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir contador
            </button>
          )}
        </div>

        {addingCounter && (
          <div className="rounded-xl border border-[#E5D9CA] bg-[#FAF6F0] p-3">
            <label className="mb-1.5 block text-xs font-medium text-[#5E5045]">
              Nombre del nuevo contador (ej. Repeticiones, Mangas)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCounterName}
                onChange={(e) => setNewCounterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCounter();
                  if (e.key === 'Escape') setAddingCounter(false);
                }}
                placeholder="Ej. Trenzas o Disminuciones"
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-[#D9CCB9] bg-white px-2.5 py-1.5 text-xs focus:border-[#C84B31] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCounter}
                className="rounded-lg bg-[#C84B31] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#AE3D25]"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingCounter(false);
                  setNewCounterName('');
                }}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-[#6B5D52] hover:bg-[#EDE4D7]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {progress.counters.map((counter, idx) => {
          const hasTarget = counter.target !== null && counter.target > 0;
          const pct = hasTarget
            ? Math.min(100, Math.round((counter.value / (counter.target || 1)) * 100))
            : null;
          const targetReached = hasTarget && counter.value >= (counter.target || 0);

          return (
            <div
              key={counter.id}
              data-testid={`page-counter-${idx}`}
              className={`rounded-2xl border p-4 transition ${
                targetReached
                  ? 'border-[#9CCBB0] bg-[#F3FAF6]'
                  : 'border-[#E6DDD0] bg-white shadow-xs'
              }`}
            >
              {/* Counter title & delete */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <input
                  type="text"
                  aria-label={`Nombre del contador ${idx + 1}`}
                  value={counter.label}
                  onChange={(e) =>
                    handleUpdateCounterField(counter.id, 'label', e.target.value)
                  }
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-bold text-[#2C241E] transition hover:border-[#E6DDD0] focus:border-[#C84B31] focus:bg-white focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateCounterField(counter.id, 'value', 0)}
                    title="Reiniciar contador a 0"
                    aria-label={`Reiniciar ${counter.label}`}
                    className="rounded-lg p-1.5 text-[#8A796B] transition hover:bg-[#F3ECE2] hover:text-[#2C241E]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  {progress.counters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCounter(counter.id)}
                      title="Eliminar este contador"
                      aria-label={`Eliminar ${counter.label}`}
                      className="rounded-lg p-1.5 text-[#8A796B] transition hover:bg-[#FDECE8] hover:text-[#B4432C]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Main tactile - / value / + controls */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label={`Restar ${counter.step} a ${counter.label}`}
                  onClick={() => handleStepChange(counter.id, -counter.step)}
                  disabled={counter.value <= 0}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#DFD5C7] bg-[#FAF6F0] text-[#2C241E] transition hover:bg-[#F1E9DD] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-5 w-5" />
                </button>

                <div className="flex flex-1 flex-col items-center">
                  <input
                    type="number"
                    min={0}
                    aria-label={`Valor de ${counter.label}`}
                    value={counter.value}
                    onChange={(e) => handleDirectValue(counter.id, e.target.value)}
                    className="w-24 rounded-lg bg-transparent text-center font-display text-4xl font-bold text-[#2C241E] focus:bg-[#FAF6F0] focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30"
                  />
                  {hasTarget && (
                    <span className="text-[11px] font-medium text-[#75665A]">
                      de {counter.target} ({pct}%)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  aria-label={`Sumar ${counter.step} a ${counter.label}`}
                  onClick={() => handleStepChange(counter.id, counter.step)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C84B31] text-white shadow-xs transition hover:bg-[#B03E26] active:scale-95"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* Target Progress Bar */}
              {pct !== null && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#ECE4D8]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        targetReached ? 'bg-[#2F6F4E]' : 'bg-[#C84B31]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {targetReached && progress.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange('completed')}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#E5F2EA] px-2.5 py-1.5 text-xs font-semibold text-[#255C3F] transition hover:bg-[#D4EBD9]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Meta alcanzada — Marcar página completada
                    </button>
                  )}
                </div>
              )}

              {/* Step & Target settings */}
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F2ECE3] pt-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-[#7A6B5F]">Paso:</span>
                  {STEP_OPTIONS.map((stepVal) => (
                    <button
                      key={stepVal}
                      type="button"
                      onClick={() =>
                        handleUpdateCounterField(counter.id, 'step', stepVal)
                      }
                      className={`rounded-md px-1.5 py-0.5 font-semibold transition ${
                        counter.step === stepVal
                          ? 'bg-[#2C241E] text-white'
                          : 'bg-[#F4EFE6] text-[#6B5D52] hover:bg-[#E7DFD3]'
                      }`}
                    >
                      +{stepVal}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-1.5 text-[#7A6B5F]">
                  <Target className="h-3.5 w-3.5" />
                  <span>Meta:</span>
                  <input
                    type="number"
                    min={1}
                    placeholder="—"
                    aria-label={`Meta de ${counter.label}`}
                    value={counter.target ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        handleUpdateCounterField(counter.id, 'target', null);
                      } else {
                        const parsed = parseInt(raw, 10);
                        if (!Number.isNaN(parsed) && parsed > 0) {
                          handleUpdateCounterField(counter.id, 'target', parsed);
                        }
                      }
                    }}
                    className="w-14 rounded-md border border-[#DFD5C7] bg-[#FAF6F0] px-1.5 py-0.5 text-center text-xs font-semibold text-[#2C241E] focus:border-[#C84B31] focus:bg-white focus:outline-none"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-page personal notes */}
      <div className="mt-auto">
        <label
          htmlFor={`page-notes-${pageNumber}`}
          className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#5E5045]"
        >
          <FileText className="h-3.5 w-3.5 text-[#B4432C]" />
          Notas de la página {pageNumber}
        </label>
        <textarea
          id={`page-notes-${pageNumber}`}
          rows={4}
          value={progress.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder={`Anota aquí tus recordatorios para la página ${pageNumber} (talla, aguja, cambios de color...)`}
          className="w-full resize-y rounded-xl border border-[#DFD5C7] bg-white p-3 text-xs leading-relaxed text-[#2C241E] placeholder-[#A89A8D] focus:border-[#C84B31] focus:outline-none focus:ring-2 focus:ring-[#C84B31]/15"
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#8A796B]">
          <span className="inline-flex items-center gap-1">
            {progress.status === 'completed' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[#2F6F4E]" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            Se guarda automáticamente para tu próxima sesión
          </span>
        </div>
      </div>
    </aside>
  );
}
