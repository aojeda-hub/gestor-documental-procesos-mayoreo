---
inclusion: manual
name: supabase-integration
description: Documentación completa de la integración con Supabase. Incluye tablas, autenticación, storage, edge functions, RLS y patrones de uso.
---

# Integración con Supabase - Documentación Completa

## Visión General

Esta aplicación tiene una dependencia **total** de Supabase como backend. Todas las capas de la aplicación dependen de servicios de Supabase:

- **Base de Datos**: PostgreSQL alojado en Supabase con 50+ tablas
- **Autenticación**: Supabase Auth con email/password y Google OAuth
- **Storage**: 4 buckets para archivos
- **Edge Functions**: 4 funciones serverless
- **Realtime**: Suscripciones en tiempo real para notificaciones
- **Row Level Security**: Políticas de seguridad a nivel de fila

---

## 1. Configuración del Proyecto

### Información del Proyecto Supabase

```
URL: https://qtxfokwwwfmovicdbtre.supabase.co
Referencia: qtxfokwwwfmovicdbtre
```

### Cliente Supabase

**Archivo:** `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://qtxfokwwwfmovicdbtre.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIs...";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**Características:**
- Tipado fuerte con TypeScript (`Database` type autogenerado)
- Sesión persistente en localStorage
- Auto-refresh de tokens JWT
- Cliente único exportado para toda la aplicación

---

## 2. Tablas de Base de Datos (50+ tablas)

### 2.1 Sistema de Usuarios

#### `profiles`
Perfiles de usuario extendidos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK autogenerado |
| `user_id` | UUID | FK a `auth.users`, único |
| `full_name` | TEXT | Nombre completo |
| `email` | TEXT | Email del usuario |
| `silo` | silo_type | Área funcional asignada |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

**RLS Policies:**
- Usuarios pueden leer todos los perfiles
- Usuarios pueden actualizar su propio perfil
- Admins pueden gestionar todos los perfiles

**Operaciones:** SELECT, INSERT, UPDATE

---

#### `user_roles`
Asignación de roles a usuarios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK a `auth.users` |
| `role` | app_role | Rol asignado |

**Restricción única:** `(user_id, role)`

**RLS Policies:**
- Usuarios pueden leer sus propios roles
- Admins pueden gestionar todos los roles

**Operaciones:** SELECT, INSERT, DELETE

---

#### `user_silos`
Asignación de múltiples silos a usuarios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK a `auth.users` |
| `silo` | silo_type | Silo asignado |
| `created_at` | TIMESTAMPTZ | Fecha de asignación |

**Operaciones:** SELECT, INSERT, DELETE

---

### 2.2 Módulo de Documentos

#### `documents`
Repositorio central de documentos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `title` | TEXT | Título del documento |
| `doc_type` | doc_type | Tipo (norma, manual, procedimiento, etc.) |
| `silo` | silo_type | Área funcional |
| `empresa` | empresa_type | Empresa (mayoreo, beconsult, epa) |
| `confidential` | BOOLEAN | ¿Es confidencial? |
| `estatus` | documento_estatus | Estado del documento |
| `created_by` | UUID | FK a `auth.users` |
| `drive_link` | TEXT | Link a Google Drive |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

**RLS Policies:**
- **SELECT**: Documentos no confidenciales visibles para todos; confidenciales solo al mismo silo o admin
- **INSERT**: Admin, editor, responsable_metodos
- **UPDATE**: Admin, editor, responsable_metodos
- **DELETE**: Solo admin

**Operaciones:** SELECT, INSERT, UPDATE, DELETE

---

#### `document_versions`
Control de versiones de documentos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `document_id` | UUID | FK a `documents` |
| `version_number` | INT | Número de versión |
| `description` | TEXT | Descripción de cambios |
| `authors` | TEXT | Autores |
| `approver` | TEXT | Aprobador |
| `url_word` | TEXT | URL del archivo Word |
| `url_pdf` | TEXT | URL del archivo PDF |
| `url_file` | TEXT | URL de archivo genérico |
| `is_current` | BOOLEAN | ¿Es la versión actual? |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

**Restricción única:** `(document_id, version_number)`

**Operaciones:** SELECT, INSERT, UPDATE, DELETE

---

#### `document_indicators`
Relación muchos-a-muchos entre documentos e indicadores.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `document_id` | UUID | FK a `documents` |
| `indicator_id` | UUID | FK a `indicators` |

**Operaciones:** SELECT, INSERT

---

#### `review_alerts`
Alertas de revisión para normas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `document_id` | UUID | FK a `documents` |
| `due_date` | DATE | Fecha de revisión |
| `acknowledged` | BOOLEAN | ¿Fue reconocida? |
| `acknowledged_by` | UUID | FK a `auth.users` |
| `acknowledged_at` | TIMESTAMPTZ | Fecha de reconocimiento |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

**Trigger:** Se crea automáticamente 1 año después de crear una versión de norma.

---

### 2.3 Módulo de Indicadores

#### `indicators`
Indicadores de gestión (KPIs).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `name` | TEXT | Nombre del indicador |
| `silo` | silo_type | Área funcional |
| `related_process` | TEXT | Proceso relacionado |
| `indicator_type` | indicator_type | Tipo (eficiencia, eficacia, etc.) |
| `definition` | TEXT | Definición |
| `formula` | TEXT | Fórmula de cálculo |
| `unit` | TEXT | Unidad de medida |
| `frequency` | frequency_type | Frecuencia de medición |
| `data_source` | TEXT | Fuente de datos |
| `responsible` | TEXT | Responsable |
| `goals` | TEXT | Metas |
| `action_plan` | TEXT | Plan de acción |
| `estado` | indicator_status | Estado del indicador |
| `created_by` | UUID | FK a `auth.users` |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

**RLS Policies:**
- Todos los autenticados pueden ver
- Inserción/Actualización: admin, editor
- Eliminación: solo admin

---

### 2.4 Módulo de Proyectos

#### `projects`
Proyectos empresariales.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `name` | TEXT | Nombre del proyecto |
| `silo` | silo_type | Área funcional |
| `phase` | TEXT | Fase actual |
| `estado` | TEXT | Estado (en_progreso, completado, etc.) |
| `planned_progress` | INT | Progreso planeado (%) |
| `start_date` | DATE | Fecha de inicio |
| `end_date` | DATE | Fecha de fin |
| `description` | TEXT | Descripción |
| `goal` | TEXT | Objetivo |
| `responsible` | TEXT | Responsable |
| `priority` | TEXT | Prioridad |
| `objetivo_estrategico_id` | UUID | FK a objetivos_estrategicos |
| `kickoff_data` | JSONB | Datos del kickoff |
| `baseline_captured_at` | TIMESTAMPTZ | Fecha de captura de línea base |

---

#### `project_phases`
Fases de proyectos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `project_id` | UUID | FK a `projects` |
| `name` | TEXT | Nombre de la fase |
| `order_index` | INT | Orden |
| `status` | TEXT | Estado (bloqueada, activa, completada) |
| `planned_start` | DATE | Inicio planeado |
| `planned_end` | DATE | Fin planeado |
| `actual_start` | DATE | Inicio real |
| `actual_end` | DATE | Fin real |

---

#### `project_tasks`
Tareas de proyectos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `project_id` | UUID | FK a `projects` |
| `phase_id` | UUID | FK a `project_phases` |
| `name` | TEXT | Nombre de la tarea |
| `phase` | TEXT | Fase |
| `weight` | INT | Peso (%) |
| `status` | TEXT | Estado |
| `actual_progress` | INT | Progreso real |
| `progress_percent` | INT | Porcentaje de progreso |
| `start_date` | DATE | Fecha de inicio |
| `end_date` | DATE | Fecha de fin |
| `baseline_start_date` | DATE | Inicio planeado (línea base) |
| `baseline_end_date` | DATE | Fin planeado (línea base) |

---

#### `project_task_assignees`
Asignación de usuarios a tareas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `task_id` | UUID | FK a `project_tasks` |
| `user_id` | UUID | FK a `auth.users` |

---

#### `hitos` / `project_milestones`
Hitos de proyectos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `proyecto_id` | UUID | FK a `projects` |
| `nombre` | TEXT | Nombre del hito |
| `descripcion` | TEXT | Descripción |
| `fecha_planeada` | DATE | Fecha planeada |
| `fecha_real` | DATE | Fecha real |
| `completado` | BOOLEAN | ¿Completado? |
| `fase_asociada` | TEXT | Fase asociada |

---

#### `dependencias` / `task_dependencies`
Dependencias entre tareas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `proyecto_id` | UUID | FK a `projects` |
| `tarea_origen` | UUID | FK a `project_tasks` |
| `tarea_destino` | UUID | FK a `project_tasks` |
| `tipo` | TEXT | Tipo (FS, SS, FF, SF) |
| `retraso_dias` | INT | Días de retraso |

---

#### `riesgos` / `proyecto_riesgos`
Riesgos de proyectos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `proyecto_id` | UUID | FK a `projects` |
| `descripcion` | TEXT | Descripción del riesgo |
| `probabilidad` | TEXT | Probabilidad |
| `impacto` | TEXT | Impacto |
| `categoria` | TEXT | Categoría |
| `plan_mitigacion` | TEXT | Plan de mitigación |
| `estado` | TEXT | Estado |

---

#### `phase_gate_checklist`
Checklist de fase gate.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `project_id` | UUID | FK a `projects` |
| `fase` | TEXT | Fase |
| `item` | TEXT | Item del checklist |
| `completado` | BOOLEAN | ¿Completado? |
| `evidencia_url` | TEXT | URL de evidencia |
| `comentario` | TEXT | Comentario |

---

#### `objetivos_estrategicos`
Objetivos estratégicos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `nombre` | TEXT | Nombre |
| `pilar` | TEXT | Pilar estratégico |
| `color` | TEXT | Color para UI |
| `orden` | INT | Orden |

---

### 2.5 Módulo de Seguimientos (Kanban)

#### `seguimientos`
Tareas/seguimientos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK a `auth.users` |
| `titulo` | TEXT | Título |
| `descripcion` | TEXT | Descripción |
| `estado` | seguimiento_estado | Estado |
| `prioridad` | seguimiento_prioridad | Prioridad |
| `responsable` | TEXT | Responsable |
| `categoria` | TEXT | Categoría |
| `proyecto` | TEXT | Proyecto asociado |
| `fecha_limite` | DATE | Fecha límite |
| `fecha_completado` | DATE | Fecha de completado |
| `fecha_inicio` | DATE | Fecha de inicio |
| `ubicacion` | TEXT | Ubicación |
| `orden` | INT | Orden |
| `board_id` | UUID | FK a `seguimiento_boards` |
| `column_id` | UUID | FK a `seguimiento_columns` |
| `column_entered_at` | TIMESTAMPTZ | Fecha de entrada a columna |
| `reunion_id` | UUID | FK a reuniones operativas |

---

#### `seguimiento_boards`
Tableros Kanban.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `created_by` | UUID | FK a `auth.users` |
| `nombre` | TEXT | Nombre del tablero |
| `descripcion` | TEXT | Descripción |
| `color` | TEXT | Color |
| `tipo` | TEXT | Tipo |
| `silo` | silo_type | Silo asociado |

---

#### `seguimiento_columns`
Columnas de tableros.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `board_id` | UUID | FK a `seguimiento_boards` |
| `nombre` | TEXT | Nombre de la columna |
| `orden` | INT | Orden |
| `color` | TEXT | Color |

---

#### `seguimiento_miembros`
Miembros asignados a tareas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `seguimiento_id` | UUID | FK a `seguimientos` |
| `user_id` | UUID | FK a `auth.users` |

---

#### `seguimiento_board_miembros`
Miembros de tableros.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `board_id` | UUID | FK a `seguimiento_boards` |
| `user_id` | UUID | FK a `auth.users` |

---

#### `seguimiento_adjuntos`
Adjuntos de tareas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `seguimiento_id` | UUID | FK a `seguimientos` |
| `nombre` | TEXT | Nombre del archivo |
| `storage_path` | TEXT | Ruta en storage |
| `created_by` | UUID | FK a `auth.users` |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

---

#### `seguimiento_checklists` / `seguimiento_checklist_items`
Checklists de tareas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `seguimiento_id` | UUID | FK a `seguimientos` |
| `texto` | TEXT | Texto del item |
| `completado` | BOOLEAN | ¿Completado? |

---

#### `seguimiento_etiquetas`
Etiquetas/labels.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `board_id` | UUID | FK a `seguimiento_boards` |
| `nombre` | TEXT | Nombre |
| `color` | TEXT | Color |

---

#### `seguimiento_notas`
Notas en tareas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `seguimiento_id` | UUID | FK a `seguimientos` |
| `user_id` | UUID | FK a `auth.users` |
| `nota` | TEXT | Contenido de la nota |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

---

### 2.6 Módulo BPA (Buenas Prácticas Agrícolas)

#### `silos`
Áreas funcionales.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_silo` | INT | PK |
| `nombre` | TEXT | Nombre del silo |
| `descripcion` | TEXT | Descripción |
| `activo` | BOOLEAN | ¿Activo? |
| `orden` | INT | Orden |

