import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DOCUMENT_ESTATUS_COLORS, DOCUMENT_ESTATUS_LABELS } from '@/types/database';
import type { DocumentEstatus } from '@/types/database';
import { ESTATUS_BAR_COLORS, ESTATUS_FLOW, pctAprobado } from './mapaUtils';
import type { EstatusCounts } from './mapaUtils';

/** Barra apilada con la distribución de estatus. */
export function EstatusBar({ counts, className }: { counts: EstatusCounts; className?: string }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className={cn('flex h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      {total > 0 && ESTATUS_FLOW.map(s => counts[s] > 0 && (
        <Tooltip key={s}>
          <TooltipTrigger asChild>
            <div className={ESTATUS_BAR_COLORS[s]} style={{ width: `${(counts[s] / total) * 100}%` }} />
          </TooltipTrigger>
          <TooltipContent className="text-xs">{DOCUMENT_ESTATUS_LABELS[s]}: {counts[s]}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/** Barra + % aprobado + total, para filas de resumen. */
export function EstatusProgress({ counts, className }: { counts: EstatusCounts; className?: string }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <EstatusBar counts={counts} className="flex-1" />
      <span className="w-10 text-right text-xs font-semibold tabular-nums">{pctAprobado(counts)}%</span>
      <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{total}</span>
    </div>
  );
}

export function EstatusBadge({ estatus }: { estatus: DocumentEstatus }) {
  return (
    <span className={cn('inline-block whitespace-nowrap rounded border px-2 py-0.5 text-[11px] font-medium', DOCUMENT_ESTATUS_COLORS[estatus])}>
      {DOCUMENT_ESTATUS_LABELS[estatus]}
    </span>
  );
}

export function EstatusSelect({
  value, onChange, disabled,
}: { value: DocumentEstatus; onChange: (v: DocumentEstatus) => void; disabled?: boolean }) {
  if (disabled) return <EstatusBadge estatus={value} />;
  return (
    <Select value={value} onValueChange={v => onChange(v as DocumentEstatus)}>
      <SelectTrigger className="h-7 w-[140px] border-0 bg-transparent px-1 shadow-none focus:ring-1">
        <SelectValue><EstatusBadge estatus={value} /></SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ESTATUS_FLOW.map(s => (
          <SelectItem key={s} value={s}><EstatusBadge estatus={s} /></SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EstatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {ESTATUS_FLOW.map(s => (
        <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn('h-2.5 w-2.5 rounded-sm', ESTATUS_BAR_COLORS[s])} />
          {DOCUMENT_ESTATUS_LABELS[s]}
        </span>
      ))}
    </div>
  );
}
