import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Tag, Calendar, CheckSquare, Users, Paperclip, MapPin, StickyNote,
  Plus, Trash2, X, Download, Send, Link2, Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  seguimientoId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged?: () => void;
}

const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

const sanitize = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, '_');

export function SeguimientoCardDialog({ seguimientoId, open, onOpenChange, onChanged }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [seg, setSeg] = useState<any>(null);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [items, setItems] = useState<Record<string, any[]>>({});
  const [adjuntos, setAdjuntos] = useState<any[]>([]);
  const [etiquetas, setEtiquetas] = useState<any[]>([]);
  const [misEtiquetas, setMisEtiquetas] = useState<any[]>([]);
  const [miembros, setMiembros] = useState<any[]>([]);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newCLTitle, setNewCLTitle] = useState('');
  const [newItemFor, setNewItemFor] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(COLORS[0]);
  const [newLink, setNewLink] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editLoc, setEditLoc] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const loadAll = async () => {
    if (!seguimientoId) return;
    setLoading(true);
    const [s, cls, adj, et, mis, miem, prof, nts] = await Promise.all([
      supabase.from('seguimientos' as any).select('*').eq('id', seguimientoId).single(),
      supabase.from('seguimiento_checklists' as any).select('*').eq('seguimiento_id', seguimientoId).order('orden'),
      supabase.from('seguimiento_adjuntos' as any).select('*').eq('seguimiento_id', seguimientoId).order('created_at', { ascending: false }),
      supabase.from('seguimiento_etiqueta_items' as any).select('*, etiqueta:seguimiento_etiquetas(*)').eq('seguimiento_id', seguimientoId),
      supabase.from('seguimiento_etiquetas' as any).select('*').order('nombre'),
      supabase.from('seguimiento_miembros' as any).select('*').eq('seguimiento_id', seguimientoId),
      supabase.from('profiles').select('user_id, full_name, email').order('full_name'),
      supabase.from('seguimiento_notas' as any).select('*').eq('seguimiento_id', seguimientoId).order('created_at', { ascending: false }),
    ]);
    setSeg(s.data);
    setEditLoc((s.data as any)?.ubicacion || '');
    setEditStart((s.data as any)?.fecha_inicio || '');
    setEditEnd((s.data as any)?.fecha_limite || '');
    const clList = (cls.data as any[]) || [];
    setChecklists(clList);
    if (clList.length) {
      const { data: itData } = await supabase
        .from('seguimiento_checklist_items' as any)
        .select('*')
        .in('checklist_id', clList.map(c => c.id))
        .order('orden');
      const grouped: Record<string, any[]> = {};
      ((itData as any[]) || []).forEach(it => {
        (grouped[it.checklist_id] ||= []).push(it);
      });
      setItems(grouped);
    } else setItems({});
    setAdjuntos((adj.data as any[]) || []);
    setEtiquetas((et.data as any[]) || []);
    setMisEtiquetas((mis.data as any[]) || []);
    setMiembros((miem.data as any[]) || []);
    setPerfiles((prof.data as any[]) || []);
    setNotas((nts.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) loadAll(); }, [open, seguimientoId]);

  const notify = (e: any) => e?.message && toast({ title: 'Error', description: e.message, variant: 'destructive' });
  const refreshOuter = () => onChanged?.();

  // ============ CHECKLISTS ============
  const addChecklist = async () => {
    if (!newCLTitle.trim()) return;
    const { error } = await supabase.from('seguimiento_checklists' as any).insert({
      seguimiento_id: seguimientoId, titulo: newCLTitle.trim(), orden: checklists.length,
    });
    if (error) return notify(error);
    setNewCLTitle('');
    loadAll();
  };
  const delChecklist = async (id: string) => {
    if (!confirm('¿Eliminar checklist?')) return;
    const { error } = await supabase.from('seguimiento_checklists' as any).delete().eq('id', id);
    if (error) return notify(error);
    loadAll();
  };
  const addItem = async (clId: string) => {
    if (!newItemText.trim()) return;
    const cur = items[clId] || [];
    const { error } = await supabase.from('seguimiento_checklist_items' as any).insert({
      checklist_id: clId, texto: newItemText.trim(), orden: cur.length,
    });
    if (error) return notify(error);
    setNewItemText('');
    setNewItemFor(null);
    loadAll();
  };
  const toggleItem = async (it: any) => {
    const { error } = await supabase.from('seguimiento_checklist_items' as any)
      .update({ completado: !it.completado }).eq('id', it.id);
    if (error) return notify(error);
    setItems(prev => ({
      ...prev,
      [it.checklist_id]: prev[it.checklist_id].map(x => x.id === it.id ? { ...x, completado: !x.completado } : x),
    }));
  };
  const delItem = async (it: any) => {
    const { error } = await supabase.from('seguimiento_checklist_items' as any).delete().eq('id', it.id);
    if (error) return notify(error);
    setItems(prev => ({ ...prev, [it.checklist_id]: prev[it.checklist_id].filter(x => x.id !== it.id) }));
  };

  // ============ ETIQUETAS ============
  const createLabel = async () => {
    if (!user || !newLabelName.trim()) return;
    const { data, error } = await supabase.from('seguimiento_etiquetas' as any).insert({
      user_id: user.id, nombre: newLabelName.trim(), color: newLabelColor,
    }).select().single();
    if (error) return notify(error);
    setNewLabelName('');
    setMisEtiquetas(prev => [...prev, data]);
    // auto-attach
    await attachLabel((data as any).id);
  };
  const attachLabel = async (etiquetaId: string) => {
    if (etiquetas.some(e => e.etiqueta_id === etiquetaId)) return;
    const { error } = await supabase.from('seguimiento_etiqueta_items' as any).insert({
      seguimiento_id: seguimientoId, etiqueta_id: etiquetaId,
    });
    if (error) return notify(error);
    loadAll();
    refreshOuter();
  };
  const detachLabel = async (itemId: string) => {
    const { error } = await supabase.from('seguimiento_etiqueta_items' as any).delete().eq('id', itemId);
    if (error) return notify(error);
    setEtiquetas(prev => prev.filter(e => e.id !== itemId));
    refreshOuter();
  };

  // ============ MIEMBROS ============
  const addMember = async (userId: string) => {
    if (miembros.some(m => m.member_user_id === userId)) return;
    const { error } = await supabase.from('seguimiento_miembros' as any).insert({
      seguimiento_id: seguimientoId, member_user_id: userId,
    });
    if (error) return notify(error);
    loadAll();
  };
  const removeMember = async (id: string) => {
    const { error } = await supabase.from('seguimiento_miembros' as any).delete().eq('id', id);
    if (error) return notify(error);
    setMiembros(prev => prev.filter(m => m.id !== id));
  };

  // ============ ADJUNTOS ============
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const path = `${user.id}/${seguimientoId}/${Date.now()}_${sanitize(file.name)}`;
    const { error: upErr } = await supabase.storage.from('seguimiento-adjuntos').upload(path, file);
    if (upErr) { setUploading(false); return notify(upErr); }
    const { error } = await supabase.from('seguimiento_adjuntos' as any).insert({
      seguimiento_id: seguimientoId, user_id: user.id, nombre: file.name,
      storage_path: path, tamano_bytes: file.size, tipo_mime: file.type,
    });
    if (error) notify(error); else toast({ title: 'Archivo subido' });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    loadAll();
  };
  const addLink = async () => {
    if (!user || !newLink.trim()) return;
    const { error } = await supabase.from('seguimiento_adjuntos' as any).insert({
      seguimiento_id: seguimientoId, user_id: user.id,
      nombre: newLinkName.trim() || newLink.trim(),
      enlace: newLink.trim(),
    });
    if (error) return notify(error);
    setNewLink(''); setNewLinkName('');
    loadAll();
  };
  const downloadAdj = async (a: any) => {
    if (a.enlace) { window.open(a.enlace, '_blank'); return; }
    const { data, error } = await supabase.storage.from('seguimiento-adjuntos').createSignedUrl(a.storage_path, 60);
    if (error) return notify(error);
    window.open(data.signedUrl, '_blank');
  };
  const delAdj = async (a: any) => {
    if (!confirm('¿Eliminar adjunto?')) return;
    if (a.storage_path) await supabase.storage.from('seguimiento-adjuntos').remove([a.storage_path]);
    const { error } = await supabase.from('seguimiento_adjuntos' as any).delete().eq('id', a.id);
    if (error) return notify(error);
    setAdjuntos(prev => prev.filter(x => x.id !== a.id));
  };

  // ============ NOTAS ============
  const addNote = async () => {
    if (!user || !newNote.trim()) return;
    const { error } = await supabase.from('seguimiento_notas' as any).insert({
      seguimiento_id: seguimientoId, user_id: user.id, contenido: newNote.trim(),
    });
    if (error) return notify(error);
    setNewNote('');
    loadAll();
  };
  const delNote = async (id: string) => {
    const { error } = await supabase.from('seguimiento_notas' as any).delete().eq('id', id);
    if (error) return notify(error);
    setNotas(prev => prev.filter(n => n.id !== id));
  };

  // ============ FECHAS / UBICACIÓN ============
  const saveMeta = async () => {
    const { error } = await supabase.from('seguimientos' as any).update({
      ubicacion: editLoc.trim() || null,
      fecha_inicio: editStart || null,
      fecha_limite: editEnd || null,
    }).eq('id', seguimientoId);
    if (error) return notify(error);
    toast({ title: 'Guardado' });
    refreshOuter();
  };

  const profileName = (uid: string) => {
    const p = perfiles.find(p => p.user_id === uid);
    return p?.full_name || p?.email || uid.slice(0, 8);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {loading || !seg ? (
          <div className="py-12 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Cargando...</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">{seg.titulo}</DialogTitle>
              {seg.descripcion && <p className="text-sm text-muted-foreground">{seg.descripcion}</p>}
            </DialogHeader>

            {/* Etiquetas asignadas */}
            {etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {etiquetas.map(e => (
                  <Badge key={e.id} style={{ backgroundColor: e.etiqueta?.color, color: '#fff', border: 'none' }} className="gap-1">
                    {e.etiqueta?.nombre}
                    <button onClick={() => detachLabel(e.id)} className="hover:opacity-70"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Miembros */}
            {miembros.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {miembros.map(m => (
                  <Badge key={m.id} variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />{profileName(m.member_user_id)}
                    <button onClick={() => removeMember(m.id)} className="hover:opacity-70"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Toolbar — Trello "Añadir a la tarjeta" */}
            <div className="flex flex-wrap gap-2 border-y py-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5"><Tag className="h-3.5 w-3.5" />Etiquetas</Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="space-y-2">
                    <Label className="text-xs">Mis etiquetas</Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {misEtiquetas.length === 0 && <p className="text-xs text-muted-foreground">Sin etiquetas todavía</p>}
                      {misEtiquetas.map(l => {
                        const used = etiquetas.some(e => e.etiqueta_id === l.id);
                        return (
                          <button key={l.id} onClick={() => attachLabel(l.id)} disabled={used}
                            className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-accent text-left", used && "opacity-50")}>
                            <span className="w-3 h-3 rounded" style={{ backgroundColor: l.color }} />
                            <span className="flex-1">{l.nombre}</span>
                            {used && <span className="text-[10px]">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t pt-2 space-y-2">
                      <Label className="text-xs">Nueva etiqueta</Label>
                      <Input value={newLabelName} onChange={e => setNewLabelName(e.target.value)} placeholder="Nombre" className="h-8" />
                      <div className="flex gap-1 flex-wrap">
                        {COLORS.map(c => (
                          <button key={c} onClick={() => setNewLabelColor(c)}
                            className={cn("w-6 h-6 rounded", newLabelColor === c && "ring-2 ring-offset-2 ring-offset-background ring-foreground")}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <Button size="sm" className="w-full" onClick={createLabel} disabled={!newLabelName.trim()}>Crear y añadir</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5"><Calendar className="h-3.5 w-3.5" />Fechas</Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-2">
                  <div><Label className="text-xs">Fecha inicio</Label><Input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} className="h-8" /></div>
                  <div><Label className="text-xs">Fecha límite</Label><Input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="h-8" /></div>
                  <Button size="sm" className="w-full" onClick={saveMeta}>Guardar</Button>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5"><CheckSquare className="h-3.5 w-3.5" />Checklist</Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-2">
                  <Label className="text-xs">Título del checklist</Label>
                  <Input value={newCLTitle} onChange={e => setNewCLTitle(e.target.value)} placeholder="Checklist" className="h-8" />
                  <Button size="sm" className="w-full" onClick={addChecklist}>Añadir</Button>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5"><Users className="h-3.5 w-3.5" />Miembros</Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <Label className="text-xs">Asignar usuarios</Label>
                  <div className="max-h-60 overflow-y-auto mt-2 space-y-1">
                    {perfiles.map(p => {
                      const used = miembros.some(m => m.member_user_id === p.user_id);
                      return (
                        <button key={p.user_id} onClick={() => addMember(p.user_id)} disabled={used}
                          className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-accent text-left", used && "opacity-50")}>
                          <span className="w-6 h-6 rounded-full bg-primary/20 grid place-items-center text-[10px] font-medium">
                            {(p.full_name || p.email || '?').slice(0, 2).toUpperCase()}
                          </span>
                          <span className="flex-1 truncate">{p.full_name || p.email}</span>
                          {used && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5"><Paperclip className="h-3.5 w-3.5" />Adjunto</Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-3">
                  <div>
                    <Label className="text-xs">Subir archivo</Label>
                    <input ref={fileRef} type="file" onChange={onUpload} className="hidden" />
                    <Button size="sm" className="w-full mt-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Paperclip className="h-3 w-3 mr-1" />}
                      Elegir archivo
                    </Button>
                  </div>
                  <div className="border-t pt-2 space-y-1">
                    <Label className="text-xs">O añadir un enlace</Label>
                    <Input value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://..." className="h-8" />
                    <Input value={newLinkName} onChange={e => setNewLinkName(e.target.value)} placeholder="Nombre (opcional)" className="h-8" />
                    <Button size="sm" className="w-full" onClick={addLink} disabled={!newLink.trim()}><Link2 className="h-3 w-3 mr-1" />Añadir enlace</Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5"><MapPin className="h-3.5 w-3.5" />Ubicación</Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-2">
                  <Label className="text-xs">Ubicación</Label>
                  <Input value={editLoc} onChange={e => setEditLoc(e.target.value)} placeholder="Dirección o lugar" className="h-8" />
                  <Button size="sm" className="w-full" onClick={saveMeta}>Guardar</Button>
                </PopoverContent>
              </Popover>
            </div>

            {/* Fechas / Ubicación display */}
            {(seg.fecha_inicio || seg.fecha_limite || seg.ubicacion) && (
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {seg.fecha_inicio && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Inicio: {format(new Date(seg.fecha_inicio), "d MMM yyyy", { locale: es })}</span>}
                {seg.fecha_limite && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Límite: {format(new Date(seg.fecha_limite), "d MMM yyyy", { locale: es })}</span>}
                {seg.ubicacion && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{seg.ubicacion}</span>}
              </div>
            )}

            {/* Checklists */}
            {checklists.map(cl => {
              const its = items[cl.id] || [];
              const done = its.filter(i => i.completado).length;
              const pct = its.length ? Math.round((done / its.length) * 100) : 0;
              return (
                <div key={cl.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <CheckSquare className="h-4 w-4" />{cl.titulo}
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-400" onClick={() => delChecklist(cl.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  {its.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-8">{pct}%</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    {its.map(it => (
                      <div key={it.id} className="flex items-center gap-2 group">
                        <Checkbox checked={it.completado} onCheckedChange={() => toggleItem(it)} />
                        <span className={cn("text-sm flex-1", it.completado && "line-through text-muted-foreground")}>{it.texto}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-rose-400" onClick={() => delItem(it)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                  {newItemFor === cl.id ? (
                    <div className="flex gap-2">
                      <Input value={newItemText} onChange={e => setNewItemText(e.target.value)} placeholder="Nuevo elemento" className="h-8"
                        onKeyDown={e => e.key === 'Enter' && addItem(cl.id)} autoFocus />
                      <Button size="sm" onClick={() => addItem(cl.id)}>Añadir</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setNewItemFor(null); setNewItemText(''); }}>Cancelar</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => setNewItemFor(cl.id)}><Plus className="h-3 w-3" />Añadir elemento</Button>
                  )}
                </div>
              );
            })}

            {/* Adjuntos */}
            {adjuntos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm"><Paperclip className="h-4 w-4" />Adjuntos</div>
                <div className="space-y-1">
                  {adjuntos.map(a => (
                    <Card key={a.id} className="p-2 flex items-center gap-2 group">
                      {a.enlace ? <Link2 className="h-4 w-4 text-blue-400" /> : <Paperclip className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm flex-1 truncate">{a.nombre}</span>
                      <span className="text-[11px] text-muted-foreground">{format(new Date(a.created_at), "d MMM", { locale: es })}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadAdj(a)}><Download className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-400 opacity-0 group-hover:opacity-100" onClick={() => delAdj(a)}><Trash2 className="h-3 w-3" /></Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm"><StickyNote className="h-4 w-4" />Notas / Comentarios</div>
              <div className="flex gap-2">
                <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} placeholder="Escribe una nota..."
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addNote(); } }} />
                <Button onClick={addNote} disabled={!newNote.trim()} size="icon" className="h-auto"><Send className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-1">
                {notas.map(n => (
                  <Card key={n.id} className="p-2 group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm whitespace-pre-wrap flex-1">{n.contenido}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-400 opacity-0 group-hover:opacity-100" onClick={() => delNote(n.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{format(new Date(n.created_at), "d MMM yyyy, HH:mm", { locale: es })}</div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