---

#### `grupos_bpa`
Grupos BPA.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_grupo` | INT | PK |
| `id_silo` | INT | FK a `silos` |
| `nombre` | TEXT | Nombre del grupo |
| `codigo` | TEXT | Código |

---

#### `procesos_bpa`
Procesos BPA.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_proceso` | INT | PK |
| `id_grupo` | INT | FK a `grupos_bpa` |
| `nombre` | TEXT | Nombre del proceso |
| `codigo` | TEXT | Código |

---

#### `actividades_bpa`
Actividades BPA.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_actividad` | INT | PK |
| `id_proceso` | INT | FK a `procesos_bpa` |
| `nombre` | TEXT | Nombre de la actividad |

---

#### `tareas_bpa`
Tareas BPA.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_tarea` | INT | PK |
| `id_actividad` | INT | FK a `actividades_bpa` |
| `nombre` | TEXT | Nombre de la tarea |
| `codigo` | TEXT | Código |

---

#### `bpa_documentos_relacion`
Relación documentos-BPA.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_relacion` | TEXT | PK |
| `id_documento` | UUID | FK a `documents` |
| `id_silo` | INT | FK a `silos` |
| `id_grupo` | INT | FK a `grupos_bpa` |
| `id_proceso` | INT | FK a `procesos_bpa` |
| `id_actividad` | INT | FK a `actividades_bpa` |
| `id_tarea` | INT | FK a `tareas_bpa` |
| `heredado` | BOOLEAN | ¿Heredado de nodo padre? |

---

### 2.7 Módulo Certifica ERP

#### `companias`
Compañías.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `nombre` | TEXT | Nombre |
| `slug` | TEXT | Slug único |

---

#### `proyectos` (Certifica)
Proyectos de certificación.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `compania_id` | UUID | FK a `companias` |
| `nombre` | TEXT | Nombre del proyecto |

---

#### `incidencias`
Incidencias.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `proyecto_id` | UUID | FK a `proyectos` |
| `titulo` | TEXT | Título |
| `descripcion` | TEXT | Descripción |
| `estado` | incidencia_estado | Estado |
| `prioridad` | incidencia_prioridad | Prioridad |
| `sistema_nombre` | TEXT | Sistema/módulo afectado |
| `created_by` | UUID | FK a `auth.users` |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

---

#### `incidencia_imagenes`
Imágenes de incidencias.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `incidencia_id` | UUID | FK a `incidencias` |
| `storage_path` | TEXT | Ruta en storage |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

---

#### `incidencia_observaciones`
Observaciones/comentarios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `incidencia_id` | UUID | FK a `incidencias` |
| `user_id` | UUID | FK a `auth.users` |
| `observacion` | TEXT | Contenido |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

---

#### `test_scripts`
Scripts de prueba.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `proyecto_id` | UUID | FK a `proyectos` |
| `nombre` | TEXT | Nombre del script |
| `descripcion` | TEXT | Descripción |
| `created_by` | UUID | FK a `auth.users` |

---

#### `test_casos`
Casos de prueba.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `script_id` | UUID | FK a `test_scripts` |
| `numero` | INT | Número de caso |
| `titulo` | TEXT | Título |
| `modulo` | TEXT | Módulo |
| `ruta_acceso` | TEXT | Ruta de acceso |
| `resultado_esperado` | TEXT | Resultado esperado |
| `resultado_obtenido` | TEXT | Resultado obtenido |
| `estado` | test_caso_estado | Estado |
| `entorno` | test_entorno | Entorno (QA, PRD) |
| `responsable` | TEXT | Responsable |

---

### 2.8 Otras Tablas

#### `notificaciones`
Sistema de notificaciones.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK a `auth.users` |
| `titulo` | TEXT | Título |
| `mensaje` | TEXT | Mensaje |
| `leida` | BOOLEAN | ¿Leída? |
| `link` | TEXT | Link de navegación |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

---

#### `cronograma_procesos` / `cronograma_actividades`
Cronogramas de procesos recurrentes.

#### `reunion_operativa_meetings`
Reuniones operativas.

#### `knowledge_base`
Base de conocimiento.

#### `auditoria`
Log de auditoría.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `usuario` | TEXT | Usuario |
| `accion` | TEXT | Acción realizada |
| `detalle` | TEXT | Detalles |
| `afectados` | INT | Registros afectados |
| `fecha` | TIMESTAMPTZ | Fecha |

---

## 3. Enums Personalizados (14 tipos)

### `app_role`
Roles de usuario.
```sql
'admin' | 'editor' | 'viewer' | 'responsable_metodos'
```

### `silo_type`
Áreas funcionales.
```sql
'compras' | 'logistica' | 'ventas' | 'personal' | 'control' | 
'mercadeo' | 'sistemas' | 'procesos' | 'sinsilo' | 'datos_maestros'
```

### `doc_type`
Tipos de documento.
```sql
'norma' | 'manual' | 'procedimiento' | 'anexo' | 'formato' | 
'diagrama' | 'instructivo' | 'politica' | 'descripcion_cargo' | 
'libro' | 'presentacion_clave' | 'presentacion' | 'gestion_beneficios'
```

### `documento_estatus`
Estados de documentos.
```sql
'aprobado' | 'revision' | 'desactualizado' | 'desincorporado' | 
'en_construccion' | 'por_iniciar'
```

### `indicator_type`
Tipos de indicadores.
```sql
'eficiencia' | 'eficacia' | 'efectividad' | 'calidad' | 
'productividad' | 'cumplimiento'
```

### `indicator_status`
Estados de indicadores.
```sql
'Construccion' | 'Revision' | 'Pendiente aprobación RC' | 
'Publicado SIM' | 'Publicado SIM/Fabric'
```

### `frequency_type`
Frecuencias de medición.
```sql
'diario' | 'semanal' | 'quincenal' | 'mensual' | 
'trimestral' | 'semestral' | 'anual'
```

### `seguimiento_estado`
Estados de tareas.
```sql
'pendiente' | 'en_revision' | 'en_progreso' | 'completado' | 'cancelado'
```

### `seguimiento_prioridad`
Prioridades de tareas.
```sql
'baja' | 'media' | 'alta' | 'critica'
```

### `incidencia_estado`
Estados de incidencias.
```sql
'pendiente' | 'en_curso' | 'resuelto'
```

### `incidencia_prioridad`
Prioridades de incidencias.
```sql
'baja' | 'media' | 'alta'
```

### `empresa_type`
Empresas del grupo.
```sql
'mayoreo' | 'beconsult' | 'epa'
```

### `test_caso_estado`
Estados de casos de prueba.
```sql
'pendiente' | 'en_curso' | 'completada' | 'incidencia'
```

### `test_entorno`
Entornos de testing.
```sql
'QA' | 'PRD'
```

---

## 4. Autenticación

### Métodos de Autenticación

#### Email/Password

**Registro:**
```typescript
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: { 
    data: { full_name: fullName }, 
    emailRedirectTo: window.location.origin 
  },
});
```

**Login:**
```typescript
const { error } = await supabase.auth.signInWithPassword({ 
  email, 
  password 
});
```

#### Google OAuth

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
});
```

