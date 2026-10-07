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

// Geometría del diagrama (viewBox 1200x700, todo lo demás se posiciona en %)
const W = 1200, H = 700;
const SPINE_Y = 350;
const ATTACH_X = [250, 480, 710];
const BOX_Y_TOP = 55, BOX_Y_BOTTOM = 645;
const BOX_DX = 55;
const BOX_W = 150, BOX_H = 44;

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
    const build = (list: typeof CATEGORIAS, boxY: number) => list.map((cat, i) => {
      const attachX = ATTACH_X[i];
      const boxX = attachX - BOX_DX;
      const items = porCategoria.get(cat.key) || [];
      const points = items.map((causa, idx) => {
        const t = 0.22 + (idx + 1) * (0.55 / (items.length + 1));
        return {
          causa,
          x: attachX + t * (boxX - attachX),
          y: SPINE_Y + t * (boxY - SPINE_Y),
        };
      });
      return { cat, attachX, boxX, boxY, points };
    });
    return [...build(top, BOX_Y_TOP), ...build(bottom, BOX_Y_BOTTOM)];
  }, [porCategoria]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
          <div className="overflow-x-auto">
            <div className="relative w-full min-w-[900px]" style={{ aspectRatio: `${W}/${H}` }}>
              <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
                <line x1={20} y1={SPINE_Y} x2={880} y2={SPINE_Y} stroke="currentColor" className="text-slate-400" strokeWidth={2} />
                <polygon points={`20,${SPINE_Y} 0,${SPINE_Y - 14} 0,${SPINE_Y + 14}`} className="fill-slate-400" />
                {diagramGeo.map(g => (
                  <g key={g.cat.key}>
                    <line x1={g.attachX} y1={SPINE_Y} x2={g.boxX} y2={g.boxY} stroke="currentColor" className="text-slate-400" strokeWidth={1.5} />
                    {g.points.map(p => (
                      <circle key={p.causa.id} cx={p.x} cy={p.y} r={3} className="fill-slate-500" />
                    ))}
                  </g>
                ))}
              </svg>

              {/* Caja del problema (efecto) */}
              <div
                className="absolute flex items-center justify-center rounded-md bg-slate-800 p-3 text-center text-xs font-medium text-white shadow-md"
                style={{
                  left: pct(900, W), top: pct(290, H),
                  width: pct(250, W), height: pct(120, H),
                }}
              >
                {problema || 'Sin problema/objetivo definido todavía.'}
              </div>

              {/* Cajas de categoría */}
              {diagramGeo.map(g => (
                <div
                  key={g.cat.key}
                  className="absolute flex items-center justify-center rounded-md border bg-background px-2 text-center text-xs font-semibold shadow-sm"
                  style={{
                    left: pct(g.boxX - BOX_W / 2, W), top: pct(g.boxY - BOX_H / 2, H),
                    width: pct(BOX_W, W), height: pct(BOX_H, H),
                  }}
                >
                  {g.cat.label}
                </div>
              ))}

              {/* Texto de cada causa */}
              {diagramGeo.flatMap(g => g.points.map(p => (
                <div
                  key={p.causa.id}
                  className="absolute w-32 -translate-x-1/2 text-center text-[10px] leading-tight text-muted-foreground"
                  style={{
                    left: pct(p.x, W),
                    top: pct(g.cat.side === 'top' ? p.y - 46 : p.y + 10, H),
                  }}
                >
                  {p.causa.texto}
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
