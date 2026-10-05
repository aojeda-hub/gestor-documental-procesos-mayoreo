import type { Document } from '@/types/database';

export function normalizeCargoFilename(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/\.docx?$/i, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

export function getMatchedCargoDoc(docs: Document[], archivoName: string, cargo?: string, depto?: string): Document | null {
  // Coincidencia estructurada: el documento ya quedó vinculado a este cargo/depto
  // mediante sus propias columnas. Esto no se rompe si alguien renombra el título.
  if (cargo) {
    const normCargo = normalizeCargoFilename(cargo);
    const normDepto = depto ? normalizeCargoFilename(depto) : null;
    const exact = docs.find(doc => {
      if (doc.doc_type !== 'descripcion_cargo' || !doc.cargo) return false;
      if (normalizeCargoFilename(doc.cargo) !== normCargo) return false;
      if (normDepto && doc.departamento && normalizeCargoFilename(doc.departamento) !== normDepto) return false;
      return true;
    });
    if (exact) return exact;
  }

  // Fallback por título (documentos antiguos sin cargo/departamento asignado todavía)
  const candidates = [archivoName, cargo ? `DC-${cargo}` : '', cargo || ''].filter(Boolean);
  for (const candidate of candidates) {
    const target = normalizeCargoFilename(candidate);
    if (!target) continue;
    const found = docs.find(doc => {
      const t = normalizeCargoFilename(doc.title);
      return t === target || t.includes(target) || target.includes(t);
    });
    if (found) return found;
  }
  return null;
}
