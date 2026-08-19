import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, VerticalAlignTable, LineRuleType,
} from 'docx';
import {
  buildDocHeader, buildApprovalFooter, metaBlock, sectionHeading,
  controlCambiosTable, documentosReferenciaTable, bodyParagraph, subHeading,
  headerCell, THIN_BORDERS,
  type HistorialRow, type DocRefRow,
} from './docCommon';

export interface CargoPasosRow {
  cargo: string;
  pasos: string[];
}

export interface Subproceso {
  titulo: string;
  filas: CargoPasosRow[];
}

export interface ProcedimientoData {
  titulo: string;
  informacion: string;
  distribucion: string;
  desarrollo: string;
  subprocesos: Subproceso[];
  historial: HistorialRow[];
  documentos_referencia: DocRefRow[];
}

function pasosCellParagraphs(pasos: string[], startNumber: number) {
  return (pasos.length ? pasos : ['']).map((paso, i) => new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: `${startNumber + i}. ${paso}` })],
  }));
}

function subprocesoTable(subproceso: Subproceso) {
  const headerRow = new TableRow({ children: [headerCell('Cargo', 30), headerCell('Pasos', 70)] });
  let counter = 1;
  const body = (subproceso.filas.length ? subproceso.filas : [{ cargo: '', pasos: [''] }]).map(fila => {
    const row = new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlignTable.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: fila.cargo, bold: true })] })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlignTable.CENTER,
          children: pasosCellParagraphs(fila.pasos, counter),
        }),
      ],
    });
    counter += Math.max(fila.pasos.length, 1);
    return row;
  });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: THIN_BORDERS, rows: [headerRow, ...body] });
}

function subprocesosBlocks(subprocesos: Subproceso[]) {
  const blocks: (Paragraph | Table)[] = [];
  (subprocesos.length ? subprocesos : [{ titulo: '', filas: [] }]).forEach((sp, i) => {
    blocks.push(subHeading(`${i + 1}. Subproceso: ${sp.titulo}`));
    blocks.push(subprocesoTable(sp));
  });
  return blocks;
}

export async function buildProcedimientoDocxBlob(data: ProcedimientoData): Promise<Blob> {
  const docHeader = await buildDocHeader(data.titulo || 'PROCEDIMIENTO');
  const docFooter = buildApprovalFooter();

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
      footers: { default: docFooter },
      properties: { page: { margin: { header: '1.27cm', footer: '1.27cm' } } },
      children: [
        metaBlock(data.informacion || 'Restringida', 'Procedimiento', data.distribucion),

        sectionHeading('Control de cambios del documento'),
        controlCambiosTable(data.historial),

        sectionHeading('Desarrollo'),
        bodyParagraph(data.desarrollo),

        sectionHeading('Procedimiento'),
        ...subprocesosBlocks(data.subprocesos),

        sectionHeading('Documentos de Referencia'),
        documentosReferenciaTable(data.documentos_referencia),
      ],
    }],
  });

  return Packer.toBlob(doc);
}
