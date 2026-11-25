import type {
  PageCounter,
  PageProgress,
  PatternBackupPayload,
  PatternRecord,
  SessionState,
} from '../types/pattern';

const DB_NAME = 'ravelry_pattern_studio_db';
const DB_VERSION = 1;
const STORE_PATTERNS = 'patterns';
const STORE_PDF_FILES = 'pdfFiles';
const SESSION_STORAGE_KEY = 'ravelry_pattern_studio_session_v1';

const DEFAULT_SESSION_STATE: SessionState = {
  lastOpenedPatternId: null,
  lastViewMode: 'library',
  zoomScale: 1.15,
  showThumbnailsSidebar: true,
};

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultCounter(label = 'Vueltas / Filas'): PageCounter {
  return {
    id: generateId('cnt'),
    label,
    value: 0,
    target: null,
    step: 1,
  };
}

export function createDefaultPageProgress(pageNumber: number): PageProgress {
  return {
    pageNumber,
    status: 'pending',
    counters: [createDefaultCounter()],
    notes: '',
    guideYPercent: 35,
    guideVisible: false,
    updatedAt: new Date().toISOString(),
  };
}

export function getOrInitPageProgress(
  pattern: PatternRecord,
  pageNumber: number
): PageProgress {
  const existing = pattern.pages[pageNumber];
  if (existing) {
    return {
      ...existing,
      counters:
        existing.counters && existing.counters.length > 0
          ? existing.counters
          : [createDefaultCounter()],
    };
  }
  return createDefaultPageProgress(pageNumber);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PATTERNS)) {
        db.createObjectStore(STORE_PATTERNS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PDF_FILES)) {
        db.createObjectStore(STORE_PDF_FILES);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('No se pudo abrir IndexedDB'));
  });
}

function runTx<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  executor: (tx: IDBTransaction) => Promise<T> | T
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeNames, mode);
        let resultValue: T;

        Promise.resolve(executor(tx))
          .then((val) => {
            resultValue = val;
          })
          .catch((err) => {
            try {
              tx.abort();
            } catch {
              // ignore abort error
            }
            reject(err);
          });

        tx.oncomplete = () => {
          db.close();
          resolve(resultValue);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('Error en la transacción de memoria'));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error('Transacción cancelada'));
        };
      })
  );
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Error de lectura/escritura'));
  });
}

export async function savePatternWithPdf(
  pattern: PatternRecord,
  pdfBytes: ArrayBuffer
): Promise<void> {
  // Store a clean copy of the ArrayBuffer in IndexedDB
  const bufferCopy = pdfBytes.slice(0);
  await runTx([STORE_PATTERNS, STORE_PDF_FILES], 'readwrite', async (tx) => {
    await Promise.all([
      requestToPromise(tx.objectStore(STORE_PATTERNS).put(pattern)),
      requestToPromise(tx.objectStore(STORE_PDF_FILES).put(bufferCopy, pattern.id)),
    ]);
  });
}

export async function updatePatternRecord(pattern: PatternRecord): Promise<void> {
  const updated: PatternRecord = {
    ...pattern,
    updatedAt: new Date().toISOString(),
  };
  await runTx([STORE_PATTERNS], 'readwrite', async (tx) => {
    await requestToPromise(tx.objectStore(STORE_PATTERNS).put(updated));
  });
}

