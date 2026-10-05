import type { Document } from '@/types/database';

export function normalizeCargoFilename(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/\.docx?$/i, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

export function getMatchedCargoDoc(docs: Document[], archivoName: string, cargo?: string): Document | null {
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
