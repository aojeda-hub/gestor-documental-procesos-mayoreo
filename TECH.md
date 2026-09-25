# Stack Tecnológico

## Frontend Framework

### React 18.3.1
- Biblioteca principal para la construcción de la UI
- Hooks, Context, Suspense
- Concurrent rendering

### TypeScript 5.8.3
- Tipado estático
- Mejor DX y mantenibilidad
- Validación en tiempo de compilación

## Build Tools

### Vite 5.4.19
- Servidor de desarrollo rápido (HMR)
- Build optimizado para producción
- Soporte nativo para TypeScript y JSX

### Bun
- Runtime de JavaScript (alternativa a Node.js)
- Gestión de paquetes más rápida
- Archivos de lock: `bun.lock`, `bun.lockb`

## Styling

### Tailwind CSS 3.4.17
- Framework CSS utility-first
- Diseño responsive
- Modo oscuro soportado

### shadcn/ui
- Componentes UI accesibles
- Basados en Radix UI
- Customizables y sin dependencias de vendor lock-in

### Framer Motion 12.38.0
- Animaciones fluidas
- Transiciones declarativas
- Gesture support

## Data Fetching & State

### TanStack Query (React Query) 5.83.0
- Cache de datos del servidor
- Sincronización automática
- Optimistic updates
- Retry y refetch configurable

### Supabase JS Client 2.103.0
- Cliente para PostgreSQL (Supabase)
- Autenticación integrada
- Realtime subscriptions
- Storage de archivos

## Routing

### React Router DOM 6.30.1
- Enrutamiento declarativo
- Rutas anidadas y protegidas
- Navigation guards
- URL parameters

## Forms & Validation

### React Hook Form 7.61.1
- Gestión de formularios
- Validación performante
- Integración con Zod

### Zod 3.25.76
- Schema validation
- Type inference
- Mensajes de error customizables

## UI Components (Radix UI)

Componentes de primitivas accesibles:
- `@radix-ui/react-dialog` - Modales
- `@radix-ui/react-dropdown-menu` - Menús desplegables
- `@radix-ui/react-select` - Selectores
- `@radix-ui/react-tabs` - Pestañas
- `@radix-ui/react-toast` - Notificaciones
- `@radix-ui/react-tooltip` - Tooltips
- Y más...

## Data Visualization

### Recharts 2.15.4
- Gráficos declarativos
- Responsive charts
- Líneas, barras, áreas, pie charts

### Frappe Gantt 1.2.2
- Diagramas de Gantt
- Visualización de cronogramas

## Document Processing

### docx 9.7.1
- Generación de documentos Word
- Creación de descripciones de cargo

### jsPDF 4.2.1 + jspdf-autotable 5.0.8
- Generación de PDFs
- Tablas en PDF

### xlsx 0.18.5
- Lectura y escritura de Excel
- Exportación de datos

### pdfjs-dist 6.1.200
- Renderizado de PDFs
- Visualización en navegador

## Utilities

### date-fns 3.6.0
- Manipulación de fechas
- Formateo y parsing

### lucide-react 0.462.0
- Iconos SVG
- Tree-shakeable

### clsx + tailwind-merge
- Composición de clases CSS
- Merge de clases Tailwind

### file-saver 2.0.5
- Descarga de archivos en cliente

### JSZip 3.10.1
- Creación y lectura de archivos ZIP
- Descargas en lote

## Testing

### Vitest 3.2.4
- Test runner rápido
- Compatible con Jest API
- Watch mode

### @testing-library/react 16.0.0
- Testing utilities para React
- Queries accesibles

### Playwright 1.57.0
- E2E testing
- Cross-browser testing
- Screenshots y traces

## Code Quality

### ESLint 9.32.0
- Linting de JavaScript/TypeScript
- Plugin de React Hooks
- Plugin de React Refresh

### TypeScript ESLint 8.38.0
- Reglas específicas de TypeScript

## Backend & Database

### Supabase
- **Autenticación**: Supabase Auth con JWT
- **Base de datos**: PostgreSQL (Supabase)
- **Storage**: Buckets para archivos
- **Realtime**: Subscriptions en tiempo real
- **Edge Functions**: Serverless functions (si aplica)

### Tablas principales:
- `profiles` - Perfiles de usuario
- `user_roles` - Roles y permisos
- `documents` - Documentos
- `document_versions` - Versiones de documentos
- `indicators` - Indicadores de gestión
- `projects` - Proyectos
- `project_tasks` - Tareas de proyectos
- `project_phases` - Fases de proyectos
- `seguimientos` - Seguimientos/tareas
- `seguimiento_boards` - Tableros Kanban
- `seguimiento_columns` - Columnas de boards
- Y más...

## Development Workflow

```bash
# Desarrollo
bun run dev          # Servidor de desarrollo
bun run build        # Build de producción
bun run build:dev    # Build de desarrollo
bun run preview      # Preview de build

# Testing
bun run test         # Ejecutar tests (Vitest)
bun run test:watch   # Tests en watch mode

# Linting
bun run lint         # ESLint
```

## Arquitectura

### Patrón General
- **Component-based**: UI construida con componentes React
- **Container/Presenter**: Lógica en hooks/páginas, UI en componentes
- **Server State**: React Query maneja estado del servidor
- **Client State**: Mínimo estado local (React Context para auth)

### Flujo de Datos
```
User Action → Component → Hook/Handler → Supabase Client → DB
                                  ↓
                            React Query Cache → Component Re-render
```

### Autenticación
```
Login → Supabase Auth → JWT Token → Context Provider → Protected Routes
                                                    ↓
                                              Role-based Access Control
```

## Security

- Autenticación con JWT (Supabase)
- Row Level Security (RLS) en Supabase
- Client-side route protection
- Role-based access control (RBAC)
- Documents confidentiality controls
