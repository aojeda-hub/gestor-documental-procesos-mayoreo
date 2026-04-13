export type DocType = 'norma' | 'manual' | 'procedimiento' | 'anexo' | 'formato' | 'diagrama' | 'instructivo' | 'politica' | 'descripcion_cargo' | 'libro' | 'presentacion_clave' | 'presentacion' | 'gestion_beneficios';
export type SiloType = 'compras' | 'logistica' | 'ventas' | 'personal' | 'control' | 'mercadeo' | 'sistemas' | 'procesos';
export type EmpresaType = 'mayoreo' | 'beconsult' | 'epa';
export type IndicatorType = 'eficiencia' | 'eficacia' | 'efectividad' | 'calidad' | 'productividad' | 'cumplimiento';
export type FrequencyType = 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'trimestral' | 'semestral' | 'anual';
export type AppRole = 'admin' | 'editor' | 'viewer';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visor',
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

export interface Document {
  id: string;
  title: string;
  doc_type: DocType;
  silo: SiloType;
  empresa: EmpresaType;
  confidential: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  drive_link?: string | null;
  url_word?: string | null;
  url_pdf?: string | null;
  url_file?: string | null;
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

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  anexo: 'Anexo',
  procedimiento: 'Procedimiento',
  norma: 'Norma',
  instructivo: 'Instructivo',
  politica: 'Política',
  descripcion_cargo: 'Descripción de Cargo',
  manual: 'Manual',
  libro: 'Libro',
  presentacion_clave: 'Presentación Clave',
  presentacion: 'Presentación',
  formato: 'Formato',
  gestion_beneficios: 'Gestión de Beneficios',
  diagrama: 'Diagrama',
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
