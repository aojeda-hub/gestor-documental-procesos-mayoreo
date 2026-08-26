import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, Header, ImageRun, BorderStyle, VerticalAlignTable, LineRuleType,
} from 'docx';
import logoUrl from '@/assets/logo.png';

export interface CargoCountRow { cargo: string; cantidad: string }
export interface QueParaRow { que_hace: string; para_que: string }
export interface RelacionRow { con_quien: string; para_que: string }
export interface IndicadorRow { macroproceso: string; proceso: string; indicador: string }
export type NivelCompetencias = 'gerencial' | 'comercial';

export interface CargoData {
  nombre_cargo: string;
  departamento: string;
  seccion_area: string;
  reporte_funcional: string;
  reporte_disciplinario: string;
  cargos_directos: CargoCountRow[];
  cargos_indirectos: CargoCountRow[];
  dimension_financiera: string;
  dimension_no_financiera: string;
  finalidad: string;
  responsabilidades: QueParaRow[];
  formacion_profesional: string;
  estudios_postgrado: string;
  conocimientos_especificos: string;
  idiomas: string;
  experiencia: string;
  relaciones_internas: RelacionRow[];
  relaciones_externas: RelacionRow[];
  decisiones: string;
  propuestas: string;
  indicadores: IndicadorRow[];
  nivel_competencias: NivelCompetencias;
  condiciones_trabajo: string;
  medidas_seguridad: string;
  otros_roles: string;
}

// Bloques fijos corporativos: el nivel del cargo determina cuál aplica.
// Gerentes y jefes -> competencias gerenciales. El resto -> competencias comerciales.
export const COMPETENCIAS_GERENCIALES = [
  {
    nombre: 'Orientación al logro de objetivos',
    descriptor: 'Es la capacidad para trabajar con altos niveles de calidad y confiabilidad, dirigiendo el comportamiento propio y el de los demás hacia el cumplimiento de los objetivos establecidos, administrando los recursos disponibles para generar la mayor cantidad posible de productos y servicios en el tiempo pautado y bajo los estándares de calidad propuestos.',
  },
  {
    nombre: 'Visión Estratégica',
    descriptor: 'Habilidad para anticiparse y comprender los cambios del entorno, y establecer su impacto a corto, mediano y largo plazo en la empresa, con el propósito de optimizar las fortalezas, actuar sobre las debilidades y aprovechar las oportunidades del contexto.',
  },
  {
    nombre: 'Habilidades de Negociación',
    descriptor: 'Capacidad para persuadir a otras personas, utilizar argumentos sólidos y honestos, y acercar posiciones mediante el ejercicio del razonamiento conjunto, que contemple los intereses de todas las partes intervinientes y los objetivos organizacionales.',
  },
  {
    nombre: 'Desarrollo de Otros',
    descriptor: 'Es el interés genuino por fomentar la formación y el desarrollo de los miembros de su equipo a partir del seguimiento de sus necesidades y de la exposición a situaciones y actividades que faciliten y aceleren su crecimiento.',
  },
];

export const COMPETENCIAS_COMERCIALES = [
  {
    nombre: 'Dominio Comercial',
    descriptor: 'Es la habilidad de actuar de manera oportuna y efectiva en la interacción comercial con los clientes, para cumplir con los objetivos de la empresa y las expectativas de sus socios comerciales, logrando metas desafiantes en condiciones favorables para ambas partes y manteniendo altos niveles de rendimiento.',
  },
  {
    nombre: 'Planificación y Organización',
    descriptor: 'Es la capacidad de determinar eficazmente las metas y prioridades de las tareas, actividades y proyectos que están a su cargo, estipulando acciones, plazos y recursos requeridos. Implica la instrumentación de mecanismos de control, seguimiento y verificación de la información.',
  },
  {
    nombre: 'Adaptabilidad',
    descriptor: 'Es la capacidad para adaptarse y trabajar en distintas y variadas situaciones, con personas o grupos diversos. Implica modificar la propia conducta para alcanzar los objetivos cuando surgen dificultades o cambios de cualquier índole en la empresa, el mercado y su entorno.',
  },
  {
    nombre: 'Impacto e Influencia',
    descriptor: 'Es la capacidad para convencer e influenciar a clientes, socios comerciales y equipo de trabajo, con el objetivo de que logren las metas existentes y que ejecuten determinadas acciones favorables a los objetivos de la compañía.',
  },
  {
    nombre: 'Orientación al Cliente',
    descriptor: 'Capacidad de mostrar sensibilidad por las necesidades, oportunidades y/o solicitudes de clientes potenciales o existentes, que puedan requerir en el corto y largo plazo, respondiendo oportunamente y logrando un impacto positivo en el alcance de los objetivos de la compañía.',
  },
  {
    nombre: 'Pensamiento Analítico',
    descriptor: 'Habilidad para el análisis, diagnóstico y solución de problemas, descomponiendo una situación de manera que pueda ser revisada paso a paso para fijar prioridades y establecer relaciones causa-efecto, para la toma de decisiones.',
  },
];