#### Logout

```typescript
await supabase.auth.signOut();
```

### Gestión de Sesión

**Archivo:** `src/hooks/useAuth.tsx`

```typescript
// Listener de cambios de autenticación
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (_event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
  }
);

// Obtener sesión actual
const { data: { session } } = await supabase.auth.getSession();
```

### Carga de Datos de Usuario

Al autenticar, se cargan:
1. **Perfil** desde `profiles`
2. **Roles** desde `user_roles`
3. **Silos** desde `user_silos`

```typescript
const [profileRes, rolesRes] = await Promise.all([
  supabase.from('profiles').select('*').eq('user_id', user.id).single(),
  supabase.from('user_roles').select('role').eq('user_id', user.id),
]);
```

### Trigger de Nuevo Usuario

Se crea automáticamente al registrar:
1. Perfil en `profiles`
2. Rol 'viewer' en `user_roles`

```sql
CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users 
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 5. Storage (4 Buckets)

### Bucket: `documents`

**Propósito:** Archivos de documentos (Word, PDF)

**Políticas RLS:**
- **SELECT**: Usuarios autenticados
- **INSERT**: Admin, responsable_metodos
- **UPDATE**: Admin, responsable_metodos

**Operaciones:**
```typescript
// Upload
const { data, error } = await supabase.storage
  .from('documents')
  .upload(`${docId}/${filename}`, file, {
    contentType: file.type,
    upsert: false
  });

