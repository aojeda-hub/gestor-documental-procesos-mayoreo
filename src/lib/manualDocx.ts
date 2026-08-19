import { Document, Packer, Paragraph, TextRun, LineRuleType } from 'docx';
import {
  buildDocHeader, metaBlock, sectionHeading, subHeading, controlCambiosTable,
  documentosReferenciaTable, bodyParagraph,
  type HistorialRow, type DocRefRow,
} from './docCommon';

export interface GlosarioItem {
  termino: string;
  definicion: string;
}

export interface FuncionalidadItem {
  titulo: string;
  descripcion: string;
}

export interface SeccionUsuario {
  titulo: string;
  funcionalidades: FuncionalidadItem[];
}

export interface ManualData {
  titulo: string;
  informacion: string;
  distribucion: string;
  objetivo: string;
  glosario: GlosarioItem[];
  descripcion_general: string;
  ruta_acceso: string;
  secciones: SeccionUsuario[];
  recomendaciones_uso: string[];
  historial: HistorialRow[];
  documentos_referencia: DocRefRow[];
}

function glosarioParagraphs(glosario: GlosarioItem[]) {
  return (glosario.length ? glosario : [{ termino: '', definicion: '' }]).map(g => new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${g.termino}: `, bold: true }),
      new TextRun({ text: g.definicion }),
    ],
  }));
}

function seccionesBlocks(secciones: SeccionUsuario[]) {
  const blocks: Paragraph[] = [];
  (secciones.length ? secciones : [{ titulo: '', funcionalidades: [] }]).forEach(seccion => {
    blocks.push(subHeading(seccion.titulo));
    (seccion.funcionalidades.length ? seccion.funcionalidades : [{ titulo: '', descripcion: '' }]).forEach((f, i) => {
      blocks.push(new Paragraph({
        spacing: { before: 100, after: 40 },
        children: [new TextRun({ text: `${i + 1}. ${f.titulo}`, bold: true })],
      }));
      blocks.push(new Paragraph({ spacing: { after: 120 }, indent: { left: 300 }, text: f.descripcion }));
    });
  });
  return blocks;
}

function recomendacionesParagraphs(recomendaciones: string[]) {
  return (recomendaciones.length ? recomendaciones : ['']).map((r, i) => new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: `${i + 1}. ${r}` })],
  }));
}

export async function buildManualDocxBlob(data: ManualData): Promise<Blob> {
  const docHeader = await buildDocHeader(data.titulo || 'MANUAL');

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 24 },
          paragraph: { spacing: { after: 200, line: 276, lineRule: LineRuleType.AUTO } },
        },
      },
    },
    sections: [{
      headers: { default: docHeader },
      properties: { page: { margin: { header: '1.27cm', footer: '1.27cm' } } },
      children: [
        metaBlock(data.informacion || 'Interna', 'Manual', data.distribucion),

        sectionHeading('Control de cambios del documento'),
        controlCambiosTable(data.historial),

        sectionHeading('Objetivo'),
        bodyParagraph(data.objetivo),

        sectionHeading('Glosario de términos clave'),
        ...glosarioParagraphs(data.glosario),

        sectionHeading(data.titulo || 'Descripción de la herramienta'),
        bodyParagraph(data.descripcion_general),
        ...(data.ruta_acceso ? [new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: 'Ruta de acceso: ', bold: true }), new TextRun({ text: data.ruta_acceso })],
        })] : []),

        ...seccionesBlocks(data.secciones),

        sectionHeading('Recomendaciones de uso'),
        ...recomendacionesParagraphs(data.recomendaciones_uso),

        sectionHeading('Documentos de Referencia'),
        documentosReferenciaTable(data.documentos_referencia),
      ],
    }],
  });

  return Packer.toBlob(doc);
}
