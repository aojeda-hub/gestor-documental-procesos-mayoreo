export type DocType = 'norma' | 'manual' | 'procedimiento' | 'anexo' | 'formato' | 'diagrama';
export type SiloType = 'compras' | 'logistica' | 'ventas' | 'personal' | 'control' | 'mercadeo' | 'sistemas';
export type IndicatorType = 'eficiencia' | 'eficacia' | 'efectividad' | 'calidad' | 'productividad' | 'cumplimiento';
export type FrequencyType = 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'trimestral' | 'semestral' | 'anual';
export type AppRole = 'admin' | 'editor' | 'viewer';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  silo: SiloType | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  doc_type: DocType;
  silo: SiloType;
  confidential: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  norma: 'Norma',
  manual: 'Manual',
  procedimiento: 'Procedimiento',
  anexo: 'Anexo',
  formato: 'Formato',
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
