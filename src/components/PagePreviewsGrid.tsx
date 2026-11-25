import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  Hash,
  Layers,
  Loader2,
  Play,
} from 'lucide-react';
import {
  getOrInitPageProgress,
  getPatternProgressSummary,
} from '../storage/patternDb';
import type { PatternRecord } from '../types/pattern';
import { CraftBadge, PageStatusBadge } from './StatusBadge';

interface PagePreviewsGridProps {
  pattern: PatternRecord;
  thumbnails: Record<number, string>;
  isGeneratingThumbnails: boolean;
  onBackToLibrary: () => void;
  onOpenPage: (pageNumber: number) => void;
}

export function PagePreviewsGrid({
  pattern,
  thumbnails,
  isGeneratingThumbnails,
  onBackToLibrary,
  onOpenPage,
}: PagePreviewsGridProps) {
  const summary = getPatternProgressSummary(pattern);
  const pageNumbers = Array.from({ length: pattern.numPages }, (_, i) => i + 1);
  const progressPct = Math.round((summary.completedPages / pattern.numPages) * 100);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 border-b border-[#E8DFD3] bg-[#FFFDF9]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToLibrary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFD5C7] bg-white px-3 py-2 text-xs font-semibold text-[#2C241E] transition hover:bg-[#F4EFE6]"
            >
              <ArrowLeft className="h-4 w-4" />
              Mi Biblioteca
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-lg font-bold text-[#2C241E] sm:text-xl">
                  {pattern.title}
                </h1>
                <CraftBadge craft={pattern.craft} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#75665A]">
                {pattern.designer && <span>por {pattern.designer}</span>}
                <span className="inline-flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  {pattern.numPages} páginas
                </span>
                {pattern.ravelryUrl && (
                  <a
                    href={pattern.ravelryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[#B4432C] hover:underline"
                  >
                    Ver en Ravelry
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-semibold text-[#2C241E]">
                {summary.completedPages} de {pattern.numPages} páginas completadas ({progressPct}%)
              </div>
              <div className="text-[11px] text-[#75665A]">
                {summary.totalRowsCounted} vueltas/puntos acumulados en este patrón
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenPage(pattern.lastPage || 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#C84B31] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#B03E26]"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Abrir Página {pattern.lastPage || 1}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#2C241E]">
              Previews de cada página
            </h2>
            <p className="text-sm text-[#75665A]">
              Haz clic en cualquier página para abrirla por separado, actualizar su contador y guardar tu avance.
            </p>
          </div>
          {isGeneratingThumbnails && (
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F4EFE6] px-3 py-1.5 text-xs font-medium text-[#6B5D52]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C84B31]" />
              Generando previews de páginas...
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {pageNumbers.map((pageNum) => {
            const pageProgress = getOrInitPageProgress(pattern, pageNum);
            const mainCounter = pageProgress.counters[0];
            const extraCountersCount = Math.max(0, pageProgress.counters.length - 1);
            const isLastVisited = pattern.lastPage === pageNum;
            const thumb = thumbnails[pageNum];

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onOpenPage(pageNum)}
                className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                  isLastVisited
                    ? 'border-[#C84B31] bg-white ring-2 ring-[#C84B31]/15'
                    : 'border-[#E6DDD0] bg-white hover:border-[#CBBBA6]'
                }`}
              >
                {/* Page Thumbnail Preview */}
                <div className="relative aspect-[3/4] w-full overflow-hidden border-b border-[#EFE7DC] bg-[#F5F0E8]">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={`Preview de la página ${pageNum}`}
                      className="h-full w-full object-contain p-2 transition duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#9E8E7E]">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-xs">Cargando página {pageNum}...</span>
                    </div>
                  )}

                  {/* Top-left page number pill */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="rounded-lg bg-[#2C241E]/85 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs">
                      Pág. {pageNum}
                    </span>
                    {isLastVisited && (
                      <span className="rounded-lg bg-[#C84B31] px-2 py-1 text-[10px] font-bold text-white shadow-xs">
                        Última vista
                      </span>
                    )}
                  </div>

                  {/* Top-right note indicator */}
                  {pageProgress.notes.trim().length > 0 && (
                    <span
                      title="Esta página tiene notas guardadas"
                      className="absolute top-2.5 right-2.5 rounded-lg bg-white/95 p-1.5 text-[#B4432C] shadow-xs ring-1 ring-[#E6DDD0]"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                  )}

                  {/* Hover prompt */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#2C241E]/60 via-[#2C241E]/20 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2C241E] shadow-sm">
                      <BookOpen className="h-3.5 w-3.5 text-[#C84B31]" />
                      Abrir página {pageNum}
                    </span>
                  </div>
                </div>

                {/* Card Footer with saved counter & status */}
                <div className="flex flex-1 flex-col justify-between gap-2.5 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <PageStatusBadge status={pageProgress.status} compact />
                    <span className="text-[11px] font-medium text-[#8A796B]">
                      Pág. {pageNum}/{pattern.numPages}
                    </span>
                  </div>

                  {mainCounter && (
                    <div className="flex items-center justify-between rounded-xl bg-[#FAF6F0] px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-medium text-[#75665A]">
                          {mainCounter.label}
                        </div>
                        {extraCountersCount > 0 && (
                          <div className="text-[10px] text-[#9B8B7C]">
                            +{extraCountersCount} contador(es) más
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 font-display text-lg font-bold text-[#2C241E]">
                        <Hash className="h-3.5 w-3.5 text-[#C84B31]" />
                        <span>{mainCounter.value}</span>
                        {mainCounter.target ? (
                          <span className="text-xs font-normal text-[#8A796B]">
                            /{mainCounter.target}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
