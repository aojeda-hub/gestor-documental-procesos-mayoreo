import type { ProbabilidadType, ImpactoType, NivelRiesgoType, RiesgoEstado, CategoriaRiesgo } from '@/types/database';

export const PROBABILIDAD_OPTIONS: ProbabilidadType[] = ['Baja', 'Media', 'Alta'];
export const IMPACTO_OPTIONS: ImpactoType[] = ['Bajo', 'Medio', 'Alto', 'Crítico'];
export const CATEGORIA_OPTIONS: CategoriaRiesgo[] = ['Técnico', 'Organizacional', 'Externo', 'Costo', 'Tiempo', 'Otro'];
export const ESTADO_OPTIONS: RiesgoEstado[] = ['Activo', 'Mitigado', 'Cerrado'];

/**
 * Calculates risk level automatically from Probability & Impact according to the 3x4 matrix:
 * Alta x Crítico = CRITICO
 * Alta x Alto = ALTO
 * Alta x Medio = ALTO
 * Alta x Bajo = MEDIO
 * Media x Crítico = ALTO
 * Media x Alto = ALTO
 * Media x Medio = MEDIO
 * Media x Bajo = BAJO
 * Baja x Crítico = MEDIO
 * Baja x Alto = MEDIO
 * Baja x Medio = BAJO
 * Baja x Bajo = BAJO
 */
export function calcularNivelRiesgo(probabilidad: ProbabilidadType, impacto: ImpactoType): NivelRiesgoType {
  const matriz: Record<ProbabilidadType, Record<ImpactoType, NivelRiesgoType>> = {
    'Alta': {
      'Crítico': 'CRITICO',
      'Alto': 'ALTO',
      'Medio': 'ALTO',
      'Bajo': 'MEDIO',
    },
    'Media': {
      'Crítico': 'ALTO',
      'Alto': 'ALTO',
      'Medio': 'MEDIO',
      'Bajo': 'BAJO',
    },
    'Baja': {
      'Crítico': 'MEDIO',
      'Alto': 'MEDIO',
      'Medio': 'BAJO',
      'Bajo': 'BAJO',
    },
  };

  return matriz[probabilidad]?.[impacto] || 'BAJO';
}

export const NIVEL_META: Record<NivelRiesgoType, { label: string; badgeCls: string; dot: string; icon: string }> = {
  CRITICO: {
    label: 'CRÍTICO',
    badgeCls: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 font-bold',
    dot: 'bg-red-600',
    icon: '🔴',
  },
  ALTO: {
    label: 'ALTO',
    badgeCls: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800 font-bold',
    dot: 'bg-orange-500',
    icon: '🔴',
  },
  MEDIO: {
    label: 'MEDIO',
    badgeCls: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold',
    dot: 'bg-amber-500',
    icon: '🟡',
  },
  BAJO: {
    label: 'BAJO',
    badgeCls: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-medium',
    dot: 'bg-emerald-500',
    icon: '🟢',
  },
};

export const ESTADO_META: Record<RiesgoEstado, { label: string; badgeCls: string }> = {
  Activo: {
    label: 'Activo',
    badgeCls: 'bg-red-500/10 text-red-600 border-red-200',
  },
  Mitigado: {
    label: 'Mitigado',
    badgeCls: 'bg-blue-500/10 text-blue-600 border-blue-200',
  },
  Cerrado: {
    label: 'Cerrado',
    badgeCls: 'bg-slate-500/10 text-slate-600 border-slate-200',
  },
};
