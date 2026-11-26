-- Recordatorios del cronograma (Reunión Operativa) generados en el servidor.
--
-- Antes se revisaban solo cuando alguien abría la vista Cronograma, así que si
-- nadie la abría, nadie recibía el aviso. Ahora esta función los genera sola:
-- la llama la función notificar-email cada vez que el Apps Script de correo
-- pide avisos (cada minuto), y solo actúa desde las 7:00 a. m. hora de Caracas.
-- Los avisos van a la campanita y, por la misma vía, al correo.
--
-- Reglas (las de cada actividad del cronograma):
--   • Actividades con responsable, meses marcados y año actual o futuro.
--   • Próxima ocurrencia: el primer mes marcado que aún no termina.
--   • Ventana de aviso: desde "días de anticipación" antes del 1° de ese mes
--     hasta el último día del mes.
--   • Frecuencia: una vez por ciclo, diario o semanal dentro de la ventana.
--   • Al empezar un ciclo nuevo (otro mes programado) siempre avisa; dentro del
--     ciclo deja de repetir si la actividad está "completado".
--   • Si la actividad no tiene tarea vinculada, la crea en la columna
--     "Procesos" del tablero y agrega al responsable como miembro.

CREATE OR REPLACE FUNCTION public.cronograma_generar_recordatorios()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ahora_local timestamp := now() AT TIME ZONE 'America/Caracas';
  hoy date := (now() AT TIME ZONE 'America/Caracas')::date;
  meses_nombre text[] := ARRAY['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                               'septiembre','octubre','noviembre','diciembre'];
  a record;
  mes int;
  inicio date;
  fin date;
  ciclo text;
  intervalo interval;
  v_board record;
  v_column uuid;
  v_seg uuid;
  v_detalle text;
  v_total int;
  v_pend int;
  enviados int := 0;
BEGIN
  IF extract(hour FROM ahora_local) < 7 THEN
    RETURN 0;
  END IF;
  -- Evita que dos llamadas simultáneas generen el mismo aviso dos veces.
  IF NOT pg_try_advisory_xact_lock(hashtext('cronograma_generar_recordatorios')) THEN
    RETURN 0;
  END IF;

  FOR a IN
    SELECT ca.*, cp.board_id, cp.nombre AS proceso_nombre
      FROM public.cronograma_actividades ca
      JOIN public.cronograma_procesos cp ON cp.id = ca.proceso_id
     WHERE ca.responsable_user_id IS NOT NULL
       AND coalesce(array_length(ca.meses, 1), 0) > 0
       AND coalesce(ca.anio, extract(year FROM hoy)::int) >= extract(year FROM hoy)::int
  LOOP
    -- Próximo mes programado que aún no termina.
    IF coalesce(a.anio, extract(year FROM hoy)::int) = extract(year FROM hoy)::int THEN
      SELECT min(m) INTO mes FROM unnest(a.meses) AS m WHERE m >= extract(month FROM hoy);
    ELSE
      SELECT min(m) INTO mes FROM unnest(a.meses) AS m;
    END IF;
    CONTINUE WHEN mes IS NULL;

    inicio := make_date(coalesce(a.anio, extract(year FROM hoy)::int), mes, 1);
    fin := (inicio + interval '1 month' - interval '1 day')::date;
    CONTINUE WHEN hoy < inicio - coalesce(a.dias_recordatorio, 7) OR hoy > fin;

    ciclo := to_char(inicio, 'YYYY-MM');
    intervalo := CASE a.frecuencia_recordatorio
      WHEN 'diario' THEN interval '23 hours'
      WHEN 'semanal' THEN interval '6 days 23 hours'
      ELSE NULL END;

    CONTINUE WHEN NOT (
      a.recordatorio_para IS DISTINCT FROM ciclo
      OR (a.estado <> 'completado' AND intervalo IS NOT NULL
          AND (a.recordatorio_ultimo_envio IS NULL OR a.recordatorio_ultimo_envio <= now() - intervalo))
    );

    -- Tarea vinculada: se crea si no existe, para que el aviso lleve a algo accionable.
    v_seg := a.seguimiento_id;
    IF v_seg IS NULL THEN
      SELECT id, created_by INTO v_board FROM public.seguimiento_boards WHERE id = a.board_id;
      SELECT id INTO v_column FROM public.seguimiento_columns
       WHERE board_id = a.board_id AND nombre = 'Procesos' ORDER BY orden LIMIT 1;
      IF v_board.id IS NOT NULL AND v_column IS NOT NULL THEN
        INSERT INTO public.seguimientos (titulo, descripcion, estado, prioridad, user_id, board_id, column_id, orden)
        VALUES (a.nombre, 'Actividad del cronograma — proceso: ' || a.proceso_nombre,
                CASE WHEN a.estado = 'completado' THEN 'completado' ELSE 'pendiente' END::seguimiento_estado,
                'media'::seguimiento_prioridad, v_board.created_by, a.board_id, v_column, 0)
        RETURNING id INTO v_seg;
        UPDATE public.cronograma_actividades SET seguimiento_id = v_seg WHERE id = a.id;
        -- Dispara además el aviso "Fuiste agregado a un seguimiento".
        INSERT INTO public.seguimiento_miembros (seguimiento_id, member_user_id)
        VALUES (v_seg, a.responsable_user_id);
      END IF;
    END IF;

    -- Qué falta del checklist de la tarea.
    v_detalle := '';
    IF v_seg IS NOT NULL THEN
      SELECT count(*), count(*) FILTER (WHERE NOT i.completado) INTO v_total, v_pend
        FROM public.seguimiento_checklist_items i
        JOIN public.seguimiento_checklists c ON c.id = i.checklist_id
       WHERE c.seguimiento_id = v_seg;
      v_detalle := CASE
        WHEN v_total = 0 THEN ' Ábrela para definir las tareas pendientes.'
        WHEN v_pend = 0 THEN ' Todas sus tareas ya están marcadas como hechas: revisa y márcala como completada.'
        ELSE ' Tienes ' || v_pend || ' de ' || v_total || ' tarea(s) pendiente(s).'
      END;
    END IF;

    INSERT INTO public.notificaciones (user_id, created_by, tipo, titulo, mensaje, link, metadata)
    VALUES (
      a.responsable_user_id, NULL, 'cronograma_recordatorio',
      'Recordatorio: actividad del cronograma',
      '"' || a.nombre || '" (' || a.proceso_nombre || ') está programada para ' || meses_nombre[mes] ||
        ' ' || extract(year FROM inicio) || '.' || v_detalle,
      CASE WHEN v_seg IS NOT NULL THEN '/seguimientos?card=' || v_seg
           ELSE '/seguimientos?tab=reunion_operativa&board=' || a.board_id END,
      jsonb_build_object('actividad_id', a.id, 'board_id', a.board_id, 'seguimiento_id', v_seg, 'ciclo', ciclo)
    );

    UPDATE public.cronograma_actividades
       SET recordatorio_para = ciclo, recordatorio_ultimo_envio = now()
     WHERE id = a.id;
    enviados := enviados + 1;
  END LOOP;

  RETURN enviados;
END;
$$;

REVOKE ALL ON FUNCTION public.cronograma_generar_recordatorios() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cronograma_generar_recordatorios() TO service_role;
