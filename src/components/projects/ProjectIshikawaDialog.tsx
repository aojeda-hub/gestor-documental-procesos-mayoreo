import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, List, Fish, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Categoria = 'medio_ambiente' | 'tecnologia' | 'personas' | 'medicion' | 'materiales' | 'procesos';

const CATEGORIAS: { key: Categoria; label: string; side: 'top' | 'bottom' }[] = [
  { key: 'medio_ambiente', label: 'Medio Ambiente', side: 'top' },
  { key: 'tecnologia', label: 'Tecnología', side: 'top' },
  { key: 'personas', label: 'Personas', side: 'top' },
  { key: 'medicion', label: 'Medición', side: 'bottom' },
  { key: 'materiales', label: 'Materiales', side: 'bottom' },
  { key: 'procesos', label: 'Procesos', side: 'bottom' },
];

interface Causa {
  id: string;
  categoria: Categoria;
  texto: string;
  orden: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  canEdit: boolean;
}

// Geometría del diagrama (estilo espina de pescado clásico): cada categoría
// tiene una espina diagonal que va desde su caja hasta la espina central, y
// cada causa se escribe a la IZQUIERDA de su espina, unida a un punto sobre
// ella con una línea punteada horizontal. El ancho es fijo (viewBox W) y el
// alto crece según la rama con más causas, para que nunca se monten.
const W = 1500;
const SPINE_X0 = 30; // inicio de la espina central (cola)
const HEAD_X = 1250, HEAD_W = 240, HEAD_H = 120; // caja del problema (cabeza)
const ATTACH_X = [490, 840, 1190]; // dónde cada espina toca la espina central
const BONE_DX = 170; // cuánto se desplaza la espina hacia la izquierda hasta su caja
const BOX_W = 180, BOX_H = 46;
const STEP = 82; // separación vertical entre causas de una misma espina
const ARM_BASE = 70; // distancia de la espina central a la causa más cercana
const MARGIN_OUTER = 55; // de la causa más lejana a la caja de categoría
const MARGIN_EDGE = 40; // de la caja de categoría al borde del lienzo
const LEADER = 60; // largo de la línea punteada entre el punto y el texto
const TEXT_W = 240; // ancho del bloque de texto de cada causa

function pct(x: number, total: number) { return `${(x / total) * 100}%`; }

