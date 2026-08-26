// Procesa archivos adjuntos (PDF, Word, imágenes) para el chat de Skills.
// Los PDF e imágenes se envían tal cual (en base64) a Gemini, que los
// entiende de forma nativa. Word (.docx) no es un formato que Gemini pueda
// leer directamente, así que se extrae su texto en el navegador (con
// JSZip, ya incluido en el proyecto) y ese texto se agrega al mensaje.

export const ACCEPTED_ATTACHMENT_EXTENSIONS = '.pdf,.docx,.jpg,.jpeg,.png';
export const MAX_ATTACHMENT_MB = 15;

export interface PendingAttachment {
  name: string;
  mimeType: string;
  /** Presente solo para PDF/imagen: contenido en base64 para enviar a Gemini como inlineData. */
  data?: string;
  /** Presente solo para Word: texto ya extraído del documento. */
  extractedText?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

async function extractDocxText(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('No se pudo leer el contenido del documento Word.');
  const withBreaks = xml.replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, '\t');
  const text = decodeXmlEntities(withBreaks.replace(/<[^>]+>/g, ''));
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

export async function processAttachment(file: File): Promise<PendingAttachment> {
  if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
    throw new Error(`"${file.name}" supera el límite de ${MAX_ATTACHMENT_MB} MB.`);
  }

  const lowerName = file.name.toLowerCase();

  if (file.type === 'application/pdf' || IMAGE_TYPES.has(file.type)) {
    const data = await fileToBase64(file);
    return { name: file.name, mimeType: file.type, data };
  }

  if (lowerName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const extractedText = await extractDocxText(file);
    return { name: file.name, mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extractedText };
  }

  if (lowerName.endsWith('.doc') || file.type === 'application/msword') {
    throw new Error(`"${file.name}" está en formato .doc antiguo — conviértelo a .docx o PDF antes de adjuntarlo.`);
  }

  throw new Error(`Formato no soportado para "${file.name}". Usa PDF, Word (.docx), JPG o PNG.`);
}
