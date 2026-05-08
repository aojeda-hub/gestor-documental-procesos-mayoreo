import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Plus, ExternalLink, Pencil, Trash2, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import Users from '@/pages/Users';
import { z } from 'zod';

interface Desarrollo {
  id: string;
  nombre: string;
  url: string;
  descripcion: string | null;
  icono: string | null;
  created_at: string;
}

const desarrolloSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  url: z.string().trim().url('Debe ser una URL válida').max(500),
  descripcion: z.string().trim().max(300).optional().or(z.literal('')),
});

function DesarrollosAdmin() {
  const { toast } = useToast();
  const [items, setItems] = useState<Desarrollo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Desarrollo | null>(null);
  const [form, setForm] = useState({ nombre: '', url: '', descripcion: '' });

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('desarrollos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error al cargar desarrollos', description: error.message, variant: 'destructive' });
    } else {
      setItems(data as Desarrollo[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ nombre: '', url: '', descripcion: '' });
    setOpen(true);
  };

  const openEdit = (d: Desarrollo) => {
    setEditing(d);
    setForm({ nombre: d.nombre, url: d.url, descripcion: d.descripcion ?? '' });
    setOpen(true);
  };

  const handleSave = async () => {
    const parsed = desarrolloSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: 'Datos inválidos', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      nombre: parsed.data.nombre,
      url: parsed.data.url,
      descripcion: parsed.data.descripcion || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('desarrollos').update(payload).eq('id', editing.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      ({ error } = await supabase.from('desarrollos').insert({ ...payload, created_by: user?.id }));
    }
    setSaving(false);
    if (error) {
      toast({ title: 'Error al guardar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Desarrollo actualizado' : 'Desarrollo agregado' });
    setOpen(false);
    fetchItems();
  };

  const handleDelete = async (d: Desarrollo) => {
    if (!confirm(`¿Eliminar "${d.nombre}"?`)) return;
    const { error } = await supabase.from('desarrollos').delete().eq('id', d.id);
    if (error) {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Desarrollo eliminado' });
    fetchItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Desarrollos a la medida</h2>
          <p className="text-sm text-muted-foreground">Gestiona los accesos a las aplicaciones complementarias.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Agregar desarrollo
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-60" />
          <p className="text-sm">No hay desarrollos registrados todavía.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(d => (
            <Card key={d.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{d.nombre}</h3>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(d)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {d.descripcion && <p className="text-xs text-muted-foreground">{d.descripcion}</p>}
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 break-all"
              >
                <ExternalLink className="h-3 w-3 shrink-0" /> {d.url}
              </a>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar desarrollo' : 'Nuevo desarrollo'}</DialogTitle>
            <DialogDescription>Completa los datos del desarrollo a la medida.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nombre del desarrollo *</Label>
              <Input
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Portal Interno Mayoreo"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Link de acceso *</Label>
              <Input
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                placeholder="https://ejemplo.com"
                maxLength={500}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Breve descripción del desarrollo"
                rows={3}
                maxLength={300}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editing ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Admin() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administración</h1>
          <p className="text-sm text-muted-foreground">Gestión de usuarios y desarrollos del sistema.</p>
        </div>
      </div>

      <Tabs defaultValue="usuarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="desarrollos">Desarrollos a la medida</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios" className="space-y-4">
          <Users />
        </TabsContent>
        <TabsContent value="desarrollos" className="space-y-4">
          <DesarrollosAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}
