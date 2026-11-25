import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { EditPatternModal } from './components/EditPatternModal';
import { LibraryView } from './components/LibraryView';
import { PagePreviewsGrid } from './components/PagePreviewsGrid';
import { RavelryModal } from './components/RavelryModal';
import { SinglePageWorkspace } from './components/SinglePageWorkspace';
import { usePdfThumbnails } from './hooks/usePdfThumbnails';
import {
  createDefaultPageProgress,
  deletePattern,
  exportProgressBackup,
  generateId,
  getAllPatterns,
  getPdfBuffer,
  loadSessionState,
  mergeProgressBackup,
  savePatternWithPdf,
  saveSessionState,
  updatePatternRecord,
} from './storage/patternDb';
import type {
  AppViewMode,
  PageProgress,
  PatternBackupPayload,
  PatternRecord,
  SessionState,
} from './types/pattern';
import {
  type PDFDocumentProxy,
  loadPdfDocument,
  renderPageThumbnail,
} from './utils/pdfEngine';
import { generateSamplePatternPdf } from './utils/samplePattern';

function cleanTitleFromFilename(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

export function App() {
  const [initializing, setInitializing] = useState(true);
  const [patterns, setPatterns] = useState<PatternRecord[]>([]);
  const [session, setSession] = useState<SessionState>(() => loadSessionState());
  const [viewMode, setViewMode] = useState<AppViewMode>('library');
  const [activePatternId, setActivePatternId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<number>(1);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'info' | 'error'; message: string } | null>(
    null
  );

  const [ravelryModalOpen, setRavelryModalOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<PatternRecord | null>(null);

  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const activePattern = patterns.find((p) => p.id === activePatternId) ?? null;

  const { thumbnails, isGeneratingThumbnails } = usePdfThumbnails(
    pdfDoc,
    activePatternId
  );

  const showToast = useCallback((message: string, type: 'info' | 'error' = 'info') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const persistSession = useCallback((next: SessionState) => {
    setSession(next);
    saveSessionState(next);
  }, []);

  // Load PDF binary from IndexedDB whenever activePatternId changes
  const openPdfFromMemory = useCallback(
    async (pattern: PatternRecord, targetView: AppViewMode, targetPage?: number) => {
      setLoadingPdf(true);
      try {
        const buffer = await getPdfBuffer(pattern.id);
        if (!buffer) {
          showToast(
            'No se encontró el archivo PDF en la memoria del navegador.',
            'error'
          );
          setViewMode('library');
          setActivePatternId(null);
          return;
        }

        if (pdfDocRef.current) {
          try {
            await pdfDocRef.current.cleanup();
          } catch {
            // ignore
          }
          pdfDocRef.current = null;
        }

        const doc = await loadPdfDocument(buffer);
        pdfDocRef.current = doc;
        setPdfDoc(doc);

        const safePage = Math.min(
          Math.max(1, targetPage ?? pattern.lastPage ?? 1),
          doc.numPages
        );
        setActivePatternId(pattern.id);
        setActivePage(safePage);
        setViewMode(targetView);

        const updatedPattern: PatternRecord = {
          ...pattern,
          lastPage: safePage,
        };
        setPatterns((prev) =>
          prev.map((p) => (p.id === pattern.id ? updatedPattern : p))
        );
        await updatePatternRecord(updatedPattern);

        persistSession({
          ...session,
          lastOpenedPatternId: pattern.id,
          lastViewMode: targetView,
        });
      } catch {
        showToast('Error al abrir el PDF desde la memoria.', 'error');
      } finally {
        setLoadingPdf(false);
      }
    },
    [persistSession, session, showToast]
  );

  // Initial startup: load all patterns & restore previous session if applicable
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const storedPatterns = await getAllPatterns();
        if (cancelled) return;
        setPatterns(storedPatterns);

        const savedSession = loadSessionState();
        setSession(savedSession);

        if (
          savedSession.lastOpenedPatternId &&
          savedSession.lastViewMode !== 'library'
        ) {
          const match = storedPatterns.find(
            (p) => p.id === savedSession.lastOpenedPatternId
          );
          if (match) {
            setActivePatternId(match.id);
            setActivePage(match.lastPage || 1);
            setViewMode(savedSession.lastViewMode);
            setLoadingPdf(true);

            const buffer = await getPdfBuffer(match.id);
            if (!cancelled && buffer) {
              const doc = await loadPdfDocument(buffer);
              if (!cancelled) {
                pdfDocRef.current = doc;
                setPdfDoc(doc);
              } else {
                await doc.cleanup();
              }
            }
          }
        }
      } catch {
        // Fallback cleanly to library view
      } finally {
        if (!cancelled) {
          setLoadingPdf(false);
          setInitializing(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        void pdfDocRef.current.cleanup();
      }
    };
  }, []);

  // Import a PDF ArrayBuffer into IndexedDB and refresh state
  const ingestPdfBuffer = useCallback(
    async (
      buffer: ArrayBuffer,
      meta: {
        fileName: string;
        fileSize: number;
        title?: string;
        designer?: string;
        ravelryUrl?: string;
      }
    ): Promise<PatternRecord> => {
      const doc = await loadPdfDocument(buffer);
      let coverDataUrl: string | undefined;
      try {
        coverDataUrl = await renderPageThumbnail(doc, 1, 240);
      } catch {
        coverDataUrl = undefined;
      }

      const numPages = doc.numPages;
      const pages: Record<number, PageProgress> = {};
      for (let i = 1; i <= numPages; i += 1) {
        pages[i] = createDefaultPageProgress(i);
      }

      const now = new Date().toISOString();
      const record: PatternRecord = {
        id: generateId('pat'),
        title: meta.title?.trim() || cleanTitleFromFilename(meta.fileName),
        designer: meta.designer?.trim() || '',
        craft: 'knitting',
        ravelryUrl: meta.ravelryUrl?.trim() || '',
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        numPages,
        lastPage: 1,
        coverDataUrl,
        pages,
        createdAt: now,
        updatedAt: now,
      };

      await doc.cleanup();
      await savePatternWithPdf(record, buffer);

      setPatterns((prev) => [record, ...prev]);
      return record;
    },
    []
  );

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (files.length === 0) {
      showToast('Selecciona archivos en formato PDF.', 'error');
      return;
    }

    setUploading(true);
    try {
      let lastAdded: PatternRecord | null = null;
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        lastAdded = await ingestPdfBuffer(buffer, {
          fileName: file.name,
          fileSize: file.size,
        });
      }

      if (files.length === 1 && lastAdded) {
        showToast(`"${lastAdded.title}" guardado en tu biblioteca.`);
        await openPdfFromMemory(lastAdded, 'previews', 1);
      } else {
        showToast(`${files.length} patrones PDF guardados en tu biblioteca.`);
      }
    } catch {
      showToast(
        'No se pudo leer alguno de los PDFs. Verifica que el archivo no esté dañado.',
        'error'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleAttachPdfFromRavelry = async (
    file: File,
    meta: { title: string; designer: string; ravelryUrl: string }
  ) => {
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const record = await ingestPdfBuffer(buffer, {
        fileName: file.name,
        fileSize: file.size,
        title: meta.title,
        designer: meta.designer,
        ravelryUrl: meta.ravelryUrl,
      });
      showToast(`"${record.title}" vinculado y guardado en memoria.`);
      await openPdfFromMemory(record, 'previews', 1);
    } catch {
      showToast('No se pudo cargar el PDF seleccionado.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSamplePattern = async () => {
    setUploading(true);
    try {
      const buffer = await generateSamplePatternPdf();
      const record = await ingestPdfBuffer(buffer, {
        fileName: 'Sueter_Brisa_de_Otono_Muestra.pdf',
        fileSize: buffer.byteLength,
        title: 'Suéter Brisa de Otoño (Muestra)',
        designer: 'Patrón de ejemplo Ravelry',
        ravelryUrl: 'https://www.ravelry.com/patterns',
      });
      showToast('Patrón de muestra cargado. ¡Explora cada página!');
      await openPdfFromMemory(record, 'previews', 1);
    } catch {
      showToast('No se pudo generar el patrón de muestra.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleBackToLibrary = async () => {
    setViewMode('library');
    setActivePatternId(null);
    if (pdfDocRef.current) {
      try {
        await pdfDocRef.current.cleanup();
      } catch {
        // ignore
      }
      pdfDocRef.current = null;
    }
    setPdfDoc(null);
    persistSession({
      ...session,
      lastViewMode: 'library',
    });
  };

  const handleOpenPreviews = async (patternId: string) => {
    const target = patterns.find((p) => p.id === patternId);
    if (!target) return;

    if (activePatternId === patternId && pdfDoc) {
      setViewMode('previews');
      persistSession({
        ...session,
        lastOpenedPatternId: patternId,
        lastViewMode: 'previews',
      });
      return;
    }

    await openPdfFromMemory(target, 'previews');
  };

  const handleOpenPage = async (patternId: string, pageNumber: number) => {
    const target = patterns.find((p) => p.id === patternId);
    if (!target) return;

    if (activePatternId === patternId && pdfDoc) {
      const safePage = Math.min(Math.max(1, pageNumber), target.numPages);
      setActivePage(safePage);
      setViewMode('page');

      const updated: PatternRecord = { ...target, lastPage: safePage };
      setPatterns((prev) => prev.map((p) => (p.id === patternId ? updated : p)));
      void updatePatternRecord(updated);

      persistSession({
        ...session,
        lastOpenedPatternId: patternId,
        lastViewMode: 'page',
      });
      return;
    }

    await openPdfFromMemory(target, 'page', pageNumber);
  };

  const handleSelectPageInWorkspace = (pageNumber: number) => {
    if (!activePattern) return;
    const safePage = Math.min(Math.max(1, pageNumber), activePattern.numPages);
    setActivePage(safePage);

    const updated: PatternRecord = {
      ...activePattern,
      lastPage: safePage,
    };
    setPatterns((prev) =>
      prev.map((p) => (p.id === activePattern.id ? updated : p))
    );
    void updatePatternRecord(updated);
  };

  const handleUpdatePageProgress = (pageNumber: number, updatedPage: PageProgress) => {
    if (!activePattern) return;
    const now = new Date().toISOString();
    const updatedPattern: PatternRecord = {
      ...activePattern,
      lastPage: pageNumber,
      updatedAt: now,
      pages: {
        ...activePattern.pages,
        [pageNumber]: updatedPage,
      },
    };

    setPatterns((prev) =>
      prev.map((p) => (p.id === activePattern.id ? updatedPattern : p))
    );
    setLastSavedAt(now);
    void updatePatternRecord(updatedPattern);
  };

  const handleSavePatternMeta = async (updated: PatternRecord) => {
    setPatterns((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await updatePatternRecord(updated);
    showToast('Información del patrón actualizada.');
  };

  const handleDeletePattern = async (patternId: string) => {
    await deletePattern(patternId);
    setPatterns((prev) => prev.filter((p) => p.id !== patternId));
    if (session.lastOpenedPatternId === patternId) {
      persistSession({
        ...session,
        lastOpenedPatternId: null,
        lastViewMode: 'library',
      });
    }
    showToast('Patrón eliminado de tu biblioteca.');
  };

  const handleExportBackup = async () => {
    try {
      const payload = await exportProgressBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ravelry-progreso-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Respaldo de progreso descargado.');
    } catch {
      showToast('No se pudo exportar el respaldo.', 'error');
    }
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as PatternBackupPayload;
      const { updatedCount } = await mergeProgressBackup(payload);
      const refreshed = await getAllPatterns();
      setPatterns(refreshed);
      showToast(
        updatedCount > 0
          ? `Progreso restaurado en ${updatedCount} patrón(es).`
          : 'No se encontraron patrones coincidentes en tu biblioteca actual.'
      );
    } catch {
      showToast('El archivo de respaldo no es válido.', 'error');
    }
  };

  if (initializing || loadingPdf) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF7F2] text-[#2C241E]">
        <Loader2 className="h-8 w-8 animate-spin text-[#C84B31]" />
        <p className="text-sm font-medium text-[#6B5D52]">
          {initializing
            ? 'Cargando tu biblioteca y memoria de sesión...'
            : 'Abriendo tu patrón PDF...'}
        </p>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'library' || !activePattern ? (
        <LibraryView
          patterns={patterns}
          lastOpenedPatternId={session.lastOpenedPatternId}
          uploading={uploading}
          onUploadFiles={handleUploadFiles}
          onLoadSamplePattern={handleLoadSamplePattern}
          onOpenPreviews={handleOpenPreviews}
          onOpenPage={handleOpenPage}
          onEditPattern={(p) => setEditingPattern(p)}
          onDeletePattern={handleDeletePattern}
          onOpenRavelryModal={() => setRavelryModalOpen(true)}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
        />
      ) : viewMode === 'previews' ? (
        <PagePreviewsGrid
          pattern={activePattern}
          thumbnails={thumbnails}
          isGeneratingThumbnails={isGeneratingThumbnails}
          onBackToLibrary={handleBackToLibrary}
          onOpenPage={(pageNum) => handleOpenPage(activePattern.id, pageNum)}
        />
      ) : (
        <SinglePageWorkspace
          pattern={activePattern}
          pdfDoc={pdfDoc}
          pageNumber={activePage}
          thumbnails={thumbnails}
          zoomScale={session.zoomScale}
          showThumbnailsSidebar={session.showThumbnailsSidebar}
          lastSavedAt={lastSavedAt}
          onChangeZoom={(nextZoom) =>
            persistSession({ ...session, zoomScale: nextZoom })
          }
          onToggleThumbnailsSidebar={() =>
            persistSession({
              ...session,
              showThumbnailsSidebar: !session.showThumbnailsSidebar,
            })
          }
          onSelectPage={handleSelectPageInWorkspace}
          onUpdatePageProgress={handleUpdatePageProgress}
          onBackToPreviews={() => handleOpenPreviews(activePattern.id)}
          onBackToLibrary={handleBackToLibrary}
        />
      )}

      <RavelryModal
        isOpen={ravelryModalOpen}
        onClose={() => setRavelryModalOpen(false)}
        onAttachPdfForRavelryItem={handleAttachPdfFromRavelry}
      />

      <EditPatternModal
        key={editingPattern?.id ?? 'closed'}
        pattern={editingPattern}
        onClose={() => setEditingPattern(null)}
        onSave={handleSavePatternMeta}
      />

      {toast && (
        <div
          role="status"
          className={`fixed right-4 bottom-4 z-50 rounded-xl px-4 py-3 text-xs font-semibold shadow-lg transition ${
            toast.type === 'error'
              ? 'bg-[#9E2E19] text-white'
              : 'bg-[#2C241E] text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}

export default App;
