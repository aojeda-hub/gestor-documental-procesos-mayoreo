# Estructura del Proyecto

```
gestor-documental-procesos-mayoreo/
├── public/                          # Archivos estáticos
│   ├── favicon.ico
│   ├── favicon.png
│   ├── mapa-bpa.png.jpeg
│   └── robots.txt
│
├── src/                             # Código fuente principal
│   ├── assets/                      # Recursos estáticos (imágenes, etc.)
│   │   ├── dashboard-hero.avif
│   │   └── logo.png
│   │
│   ├── components/                  # Componentes React
│   │   ├── certifica-erp/           # Integración con Certifica ERP
│   │   │   ├── CertificaERPDialog.tsx
│   │   │   └── lib.ts
│   │   ├── chat/                    # Chatbot asistente
│   │   │   └── Chatbot.tsx
│   │   ├── documents/               # Gestión de documentos
│   │   │   ├── DescripcionesCargo.tsx
│   │   │   ├── DocumentPreviewDialog.tsx
│   │   │   ├── SiloCard.tsx
│   │   │   ├── SiloDetailDialog.tsx
│   │   │   └── SiloUniverse.tsx
│   │   ├── indicators/              # Indicadores
│   │   │   └── IndicatorSheet.tsx
│   │   ├── layout/                  # Estructura visual
│   │   │   └── AppLayout.tsx
│   │   ├── notifications/           # Sistema de notificaciones
│   │   ├── projects/                # Gestión de proyectos
│   │   ├── seguimientos/            # Seguimiento de tareas
│   │   ├── ui/                      # Componentes UI base (shadcn/ui)
│   │   ├── users/                   # Gestión de usuarios
│   │   ├── ActivityChart.tsx        # Gráficos de actividad
│   │   ├── ExportPDFDialog.tsx      # Diálogo de exportación PDF
│   │   ├── NavLink.tsx              # Enlaces de navegación
│   │   ├── ProcessTable.tsx         # Tabla de procesos
│   │   └── StatsCards.tsx           # Tarjetas de estadísticas
│   │
│   ├── data/                        # Datos estáticos y listas
│   │   └── personalSiloList.ts
│   │
│   ├── hooks/                       # Custom hooks
│   │   ├── use-mobile.tsx           # Detección de móvil
│   │   ├── use-toast.ts             # Sistema de notificaciones toast
│   │   ├── useAuth.tsx              # Autenticación y autorización
│   │   └── useUserDirectory.ts      # Directorio de usuarios
│   │
│   ├── integrations/                # Integraciones externas
│   │   └── supabase/                # Cliente Supabase
│   │       ├── client.ts            # Configuración del cliente
│   │       └── types.ts             # Tipos de base de datos
│   │
│   ├── lib/                         # Utilidades y helpers
│   │   └── utils.ts                 # Funciones auxiliares
│   │
│   ├── pages/                       # Páginas/rutas de la aplicación
│   │   ├── Admin.tsx                # Panel de administración
│   │   ├── Auth.tsx                 # Página de login
│   │   ├── BPA.tsx                  # Buenas Prácticas Agrícolas
│   │   ├── Dashboard.tsx            # Panel principal
│   │   ├── Desarrollos.tsx          # Desarrollos organizacionales
│   │   ├── Documents.tsx            # Gestión de documentos
│   │   ├── Indicators.tsx           # Indicadores de gestión
│   │   ├── NotFound.tsx             # Página 404
│   │   ├── Projects.tsx             # Gestión de proyectos
│   │   ├── Seguimientos.tsx         # Seguimiento de tareas
│   │   ├── Skills.tsx               # Competencias y descripciones
│   │   └── Users.tsx                # Gestión de usuarios
│   │
│   ├── test/                        # Tests
│   │   └── setup.ts
│   │
│   ├── types/                       # Definiciones TypeScript
│   │   └── database.ts              # Tipos principales del dominio
│   │
│   ├── utils/                       # Utilidades específicas
│   │   └── personalSiloOrganizer.ts
│   │
│   ├── App.css                      # Estilos de la app
│   ├── App.tsx                      # Componente raíz y rutas
│   ├── index.css                    # Estilos globales
│   ├── main.tsx                     # Punto de entrada
│   └── vite-env.d.ts                # Tipos de Vite
│
├── scripts/                         # Scripts de utilidad
│   ├── seed_culture.ts              # Poblado de cultura organizacional
│   └── seed_processes_dept.ts       # Poblado de procesos por dept
│
├── scratch/                         # Scripts temporales/experimentales
│   ├── check_*.ts                   # Scripts de verificación
│   ├── count_docs.ts                # Conteo de documentos
│   ├── list_users.ts                # Listado de usuarios
│   └── search_*.ts                  # Scripts de búsqueda
│
├── process-hub-central/             # (Directorio para hub de procesos)
│
├── .env                             # Variables de entorno
├── .gitignore                       # Archivos ignorados por Git
├── bun.lock / bun.lockb             # Lock files de Bun
├── components.json                  # Config de shadcn/ui
├── eslint.config.js                 # Configuración de ESLint
├── index.html                       # HTML principal
├── package.json                     # Dependencias y scripts
├── playwright.config.ts             # Config de Playwright (e2e)
├── postcss.config.js                # Config de PostCSS
├── README.md                        # Este archivo
├── SKILL.md                         # Skill de descripción de cargo
├── tailwind.config.js               # Configuración de Tailwind CSS
├── tsconfig.json                    # Configuración de TypeScript
└── vite.config.ts                   # Configuración de Vite
```

## Directorios Clave

### `/src/components`
Componentes reutilizables organizados por dominio funcional. Cada subdirectorio representa un módulo de negocio.

### `/src/pages`
Componentes de página que corresponden a rutas de la aplicación. Cada archivo es una vista principal.

### `/src/types`
Definiciones de tipos TypeScript para el dominio de negocio (documentos, indicadores, proyectos, usuarios, etc.).

### `/src/hooks`
Custom hooks de React para lógica reutilizable (autenticación, toasts, mobile detection).

### `/src/integrations`
Clientes y tipos para servicios externos (actualmente Supabase).

### `/src/data`
Datos estáticos y constantes de la aplicación.

### `/scripts`
Scripts de mantenimiento, seeding y utilidades.

## Convenciones

- **Naming**: Componentes en PascalCase, archivos `.tsx`
- **Estilos**: Tailwind CSS con componentes shadcn/ui
- **Estado**: React Query para estado del servidor
- **Rutas**: React Router v6 con rutas protegidas
- **Formularios**: React Hook Form + Zod para validación