export function getCompetencias(nivel: NivelCompetencias) {
  return nivel === 'gerencial' ? COMPETENCIAS_GERENCIALES : COMPETENCIAS_COMERCIALES;
}

const CORP_BLUE = '1F5C99';
const GRAY_FILL = 'D9D9D9';
const BORDER = { style: BorderStyle.SINGLE, size: 2, color: '000000' };
const THIN_BORDERS = {
  top: BORDER, bottom: BORDER, left: BORDER, right: BORDER,
  insideHorizontal: BORDER, insideVertical: BORDER,
};

// Encabezado de columna (bordes visibles, texto azul en negrita, sin relleno).
function headerCell(text: string, widthPct: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlignTable.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: CORP_BLUE })] })],
  });
}

// Encabezado con relleno gris (solo la tabla de Documentos de Referencia lo usa).
function grayHeaderCell(text: string, widthPct: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { fill: GRAY_FILL },
    verticalAlign: VerticalAlignTable.CENTER,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: CORP_BLUE })] })],
  });
}

// Columna de etiqueta en las tablas "campo / valor" (negrita, texto negro, sin relleno).
function labelCell(text: string, widthPct: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlignTable.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
  });
}

function cell(text: string, widthPct: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlignTable.CENTER,
    children: [new Paragraph({ text: text || '' })],
  });
}

function labelValueTable(rows: [string, string][], headerLabel?: string) {
  const headerRow = headerLabel
    ? [new TableRow({ children: [headerCell(headerLabel, 35), headerCell('', 65)] })]
    : [];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: THIN_BORDERS,
    rows: [...headerRow, ...rows.map(([label, value]) => new TableRow({ children: [labelCell(label, 35), cell(value, 65)] }))],
  });
}

function twoColTable(headers: [string, string], rows: [string, string][]) {
  const headerRow = new TableRow({ children: [headerCell(headers[0], 50), headerCell(headers[1], 50)] });
  const body = (rows.length ? rows : [['', ''] as [string, string]]).map(
    ([a, b]) => new TableRow({ children: [cell(a, 50), cell(b, 50)] }),
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: THIN_BORDERS, rows: [headerRow, ...body] });
}

function threeColTable(headers: [string, string, string], rows: [string, string, string][]) {
  const headerRow = new TableRow({ children: headers.map(h => headerCell(h, 33.33)) });
  const body = (rows.length ? rows : [['', '', ''] as [string, string, string]]).map(
    r => new TableRow({ children: r.map(v => cell(v, 33.33)) }),
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: THIN_BORDERS, rows: [headerRow, ...body] });
}

function cargosTable(directos: CargoCountRow[], indirectos: CargoCountRow[]) {
  const headerRow = new TableRow({
    children: [headerCell('Cargos Directos', 35), headerCell('Cantidad', 15), headerCell('Cargos Indirectos', 35), headerCell('Cantidad', 15)],
  });
  const n = Math.max(directos.length, indirectos.length, 1);
  const rows = Array.from({ length: n }).map((_, i) => new TableRow({
    children: [
      cell(directos[i]?.cargo || '', 35), cell(directos[i]?.cantidad || '', 15),
      cell(indirectos[i]?.cargo || '', 35), cell(indirectos[i]?.cantidad || '', 15),
    ],
  }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: THIN_BORDERS, rows: [headerRow, ...rows] });
}

function responsabilidadesTable(rows: QueParaRow[]) {
  const headerRow = new TableRow({ children: [headerCell('N°', 8), headerCell('¿Qué hace?', 46), headerCell('¿Para qué?', 46)] });
  const body = (rows.length ? rows : [{ que_hace: '', para_que: '' }]).map(
    (r, i) => new TableRow({ children: [cell(String(i + 1), 8), cell(r.que_hace, 46), cell(r.para_que, 46)] }),
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: THIN_BORDERS, rows: [headerRow, ...body] });
}

