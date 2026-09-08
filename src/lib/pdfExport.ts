import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '@/assets/logo.png';
import { SILO_LABELS, type SiloType } from '@/types/database';

// Margen horizontal compartido por todas las exportaciones: estrecho a
// propósito para dejarle más ancho a las tablas (ej. los 12 meses del
// cronograma no caben cómodos con márgenes más amplios).
export const PDF_MARGIN = 10;

let cachedLogo: string | null = null;
async function getLogoDataUrl(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  try {
    // Asset local empaquetado por Vite (el mismo que usan los .docx vía
    // docCommon.ts) — a diferencia del asset_id externo usado antes, este
    // siempre resuelve, sin depender de un servicio de hosting externo.
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogo = reader.result as string;
        resolve(cachedLogo);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function header(doc: jsPDF, title: string, subtitle: string, logo: string | null) {
  const pageW = doc.internal.pageSize.getWidth();
  if (logo) {
    // El logo es un lienzo ancho (~16:9) con el ícono centrado: se respeta
    // esa proporción para que no se vea deformado.
    try { doc.addImage(logo, 'PNG', PDF_MARGIN, 7, 32, 18, undefined, 'FAST'); } catch {}
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(title, pageW - PDF_MARGIN, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(subtitle, pageW - PDF_MARGIN, 24, { align: 'right' });
  doc.setDrawColor(220);
  doc.line(PDF_MARGIN, 30, pageW - PDF_MARGIN, 30);
}

function footer(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`Página ${i} de ${pageCount}`, pageW - PDF_MARGIN, pageH - 8, { align: 'right' });
    doc.text('Sistema Integral de Gestión - Procesos Mayoreo', PDF_MARGIN, pageH - 8);
  }
}

export interface ProjectRow {
  name: string;
  silo: SiloType;
  phase: string;
  start_date?: string | null;
  end_date?: string | null;
  planned_progress: number | null;
  actual_progress: number | null;
}

export async function exportProjectsPDF(projects: ProjectRow[], silo: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await getLogoDataUrl();
  const siloLabel = silo === 'all' ? 'Todos los Silos' : SILO_LABELS[silo as SiloType] || silo;
  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });

  header(doc, 'Resumen de Proyectos', `${siloLabel} · ${today}`, logo);

  const rows = projects.map(p => {
    const plan = p.planned_progress !== null ? `${p.planned_progress.toFixed(1)}%` : 'N/D';
    const real = p.actual_progress !== null ? `${p.actual_progress.toFixed(1)}%` : 'N/D';
    const dev = (p.planned_progress !== null && p.actual_progress !== null)
      ? `${(p.actual_progress - p.planned_progress).toFixed(1)}%` : 'N/D';
    return [
      p.name,
      SILO_LABELS[p.silo] || p.silo,
      p.phase,
      p.start_date || '-',
      p.end_date || '-',
      plan, real, dev,
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [['Proyecto', 'Silo', 'Fase', 'Inicio', 'Cierre', '% Plan', '% Real', 'Desv.']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold' },
      5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' },
    },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 40;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Total de proyectos: ${projects.length}`, PDF_MARGIN, finalY + 8);

  footer(doc);
  doc.save(`proyectos_${silo === 'all' ? 'todos' : silo}_${new Date().toISOString().slice(0,10)}.pdf`);
}

export interface IndicatorRow {
  name: string;
  silo: SiloType;
  indicator_type: string;
  formula?: string | null;
  unit?: string | null;
  frequency: string;
  responsible?: string | null;
  goals?: string | null;
  estado?: string | null;
}

export async function exportIndicatorsPDF(indicators: IndicatorRow[], silo: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await getLogoDataUrl();
  const siloLabel = silo === 'all' ? 'Todos los Silos' : SILO_LABELS[silo as SiloType] || silo;
  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });

  header(doc, 'Resumen de Indicadores', `${siloLabel} · ${today}`, logo);

  const rows = indicators.map(i => [
    i.name,
    SILO_LABELS[i.silo] || i.silo,
    i.indicator_type,
    i.formula || '-',
    i.unit || '-',
    i.frequency,
    i.responsible || '-',
    i.goals || '-',
    i.estado || 'Construccion',
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['Nombre', 'Silo', 'Tipo', 'Fórmula', 'Unidad', 'Frecuencia', 'Responsable', 'Metas', 'Estado']],
    body: rows,
    styles: { fontSize: 8.5, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      3: { cellWidth: 40, font: 'courier', fontSize: 8 },
      7: { cellWidth: 40 },
    },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 40;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Total de indicadores: ${indicators.length}`, PDF_MARGIN, finalY + 8);

  footer(doc);
  doc.save(`indicadores_${silo === 'all' ? 'todos' : silo}_${new Date().toISOString().slice(0,10)}.pdf`);
}

export interface CertCasoRow {
  numero: number;
  modulo?: string | null;
  titulo: string;
  ruta_acceso?: string | null;
  resultado_esperado?: string | null;
  resultado_obtenido?: string | null;
  estado: string;
  entorno: string;
  responsable?: string | null;
}

export async function exportCertificacionPDF(
  projectName: string,
  scriptName: string,
  casos: CertCasoRow[],
  estadoLabels: Record<string, string>,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await getLogoDataUrl();
  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });

  header(doc, projectName, `${scriptName} · ${today}`, logo);

  const rows = casos.map(c => [
    `#${c.numero}`,
    c.modulo || '-',
    c.titulo,
    c.ruta_acceso || '-',
    c.resultado_esperado || '-',
    c.resultado_obtenido || '-',
    estadoLabels[c.estado] || c.estado,
    c.entorno,
    c.responsable || '-',
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['ID', 'Sección', 'Título', 'Ruta', 'R. Esperado', 'R. Obtenido', 'Estado', 'Entorno', 'Resp.']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 48, fontStyle: 'bold' },
      3: { cellWidth: 38 },
      4: { cellWidth: 45 },
      5: { cellWidth: 45 },
      6: { cellWidth: 24, halign: 'center' },
      7: { cellWidth: 16, halign: 'center' },
      8: { cellWidth: 25 },
    },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 40;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Total de casos: ${casos.length}`, PDF_MARGIN, finalY + 8);

  footer(doc);
  const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  doc.save(`certificacion_${safe(projectName)}_${safe(scriptName)}_${new Date().toISOString().slice(0,10)}.pdf`);
}

export interface IncidenciaRow {
  numero: number | string;
  titulo: string;
  sistema?: string | null;
  modulo?: string | null;
  estado: string;
  prioridad?: string | null;
  responsable?: string | null;
  origen?: string | null;
  fecha?: string | null;
}

export async function exportIncidenciasPDF(
  projectName: string,
  incidencias: IncidenciaRow[],
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await getLogoDataUrl();
  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });

  header(doc, projectName, `Incidencias · ${today}`, logo);

  const rows = incidencias.map(i => [
    typeof i.numero === 'number' ? `#${i.numero}` : String(i.numero),
    i.titulo,
    i.sistema || '-',
    i.modulo || '-',
    i.estado,
    i.prioridad || '-',
    i.responsable || '-',
    i.origen || 'Incidencia',
    i.fecha || '-',
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['ID', 'Título', 'Sistema', 'Módulo', 'Estado', 'Prioridad', 'Responsable', 'Origen', 'Fecha']],
    body: rows,
    styles: { fontSize: 8.5, cellPadding: 2.2, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 60, fontStyle: 'bold' },
      2: { cellWidth: 32 },
      3: { cellWidth: 28 },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 32 },
      7: { cellWidth: 34 },
      8: { cellWidth: 24 },
    },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 40;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Total de incidencias: ${incidencias.length}`, PDF_MARGIN, finalY + 8);

  footer(doc);
  const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  doc.save(`incidencias_${safe(projectName)}_${new Date().toISOString().slice(0,10)}.pdf`);
}

export interface CronogramaExportRow {
  proceso: string;
  actividad: string;
  meses: number[];
  estado: string;
  responsable?: string | null;
  compania?: string | null;
}

const CRONOGRAMA_MES_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export async function exportCronogramaPDF(
  rows: CronogramaExportRow[],
  context: { silo: string; anio: number; compania: string },
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await getLogoDataUrl();
  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });

  header(doc, 'Cronograma de Procesos', `${context.silo} · ${context.anio} · ${context.compania} · ${today}`, logo);

  const body = rows.map((r) => [
    r.proceso,
    r.compania ? `${r.actividad}\n(${r.compania})` : r.actividad,
    ...CRONOGRAMA_MES_LABELS.map(() => ''),
    r.estado,
    r.responsable || 'Sin asignar',
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['Proceso', 'Actividad', ...CRONOGRAMA_MES_LABELS, 'Estado', 'Responsable']],
    body,
    // theme "grid" + una línea muy fina y clara: separa visualmente los
    // meses marcados consecutivos (si no, se ven como un solo bloque
    // sólido) sin que la cuadrícula se note "gritona".
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle', lineWidth: 0.1, lineColor: [222, 226, 230] },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center', lineColor: [222, 226, 230] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 46 },
      // Ancho fijo suficiente para que "Ago"/"May" no partan en dos líneas.
      ...Object.fromEntries(CRONOGRAMA_MES_LABELS.map((_, i) => [2 + i, { cellWidth: 12, halign: 'center' as const }])),
      14: { cellWidth: 20, halign: 'center' as const },
      15: { cellWidth: 24 },
    },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index >= 2 && data.column.index <= 13) {
        const mes = data.column.index - 2 + 1;
        if (rows[data.row.index]?.meses.includes(mes)) {
          data.cell.styles.fillColor = [209, 250, 229];
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 40;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Total de actividades: ${rows.length}`, PDF_MARGIN, finalY + 8);

  footer(doc);
  const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  doc.save(`cronograma_${safe(context.silo)}_${context.anio}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