export function ProjectIshikawaDialog({ open, onOpenChange, projectId, projectName, canEdit }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'editar' | 'diagrama'>('diagrama');
  const [problema, setProblema] = useState('');
  const [causas, setCausas] = useState<Causa[]>([]);
  const [nuevo, setNuevo] = useState<Record<Categoria, string>>({
    medio_ambiente: '', tecnologia: '', personas: '', medicion: '', materiales: '', procesos: '',
  });

  const load = async () => {
    setLoading(true);
    const [{ data: meta }, { data: cs }] = await Promise.all([
      supabase.from('project_ishikawa' as any).select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('project_ishikawa_causas' as any).select('*').eq('project_id', projectId).order('orden'),
    ]);
    setProblema(((meta as any)?.problema as string) || '');
    setCausas(((cs as any[]) || []) as Causa[]);
    setLoading(false);
  };

  useEffect(() => { if (open && projectId) load(); }, [open, projectId]);
  useEffect(() => { if (open) setView('diagrama'); }, [open]);

  const saveProblema = async () => {
    const { error } = await supabase.from('project_ishikawa' as any).upsert({
      project_id: projectId,
      problema: problema.trim() || null,
      updated_by: user?.id || null,
      updated_at: new Date().toISOString(),
    });
    if (error) toast({ title: 'No se pudo guardar', description: error.message, variant: 'destructive' });
    else toast({ title: 'Guardado' });
  };

  const addCausa = async (categoria: Categoria) => {
    const texto = nuevo[categoria]?.trim();
    if (!texto) return;
    const siguienteOrden = Math.max(0, ...causas.filter(c => c.categoria === categoria).map(c => c.orden)) + 1;
    const { data, error } = await supabase.from('project_ishikawa_causas' as any)
      .insert({ project_id: projectId, categoria, texto, orden: siguienteOrden })
      .select().single();
    if (error) { toast({ title: 'No se pudo agregar', description: error.message, variant: 'destructive' }); return; }
    setCausas(prev => [...prev, data as unknown as Causa]);
    setNuevo(prev => ({ ...prev, [categoria]: '' }));
  };

  const deleteCausa = async (id: string) => {
    const prev = causas;
    setCausas(cs => cs.filter(c => c.id !== id));
    const { error } = await supabase.from('project_ishikawa_causas' as any).delete().eq('id', id);
    if (error) { toast({ title: 'No se pudo eliminar', description: error.message, variant: 'destructive' }); setCausas(prev); }
  };

  const porCategoria = useMemo(() => {
    const map = new Map<Categoria, Causa[]>();
    for (const cat of CATEGORIAS) map.set(cat.key, []);
    for (const c of causas) map.get(c.categoria)?.push(c);
    return map;
  }, [causas]);

  const diagramGeo = useMemo(() => {
    const top = CATEGORIAS.filter(c => c.side === 'top');
    const bottom = CATEGORIAS.filter(c => c.side === 'bottom');

    const maxCount = (list: typeof CATEGORIAS) =>
      Math.max(1, ...list.map(cat => (porCategoria.get(cat.key) || []).length));
    // Distancia vertical de la espina central al extremo de la espina (donde
    // va la caja de categoría): igual para las tres de un mismo lado, para que
    // las cajas queden alineadas.
    const armLen = (count: number) => ARM_BASE + (count - 1) * STEP + MARGIN_OUTER + BOX_H / 2;

    const topArm = armLen(maxCount(top));
    const bottomArm = armLen(maxCount(bottom));
    const spineY = MARGIN_EDGE + BOX_H / 2 + topArm;
    const height = spineY + bottomArm + BOX_H / 2 + MARGIN_EDGE;

    const build = (list: typeof CATEGORIAS, dir: 1 | -1, arm: number) => list.map((cat, i) => {
      const attachX = ATTACH_X[i];
      const boxX = attachX - BONE_DX;
      const boxY = spineY + dir * arm;
      // x de la espina a una distancia vertical v de la espina central
      const xAt = (v: number) => attachX - (v / arm) * BONE_DX;
      const items = porCategoria.get(cat.key) || [];
      // La primera causa queda cerca de la caja y la última cerca de la espina
      // central, como se lee el diagrama.
      const points = items.map((causa, idx) => {
        const v = ARM_BASE + (items.length - 1 - idx) * STEP;
        return { causa, x: xAt(v), y: spineY + dir * v };
      });
      return { cat, attachX, boxX, boxY, points };
    });

    return { spineY, height, nodes: [...build(top, -1, topArm), ...build(bottom, 1, bottomArm)] };
  }, [porCategoria]);

  const { spineY, height: H, nodes } = diagramGeo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-7xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
          <div>
            <DialogTitle className="flex items-center gap-2"><Fish className="h-5 w-5" /> Análisis de Ishikawa</DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">{projectName}</p>
          </div>
          <div className="inline-flex rounded-md border p-0.5 bg-muted/40">
            <Button variant={view === 'diagrama' ? 'default' : 'ghost'} size="sm" className="h-8 gap-1.5" onClick={() => setView('diagrama')}>
              <Fish className="h-3.5 w-3.5" /> Diagrama
            </Button>
            <Button variant={view === 'editar' ? 'default' : 'ghost'} size="sm" className="h-8 gap-1.5" onClick={() => setView('editar')}>
              <List className="h-3.5 w-3.5" /> Editar
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </div>
        ) : view === 'editar' ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Problema / objetivo (efecto)</Label>
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  value={problema}
                  onChange={e => setProblema(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Ej: Falta de un proceso formal de certificación para el nivel 3 en adelante..."
                />
                {canEdit && <Button onClick={saveProblema} className="self-start">Guardar</Button>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIAS.map(cat => (
                <div key={cat.key} className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</p>
                  <ul className="space-y-1.5">
                    {(porCategoria.get(cat.key) || []).map(c => (
                      <li key={c.id} className="flex items-start gap-1.5 text-sm">
                        <span className="flex-1">{c.texto}</span>
                        {canEdit && (
                          <button onClick={() => deleteCausa(c.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                    {(porCategoria.get(cat.key) || []).length === 0 && (
                      <li className="text-xs text-muted-foreground italic">Sin causas aún.</li>
                    )}
                  </ul>
                  {canEdit && (
                    <div className="flex gap-1.5 pt-1">
                      <Input
                        value={nuevo[cat.key]}
                        onChange={e => setNuevo(prev => ({ ...prev, [cat.key]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') addCausa(cat.key); }}
                        placeholder="Agregar causa..."
                        className="h-8 text-sm"
                      />
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0" onClick={() => addCausa(cat.key)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-white">
            <div className="relative w-full min-w-[1150px] text-slate-900" style={{ aspectRatio: `${W}/${H}` }}>
              <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
                {/* Espina central: de la cola (círculo) a la cabeza (problema) */}
                <line x1={SPINE_X0} y1={spineY} x2={HEAD_X} y2={spineY} stroke="#1e293b" strokeWidth={2.5} />
                <circle cx={SPINE_X0} cy={spineY} r={7} fill="white" stroke="#1e293b" strokeWidth={2} />
                {nodes.map(g => (
                  <g key={g.cat.key}>
                    {/* Espina de la categoría */}
                    <line x1={g.attachX} y1={spineY} x2={g.boxX} y2={g.boxY} stroke="#475569" strokeWidth={1.75} strokeDasharray="2 3" />
                    <circle cx={g.attachX} cy={spineY} r={6} fill="white" stroke="#1e293b" strokeWidth={2} />
                    {/* Cada causa: punto sobre la espina y línea punteada hacia su texto */}
                    {g.points.map(p => (
                      <g key={p.causa.id}>
                        <line x1={p.x - LEADER} y1={p.y} x2={p.x} y2={p.y} stroke="#475569" strokeWidth={1.25} strokeDasharray="2 2" />
                        <circle cx={p.x} cy={p.y} r={4.5} fill="#0f172a" />
                      </g>
                    ))}
                  </g>
                ))}
              </svg>

              {/* Caja del problema (efecto) */}
              <div
                className="absolute flex items-center justify-center bg-slate-800 p-3 text-center text-xs font-medium leading-snug text-white shadow-md"
                style={{
                  left: pct(HEAD_X, W), top: pct(spineY - HEAD_H / 2, H),
                  width: pct(HEAD_W, W), height: pct(HEAD_H, H),
                }}
              >
                {problema || 'Sin problema/objetivo definido todavía.'}
              </div>

              {/* Cajas de categoría (forma inclinada) */}
              {nodes.map(g => (
                <div
                  key={g.cat.key}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: pct(g.boxX - BOX_W / 2, W), top: pct(g.boxY - BOX_H / 2, H),
                    width: pct(BOX_W, W), height: pct(BOX_H, H),
                  }}
                >
                  <div className="absolute inset-0 -skew-x-12 border border-slate-800 bg-white" />
                  <span className="relative text-xs font-medium">{g.cat.label}</span>
                </div>
              ))}

              {/* Texto de cada causa: a la izquierda de su espina, alineado a la
                  derecha contra la línea punteada. Máximo 4 líneas (el texto
                  completo se ve al pasar el mouse) para que no se monten. */}
              {nodes.flatMap(g => g.points.map(p => (
                <div
                  key={p.causa.id}
                  title={p.causa.texto}
                  className="absolute flex items-center justify-end"
                  style={{
                    left: pct(p.x - LEADER - 6 - TEXT_W, W),
                    top: pct(p.y - STEP / 2, H),
                    width: pct(TEXT_W, W),
                    height: pct(STEP, H),
                  }}
                >
                  <span className="line-clamp-4 text-right text-[11px] leading-tight">{p.causa.texto}</span>
                </div>
              )))}
            </div>
            {causas.length === 0 && !problema && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Todavía no hay nada cargado. Cambia a "Editar" para definir el problema y las causas.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