function competenciasTable(nivel: NivelCompetencias) {
  const headerRow = new TableRow({ children: [headerCell('Competencia', 30), headerCell('Descriptor', 70)] });
  const body = getCompetencias(nivel).map(c => new TableRow({ children: [cell(c.nombre, 30), cell(c.descriptor, 70)] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: THIN_BORDERS, rows: [headerRow, ...body] });
}

function documentosReferenciaTable() {
  const headerRow = new TableRow({ children: [grayHeaderCell('Tipo de Documento', 30), grayHeaderCell('Descripción', 70)] });
  const body = [new TableRow({ children: [cell('Glosario', 30), cell('Glosario en línea', 70)] })];
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: THIN_BORDERS, rows: [headerRow, ...body] });
}

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: CORP_BLUE })],
  });
}

function subHeading(text: string) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, color: CORP_BLUE })],
  });
}

function note(text: string) {
  return new Paragraph({ spacing: { before: 100, after: 100 }, children: [new TextRun({ text, italics: true, size: 20, color: '666666' })] });
}

async function buildDocHeader(): Promise<Header> {
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
              children: [new TextRun({ text: 'DESCRIPCIÓN DE CARGO', bold: true, size: 28 })],
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

export async function buildCargoDocxBlob(data: CargoData): Promise<Blob> {
  const docHeader = await buildDocHeader();

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
        sectionHeading('1. Identificación del Cargo'),
        labelValueTable([
          ['Nombre del Cargo', data.nombre_cargo],
          ['Código del Cargo', ''],
          ['Departamento', data.departamento],
          ['Sección / área', data.seccion_area],
          ['Cargo de reporte funcional', data.reporte_funcional],
          ['Cargo de reporte disciplinario', data.reporte_disciplinario],
        ]),

        sectionHeading('2. Dimensiones'),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Cargos que le reportan al cargo:', bold: true })] }),
        cargosTable(data.cargos_directos, data.cargos_indirectos),
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        twoColTable(['Financieras', 'No Financieras'], [[data.dimension_financiera, data.dimension_no_financiera]]),

        sectionHeading('3. Finalidad del Cargo'),
        new Paragraph({ text: data.finalidad || '' }),

        sectionHeading('4. Responsabilidades del Cargo'),
        responsabilidadesTable(data.responsabilidades),
        note('Nota: la numeración de las funciones arriba descritas no implica necesariamente orden de prioridad en la ejecución. Esta lista es enunciativa y no limitativa; el colaborador podrá realizar otras funciones que le sean asignadas por su superior inmediato para el buen desarrollo y funcionamiento del departamento.'),

        sectionHeading('5. Perfil del Cargo (Requerimientos específicos)'),
        subHeading('5.1 Conocimientos y Experiencia'),
        labelValueTable([
          ['Formación profesional', data.formacion_profesional],
          ['Estudios de postgrado', data.estudios_postgrado],
          ['Conocimientos Específicos', data.conocimientos_especificos],
          ['Idiomas', data.idiomas],
          ['Experiencia', data.experiencia],
        ], 'Formación Académica'),

        sectionHeading('6. Relaciones Internas y Externas'),
        subHeading('6.1 Internamente'),
        twoColTable(
          ['¿Con quién? (Cargo, Departamento, Unidad)', '¿Para qué?'],
          data.relaciones_internas.map(r => [r.con_quien, r.para_que]),
        ),
        subHeading('6.2 Externamente'),
        twoColTable(
          ['¿Con quién? (Cargo, Departamento, Unidad)', '¿Para qué?'],
          data.relaciones_externas.map(r => [r.con_quien, r.para_que]),
        ),

        sectionHeading('7. Naturaleza de la Responsabilidad'),
        twoColTable(['Decisiones (Libertad para actuar del Cargo)', 'Propuestas'], [[data.decisiones, data.propuestas]]),

        sectionHeading('8. Indicadores'),
        threeColTable(
          ['Macroproceso', 'Proceso', 'Indicador'],
          data.indicadores.map(i => [i.macroproceso, i.proceso, i.indicador]),
        ),
        note('Nota: los pesos y las metas son establecidos en evaluación de desempeño y pueden variar según prioridades en distintos períodos.'),

        sectionHeading('9. Competencias'),
        competenciasTable(data.nivel_competencias),

        sectionHeading('10. Condiciones de Trabajo'),
        new Paragraph({ text: data.condiciones_trabajo || '' }),

        sectionHeading('11. Medidas de Seguridad a Observar'),
        new Paragraph({ text: data.medidas_seguridad || '' }),

        sectionHeading('12. Otros Roles'),
        new Paragraph({ text: data.otros_roles || '', spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: 'Documentos de Referencia:', bold: true })], spacing: { after: 100 } }),
        documentosReferenciaTable(),
      ],
    }],
  });

  return Packer.toBlob(doc);
}