// Download
const { data, error } = await supabase.storage
  .from('documents')
  .download(path);

// Delete
const { error } = await supabase.storage
  .from('documents')
  .remove([path]);
```

---

### Bucket: `project-documents`

**Propósito:** Documentos de proyectos

**Políticas RLS:**
- Acceso basado en ownership del proyecto
- Admin y responsable del proyecto pueden acceder

---

### Bucket: `seguimiento-adjuntos`

**Propósito:** Adjuntos de tareas/seguimientos

**Políticas RLS:**
- Usuario solo puede acceder a archivos de tareas donde es miembro
- Validación por path que incluye user_id

**Operaciones:**
```typescript
// Signed URL para descarga temporal
const { data } = await supabase.storage
  .from('seguimiento-adjuntos')
  .createSignedUrl(path, 60); // 60 segundos
```

---

### Bucket: `incidencias`

**Propósito:** Imágenes de incidencias

**Políticas RLS:**
- Privado
- Solo usuarios asociados a la incidencia pueden acceder

---

## 6. Realtime Subscriptions

### Notificaciones en Tiempo Real

**Archivo:** `src/components/notifications/NotificationsBell.tsx`

```typescript
const channel = supabase
  .channel(`notif-${user.id}`)
  .on(
    'postgres_changes',
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'notificaciones', 
      filter: `user_id=eq.${user.id}` 
    },
    () => load()
  )
  .subscribe();

