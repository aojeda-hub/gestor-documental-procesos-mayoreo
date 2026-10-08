import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, ListChecks, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { COLUMNS, PRIORIDAD_LABEL, PRIORIDAD_COLOR } from '@/lib/seguimientoConstants';
import type { Estado, Prioridad } from '@/lib/seguimientoConstants';

interface Row {
  id: string;
  titulo: string;
  estado: Estado;
  prioridad: Prioridad;
  responsable: string | null;
  fecha_limite: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

const ESTADO_LABEL: Record<Estado, string> = Object.fromEntries(COLUMNS.map(c => [c.key, c.label])) as Record<Estado, string>;
const ESTADO_DOT: Record<Estado, string> = Object.fromEntries(COLUMNS.map(c => [c.key, c.color])) as Record<Estado, string>;

export function ProjectSeguimientosDialog({ open, onOpenChange, projectId, projectName }: Props) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    supabase.from('seguimientos' as any)
      .select('id, titulo, estado, prioridad, responsable, fecha_limite')
      .eq('project_id', projectId)
      .order('fecha_limite', { ascending: true, nullsFirst: false })
      .then(({ data }) => { setRows((data as unknown as Row[]) || []); setLoading(false); });
  }, [open, projectId]);

  const pendientes = rows.filter(r => r.estado !== 'completado' && r.estado !== 'cancelado');
  const resto = rows.filter(r => r.estado === 'completado' || r.estado === 'cancelado');

  const openCard = (id: string) => {
    onOpenChange(false);
    navigate(`/seguimientos?card=${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" /> Seguimientos</DialogTitle>
          <p className="text-sm text-muted-foreground">{projectName}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Este proyecto todavía no tiene seguimientos vinculados.</p>
            <p className="text-xs text-muted-foreground">
              Vincúlalo seleccionando este proyecto en el campo "Proyecto" al crear o editar un seguimiento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendientes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendientes ({pendientes.length})</p>
                {pendientes.map(r => <SeguimientoRow key={r.id} r={r} onClick={() => openCard(r.id)} />)}
              </div>
            )}
            {resto.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completados / cancelados ({resto.length})</p>
                {resto.map(r => <SeguimientoRow key={r.id} r={r} onClick={() => openCard(r.id)} />)}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SeguimientoRow({ r, onClick }: { r: Row; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-md border px-3 py-2 text-left hover:bg-accent transition-colors"
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${ESTADO_DOT[r.estado]}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{r.titulo}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{ESTADO_LABEL[r.estado]}</span>
          {r.responsable && <span>· {r.responsable}</span>}
          {r.fecha_limite && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {format(new Date(r.fecha_limite), "d MMM yyyy", { locale: es })}
            </span>
          )}
        </div>
      </div>
      <Badge variant="outline" className={PRIORIDAD_COLOR[r.prioridad]}>{PRIORIDAD_LABEL[r.prioridad]}</Badge>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}
