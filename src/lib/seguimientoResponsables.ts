import { supabase } from '@/integrations/supabase/client';

// El "Responsable" de un seguimiento se guarda como filas en
// seguimiento_miembros (la misma tabla que ya usa la ficha de tarea para
// "Miembros"). Insertar una fila ahí ya dispara automáticamente una
// notificación al usuario asignado (trigger notify_seguimiento_miembro),
// así que reutilizamos ese mecanismo en vez de duplicarlo.
export async function syncSeguimientoResponsables(
  seguimientoId: string,
  previousIds: string[],
  nextIds: string[],
) {
  const toAdd = nextIds.filter((id) => !previousIds.includes(id));
  const toRemove = previousIds.filter((id) => !nextIds.includes(id));

  if (toAdd.length > 0) {
    const { error } = await supabase.from('seguimiento_miembros').insert(
      toAdd.map((member_user_id) => ({ seguimiento_id: seguimientoId, member_user_id })),
    );
    if (error) throw error;
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('seguimiento_miembros')
      .delete()
      .eq('seguimiento_id', seguimientoId)
      .in('member_user_id', toRemove);
    if (error) throw error;
  }
}

export async function fetchMembersByTask(seguimientoIds: string[]): Promise<Record<string, string[]>> {
  if (seguimientoIds.length === 0) return {};
  const { data, error } = await supabase
    .from('seguimiento_miembros')
    .select('seguimiento_id, member_user_id')
    .in('seguimiento_id', seguimientoIds);
  if (error || !data) return {};
  const map: Record<string, string[]> = {};
  data.forEach((row) => {
    (map[row.seguimiento_id] ||= []).push(row.member_user_id);
  });
  return map;
}