// Cleanup
return () => { 
  supabase.removeChannel(channel); 
};
```

**Nota:** Solo existe esta suscripción realtime. No hay otras implementaciones de tiempo real.

---

## 7. Edge Functions (4 funciones)

### 7.1 `ai-assistant`

**Propósito:** Chatbot de IA para consultas del sistema

**Ubicación:** `supabase/functions/ai-assistant/index.ts`

**Integración:**
- Usa Gemini API (modelo `gemini-3.6-flash`)
- Respeta RLS (usa el cliente del usuario autenticado)

**Tools implementadas:**
1. `seguimientos_buscar` - Buscar tareas
2. `seguimientos_analizar` - Análisis de cumplimiento
3. `documentos_buscar` - Buscar documentos
4. `incidencias_buscar` - Buscar incidencias
5. `indicadores_buscar` - Buscar indicadores

**Invocación:**
```typescript
const { data, error } = await supabase.functions.invoke('ai-assistant', {
  body: { 
    messages: history.map(m => ({ 
      role: m.role, 
      content: m.content 
    })) 
  }
});
```

**Contexto del sistema:**
- Descripción del departamento de Procesos
- Misión, visión y valores de MAYOREO
- Silos y responsables de métodos
- Indicadores generales
- Enums válidos para filtros

---

### 7.2 `create-responsable`

**Propósito:** Crear usuarios "Responsable de Métodos" (solo admin)

**Ubicación:** `supabase/functions/create-responsable/index.ts`

**Funcionalidad:**
1. Verifica que el caller es admin
2. Crea usuario en auth (auto-confirmado)
3. Crea/actualiza perfil con silo
4. Asigna rol 'responsable_metodos'

**Invocación:**
```typescript
const { data, error } = await supabase.functions.invoke('create-responsable', {
  body: { 
    email: 'nuevo@mayoreo.biz', 
    full_name: 'Nombre Completo', 
    silo: 'logistica',
    password: 'Mayoreo2026!' // opcional
  }
});
```

**Requiere:** Service Role Key (se usa internamente)

---

### 7.3 `update-user-email`

**Propósito:** Actualizar email de usuario (requiere admin)

**Invocación:**
```typescript
const { data, error } = await supabase.functions.invoke('update-user-email', {
  body: { 
    user_id: 'uuid-del-usuario', 
    email: 'nuevo@email.com' 
  }
});
```

---

### 7.4 `generate-skill-document`

**Propósito:** Generar descripciones de cargo con IA

**Invocación:**
```typescript
const { data, error } = await supabase.functions.invoke('generate-skill-document', {
  body: { 
    messages: conversationHistory, 
    mode: 'finalize' 
  }
});
```

---

## 8. Row Level Security (RLS)

### Principios Generales

1. **Todos los usuarios autenticados** pueden ver datos no restringidos
2. **RLS por membresía** para datos privados (proyectos, tareas)
3. **Roles especiales** (admin, editor, responsable_metodos) tienen permisos extendidos
4. **Documentos confidenciales** solo visibles al mismo silo o admin

### Políticas Principales

#### Documentos

```sql
-- Ver documentos
CREATE POLICY "View documents" ON public.documents 
FOR SELECT TO authenticated USING (
  NOT confidential
  OR silo = (SELECT p.silo FROM public.profiles p WHERE p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Insertar documentos
CREATE POLICY "Editors/admins insert docs" ON public.documents 
FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'editor')
);

