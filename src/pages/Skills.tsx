import { useEffect, useRef, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bot, User, Send, Loader2, Wand2, FileText, Download, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';
import { buildCargoDocxBlob, getCompetencias, type CargoData, type NivelCompetencias } from '@/lib/cargoDocx';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Vamos a construir juntos una Descripción de Cargo siguiendo la plantilla corporativa de Mayoreo. Para empezar, ¿cuál es el nombre del cargo que quieres documentar?',
};

function inferNivelCompetencias(nombreCargo: string): NivelCompetencias {
  return /gerente|jefe|director/i.test(nombreCargo) ? 'gerencial' : 'comercial';
}

function parseCargoData(raw: string): CargoData {
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  const parsed = JSON.parse(cleaned);
  const nombreCargo = parsed.nombre_cargo || '';
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

export default function Skills() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargoData, setCargoData] = useState<CargoData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const callAssistant = async (allMessages: ChatMessage[], mode?: 'finalize') => {
    const { data, error } = await supabase.functions.invoke('generate-skill-document', {
      body: {
        messages: allMessages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content })),
        mode,
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
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
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
      const data = parseCargoData(raw);
      setCargoData(data);
      toast({ title: 'Documento generado', description: 'Revisa la vista previa y descarga el Word.' });
    } catch (err: any) {
      toast({ title: 'Error al generar el documento', description: err.message || 'Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setMessages([WELCOME]);
    setCargoData(null);
  };

  const handleDownload = async () => {
    if (!cargoData) return;
    setDownloading(true);
    try {
      const blob = await buildCargoDocxBlob(cargoData);
      const safeName = (cargoData.nombre_cargo || 'Descripcion_de_Cargo').replace(/\s+/g, '_');
      saveAs(blob, `Descripcion_Cargo_${safeName}.docx`);
    } catch (err: any) {
      toast({ title: 'Error al generar el Word', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const userTurns = messages.filter(m => m.role === 'user').length;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-indigo-600" /> Skills
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Chat guiado para crear documentos — hoy: Descripción de Cargo / Perfil de Puesto.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Chat panel */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-indigo-600" /> Descripción de Cargo
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
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-muted rounded-tl-none'
                  )}>
                    {msg.content.split('\n').map((line, i) => <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>)}
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
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Escribe tu respuesta..." disabled={loading} />
              <Button type="submit" size="icon" disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
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
              <FileText className="h-4 w-4 text-indigo-600" /> Vista Previa — Descripción de Cargo
            </div>
            {cargoData && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownload} disabled={downloading}>
                <Download className="h-3.5 w-3.5" /> {downloading ? 'Generando Word...' : 'Descargar Word (.docx)'}
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1 p-5">
            {!cargoData ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-20">
                <FileText className="h-10 w-10 opacity-20 mb-3" />
                <p className="text-sm">Aquí verás la Descripción de Cargo con la plantilla corporativa de 12 secciones.</p>
                {userTurns < 2 && <p className="text-xs mt-1">Responde algunas preguntas para habilitar "Generar Documento".</p>}
              </div>
            ) : (
              <div className="space-y-6 text-sm">
                <h2 className="text-lg font-bold text-center text-indigo-900">DESCRIPCIÓN DE CARGO</h2>

                <PreviewSection title="1. Identificación del Cargo">
                  <LabelValueRows rows={[
                    ['Nombre del Cargo', cargoData.nombre_cargo],
                    ['Departamento', cargoData.departamento],
                    ['Sección / área', cargoData.seccion_area],
                    ['Cargo de reporte funcional', cargoData.reporte_funcional],
                    ['Cargo de reporte disciplinario', cargoData.reporte_disciplinario],
                  ]} />
                </PreviewSection>

                <PreviewSection title="2. Dimensiones">
                  <p className="font-medium text-xs mb-1">Cargos que le reportan al cargo:</p>
                  <SimpleTable
                    headers={['Cargos Directos', 'Cantidad', 'Cargos Indirectos', 'Cantidad']}
                    rows={Array.from({ length: Math.max(cargoData.cargos_directos.length, cargoData.cargos_indirectos.length, 1) }).map((_, i) => [
                      cargoData.cargos_directos[i]?.cargo || '', cargoData.cargos_directos[i]?.cantidad || '',
                      cargoData.cargos_indirectos[i]?.cargo || '', cargoData.cargos_indirectos[i]?.cantidad || '',
                    ])}
                  />
                  <div className="mt-2">
                    <SimpleTable headers={['Financieras', 'No Financieras']} rows={[[cargoData.dimension_financiera, cargoData.dimension_no_financiera]]} />
                  </div>
                </PreviewSection>

                <PreviewSection title="3. Finalidad del Cargo">
                  <p className="text-muted-foreground">{cargoData.finalidad || '—'}</p>
                </PreviewSection>

                <PreviewSection title="4. Responsabilidades del Cargo">
                  <SimpleTable
                    headers={['N°', '¿Qué hace?', '¿Para qué?']}
                    rows={(cargoData.responsabilidades.length ? cargoData.responsabilidades : [{ que_hace: '', para_que: '' }])
                      .map((r, i) => [String(i + 1), r.que_hace, r.para_que])}
                  />
                </PreviewSection>

                <PreviewSection title="5. Perfil del Cargo">
                  <LabelValueRows rows={[
                    ['Formación profesional', cargoData.formacion_profesional],
                    ['Estudios de postgrado', cargoData.estudios_postgrado],
                    ['Conocimientos Específicos', cargoData.conocimientos_especificos],
                    ['Idiomas', cargoData.idiomas],
                    ['Experiencia', cargoData.experiencia],
                  ]} />
                </PreviewSection>

                <PreviewSection title="6. Relaciones Internas y Externas">
                  <p className="font-medium text-xs mb-1">Internamente</p>
                  <SimpleTable headers={['¿Con quién?', '¿Para qué?']} rows={(cargoData.relaciones_internas.length ? cargoData.relaciones_internas : [{ con_quien: '', para_que: '' }]).map(r => [r.con_quien, r.para_que])} />
                  <p className="font-medium text-xs mb-1 mt-3">Externamente</p>
                  <SimpleTable headers={['¿Con quién?', '¿Para qué?']} rows={(cargoData.relaciones_externas.length ? cargoData.relaciones_externas : [{ con_quien: '', para_que: '' }]).map(r => [r.con_quien, r.para_que])} />
                </PreviewSection>

                <PreviewSection title="7. Naturaleza de la Responsabilidad">
                  <SimpleTable headers={['Decisiones', 'Propuestas']} rows={[[cargoData.decisiones, cargoData.propuestas]]} />
                </PreviewSection>

                <PreviewSection title="8. Indicadores">
                  <SimpleTable
                    headers={['Macroproceso', 'Proceso', 'Indicador']}
                    rows={(cargoData.indicadores.length ? cargoData.indicadores : [{ macroproceso: '', proceso: '', indicador: '' }])
                      .map(i => [i.macroproceso, i.proceso, i.indicador])}
                  />
                </PreviewSection>

                <PreviewSection title={`9. Competencias (fijas — ${cargoData.nivel_competencias === 'gerencial' ? 'gerenciales' : 'comerciales'})`}>
                  <SimpleTable headers={['Competencia', 'Descriptor']} rows={getCompetencias(cargoData.nivel_competencias).map(c => [c.nombre, c.descriptor])} />
                </PreviewSection>

                <PreviewSection title="10. Condiciones de Trabajo">
                  <p className="text-muted-foreground">{cargoData.condiciones_trabajo || '—'}</p>
                </PreviewSection>

                <PreviewSection title="11. Medidas de Seguridad a Observar">
                  <p className="text-muted-foreground">{cargoData.medidas_seguridad || '—'}</p>
                </PreviewSection>

                <PreviewSection title="12. Otros Roles">
                  <p className="text-muted-foreground">{cargoData.otros_roles || '—'}</p>
                  <p className="font-medium text-xs mt-3 mb-1">Documentos de Referencia</p>
                  <SimpleTable headers={['Tipo de Documento', 'Descripción']} rows={[['Glosario', 'Glosario en línea']]} />
                </PreviewSection>
              </div>
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
