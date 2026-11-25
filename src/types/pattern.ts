export type CraftType = 'knitting' | 'crochet' | 'other';

export type PageStatus = 'pending' | 'in_progress' | 'completed';

export interface PageCounter {
  id: string;
  label: string;
  value: number;
  target: number | null;
  step: number;
}

export interface PageProgress {
  pageNumber: number;
  status: PageStatus;
  counters: PageCounter[];
  notes: string;
  guideYPercent: number | null;
  guideVisible: boolean;
  updatedAt: string;
}

export interface PatternRecord {
  id: string;
  title: string;
  designer: string;
  craft: CraftType;
  ravelryUrl: string;
  fileName: string;
  fileSize: number;
  numPages: number;
  lastPage: number;
  coverDataUrl?: string;
  pages: Record<number, PageProgress>;
  createdAt: string;
  updatedAt: string;
}

export type AppViewMode = 'library' | 'previews' | 'page';

export interface SessionState {
  lastOpenedPatternId: string | null;
  lastViewMode: AppViewMode;
  zoomScale: number;
  showThumbnailsSidebar: boolean;
}

export interface RavelryLibraryVolume {
  id: number;
  title: string;
  author_name?: string;
  pattern_id?: number;
  ravelry_url?: string;
  download_url?: string;
  thumbnail_url?: string;
  pdf_url?: string;
}

export interface PatternBackupPayload {
  version: 1;
  exportedAt: string;
  patterns: PatternRecord[];
}
