import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';

// Visor de adjuntos dentro del sistema: muestra el archivo en pantalla en
// lugar de descargarlo. Imágenes y PDF con el visor del navegador; Excel/CSV
// como tabla; Word (.docx) convertido a HTML. Cualquier otro formato ofrece
// descargarlo.

type Kind = 'image' | 'pdf' | 'sheet' | 'word' | 'text' | 'other';

function kindOf(name: string, mime?: string | null): Kind {
  const n = name.toLowerCase();
  if (mime?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(n)) return 'image';
  if (mime === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (/\.(xlsx|xls|xlsm|xlsb|csv|ods)$/.test(n) || mime?.includes('spreadsheet') || mime === 'text/csv') return 'sheet';
  if (n.endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'word';
  if (/\.(txt|md|json|log)$/.test(n) || mime?.startsWith('text/')) return 'text';
  return 'other';
}

const PDF_MIME = 'application/pdf';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nombre del archivo (se usa para detectar el tipo y para descargarlo). */
  nombre: string;
  mimeType?: string | null;
  /** Descarga el contenido del archivo (p. ej. desde Supabase Storage). */
  loadBlob: () => Promise<Blob>;
}

export function AttachmentPreviewDialog({ open, onOpenChange, nombre, mimeType, loadBlob }: Props) {
  const kind = kindOf(nombre, mimeType);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [sheets, setSheets] = useState<{ name: string; html: string }[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlob(null); setUrl(null); setHtml(null); setSheets([]); setActiveSheet(0); setText(null); setError(null);
    setLoading(true);
    (async () => {
      try {
        const raw = await loadBlob();
        if (cancelled) return;
        setBlob(raw);
        if (kind === 'image' || kind === 'pdf') {
          // Se fija el tipo para que el navegador lo muestre en vez de descargarlo.
          const typed = kind === 'pdf' ? new Blob([raw], { type: PDF_MIME }) : raw;
          objectUrl = URL.createObjectURL(typed);
          setUrl(objectUrl);
        } else if (kind === 'sheet') {
          const XLSX = await import('xlsx');
          const wb = XLSX.read(new Uint8Array(await raw.arrayBuffer()), { type: 'array' });
          if (!cancelled) setSheets(wb.SheetNames.map((name) => ({ name, html: XLSX.utils.sheet_to_html(wb.Sheets[name], { editable: false }) })));
        } else if (kind === 'word') {
          const mammoth = await import('mammoth');
          const res = await mammoth.convertToHtml({ arrayBuffer: await raw.arrayBuffer() });
          if (!cancelled) setHtml(res.value || '<p>(Documento vacío)</p>');
        } else if (kind === 'text') {
          const t = await raw.text();
          if (!cancelled) setText(t);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo cargar el archivo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nombre]);

  const descargar = () => { if (blob) saveAs(blob, nombre); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl p-0 gap-0">
        <DialogHeader className="flex-row items-center gap-2 space-y-0 border-b px-4 py-3 pr-12">
          <DialogTitle className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate" title={nombre}>{nombre}</span>
          </DialogTitle>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 shrink-0" onClick={descargar} disabled={!blob}>
            <Download className="h-3.5 w-3.5" /> Descargar
          </Button>
        </DialogHeader>

        <div className="flex h-[75vh] min-h-[360px] flex-col overflow-hidden bg-muted/30">
          {loading ? (
            <div className="m-auto flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
          ) : error ? (
            <div className="m-auto max-w-sm p-6 text-center text-sm text-muted-foreground">{error}</div>
          ) : kind === 'image' && url ? (
            <img src={url} alt={nombre} className="h-full w-full object-contain" />
          ) : kind === 'pdf' && url ? (
            <iframe src={url} title={nombre} className="h-full w-full border-0 bg-white" />
          ) : kind === 'sheet' && sheets.length > 0 ? (
            <>
              {sheets.length > 1 && (
                <div className="flex flex-wrap gap-1 border-b bg-background px-3 py-2">
                  {sheets.map((s, i) => (
                    <button
                      key={s.name}
                      onClick={() => setActiveSheet(i)}
                      className={`rounded-md px-2 py-1 text-xs ${i === activeSheet ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="att-sheet flex-1 overflow-auto bg-white p-3 text-xs text-black" dangerouslySetInnerHTML={{ __html: sheets[activeSheet].html }} />
              <style>{`.att-sheet table{border-collapse:collapse;font-family:inherit}.att-sheet td,.att-sheet th{border:1px solid #d4d4d8;padding:4px 8px;white-space:nowrap}`}</style>
            </>
          ) : kind === 'word' && html ? (
            <div className="flex-1 overflow-auto bg-white">
              <div className="att-doc mx-auto max-w-3xl p-8 text-sm leading-relaxed text-black" dangerouslySetInnerHTML={{ __html: html }} />
              <style>{`.att-doc h1{font-size:1.5em;font-weight:700;margin:.8em 0 .4em}.att-doc h2{font-size:1.25em;font-weight:700;margin:.8em 0 .4em}.att-doc h3{font-weight:700;margin:.6em 0 .3em}.att-doc p{margin:.4em 0}.att-doc ul{list-style:disc;padding-left:1.5em}.att-doc ol{list-style:decimal;padding-left:1.5em}.att-doc table{border-collapse:collapse;margin:.6em 0}.att-doc td,.att-doc th{border:1px solid #d4d4d8;padding:4px 8px}.att-doc img{max-width:100%}`}</style>
            </div>
          ) : kind === 'text' && text !== null ? (
            <pre className="flex-1 overflow-auto whitespace-pre-wrap bg-white p-4 text-xs text-black">{text}</pre>
          ) : (
            <div className="m-auto flex max-w-sm flex-col items-center gap-3 p-6 text-center text-sm text-muted-foreground">
              <FileText className="h-12 w-12" />
              <div className="font-medium text-foreground">Este tipo de archivo no se puede ver en pantalla</div>
              <div>Descárgalo para abrirlo con su programa.</div>
              <Button size="sm" onClick={descargar} disabled={!blob}><Download className="mr-1.5 h-3.5 w-3.5" /> Descargar</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
