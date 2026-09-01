import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Seguimiento, SeguimientoBoard, SeguimientoColumn, ReunionOperativaMeeting, CronogramaProceso, CronogramaActividad, CronogramaFrecuenciaRecordatorio } from '@/types/database';
import { syncSeguimientoResponsables } from '@/lib/seguimientoResponsables';

export const GRUPOS_REUNION_OPERATIVA = ['Estructura', 'Procesos', 'Sistemas'] as const;
export const NOMBRE_TABLERO_REUNION_OPERATIVA = 'Reunión Operativa';

function tituloReunion(numero: number, fecha: Date) {
  return `Reunión ${numero} - ${format(fecha, 'dd/MM/yyyy')}`;
}

// Agrega miembros a un tablero (fuera del creador, que ya tiene acceso por
// ser el dueño) y notifica a cada uno, igual que "Compartir tablero" en
// BoardList.tsx. No bloquea la creación del tablero si algún miembro falla.
export async function agregarMiembrosTablero(boardId: string, boardNombre: string, actorUserId: string, memberIds: string[]) {
  const toAdd = memberIds.filter((id) => id && id !== actorUserId);
  for (const memberId of toAdd) {
    const { error } = await supabase.from('seguimiento_board_miembros' as any).insert({ board_id: boardId, member_user_id: memberId });
    if (error) continue;
    await supabase.from('notificaciones' as any).insert({
      user_id: memberId,
      created_by: actorUserId,
      tipo: 'seguimiento_miembro',
      titulo: 'Tablero compartido contigo',
      mensaje: `Fuiste agregado al tablero "${boardNombre}" para colaborar.`,
      link: `/seguimientos?board=${boardId}`,
      metadata: { board_id: boardId },
    });
  }
}

// Crea un tablero de Reunión Operativa: el board (nombre siempre "Reunión
// Operativa", etiquetado con el silo elegido), sus 3 columnas fijas
// (Estructura/Procesos/Sistemas), la primera reunión ("Reunión 1"), y agrega
// a los integrantes seleccionados como miembros del tablero.
export async function crearTableroReunionOperativa(userId: string, silo: string, memberIds: string[]): Promise<{
  board: SeguimientoBoard;
  columns: SeguimientoColumn[];
  meeting: ReunionOperativaMeeting;
}> {
  // Insertar y leer en el mismo paso (insert().select().single()) hace que la
  // politica de SELECT de seguimiento_boards (is_board_member, que vuelve a
  // consultar seguimiento_boards) se evalue sobre la fila recien insertada
  // dentro del mismo statement, lo cual Postgres rechaza como violacion de
  // RLS. Se separa en dos pasos: insertar con un id generado en el cliente,
  // y leerlo de vuelta en un segundo statement (igual que ya hace BoardList.tsx).
  const boardId = crypto.randomUUID();
  const { error: boardErr } = await supabase
    .from('seguimiento_boards')
    .insert({ id: boardId, nombre: NOMBRE_TABLERO_REUNION_OPERATIVA, created_by: userId, tipo: 'reunion_operativa', silo } as any);
  if (boardErr) throw new Error(boardErr.message || 'No se pudo crear el tablero');

  const { data: board, error: fetchBoardErr } = await supabase
    .from('seguimiento_boards')
    .select('*')
    .eq('id', boardId)
    .single();
  if (fetchBoardErr || !board) throw new Error(fetchBoardErr?.message || 'No se pudo leer el tablero recién creado');

  try {
    const { data: columns, error: colErr } = await supabase
      .from('seguimiento_columns')
      .insert(GRUPOS_REUNION_OPERATIVA.map((nombre, orden) => ({ board_id: (board as any).id, nombre, orden })))
      .select('*');
    if (colErr || !columns) throw new Error(colErr?.message || 'No se pudieron crear los grupos');

    const hoy = new Date();
    const { data: meeting, error: meetingErr } = await supabase
      .from('reunion_operativa_meetings' as any)
      .insert({
        board_id: (board as any).id,
        numero: 1,
        titulo: tituloReunion(1, hoy),
        fecha: format(hoy, 'yyyy-MM-dd'),
        created_by: userId,
      })
      .select('*')
      .single();
    if (meetingErr || !meeting) throw new Error((meetingErr as any)?.message || 'No se pudo crear la primera reunión');

    if (memberIds.length > 0) {
      await agregarMiembrosTablero(boardId, NOMBRE_TABLERO_REUNION_OPERATIVA, userId, memberIds);
    }

    return { board: board as SeguimientoBoard, columns: columns as SeguimientoColumn[], meeting: meeting as unknown as ReunionOperativaMeeting };
  } catch (e) {
    // Deja todo consistente para poder reintentar: si algo falla despues de
    // crear el tablero, se elimina (las columnas/reunion ya creadas caen en
    // cascada) en vez de dejar un tablero "reunion_operativa" a medias.
    await supabase.from('seguimiento_boards').delete().eq('id', (board as any).id);
    throw e;
  }
}

