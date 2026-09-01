import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus, Calendar, User, Trash2, Pencil,
  AlertCircle, StickyNote, Send, Maximize2,
  LayoutGrid, Trello, ChevronLeft, Layout, Search, Loader2, FolderKanban, CalendarClock, MoreVertical, Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SeguimientoCardDialog } from '@/components/seguimientos/SeguimientoCardDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BoardList } from '@/components/seguimientos/BoardList';
import { CustomBoardView } from '@/components/seguimientos/CustomBoardView';
import { ReunionOperativaView } from '@/components/seguimientos/ReunionOperativaView';
import type { Seguimiento, SeguimientoBoard, SeguimientoColumn, SiloType } from '@/types/database';
import { SILO_LABELS } from '@/types/database';
import { COLUMNS, PRIORIDAD_LABEL, PRIORIDAD_COLOR, type Estado, type Prioridad } from '@/lib/seguimientoConstants';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import { ResponsableMultiSelect } from '@/components/seguimientos/ResponsableMultiSelect';
import { syncSeguimientoResponsables, fetchMembersByTask } from '@/lib/seguimientoResponsables';
import { crearTableroReunionOperativa, agregarMiembrosTablero } from '@/lib/reunionOperativa';

const empty = {
  titulo: '', descripcion: '', estado: 'pendiente' as Estado, prioridad: 'media' as Prioridad,
  proyecto: '', fecha_limite: '',
};

