import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Calendar, User, Tag, Trash2, Pencil, AlertCircle, StickyNote, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Estado = 'pendiente' | 'en_revision' | 'en_progreso' | 'completado' | 'cancelado';
type Prioridad = 'baja' | 'media' | 'alta' | 'critica';

interface Seguimiento {
  id: string;
  user_id: string;
  titulo: string;
  descripcion: string | null;
  estado: Estado;
  prioridad: Prioridad;
  responsable: string | null;
  categoria: string | null;
  fecha_limite: string | null;
  fecha_completado: string | null;
  orden: number;
  created_at: string;
  updated_at: string;
}

const COLUMNS: { key: Estado; label: string; color: string }[] = [
  { key: 'pendiente', label: 'Pendiente', color: 'bg-slate-500' },
  { key: 'en_revision', label: 'En Revisión', color: 'bg-amber-500' },
  { key: 'en_progreso', label: 'En Progreso', color: 'bg-blue-500' },
  { key: 'completado', label: 'Completado', color: 'bg-emerald-500' },
  { key: 'cancelado', label: 'Cancelado', color: 'bg-rose-500' },
];

const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica',
};
const PRIORIDAD_COLOR: Record<Prioridad, string> = {
  baja: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  media: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  alta: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  critica: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const empty = {
  titulo: '', descripcion: '', estado: 'pendiente' as Estado, prioridad: 'media' as Prioridad,
  responsable: '', categoria: '', fecha_limite: '',
};

export default function Seguimientos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Seguimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Seguimiento | null>(null);
  const [form, setForm] = useState(empty);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('seguimientos' as any)
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Error al cargar', description: error.message, variant: 'destructive' });
    else setItems((data as any[] as Seguimiento[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const grouped = useMemo(() => {
    const g: Record<Estado, Seguimiento[]> = {
      pendiente: [], en_revision: [], en_progreso: [], completado: [], cancelado: [],
    };
    items.forEach(i => g[i.estado].push(i));
    return g;
  }, [items]);

  const openNew = (estado?: Estado) => {
    setEditing(null);
    setForm({ ...empty, estado: estado || 'pendiente' });
    setDialogOpen(true);
  };

  const openEdit = (s: Seguimiento) => {
    setEditing(s);
    setForm({
      titulo: s.titulo,
      descripcion: s.descripcion || '',
      estado: s.estado,
      prioridad: s.prioridad,
      responsable: s.responsable || '',
      categoria: s.categoria || '',
      fecha_limite: s.fecha_limite || '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user || !form.titulo.trim()) {
      toast({ title: 'Título requerido', variant: 'destructive' });
      return;
    }
    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      estado: form.estado,
      prioridad: form.prioridad,
      responsable: form.responsable.trim() || null,
      categoria: form.categoria.trim() || null,
      fecha_limite: form.fecha_limite || null,
    };
    const { error } = editing
      ? await supabase.from('seguimientos' as any).update(payload).eq('id', editing.id)
      : await supabase.from('seguimientos' as any).insert({ ...payload, user_id: user.id });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Seguimiento actualizado' : 'Seguimiento creado' });
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este seguimiento?')) return;
    const { error } = await supabase.from('seguimientos' as any).delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Eliminado' }); load(); }
  };

  const moveTo = async (id: string, estado: Estado) => {
    const item = items.find(i => i.id === id);
    if (!item || item.estado === estado) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, estado } : i));
    const { error } = await supabase.from('seguimientos' as any).update({ estado }).eq('id', id);
    if (error) {
      toast({ title: 'Error al mover', description: error.message, variant: 'destructive' });
      load();
    }
  };

  const totals = {
    total: items.length,
    activos: items.filter(i => i.estado !== 'completado' && i.estado !== 'cancelado').length,
    completados: grouped.completado.length,
    vencidos: items.filter(i => i.fecha_limite && new Date(i.fecha_limite) < new Date() && i.estado !== 'completado' && i.estado !== 'cancelado').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mis Seguimientos</h1>
          <p className="text-sm text-muted-foreground">Gestión personal de incidencias y casos</p>
        </div>
        <Button onClick={() => openNew()} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo seguimiento
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-semibold">{totals.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Activos</div><div className="text-2xl font-semibold text-blue-400">{totals.activos}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Completados</div><div className="text-2xl font-semibold text-emerald-400">{totals.completados}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Vencidos</div><div className="text-2xl font-semibold text-rose-400">{totals.vencidos}</div></Card>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {COLUMNS.map(col => (
            <div
              key={col.key}
              onDragOver={e => e.preventDefault()}
              onDrop={() => draggedId && moveTo(draggedId, col.key)}
              className="bg-muted/30 rounded-lg p-3 min-h-[300px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", col.color)} />
                  <span className="font-medium text-sm">{col.label}</span>
                  <Badge variant="secondary" className="h-5 text-xs">{grouped[col.key].length}</Badge>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openNew(col.key)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-2 flex-1">
                {grouped[col.key].map(s => {
                  const vencido = s.fecha_limite && new Date(s.fecha_limite) < new Date() && s.estado !== 'completado' && s.estado !== 'cancelado';
                  return (
                    <Card
                      key={s.id}
                      draggable
                      onDragStart={() => setDraggedId(s.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className="p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm leading-snug flex-1">{s.titulo}</h4>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(s)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-400" onClick={() => remove(s.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {s.descripcion && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{s.descripcion}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <Badge className={cn("border", PRIORIDAD_COLOR[s.prioridad])} variant="outline">
                          {PRIORIDAD_LABEL[s.prioridad]}
                        </Badge>
                        {s.categoria && (
                          <Badge variant="outline" className="gap-1"><Tag className="h-2.5 w-2.5" />{s.categoria}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
                        {s.responsable && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{s.responsable}</span>
                        )}
                        {s.fecha_limite && (
                          <span className={cn("flex items-center gap-1", vencido && "text-rose-400")}>
                            {vencido ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                            {format(new Date(s.fecha_limite), "d MMM", { locale: es })}
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {grouped[col.key].length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-6 border border-dashed rounded-md">
                    Vacío
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar seguimiento' : 'Nuevo seguimiento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Título del seguimiento" />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v: Estado) => setForm({ ...form, estado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select value={form.prioridad} onValueChange={(v: Prioridad) => setForm({ ...form, prioridad: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORIDAD_LABEL) as Prioridad[]).map(p => (
                      <SelectItem key={p} value={p}>{PRIORIDAD_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Responsable</Label>
                <Input value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })} />
              </div>
              <div>
                <Label>Categoría</Label>
                <Input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Fecha límite</Label>
              <Input type="date" value={form.fecha_limite} onChange={e => setForm({ ...form, fecha_limite: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
