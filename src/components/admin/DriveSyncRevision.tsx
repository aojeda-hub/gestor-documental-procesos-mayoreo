import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExternalLink, Loader2, RefreshCw, CheckCircle2, FolderTree, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  DOC_TYPE_LABELS, SILO_LABELS, DOCUMENT_ESTATUS_LABELS, DOCUMENT_ESTATUS_COLORS,
  type DocType, type SiloType, type DocumentEstatus,
} from '@/types/database';

// Tablas/columnas de la sincronización con Drive aún no están en los tipos
// generados de Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Motivo = 'enlace_repetido' | 'coincidencia_ambigua' | 'sin_tipo';

interface Candidato {
  id: string;
  title: string;
  silo: SiloType;
  estatus: DocumentEstatus;
  codigo_mapa: string | null;
}

interface FilaRevision {
  drive_file_id: string;
  empresa: string | null;
  silo: SiloType | null;
  title: string;
  drive_path: string | null;
  drive_link: string | null;
  mime_type: string | null;
  motivo: Motivo;
  candidatos: Candidato[] | null;
  detectado_at: string;
}

const MOTIVOS: Record<Motivo, { label: string; ayuda: string }> = {
  enlace_repetido: {
    label: 'Documentos duplicados',
    ayuda: 'Varios documentos de la app apuntan a este mismo archivo. Elige cuál se queda con él.',
  },
  coincidencia_ambigua: {
    label: 'Coincidencia dudosa',
    ayuda: 'El archivo se parece a más de un documento de la app (o hay varios archivos para uno). Elige a cuál vincularlo.',
  },
  sin_tipo: {
    label: 'Sin tipo de documento',
    ayuda: 'El archivo no está en una carpeta de tipo y su nombre no lo indica. Elige el tipo para registrarlo.',
  },
};

interface Movimiento {
  id: string;
  estado: 'pendiente' | 'error';
  detalle: string | null;
  solicitado_at: string;
  document: { title: string } | null;
}

interface CambioHoja {
  id: string;
  accion: 'insertar' | 'actualizar' | 'eliminar';
  estado: 'pendiente' | 'procesando' | 'error';
  detalle: string | null;
  antes: { title?: string } | null;
  cambios: { title?: string } | null;
  solicitado_at: string;
}

const ACCION_HOJA: Record<CambioHoja['accion'], string> = {
  insertar: 'Agregar', actualizar: 'Actualizar', eliminar: 'Eliminar',
};

type AccionOtros = 'desvincular' | 'desincorporar' | 'eliminar';

const ACCION_OTROS: Record<AccionOtros, string> = {
  desvincular: 'Quitarles el enlace (quedan en la app sin archivo)',
  desincorporar: 'Quitarles el enlace y marcarlos Desincorporado',
  eliminar: 'Eliminarlos de la app',
};

// Tipos que se pueden asignar a mano (sin "sintipo", que no existe en la base).
const TIPOS_ASIGNABLES = (Object.keys(DOC_TYPE_LABELS) as DocType[]).filter((t) => t !== 'sintipo');

/** Área = carpetas entre el silo y el archivo (los "sin tipo" no tienen carpeta de tipo). */
function subareaDeRuta(ruta: string | null): string | null {
  const partes = (ruta || '').split(' / ').map((s) => s.trim()).filter(Boolean);
  const area = partes.slice(2);
  return area.length ? area.join(' / ') : null;
}

const ahora = () => new Date().toISOString();

