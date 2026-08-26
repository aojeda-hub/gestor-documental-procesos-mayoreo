import { useEffect, useRef, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Bot, User, Send, Loader2, Wand2, FileText, Download, RotateCcw,
  IdCard, Gavel, ListChecks, BookOpen, Paperclip, X, FileImage, File as FileIcon,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';
import { buildCargoDocxBlob, getCompetencias, type CargoData, type NivelCompetencias } from '@/lib/cargoDocx';
import { buildNormaDocxBlob, type NormaData } from '@/lib/normaDocx';
import { buildProcedimientoDocxBlob, type ProcedimientoData } from '@/lib/procedimientoDocx';
import { buildManualDocxBlob, type ManualData } from '@/lib/manualDocx';
import { processAttachment, ACCEPTED_ATTACHMENT_EXTENSIONS, type PendingAttachment } from '@/lib/skillAttachments';

type DocType = 'cargo' | 'norma' | 'procedimiento' | 'manual';

interface MessageAttachment {
  name: string;
  mimeType: string;
  /** Solo presente para PDF/imagen — se manda a Gemini como inlineData. */
  data?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Texto a mostrar en la burbuja del chat; si falta, se usa `content`. */
  displayText?: string;
  attachments?: MessageAttachment[];
}

const DOC_TYPE_INFO: Record<DocType, { label: string; description: string; icon: LucideIcon }> = {
  cargo: { label: 'Descripción de Cargo', description: 'Perfil de puesto, 12 secciones corporativas.', icon: IdCard },
  norma: { label: 'Norma', description: 'Objetivo, responsabilidades y reglas.', icon: Gavel },
  procedimiento: { label: 'Procedimiento', description: 'Subprocesos con pasos por cargo.', icon: ListChecks },
  manual: { label: 'Manual', description: 'Guía de uso de una herramienta.', icon: BookOpen },
};

const WELCOME_MESSAGES: Record<DocType, string> = {
  cargo: '¡Hola! Vamos a construir juntos una Descripción de Cargo siguiendo la plantilla corporativa de Mayoreo. Para empezar, ¿cuál es el nombre del cargo que quieres documentar?',
  norma: '¡Hola! Vamos a construir juntos una Norma siguiendo la plantilla corporativa de Mayoreo. Para empezar, ¿sobre qué tema trata la norma que quieres documentar?',
  procedimiento: '¡Hola! Vamos a construir juntos un Procedimiento siguiendo la plantilla corporativa de Mayoreo. Para empezar, ¿qué proceso quieres documentar?',
  manual: '¡Hola! Vamos a construir juntos un Manual de usuario siguiendo la plantilla corporativa de Mayoreo. Para empezar, ¿qué herramienta o proceso quieres documentar?',
};

const FILENAME_PREFIX: Record<DocType, string> = {
  cargo: 'Descripcion_Cargo',
  norma: 'Norma',
  procedimiento: 'Procedimiento',
  manual: 'Manual',
};

function welcomeMessage(docType: DocType): ChatMessage {
  return { id: 'welcome', role: 'assistant', content: WELCOME_MESSAGES[docType] };
}

function stripJsonFences(raw: string) {
  return raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
}

// Salvaguarda: el nombre/título del documento debe ser solo el nombre del
// proceso/cargo/tema, nunca el tipo de documento como prefijo (ej. "Manual
// de X" -> "X"), aunque el prompt ya se lo pida a la IA.
function stripDocTypePrefix(name: string): string {
  const trimmed = name.trim();
  const stripped = trimmed
    .replace(/^(manual|procedimiento|norma|descripci[oó]n de cargo)\s*(de|del|para|sobre)?\s*[:\-–]?\s*/i, '')
    .trim();
  return stripped || trimmed;
}

function inferNivelCompetencias(nombreCargo: string): NivelCompetencias {
  return /gerente|jefe|director/i.test(nombreCargo) ? 'gerencial' : 'comercial';
}

function parseCargoData(raw: string): CargoData {
  const parsed = JSON.parse(stripJsonFences(raw));
  const nombreCargo = stripDocTypePrefix(parsed.nombre_cargo || '');
  return {
    nombre_cargo: nombreCargo,
    departamento: parsed.departamento || '',
    seccion_area: parsed.seccion_area || '',
    reporte_funcional: parsed.reporte_funcional || '',
    reporte_disciplinario: parsed.reporte_disciplinario || '',
    cargos_directos: parsed.cargos_directos || [],
    cargos_indirectos: parsed.cargos_indirectos || [],
    dimension_financiera: parsed.dimension_financiera || '',
    dimension_no_financiera: parsed.dimension_no_financiera || '',
    finalidad: parsed.finalidad || '',
    responsabilidades: parsed.responsabilidades || [],
    formacion_profesional: parsed.formacion_profesional || '',
    estudios_postgrado: parsed.estudios_postgrado || '',
    conocimientos_especificos: parsed.conocimientos_especificos || '',
    idiomas: parsed.idiomas || '',
    experiencia: parsed.experiencia || '',
    relaciones_internas: parsed.relaciones_internas || [],
    relaciones_externas: parsed.relaciones_externas || [],
    decisiones: parsed.decisiones || '',
    propuestas: parsed.propuestas || '',
    indicadores: parsed.indicadores || [],
    nivel_competencias: parsed.nivel_competencias === 'gerencial' || parsed.nivel_competencias === 'comercial'
      ? parsed.nivel_competencias
      : inferNivelCompetencias(nombreCargo),
    condiciones_trabajo: parsed.condiciones_trabajo || '',
    medidas_seguridad: parsed.medidas_seguridad || '',
    otros_roles: parsed.otros_roles || '',
  };
}

function defaultHistorial(parsed: any) {
  return Array.isArray(parsed.historial) && parsed.historial.length
    ? parsed.historial
    : [{ version: '0', fecha: new Date().toLocaleDateString('es-VE'), descripcion: 'Versión Inicial', autor: '', aprobado: '' }];
}

function defaultDocumentosReferencia(parsed: any) {
  return Array.isArray(parsed.documentos_referencia) && parsed.documentos_referencia.length
    ? parsed.documentos_referencia
    : [{ tipo: 'Glosario', descripcion: 'Glosario en línea' }];
}

function parseNormaData(raw: string): NormaData {
  const parsed = JSON.parse(stripJsonFences(raw));
  return {
    titulo: stripDocTypePrefix(parsed.titulo || ''),
    informacion: parsed.informacion || 'Interna',
    distribucion: parsed.distribucion || '',
    objetivo: parsed.objetivo || '',
    responsable_norma: parsed.responsable_norma || '',
    responsables_cumplimiento: parsed.responsables_cumplimiento || '',
    reglas: parsed.reglas || [],
    historial: defaultHistorial(parsed),
    documentos_referencia: defaultDocumentosReferencia(parsed),
  };
}

function parseProcedimientoData(raw: string): ProcedimientoData {
  const parsed = JSON.parse(stripJsonFences(raw));
  return {
    titulo: stripDocTypePrefix(parsed.titulo || ''),
    informacion: parsed.informacion || 'Restringida',
    distribucion: parsed.distribucion || '',
    desarrollo: parsed.desarrollo || '',
    subprocesos: parsed.subprocesos || [],
    historial: defaultHistorial(parsed),
    documentos_referencia: defaultDocumentosReferencia(parsed),
  };
}

function parseManualData(raw: string): ManualData {
  const parsed = JSON.parse(stripJsonFences(raw));
  return {
    titulo: stripDocTypePrefix(parsed.titulo || ''),
    informacion: parsed.informacion || 'Interna',
    distribucion: parsed.distribucion || '',
    objetivo: parsed.objetivo || '',
    descripcion_general: parsed.descripcion_general || '',
    ruta_acceso: parsed.ruta_acceso || '',
    secciones: parsed.secciones || [],
    historial: defaultHistorial(parsed),
    documentos_referencia: defaultDocumentosReferencia(parsed),
  };
}

export default function Skills() {
  const { toast } = useToast();
  const [docType, setDocType] = useState<DocType>('cargo');
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage('cargo')]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<CargoData | NormaData | ProcedimientoData | ManualData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleDocTypeChange = (next: DocType) => {
    if (next === docType) return;
    setDocType(next);
    setMessages([welcomeMessage(next)]);
    setResultData(null);
    setInput('');
    setPendingFiles([]);
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAttaching(true);
    const accepted: PendingAttachment[] = [];
    for (const file of Array.from(files)) {
      try {
        accepted.push(await processAttachment(file));
      } catch (err: any) {
        toast({ title: 'No se pudo adjuntar el archivo', description: err.message, variant: 'destructive' });
      }
    }
    if (accepted.length > 0) setPendingFiles(prev => [...prev, ...accepted]);
    setAttaching(false);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const callAssistant = async (allMessages: ChatMessage[], mode?: 'finalize') => {
    const { data, error } = await supabase.functions.invoke('generate-skill-document', {
      body: {
        messages: allMessages.filter(m => m.id !== 'welcome').map(m => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments?.filter(a => a.data).map(a => ({ mimeType: a.mimeType, data: a.data })),
        })),
        mode,
        docType,
      },
    });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const status = error.context.status;
        const body = await error.context.json().catch(() => null);
        throw new Error(body?.error || body?.message || `${error.message} (HTTP ${status})`);
      }
      throw error;
    }
    if (data?.error) throw new Error(data.error);
    if (typeof data?.answer !== 'string' || !data.answer) {
      throw new Error('La función no devolvió una respuesta válida (revisa los logs de generate-skill-document en Supabase).');
    }
    return data.answer;
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || loading) return;

    const docxNotes = pendingFiles
      .filter(f => f.extractedText)
      .map(f => `[Documento adjunto: ${f.name}]\n\n${f.extractedText}`);
    const content = [...docxNotes, input.trim()].filter(Boolean).join('\n\n---\n\n');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      displayText: input.trim() || (pendingFiles.length > 0 ? '' : content),
      attachments: pendingFiles.length > 0 ? pendingFiles.map(f => ({ name: f.name, mimeType: f.mimeType, data: f.data })) : undefined,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setPendingFiles([]);
    setLoading(true);
    try {
      const answer = await callAssistant(next);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: answer }]);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo procesar tu mensaje.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const raw = await callAssistant(messages, 'finalize');
      const data = docType === 'cargo' ? parseCargoData(raw)
        : docType === 'norma' ? parseNormaData(raw)
        : docType === 'procedimiento' ? parseProcedimientoData(raw)
        : parseManualData(raw);
      setResultData(data);
      toast({ title: 'Documento generado', description: 'Revisa la vista previa y descarga el Word.' });
    } catch (err: any) {
      toast({ title: 'Error al generar el documento', description: err.message || 'Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setMessages([welcomeMessage(docType)]);
    setResultData(null);
    setPendingFiles([]);
  };

  const handleDownload = async () => {
    if (!resultData) return;
    setDownloading(true);
    try {
      const blob = docType === 'cargo' ? await buildCargoDocxBlob(resultData as CargoData)
        : docType === 'norma' ? await buildNormaDocxBlob(resultData as NormaData)
        : docType === 'procedimiento' ? await buildProcedimientoDocxBlob(resultData as ProcedimientoData)
        : await buildManualDocxBlob(resultData as ManualData);
      const nombre = (resultData as any).nombre_cargo || (resultData as any).titulo || FILENAME_PREFIX[docType];
      const safeName = String(nombre).replace(/\s+/g, '_');
      saveAs(blob, `${safeName}.docx`);
    } catch (err: any) {
      toast({ title: 'Error al generar el Word', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const userTurns = messages.filter(m => m.role === 'user').length;
  const activeInfo = DOC_TYPE_INFO[docType];
  const ActiveIcon = activeInfo.icon;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-indigo-600" /> Skills
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Chat guiado para crear documentos controlados con la plantilla corporativa de Mayoreo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(DOC_TYPE_INFO) as DocType[]).map(key => {
          const info = DOC_TYPE_INFO[key];
          const Icon = info.icon;
          const active = key === docType;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleDocTypeChange(key)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                active ? 'border-indigo-500 bg-indigo-500/10 text-indigo-900' : 'border-border hover:bg-muted/50',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-indigo-600' : 'text-muted-foreground')} />
              <span>
                <span className="block font-semibold">{info.label}</span>
                <span className="block text-muted-foreground">{info.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Chat panel */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ActiveIcon className="h-4 w-4 text-indigo-600" /> {activeInfo.label}
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
            </Button>
          </div>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex w-full gap-2", msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                    msg.role === 'user' ? 'bg-muted' : 'bg-indigo-500/10 text-indigo-600 border-indigo-200'
                  )}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm space-y-2",
                    msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-muted rounded-tl-none'
                  )}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.attachments.map((a, i) => (
                          <span key={i} className={cn(
                            "flex items-center gap-1 rounded-md px-2 py-1 text-xs",
                            msg.role === 'user' ? 'bg-white/15' : 'bg-background border',
                          )}>
                            {a.mimeType.startsWith('image/') ? <FileImage className="h-3 w-3 shrink-0" /> : <FileIcon className="h-3 w-3 shrink-0" />}
                            <span className="truncate max-w-[140px]">{a.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {(msg.displayText ?? msg.content) && (msg.displayText ?? msg.content).split('\n').map((line, i) => <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-200">
                    <Bot className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="border-t p-3 space-y-2">
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pendingFiles.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs">
                    {f.mimeType.startsWith('image/') ? <FileImage className="h-3 w-3 shrink-0" /> : <FileIcon className="h-3 w-3 shrink-0" />}
                    <span className="truncate max-w-[140px]">{f.name}</span>
                    <button type="button" onClick={() => removePendingFile(i)} className="ml-0.5 hover:opacity-70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_ATTACHMENT_EXTENSIONS}
                className="hidden"
                onChange={e => { handleFilesSelected(e.target.files); e.target.value = ''; }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Adjuntar documento de referencia o borrador (PDF, Word, JPG, PNG)"
                disabled={loading || attaching}
                onClick={() => fileInputRef.current?.click()}
              >
                {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Escribe tu respuesta..." disabled={loading} />
              <Button type="submit" size="icon" disabled={loading || (!input.trim() && pendingFiles.length === 0)}><Send className="h-4 w-4" /></Button>
            </form>
            <Button
              variant="secondary"
              className="w-full gap-1.5 text-xs"
              onClick={handleGenerate}
              disabled={generating || loading || userTurns < 2}
            >
              <FileText className="h-3.5 w-3.5" />
              {generating ? 'Generando documento...' : 'Generar Documento'}
            </Button>
          </div>
        </Card>

        {/* Document preview panel */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-indigo-600" /> Vista Previa — {activeInfo.label}
            </div>
            {resultData && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownload} disabled={downloading}>
                <Download className="h-3.5 w-3.5" /> {downloading ? 'Generando Word...' : 'Descargar Word (.docx)'}
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1 p-5">
            {!resultData ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-20">
                <FileText className="h-10 w-10 opacity-20 mb-3" />
                <p className="text-sm">Aquí verás el documento con la plantilla corporativa de {activeInfo.label.toLowerCase()}.</p>
                {userTurns < 2 && <p className="text-xs mt-1">Responde algunas preguntas para habilitar "Generar Documento".</p>}
              </div>
            ) : docType === 'cargo' ? (
              <CargoPreview data={resultData as CargoData} />
            ) : docType === 'norma' ? (
              <NormaPreview data={resultData as NormaData} />
            ) : docType === 'procedimiento' ? (
              <ProcedimientoPreview data={resultData as ProcedimientoData} />
            ) : (
              <ManualPreview data={resultData as ManualData} />
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b pb-4 last:border-b-0">
      <h3 className="font-bold text-indigo-900 mb-2 text-sm">{title}</h3>
      {children}
    </div>
  );
}

function LabelValueRows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="border rounded-md overflow-hidden text-xs">
      {rows.map(([label, value], i) => (
        <div key={i} className={cn("flex", i > 0 && "border-t")}>
          <div className="w-1/3 bg-muted/50 font-semibold px-2 py-1.5">{label}</div>
          <div className="flex-1 px-2 py-1.5 text-muted-foreground">{value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>{headers.map((h, i) => <TableHead key={i} className="text-xs font-bold">{h}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>{row.map((v, j) => <TableCell key={j} className="text-xs text-muted-foreground">{v || '—'}</TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DocMetaPreview({ informacion, tipo, distribucion }: { informacion: string; tipo: string; distribucion: string }) {
  return (
    <LabelValueRows rows={[
      ['Información', informacion],
      ['Tipo de Documento', tipo],
      ['Distribución', distribucion],
    ]} />
  );
}

function ControlCambiosPreview({ historial }: { historial: { version: string; fecha: string; descripcion: string; autor: string; aprobado: string }[] }) {
  return (
    <SimpleTable
      headers={['Versión', 'Fecha', 'Descripción del cambio', 'Autor & CO-Autor', 'Aprobado por']}
      rows={historial.map(h => [h.version, h.fecha, h.descripcion, h.autor, h.aprobado])}
    />
  );
}

function DocumentosReferenciaPreview({ rows }: { rows: { tipo: string; descripcion: string }[] }) {
  return <SimpleTable headers={['Tipo de Documento', 'Descripción']} rows={rows.map(r => [r.tipo, r.descripcion])} />;
}

function CargoPreview({ data }: { data: CargoData }) {
  return (
    <div className="space-y-6 text-sm">
      <h2 className="text-lg font-bold text-center text-indigo-900">DESCRIPCIÓN DE CARGO</h2>

      <PreviewSection title="1. Identificación del Cargo">
        <LabelValueRows rows={[
          ['Nombre del Cargo', data.nombre_cargo],
          ['Departamento', data.departamento],
          ['Sección / área', data.seccion_area],
          ['Cargo de reporte funcional', data.reporte_funcional],
          ['Cargo de reporte disciplinario', data.reporte_disciplinario],
        ]} />
      </PreviewSection>

      <PreviewSection title="2. Dimensiones">
        <p className="font-medium text-xs mb-1">Cargos que le reportan al cargo:</p>
        <SimpleTable
          headers={['Cargos Directos', 'Cantidad', 'Cargos Indirectos', 'Cantidad']}
          rows={Array.from({ length: Math.max(data.cargos_directos.length, data.cargos_indirectos.length, 1) }).map((_, i) => [
            data.cargos_directos[i]?.cargo || '', data.cargos_directos[i]?.cantidad || '',
            data.cargos_indirectos[i]?.cargo || '', data.cargos_indirectos[i]?.cantidad || '',
          ])}
        />
        <div className="mt-2">
          <SimpleTable headers={['Financieras', 'No Financieras']} rows={[[data.dimension_financiera, data.dimension_no_financiera]]} />
        </div>
      </PreviewSection>

      <PreviewSection title="3. Finalidad del Cargo">
        <p className="text-muted-foreground">{data.finalidad || '—'}</p>
      </PreviewSection>

      <PreviewSection title="4. Responsabilidades del Cargo">
        <SimpleTable
          headers={['N°', '¿Qué hace?', '¿Para qué?']}
          rows={(data.responsabilidades.length ? data.responsabilidades : [{ que_hace: '', para_que: '' }])
            .map((r, i) => [String(i + 1), r.que_hace, r.para_que])}
        />
      </PreviewSection>

      <PreviewSection title="5. Perfil del Cargo">
        <LabelValueRows rows={[
          ['Formación profesional', data.formacion_profesional],
          ['Estudios de postgrado', data.estudios_postgrado],
          ['Conocimientos Específicos', data.conocimientos_especificos],
          ['Idiomas', data.idiomas],
          ['Experiencia', data.experiencia],
        ]} />
      </PreviewSection>

      <PreviewSection title="6. Relaciones Internas y Externas">
        <p className="font-medium text-xs mb-1">Internamente</p>
        <SimpleTable headers={['¿Con quién?', '¿Para qué?']} rows={(data.relaciones_internas.length ? data.relaciones_internas : [{ con_quien: '', para_que: '' }]).map(r => [r.con_quien, r.para_que])} />
        <p className="font-medium text-xs mb-1 mt-3">Externamente</p>
        <SimpleTable headers={['¿Con quién?', '¿Para qué?']} rows={(data.relaciones_externas.length ? data.relaciones_externas : [{ con_quien: '', para_que: '' }]).map(r => [r.con_quien, r.para_que])} />
      </PreviewSection>

      <PreviewSection title="7. Naturaleza de la Responsabilidad">
        <SimpleTable headers={['Decisiones', 'Propuestas']} rows={[[data.decisiones, data.propuestas]]} />
      </PreviewSection>

      <PreviewSection title="8. Indicadores">
        <SimpleTable
          headers={['Macroproceso', 'Proceso', 'Indicador']}
          rows={(data.indicadores.length ? data.indicadores : [{ macroproceso: '', proceso: '', indicador: '' }])
            .map(i => [i.macroproceso, i.proceso, i.indicador])}
        />
      </PreviewSection>

      <PreviewSection title={`9. Competencias (fijas — ${data.nivel_competencias === 'gerencial' ? 'gerenciales' : 'comerciales'})`}>
        <SimpleTable headers={['Competencia', 'Descriptor']} rows={getCompetencias(data.nivel_competencias).map(c => [c.nombre, c.descriptor])} />
      </PreviewSection>

      <PreviewSection title="10. Condiciones de Trabajo">
        <p className="text-muted-foreground">{data.condiciones_trabajo || '—'}</p>
      </PreviewSection>

      <PreviewSection title="11. Medidas de Seguridad a Observar">
        <p className="text-muted-foreground">{data.medidas_seguridad || '—'}</p>
      </PreviewSection>

      <PreviewSection title="12. Otros Roles">
        <p className="text-muted-foreground">{data.otros_roles || '—'}</p>
        <p className="font-medium text-xs mt-3 mb-1">Documentos de Referencia</p>
        <SimpleTable headers={['Tipo de Documento', 'Descripción']} rows={[['Glosario', 'Glosario en línea']]} />
      </PreviewSection>
    </div>
  );
}

function NormaPreview({ data }: { data: NormaData }) {
  return (
    <div className="space-y-6 text-sm">
      <h2 className="text-lg font-bold text-center text-indigo-900">{data.titulo || 'NORMA'}</h2>

      <PreviewSection title="Encabezado">
        <DocMetaPreview informacion={data.informacion} tipo="Norma" distribucion={data.distribucion} />
      </PreviewSection>

      <PreviewSection title="Control de cambios del documento">
        <ControlCambiosPreview historial={data.historial} />
      </PreviewSection>

      <PreviewSection title="Objetivo">
        <p className="text-muted-foreground">{data.objetivo || '—'}</p>
      </PreviewSection>

      <PreviewSection title="Responsabilidades">
        <LabelValueRows rows={[
          ['Norma', data.responsable_norma],
          ['Cumplimiento', data.responsables_cumplimiento],
        ]} />
      </PreviewSection>

      <PreviewSection title="Reglas">
        <div className="space-y-3">
          {(data.reglas.length ? data.reglas : [{ titulo: '', items: [] }]).map((grupo, i) => (
            <div key={i}>
              <p className="font-semibold">{i + 1}. {grupo.titulo || '—'}</p>
              <ul className="mt-1 space-y-1 pl-4">
                {(grupo.items.length ? grupo.items : ['—']).map((item, j) => (
                  <li key={j} className="text-muted-foreground">{i + 1}.{j + 1}. {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection title="Documentos de Referencia">
        <DocumentosReferenciaPreview rows={data.documentos_referencia} />
      </PreviewSection>
    </div>
  );
}

function ProcedimientoPreview({ data }: { data: ProcedimientoData }) {
  return (
    <div className="space-y-6 text-sm">
      <h2 className="text-lg font-bold text-center text-indigo-900">{data.titulo || 'PROCEDIMIENTO'}</h2>

      <PreviewSection title="Encabezado">
        <DocMetaPreview informacion={data.informacion} tipo="Procedimiento" distribucion={data.distribucion} />
      </PreviewSection>

      <PreviewSection title="Control de cambios del documento">
        <ControlCambiosPreview historial={data.historial} />
      </PreviewSection>

      <PreviewSection title="Desarrollo">
        <p className="text-muted-foreground">{data.desarrollo || '—'}</p>
      </PreviewSection>

      <PreviewSection title="Procedimiento">
        <div className="space-y-4">
          {(data.subprocesos.length ? data.subprocesos : [{ titulo: '', filas: [] }]).map((sp, i) => {
            let counter = 1;
            const rows = (sp.filas.length ? sp.filas : [{ cargo: '', pasos: [''] }]).map(fila => {
              const numbered = (fila.pasos.length ? fila.pasos : ['']).map(p => `${counter++}. ${p}`).join('\n');
              return [fila.cargo, numbered];
            });
            return (
              <div key={i}>
                <p className="font-semibold mb-1">{i + 1}. Subproceso: {sp.titulo || '—'}</p>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow><TableHead className="text-xs font-bold w-1/3">Cargo</TableHead><TableHead className="text-xs font-bold">Pasos</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, ri) => (
                        <TableRow key={ri}>
                          <TableCell className="text-xs font-medium align-top">{row[0] || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-pre-line">{row[1] || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      </PreviewSection>

      <PreviewSection title="Documentos de Referencia">
        <DocumentosReferenciaPreview rows={data.documentos_referencia} />
      </PreviewSection>
    </div>
  );
}

function ManualPreview({ data }: { data: ManualData }) {
  return (
    <div className="space-y-6 text-sm">
      <h2 className="text-lg font-bold text-center text-indigo-900">{data.titulo || 'MANUAL'}</h2>

      <PreviewSection title="Encabezado">
        <DocMetaPreview informacion={data.informacion} tipo="Manual" distribucion={data.distribucion} />
      </PreviewSection>

      <PreviewSection title="Control de cambios del documento">
        <ControlCambiosPreview historial={data.historial} />
      </PreviewSection>

      <PreviewSection title="Objetivo">
        <p className="text-muted-foreground">{data.objetivo || '—'}</p>
      </PreviewSection>

      <PreviewSection title={data.titulo || 'Descripción de la herramienta'}>
        <p className="text-muted-foreground">{data.descripcion_general || '—'}</p>
        {data.ruta_acceso && <p className="mt-2"><span className="font-semibold">Ruta de acceso:</span> {data.ruta_acceso}</p>}
      </PreviewSection>

      {(data.secciones.length ? data.secciones : [{ titulo: '', funcionalidades: [] }]).map((seccion, i) => (
        <PreviewSection key={i} title={seccion.titulo || '—'}>
          <ol className="space-y-2 list-decimal list-inside">
            {(seccion.funcionalidades.length ? seccion.funcionalidades : [{ titulo: '', descripcion: '' }]).map((f, j) => (
              <li key={j}>
                <span className="font-semibold">{f.titulo}</span>
                <p className="text-muted-foreground pl-4">{f.descripcion}</p>
                <p className="italic text-muted-foreground/70 pl-4 text-xs">[Espacio para captura de pantalla]</p>
              </li>
            ))}
          </ol>
        </PreviewSection>
      ))}

      <PreviewSection title="Documentos de Referencia">
        <DocumentosReferenciaPreview rows={data.documentos_referencia} />
      </PreviewSection>
    </div>
  );
}
