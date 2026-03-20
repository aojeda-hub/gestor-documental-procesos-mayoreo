import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Eye, Trash2 } from 'lucide-react';
import { IndicatorSheet } from '@/components/indicators/IndicatorSheet';
import type { Indicator, SiloType, IndicatorType, FrequencyType } from '@/types/database';
import { SILO_LABELS, INDICATOR_TYPE_LABELS, FREQUENCY_LABELS } from '@/types/database';

const emptyForm = {
  name: '', silo: 'compras' as SiloType, related_process: '', indicator_type: 'eficiencia' as IndicatorType,
  definition: '', formula: '', unit: '', frequency: 'mensual' as FrequencyType,
  data_source: '', responsible: '', goals: '', action_plan: '',
};

export default function Indicators() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSilo, setFilterSilo] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [form, setForm] = useState(emptyForm);

  const canEdit = hasRole('admin') || hasRole('editor');

  const fetchIndicators = async () => {
    setLoading(true);
    const { data } = await supabase.from('indicators').select('*').order('name');
    setIndicators((data || []) as unknown as Indicator[]);
    setLoading(false);
  };

  useEffect(() => { fetchIndicators(); }, []);

  const setField = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const openEdit = (ind: Indicator) => {
    setEditId(ind.id);
    setForm({
      name: ind.name, silo: ind.silo, related_process: ind.related_process || '',
      indicator_type: ind.indicator_type, definition: ind.definition || '', formula: ind.formula || '',
      unit: ind.unit || '', frequency: ind.frequency, data_source: ind.data_source || '',
      responsible: ind.responsible || '', goals: ind.goals || '', action_plan: ind.action_plan || '',
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...form, created_by: user?.id } as any;
    let error;
    if (editId) {
      const { created_by, ...updatePayload } = payload;
      ({ error } = await supabase.from('indicators').update(updatePayload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('indicators').insert(payload));
    }
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editId ? 'Indicador actualizado' : 'Indicador creado' });
    setDialogOpen(false);
    fetchIndicators();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este indicador?')) return;
    const { error } = await supabase.from('indicators').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Indicador eliminado' });
    fetchIndicators();
  };

  const openView = (ind: Indicator) => {
    setSelectedIndicator(ind);
    setViewDialogOpen(true);
  };

  const filtered = indicators.filter(i => {
    if (filterSilo !== 'all' && i.silo !== filterSilo) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Buscar indicadores..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterSilo} onValueChange={setFilterSilo}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos los silos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los silos</SelectItem>
            {Object.entries(SILO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        {canEdit && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nuevo Indicador</Button>}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Silo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fórmula</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Metas</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No se encontraron indicadores.</TableCell></TableRow>
              ) : filtered.map(ind => (
                <TableRow key={ind.id}>
                  <TableCell className="font-medium max-w-[200px]">
                    <div>{ind.name}</div>
                    {ind.definition && <p className="text-xs text-muted-foreground truncate">{ind.definition}</p>}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{SILO_LABELS[ind.silo]}</Badge></TableCell>
                  <TableCell>{INDICATOR_TYPE_LABELS[ind.indicator_type]}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[150px] truncate">{ind.formula}</TableCell>
                  <TableCell>{ind.unit}</TableCell>
                  <TableCell>{FREQUENCY_LABELS[ind.frequency]}</TableCell>
                  <TableCell>{ind.responsible}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{ind.goals}</TableCell>
                   <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openView(ind)} title="Ver Ficha">
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(ind)} title="Editar">
                            <Edit2 className="h-4 w-4 text-slate-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(ind.id)} title="Eliminar">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Indicador' : 'Nuevo Indicador'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={e => setField('name', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Silo</Label>
                <Select value={form.silo} onValueChange={v => setField('silo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(SILO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.indicator_type} onValueChange={v => setField('indicator_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(INDICATOR_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select value={form.frequency} onValueChange={v => setField('frequency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(FREQUENCY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Definición</Label>
              <Textarea value={form.definition} onChange={e => setField('definition', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fórmula</Label>
                <Input value={form.formula} onChange={e => setField('formula', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Input value={form.unit} onChange={e => setField('unit', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Proceso relacionado</Label>
                <Input value={form.related_process} onChange={e => setField('related_process', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fuente de datos</Label>
                <Input value={form.data_source} onChange={e => setField('data_source', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Input value={form.responsible} onChange={e => setField('responsible', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metas</Label>
                <Textarea value={form.goals} onChange={e => setField('goals', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Plan de acción</Label>
                <Textarea value={form.action_plan} onChange={e => setField('action_plan', e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!form.name}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Ficha Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-6 bg-slate-50">
          <DialogHeader>
            <DialogTitle className="text-[#1e6075] border-b pb-2">Ficha Técnica del Indicador</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedIndicator && <IndicatorSheet indicator={selectedIndicator} />}
          </div>
          <div className="mt-4 flex justify-end gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>Imprimir</Button>
            <Button onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
