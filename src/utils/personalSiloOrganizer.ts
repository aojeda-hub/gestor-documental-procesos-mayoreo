import { supabase } from '@/integrations/supabase/client';
import { DocType, Document, SiloType } from '@/types/database';

export interface ClassificationReport {
  correctos: { lista: any; actual: Document }[];
  aMover: { lista: any; actual: Document; accion: string; targetType: DocType }[];
  aEliminar: Document[];
  faltantes: any[];
}

/**
 * Normaliza el texto: quita acentos, convierte a minúsculas, elimina espacios extra
 */
function normalizeText(str: string): string {
  if (!str) return "";
  let s = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .toLowerCase()
    .trim();

  // Quitar extensiones comunes
  s = s.replace(/\.(docx|doc|pdf|xlsx|xls|png|jpg|jpeg|webp)$/i, "");

  // Quitar prefijos comunes y conectores para enfocarse en el nombre del proceso
  // Ejemplo: "Norma para el Uso de..." -> "uso de..."
  s = s.replace(/^(norma|procedimiento|anexo|manual|formato|protocolo|instructivo|politica|descripcion de cargo|scrip)\s+(para\s+el\s+|de\s+la\s+|de\s+|para\s+|del\s+|al\s+)?/i, "");

  return s.trim().replace(/\s+/g, " ");
}

/**
 * Calcula la distancia de Levenshtein entre dos textos
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Verifica si dos nombres son similares (fuzzy match)
 */
function areSimilar(name1: string, name2: string, threshold = 3): boolean {
  const n1 = normalizeText(name1);
  const n2 = normalizeText(name2);
  
  if (n1 === n2) return true;
  
  // Correcciones comunes de errores tipográficos
  const mapTypo = (s: string) => s
    .replace("procediemiento", "procedimiento")
    .replace("procedimiennto", "procedimiento")
    .replace("assesment", "assessment")
    .replace("scrip", "script");
  
  const m1 = mapTypo(n1);
  const m2 = mapTypo(n2);
  
  if (m1 === m2) return true;

  // Umbral dinámico: más tolerancia para nombres muy largos
  const dynamicThreshold = Math.max(threshold, Math.floor(Math.max(m1.length, m2.length) / 10));

  if (levenshteinDistance(m1, m2) <= dynamicThreshold) return true;

  // Fallback: Coincidencia por palabras clave (si el 70% de las palabras core coinciden)
  const getWords = (s: string) => s.split(/\s+/).filter(w => w.length > 3);
  const w1 = getWords(m1);
  const w2 = getWords(m2);
  
  if (w1.length > 0 && w2.length > 0) {
    const set2 = new Set(w2);
    const intersect = w1.filter(w => set2.has(w)).length;
    const ratio = intersect / Math.max(w1.length, w2.length);
    if (ratio >= 0.7) return true;
  }

  return false;
}

/**
 * Mapea el nombre del tipo en español a la clave de DocType
 */
const TYPE_MAP: Record<string, DocType> = {
  'anexo': 'anexo',
  'procedimiento': 'procedimiento',
  'norma': 'norma',
  'instructivo': 'instructivo',
  'politica': 'politica',
  'descripción de cargo': 'descripcion_cargo',
  'descripcion de cargo': 'descripcion_cargo',
  'manual': 'manual',
  'libro': 'libro',
  'presentación clave': 'presentacion_clave',
  'presentacion clave': 'presentacion_clave',
  'presentación': 'presentacion',
  'presentacion': 'presentacion',
  'formato': 'formato',
  'gestión de beneficios': 'gestion_beneficios',
  'gestion de beneficios': 'gestion_beneficios',
  'diagrama': 'diagrama',
};

/**
 * Función principal para organizar el Silo de Personal
 */
