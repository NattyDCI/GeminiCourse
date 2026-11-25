import type { CraftType, PageStatus } from '../types/pattern';

export const PAGE_STATUS_META: Record<
  PageStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: 'Pendiente',
    bg: 'bg-[#F0EAE1]',
    text: 'text-[#6B5D52]',
    dot: 'bg-[#A69585]',
  },
  in_progress: {
    label: 'En progreso',
    bg: 'bg-[#FDF0E6]',
    text: 'text-[#B4432C]',
    dot: 'bg-[#C84B31]',
  },
  completed: {
    label: 'Completada',
    bg: 'bg-[#E5F2EA]',
    text: 'text-[#255C3F]',
    dot: 'bg-[#2F6F4E]',
  },
};

export const CRAFT_META: Record<CraftType, { label: string; badge: string }> = {
  knitting: { label: 'Dos agujas', badge: 'bg-[#EFE6DC] text-[#6A4A35]' },
  crochet: { label: 'Crochet', badge: 'bg-[#EAE9F4] text-[#4B4472]' },
  other: { label: 'Otro', badge: 'bg-[#ECECEC] text-[#525252]' },
};

export function PageStatusBadge({
  status,
  compact = false,
}: {
  status: PageStatus;
  compact?: boolean;
}) {
  const meta = PAGE_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${meta.bg} ${meta.text} ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function CraftBadge({ craft }: { craft: CraftType }) {
  const meta = CRAFT_META[craft];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}