export async function getAllPatterns(): Promise<PatternRecord[]> {
  const records = await runTx([STORE_PATTERNS], 'readonly', async (tx) => {
    const all = await requestToPromise(tx.objectStore(STORE_PATTERNS).getAll());
    return all as PatternRecord[];
  });
  return records.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getPatternById(id: string): Promise<PatternRecord | null> {
  const record = await runTx([STORE_PATTERNS], 'readonly', async (tx) => {
    return (await requestToPromise(
      tx.objectStore(STORE_PATTERNS).get(id)
    )) as PatternRecord | undefined;
  });
  return record ?? null;
}

export async function getPdfBuffer(id: string): Promise<ArrayBuffer | null> {
  const buf = await runTx([STORE_PDF_FILES], 'readonly', async (tx) => {
    return (await requestToPromise(
      tx.objectStore(STORE_PDF_FILES).get(id)
    )) as ArrayBuffer | undefined;
  });
  return buf ? buf.slice(0) : null;
}

export async function deletePattern(id: string): Promise<void> {
  await runTx([STORE_PATTERNS, STORE_PDF_FILES], 'readwrite', async (tx) => {
    await Promise.all([
      requestToPromise(tx.objectStore(STORE_PATTERNS).delete(id)),
      requestToPromise(tx.objectStore(STORE_PDF_FILES).delete(id)),
    ]);
  });
}

export async function exportProgressBackup(): Promise<PatternBackupPayload> {
  const patterns = await getAllPatterns();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    patterns,
  };
}

/**
 * Merges saved per-page progress & metadata from a backup payload into existing patterns
 * stored in IndexedDB (matching by pattern ID or fileName).
 */
export async function mergeProgressBackup(
  payload: PatternBackupPayload
): Promise<{ updatedCount: number }> {
  if (!payload || payload.version !== 1 || !Array.isArray(payload.patterns)) {
    throw new Error('El archivo de respaldo no tiene un formato válido.');
  }

  const existing = await getAllPatterns();
  let updatedCount = 0;

  for (const incoming of payload.patterns) {
    const match =
      existing.find((p) => p.id === incoming.id) ??
      existing.find((p) => p.fileName === incoming.fileName);

    if (match) {
      const merged: PatternRecord = {
        ...match,
        title: incoming.title || match.title,
        designer: incoming.designer ?? match.designer,
        craft: incoming.craft ?? match.craft,
        ravelryUrl: incoming.ravelryUrl ?? match.ravelryUrl,
        lastPage: Math.min(Math.max(1, incoming.lastPage || 1), match.numPages),
        pages: {
          ...match.pages,
          ...incoming.pages,
        },
        updatedAt: new Date().toISOString(),
      };
      await updatePatternRecord(merged);
      updatedCount += 1;
    }
  }

  return { updatedCount };
}

export function loadSessionState(): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SESSION_STATE };
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      lastOpenedPatternId: parsed.lastOpenedPatternId ?? null,
      lastViewMode:
        parsed.lastViewMode === 'previews' ||
        parsed.lastViewMode === 'page' ||
        parsed.lastViewMode === 'library'
          ? parsed.lastViewMode
          : 'library',
      zoomScale:
        typeof parsed.zoomScale === 'number' &&
        parsed.zoomScale >= 0.5 &&
        parsed.zoomScale <= 3
          ? parsed.zoomScale
          : 1.15,
      showThumbnailsSidebar:
        typeof parsed.showThumbnailsSidebar === 'boolean'
          ? parsed.showThumbnailsSidebar
          : true,
    };
  } catch {
    return { ...DEFAULT_SESSION_STATE };
  }
}

export function saveSessionState(state: SessionState): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota issues
  }
}

/**
 * Computes summary stats for a pattern across all its pages.
 */
export function getPatternProgressSummary(pattern: PatternRecord): {
  completedPages: number;
  inProgressPages: number;
  totalRowsCounted: number;
} {
  let completedPages = 0;
  let inProgressPages = 0;
  let totalRowsCounted = 0;

  for (let p = 1; p <= pattern.numPages; p += 1) {
    const page = pattern.pages[p];
    if (!page) continue;
    if (page.status === 'completed') completedPages += 1;
    else if (page.status === 'in_progress') inProgressPages += 1;

    for (const c of page.counters || []) {
      totalRowsCounted += c.value || 0;
    }
  }

  return { completedPages, inProgressPages, totalRowsCounted };
}
