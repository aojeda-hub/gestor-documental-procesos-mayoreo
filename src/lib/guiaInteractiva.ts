// Guías interactivas de Mayoreo desde Skills.
//
// Replica en el navegador lo que hace el script armar_guia.py de la skill
// "guia-interactiva-mayoreo": valida el contenido (JSON que escribe el
// asistente) y lo inserta en la plantilla corporativa, que ya trae el motor
// completo (navegación, audio, subtítulos, repasos, evaluación, constancia y
// versión para teléfono). La plantilla no se modifica: solo se le inyectan
// los datos, igual que en la skill.
import plantilla from '@/assets/guia-interactiva/plantilla.html?raw';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type GuiaContenido = {
  meta: { titulo: string; clave: string; subtitulo?: string; [k: string]: any };
  bienvenida?: { titulo?: string; subtitulo?: string; texto?: string };
  inicio?: { titulo?: string; texto?: string; comoUsar?: string };
  partes: {
    id: string; titulo: string; corto?: string; descripcion?: string; consulta?: boolean;
    fichas: { id: string; titulo: string; bloques?: { tipo: string; [k: string]: any }[]; [k: string]: any }[];
    repaso?: GuiaPregunta[];
  }[];
  glosario?: [string, string, string | null][];
  evaluacion?: { preguntas?: (GuiaPregunta & { parte?: string; ficha?: string })[]; constancia?: { titulo?: string; texto?: string } };
};
type GuiaPregunta = { pregunta: string; opciones: string[]; correcta: number; explicacion?: string };

const BLOQUES = new Set(['simulacion', 'tabla', 'comparativa', 'tarjetas', 'acordeon', 'nota', 'secuencia', 'mapa', 'clasificar']);

const aClave = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'guia';

/** Interpreta la respuesta del asistente y completa lo mínimo que falte. */
export function parseGuiaData(raw: string): GuiaContenido {
  const limpio = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const d = JSON.parse(limpio) as GuiaContenido;
  d.meta = d.meta ?? ({} as GuiaContenido['meta']);
  d.meta.titulo = (d.meta.titulo || 'Guía interactiva').trim();
  d.meta.clave = d.meta.clave && /^[A-Za-z0-9_-]+$/.test(d.meta.clave) ? d.meta.clave : aClave(d.meta.titulo);
  d.meta.organizacion = d.meta.organizacion || 'Mayoreo';
  d.meta.departamento = d.meta.departamento || 'Departamento de Procesos';
  d.meta.coleccion = d.meta.coleccion || 'avance';
  d.partes = Array.isArray(d.partes) ? d.partes : [];
  return d;
}

/**
 * Mismas validaciones que armar_guia.py. Los errores impiden armar la guía
 * (el motor fallaría); los avisos son incumplimientos del estándar.
 */
