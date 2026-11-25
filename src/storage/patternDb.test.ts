import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDefaultPageProgress,
  deletePattern,
  exportProgressBackup,
  getAllPatterns,
  getOrInitPageProgress,
  getPatternById,
  getPatternProgressSummary,
  getPdfBuffer,
  loadSessionState,
  mergeProgressBackup,
  savePatternWithPdf,
  saveSessionState,
  updatePatternRecord,
} from './patternDb';
import type { PatternRecord } from '../types/pattern';

function makePattern(id = 'pat_test_1'): PatternRecord {
  const now = new Date().toISOString();
  return {
    id,
    title: 'Chal Bosque Encantado',
    designer: 'Diseñadora Ravelry',
    craft: 'knitting',
    ravelryUrl: 'https://www.ravelry.com/patterns/library/test',
    fileName: 'chal_bosque.pdf',
    fileSize: 1024,
    numPages: 3,
    lastPage: 1,
    pages: {
      1: createDefaultPageProgress(1),
      2: createDefaultPageProgress(2),
      3: createDefaultPageProgress(3),
    },
    createdAt: now,
    updatedAt: now,
  };
}

describe('patternDb persistent memory', () => {
  beforeEach(async () => {
    const existing = await getAllPatterns();
    for (const p of existing) {
      await deletePattern(p.id);
    }
    localStorage.clear();
  });

  it('saves PDF bytes and per-page progress across sessions', async () => {
    const pattern = makePattern('pat_session_1');
    const sampleBytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]).buffer;

    await savePatternWithPdf(pattern, sampleBytes);

    // Update page 2 counter, notes, and reading guide position
    const page2 = getOrInitPageProgress(pattern, 2);
    const updatedPattern: PatternRecord = {
      ...pattern,
      lastPage: 2,
      pages: {
        ...pattern.pages,
        2: {
          ...page2,
          status: 'in_progress',
          counters: [{ ...page2.counters[0], value: 18, target: 30 }],
          notes: 'Cambiar a aguja 4.5mm en la vuelta 18',
          guideVisible: true,
          guideYPercent: 62.5,
        },
      },
    };
    await updatePatternRecord(updatedPattern);

    // Simulate next session: read fresh from IndexedDB
    const restored = await getPatternById('pat_session_1');
    expect(restored).not.toBeNull();
    expect(restored?.lastPage).toBe(2);
    expect(restored?.pages[2].status).toBe('in_progress');
    expect(restored?.pages[2].counters[0].value).toBe(18);
    expect(restored?.pages[2].counters[0].target).toBe(30);
    expect(restored?.pages[2].notes).toBe('Cambiar a aguja 4.5mm en la vuelta 18');
    expect(restored?.pages[2].guideVisible).toBe(true);
    expect(restored?.pages[2].guideYPercent).toBe(62.5);

    // Verify page 1 and page 3 remain independent
    expect(restored?.pages[1].counters[0].value).toBe(0);
    expect(restored?.pages[3].counters[0].value).toBe(0);

    // Verify binary PDF bytes survived
    const restoredPdf = await getPdfBuffer('pat_session_1');
    expect(restoredPdf).not.toBeNull();
    expect(Array.from(new Uint8Array(restoredPdf!))).toEqual([
      37, 80, 68, 70, 45, 49, 46, 55,
    ]);
  });

  it('computes pattern progress summary accurately', () => {
    const pattern = makePattern('pat_summary');
    pattern.pages[1].status = 'completed';
    pattern.pages[1].counters[0].value = 12;
    pattern.pages[2].status = 'in_progress';
    pattern.pages[2].counters[0].value = 8;

    const summary = getPatternProgressSummary(pattern);
    expect(summary.completedPages).toBe(1);
    expect(summary.inProgressPages).toBe(1);
    expect(summary.totalRowsCounted).toBe(20);
  });

  it('exports and merges backup progress', async () => {
    const pattern = makePattern('pat_backup');
    await savePatternWithPdf(pattern, new ArrayBuffer(16));

    const backup = await exportProgressBackup();
    backup.patterns[0].lastPage = 3;
    backup.patterns[0].pages[3].counters[0].value = 25;
    backup.patterns[0].pages[3].status = 'completed';

    const { updatedCount } = await mergeProgressBackup(backup);
    expect(updatedCount).toBe(1);

    const restored = await getPatternById('pat_backup');
    expect(restored?.lastPage).toBe(3);
    expect(restored?.pages[3].counters[0].value).toBe(25);
    expect(restored?.pages[3].status).toBe('completed');
  });

  it('persists and restores session UI state', () => {
    saveSessionState({
      lastOpenedPatternId: 'pat_123',
      lastViewMode: 'page',
      zoomScale: 1.45,
      showThumbnailsSidebar: false,
    });

    const loaded = loadSessionState();
    expect(loaded).toEqual({
      lastOpenedPatternId: 'pat_123',
      lastViewMode: 'page',
      zoomScale: 1.45,
      showThumbnailsSidebar: false,
    });
  });
});
