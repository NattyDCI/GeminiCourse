import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Loader2,
  PanelLeft,
  RotateCw,
  Ruler,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getOrInitPageProgress } from '../storage/patternDb';
import type { PageProgress, PatternRecord } from '../types/pattern';
import {
  type PDFDocumentProxy,
  type RenderTask,
  renderPageToCanvas,
} from '../utils/pdfEngine';
import { PageCounterPanel } from './PageCounterPanel';
import { PAGE_STATUS_META } from './StatusBadge';

interface SinglePageWorkspaceProps {
  pattern: PatternRecord;
  pdfDoc: PDFDocumentProxy | null;
  pageNumber: number;
  thumbnails: Record<number, string>;
  zoomScale: number;
  showThumbnailsSidebar: boolean;
  lastSavedAt: string | null;
  onChangeZoom: (nextZoom: number) => void;
  onToggleThumbnailsSidebar: () => void;
  onSelectPage: (pageNumber: number) => void;
  onUpdatePageProgress: (pageNumber: number, updated: PageProgress) => void;
  onBackToPreviews: () => void;
  onBackToLibrary: () => void;
}

export function SinglePageWorkspace({
  pattern,
  pdfDoc,
  pageNumber,
  thumbnails,
  zoomScale,
  showThumbnailsSidebar,
  lastSavedAt,
  onChangeZoom,
  onToggleThumbnailsSidebar,
  onSelectPage,
  onUpdatePageProgress,
  onBackToPreviews,
  onBackToLibrary,
}: SinglePageWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);

  const [rotation, setRotation] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [draggingGuide, setDraggingGuide] = useState(false);

  const pageProgress = getOrInitPageProgress(pattern, pageNumber);

  // Scroll active thumbnail into view when changing pages
  useEffect(() => {
    if (activeThumbRef.current && typeof activeThumbRef.current.scrollIntoView === 'function') {
      activeThumbRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [pageNumber, showThumbnailsSidebar]);

  // Render the selected single page cleanly onto the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!pdfDoc || !canvas) return;

    let cancelled = false;
    setRendering(true);
    setRenderError(null);

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore cancel error
      }
      renderTaskRef.current = null;
    }

    async function drawPage() {
      if (!pdfDoc || !canvas) return;
      try {
        const { task } = await renderPageToCanvas(pdfDoc, pageNumber, canvas, {
          scale: zoomScale,
          rotation,
        });
        if (cancelled) {
          task.cancel();
          return;
        }
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) {
          setRendering(false);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'RenderingCancelledException') return;
        setRenderError('No se pudo renderizar esta página del PDF.');
        setRendering(false);
      }
    }

    void drawPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageNumber, zoomScale, rotation]);

  // Fit page width to current viewport
  const handleFitToWidth = useCallback(async () => {
    if (!pdfDoc || !viewportContainerRef.current) return;
    try {
      const page = await pdfDoc.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1, rotation });
      const availableWidth = Math.max(320, viewportContainerRef.current.clientWidth - 64);
      const fitted = Math.min(2.5, Math.max(0.5, Number((availableWidth / baseViewport.width).toFixed(2))));
      onChangeZoom(fitted);
    } catch {
      // ignore
    }
  }, [pdfDoc, pageNumber, rotation, onChangeZoom]);

  // Dragging logic for the horizontal reading guide
  const updateGuidePositionFromClientY = useCallback(
    (clientY: number) => {
      const container = pageContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.height <= 0) return;
      const pct = Math.min(96, Math.max(4, ((clientY - rect.top) / rect.height) * 100));
      onUpdatePageProgress(pageNumber, {
        ...pageProgress,
        guideVisible: true,
        guideYPercent: Number(pct.toFixed(1)),
        updatedAt: new Date().toISOString(),
      });
    },
    [onUpdatePageProgress, pageNumber, pageProgress]
  );

  useEffect(() => {
    if (!draggingGuide) return;
    const onPointerMove = (e: PointerEvent) => {
      updateGuidePositionFromClientY(e.clientY);
    };
    const onPointerUp = () => {
      setDraggingGuide(false);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [draggingGuide, updateGuidePositionFromClientY]);

  const toggleGuide = () => {
    onUpdatePageProgress(pageNumber, {
      ...pageProgress,
      guideVisible: !pageProgress.guideVisible,
      guideYPercent: pageProgress.guideYPercent ?? 35,
      updatedAt: new Date().toISOString(),
    });
  };

  const nudgeGuide = (deltaPercent: number) => {
    const current = pageProgress.guideYPercent ?? 35;
    const next = Math.min(96, Math.max(4, current + deltaPercent));
    onUpdatePageProgress(pageNumber, {
      ...pageProgress,
      guideVisible: true,
      guideYPercent: Number(next.toFixed(1)),
      updatedAt: new Date().toISOString(),
    });
  };

  const pageNumbers = Array.from({ length: pattern.numPages }, (_, i) => i + 1);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#FAF7F2]">
      {/* Top Workspace Toolbar */}
      <header className="z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DFD3] bg-[#FFFDF9] px-3 py-2.5 sm:px-4">
        {/* Left: Back & Previews */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToLibrary}
            className="inline-flex items-center gap-1 rounded-lg border border-[#DFD5C7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2C241E] transition hover:bg-[#F4EFE6]"
            title="Volver a Mi Biblioteca"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Biblioteca</span>
          </button>

          <button
            type="button"
            onClick={onBackToPreviews}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFD5C7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2C241E] transition hover:bg-[#F4EFE6]"
            title="Ver todas las páginas en cuadrícula de previews"
          >
            <LayoutGrid className="h-3.5 w-3.5 text-[#B4432C]" />
            <span>Previews ({pattern.numPages})</span>
          </button>

          <button
            type="button"
            onClick={onToggleThumbnailsSidebar}
            className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition md:inline-flex ${
              showThumbnailsSidebar
                ? 'border-[#C84B31]/40 bg-[#FDF0E6] text-[#B4432C]'
                : 'border-[#DFD5C7] bg-white text-[#5E5045] hover:bg-[#F4EFE6]'
            }`}
            title="Mostrar u ocultar barra lateral de previews"
          >
            <PanelLeft className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Miniaturas</span>
          </button>

          <div className="hidden max-w-[200px] truncate pl-1 text-xs font-bold text-[#2C241E] xl:block">
            {pattern.title}
          </div>
        </div>

        {/* Center: Page Separator Navigation */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[#E6DDD0] bg-[#FAF6F0] px-1.5 py-1">
          <button
            type="button"
            aria-label="Página anterior"
            onClick={() => onSelectPage(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="rounded-lg p-1.5 text-[#2C241E] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <select
            aria-label="Seleccionar página"
            value={pageNumber}
            onChange={(e) => onSelectPage(Number(e.target.value))}
            className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#2C241E] shadow-2xs ring-1 ring-[#E2D7C8] focus:outline-none"
          >
            {pageNumbers.map((n) => (
              <option key={n} value={n}>
                Página {n} de {pattern.numPages}
              </option>
            ))}
          </select>

          <button
            type="button"
            aria-label="Página siguiente"
            onClick={() => onSelectPage(Math.min(pattern.numPages, pageNumber + 1))}
            disabled={pageNumber >= pattern.numPages}
            className="rounded-lg p-1.5 text-[#2C241E] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Right: Zoom, Rotate & Row Guide */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-[#E6DDD0] bg-white p-0.5">
            <button
              type="button"
              aria-label="Alejar"
              onClick={() => onChangeZoom(Math.max(0.5, Number((zoomScale - 0.15).toFixed(2))))}
              className="rounded-md p-1.5 text-[#5E5045] hover:bg-[#F4EFE6]"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitToWidth}
              title="Ajustar al ancho de la pantalla"
              className="px-2 text-xs font-semibold text-[#2C241E] hover:text-[#B4432C]"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              type="button"
              aria-label="Acercar"
              onClick={() => onChangeZoom(Math.min(2.75, Number((zoomScale + 0.15).toFixed(2))))}
              className="rounded-md p-1.5 text-[#5E5045] hover:bg-[#F4EFE6]"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            aria-label="Rotar página 90 grados"
            title="Rotar 90°"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="rounded-lg border border-[#E6DDD0] bg-white p-2 text-[#5E5045] transition hover:bg-[#F4EFE6]"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleGuide}
            title="Activar guía horizontal de lectura (se guarda por página)"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              pageProgress.guideVisible
                ? 'border-[#C84B31] bg-[#C84B31] text-white'
                : 'border-[#E6DDD0] bg-white text-[#5E5045] hover:bg-[#F4EFE6]'
            }`}
          >
            <Ruler className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Guía</span>
          </button>
        </div>
      </header>

      {/* 3-Column Workspace */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left Thumbnail Previews Strip */}
        {showThumbnailsSidebar && (
          <aside className="hidden w-48 shrink-0 flex-col border-r border-[#E8DFD3] bg-[#F6F1E9] md:flex">
            <div className="border-b border-[#E8DFD3] px-3 py-2 text-[11px] font-bold tracking-wider text-[#7A6B5F] uppercase">
              Previews ({pattern.numPages})
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5">
              {pageNumbers.map((num) => {
                const pProgress = getOrInitPageProgress(pattern, num);
                const mainCount = pProgress.counters[0]?.value ?? 0;
                const isSelected = num === pageNumber;
                const thumb = thumbnails[num];
                const dotColor = PAGE_STATUS_META[pProgress.status].dot;

                return (
                  <button
                    key={num}
                    ref={isSelected ? activeThumbRef : undefined}
                    type="button"
                    onClick={() => onSelectPage(num)}
                    className={`group w-full overflow-hidden rounded-xl border bg-white p-1.5 text-left transition ${
                      isSelected
                        ? 'border-[#C84B31] ring-2 ring-[#C84B31]/25'
                        : 'border-[#E2D8CA] hover:border-[#BCA994]'
                    }`}
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-[#FAF7F2]">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={`Miniatura página ${num}`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-[#9E8E7E]">
                          Pág. {num}
                        </div>
                      )}
                      {mainCount > 0 && (
                        <span className="absolute right-1 bottom-1 rounded-md bg-[#2C241E]/85 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          #{mainCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between px-1 text-[11px]">
                      <span
                        className={`font-semibold ${
                          isSelected ? 'text-[#B4432C]' : 'text-[#4C4037]'
                        }`}
                      >
                        Pág. {num}
                      </span>
                      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Center Single-Page PDF Viewport */}
        <main
          ref={viewportContainerRef}
          className="relative flex-1 overflow-auto bg-[#EDE6DA] p-4 sm:p-6 lg:p-8"
        >
          {pageProgress.guideVisible && (
            <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-[#DFD5C7] bg-white/95 px-3 py-1 text-xs text-[#5E5045] shadow-xs">
              <span className="font-semibold text-[#B4432C]">Guía activa:</span>
              <span>Arrastra la franja o ajústala:</span>
              <button
                type="button"
                aria-label="Subir guía de lectura"
                onClick={() => nudgeGuide(-2)}
                className="rounded-md bg-[#F4EFE6] p-1 hover:bg-[#E6DDD0]"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Bajar guía de lectura"
                onClick={() => nudgeGuide(2)}
                className="rounded-md bg-[#F4EFE6] p-1 hover:bg-[#E6DDD0]"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex min-h-full items-start justify-center">
            <div
              ref={pageContainerRef}
              className="relative inline-block overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/10"
            >
              <canvas ref={canvasRef} className="block" />

              {/* Movable horizontal row reading guide */}
              {pageProgress.guideVisible && (
                <div
                  role="slider"
                  aria-label="Guía de lectura horizontal"
                  aria-valuemin={4}
                  aria-valuemax={96}
                  aria-valuenow={Math.round(pageProgress.guideYPercent ?? 35)}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDraggingGuide(true);
                  }}
                  style={{ top: `${pageProgress.guideYPercent ?? 35}%` }}
                  className="group absolute inset-x-0 -translate-y-1/2 cursor-ns-resize select-none"
                >
                  <div className="h-7 w-full border-y-2 border-[#C84B31] bg-[#C84B31]/18 transition group-hover:bg-[#C84B31]/25" />
                  <span className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md bg-[#C84B31] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    Línea actual
                  </span>
                </div>
              )}

              {rendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#2C241E] shadow-md">
                    <Loader2 className="h-4 w-4 animate-spin text-[#C84B31]" />
                    Cargando página {pageNumber}...
                  </div>
                </div>
              )}

              {renderError && (
                <div className="p-8 text-center text-sm text-[#B4432C]">
                  {renderError}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Per-Page Counter & Memory Panel */}
        <div className="h-[44vh] w-full shrink-0 lg:h-auto lg:w-88 xl:w-96">
          <PageCounterPanel
            pageNumber={pageNumber}
            numPages={pattern.numPages}
            progress={pageProgress}
            lastSavedAt={lastSavedAt}
            onChangeProgress={(updated) => onUpdatePageProgress(pageNumber, updated)}
          />
        </div>
      </div>
    </div>
  );
}
