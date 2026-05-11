# Migración a Fases en Cascada

Convertir el sistema actual de tareas sueltas (con campo `phase` como texto) a un sistema donde cada proyecto tiene **fases ordenadas y bloqueadas en cascada**: solo se trabaja en la fase activa, y al completarla el sistema activa automáticamente la siguiente.

---

## 1. Cambios de base de datos (migración SQL)

### Nueva tabla `project_phases`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `project_id` | uuid FK → projects | |
| `name` | text | Alineación, Diseño, Construcción, Implementación, Adopción |
| `order_index` | int | 1..5, orden de cascada |
| `status` | text | `bloqueada` \| `activa` \| `completada` |
| `planned_start` / `planned_end` | date | fechas planeadas |
| `actual_start` / `actual_end` | timestamptz | se llena automáticamente al activar/completar |

- `UNIQUE(project_id, order_index)`.
- RLS: mismas reglas que `projects` (owner / admin / responsable_metodos).

### Cambios en `project_tasks`
- Añadir `phase_id uuid` FK → `project_phases(id) ON DELETE CASCADE`.
- Mantener `phase` (texto) por compatibilidad temporal — se rellena desde la fase referenciada.

### Función + trigger `auto_advance_phase()`
Trigger AFTER UPDATE/INSERT/DELETE en `project_tasks`:
- Recalcula si TODAS las tareas de la fase tienen `progress_percent = 100`.
- Si sí → marca esa fase como `completada`, setea `actual_end = now()`.
- Busca la siguiente fase por `order_index` y la pasa de `bloqueada` → `activa`, setea `actual_start = now()`.
- Si una fase activa pasa a no estar 100% (ej. usuario baja avance) → la deja `activa` (no retrocede fases ya completadas para no romper historia).

### Migración de datos existentes
Para cada proyecto existente:
- Insertar 5 filas en `project_phases` (Alineación..Adopción) con `order_index 1..5`.
- La fase que coincida con `projects.phase` actual → `activa`; las anteriores → `completada`; las posteriores → `bloqueada`.
- Update `project_tasks.phase_id` por matching `phase` (texto) → fase del mismo proyecto con mismo `name`.

---

## 2. Cambios frontend

### `src/types/database.ts`
- Añadir interfaz `ProjectPhase`.
- Añadir `phase_id` y `phase_status` a `ProjectTask` (derivado).

### `src/pages/Projects.tsx`
- Cargar `project_phases` junto con projects.
- **% Real del proyecto**: promedio ponderado de TODAS las tareas (ya está así, se mantiene).
- Mostrar en cada fila del proyecto un mini-stepper de 5 fases: ✅ completadas / 🟢 activa / ⚪ futuras.

### Nuevo componente `ProjectPhasesPanel.tsx`
Reemplaza/complementa el `ProjectTasksDialog` actual. Muestra:
```
[✅ Alineación]  [✅ Diseño]  [🟢 Construcción]  [⚪ Implementación]  [⚪ Adopción]
                                    ↓
              ── Tareas de la fase activa (editables) ──
              ── Tareas de fases pasadas (solo lectura, colapsables) ──
              ── Tareas de fases futuras (bloqueadas, mensaje "Disponible al completar fase X") ──
```
- Cada fase muestra su % Real propio (independiente).
- Solo la fase **activa** permite agregar/editar/borrar tareas y mover progress_percent.
- Las fases completadas son read-only (con badge "Completada el dd/mm").
- Las fases futuras muestran un placeholder bloqueado.

### `src/components/projects/ProjectTasksDialog.tsx`
- Aceptar `phaseId` y `phaseStatus` como props.
- Deshabilitar inputs/botones cuando `phaseStatus !== 'activa'`.

### Eliminar selector de fase manual
- En `ProjectFormDialog`, ya no se elige fase — se calcula desde `project_phases`.
- El campo `projects.phase` queda como espejo de la fase activa (mantenido por trigger o por la app).

---

## 3. Reglas de negocio

- **Avance de fase**: una fase se marca completada **solo** cuando todas sus tareas tienen `progress_percent = 100`. Sin tareas → no avanza (mostrar warning).
- **% Real proyecto** = `Σ(weight × progress_percent) / Σ(weight)` sobre TODAS las tareas de TODAS las fases.
- **% Real fase** = mismo cálculo pero solo con tareas de esa fase.
- **% Planificado** se mantiene como ya está (días hábiles entre `start_date` y `end_date` del proyecto).
- **Bloqueo edición**: el frontend bloquea + el trigger no permite insertar tareas con `progress_percent > 0` en fases `bloqueada` (CHECK en función trigger).

---

## 4. Orden de implementación

1. Migración SQL (tabla + FK + trigger + seed de fases para proyectos existentes) — requiere aprobación.
2. Actualizar tipos y `Projects.tsx` (stepper + carga de fases).
3. Crear `ProjectPhasesPanel.tsx`.
4. Adaptar `ProjectTasksDialog.tsx` para modo read-only por fase.
5. Limpiar selector manual de fase en `ProjectFormDialog`.

---

## Detalles técnicos

- Trigger en lenguaje `plpgsql`, `SECURITY DEFINER`, `SET search_path = public`.
- Para evitar bucles: el trigger solo actúa cuando cambia `progress_percent` o `status`.
- Si el usuario borra la última tarea pendiente de una fase activa, la fase NO avanza automáticamente (requiere al menos 1 tarea completada para considerar avance) — evita avances accidentales en fases vacías.
- El campo legacy `projects.phase` se sincroniza con la fase activa actual vía trigger.

¿Apruebas para empezar con la migración?
