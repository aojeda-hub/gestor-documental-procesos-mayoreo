import {
  Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, Header, Footer, ImageRun, BorderStyle,
  VerticalAlignTable, PageNumber,
} from 'docx';
import logoUrl from '@/assets/logo.png';

export interface HistorialRow {
  version: string;
  fecha: string;
  descripcion: string;
  autor: string;
  aprobado: string;
}

export interface DocRefRow {
  tipo: string;
  descripcion: string;
}

export const CORP_BLUE = '1F5C99';
export const GRAY_FILL = 'D9D9D9';
const BORDER = { style: BorderStyle.SINGLE, size: 2, color: '000000' };
export const THIN_BORDERS = {
  top: BORDER, bottom: BORDER, left: BORDER, right: BORDER,
  insideHorizontal: BORDER, insideVertical: BORDER,
};
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
export const NO_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
  insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
};

export function headerCell(text: string, widthPct: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlignTable.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: CORP_BLUE })] })],
  });
}

export function grayHeaderCell(text: string, widthPct: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { fill: GRAY_FILL },
    verticalAlign: VerticalAlignTable.CENTER,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: CORP_BLUE })] })],
  });
}

export function labelCell(text: string, widthPct: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlignTable.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
  });
}

export function cell(text: string, widthPct: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlignTable.CENTER,
    children: [new Paragraph({ text: text || '' })],
  });
}

export function labelValueTable(rows: [string, string][], headerLabel?: string) {
  const headerRow = headerLabel
    ? [new TableRow({ children: [headerCell(headerLabel, 35), headerCell('', 65)] })]
    : [];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: THIN_BORDERS,
    rows: [...headerRow, ...rows.map(([label, value]) => new TableRow({ children: [labelCell(label, 35), cell(value, 65)] }))],
  });
}

export function twoColTable(headers: [string, string], rows: [string, string][]) {
  const headerRow = new TableRow({ children: [headerCell(headers[0], 50), headerCell(headers[1], 50)] });
  const body = (rows.length ? rows : [['', ''] as [string, string]]).map(
    ([a, b]) => new TableRow({ children: [cell(a, 50), cell(b, 50)] }),
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: THIN_BORDERS, rows: [headerRow, ...body] });
}

export function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: CORP_BLUE })],
  });
}

export function subHeading(text: string) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, color: CORP_BLUE })],
  });
}

export function bodyParagraph(text: string) {
  return new Paragraph({ text: text || '', spacing: { after: 150 } });
}

// Fila "Información / Tipo de Documento / Distribución" — tabla sin bordes,
// visualmente igual al encabezado de las Normas, Procedimientos y Manuales corporativos.
export function metaBlock(informacion: string, tipoDocumento: string, distribucion: string) {
  const row = (label: string, value: string) => new TableRow({
    children: [
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: CORP_BLUE })] })],
      }),
      new TableCell({
        width: { size: 80, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ text: value || '' })],
      }),
    ],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      row('Información', informacion),
      row('Tipo de Documento', tipoDocumento),
      row('Distribución', distribucion),
    ],
  });
}

export function controlCambiosTable(historial: HistorialRow[]) {
  const headers = ['Versión', 'Fecha', 'Descripción del cambio realizado', 'Autor & CO-Autor', 'Aprobado por'];
  const widths = [8, 14, 44, 20, 14];
  const headerRow = new TableRow({ children: headers.map((h, i) => headerCell(h, widths[i])) });
  const body = (historial.length ? historial : [{ version: '0', fecha: '', descripcion: 'Versión Inicial', autor: '', aprobado: '' }])
    .map(r => new TableRow({
      children: [
        cell(r.version, widths[0]), cell(r.fecha, widths[1]), cell(r.descripcion, widths[2]),
        cell(r.autor, widths[3]), cell(r.aprobado, widths[4]),
      ],
    }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: THIN_BORDERS, rows: [headerRow, ...body] });
}

export function documentosReferenciaTable(rows: DocRefRow[]) {
  const headerRow = new TableRow({ children: [grayHeaderCell('Tipo de Documento', 30), grayHeaderCell('Descripción', 70)] });
  const body = (rows.length ? rows : [{ tipo: 'Glosario', descripcion: 'Glosario en línea' }])
    .map(r => new TableRow({ children: [cell(r.tipo, 30), cell(r.descripcion, 70)] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: THIN_BORDERS, rows: [headerRow, ...body] });
}

export async function buildDocHeader(titulo: string): Promise<Header> {
  const logoBytes = await fetch(logoUrl).then(r => r.arrayBuffer());
  const fecha = new Date().toLocaleDateString('es-VE');

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: THIN_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlignTable.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({ type: 'png', data: logoBytes, transformation: { width: 60, height: 34 } })],
            })],
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlignTable.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: titulo, bold: true, size: 28 })],
            })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlignTable.CENTER,
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Código:', size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: `Fecha: ${fecha}`, size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: 'Revisión:', size: 18 })] }),
            ],
          }),
        ],
      }),
    ],
  });

  return new Header({ children: [headerTable] });
}

// Pie de página de las Normas y Procedimientos: fila de firmas "<Ente aprobador>"
// más la numeración de página "X/Y", tal como en las plantillas corporativas vigentes.
export function buildApprovalFooter(): Footer {
  const footerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: THIN_BORDERS,
    rows: [
      new TableRow({
        children: ['<Ente aprobador>', '<Ente aprobador>', '<Ente aprobador>'].map(text => new TableCell({
          width: { size: 33.33, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlignTable.CENTER,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, italics: true, size: 18 })] })],
        })),
      }),
    ],
  });

  const pageNumberParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100 },
    children: [
      new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
      new TextRun({ text: '/', size: 18 }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
    ],
  });

  return new Footer({ children: [footerTable, pageNumberParagraph] });
}