export async function organizarSiloPersonal(miLista: { tipo: string; nombre: string }[], modo: "dry_run" | "ejecutar" = "dry_run"): Promise<ClassificationReport> {
  // 1. Obtener TODOS los documentos para buscarlos en todo el sistema
  const { data: currentDocs, error } = await supabase
    .from('documents')
    .select('*');

  if (error) throw error;

  const report: ClassificationReport = {
    correctos: [],
    aMover: [],
    aEliminar: [],
    faltantes: []
  };

  const docs = (currentDocs || []) as Document[];
  const currentDocsMatched = new Set<string>();
  const expectedDocsMatched = new Set<number>();

  // 2. Comparar lista vs estado actual
  miLista.forEach((expectedDoc, index) => {
    const targetType = TYPE_MAP[normalizeText(expectedDoc.tipo)];
    
    // Buscar un match en cualquier silo
    const match = docs.find((currentDoc) => {
      if (currentDocsMatched.has(currentDoc.id)) return false;
      return areSimilar(expectedDoc.nombre, currentDoc.title);
    });

    if (match) {
      currentDocsMatched.add(match.id);
      expectedDocsMatched.add(index);

      const needsSiloChange = match.silo !== 'personal';
      const needsTypeChange = match.doc_type !== targetType;

      if (!needsSiloChange && !needsTypeChange) {
        report.correctos.push({ lista: expectedDoc, actual: match });
      } else {
        let accion = "";
        if (needsSiloChange && needsTypeChange) {
          accion = `Mover a Silo Personal y cambiar tipo a ${targetType}`;
        } else if (needsSiloChange) {
          accion = `Mover a Silo Personal`;
        } else {
          accion = `Cambiar tipo de ${match.doc_type} a ${targetType}`;
        }

        report.aMover.push({ 
          lista: expectedDoc, 
          actual: match, 
          accion: accion,
          targetType: targetType || 'sintipo'
        });
      }
    } else {
      report.faltantes.push(expectedDoc);
    }
  });

  // 2.5 Regla especial para "DC -" (Descripciones de Cargo)
  docs.forEach(doc => {
    // Si ya fue emparejado por la lista principal, lo ignoramos para no duplicar en el reporte
    if (currentDocsMatched.has(doc.id)) return;

    if (doc.title.toUpperCase().includes('DC -')) {
      const targetType: DocType = 'descripcion_cargo';
      const needsSiloChange = doc.silo !== 'personal';
      const needsTypeChange = doc.doc_type !== targetType;

      if (!needsSiloChange && !needsTypeChange) {
        report.correctos.push({ 
          lista: { tipo: 'Descripción de Cargo', nombre: doc.title }, 
          actual: doc 
        });
        currentDocsMatched.add(doc.id);
      } else {
        let accion = "";
        if (needsSiloChange && needsTypeChange) {
          accion = "Mover a Silo Personal y cambiar tipo a Descripción de Cargo (Regla DC -)";
        } else if (needsSiloChange) {
          accion = "Mover a Silo Personal (Regla DC -)";
        } else {
          accion = "Cambiar tipo a Descripción de Cargo (Regla DC -)";
        }

        report.aMover.push({
          lista: { tipo: 'Descripción de Cargo', nombre: doc.title },
          actual: doc,
          accion,
          targetType
        });
        currentDocsMatched.add(doc.id);
      }
    }
  });

  // Identificar documentos a eliminar (N:1 mapping)
  // SOLO consideramos documentos que YA están en el silo 'personal' para eliminar.
  // No queremos sugerir eliminar documentos de otros silos que no tengan nada que ver.
  docs.filter(d => d.silo === 'personal').forEach(doc => {
    // Si ya está marcado como correcto o a mover por la regla DC o por la lista, lo saltamos
    if (currentDocsMatched.has(doc.id)) return;

    const hasAnyMatch = miLista.some(expected => areSimilar(expected.nombre, doc.title));
    if (!hasAnyMatch && !doc.title.toUpperCase().includes('DC -')) {
      report.aEliminar.push(doc);
    }
  });

  // 3. Ejecutar cambios si el modo es "ejecutar"
  if (modo === "ejecutar") {
    // Mover documentos (actualizar silo y tipo)
    for (const item of report.aMover) {
      await supabase
        .from('documents')
        .update({ 
          doc_type: item.targetType,
          silo: 'personal' 
        } as any)
        .eq('id', item.actual.id);
    }

    // Eliminar documentos (en este caso los movemos a 'sinsilo' o los borramos)
    // El usuario dijo "Documentos a eliminar (están en el Silo pero NO en mi lista)"
    // Por seguridad, los moveremos a 'sinsilo' en lugar de borrarlos físicamente
    // a menos que el usuario especifique explícitamente DELETE.
    // Pero el requerimiento dice "eliminar", así que procederemos con el borrado de versiones y luego el documento.
    for (const doc of report.aEliminar) {
      await supabase.from('document_versions').delete().eq('document_id', doc.id);
      await supabase.from('documents').delete().eq('id', doc.id);
    }
  }

  return report;
}
