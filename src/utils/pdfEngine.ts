import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type { PDFDocumentProxy, RenderTask };

/**
 * Loads an ArrayBuffer into a PDF.js document instance.
 * Copies the bytes so the worker transfer does not mutate caller buffers.
 */
export async function loadPdfDocument(buffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  const bytes = new Uint8Array(buffer.slice(0));
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  return loadingTask.promise;
}

/**
 * Renders a single PDF page onto a target HTMLCanvasElement with HiDPI support.
 */
export async function renderPageToCanvas(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  options: { scale: number; rotation?: number }
): Promise<{ width: number; height: number; task: RenderTask }> {
  const page = await pdfDoc.getPage(pageNumber);
  const rotation = options.rotation ?? 0;
  const viewport = page.getViewport({ scale: options.scale, rotation });
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const renderTask = page.render({
    canvas,
    viewport,
    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
    background: '#FFFFFF',
  });

  return {
    width: Math.floor(viewport.width),
    height: Math.floor(viewport.height),
    task: renderTask,
  };
}

/**
 * Renders a crisp thumbnail preview data URL for a specific page.
 */
export async function renderPageThumbnail(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  targetWidth = 260
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const renderTask = page.render({
    canvas,
    viewport,
    background: '#FFFFFF',
  });
  await renderTask.promise;

  return canvas.toDataURL('image/jpeg', 0.85);
}