export default function Seguimientos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const directory = useUserDirectory();
  const [items, setItems] = useState<Seguimiento[]>([]);
  const [membersByTask, setMembersByTask] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Seguimiento | null>(null);
  const [form, setForm] = useState(empty);
  const [formResponsables, setFormResponsables] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesFor, setNotesFor] = useState<Seguimiento | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});
  const [assignedContext, setAssignedContext] = useState<Record<string, { boardName: string | null; ownerName: string }>>({});
  const [cardOpen, setCardOpen] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [boards, setBoards] = useState<SeguimientoBoard[]>([]);
  const [columns, setColumns] = useState<SeguimientoColumn[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [customBoardRefresh, setCustomBoardRefresh] = useState(0);
  const [selectedReunionBoardId, setSelectedReunionBoardId] = useState<string | null>(null);
  const [reunionCreateOpen, setReunionCreateOpen] = useState(false);
  const [reunionSilo, setReunionSilo] = useState<SiloType | ''>('');
  const [reunionMemberIds, setReunionMemberIds] = useState<string[]>([]);
  const [creatingReunionBoard, setCreatingReunionBoard] = useState(false);
  const [membersDialogBoard, setMembersDialogBoard] = useState<SeguimientoBoard | null>(null);
  const [membersDialogExisting, setMembersDialogExisting] = useState<string[]>([]);
  const [membersDialogNewIds, setMembersDialogNewIds] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Seguimiento[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const openCard = (id: string) => { setCardId(id); setCardOpen(true); };

  const handleCardChanged = () => {
    load();
    setCustomBoardRefresh(prev => prev + 1);
  };

  // Abrir tarjeta desde notificación (?card=<id>)
  useEffect(() => {
    const cardParam = searchParams.get('card');
    if (cardParam) {
      openCard(cardParam);
      searchParams.delete('card');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Abrir tablero personalizado o de Reunión Operativa desde notificación
  // (?board=<id>). Espera a que `boards` esté cargado para saber el tipo de
  // tablero y así abrir la pestaña correcta.
  useEffect(() => {
    const boardParam = searchParams.get('board');
    if (!boardParam || loadingBoards) return;
    const board = boards.find((b) => b.id === boardParam);
    if (board?.tipo === 'reunion_operativa') {
      setActiveTab('reunion_operativa');
      setSelectedReunionBoardId(boardParam);
    } else {
      setActiveTab('custom');
      setSelectedBoardId(boardParam);
    }
    searchParams.delete('board');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, boards, loadingBoards]);

  // Buscador predictivo: busca por título/descripción en cualquier seguimiento
  // al que tengas acceso (propio, de un tablero, o donde te agregaron), sin
  // importar en qué pestaña o tablero estés parado.
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('seguimientos' as any)
        .select('*')
        .or(`titulo.ilike.%${q}%,descripcion.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(8);
      if (!error) {
        setSearchResults((data as any[] as Seguimiento[]) || []);
        setSearchOpen(true);
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cierra el dropdown de resultados al hacer clic fuera del buscador
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selectSearchResult = (s: Seguimiento) => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
    openCard(s.id);
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Seguimientos donde me agregaron como colaborador, sin importar el tablero de origen.
    const { data: memberRows, error: memErr } = await supabase
      .from('seguimiento_miembros' as any)
      .select('seguimiento_id')
      .eq('member_user_id', user.id);
    if (memErr) toast({ title: 'Error al cargar', description: memErr.message, variant: 'destructive' });
    const memberIds = ((memberRows as any[]) || []).map(r => r.seguimiento_id as string);

    let query = supabase.from('seguimientos' as any).select('*');
    query = memberIds.length > 0
      ? query.or(`board_id.is.null,id.in.(${memberIds.join(',')})`)
      : query.is('board_id', null);

    const { data, error } = await query
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Error al cargar', description: error.message, variant: 'destructive' });
    else {
      const list = (data as any[] as Seguimiento[]) || [];
      setItems(list);
      setMembersByTask(await fetchMembersByTask(list.map(i => i.id)));
      // load note counts
      if (list.length > 0) {
        const { data: notesData } = await supabase
          .from('seguimiento_notas' as any)
          .select('seguimiento_id')
          .in('seguimiento_id', list.map(i => i.id));
        const counts: Record<string, number> = {};
        ((notesData as any[]) || []).forEach((n: any) => {
          counts[n.seguimiento_id] = (counts[n.seguimiento_id] || 0) + 1;
        });
        setNoteCounts(counts);
      }

      // Contexto (tablero + dueño) para tarjetas que no son propias, agregadas por membresía.
      const foreign = list.filter(s => s.user_id !== user.id);
      if (foreign.length > 0) {
        const boardIds = [...new Set(foreign.map(s => s.board_id).filter(Boolean))] as string[];
        const ownerIds = [...new Set(foreign.map(s => s.user_id))];
        const [{ data: boardsData }, { data: profilesData }] = await Promise.all([
          boardIds.length
            ? supabase.from('seguimiento_boards').select('id, nombre').in('id', boardIds)
            : Promise.resolve({ data: [] as any[] }),
          supabase.from('profiles').select('user_id, full_name, email').in('user_id', ownerIds),
        ]);
        const boardMap = new Map((boardsData || []).map((b: any) => [b.id, b.nombre]));
        const profileMap = new Map((profilesData || []).map((p: any) => [p.user_id, p.full_name || p.email]));
        const ctx: Record<string, { boardName: string | null; ownerName: string }> = {};
        foreign.forEach(s => {
          ctx[s.id] = {
            boardName: s.board_id ? (boardMap.get(s.board_id) || null) : null,
            ownerName: profileMap.get(s.user_id) || 'otro usuario',
          };
        });
        setAssignedContext(ctx);
      } else {
        setAssignedContext({});
      }
    }
    setLoading(false);
  };

  const openNotes = async (s: Seguimiento) => {
    setNotesFor(s);
    setNotesOpen(true);
    setNewNote('');
    setNotesLoading(true);
    const { data, error } = await supabase
      .from('seguimiento_notas' as any)
      .select('*')
      .eq('seguimiento_id', s.id)
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Error al cargar notas', description: error.message, variant: 'destructive' });
    else setNotes((data as any[]) || []);
    setNotesLoading(false);
  };

  const addNote = async () => {
    if (!user || !notesFor || !newNote.trim()) return;
    const { error } = await supabase.from('seguimiento_notas' as any).insert({
      seguimiento_id: notesFor.id,
      user_id: user.id,
      contenido: newNote.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setNewNote('');
    openNotes(notesFor);
    setNoteCounts(prev => ({ ...prev, [notesFor.id]: (prev[notesFor.id] || 0) + 1 }));
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('seguimiento_notas' as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setNotes(prev => prev.filter(n => n.id !== id));
    if (notesFor) setNoteCounts(prev => ({ ...prev, [notesFor.id]: Math.max(0, (prev[notesFor.id] || 1) - 1) }));
  };

  useEffect(() => { 
    load(); 
    loadBoards();
  }, [user]);

  const loadBoards = async () => {
    if (!user) return;
    setLoadingBoards(true);
    const { data, error } = await supabase.from('seguimiento_boards').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error boards:', error);
    else setBoards(data || []);
    setLoadingBoards(false);
  };

  const grouped = useMemo(() => {
    const g: Record<Estado, Seguimiento[]> = {
      pendiente: [], en_revision: [], en_progreso: [], completado: [], cancelado: [],
    };
    
    const priorityWeight: Record<Prioridad, number> = {
      critica: 4,
      alta: 3,
      media: 2,
      baja: 1,
    };

    items.forEach(i => g[i.estado].push(i));

    (Object.keys(g) as Estado[]).forEach(estado => {
      g[estado].sort((a, b) => priorityWeight[b.prioridad] - priorityWeight[a.prioridad]);
    });

    return g;
  }, [items]);

  const responsableLabel = (s: Seguimiento): string | null => {
    const ids = membersByTask[s.id];
    if (ids && ids.length > 0) {
      const names = ids.map(id => directory.find(u => u.user_id === id)?.full_name).filter(Boolean) as string[];
      if (names.length > 0) return names.join(', ');
    }
    return s.responsable || null;
  };

  const openNew = (estado?: Estado) => {
    setEditing(null);
    setForm({ ...empty, estado: estado || 'pendiente' });
    setFormResponsables([]);
    setDialogOpen(true);
  };

  const openEdit = (s: Seguimiento) => {
    setEditing(s);
    setForm({
      titulo: s.titulo,
      descripcion: s.descripcion || '',
      estado: s.estado,
      prioridad: s.prioridad,
      proyecto: s.proyecto || '',
      fecha_limite: s.fecha_limite || '',
    });
    setFormResponsables(membersByTask[s.id] || []);
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
      proyecto: form.proyecto.trim() || null,
      fecha_limite: form.fecha_limite || null,
    };
    const { data: savedRow, error } = editing
      ? await supabase.from('seguimientos' as any).update(payload).eq('id', editing.id).select('id').single()
      : await supabase.from('seguimientos' as any).insert({ ...payload, user_id: user.id }).select('id').single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    const savedId = editing ? editing.id : (savedRow as unknown as { id: string }).id;
    try {
      await syncSeguimientoResponsables(savedId, editing ? (membersByTask[editing.id] || []) : [], formResponsables);
    } catch (e) {
      toast({ title: 'Error al actualizar responsables', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
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
    <div className="space-y-6 container mx-auto p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Seguimientos</h1>
          <p className="text-slate-500 mt-1">Gestión de proyectos, tareas e iniciativas del equipo.</p>
        </div>

        <div ref={searchBoxRef} className="relative w-full sm:w-80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
              placeholder="Buscar seguimientos..."
              className="pl-9 pr-8"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
            )}
          </div>
          {searchOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">Sin resultados</div>
              ) : (
                searchResults.map(s => {
                  const colMeta = COLUMNS.find(c => c.key === s.estado);
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectSearchResult(s)}
                      className="w-full text-left px-3 py-2 hover:bg-accent flex items-center gap-2 border-b last:border-b-0"
                    >
                      <span className={cn("w-2 h-2 rounded-full shrink-0", colMeta?.color)} />
                      <span className="flex-1 min-w-0 truncate text-sm font-medium">{s.titulo}</span>
                      <Badge className={cn("border shrink-0", PRIORIDAD_COLOR[s.prioridad])} variant="outline">
                        {PRIORIDAD_LABEL[s.prioridad]}
                      </Badge>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {!(activeTab === 'custom' && selectedBoardId) && (
          <Button 
            onClick={() => openNew()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 active:scale-95"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo seguimiento
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/50 p-1 mb-6">
          <TabsTrigger value="general" className="gap-2 px-4 py-2">
            <LayoutGrid className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2 px-4 py-2">
            <Trello className="h-4 w-4" />
            Tableros Personalizados
          </TabsTrigger>
          <TabsTrigger value="reunion_operativa" className="gap-2 px-4 py-2">
            <CalendarClock className="h-4 w-4" />
            Reunión Operativa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-0 outline-none">
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 border-slate-200 shadow-sm"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</div><div className="text-2xl font-bold text-slate-900">{totals.total}</div></Card>
            <Card className="p-4 border-slate-200 shadow-sm"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activos</div><div className="text-2xl font-bold text-blue-600">{totals.activos}</div></Card>
            <Card className="p-4 border-slate-200 shadow-sm"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completados</div><div className="text-2xl font-bold text-emerald-600">{totals.completados}</div></Card>
            <Card className="p-4 border-slate-200 shadow-sm"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vencidos</div><div className="text-2xl font-bold text-rose-600">{totals.vencidos}</div></Card>
          </div>

          {loading ? (
            <div className="text-center text-slate-400 py-12">Cargando...</div>
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

              <div className="space-y-2 flex-1 overflow-y-auto max-h-[560px] pr-1">
                {grouped[col.key].map(s => {
                  const vencido = s.fecha_limite && new Date(s.fecha_limite) < new Date() && s.estado !== 'completado' && s.estado !== 'cancelado';
                  const isForeign = s.user_id !== user?.id;
                  const ctx = assignedContext[s.id];
                  return (
                    <Card
                      key={s.id}
                      draggable
                      onDragStart={() => setDraggedId(s.id)}
                      onDragEnd={() => setDraggedId(null)}
                      onClick={() => openCard(s.id)}
                      className="p-3 cursor-pointer hover:border-primary/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          {s.proyecto && (
                            <div className="flex items-center gap-1 text-[10px] font-medium text-indigo-500 mb-0.5">
                              <FolderKanban className="h-3 w-3 shrink-0" />
                              <span className="truncate">{s.proyecto}</span>
                            </div>
                          )}
                          <h4 className="font-medium text-sm leading-snug">{s.titulo}</h4>
                        </div>
                        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                          {noteCounts[s.id] ? (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 px-1">
                              <StickyNote className="h-3 w-3" />{noteCounts[s.id]}
                            </span>
                          ) : null}
                          <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-6 w-6" title="Abrir" onClick={() => openCard(s.id)}>
                              <Maximize2 className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(s)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {!isForeign && (
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-400" onClick={() => remove(s.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {s.descripcion && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{s.descripcion}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <Badge className={cn("border", PRIORIDAD_COLOR[s.prioridad])} variant="outline">
                          {PRIORIDAD_LABEL[s.prioridad]}
                        </Badge>
                        {isForeign && ctx && (
                          <Badge variant="outline" className="gap-1 border-indigo-300 text-indigo-600" title={`Te agregaron como colaborador${ctx.boardName ? ` en el tablero "${ctx.boardName}"` : ''}`}>
                            <Layout className="h-2.5 w-2.5" />
                            {ctx.boardName ? ctx.boardName : `De ${ctx.ownerName}`}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
                        {responsableLabel(s) && (
                          <span className="flex items-center gap-1 truncate max-w-[140px]"><User className="h-3 w-3 shrink-0" />{responsableLabel(s)}</span>
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
        </TabsContent>

        <TabsContent value="custom" className="mt-0 outline-none">
          {selectedBoardId ? (
            (() => {
              const board = boards.find(b => b.id === selectedBoardId);
              return board ? (
                <CustomBoardView
                  board={board}
                  onBack={() => setSelectedBoardId(null)}
                  onOpenTask={openCard}
                  refreshKey={customBoardRefresh}
                />
              ) : (
                <div className="text-center text-slate-400 py-12">
                  {loadingBoards ? 'Cargando tablero...' : 'No tienes acceso a este tablero o ya no existe.'}
                </div>
              );
            })()
          ) : (
            <BoardList
              boards={boards.filter((b) => b.tipo !== 'reunion_operativa')}
              onSelectBoard={setSelectedBoardId}
              onRefresh={loadBoards}
            />
          )}
        </TabsContent>

        <TabsContent value="reunion_operativa" className="mt-0 outline-none">
          {(() => {
            const reunionBoards = boards.filter((b) => b.tipo === 'reunion_operativa');
            if (selectedReunionBoardId) {
              const board = reunionBoards.find((b) => b.id === selectedReunionBoardId);
              return board ? (
                <ReunionOperativaView board={board} onBack={() => setSelectedReunionBoardId(null)} onOpenTask={openCard} />
              ) : (
                <div className="text-center text-slate-400 py-12">
                  {loadingBoards ? 'Cargando tablero...' : 'No tienes acceso a este tablero o ya no existe.'}
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <Card
                  className="border-dashed border-2 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer transition-all hover:border-indigo-300 group flex flex-col items-center justify-center py-10"
                  onClick={() => setReunionCreateOpen(true)}
                >
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="h-6 w-6 text-indigo-600" />
                  </div>
                  <span className="mt-4 font-medium text-slate-600">Crear Reunión Operativa</span>
                </Card>
                {reunionBoards.map((board) => (
                  <Card
                    key={board.id}
                    className="group hover:shadow-md transition-all cursor-pointer border-slate-200 p-4"
                    onClick={() => setSelectedReunionBoardId(board.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-indigo-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {board.silo ? (SILO_LABELS[board.silo as SiloType] ?? board.silo) : 'Sin silo'}
                        </span>
                      </div>
                      {user?.id === board.created_by && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onClick={async () => {
                                setMembersDialogBoard(board);
                                setMembersDialogNewIds([]);
                                const { data } = await supabase.from('seguimiento_board_miembros' as any).select('member_user_id').eq('board_id', board.id);
                                setMembersDialogExisting(((data as any[]) ?? []).map((m) => m.member_user_id));
                              }}
                            >
                              <Users className="h-4 w-4 mr-2" /> Agregar miembros
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-rose-600"
                              onClick={async () => {
                                if (!confirm(`¿Eliminar el tablero "${board.nombre}" y todo su contenido?`)) return;
                                const { error } = await supabase.from('seguimiento_boards').delete().eq('id', board.id);
                                if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
                                loadBoards();
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{board.nombre}</div>
                  </Card>
                ))}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Crear Reunión Operativa */}
      <Dialog open={reunionCreateOpen} onOpenChange={setReunionCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Reunión Operativa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Silo *</Label>
              <Select value={reunionSilo} onValueChange={(v) => setReunionSilo(v as SiloType)}>
                <SelectTrigger><SelectValue placeholder="Selecciona un silo" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SILO_LABELS) as SiloType[]).filter((s) => s !== 'sinsilo').map((s) => (
                    <SelectItem key={s} value={s}>{SILO_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Integrantes</Label>
              <ResponsableMultiSelect directory={directory} value={reunionMemberIds} onChange={setReunionMemberIds} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReunionCreateOpen(false)} disabled={creatingReunionBoard}>Cancelar</Button>
            <Button
              disabled={!reunionSilo || creatingReunionBoard || !user}
              onClick={async () => {
                if (!user || !reunionSilo) return;
                setCreatingReunionBoard(true);
                try {
                  const { board } = await crearTableroReunionOperativa(user.id, reunionSilo, reunionMemberIds);
                  await loadBoards();
                  setSelectedReunionBoardId(board.id);
                  setReunionCreateOpen(false);
                  setReunionSilo('');
                  setReunionMemberIds([]);
                } catch (e) {
                  toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
                } finally {
                  setCreatingReunionBoard(false);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {creatingReunionBoard ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agregar miembros a Reunión Operativa */}
      <Dialog open={!!membersDialogBoard} onOpenChange={(o) => !o && setMembersDialogBoard(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Miembros — {membersDialogBoard?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {membersDialogExisting.length > 0 && (
              <div>
                <Label className="text-xs text-slate-500">Ya son miembros</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {membersDialogExisting.map((id) => (
                    <Badge key={id} variant="secondary">
                      {directory.find((u) => u.user_id === id)?.full_name || 'Usuario'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>Agregar integrantes</Label>
              <ResponsableMultiSelect
                directory={directory.filter((u) => !membersDialogExisting.includes(u.user_id) && u.user_id !== user?.id)}
                value={membersDialogNewIds}
                onChange={setMembersDialogNewIds}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersDialogBoard(null)} disabled={addingMembers}>Cerrar</Button>
            <Button
              disabled={membersDialogNewIds.length === 0 || addingMembers || !user || !membersDialogBoard}
              onClick={async () => {
                if (!user || !membersDialogBoard) return;
                setAddingMembers(true);
                try {
                  await agregarMiembrosTablero(membersDialogBoard.id, membersDialogBoard.nombre, user.id, membersDialogNewIds);
                  toast({ title: 'Miembros agregados', description: 'Ya pueden ver el tablero en su sesión.' });
                  setMembersDialogExisting((curr) => [...curr, ...membersDialogNewIds]);
                  setMembersDialogNewIds([]);
                } catch (e) {
                  toast({ title: 'Error', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
                } finally {
                  setAddingMembers(false);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {addingMembers ? 'Agregando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label>Nombre del proyecto</Label>
              <Input value={form.proyecto} onChange={e => setForm({ ...form, proyecto: e.target.value })} placeholder="Nombre del proyecto" />
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
            <div>
              <Label>Fecha límite</Label>
              <Input type="date" value={form.fecha_limite} onChange={e => setForm({ ...form, fecha_limite: e.target.value })} />
            </div>
            <div>
              <Label>Responsable(s)</Label>
              <ResponsableMultiSelect directory={directory} value={formResponsables} onChange={setFormResponsables} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notas {notesFor && <span className="text-muted-foreground font-normal">— {notesFor.titulo}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="Escribe una nota..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={2}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    addNote();
                  }
                }}
              />
              <Button onClick={addNote} disabled={!newNote.trim()} size="icon" className="h-auto">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {notesLoading ? (
                <div className="text-center text-sm text-muted-foreground py-6">Cargando...</div>
              ) : notes.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6 border border-dashed rounded-md">
                  Sin notas todavía
                </div>
              ) : (
                notes.map(n => (
                  <Card key={n.id} className="p-3 group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm whitespace-pre-wrap flex-1">{n.contenido}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteNote(n.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {format(new Date(n.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cardId && (
        <SeguimientoCardDialog
          seguimientoId={cardId}
          open={cardOpen}
          onOpenChange={setCardOpen}
          onChanged={handleCardChanged}
        />
      )}
    </div>
  );
}
