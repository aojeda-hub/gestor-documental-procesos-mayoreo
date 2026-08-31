import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import { fetchMembersByTask } from '@/lib/seguimientoResponsables';
import type { Seguimiento, SeguimientoBoard, SeguimientoColumn, ReunionOperativaMeeting, SiloType } from '@/types/database';
import { SILO_LABELS } from '@/types/database';
import { nuevaReunion, computeAvancePorGrupo } from '@/lib/reunionOperativa';
import { SprintSemanalView } from '@/components/seguimientos/SprintSemanalView';
import { CronogramaProcesos } from '@/components/seguimientos/CronogramaProcesos';

const PUNTO_ESTADO_LABEL: Record<string, string> = {
  pendiente: '⚪ Pendiente', en_progreso: '🟡 En progreso', completado: '✅ Completado',
};
const PUNTO_ESTADO_STYLES: Record<string, string> = {
  pendiente: 'bg-slate-100 text-slate-600 border-slate-300',
  en_progreso: 'bg-amber-100 text-amber-700 border-amber-300',
  completado: 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

function cicleEstado(estado: Seguimiento['estado']): Seguimiento['estado'] {
  if (estado === 'pendiente') return 'en_progreso';
  if (estado === 'en_progreso') return 'completado';
  return 'pendiente';
}

interface ReunionOperativaViewProps {
  board: SeguimientoBoard;
  onBack: () => void;
  onOpenTask: (id: string) => void;
}

export function ReunionOperativaView({ board, onBack, onOpenTask }: ReunionOperativaViewProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const directory = useUserDirectory();

  const [columns, setColumns] = useState<SeguimientoColumn[]>([]);
  const [meetings, setMeetings] = useState<ReunionOperativaMeeting[]>([]);
  const [meetingIndex, setMeetingIndex] = useState(0);
  const [puntos, setPuntos] = useState<Seguimiento[]>([]);
  const [membersByTask, setMembersByTask] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [subView, setSubView] = useState<'reunion' | 'sprint' | 'cronograma'>('reunion');

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newPuntoTitulo, setNewPuntoTitulo] = useState('');

  const [newMeetingDialogOpen, setNewMeetingDialogOpen] = useState(false);
  const [newMeetingTitulo, setNewMeetingTitulo] = useState('');
  const [newMeetingFecha, setNewMeetingFecha] = useState('');
  const [creatingMeeting, setCreatingMeeting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: cols }, { data: mts }, { data: pts }] = await Promise.all([
      supabase.from('seguimiento_columns').select('*').eq('board_id', board.id).order('orden'),
      supabase.from('reunion_operativa_meetings' as any).select('*').eq('board_id', board.id).order('numero'),
      supabase.from('seguimientos').select('*').eq('board_id', board.id).order('created_at', { ascending: false }),
    ]);
    const puntosList = (pts ?? []) as Seguimiento[];
    setColumns((cols ?? []) as SeguimientoColumn[]);
    setMeetings((mts ?? []) as unknown as ReunionOperativaMeeting[]);
    setPuntos(puntosList);
    setMembersByTask(await fetchMembersByTask(puntosList.map((p) => p.id)));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [board.id]);

  // Al cargar por primera vez o crear una reunión nueva, ubicarse en la más reciente.
  useEffect(() => {
    if (meetings.length > 0) setMeetingIndex(meetings.length - 1);
  }, [meetings.length]);

  const reloadPuntos = async () => {
    const { data: pts } = await supabase.from('seguimientos').select('*').eq('board_id', board.id).order('created_at', { ascending: false });
    const puntosList = (pts ?? []) as Seguimiento[];
    setPuntos(puntosList);
    setMembersByTask(await fetchMembersByTask(puntosList.map((p) => p.id)));
  };

  const currentMeeting = meetings[meetingIndex] ?? null;
  const puntosDeReunion = useMemo(
    () => currentMeeting ? puntos.filter((p) => p.reunion_id === currentMeeting.id) : [],
    [puntos, currentMeeting],
  );
  const avancePorGrupo = useMemo(() => computeAvancePorGrupo(puntosDeReunion, columns), [puntosDeReunion, columns]);
  const groupedPuntos = useMemo(() => {
    const g: Record<string, Seguimiento[]> = {};
    columns.forEach((c) => { g[c.id] = []; });
    puntosDeReunion.forEach((p) => { if (p.column_id && g[p.column_id]) g[p.column_id].push(p); });
    return g;
  }, [columns, puntosDeReunion]);
  const grupoProcesosColumn = columns.find((c) => c.nombre === 'Procesos') ?? null;

  const handleToggleEstadoPunto = async (punto: Seguimiento) => {
    const nuevo = cicleEstado(punto.estado);
    setPuntos((curr) => curr.map((p) => p.id === punto.id ? { ...p, estado: nuevo } : p));
    await supabase.from('seguimientos').update({ estado: nuevo }).eq('id', punto.id);
  };

  const handleDeletePunto = async (id: string) => {
    if (!confirm('¿Eliminar este punto?')) return;
    const { error } = await supabase.from('seguimientos').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setPuntos((curr) => curr.filter((p) => p.id !== id));
  };

  const handleAddPunto = async (columnId: string) => {
    if (!newPuntoTitulo.trim() || !user || !currentMeeting) return;
    const orden = puntosDeReunion.filter((p) => p.column_id === columnId).length;
    const { data, error } = await supabase.from('seguimientos').insert({
      titulo: newPuntoTitulo.trim(), estado: 'pendiente', prioridad: 'media',
      user_id: user.id, board_id: board.id, column_id: columnId, reunion_id: currentMeeting.id, orden,
    } as any).select('*').single();
    if (error || !data) { toast({ title: 'Error', description: error?.message, variant: 'destructive' }); return; }
    setPuntos((curr) => [...curr, data as Seguimiento]);
    setNewPuntoTitulo('');
    setAddingTo(null);
  };

  const openNewMeetingDialog = () => {
    const latest = meetings[meetings.length - 1];
    const nextNum = (latest?.numero ?? 0) + 1;
    const hoy = new Date();
    setNewMeetingTitulo(`Reunión ${nextNum} - ${format(hoy, 'dd/MM/yyyy')}`);
    setNewMeetingFecha(format(hoy, 'yyyy-MM-dd'));
    setNewMeetingDialogOpen(true);
  };

  const confirmNewMeeting = async () => {
    const latest = meetings[meetings.length - 1];
    if (!user || !latest) return;
    setCreatingMeeting(true);
    try {
      const puntosDeLatest = puntos.filter((p) => p.reunion_id === latest.id);
      const { clonados } = await nuevaReunion(board, latest, puntosDeLatest, membersByTask, user.id, newMeetingTitulo, newMeetingFecha);
      await loadAll();
      toast({ title: 'Nueva reunión creada', description: clonados > 0 ? `${clonados} punto(s) pendiente(s) trasladado(s).` : undefined });
      setNewMeetingDialogOpen(false);
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setCreatingMeeting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Cargando reunión operativa...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500">
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {board.nombre}
              {board.silo && <span className="text-slate-400 font-medium"> · {SILO_LABELS[board.silo as SiloType] ?? board.silo}</span>}
            </h2>
            <p className="text-sm text-slate-500">Agenda recurrente de Estructura, Procesos y Sistemas</p>
          </div>
        </div>
        <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
          <Button size="sm" variant={subView === 'reunion' ? 'default' : 'ghost'} className="h-8 px-3" onClick={() => setSubView('reunion')}>Reunión</Button>
          <Button size="sm" variant={subView === 'sprint' ? 'default' : 'ghost'} className="h-8 px-3" onClick={() => setSubView('sprint')}>Sprint Semanal</Button>
          <Button size="sm" variant={subView === 'cronograma' ? 'default' : 'ghost'} className="h-8 px-3" onClick={() => setSubView('cronograma')}>Cronograma</Button>
        </div>
      </div>

      {subView === 'reunion' && (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={meetingIndex <= 0} onClick={() => setMeetingIndex((i) => Math.max(0, i - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-semibold text-slate-700 min-w-[220px] text-center">
                {currentMeeting ? currentMeeting.titulo : 'Sin reuniones'}
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={meetingIndex >= meetings.length - 1} onClick={() => setMeetingIndex((i) => Math.min(meetings.length - 1, i + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={openNewMeetingDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4 mr-2" /> Nueva Reunión
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {avancePorGrupo.map((a) => (
              <Card key={a.columnId} className="p-4 border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{a.nombre}</div>
                <div className="text-2xl font-bold text-slate-900">{a.completadas}/{a.total}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{a.pct === null ? 'Sin puntos' : `${a.pct}% completado`}</div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((col) => (
              <div key={col.id} className="flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60 p-3">
                <h4 className="font-bold text-slate-700 mb-3 px-1">{col.nombre}</h4>
                <div className="space-y-2 flex-1">
                  {groupedPuntos[col.id]?.map((punto) => (
                    <Card key={punto.id} className="p-3 shadow-sm border-slate-200/80 group">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" className="text-left text-sm font-medium text-slate-800 hover:text-indigo-600 flex-1" onClick={() => onOpenTask(punto.id)}>
                          {punto.titulo}
                        </button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => handleDeletePunto(punto.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleEstadoPunto(punto)}
                        className={`mt-2 rounded-md border px-2 py-0.5 text-[11px] font-medium ${PUNTO_ESTADO_STYLES[punto.estado] ?? PUNTO_ESTADO_STYLES.pendiente}`}
                      >
                        {PUNTO_ESTADO_LABEL[punto.estado] ?? punto.estado}
                      </button>
                    </Card>
                  ))}
                  {(groupedPuntos[col.id]?.length ?? 0) === 0 && (
                    <div className="text-center text-xs py-6 border border-dashed rounded-xl border-slate-200 text-slate-400">Sin puntos</div>
                  )}
                </div>
                {addingTo === col.id ? (
                  <div className="mt-2 flex items-center gap-1">
                    <Input
                      autoFocus className="h-8 text-sm" placeholder="Nuevo punto..." value={newPuntoTitulo}
                      onChange={(e) => setNewPuntoTitulo(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPunto(col.id)}
                    />
                    <Button size="sm" className="h-8" onClick={() => handleAddPunto(col.id)}>+</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddingTo(null); setNewPuntoTitulo(''); }}>×</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="mt-2 text-slate-500 justify-start" onClick={() => { setAddingTo(col.id); setNewPuntoTitulo(''); }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar punto
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {subView === 'sprint' && (
        <SprintSemanalView
          board={board}
          columns={columns}
          tasks={puntos}
          membersByTask={membersByTask}
          directory={directory}
          onOpenTask={onOpenTask}
          onCloned={reloadPuntos}
          isDone={(t) => t.estado === 'completado'}
        />
      )}

      {subView === 'cronograma' && (
        <CronogramaProcesos
          board={board}
          grupoProcesosColumnId={grupoProcesosColumn?.id ?? null}
          currentMeetingId={currentMeeting?.id ?? null}
          directory={directory}
          onOpenTask={onOpenTask}
          onLinkedTaskCreated={reloadPuntos}
        />
      )}

      <Dialog open={newMeetingDialogOpen} onOpenChange={setNewMeetingDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva Reunión</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">
            Se crea una nueva ronda; los puntos pendientes o en progreso de "{meetings[meetings.length - 1]?.titulo}" se trasladan automáticamente. Los puntos marcados como completado no se clonan.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={newMeetingTitulo} onChange={(e) => setNewMeetingTitulo(e.target.value)} />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={newMeetingFecha} onChange={(e) => setNewMeetingFecha(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMeetingDialogOpen(false)} disabled={creatingMeeting}>Cancelar</Button>
            <Button onClick={confirmNewMeeting} disabled={creatingMeeting} className="bg-indigo-600 hover:bg-indigo-700">
              {creatingMeeting ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
