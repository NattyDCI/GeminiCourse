import { useState, type ChangeEvent, type DragEvent } from 'react';
import {
  BookOpen,
  Download,
  ExternalLink,
  FilePlus2,
  FolderOpen,
  Hash,
  Layers,
  LayoutGrid,
  Loader2,
  Pencil,
  Play,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { getPatternProgressSummary } from '../storage/patternDb';
import type { CraftType, PatternRecord } from '../types/pattern';
import { CraftBadge } from './StatusBadge';

interface LibraryViewProps {
  patterns: PatternRecord[];
  lastOpenedPatternId: string | null;
  uploading: boolean;
  onUploadFiles: (files: FileList | File[]) => void;
  onLoadSamplePattern: () => void;
  onOpenPreviews: (patternId: string) => void;
  onOpenPage: (patternId: string, pageNumber: number) => void;
  onEditPattern: (pattern: PatternRecord) => void;
  onDeletePattern: (patternId: string) => void;
  onOpenRavelryModal: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export function LibraryView({
  patterns,
  lastOpenedPatternId,
  uploading,
  onUploadFiles,
  onLoadSamplePattern,
  onOpenPreviews,
  onOpenPage,
  onEditPattern,
  onDeletePattern,
  onOpenRavelryModal,
  onExportBackup,
  onImportBackup,
}: LibraryViewProps) {
  const [search, setSearch] = useState('');
  const [craftFilter, setCraftFilter] = useState<'all' | CraftType>('all');
  const [dragActive, setDragActive] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const lastPattern =
    patterns.find((p) => p.id === lastOpenedPatternId) ?? patterns[0] ?? null;

  const filteredPatterns = patterns.filter((p) => {
    const matchesCraft = craftFilter === 'all' || p.craft === craftFilter;
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.designer.toLowerCase().includes(q) ||
      p.fileName.toLowerCase().includes(q);
    return matchesCraft && matchesQuery;
  });

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleBackupInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      e.target.value = '';
    }
  };

  return (
    <div
      className="min-h-screen bg-[#FAF7F2]"
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragActive(false);
      }}
      onDrop={handleDrop}
    >
      {/* Top Header */}
      <header className="border-b border-[#E8DFD3] bg-[#FFFDF9]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C84B31] text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[#2C241E]">
                Ravelry Pattern Studio
              </h1>
              <p className="text-xs text-[#75665A] sm:text-sm">
                Visualiza tus PDFs página por página, con previews y contadores guardados en memoria.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenRavelryModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFD5C7] bg-white px-3.5 py-2 text-xs font-semibold text-[#2C241E] transition hover:bg-[#F4EFE6]"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#B4432C]" />
              Conectar Ravelry
            </button>

            {patterns.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onExportBackup}
                  title="Exportar respaldo de tu progreso por página"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFD5C7] bg-white px-3 py-2 text-xs font-semibold text-[#5E5045] transition hover:bg-[#F4EFE6]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exportar progreso</span>
                </button>

                <label
                  title="Importar respaldo JSON"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFD5C7] bg-white px-3 py-2 text-xs font-semibold text-[#5E5045] transition hover:bg-[#F4EFE6]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Importar progreso</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleBackupInput}
                    className="hidden"
                  />
                </label>
              </>
            )}

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#C84B31] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#B03E26]">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FilePlus2 className="h-4 w-4" />
              )}
              Subir PDFs de Ravelry
              <input
                type="file"
                multiple
                accept="application/pdf,.pdf"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Drag & drop overlay notice */}
        {dragActive && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2C241E]/45 p-6 backdrop-blur-xs">
            <div className="rounded-3xl border-2 border-dashed border-white bg-[#FFFDF9] px-10 py-12 text-center shadow-2xl">
              <FilePlus2 className="mx-auto mb-3 h-10 w-10 text-[#C84B31]" />
              <h2 className="font-display text-2xl font-bold text-[#2C241E]">
                Suelta tus PDFs de Ravelry aquí
              </h2>
              <p className="mt-1 text-sm text-[#75665A]">
                Se guardarán en tu biblioteca local para esta y próximas sesiones.
              </p>
            </div>
          </div>
        )}

        {/* Resume last session banner */}
        {lastPattern && (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E5D5C3] bg-gradient-to-r from-[#FFFDF9] to-[#FDF4EB] p-4 shadow-2xs sm:p-5">
            <div className="flex items-center gap-4">
              {lastPattern.coverDataUrl ? (
                <img
                  src={lastPattern.coverDataUrl}
                  alt={lastPattern.title}
                  className="h-16 w-12 shrink-0 rounded-lg border border-[#E6DDD0] bg-white object-cover shadow-2xs"
                />
              ) : (
                <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-[#EFE6DC] text-xs font-bold text-[#7A6B5F]">
                  PDF
                </div>
              )}
              <div>
                <span className="text-[11px] font-bold tracking-wider text-[#B4432C] uppercase">
                  Continuar donde lo dejaste
                </span>
                <h2 className="font-display text-lg font-bold text-[#2C241E]">
                  {lastPattern.title}
                </h2>
                <p className="text-xs text-[#6B5D52]">
                  Última página abierta: <strong>Página {lastPattern.lastPage}</strong> de{' '}
                  {lastPattern.numPages} •{' '}
                  {getPatternProgressSummary(lastPattern).totalRowsCounted} vueltas contadas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenPreviews(lastPattern.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFD5C7] bg-white px-3.5 py-2 text-xs font-semibold text-[#2C241E] transition hover:bg-[#F4EFE6]"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Ver previews
              </button>
              <button
                type="button"
                onClick={() => onOpenPage(lastPattern.id, lastPattern.lastPage || 1)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2C241E] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#43372E]"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Continuar Página {lastPattern.lastPage || 1}
              </button>
            </div>
          </section>
        )}

        {/* Empty State or Library Content */}
        {patterns.length === 0 ? (
          <section className="rounded-3xl border-2 border-dashed border-[#DFD5C7] bg-[#FFFDF9] px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDF0E6] text-[#C84B31]">
              <FolderOpen className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-bold text-[#2C241E]">
              Tu biblioteca de patrones está lista
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#6B5D52]">
              Sube o arrastra los PDFs que descargaste de tu biblioteca de{' '}
              <strong>Ravelry</strong>. Cada patrón mostrará previews de todas sus páginas, podrás ver cada página por separado y tu contador se guardará en memoria para la próxima sesión.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#C84B31] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#B03E26]">
                <FilePlus2 className="h-4 w-4" />
                Seleccionar PDF(s) de Ravelry
                <input
                  type="file"
                  multiple
                  accept="application/pdf,.pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={onLoadSamplePattern}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DFD5C7] bg-white px-5 py-3 text-sm font-semibold text-[#2C241E] transition hover:bg-[#F4EFE6]"
              >
                <Sparkles className="h-4 w-4 text-[#C84B31]" />
                Probar con patrón de muestra
              </button>

              <button
                type="button"
                onClick={onOpenRavelryModal}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DFD5C7] bg-white px-4 py-3 text-sm font-semibold text-[#5E5045] transition hover:bg-[#F4EFE6]"
              >
                <ExternalLink className="h-4 w-4" />
                Ir a mi librería en Ravelry
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Search & Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#9B8B7C]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o diseñador..."
                  className="w-full rounded-xl border border-[#DFD5C7] bg-white py-2 pr-3 pl-9 text-sm text-[#2C241E] placeholder-[#A89A8D] focus:border-[#C84B31] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'all', label: 'Todos' },
                    { id: 'knitting', label: 'Dos agujas' },
                    { id: 'crochet', label: 'Crochet' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCraftFilter(tab.id)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      craftFilter === tab.id
                        ? 'bg-[#2C241E] text-white'
                        : 'border border-[#DFD5C7] bg-white text-[#6B5D52] hover:bg-[#F4EFE6]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={onLoadSamplePattern}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFD5C7] bg-white px-3 py-2 text-xs font-semibold text-[#5E5045] transition hover:bg-[#F4EFE6]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#C84B31]" />
                  + Patrón de muestra
                </button>
              </div>
            </div>

            {/* Patterns Grid */}
            {filteredPatterns.length === 0 ? (
              <div className="rounded-2xl border border-[#E6DDD0] bg-white p-8 text-center text-sm text-[#75665A]">
                No hay patrones que coincidan con tu búsqueda.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPatterns.map((pattern) => {
                  const summary = getPatternProgressSummary(pattern);
                  const pct = Math.round(
                    (summary.completedPages / Math.max(1, pattern.numPages)) * 100
                  );
                  const isConfirmingDelete = confirmDeleteId === pattern.id;

                  return (
                    <article
                      key={pattern.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-[#E6DDD0] bg-white shadow-2xs transition hover:shadow-md"
                    >
                      <div className="flex gap-4 p-4">
                        {/* Cover Thumbnail */}
                        <button
                          type="button"
                          onClick={() => onOpenPreviews(pattern.id)}
                          className="group relative h-36 w-26 shrink-0 overflow-hidden rounded-xl border border-[#E8DFD3] bg-[#F5F0E8]"
                          title="Ver previews de todas las páginas"
                        >
                          {pattern.coverDataUrl ? (
                            <img
                              src={pattern.coverDataUrl}
                              alt={`Portada de ${pattern.title}`}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#9B8B7C]">
                              PDF
                            </div>
                          )}
                        </button>

                        {/* Metadata */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <CraftBadge craft={pattern.craft} />
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  aria-label={`Editar ${pattern.title}`}
                                  onClick={() => onEditPattern(pattern)}
                                  className="rounded-lg p-1 text-[#8A796B] hover:bg-[#F4EFE6] hover:text-[#2C241E]"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Eliminar ${pattern.title}`}
                                  onClick={() =>
                                    setConfirmDeleteId(
                                      isConfirmingDelete ? null : pattern.id
                                    )
                                  }
                                  className="rounded-lg p-1 text-[#8A796B] hover:bg-[#FDECE8] hover:text-[#B4432C]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            <h3 className="line-clamp-2 font-display text-base font-bold text-[#2C241E]">
                              {pattern.title}
                            </h3>
                            {pattern.designer && (
                              <p className="mt-0.5 truncate text-xs text-[#75665A]">
                                {pattern.designer}
                              </p>
                            )}
                            {pattern.ravelryUrl && (
                              <a
                                href={pattern.ravelryUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#B4432C] hover:underline"
                              >
                                Ravelry <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#6B5D52]">
                            <span className="inline-flex items-center gap-1">
                              <Layers className="h-3.5 w-3.5" />
                              {pattern.numPages} págs.
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-[#2C241E]">
                              <Hash className="h-3.5 w-3.5 text-[#C84B31]" />
                              {summary.totalRowsCounted} vueltas
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delete Confirmation Banner */}
                      {isConfirmingDelete && (
                        <div className="flex items-center justify-between gap-2 border-t border-[#F4CFC7] bg-[#FDF1EE] px-4 py-2 text-xs">
                          <span className="font-medium text-[#8E2D19]">
                            ¿Eliminar este PDF y su progreso?
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg px-2 py-1 font-semibold text-[#6B5D52] hover:bg-white"
                            >
                              No
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                onDeletePattern(pattern.id);
                              }}
                              className="rounded-lg bg-[#B4432C] px-2.5 py-1 font-semibold text-white hover:bg-[#97321E]"
                            >
                              Sí, eliminar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="border-t border-[#F2ECE3] bg-[#FCF9F4] px-4 py-2.5">
                        <div className="mb-1.5 flex items-center justify-between text-[11px]">
                          <span className="font-medium text-[#6B5D52]">
                            {summary.completedPages} de {pattern.numPages} páginas completadas
                          </span>
                          <span className="font-bold text-[#2C241E]">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8DFD3]">
                          <div
                            className="h-full rounded-full bg-[#2F6F4E] transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 border-t border-[#EFE7DC] p-3">
                        <button
                          type="button"
                          onClick={() => onOpenPreviews(pattern.id)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DFD5C7] bg-white px-3 py-2 text-xs font-semibold text-[#2C241E] transition hover:bg-[#F4EFE6]"
                        >
                          <LayoutGrid className="h-3.5 w-3.5 text-[#B4432C]" />
                          Ver previews
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenPage(pattern.id, pattern.lastPage || 1)
                          }
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#C84B31] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#B03E26]"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Página {pattern.lastPage || 1}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
