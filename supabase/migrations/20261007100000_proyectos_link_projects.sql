-- Conecta el "proyecto" de CertificaERP (public.proyectos, bajo companias)
-- con el proyecto real de la app (public.projects). Puramente aditivo:
-- columna nueva, nullable, sin default, sin tocar ninguna fila existente.
-- Nada depende todavía de esta columna, así que es 100% segura y reversible
-- (se podría borrar sin dejar nada roto).
ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS projects_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proyectos_projects_id ON public.proyectos(projects_id);

-- Para que la ficha del proyecto principal pueda calcular rápido cuántas
-- incidencias abiertas tiene (join proyectos -> incidencias).
CREATE INDEX IF NOT EXISTS idx_incidencias_proyecto_estado ON public.incidencias(proyecto_id, estado);
