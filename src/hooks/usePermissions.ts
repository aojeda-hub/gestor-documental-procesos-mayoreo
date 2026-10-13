import { useAuth } from '@/hooks/useAuth';
import type { SiloType } from '@/types/database';

/**
 * Reglas de permisos por rol. Espejo de las políticas RLS de la base de datos
 * (migración 20261013120000_roles_admin_colaborador_responsable): la BD es la
 * que realmente protege; aquí solo se decide qué botones mostrar.
 *
 * Un usuario puede tener varios roles: los permisos se suman (OR).
 * Regla transversal: cada usuario solo elimina lo propio; admin elimina todo.
 */
export function usePermissions() {
  const { user, roles, silos } = useAuth();
  const isAdmin = roles.includes('admin');
  const isColaborador = roles.includes('colaborador');
  const isRM = roles.includes('responsable_metodos');
  const hasAnyRole = isAdmin || isColaborador || isRM;

  const isOwner = (createdBy: string | null | undefined) => !!user && !!createdBy && createdBy === user.id;
  const inMySilo = (silo: SiloType | string | null | undefined) =>
    !!silo && (silo === 'sinsilo' || silos.includes(silo as SiloType));

  return {
    isAdmin, isColaborador, isRM, hasAnyRole, isOwner,

    // Documentos y Mapa de Procesos: solo admin y responsable_metodos
    // (el colaborador no tiene acceso a la documentación).
    canViewDocuments: isAdmin || isRM,
    canSeeConfidential: (silo: SiloType | string | null | undefined) =>
      isAdmin || (isRM && !!silo && silos.includes(silo as SiloType)),
    /** Puede crear documentos en general (en algún silo). */
    canCreateDocuments: isAdmin || isRM,
    /** Puede marcar documentos como confidenciales (admin o responsable). */
    canSetConfidential: isAdmin || isRM,
    canEditDocument: (doc: { silo: SiloType | string | null; confidential?: boolean | null }) =>
      isAdmin || (isRM && inMySilo(doc.silo)),
    canDeleteDocument: (doc: { silo: SiloType | string | null; created_by?: string | null }) =>
      isAdmin || (isRM && inMySilo(doc.silo)),

    // Mapa de Procesos
    canEditMapa: isAdmin || isRM,

    // Proyectos (y sus fases, tareas, documentos, Ishikawa)
    canCreateProject: hasAnyRole,
    canEditProject: (p: { created_by?: string | null } | null | undefined) =>
      !!p && (isAdmin || isRM || isOwner(p.created_by)),
    canDeleteProject: (p: { created_by?: string | null } | null | undefined) =>
      !!p && (isAdmin || isOwner(p.created_by)),

    // Riesgos, Hitos, Dependencias y Objetivos Estratégicos
    canEditProjectPlanning: hasAnyRole,

    // Indicadores
    canEditIndicators: isAdmin || isColaborador,
    canDeleteIndicator: (i: { created_by?: string | null }) => isAdmin || (isColaborador && isOwner(i.created_by)),

    // CertificaERP
    canManageCertProject: (p: { created_by?: string | null }) => isAdmin || isOwner(p.created_by),
    canChangeIncidenciaEstado: hasAnyRole,

    // Administración y Desarrollos a la medida
    canAccessAdmin: isAdmin,
    canEditDesarrollos: isAdmin,
  };
}
