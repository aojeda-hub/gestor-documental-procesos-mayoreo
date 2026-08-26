import { Document, Packer, Paragraph, TextRun, LineRuleType } from 'docx';
import {
  buildDocHeader, metaBlock, sectionHeading, subHeading, controlCambiosTable,
  documentosReferenciaTable, bodyParagraph,
  type HistorialRow, type DocRefRow,
} from './docCommon';

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
  descripcion_general: string;
  ruta_acceso: string;
  secciones: SeccionUsuario[];
  historial: HistorialRow[];
  documentos_referencia: DocRefRow[];
}

function capturaPlaceholder() {
  return new Paragraph({
    spacing: { after: 160 },
    indent: { left: 300 },
    children: [new TextRun({ text: '[Espacio para captura de pantalla]', italics: true, size: 20, color: '888888' })],
  });
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
      blocks.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 300 }, text: f.descripcion }));
      blocks.push(capturaPlaceholder());
    });
  });
  return blocks;
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
      properties: { page: { margin: { top: '3.8cm', header: '1.27cm', footer: '1.27cm' } } },
      children: [
        metaBlock(data.informacion || 'Interna', 'Manual', data.distribucion),

        sectionHeading('Control de cambios del documento'),
        controlCambiosTable(data.historial),

        sectionHeading('Objetivo'),
        bodyParagraph(data.objetivo),

        sectionHeading(data.titulo || 'Descripción de la herramienta'),
        bodyParagraph(data.descripcion_general),
        ...(data.ruta_acceso ? [new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: 'Ruta de acceso: ', bold: true }), new TextRun({ text: data.ruta_acceso })],
        })] : []),

        ...seccionesBlocks(data.secciones),

        sectionHeading('Documentos de Referencia'),
        documentosReferenciaTable(data.documentos_referencia),
      ],
    }],
  });

  return Packer.toBlob(doc);
}