export function validarGuia(d: GuiaContenido): { errores: string[]; avisos: string[] } {
  const errores: string[] = [];
  const avisos: string[] = [];
  if (!d.meta?.titulo) errores.push('Falta el título de la guía.');
  if (!d.partes.length) errores.push('La guía no tiene partes.');
  const normales = d.partes.filter((p) => !p.consulta);
  if (normales.length && (normales.length < 2 || normales.length > 5)) avisos.push(`Tiene ${normales.length} partes; el estándar pide de 2 a 5.`);

  const fichaIds = new Set<string>();
  const parteIds = new Set<string>();
  const pregunta = (q: GuiaPregunta, donde: string) => {
    if (!q?.pregunta || !Array.isArray(q.opciones) || !q.opciones.length) { errores.push(`Pregunta incompleta en ${donde}.`); return; }
    if (!Number.isInteger(q.correcta) || q.correcta < 0 || q.correcta >= q.opciones.length) errores.push(`Respuesta correcta fuera de rango en ${donde}: "${q.pregunta}".`);
  };

  d.partes.forEach((p, i) => {
    const pid = p.id || `p${i + 1}`;
    p.id = pid;
    if (parteIds.has(pid)) errores.push(`Parte con id repetido: ${pid}.`);
    parteIds.add(pid);
    if (!p.titulo) errores.push(`La parte ${pid} no tiene título.`);
    p.fichas = Array.isArray(p.fichas) ? p.fichas : [];
    if (!p.consulta) {
      if (p.fichas.length < 2 || p.fichas.length > 6) avisos.push(`La parte ${pid} tiene ${p.fichas.length} fichas; el estándar pide de 2 a 6.`);
      if ((p.repaso?.length ?? 0) !== 3) avisos.push(`El repaso de la parte ${pid} no tiene 3 preguntas.`);
    }
    p.fichas.forEach((f) => {
      if (!f.id) { errores.push(`Una ficha de ${pid} no tiene id.`); return; }
      if (fichaIds.has(f.id)) errores.push(`Id de ficha repetido: ${f.id}.`);
      fichaIds.add(f.id);
      if (!f.titulo) errores.push(`La ficha ${f.id} no tiene título.`);
      (f.bloques ?? []).forEach((b) => {
        if (!BLOQUES.has(b?.tipo)) errores.push(`La ficha ${f.id} usa un bloque desconocido: "${b?.tipo}".`);
        if (b?.tipo === 'tabla') {
          const n = (b.columnas ?? []).length;
          if ((b.filas ?? []).some((r: unknown[]) => !Array.isArray(r) || r.length !== n)) errores.push(`Una fila de la tabla en ${f.id} no tiene ${n} columnas.`);
        }
        if (b?.tipo === 'clasificar') {
          const n = (b.opciones ?? [0, 1]).length;
          if ((b.situaciones ?? []).some((s: any) => !Number.isInteger(s?.correcta) || s.correcta < 0 || s.correcta >= n)) errores.push(`Respuesta inválida en el ejercicio de clasificar de ${f.id}.`);
        }
      });
    });
    (p.repaso ?? []).forEach((q) => pregunta(q, `el repaso de ${pid}`));
  });

  const preguntas = d.evaluacion?.preguntas ?? [];
  if (preguntas.length < 8 || preguntas.length > 12) avisos.push(`La evaluación tiene ${preguntas.length} preguntas; el estándar pide de 8 a 12.`);
  preguntas.forEach((q) => {
    pregunta(q, 'la evaluación');
    if (q.parte && !parteIds.has(q.parte)) errores.push(`La evaluación apunta a una parte que no existe (${q.parte}).`);
    if (q.ficha && !fichaIds.has(q.ficha)) errores.push(`La evaluación apunta a una ficha que no existe (${q.ficha}).`);
  });
  (d.glosario ?? []).forEach((g) => {
    if (!Array.isArray(g) || g.length < 2) errores.push('Hay un término del glosario mal formado.');
    else if (g[2] && !fichaIds.has(g[2])) g[2] = null; // enlace roto: se deja sin ficha relacionada
  });
  return { errores, avisos };
}

/** Inserta el contenido en la plantilla y devuelve el HTML autónomo de la guía. */
export function armarGuiaHtml(d: GuiaContenido): string {
  const datos = JSON.stringify(d, null, 1).replace(/<\//g, '<\\/');
  const titulo = d.meta.titulo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return plantilla
    .replace('/*__DATOS__*/', () => datos)
    .replace('<title>Guía interactiva</title>', () => `<title>${titulo}</title>`);
}

/** Resumen para la vista previa. */
export function resumenGuia(d: GuiaContenido) {
  const normales = d.partes.filter((p) => !p.consulta);
  return {
    partes: normales.map((p) => ({ titulo: p.titulo, fichas: p.fichas.map((f) => f.titulo) })),
    totalFichas: normales.reduce((n, p) => n + p.fichas.length, 0),
    preguntasEvaluacion: d.evaluacion?.preguntas?.length ?? 0,
    terminosGlosario: d.glosario?.length ?? 0,
  };
}