// "Nueva Reunión": crea la ronda siguiente y clona (inserta filas nuevas)
// los puntos pendientes/en progreso de la reunión anterior. Los puntos
// completados no se clonan, y los originales no se tocan (quedan como
// historial navegable).
export async function nuevaReunion(
  board: SeguimientoBoard,
  meetingAnterior: ReunionOperativaMeeting,
  puntosAnteriores: Seguimiento[],
  membersByTask: Record<string, string[]>,
  userId: string,
  tituloOverride?: string,
  fechaOverride?: string,
): Promise<{ meeting: ReunionOperativaMeeting; clonados: number }> {
  const numero = meetingAnterior.numero + 1;
  const hoy = new Date();
  const { data: meeting, error: meetingErr } = await supabase
    .from('reunion_operativa_meetings' as any)
    .insert({
      board_id: board.id,
      numero,
      titulo: tituloOverride?.trim() || tituloReunion(numero, hoy),
      fecha: fechaOverride || format(hoy, 'yyyy-MM-dd'),
      created_by: userId,
    })
    .select('*')
    .single();
  if (meetingErr || !meeting) throw new Error((meetingErr as any)?.message || 'No se pudo crear la reunión');

  const pendientes = puntosAnteriores.filter((p) => p.estado !== 'completado');
  let clonados = 0;
  for (const punto of pendientes) {
    const { data, error } = await supabase
      .from('seguimientos')
      .insert({
        titulo: punto.titulo,
        descripcion: punto.descripcion,
        estado: punto.estado,
        prioridad: punto.prioridad,
        proyecto: punto.proyecto,
        fecha_limite: punto.fecha_limite,
        user_id: userId,
        board_id: board.id,
        column_id: punto.column_id,
        reunion_id: (meeting as any).id,
        orden: punto.orden,
      } as any)
      .select('id')
      .single();
    if (error || !data) continue;
    const memberIds = membersByTask[punto.id] || [];
    if (memberIds.length > 0) {
      try { await syncSeguimientoResponsables((data as any).id, [], memberIds); } catch { /* no bloquea la clonación */ }
    }
    clonados++;
  }

  return { meeting: meeting as unknown as ReunionOperativaMeeting, clonados };
}

export interface AvanceGrupo {
  columnId: string;
  nombre: string;
  total: number;
  completadas: number;
  pct: number | null;
}

export function computeAvancePorGrupo(puntos: Seguimiento[], columns: SeguimientoColumn[]): AvanceGrupo[] {
  return columns.map((col) => {
    const enGrupo = puntos.filter((p) => p.column_id === col.id);
    const completadas = enGrupo.filter((p) => p.estado === 'completado').length;
    return {
      columnId: col.id,
      nombre: col.nombre,
      total: enGrupo.length,
      completadas,
      pct: enGrupo.length === 0 ? null : Math.round((completadas / enGrupo.length) * 100),
    };
  });
}

export interface AvanceProceso {
  procesoId: string;
  nombre: string;
  total: number;
  completadas: number;
  pct: number | null;
}

export function computeAvancePorProceso(actividades: CronogramaActividad[], procesos: CronogramaProceso[]): AvanceProceso[] {
  return procesos.map((proc) => {
    const deProceso = actividades.filter((a) => a.proceso_id === proc.id);
    const completadas = deProceso.filter((a) => a.estado === 'completado').length;
    return {
      procesoId: proc.id,
      nombre: proc.nombre,
      total: deProceso.length,
      completadas,
      pct: deProceso.length === 0 ? null : Math.round((completadas / deProceso.length) * 100),
    };
  });
}

// mesIndex: 1 = enero ... 12 = diciembre.
export function getActividadesDelMes(actividades: CronogramaActividad[], mesIndex: number): CronogramaActividad[] {
  return actividades.filter((a) => a.meses.includes(mesIndex));
}

export const MES_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export async function registrarCambioHistorial(
  actividadId: string,
  userId: string,
  campo: string,
  valorAnterior: string | null,
  valorNuevo: string | null,
) {
  await supabase.from('cronograma_historial' as any).insert({
    actividad_id: actividadId,
    user_id: userId,
    campo,
    valor_anterior: valorAnterior,
    valor_nuevo: valorNuevo,
  });
}

