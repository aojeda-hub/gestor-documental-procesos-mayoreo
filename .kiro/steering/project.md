# Gestor Documental de Procesos - Mayoreo

## Descripción del Proyecto

Sistema web de gestión documental y de procesos empresariales para MAYOREO y empresas relacionadas. La aplicación permite administrar documentos corporativos, indicadores de gestión, proyectos, seguimientos de tareas y más, con autenticación de usuarios y control de acceso basado en roles.

## Módulos Principales

### 1. Documentos (`/documentos`)
Gestión centralizada de documentos corporativos con:
- Clasificación por tipo: normas, manuales, procedimientos, anexos, formatos, diagramas, instructivos, políticas, descripciones de cargo, libros, presentaciones
- Organización por silos (áreas funcionales): Compras, Logística, Ventas, Personal, Control, Mercadeo, Sistemas, Procesos, Integridad de Datos
- Soporte multi-empresa: MAYOREO, BECONSULT, EPA
- Control de versiones de documentos
- Gestión de estados: aprobado, revisión, desactualizado, desincorporado, en construcción, por iniciar
- Sistema de permisos para documentos confidenciales
- Vista unificada tipo "universo de silos"
- Exportación a Word/PDF

### 2. Indicadores (`/indicadores`)
Administración de KPIs e indicadores de gestión:
- Tipos: eficiencia, eficacia, efectividad, calidad, productividad, cumplimiento
- Frecuencias: diario, semanal, quincenal, mensual, trimestral, semestral, anual
- Estados: Construcción, Revisión, Pendiente aprobación RC, Publicado SIM, Publicado SIM/Fabric
- Fórmulas, metas y planes de acción
- Exportación a Excel

### 3. Proyectos (`/proyectos`)
Gestión de proyectos empresariales con:
- Fases y tareas con progreso ponderado
- Hitos y dependencias entre tareas
- Gestión de riesgos
- Objetivos estratégicos alineados
- Línea base y seguimiento de cronograma
- Integración con diagramas de Gantt

### 4. Seguimientos (`/seguimientos`)
Sistema de seguimiento de tareas estilo Kanban:
- Boards personalizables por área/silo
- Columnas con estados configurables
- Prioridades: baja, media, alta, crítica
- Categorización y asignación a proyectos
- Reuniones operativas vinculadas
- Cronogramas de procesos recurrentes

### 5. BPA (`/bpa`)
Buenas Prácticas Agrícolas - módulo especializado para gestión de certificaciones y documentación agrícola.

### 6. Desarrollos (`/desarrollos`)
Seguimiento de iniciativas de desarrollo y mejoras organizacionales.

### 7. Skills (`/skills`)
Gestión de competencias y habilidades:
- Generación automática de descripciones de cargo con IA
- Plantillas corporativas para perfiles de puesto
- Catálogo de competencias gerenciales y comerciales

### 8. Usuarios (`/usuarios`)
Administración de usuarios del sistema:
- Perfiles con nombre completo y silo asignado
- Control de roles: admin, editor, viewer, responsable_metodos
- Directorio de usuarios

### 9. Administración (`/admin`)
Panel de administración general:
- Gestión de datos maestros
- Configuraciones del sistema
- Auditoría y reportes

## Características Técnicas

- Autenticación con Supabase Auth
- Autorización basada en roles (RBAC)
- Sincronización en tiempo real
- Interfaz responsive con soporte para tema oscuro
- Exportación a múltiples formatos (PDF, Excel, Word)
- Almacenamiento de archivos en Google Drive (links)
- Búsqueda y filtrado avanzado

## Usuarios Objetivo

- Equipo de Procesos y Métodos
- Responsables de área (silos)
- Gerencia y dirección
- Personal operativo que consulta documentos
- Auditores internos y externos

## Integraciones

- **Supabase**: Backend-as-a-Service (autenticación, base de datos, storage)
- **Google Drive**: Almacenamiento de documentos
- **Certifica ERP**: Integración con sistema de certificaciones
