export type DocType = 'norma' | 'manual' | 'procedimiento' | 'anexo' | 'formato' | 'diagrama' | 'instructivo' | 'politica' | 'descripcion_cargo' | 'libro' | 'presentacion_clave' | 'presentacion' | 'gestion_beneficios' | 'sintipo';
export type SiloType = 'compras' | 'logistica' | 'ventas' | 'personal' | 'control' | 'mercadeo' | 'sistemas' | 'procesos' | 'datos_maestros' | 'sinsilo';
export type EmpresaType = 'mayoreo' | 'beconsult' | 'epa';
export type IndicatorType = 'eficiencia' | 'eficacia' | 'efectividad' | 'calidad' | 'productividad' | 'cumplimiento';
export type FrequencyType = 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'trimestral' | 'semestral' | 'anual';
export type AppRole = 'admin' | 'editor' | 'viewer' | 'responsable_metodos';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visor',
  responsable_metodos: 'Responsable de Métodos',
};

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  silo: SiloType | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export type DocumentEstatus =
  | 'aprobado'
  | 'revision'
  | 'desactualizado'
  | 'desincorporado'
  | 'en_construccion'
  | 'por_iniciar';

export const DOCUMENT_ESTATUS_OPTIONS: DocumentEstatus[] = [
  'aprobado',
  'revision',
  'desactualizado',
  'desincorporado',
  'en_construccion',
  'por_iniciar',
];

export const DOCUMENT_ESTATUS_LABELS: Record<DocumentEstatus, string> = {
  aprobado: 'Aprobado',
  revision: 'Revisión',
  desactualizado: 'Desactualizado',
  desincorporado: 'Desincorporado',
  en_construccion: 'En construcción',
  por_iniciar: 'Por iniciar',
};

export const DOCUMENT_ESTATUS_COLORS: Record<DocumentEstatus, string> = {
  aprobado: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  revision: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  desactualizado: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  desincorporado: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  en_construccion: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  por_iniciar: 'bg-muted text-muted-foreground border-border',
};

export interface Document {
  id: string;
  title: string;
  doc_type: DocType;
  silo: SiloType;
  empresa: EmpresaType;
  confidential: boolean;
  estatus: DocumentEstatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  drive_link?: string | null;
  url_word?: string | null;
  url_pdf?: string | null;
  url_file?: string | null;
}

export interface Seguimiento {
  id: string;
  user_id: string;
  titulo: string;
  descripcion: string | null;
  estado: 'pendiente' | 'en_revision' | 'en_progreso' | 'completado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  responsable: string | null;
  categoria: string | null;
  fecha_limite: string | null;
  fecha_completado: string | null;
  orden: number;
  created_at: string;
  updated_at: string;
  board_id?: string | null;
  column_id?: string | null;
}

export interface SeguimientoBoard {
  id: string;
  created_by: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface SeguimientoColumn {
  id: string;
  board_id: string;
  nombre: string;
  orden: number;
  color: string;
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  description: string | null;
  authors: string | null;
  approver: string | null;
  url_word: string | null;
  url_pdf: string | null;
  url_file: string | null;
  is_current: boolean;
  created_at: string;
}

export type IndicatorStatus = 'Construccion' | 'Revision' | 'Pendiente aprobación RC' | 'Publicado SIM' | 'Publicado SIM/Fabric';

export const INDICATOR_STATUS_OPTIONS: IndicatorStatus[] = [
  'Construccion',
  'Revision',
  'Pendiente aprobación RC',
  'Publicado SIM',
  'Publicado SIM/Fabric',
];

export interface Indicator {
  id: string;
  name: string;
  silo: SiloType;
  related_process: string | null;
  indicator_type: IndicatorType;
  definition: string | null;
  formula: string | null;
  unit: string | null;
  frequency: FrequencyType;
  data_source: string | null;
  responsible: string | null;
  goals: string | null;
  action_plan: string | null;
  estado: IndicatorStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}


export interface ReviewAlert {
  id: string;
  document_id: string;
  due_date: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  documents?: Document;
}

export interface Project {
  id: string;
  name: string;
  silo: SiloType;
  phase: string;
  planned_progress: number | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  goal?: string | null;
  specific_goals?: string[] | null;
  responsible?: string | null;
  priority?: string | null;
  kickoff_data?: any | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  phase_id: string | null;
  name: string;
  phase: string;
  weight: number;
  status: 'Pendiente' | 'En Progreso' | 'Completada';
  actual_progress: number;
  progress_percent: number;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export type PhaseStatus = 'bloqueada' | 'activa' | 'completada';

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
  status: PhaseStatus;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  created_at: string;
  updated_at: string;
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  anexo: 'Anexos',
  procedimiento: 'Procedimientos',
  norma: 'Normas',
  instructivo: 'Instructivos',
  politica: 'Políticas',
  descripcion_cargo: 'Descripciones de Cargo',
  manual: 'Manuales',
  libro: 'Libros',
  presentacion_clave: 'Presentaciones Clave',
  presentacion: 'Presentaciones',
  formato: 'Formatos',
  gestion_beneficios: 'Gestión de Beneficios',
  diagrama: 'Diagramas',
  sintipo: 'Sin Tipo',
};

export const SILO_LABELS: Record<SiloType, string> = {
  compras: 'Compras',
  logistica: 'Logística',
  ventas: 'Ventas',
  personal: 'Personal',
  control: 'Control (Crédito/Cobro)',
  mercadeo: 'Mercadeo',
  sistemas: 'Sistemas',
  procesos: 'Procesos',
  datos_maestros: 'Datos Maestros',
  sinsilo: 'Sin Silo',
};

export const INDICATOR_TYPE_LABELS: Record<IndicatorType, string> = {
  eficiencia: 'Eficiencia',
  eficacia: 'Eficacia',
  efectividad: 'Efectividad',
  calidad: 'Calidad',
  productividad: 'Productividad',
  cumplimiento: 'Cumplimiento',
};

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  diario: 'Diario',
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

export const EMPRESA_LABELS: Record<EmpresaType, string> = {
  mayoreo: 'MAYOREO',
  beconsult: 'BECONSULT',
  epa: 'EPA',
};
