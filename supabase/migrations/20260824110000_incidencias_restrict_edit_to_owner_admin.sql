-- La política de UPDATE de "incidencias" permite el intento de edición al
-- creador, a un admin, o al responsable (técnico/funcional) asignado — pero
-- solo el creador o un admin deben poder editar los DATOS de la incidencia
-- (título, prioridad, a quién se asigna como responsable, etc.). El
-- responsable asignado únicamente debe poder cambiar el ESTADO.
--
-- RLS por sí sola no distingue "qué columnas cambiaron", así que se agrega
-- un trigger que, cuando quien edita no es el creador ni un admin, rechaza
-- la actualización si algo más además del estado (y la fecha de solventado)
-- cambió.

CREATE OR REPLACE FUNCTION public.restrict_incidencia_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_owner_or_admin boolean;
  only_estado_changed boolean;
BEGIN
  is_owner_or_admin := (auth.uid() = OLD.created_by) OR public.has_role(auth.uid(), 'admin'::app_role);

  IF is_owner_or_admin THEN
    RETURN NEW;
  END IF;

  -- Si llegamos aquí, la política de RLS ya validó que quien edita es el
  -- responsable técnico o funcional asignado. Solo se le permite tocar el
  -- estado (y la marca de fecha de solventado); cualquier otro cambio se
  -- rechaza para que la edición de datos quede reservada a creador/admin.
  only_estado_changed :=
    NEW.titulo IS NOT DISTINCT FROM OLD.titulo
    AND NEW.descripcion IS NOT DISTINCT FROM OLD.descripcion
    AND NEW.modulo IS NOT DISTINCT FROM OLD.modulo
    AND NEW.prioridad IS NOT DISTINCT FROM OLD.prioridad
    AND NEW.proyecto_id IS NOT DISTINCT FROM OLD.proyecto_id
    AND NEW.sistema_nombre IS NOT DISTINCT FROM OLD.sistema_nombre
    AND NEW.responsable IS NOT DISTINCT FROM OLD.responsable
    AND NEW.responsable_funcional IS NOT DISTINCT FROM OLD.responsable_funcional
    AND NEW.codigo_transaccion IS NOT DISTINCT FROM OLD.codigo_transaccion
    AND NEW.nombre_transaccion IS NOT DISTINCT FROM OLD.nombre_transaccion
    AND NEW.fecha IS NOT DISTINCT FROM OLD.fecha
    AND NEW.fecha_ocurrencia IS NOT DISTINCT FROM OLD.fecha_ocurrencia
    AND NEW.test_caso_id IS NOT DISTINCT FROM OLD.test_caso_id;

  IF NOT only_estado_changed THEN
    RAISE EXCEPTION 'Solo el creador o un administrador pueden editar los datos de la incidencia. El responsable asignado únicamente puede cambiar el estado.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_incidencia_update ON public.incidencias;
CREATE TRIGGER trg_restrict_incidencia_update
  BEFORE UPDATE ON public.incidencias
  FOR EACH ROW EXECUTE FUNCTION public.restrict_incidencia_update();