-- Eliminar documentos
CREATE POLICY "Admins delete docs" ON public.documents 
FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
);
```

#### Indicadores

```sql
-- Todos pueden ver
CREATE POLICY "All authenticated can view indicators" 
ON public.indicators FOR SELECT TO authenticated USING (true);

-- Solo editores/admins pueden modificar
CREATE POLICY "Editors/admins insert indicators" 
ON public.indicators FOR INSERT TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
```

#### Seguimientos

La visibilidad se basa en membresía:
- Usuario es owner (`user_id`)
- Usuario es miembro del board (`seguimiento_board_miembros`)
- Usuario es miembro del seguimiento (`seguimiento_miembros`)
- Usuario es responsable asignado

---

### Funciones de Autorización

```sql
-- Verificar si usuario tiene rol
CREATE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Verificar si usuario pertenece a silo
CREATE FUNCTION public.user_has_silo(_user_id UUID, _silo silo_type)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_silos 
    WHERE user_id = _user_id AND silo = _silo
  )
$$;

-- Verificar si usuario es miembro de board
CREATE FUNCTION public.is_board_member(_board_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seguimiento_board_miembros 
    WHERE board_id = _board_id AND user_id = _user_id
  )
$$;

-- Verificar si usuario es miembro de seguimiento
CREATE FUNCTION public.is_seguimiento_member(_seguimiento_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seguimiento_miembros 
    WHERE seguimiento_id = _seguimiento_id AND user_id = _user_id
  )
