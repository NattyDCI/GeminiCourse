import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from '../utils/pdfEngine';
import { renderPageThumbnail } from '../utils/pdfEngine';

/**
 * Progressively generates and caches thumbnail data URLs for all pages of a PDFDocumentProxy.
 */
export function usePdfThumbnails(pdfDoc: PDFDocumentProxy | null, patternId: string | null) {
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loadingCount, setLoadingCount] = useState(0);
  const activePatternRef = useRef<string | null>(null);

  useEffect(() => {
    activePatternRef.current = patternId;
    setThumbnails({});

    if (!pdfDoc || !patternId) {
      setLoadingCount(0);
      return;
    }

    let cancelled = false;
    const total = pdfDoc.numPages;
    setLoadingCount(total);

    async function generateAll() {
      if (!pdfDoc) return;
      for (let pageNum = 1; pageNum <= total; pageNum += 1) {
        if (cancelled || activePatternRef.current !== patternId) return;
        try {
          const dataUrl = await renderPageThumbnail(pdfDoc, pageNum, 280);
          if (cancelled || activePatternRef.current !== patternId) return;
          setThumbnails((prev) => ({ ...prev, [pageNum]: dataUrl }));
        } catch {
          // Skip failed page thumbnail gracefully
        } finally {
          if (!cancelled) {
            setLoadingCount((c) => Math.max(0, c - 1));
          }
        }
      }
    }

    void generateAll();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, patternId]);

  return { thumbnails, isGeneratingThumbnails: loadingCount > 0 };
}
