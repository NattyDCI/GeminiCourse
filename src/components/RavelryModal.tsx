import { useState, type ChangeEvent } from 'react';
import {
  ExternalLink,
  FileUp,
  KeyRound,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { RavelryLibraryVolume } from '../types/pattern';

interface RavelryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachPdfForRavelryItem: (
    file: File,
    meta: { title: string; designer: string; ravelryUrl: string }
  ) => Promise<void>;
}

const RAVELRY_CREDS_KEY = 'ravelry_studio_api_prefs_v1';

export function RavelryModal({
  isOpen,
  onClose,
  onAttachPdfForRavelryItem,
}: RavelryModalProps) {
  const savedPrefs = (() => {
    try {
      const raw = localStorage.getItem(RAVELRY_CREDS_KEY);
      return raw ? (JSON.parse(raw) as { username?: string }) : {};
    } catch {
      return {};
    }
  })();

  const [username, setUsername] = useState(savedPrefs.username ?? '');
  const [accessKey, setAccessKey] = useState('');
  const [personalKey, setPersonalKey] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumes, setVolumes] = useState<RavelryLibraryVolume[]>([]);
  const [attachingId, setAttachingId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleFetchLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      localStorage.setItem(RAVELRY_CREDS_KEY, JSON.stringify({ username }));
    } catch {
      // ignore
    }

    try {
      const response = await fetch('/api/ravelry/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          accessKey,
          personalKey,
          query,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            'No se pudo consultar Ravelry. Verifica tu usuario y tus claves de API.'
        );
      }

      const rawVolumes = Array.isArray(data.volumes) ? data.volumes : [];
      const mapped: RavelryLibraryVolume[] = rawVolumes.map(
        (v: Record<string, unknown>) => {
          const pattern = (v.pattern as Record<string, unknown> | undefined) ?? {};
          const author = (v.author as Record<string, unknown> | undefined) ?? {};
          const firstPhoto =
            (v.first_photo as Record<string, unknown> | undefined) ?? {};
          const patternId =
            typeof v.pattern_id === 'number'
              ? v.pattern_id
              : typeof pattern.id === 'number'
              ? pattern.id
              : undefined;
          const permalink =
            typeof pattern.permalink === 'string' ? pattern.permalink : undefined;

          return {
            id: Number(v.id ?? Math.random() * 100000),
            title: String(v.title || pattern.name || 'Patrón de Ravelry'),
            author_name: String(v.author_name || author.name || ''),
            pattern_id: patternId,
            ravelry_url: permalink
              ? `https://www.ravelry.com/patterns/library/${permalink}`
              : patternId
              ? `https://www.ravelry.com/patterns/library/${patternId}`
              : 'https://www.ravelry.com/library',
            download_url:
              typeof v.download_location === 'string'
                ? v.download_location
                : typeof v.pdf_url === 'string'
                ? v.pdf_url
                : undefined,
            thumbnail_url:
              typeof firstPhoto.square_url === 'string'
                ? firstPhoto.square_url
                : typeof v.square_image_url === 'string'
                ? v.square_image_url
                : undefined,
          };
        }
      );

      setVolumes(mapped);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al conectar con la API de Ravelry.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileAttach = async (
    item: RavelryLibraryVolume,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachingId(item.id);
    try {
      await onAttachPdfForRavelryItem(file, {
        title: item.title,
        designer: item.author_name ?? '',
        ravelryUrl: item.ravelry_url ?? 'https://www.ravelry.com/library',
      });
      onClose();
    } finally {
      setAttachingId(null);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E6DDD0] bg-[#FFFDF9] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EFE7DC] px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#2C241E]">
              Conectar con tu biblioteca de Ravelry
            </h2>
            <p className="text-xs text-[#75665A]">
              Abre tu librería en Ravelry para descargar tus PDFs o sincroniza tu catálogo con API Key.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar modal de Ravelry"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#75665A] hover:bg-[#F3ECE2] hover:text-[#2C241E]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Option 1: Direct Ravelry Library Link */}
          <div className="rounded-2xl border border-[#E8DFD3] bg-[#FAF6F0] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">
                  1. Descarga directa desde Ravelry.com (más rápido)
                </h3>
                <p className="mt-0.5 text-xs text-[#6B5D52]">
                  Abre tu biblioteca de Ravelry, descarga el PDF de tu patrón y arrástralo a esta app. Quedará guardado en tu memoria local para futuras sesiones.
                </p>
              </div>
              <a
                href="https://www.ravelry.com/library"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#C84B31] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#B03E26]"
              >
                Abrir mi Ravelry Library
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Option 2: Optional Ravelry API Sync */}
          <div className="rounded-2xl border border-[#E8DFD3] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#B4432C]" />
              <h3 className="text-sm font-bold text-[#2C241E]">
                2. Sincronizar catálogo vía Ravelry API (opcional)
              </h3>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-[#75665A]">
              Si tienes claves de solo lectura en{' '}
              <a
                href="https://www.ravelry.com/pro/developer"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#B4432C] underline"
              >
                ravelry.com/pro/developer
              </a>{' '}
              (Basic Auth: Read-only), puedes listar tus patrones de Ravelry aquí mismo y vincularles el PDF descargado. Tus claves no se guardan en ningún servidor externo.
            </p>

            <form onSubmit={handleFetchLibrary} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#5E5045]">
                  Usuario de Ravelry
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tu_usuario_ravelry"
                  className="w-full rounded-xl border border-[#DFD5C7] bg-[#FAF7F2] px-3 py-2 text-xs focus:border-[#C84B31] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#5E5045]">
                  Buscar en tu librería (opcional)
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[#9B8B7C]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ej. sweater, shawl..."
                    className="w-full rounded-xl border border-[#DFD5C7] bg-[#FAF7F2] py-2 pr-3 pl-8 text-xs focus:border-[#C84B31] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#5E5045]">
                  Ravelry Access Key
                </label>
                <input
                  type="password"
                  required
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="read-..."
                  className="w-full rounded-xl border border-[#DFD5C7] bg-[#FAF7F2] px-3 py-2 text-xs focus:border-[#C84B31] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#5E5045]">
                  Ravelry Personal Key
                </label>
                <input
                  type="password"
                  required
                  value={personalKey}
                  onChange={(e) => setPersonalKey(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-[#DFD5C7] bg-[#FAF7F2] px-3 py-2 text-xs focus:border-[#C84B31] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2C241E] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#43372E] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Consultar mi librería de Ravelry
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-3 rounded-xl border border-[#F2C4BB] bg-[#FDF1EE] p-3 text-xs text-[#9E2E19]">
                {error}
              </div>
            )}

            {volumes.length > 0 && (
              <div className="mt-4 space-y-2.5">
                <div className="text-xs font-bold text-[#2C241E]">
                  Patrones encontrados ({volumes.length})
                </div>
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {volumes.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#EFE7DC] bg-[#FAF7F2] p-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {item.thumbnail_url ? (
                          <img
                            src={item.thumbnail_url}
                            alt={item.title}
                            className="h-11 w-11 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#EAE1D4] text-xs font-bold text-[#7A6B5F]">
                            PDF
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-[#2C241E]">
                            {item.title}
                          </div>
                          {item.author_name && (
                            <div className="truncate text-[11px] text-[#75665A]">
                              {item.author_name}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {item.ravelry_url && (
                          <a
                            href={item.ravelry_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-[#DFD5C7] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5E5045] hover:bg-[#F3ECE2]"
                          >
                            Ravelry
                          </a>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#C84B31] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#B03E26]">
                          {attachingId === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <FileUp className="h-3 w-3" />
                          )}
                          Vincular PDF
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(e) => handleFileAttach(item, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