// La frecuencia se calcula sola a partir de los meses marcados: no es un
// campo que se elija aparte, para no duplicar la misma información dos veces.
export function computeFrecuencia(meses: number[]): string {
  const n = meses.length;
  if (n === 0) return 'Sin programar';
  if (n === 1) return 'Puntual (1x/año)';
  if (n === 12) return 'Mensual';
  const sorted = [...meses].sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((m, i) => m - sorted[i]);
  const parejo = gaps.every((g) => g === gaps[0]);
  if (parejo) {
    const label: Record<number, string> = { 2: 'Bimestral', 3: 'Trimestral', 4: 'Cuatrimestral', 6: 'Semestral' };
    if (label[gaps[0]]) return label[gaps[0]];
  }
  return `Personalizada (${n}x/año)`;
}

// Encuentra la próxima ocurrencia (año, mes) de una actividad recurrente a
// partir de hoy: el primer mes marcado que sea >= al mes actual, o el primer
// mes marcado del año siguiente si ya pasaron todos este año.
function proximaOcurrencia(meses: number[], hoy: Date): { anio: number; mes: number } {
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();
  const ordenados = [...meses].sort((a, b) => a - b);
  const siguiente = ordenados.find((m) => m >= mesActual);
  if (siguiente !== undefined) return { anio: anioActual, mes: siguiente };
  return { anio: anioActual + 1, mes: ordenados[0] };
}

export const FRECUENCIA_RECORDATORIO_LABEL: Record<CronogramaFrecuenciaRecordatorio, string> = {
  una_vez: 'Una vez',
  diario: 'Diario',
  semanal: 'Semanal',
};

// Cuantos dias deben pasar desde el ultimo aviso para volver a notificar,
// segun la frecuencia elegida para esa actividad. "una_vez" nunca repite
// dentro del mismo ciclo (Infinity = jamas vuelve a cumplirse la condicion).
const INTERVALO_DIAS: Record<CronogramaFrecuenciaRecordatorio, number> = {
  una_vez: Infinity,
  diario: 1,
  semanal: 7,
};

// Recorre las actividades con responsable asignado y, si la fecha de hoy cae
// dentro de su ventana de recordatorio (dias de anticipacion configurados en
// la propia actividad, antes del mes en que esta programada), le genera una
// notificacion al responsable — reutilizando la misma tabla "notificaciones"
// del resto de la app. Dentro de esa ventana, el aviso se repite segun la
// frecuencia elegida (una vez / diario / semanal) en vez de mandarse una sola
// vez siempre, y se resetea automaticamente en cuanto cambia el ciclo
// (ej. el año siguiente).
export async function revisarYEnviarRecordatorios(
  actividades: CronogramaActividad[],
  procesos: CronogramaProceso[],
  boardId: string,
  actorUserId: string,
): Promise<CronogramaActividad[]> {
  const hoy = new Date();
  const actualizadas = [...actividades];

  for (let i = 0; i < actualizadas.length; i++) {
    const act = actualizadas[i];
    if (!act.responsable_user_id || act.meses.length === 0) continue;
    const { anio, mes } = proximaOcurrencia(act.meses, hoy);
    const inicioMes = startOfMonth(new Date(anio, mes - 1, 1));
    const finMes = endOfMonth(inicioMes);
    const ventanaInicio = subDays(inicioMes, act.dias_recordatorio);
    const ciclo = `${anio}-${String(mes).padStart(2, '0')}`;

    if (hoy < ventanaInicio || hoy > finMes) continue;

    const esCicloNuevo = act.recordatorio_para !== ciclo;
    const diasDesdeUltimo = act.recordatorio_ultimo_envio
      ? (hoy.getTime() - new Date(act.recordatorio_ultimo_envio).getTime()) / 86_400_000
      : Infinity;
    const corresponde = esCicloNuevo || diasDesdeUltimo >= INTERVALO_DIAS[act.frecuencia_recordatorio];
    if (!corresponde) continue;

    const proceso = procesos.find((p) => p.id === act.proceso_id);
    const { error } = await supabase.from('notificaciones' as any).insert({
      user_id: act.responsable_user_id,
      created_by: actorUserId,
      tipo: 'cronograma_recordatorio',
      titulo: 'Actividad próxima en el cronograma',
      mensaje: `"${act.nombre}"${proceso ? ` (${proceso.nombre})` : ''} está programada para ${MES_LABELS[mes - 1]}.`,
      link: `/seguimientos?board=${boardId}`,
      metadata: { actividad_id: act.id, board_id: boardId },
    });
    if (error) continue;

    const ahoraIso = hoy.toISOString();
    await supabase.from('cronograma_actividades' as any)
      .update({ recordatorio_para: ciclo, recordatorio_ultimo_envio: ahoraIso })
      .eq('id', act.id);
    actualizadas[i] = { ...act, recordatorio_para: ciclo, recordatorio_ultimo_envio: ahoraIso };
  }

  return actualizadas;
}