export default function DriveSyncRevision() {
  const { toast } = useToast();
  const [filas, setFilas] = useState<FilaRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Motivo | 'todos'>('todos');
  const [ocupado, setOcupado] = useState<string | null>(null);
  // Selección por archivo: documento elegido, tipo elegido, acción sobre los otros.
  const [elegido, setElegido] = useState<Record<string, string>>({});
  const [tipo, setTipo] = useState<Record<string, DocType>>({});
  const [accionOtros, setAccionOtros] = useState<Record<string, AccionOtros>>({});
  // Acción destructiva (eliminar duplicados) esperando confirmación del diálogo.
  const [confirmar, setConfirmar] = useState<{ mensaje: string; run: () => void } | null>(null);

  // Movimientos app -> Drive pendientes o con error (los "hecho" no necesitan atención).
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const cargarMovimientos = async () => {
    const { data } = await db
      .from('drive_movimientos')
      .select('id, estado, detalle, solicitado_at, document:documents(title)')
      .in('estado', ['pendiente', 'error'])
      .order('solicitado_at', { ascending: false })
      .limit(50);
    setMovimientos((data || []) as Movimiento[]);
  };
  const descartarMovimiento = async (id: string) => {
    const { error } = await db.from('drive_movimientos').delete().eq('id', id);
    if (error) toast({ title: 'No se pudo descartar', description: error.message, variant: 'destructive' });
    else setMovimientos((prev) => prev.filter((m) => m.id !== id));
  };

  // Cambios del Mapa de Procesos hechos en la app que se escriben en el Google Sheet.
  const [cambiosHoja, setCambiosHoja] = useState<CambioHoja[]>([]);
  const cargarCambiosHoja = async () => {
    const { data } = await db
      .from('mapa_hoja_cambios')
      .select('id, accion, estado, detalle, antes, cambios, solicitado_at')
      .in('estado', ['pendiente', 'procesando', 'error'])
      .order('solicitado_at', { ascending: false })
      .limit(50);
    setCambiosHoja((data || []) as CambioHoja[]);
  };
  const descartarCambioHoja = async (id: string) => {
    const { error } = await db.from('mapa_hoja_cambios').delete().eq('id', id);
    if (error) toast({ title: 'No se pudo descartar', description: error.message, variant: 'destructive' });
    else setCambiosHoja((prev) => prev.filter((c) => c.id !== id));
  };

  const cargar = async () => {
    setLoading(true);
    cargarMovimientos();
    cargarCambiosHoja();
    const { data, error } = await db
      .from('drive_sync_revision')
      .select('*')
      .order('motivo')
      .order('title');
    if (error) {
      toast({ title: 'No se pudo cargar la revisión', description: error.message, variant: 'destructive' });
    } else {
      setFilas((data || []) as FilaRevision[]);
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of filas) c[f.motivo] = (c[f.motivo] || 0) + 1;
    return c;
  }, [filas]);

  const visibles = filtro === 'todos' ? filas : filas.filter((f) => f.motivo === filtro);

  const quitarDeLista = async (fila: FilaRevision) => {
    const { error } = await db.from('drive_sync_revision').delete().eq('drive_file_id', fila.drive_file_id);
    if (error) throw error;
    setFilas((prev) => prev.filter((f) => f.drive_file_id !== fila.drive_file_id));
  };

  /**
   * Vincula un documento existente a este archivo, con las mismas reglas que la
   * sincronización: si no es del Mapa de Procesos pasa al silo de la carpeta.
   */
  const vincular = async (fila: FilaRevision, cand: Candidato) => {
    const patch: Record<string, unknown> = {
      drive_file_id: fila.drive_file_id,
      drive_path: fila.drive_path,
      drive_nombre: fila.title,
      drive_visto_at: ahora(),
      drive_eliminado_at: null,
    };
    const { data: actual, error: e1 } = await db
      .from('documents').select('drive_link').eq('id', cand.id).single();
    if (e1) throw e1;
    if (!actual?.drive_link && fila.drive_link) patch.drive_link = fila.drive_link;
    if (!cand.codigo_mapa) {
      if (fila.silo && fila.silo !== cand.silo) patch.silo = fila.silo;
      if (fila.empresa) patch.empresa = fila.empresa;
    }
    const { error } = await db.from('documents').update(patch).eq('id', cand.id);
    if (error) throw error;
  };

  const ejecutar = async (fila: FilaRevision, accion: () => Promise<void>, exito: string) => {
    setOcupado(fila.drive_file_id);
    try {
      await accion();
      await quitarDeLista(fila);
      toast({ title: exito });
    } catch (e: unknown) {
      const description = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e);
      toast({ title: 'No se pudo completar', description, variant: 'destructive' });
    } finally {
      setOcupado(null);
    }
  };

  const resolverDuplicado = (fila: FilaRevision) => {
    const keeperId = elegido[fila.drive_file_id];
    const cands = fila.candidatos || [];
    const keeper = cands.find((c) => c.id === keeperId);
    if (!keeper) return;
    const otros = cands.filter((c) => c.id !== keeperId);
    const accion = accionOtros[fila.drive_file_id] || 'desvincular';
    const run = () => ejecutar(fila, async () => {
      // Primero se sueltan los otros, para que el archivo quede con un solo dueño.
      for (const o of otros) {
        if (accion === 'eliminar') {
          const { error } = await db.from('documents').delete().eq('id', o.id);
          if (error) throw error;
        } else {
          const p: Record<string, unknown> = {
            drive_file_id: null, drive_link: null, drive_path: null, drive_nombre: null, drive_visto_at: null,
          };
          if (accion === 'desincorporar') p.estatus = 'desincorporado';
          const { error } = await db.from('documents').update(p).eq('id', o.id);
          if (error) throw error;
        }
      }
      await vincular(fila, keeper);
    }, `"${keeper.title}" quedó vinculado al archivo`);

    if (accion === 'eliminar') {
      setConfirmar({
        mensaje: `Se eliminarán ${otros.length} documento(s) de la app junto con sus versiones: ${otros.map((o) => `"${o.title}"`).join(', ')}. Esta acción no se puede deshacer.`,
        run,
      });
    } else {
      run();
    }
  };

  const resolverAmbigua = (fila: FilaRevision) => {
    const cand = (fila.candidatos || []).find((c) => c.id === elegido[fila.drive_file_id]);
    if (!cand) return;
    ejecutar(fila, () => vincular(fila, cand), `Archivo vinculado a "${cand.title}"`);
  };

  const crearConTipo = (fila: FilaRevision) => {
    const t = tipo[fila.drive_file_id];
    if (!t || !fila.silo) return;
    ejecutar(fila, async () => {
      const { error } = await db.from('documents').insert({
        title: fila.title,
        doc_type: t,
        silo: fila.silo,
        empresa: fila.empresa || 'mayoreo',
        confidential: (fila.drive_path || '').toLowerCase().includes('restringid'),
        subarea: subareaDeRuta(fila.drive_path),
        estatus: 'por_iniciar',
        drive_link: fila.drive_link,
        drive_file_id: fila.drive_file_id,
        drive_path: fila.drive_path,
        drive_nombre: fila.title,
        drive_visto_at: ahora(),
      });
      if (error) throw error;
    }, `"${fila.title}" registrado como ${DOC_TYPE_LABELS[t]}`);
  };

  const ignorar = (fila: FilaRevision) => {
    ejecutar(fila, async () => {
      const { error } = await db.from('drive_sync_ignorados').upsert({
        drive_file_id: fila.drive_file_id, title: fila.title, drive_path: fila.drive_path,
      });
      if (error) throw error;
    }, `"${fila.title}" no se registrará en la app`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Revisión de la sincronización con Drive</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Archivos de la unidad "Documentación" que la sincronización no pudo resolver sola.
            Cada decisión se aplica al instante y el caso sale de la lista.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {movimientos.length > 0 && (
        <Card className="p-4 space-y-2">
          <div>
            <p className="font-medium">Movimientos en Drive</p>
            <p className="text-sm text-muted-foreground">
              Archivos que se mueven de carpeta porque cambió su tipo, silo o confidencialidad en la app.
              Los pendientes se procesan en la próxima corrida (cada 5 minutos).
            </p>
          </div>
          {movimientos.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2 border-t pt-2 text-sm">
              <Badge variant={m.estado === 'error' ? 'destructive' : 'secondary'}>
                {m.estado === 'error' ? 'Error' : 'Pendiente'}
              </Badge>
              <span className="font-medium flex-1 min-w-0 break-words">{m.document?.title ?? '(documento eliminado)'}</span>
              {m.detalle && <span className="text-xs text-muted-foreground break-all w-full sm:w-auto">{m.detalle}</span>}
              {m.estado === 'error' && (
                <Button variant="ghost" size="sm" onClick={() => descartarMovimiento(m.id)}>Descartar</Button>
              )}
            </div>
          ))}
        </Card>
      )}

      {cambiosHoja.length > 0 && (
        <Card className="p-4 space-y-2">
          <div>
            <p className="font-medium">Cambios al Mapa de Procesos (Google Sheet)</p>
            <p className="text-sm text-muted-foreground">
              Lo que se creó, editó o eliminó del Mapa en la app y se escribe en la pestaña del silo del Sheet.
              Los pendientes se procesan cada minuto. Mientras un cambio tenga error, la app conserva su valor;
              al descartarlo, vuelve a mandar lo que diga el Sheet.
            </p>
          </div>
          {cambiosHoja.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 border-t pt-2 text-sm">
              <Badge variant={c.estado === 'error' ? 'destructive' : 'secondary'}>
                {c.estado === 'error' ? 'Error' : 'Pendiente'}
              </Badge>
              <Badge variant="outline">{ACCION_HOJA[c.accion]}</Badge>
              <span className="font-medium flex-1 min-w-0 break-words">
                {c.cambios?.title ?? c.antes?.title ?? '(sin título)'}
              </span>
              {c.detalle && <span className="text-xs text-muted-foreground break-all w-full sm:w-auto">{c.detalle}</span>}
              {c.estado === 'error' && (
                <Button variant="ghost" size="sm" onClick={() => descartarCambioHoja(c.id)}>Descartar</Button>
              )}
            </div>
          ))}
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={filtro === 'todos' ? 'default' : 'outline'} onClick={() => setFiltro('todos')}>
          Todos ({filas.length})
        </Button>
        {(Object.keys(MOTIVOS) as Motivo[]).map((m) => (
          <Button key={m} size="sm" variant={filtro === m ? 'default' : 'outline'} onClick={() => setFiltro(m)}>
            {MOTIVOS[m].label} ({conteo[m] || 0})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
        </div>
      ) : visibles.length === 0 ? (
        <Card className="p-10 flex flex-col items-center text-center gap-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          <p className="font-medium">No hay casos pendientes</p>
          <p className="text-sm text-muted-foreground">Todo lo de la unidad de Drive está registrado en la app.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibles.map((fila) => {
            const id = fila.drive_file_id;
            const cands = fila.candidatos || [];
            const trabajando = ocupado === id;
            return (
              <Card key={id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{MOTIVOS[fila.motivo].label}</Badge>
                      {fila.silo && <Badge variant="outline">{SILO_LABELS[fila.silo]}</Badge>}
                    </div>
                    <p className="font-medium break-words">{fila.title}</p>
                    {fila.drive_path && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 break-all">
                        <FolderTree className="h-3.5 w-3.5 shrink-0" /> {fila.drive_path}
                      </p>
                    )}
                  </div>
                  {fila.drive_link && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={fila.drive_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" /> Abrir en Drive
                      </a>
                    </Button>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">{MOTIVOS[fila.motivo].ayuda}</p>

                {fila.motivo !== 'sin_tipo' && cands.length > 0 && (
                  <RadioGroup
                    value={elegido[id] || ''}
                    onValueChange={(v) => setElegido((p) => ({ ...p, [id]: v }))}
                    className="gap-2"
                  >
                    {cands.map((c) => (
                      <Label
                        key={c.id}
                        htmlFor={`${id}-${c.id}`}
                        className="flex items-center gap-3 rounded-md border p-2.5 cursor-pointer hover:bg-muted/50 font-normal"
                      >
                        <RadioGroupItem id={`${id}-${c.id}`} value={c.id} />
                        <span className="flex-1 min-w-0 break-words">{c.title}</span>
                        <span className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {c.codigo_mapa && <Badge variant="outline" className="text-[10px]">Mapa {c.codigo_mapa}</Badge>}
                          <Badge variant="outline" className="text-[10px]">{SILO_LABELS[c.silo] ?? c.silo}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${DOCUMENT_ESTATUS_COLORS[c.estatus] ?? ''}`}>
                            {DOCUMENT_ESTATUS_LABELS[c.estatus] ?? c.estatus}
                          </Badge>
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                )}

                {fila.motivo === 'enlace_repetido' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">Con los demás:</span>
                    <Select
                      value={accionOtros[id] || 'desvincular'}
                      onValueChange={(v) => setAccionOtros((p) => ({ ...p, [id]: v as AccionOtros }))}
                    >
                      <SelectTrigger className="w-full sm:w-[380px] h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ACCION_OTROS) as AccionOtros[]).map((a) => (
                          <SelectItem key={a} value={a}>{ACCION_OTROS[a]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {fila.motivo === 'sin_tipo' && (
                  <Select value={tipo[id] || ''} onValueChange={(v) => setTipo((p) => ({ ...p, [id]: v as DocType }))}>
                    <SelectTrigger className="w-full sm:w-[260px] h-9"><SelectValue placeholder="Tipo de documento…" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_ASIGNABLES.map((t) => <SelectItem key={t} value={t}>{DOC_TYPE_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" disabled={trabajando} onClick={() => ignorar(fila)}>
                    <EyeOff className="h-4 w-4 mr-1" /> No registrar este archivo
                  </Button>
                  {fila.motivo === 'enlace_repetido' && (
                    <Button size="sm" disabled={trabajando || !elegido[id]} onClick={() => resolverDuplicado(fila)}>
                      {trabajando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Conservar el elegido
                    </Button>
                  )}
                  {fila.motivo === 'coincidencia_ambigua' && (
                    <Button size="sm" disabled={trabajando || !elegido[id]} onClick={() => resolverAmbigua(fila)}>
                      {trabajando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Vincular al elegido
                    </Button>
                  )}
                  {fila.motivo === 'sin_tipo' && (
                    <Button size="sm" disabled={trabajando || !tipo[id] || !fila.silo} onClick={() => crearConTipo(fila)}>
                      {trabajando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Registrar documento
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmar} onOpenChange={(o) => { if (!o) setConfirmar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documentos duplicados?</AlertDialogTitle>
            <AlertDialogDescription>{confirmar?.mensaje}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { const run = confirmar?.run; setConfirmar(null); run?.(); }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