$$;

-- Obtener silo del usuario
CREATE FUNCTION public.get_user_silo(_user_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT silo::TEXT FROM public.profiles WHERE user_id = _user_id
$$;

-- Listar directorio de usuarios
CREATE FUNCTION public.list_user_directory()
RETURNS TABLE(full_name TEXT, user_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT full_name, user_id FROM public.profiles ORDER BY full_name
$$;
```

---

## 9. Triggers de Base de Datos

### 9.1 `handle_new_user`

**Propósito:** Crear perfil y rol por defecto al registrar usuario

**Disparador:** AFTER INSERT ON auth.users

```sql
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$;
```

---

### 9.2 `update_updated_at`

**Propósito:** Actualizar timestamp `updated_at` automáticamente

**Disparador:** BEFORE UPDATE en múltiples tablas

```sql
CREATE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$;

-- Aplicado a: documents, profiles, indicators, seguimientos, etc.
```

---

### 9.3 `create_norma_review_alert`

**Propósito:** Crear alerta de revisión 1 año después de crear versión de norma

**Disparador:** AFTER INSERT ON document_versions

```sql
CREATE FUNCTION public.create_norma_review_alert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.is_current = true THEN
    IF EXISTS (
      SELECT 1 FROM public.documents 
      WHERE id = NEW.document_id AND doc_type = 'norma'
    ) THEN
      INSERT INTO public.review_alerts (document_id, due_date)
      VALUES (NEW.document_id, (NEW.created_at + INTERVAL '1 year')::date)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

---

## 10. Funciones RPC

### `list_user_directory`

**Propósito:** Obtener lista de usuarios para directorio

**Parámetros:** Ninguno

**Retorno:** `{ full_name: TEXT, user_id: UUID }[]`

**Uso:**
```typescript
const { data } = await supabase.rpc('list_user_directory');
```

---

### `obtener_documentos_por_nodo`

**Propósito:** Obtener documentos asociados a un nodo BPA

**Parámetros:**
- `p_id_nodo` (INT): ID del nodo
- `p_tipo_nodo` (TEXT): Tipo de nodo (silo, grupo, proceso, actividad, tarea)

**Retorno:** Array de documentos con estado, fecha, heredado, etc.

**Uso:**
```typescript
const { data } = await supabase.rpc('obtener_documentos_por_nodo', {
  p_id_nodo: 1,
  p_tipo_nodo: 'proceso'
});
```

---

### `soft_delete_documento`

**Propósito:** Eliminación suave de documento

**Parámetros:**
- `doc_id` (UUID): ID del documento

**Retorno:** BOOLEAN

---

## 11. Patrones de Uso por Módulo

### Documents (`/documentos`)

**Operaciones principales:**
- SELECT con filtros por silo, tipo, estatus, empresa
- INSERT de documentos y versiones
- UPDATE de metadata y estatus
- DELETE de documentos y versiones
- Storage upload de archivos Word/PDF

**Ejemplo:**
```typescript
// Cargar documentos
const { data, error } = await supabase
  .from('documents')
  .select('*, document_versions(*)')
  .eq('silo', 'logistica')
  .eq('empresa', 'mayoreo')
  .order('updated_at', { ascending: false });

// Crear documento
const { data, error } = await supabase
  .from('documents')
  .insert({
    title: 'Nuevo documento',
    doc_type: 'procedimiento',
    silo: 'logistica',
    empresa: 'mayoreo',
    confidential: false,
    created_by: user.id
  })
  .select()
  .single();

// Upload archivo
const { data, error } = await supabase.storage
  .from('documents')
  .upload(`${docId}/${filename}`, file);
```

---

### Indicators (`/indicadores`)

**Operaciones principales:**
- SELECT con joins a documentos
- INSERT/UPDATE de indicadores completos
- Relación many-to-many con documentos

**Ejemplo:**
```typescript
// Cargar indicadores con documentos relacionados
const { data } = await supabase
  .from('indicators')
  .select(`
    *,
    document_indicators(
      document_id,
      documents(title, doc_type)
    )
  `)
  .eq('silo', 'ventas');

// Crear indicador
await supabase
  .from('indicators')
  .insert({
    name: 'Rotación de inventario',
    silo: 'logistica',
    indicator_type: 'eficiencia',
    frequency: 'mensual',
    formula: 'Ventas / Inventario promedio',
    estado: 'Construccion'
  });
```

---

### Projects (`/proyectos`)

**Complejidad:** Alta - múltiples tablas relacionadas

**Operaciones principales:**
- Proyectos → Fases → Tareas → Asignaciones
- Hitos y dependencias
- Riesgos y phase gate checklist
- Documentos adjuntos por proyecto

**Ejemplo:**
```typescript
// Cargar proyecto completo
const { data } = await supabase
  .from('projects')
  .select(`
    *,
    project_phases(
      *,
      project_tasks(
        *,
        project_task_assignees(user_id)
      )
    ),
    hitos(*),
    riesgos(*)
  `)
  .eq('id', projectId)
  .single();

// Actualizar progreso de tarea
await supabase
  .from('project_tasks')
  .update({
    progress_percent: 75,
    status: 'En Progreso'
  })
  .eq('id', taskId);
```

---

### Seguimientos (`/seguimientos`)

**Complejidad:** Alta - sistema Kanban completo

**Operaciones principales:**
- Boards → Columns → Items
- Membresía dual (board y seguimiento)
- Adjuntos, checklists, etiquetas, notas
- Cronogramas de procesos recurrentes

**Ejemplo:**
```typescript
// Cargar tableros del usuario
const { data: boards } = await supabase
  .from('seguimiento_boards')
  .select(`
    *,
    seguimiento_board_miembros(user_id),
    seguimiento_columns(
      *,
      seguimientos(
        *,
        seguimiento_miembros(user_id)
      )
    )
  `)
  .or(`created_by.eq.${userId},seguimiento_board_miembros.user_id.eq.${userId}`);

// Mover tarea entre columnas
await supabase
  .from('seguimientos')
  .update({
    column_id: newColumnId,
    column_entered_at: new Date().toISOString()
  })
  .eq('id', seguimientoId);
```

---

### Users (`/usuarios`)

**Operaciones principales:**
- Gestión de perfiles y roles
- Edge functions para crear responsables
- Directorio de usuarios vía RPC

**Ejemplo:**
```typescript
// Actualizar usuario
await supabase
  .from('profiles')
  .update({ full_name, email, silo })
  .eq('user_id', userId);

// Actualizar roles
await supabase
  .from('user_roles')
  .delete()
  .eq('user_id', userId);

await supabase
  .from('user_roles')
  .insert(roles.map(r => ({ user_id: userId, role: r })));

// Crear responsable vía Edge Function
await supabase.functions.invoke('create-responsable', {
  body: { email, full_name, silo }
});
```

---

## 12. Resumen de Dependencias

| Componente | Cantidad | Descripción |
|------------|----------|-------------|
| **Tablas** | 50+ | Todas las entidades del negocio |
| **Enums** | 14 | Tipos de datos enumerados |
| **Edge Functions** | 4 | Funciones serverless |
| **RPC Functions** | 7 | Stored procedures |
| **Storage Buckets** | 4 | Almacenamiento de archivos |
| **Realtime Subscriptions** | 1 | Notificaciones en tiempo real |
| **Triggers** | 3 | Automatizaciones de BD |
| **RLS Policies** | 20+ | Seguridad a nivel de fila |

---

## 13. Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/integrations/supabase/client.ts` | Configuración del cliente |
| `src/integrations/supabase/types.ts` | Tipos TypeScript autogenerados |
| `src/hooks/useAuth.tsx` | Contexto de autenticación |
| `src/pages/Auth.tsx` | Página de login/registro |
| `src/pages/Documents.tsx` | Gestión documental |
| `src/pages/Indicators.tsx` | Gestión de indicadores |
| `src/pages/Projects.tsx` | Gestión de proyectos |
| `src/pages/Seguimientos.tsx` | Sistema Kanban |
| `src/pages/Users.tsx` | Gestión de usuarios |
| `src/components/notifications/NotificationsBell.tsx` | Realtime notifications |
| `supabase/functions/ai-assistant/index.ts` | Chatbot con IA |
| `supabase/functions/create-responsable/index.ts` | Crear usuarios |
| `supabase/migrations/*.sql` | Definición de esquema y RLS |

---

## 14. Conclusión

La aplicación tiene una **dependencia total** de Supabase como backend. Aprovecha todas las capacidades principales:

1. **Base de datos relacional** con 50+ tablas y RLS
2. **Autenticación múltiple** (email + Google OAuth)
3. **Storage** con políticas de acceso
4. **Edge Functions** para lógica serverless
5. **Realtime** para notificaciones en tiempo real
6. **Triggers** para automatizaciones

La arquitectura sigue el patrón de **"thin client"**: toda la lógica de negocio y autorización reside en la base de datos (RLS) y las Edge Functions, minimizando la lógica en el frontend y maximizando la seguridad.
