import { Fragment, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, History, Bell, CopyPlus, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { SeguimientoBoard, CronogramaProceso, CronogramaActividad, CronogramaEstado, CronogramaFrecuenciaRecordatorio, CronogramaCompania, CronogramaHistorialItem, SiloType } from '@/types/database';
import { SILO_LABELS } from '@/types/database';
import type { UserDirectoryEntry } from '@/hooks/useUserDirectory';
import {
  computeAvancePorProceso, registrarCambioHistorial, computeFrecuencia, revisarYEnviarRecordatorios,
  FRECUENCIA_RECORDATORIO_LABEL, MES_LABELS,
} from '@/lib/reunionOperativa';

const CRONO_ESTADO_LABEL: Record<CronogramaEstado, string> = {
  pendiente: '⚪ Pendiente', en_progreso: '🟡 En progreso', completado: '✅ Completado',
};
const CRONO_ESTADO_LABEL_PLAIN: Record<CronogramaEstado, string> = {
  pendiente: 'Pendiente', en_progreso: 'En progreso', completado: 'Completado',
};

// Años disponibles en el filtro: desde 2024 y siempre unos años por delante
// del actual ("en adelante"), sin quedar nunca corto.
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS_DISPONIBLES = Array.from({ length: ANIO_ACTUAL + 4 - 2024 + 1 }, (_, i) => 2024 + i);

const COMPANIAS: CronogramaCompania[] = ['Febeca', 'Sillaca', 'Beval', 'Mundial de Partes', 'Cofersa'];

interface CronogramaProcesosProps {
  board: SeguimientoBoard;
  grupoProcesosColumnId: string | null;
  currentMeetingId: string | null;
  directory: UserDirectoryEntry[];
  onOpenTask: (id: string) => void;
  onLinkedTaskCreated: () => void;
}

export function CronogramaProcesos({ board, grupoProcesosColumnId, currentMeetingId, directory, onOpenTask, onLinkedTaskCreated }: CronogramaProcesosProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [procesos, setProcesos] = useState<CronogramaProceso[]>([]);
  const [actividades, setActividades] = useState<CronogramaActividad[]>([]);
  const [loading, setLoading] = useState(true);

  const [addingProceso, setAddingProceso] = useState(false);
  const [newProcesoNombre, setNewProcesoNombre] = useState('');

  const [filtroAnio, setFiltroAnio] = useState(ANIO_ACTUAL);
  const [filtroCompania, setFiltroCompania] = useState('todos');
  const [filtroProceso, setFiltroProceso] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroResponsable, setFiltroResponsable] = useState('todos');
  const [filtroMes, setFiltroMes] = useState('todos');
  const [soloProximos, setSoloProximos] = useState(false);

  const [copiarAnioOpen, setCopiarAnioOpen] = useState(false);
  const [copiarAnioDestino, setCopiarAnioDestino] = useState<number>(ANIO_ACTUAL + 1);
  const [copiandoAnio, setCopiandoAnio] = useState(false);

  const [actividadDialog, setActividadDialog] = useState<{ procesoId: string; actividad: CronogramaActividad | null } | null>(null);
  const [actForm, setActForm] = useState<{
    nombre: string; meses: number[]; anio: number; companias: CronogramaCompania[]; responsable_user_id: string; estado: CronogramaEstado;
    dias_recordatorio: number; frecuencia_recordatorio: CronogramaFrecuenciaRecordatorio;
  }>({
    nombre: '', meses: [], anio: ANIO_ACTUAL, companias: [], responsable_user_id: '', estado: 'pendiente',
    dias_recordatorio: 7, frecuencia_recordatorio: 'una_vez',
  });

  const [pendingCompletar, setPendingCompletar] = useState<CronogramaActividad | null>(null);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historial, setHistorial] = useState<CronogramaHistorialItem[]>([]);

  const [boardMemberIds, setBoardMemberIds] = useState<string[]>([]);

  useEffect(() => {
    const loadMembers = async () => {
      const { data } = await supabase.from('seguimiento_board_miembros' as any).select('member_user_id').eq('board_id', board.id);
      const ids = new Set<string>([board.created_by, ...(((data ?? []) as any[]).map((m) => m.member_user_id))]);
      setBoardMemberIds(Array.from(ids));
    };
    loadMembers();
  }, [board.id, board.created_by]);

  // Solo se ofrecen como responsables los miembros de esta reunión operativa
  // (no todo el directorio de la organización).
  const directoryMiembros = useMemo(
    () => directory.filter((u) => boardMemberIds.includes(u.user_id)),
    [directory, boardMemberIds],
  );

  const loadData = async () => {
    setLoading(true);
    const { data: procs } = await supabase.from('cronograma_procesos' as any).select('*').eq('board_id', board.id).order('orden');
    const procesoIds = (procs ?? []).map((p: any) => p.id);
    let acts: any[] = [];
    if (procesoIds.length > 0) {
      const { data } = await supabase.from('cronograma_actividades' as any).select('*').in('proceso_id', procesoIds).order('orden');
      acts = data ?? [];
    }
    const procesosList = (procs ?? []) as unknown as CronogramaProceso[];
    let actividadesList = acts as unknown as CronogramaActividad[];
    setProcesos(procesosList);
    setActividades(actividadesList);
    setLoading(false);

    // Revisa recordatorios pendientes cada vez que alguien abre el
    // cronograma (no requiere infraestructura de servidor: el chequeo ocurre
    // al cargar la vista). Solo aplica al año en curso: los meses marcados
    // de un año pasado o futuro no representan el ciclo activo ahora mismo.
    if (user) {
      const delAnioActual = actividadesList.filter((a) => a.anio === ANIO_ACTUAL);
      const actualizadas = await revisarYEnviarRecordatorios(delAnioActual, procesosList, board.id, user.id);
      actividadesList = actividadesList.map((a) => actualizadas.find((u) => u.id === a.id) ?? a);
      setActividades(actividadesList);
    }
  };

  useEffect(() => { loadData(); }, [board.id]);

  const loadHistorial = async () => {
    const actividadIds = actividades.map((a) => a.id);
    if (actividadIds.length === 0) { setHistorial([]); return; }
    const { data } = await supabase.from('cronograma_historial' as any)
      .select('*').in('actividad_id', actividadIds).order('created_at', { ascending: false }).limit(50);
    setHistorial((data ?? []) as unknown as CronogramaHistorialItem[]);
  };

  const responsableNombre = (id: string | null) => id ? (directory.find((u) => u.user_id === id)?.full_name ?? 'Usuario') : null;

  const handleAddProceso = async () => {
    if (!newProcesoNombre.trim()) return;
    const { data, error } = await supabase.from('cronograma_procesos' as any)
      .insert({ board_id: board.id, nombre: newProcesoNombre.trim(), orden: procesos.length }).select('*').single();
    if (error || !data) { toast({ title: 'Error', description: error?.message, variant: 'destructive' }); return; }
    setProcesos((curr) => [...curr, data as unknown as CronogramaProceso]);
    setNewProcesoNombre('');
    setAddingProceso(false);
  };

  const handleDeleteProceso = async (id: string) => {
    if (!confirm('¿Eliminar este proceso y todas sus actividades del cronograma?')) return;
    const { error } = await supabase.from('cronograma_procesos' as any).delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setProcesos((curr) => curr.filter((p) => p.id !== id));
    setActividades((curr) => curr.filter((a) => a.proceso_id !== id));
  };

  const openAddActividad = (procesoId: string) => {
    setActForm({
      nombre: '', meses: [], anio: filtroAnio, companias: filtroCompania !== 'todos' ? [filtroCompania as CronogramaCompania] : [],
      responsable_user_id: '', estado: 'pendiente', dias_recordatorio: 7, frecuencia_recordatorio: 'una_vez',
    });
    setActividadDialog({ procesoId, actividad: null });
  };
  const openEditActividad = (actividad: CronogramaActividad) => {
    setActForm({
      nombre: actividad.nombre, meses: actividad.meses, anio: actividad.anio, companias: actividad.compania ? [actividad.compania] : [],
      responsable_user_id: actividad.responsable_user_id ?? '', estado: actividad.estado,
      dias_recordatorio: actividad.dias_recordatorio, frecuencia_recordatorio: actividad.frecuencia_recordatorio,
    });
    setActividadDialog({ procesoId: actividad.proceso_id, actividad });
  };
  const toggleMesForm = (mes: number) => {
    setActForm((f) => ({ ...f, meses: f.meses.includes(mes) ? f.meses.filter((m) => m !== mes) : [...f.meses, mes].sort((a, b) => a - b) }));
  };
  const toggleCompaniaForm = (compania: CronogramaCompania) => {
    setActForm((f) => ({ ...f, companias: f.companias.includes(compania) ? f.companias.filter((c) => c !== compania) : [...f.companias, compania] }));
  };

  const saveActividad = async () => {
    if (!actividadDialog || !actForm.nombre.trim() || !user) return;
    const responsableId = actForm.responsable_user_id || null;
    const diasRecordatorio = Number.isFinite(actForm.dias_recordatorio) && actForm.dias_recordatorio >= 0 ? Math.round(actForm.dias_recordatorio) : 7;
    // Sin compañía seleccionada = una actividad sin clasificar. Con una o
    // más, se guarda/crea una fila por cada compañía elegida — así no hay
    // que repetir la misma actividad cuando aplica a varias compañías.
    const companiasDestino: (CronogramaCompania | null)[] = actForm.companias.length > 0 ? actForm.companias : [null];
    const [primeraCompania, ...companiasExtra] = companiasDestino;

    if (actividadDialog.actividad) {
      const prev = actividadDialog.actividad;
      const { error } = await supabase.from('cronograma_actividades' as any).update({
        nombre: actForm.nombre.trim(), meses: actForm.meses, anio: actForm.anio, compania: primeraCompania, responsable_user_id: responsableId, estado: actForm.estado,
        dias_recordatorio: diasRecordatorio, frecuencia_recordatorio: actForm.frecuencia_recordatorio,
      }).eq('id', prev.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      if (prev.nombre !== actForm.nombre.trim()) await registrarCambioHistorial(prev.id, user.id, 'nombre', prev.nombre, actForm.nombre.trim());
      if (prev.anio !== actForm.anio) await registrarCambioHistorial(prev.id, user.id, 'año', String(prev.anio), String(actForm.anio));
      if (prev.compania !== primeraCompania) await registrarCambioHistorial(prev.id, user.id, 'compañía', prev.compania ?? 'Sin asignar', primeraCompania ?? 'Sin asignar');
      if (prev.responsable_user_id !== responsableId) await registrarCambioHistorial(prev.id, user.id, 'responsable', responsableNombre(prev.responsable_user_id), responsableNombre(responsableId));
      if (prev.estado !== actForm.estado) await registrarCambioHistorial(prev.id, user.id, 'estado', prev.estado, actForm.estado);
      if (prev.dias_recordatorio !== diasRecordatorio || prev.frecuencia_recordatorio !== actForm.frecuencia_recordatorio) {
        await registrarCambioHistorial(
          prev.id, user.id, 'recordatorio',
          `${prev.dias_recordatorio}d · ${FRECUENCIA_RECORDATORIO_LABEL[prev.frecuencia_recordatorio]}`,
          `${diasRecordatorio}d · ${FRECUENCIA_RECORDATORIO_LABEL[actForm.frecuencia_recordatorio]}`,
        );
      }
      if (prev.estado !== 'completado' && actForm.estado === 'completado' && prev.seguimiento_id) {
        await supabase.from('seguimientos').update({ estado: 'completado' }).eq('id', prev.seguimiento_id);
        onLinkedTaskCreated();
      }
      setActividades((curr) => curr.map((a) => a.id === prev.id
        ? {
          ...a, nombre: actForm.nombre.trim(), meses: actForm.meses, anio: actForm.anio, compania: primeraCompania, responsable_user_id: responsableId, estado: actForm.estado,
          dias_recordatorio: diasRecordatorio, frecuencia_recordatorio: actForm.frecuencia_recordatorio,
        }
        : a));

      // Si se agregaron más compañías al editar, se clonan como filas
      // nuevas (la fila editada ya cubre la primera compañía elegida).
      if (companiasExtra.length > 0) {
        const ordenBase = actividades.filter((a) => a.proceso_id === prev.proceso_id).length;
        const nuevas = companiasExtra.map((c, i) => ({
          proceso_id: prev.proceso_id, nombre: actForm.nombre.trim(), meses: actForm.meses, anio: actForm.anio, compania: c,
          responsable_user_id: responsableId, estado: actForm.estado, orden: ordenBase + i,
          dias_recordatorio: diasRecordatorio, frecuencia_recordatorio: actForm.frecuencia_recordatorio,
        }));
        const { data, error: insError } = await supabase.from('cronograma_actividades' as any).insert(nuevas).select('*');
        if (insError) {
          toast({ title: 'Se guardó, pero no se pudieron duplicar todas las compañías', description: insError.message, variant: 'destructive' });
        } else {
          setActividades((curr) => [...curr, ...(data as unknown as CronogramaActividad[])]);
        }
      }
    } else {
      const ordenBase = actividades.filter((a) => a.proceso_id === actividadDialog.procesoId).length;
      const nuevas = companiasDestino.map((c, i) => ({
        proceso_id: actividadDialog.procesoId, nombre: actForm.nombre.trim(), meses: actForm.meses, anio: actForm.anio, compania: c,
        responsable_user_id: responsableId, estado: actForm.estado, orden: ordenBase + i,
        dias_recordatorio: diasRecordatorio, frecuencia_recordatorio: actForm.frecuencia_recordatorio,
      }));
      const { data, error } = await supabase.from('cronograma_actividades' as any).insert(nuevas).select('*');
      if (error || !data) { toast({ title: 'Error', description: error?.message, variant: 'destructive' }); return; }
      setActividades((curr) => [...curr, ...(data as unknown as CronogramaActividad[])]);
    }
    setActividadDialog(null);
  };

  const handleDeleteActividad = async (actividad: CronogramaActividad) => {
    if (!confirm('¿Eliminar esta actividad del cronograma?')) return;
    const { error } = await supabase.from('cronograma_actividades' as any).delete().eq('id', actividad.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setActividades((curr) => curr.filter((a) => a.id !== actividad.id));
  };

  const handleToggleMes = async (actividad: CronogramaActividad, mes: number) => {
    if (!user) return;
    const nuevos = actividad.meses.includes(mes) ? actividad.meses.filter((m) => m !== mes) : [...actividad.meses, mes].sort((a, b) => a - b);
    const anteriorLabel = actividad.meses.map((m) => MES_LABELS[m - 1]).join(', ') || '—';
    const nuevoLabel = nuevos.map((m) => MES_LABELS[m - 1]).join(', ') || '—';
    setActividades((curr) => curr.map((a) => a.id === actividad.id ? { ...a, meses: nuevos } : a));
    await supabase.from('cronograma_actividades' as any).update({ meses: nuevos }).eq('id', actividad.id);
    await registrarCambioHistorial(actividad.id, user.id, 'meses', anteriorLabel, nuevoLabel);
  };

  const handleResponsableChange = async (actividad: CronogramaActividad, userId: string | null) => {
    if (!user) return;
    const anterior = responsableNombre(actividad.responsable_user_id);
    setActividades((curr) => curr.map((a) => a.id === actividad.id ? { ...a, responsable_user_id: userId } : a));
    await supabase.from('cronograma_actividades' as any).update({ responsable_user_id: userId }).eq('id', actividad.id);
    await registrarCambioHistorial(actividad.id, user.id, 'responsable', anterior, responsableNombre(userId));
  };

  const handleProcesoChange = async (actividad: CronogramaActividad, nuevoProcesoId: string) => {
    if (!user || nuevoProcesoId === actividad.proceso_id) return;
    const anterior = procesos.find((p) => p.id === actividad.proceso_id)?.nombre ?? null;
    const nuevo = procesos.find((p) => p.id === nuevoProcesoId)?.nombre ?? null;
    setActividades((curr) => curr.map((a) => a.id === actividad.id ? { ...a, proceso_id: nuevoProcesoId } : a));
    await supabase.from('cronograma_actividades' as any).update({ proceso_id: nuevoProcesoId }).eq('id', actividad.id);
    await registrarCambioHistorial(actividad.id, user.id, 'proceso', anterior, nuevo);
  };

  const crearSeguimientoParaActividad = async (actividad: CronogramaActividad, estadoInicial: CronogramaEstado): Promise<string | null> => {
    if (!user || !grupoProcesosColumnId) {
      toast({ title: 'No se pudo crear el seguimiento', description: 'No se encontró el grupo "Procesos" del tablero.', variant: 'destructive' });
      return null;
    }
    const proceso = procesos.find((p) => p.id === actividad.proceso_id);
    // Sin reunion_id: esta tarea vive en el Cronograma (persistente, no por
    // ronda) y no debe aparecer en la agenda de "Reunión" ni clonarse cada
    // vez que se crea una reunión nueva.
    const { data, error } = await supabase.from('seguimientos').insert({
      titulo: actividad.nombre,
      descripcion: proceso ? `Actividad del cronograma — proceso: ${proceso.nombre}` : 'Actividad del cronograma',
      estado: estadoInicial === 'completado' ? 'completado' : 'pendiente',
      prioridad: 'media',
      user_id: user.id,
      board_id: board.id,
      column_id: grupoProcesosColumnId,
      orden: 0,
    } as any).select('id').single();
    if (error || !data) { toast({ title: 'No se pudo crear el seguimiento', description: error?.message, variant: 'destructive' }); return null; }
    const seguimientoId = (data as any).id as string;
    await supabase.from('cronograma_actividades' as any).update({ seguimiento_id: seguimientoId }).eq('id', actividad.id);
    setActividades((curr) => curr.map((a) => a.id === actividad.id ? { ...a, seguimiento_id: seguimientoId } : a));
    onLinkedTaskCreated();
    return seguimientoId;
  };

  const handleClickActividadNombre = async (actividad: CronogramaActividad) => {
    if (actividad.seguimiento_id) { onOpenTask(actividad.seguimiento_id); return; }
    const id = await crearSeguimientoParaActividad(actividad, actividad.estado);
    if (id) onOpenTask(id);
  };

  const applyEstado = async (actividad: CronogramaActividad, nuevoEstado: CronogramaEstado, crearSeguimiento: boolean) => {
    if (!user) return;
    let seguimientoId = actividad.seguimiento_id;
    if (crearSeguimiento && !seguimientoId) {
      seguimientoId = await crearSeguimientoParaActividad(actividad, 'completado');
    } else if (seguimientoId && nuevoEstado === 'completado') {
      await supabase.from('seguimientos').update({ estado: 'completado' }).eq('id', seguimientoId);
      onLinkedTaskCreated();
    }
    const anterior = actividad.estado;
    await supabase.from('cronograma_actividades' as any).update({ estado: nuevoEstado }).eq('id', actividad.id);
    setActividades((curr) => curr.map((a) => a.id === actividad.id ? { ...a, estado: nuevoEstado, seguimiento_id: seguimientoId ?? a.seguimiento_id } : a));
    await registrarCambioHistorial(actividad.id, user.id, 'estado', anterior, nuevoEstado);
  };

  const handleQuickEstadoChange = (actividad: CronogramaActividad, nuevoEstado: CronogramaEstado) => {
    if (nuevoEstado === 'completado' && !actividad.seguimiento_id) {
      setPendingCompletar(actividad);
      return;
    }
    void applyEstado(actividad, nuevoEstado, false);
  };

  const confirmCompletarConSeguimiento = async (crear: boolean) => {
    if (!pendingCompletar) return;
    await applyEstado(pendingCompletar, 'completado', crear);
    setPendingCompletar(null);
  };

  const mesActual = new Date().getMonth() + 1;

  // El cronograma de cada año es independiente: todo lo demás (filtros,
  // resumen por proceso) parte de las actividades del año seleccionado.
  const actividadesDelAnio = useMemo(() => actividades.filter((a) => a.anio === filtroAnio), [actividades, filtroAnio]);

  // El filtro de compañía se aplica a todas las vistas del cronograma
  // (resumen por proceso y tabla), no solo a la tabla.
  const actividadesVisibles = useMemo(
    () => actividadesDelAnio.filter((a) => filtroCompania === 'todos' || a.compania === filtroCompania),
    [actividadesDelAnio, filtroCompania],
  );

  const actividadesFiltradas = useMemo(() => actividadesVisibles.filter((a) => {
    if (filtroProceso !== 'todos' && a.proceso_id !== filtroProceso) return false;
    if (filtroEstado !== 'todos' && a.estado !== filtroEstado) return false;
    if (filtroResponsable !== 'todos' && a.responsable_user_id !== filtroResponsable) return false;
    if (filtroMes !== 'todos' && !a.meses.includes(Number(filtroMes))) return false;
    if (soloProximos && !a.meses.includes(mesActual)) return false;
    return true;
  }), [actividadesVisibles, filtroProceso, filtroEstado, filtroResponsable, filtroMes, soloProximos, mesActual]);

  // Por defecto solo se muestran los procesos que ya tienen actividades
  // cargadas. Un proceso vacio solo aparece si se elige explicitamente en el
  // filtro "Proceso" (asi se puede seguir agregando su primera actividad).
  const procesosAMostrar = procesos.filter((p) => filtroProceso === p.id || actividadesFiltradas.some((a) => a.proceso_id === p.id));
  const avancePorProceso = useMemo(() => computeAvancePorProceso(actividadesVisibles, procesos), [actividadesVisibles, procesos]);

  const handleCopiarAnio = async () => {
    if (!user) return;
    if (actividadesDelAnio.length === 0) {
      toast({ title: 'No hay nada que copiar', description: `El año ${filtroAnio} no tiene actividades.`, variant: 'destructive' });
      return;
    }
    setCopiandoAnio(true);
    try {
      const nuevas = actividadesDelAnio.map((a) => ({
        proceso_id: a.proceso_id, nombre: a.nombre, meses: a.meses, anio: copiarAnioDestino, compania: a.compania,
        responsable_user_id: a.responsable_user_id, estado: 'pendiente' as CronogramaEstado, orden: a.orden,
        dias_recordatorio: a.dias_recordatorio, frecuencia_recordatorio: a.frecuencia_recordatorio,
      }));
      const { data, error } = await supabase.from('cronograma_actividades' as any).insert(nuevas).select('*');
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      setActividades((curr) => [...curr, ...(data as unknown as CronogramaActividad[])]);
      setFiltroAnio(copiarAnioDestino);
      setCopiarAnioOpen(false);
      toast({ title: `Cronograma ${filtroAnio} copiado a ${copiarAnioDestino}`, description: `${(data ?? []).length} actividad(es) creada(s), sin marcar como completadas.` });
    } finally {
      setCopiandoAnio(false);
    }
  };

  const handleExportPDF = async () => {
    const rows = procesosAMostrar.flatMap((proc) =>
      actividadesFiltradas.filter((a) => a.proceso_id === proc.id).map((a) => ({
        proceso: proc.nombre,
        actividad: a.nombre,
        meses: a.meses,
        estado: CRONO_ESTADO_LABEL_PLAIN[a.estado],
        responsable: responsableNombre(a.responsable_user_id),
        compania: a.compania,
      })),
    );
    if (rows.length === 0) {
      toast({ title: 'Nada que exportar', description: 'No hay actividades con los filtros actuales.', variant: 'destructive' });
      return;
    }
    const siloLabel = board.silo ? (SILO_LABELS[board.silo as SiloType] ?? board.silo) : 'Personal';
    const { exportCronogramaPDF } = await import('@/lib/pdfExport');
    await exportCronogramaPDF(rows, {
      silo: siloLabel,
      anio: filtroAnio,
      compania: filtroCompania === 'todos' ? 'Todas las compañías' : filtroCompania,
    });
  };

  if (loading) return <div className="p-8 text-center text-slate-400 text-sm">Cargando cronograma...</div>;

  return (
    <div className="flex flex-col gap-4">
      {avancePorProceso.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {avancePorProceso.map((a) => (
            <Card key={a.procesoId} className="px-3 py-2 border-slate-200 shadow-sm">
              <div className="text-[11px] font-semibold text-slate-500">{a.nombre}</div>
              <div className="text-sm font-bold text-slate-800">
                {a.completadas}/{a.total}
                {a.pct !== null && <span className="text-indigo-600 ml-1">({a.pct}%)</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(filtroAnio)} onValueChange={(v) => setFiltroAnio(Number(v))}>
          <SelectTrigger className="h-8 w-28 text-xs font-semibold"><SelectValue placeholder="Año" /></SelectTrigger>
          <SelectContent>
            {ANIOS_DISPONIBLES.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroCompania} onValueChange={setFiltroCompania}>
          <SelectTrigger className="h-8 w-44 text-xs font-semibold"><SelectValue placeholder="Compañía" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Global (todas)</SelectItem>
            {COMPANIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroProceso} onValueChange={setFiltroProceso}>
          <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los procesos</SelectItem>
            {procesos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">⚪ Pendiente</SelectItem>
            <SelectItem value="en_progreso">🟡 En progreso</SelectItem>
            <SelectItem value="completado">✅ Completado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroResponsable} onValueChange={setFiltroResponsable}>
          <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Responsable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los responsables</SelectItem>
            {directoryMiembros.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Mes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los meses</SelectItem>
            {MES_LABELS.map((label, idx) => <SelectItem key={idx + 1} value={String(idx + 1)}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant={soloProximos ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setSoloProximos((v) => !v)}>
          Próximos vencimientos
        </Button>
        <Button
          size="sm" variant="outline" className="h-8 text-xs ml-auto"
          onClick={() => { setCopiarAnioDestino(filtroAnio + 1); setCopiarAnioOpen(true); }}
        >
          <CopyPlus className="h-3.5 w-3.5 mr-1" /> Copiar a otro año
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setHistorialOpen(true); loadHistorial(); }}>
          <History className="h-3.5 w-3.5 mr-1" /> Ver historial
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleExportPDF}>
          <Download className="h-3.5 w-3.5 mr-1" /> Exportar PDF
        </Button>
      </div>

      <div className="overflow-x-auto border border-slate-300 rounded-xl">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="border-slate-300">
              <TableHead className="w-44 whitespace-nowrap border-r border-slate-200 bg-slate-50">Proceso</TableHead>
              <TableHead className="min-w-[300px] whitespace-nowrap border-r border-slate-200 bg-slate-50">Actividad</TableHead>
              {MES_LABELS.map((label) => (
                <TableHead key={label} className="w-12 text-center text-[10px] border-r border-slate-200 px-1 bg-slate-50">{label}</TableHead>
              ))}
              <TableHead className="w-36 border-r border-slate-200 bg-slate-50">Estado</TableHead>
              <TableHead className="w-40 border-r border-slate-200 bg-slate-50">Responsable</TableHead>
              <TableHead className="w-20 text-right bg-slate-50">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {procesosAMostrar.map((proc) => {
              const actividadesDeProceso = actividadesFiltradas.filter((a) => a.proceso_id === proc.id);
              return (
                <Fragment key={proc.id}>
                  <TableRow className="bg-slate-100 hover:bg-slate-100 border-slate-300">
                    <TableCell colSpan={MES_LABELS.length + 5} className="py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 text-sm">{proc.nombre}</span>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openAddActividad(proc.id)}>
                            <Plus className="h-3 w-3 mr-1" /> Actividad
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" title="Eliminar proceso" onClick={() => handleDeleteProceso(proc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  {actividadesDeProceso.map((act, i) => (
                    <TableRow key={act.id} className={`border-slate-200 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                      <TableCell className="border-r border-slate-200">
                        <Select value={act.proceso_id} onValueChange={(v) => handleProcesoChange(act, v)}>
                          <SelectTrigger className="h-7 px-2 text-[11px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {procesos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="whitespace-nowrap border-r border-slate-200">
                        <button type="button" className="block text-left text-sm font-medium text-slate-800 hover:text-indigo-600 hover:underline" onClick={() => handleClickActividadNombre(act)}>
                          {act.nombre}
                        </button>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{computeFrecuencia(act.meses)}</span>
                          <span className="flex items-center gap-0.5" title="Recordatorio">
                            <Bell className="h-2.5 w-2.5" /> {act.dias_recordatorio}d · {FRECUENCIA_RECORDATORIO_LABEL[act.frecuencia_recordatorio]}
                          </span>
                          {act.compania && (
                            <span className="rounded-sm bg-slate-100 px-1 py-0.5 font-medium text-slate-500">{act.compania}</span>
                          )}
                        </div>
                      </TableCell>
                      {MES_LABELS.map((label, idx) => {
                        const mes = idx + 1;
                        const activo = act.meses.includes(mes);
                        return (
                          <TableCell key={mes} className="text-center p-0 border-r border-slate-200">
                            <button
                              type="button"
                              title={label}
                              onClick={() => handleToggleMes(act, mes)}
                              className={`w-full h-10 transition-colors ${activo ? 'bg-emerald-100 hover:bg-emerald-200' : 'bg-transparent hover:bg-slate-100'}`}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell className="border-r border-slate-200">
                        <Select value={act.estado} onValueChange={(v) => handleQuickEstadoChange(act, v as CronogramaEstado)}>
                          <SelectTrigger className="h-7 px-2 text-[11px]"><SelectValue>{CRONO_ESTADO_LABEL[act.estado]}</SelectValue></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">⚪ Pendiente</SelectItem>
                            <SelectItem value="en_progreso">🟡 En progreso</SelectItem>
                            <SelectItem value="completado">✅ Completado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="border-r border-slate-200">
                        <Select value={act.responsable_user_id ?? 'none'} onValueChange={(v) => handleResponsableChange(act, v === 'none' ? null : v)}>
                          <SelectTrigger className="h-7 px-2 text-[11px]"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {directoryMiembros.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => openEditActividad(act)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" title="Eliminar" onClick={() => handleDeleteActividad(act)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {actividadesDeProceso.length === 0 && (
                    <TableRow key={`empty-${proc.id}`} className="border-slate-200">
                      <TableCell colSpan={MES_LABELS.length + 5} className="text-center text-xs text-slate-400 py-4">
                        Sin actividades en este proceso
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {addingProceso ? (
        <div className="flex items-center gap-2">
          <Input autoFocus placeholder="Nombre del proceso..." value={newProcesoNombre}
            onChange={(e) => setNewProcesoNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddProceso()} className="max-w-xs" />
          <Button size="sm" onClick={handleAddProceso}>Agregar</Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingProceso(false)}>Cancelar</Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="self-start" onClick={() => setAddingProceso(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar proceso
        </Button>
      )}

      <Dialog open={!!actividadDialog} onOpenChange={(o) => !o && setActividadDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{actividadDialog?.actividad ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre *</Label>
              <Input autoFocus value={actForm.nombre} onChange={(e) => setActForm((f) => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div className="max-w-[160px]">
              <Label>Año</Label>
              <Select value={String(actForm.anio)} onValueChange={(v) => setActForm((f) => ({ ...f, anio: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANIOS_DISPONIBLES.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Compañía(s)</Label>
              <p className="text-[11px] text-slate-400 mb-1">Si aplica a varias, se crea una actividad idéntica en cada una.</p>
              <div className="grid grid-cols-2 gap-2">
                {COMPANIAS.map((c) => (
                  <label key={c} className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={actForm.companias.includes(c)} onCheckedChange={() => toggleCompaniaForm(c)} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Meses</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {MES_LABELS.map((label, idx) => {
                  const mes = idx + 1;
                  return (
                    <label key={mes} className="flex items-center gap-1.5 text-xs">
                      <Checkbox checked={actForm.meses.includes(mes)} onCheckedChange={() => toggleMesForm(mes)} />
                      {label}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estado</Label>
                <Select value={actForm.estado} onValueChange={(v: CronogramaEstado) => setActForm((f) => ({ ...f, estado: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En progreso</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsable</Label>
                <Select value={actForm.responsable_user_id || 'none'} onValueChange={(v) => setActForm((f) => ({ ...f, responsable_user_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {directoryMiembros.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Recordatorio al responsable</Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <Label className="text-xs text-slate-500">Días de anticipación</Label>
                  <Input
                    type="number" min={0} value={actForm.dias_recordatorio}
                    onChange={(e) => setActForm((f) => ({ ...f, dias_recordatorio: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Frecuencia del aviso</Label>
                  <Select value={actForm.frecuencia_recordatorio} onValueChange={(v: CronogramaFrecuenciaRecordatorio) => setActForm((f) => ({ ...f, frecuencia_recordatorio: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="una_vez">Una vez</SelectItem>
                      <SelectItem value="diario">Diario</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActividadDialog(null)}>Cancelar</Button>
            <Button onClick={saveActividad} className="bg-indigo-600 hover:bg-indigo-700">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copiarAnioOpen} onOpenChange={(o) => !copiandoAnio && setCopiarAnioOpen(o)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Copiar cronograma {filtroAnio} a otro año</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">
            Se crean copias de las {actividadesDelAnio.length} actividad(es) de {filtroAnio} (mismos procesos, meses y responsables) en el año destino, todas en estado Pendiente y sin seguimiento vinculado. Las actividades de {filtroAnio} no se modifican.
          </p>
          <div>
            <Label>Año destino</Label>
            <Select value={String(copiarAnioDestino)} onValueChange={(v) => setCopiarAnioDestino(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ANIOS_DISPONIBLES.filter((y) => y !== filtroAnio).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopiarAnioOpen(false)} disabled={copiandoAnio}>Cancelar</Button>
            <Button onClick={handleCopiarAnio} disabled={copiandoAnio} className="bg-indigo-600 hover:bg-indigo-700">
              {copiandoAnio ? 'Copiando...' : 'Copiar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingCompletar} onOpenChange={(o) => !o && setPendingCompletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Generar el seguimiento de esta actividad?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingCompletar?.nombre}" todavía no tiene un seguimiento vinculado en el tablero. ¿Quieres generarlo antes de marcarla como completada?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmCompletarConSeguimiento(false)} className="bg-slate-500 hover:bg-slate-600">
              Solo marcar completada
            </AlertDialogAction>
            <AlertDialogAction onClick={() => confirmCompletarConSeguimiento(true)}>
              Sí, generar seguimiento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={historialOpen} onOpenChange={setHistorialOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Historial de cambios del cronograma</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {historial.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-6">Sin cambios registrados aún</div>
            ) : historial.map((h) => {
              const actividad = actividades.find((a) => a.id === h.actividad_id);
              const nombreUsuario = directory.find((u) => u.user_id === h.user_id)?.full_name ?? 'Usuario';
              return (
                <div key={h.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                  <div className="text-slate-700">
                    <span className="font-medium">{nombreUsuario}</span> cambió <span className="font-medium">{h.campo}</span> de
                    {' '}"{h.valor_anterior ?? '—'}" a "{h.valor_nuevo ?? '—'}" en "{actividad?.nombre ?? 'actividad eliminada'}"
                  </div>
                  <div className="text-xs text-slate-400">{format(parseISO(h.created_at), "d MMM yyyy, HH:mm", { locale: es })}</div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
