import { Document, Packer, Paragraph, TextRun, LineRuleType } from 'docx';
import {
  buildDocHeader, buildApprovalFooter, metaBlock, sectionHeading, labelValueTable,
  controlCambiosTable, documentosReferenciaTable, bodyParagraph,
  type HistorialRow, type DocRefRow,
} from './docCommon';

export interface ReglaGrupo {
  titulo: string;
  items: string[];
}

export interface NormaData {
  titulo: string;
  informacion: string;
  distribucion: string;
  objetivo: string;
  responsable_norma: string;
  responsables_cumplimiento: string;
  reglas: ReglaGrupo[];
  historial: HistorialRow[];
  documentos_referencia: DocRefRow[];
}

function reglasParagraphs(reglas: ReglaGrupo[]) {
  const paragraphs: Paragraph[] = [];
  (reglas.length ? reglas : [{ titulo: '', items: [] }]).forEach((grupo, i) => {
    paragraphs.push(new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: `${i + 1}. ${grupo.titulo}`, bold: true })],
    }));
    grupo.items.forEach((item, j) => {
      paragraphs.push(new Paragraph({
        indent: { left: 400 },
        spacing: { after: 80 },
        children: [new TextRun({ text: `${i + 1}.${j + 1}. ${item}` })],
      }));
    });
  });
  return paragraphs;
}

export async function buildNormaDocxBlob(data: NormaData): Promise<Blob> {
  const docHeader = await buildDocHeader(data.titulo || 'NORMA');
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
        metaBlock(data.informacion || 'Interna', 'Norma', data.distribucion),

        sectionHeading('Control de cambios del documento'),
        controlCambiosTable(data.historial),

        sectionHeading('Objetivo'),
        bodyParagraph(data.objetivo),

        sectionHeading('Responsabilidades'),
        labelValueTable([
          ['Norma', data.responsable_norma],
          ['Cumplimiento', data.responsables_cumplimiento],
        ]),

        sectionHeading('Reglas'),
        ...reglasParagraphs(data.reglas),

        sectionHeading('Documentos de Referencia'),
        documentosReferenciaTable(data.documentos_referencia),
      ],
    }],
  });

  return Packer.toBlob(doc);
}
