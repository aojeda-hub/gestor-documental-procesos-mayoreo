import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MoreVertical, Trash2, Users, X, Check, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { SeguimientoBoard } from '@/types/database';

interface BoardListProps {
  boards: SeguimientoBoard[];
  onSelectBoard: (boardId: string) => void;
  onRefresh: () => void;
}

export function BoardList({ boards, onSelectBoard, onRefresh }: BoardListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [loading, setLoading] = useState(false);

  const [membersBoard, setMembersBoard] = useState<SeguimientoBoard | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [memberQuery, setMemberQuery] = useState('');

  const handleCreate = async () => {
    if (!newBoardName.trim() || !user) return;
    setLoading(true);
    const { error } = await supabase.from('seguimiento_boards').insert({
      nombre: newBoardName,
      created_by: user.id
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Tablero creado' });
      setNewBoardName('');
      setShowCreate(false);
      onRefresh();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este tablero y todas sus columnas y tareas?')) return;
    const { error } = await supabase.from('seguimiento_boards').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else onRefresh();
  };

  const openMembers = async (board: SeguimientoBoard, e: React.MouseEvent) => {
    e.stopPropagation();
    setMembersBoard(board);
    const [{ data: prof }, { data: mem }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email').order('full_name'),
      supabase.from('seguimiento_board_miembros' as any).select('*').eq('board_id', board.id),
    ]);
    setProfiles(prof || []);
    setBoardMembers((mem as any[]) || []);
  };

  const toggleMember = async (userId: string) => {
    if (!membersBoard) return;
    const existing = boardMembers.find(m => m.member_user_id === userId);
    if (existing) {
      const { error } = await supabase.from('seguimiento_board_miembros' as any).delete().eq('id', existing.id);
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setBoardMembers(prev => prev.filter(m => m.id !== existing.id));
    } else {
      const { data, error } = await supabase.from('seguimiento_board_miembros' as any)
        .insert({ board_id: membersBoard.id, member_user_id: userId })
        .select().single();
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setBoardMembers(prev => [...prev, data]);
      // Notificación
      if (user && userId !== user.id) {
        await supabase.from('notificaciones' as any).insert({
          user_id: userId,
          created_by: user.id,
          tipo: 'seguimiento_miembro',
          titulo: 'Tablero compartido contigo',
          mensaje: `Fuiste agregado al tablero "${membersBoard.nombre}" para colaborar.`,
          link: '/seguimientos',
          metadata: { board_id: membersBoard.id },
        });
        toast({ title: 'Tablero compartido', description: 'Se notificó al miembro.' });
      }
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const q = memberQuery.toLowerCase();
    return !q || (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q);
  });

  const isOwner = (board: SeguimientoBoard) => user?.id === board.created_by;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <Card
        className="border-dashed border-2 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer transition-all hover:border-indigo-300 group"
        onClick={() => setShowCreate(true)}
      >
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6 text-indigo-600" />
          </div>
          <span className="mt-4 font-medium text-slate-600">Nuevo Tablero</span>
        </CardContent>
      </Card>

      {boards.map(board => (
        <Card
          key={board.id}
          className="group hover:shadow-md transition-all cursor-pointer border-slate-200"
          onClick={() => onSelectBoard(board.id)}
        >
          <CardHeader className="p-4 flex flex-row items-start justify-between space-y-0">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {isOwner(board) ? 'Personalizado' : 'Compartido contigo'}
                </span>
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {board.nombre}
              </CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwner(board) && (
                  <DropdownMenuItem onClick={(e) => openMembers(board, e as any)}>
                    <Share2 className="h-4 w-4 mr-2" /> Compartir tablero
                  </DropdownMenuItem>
                )}
                {isOwner(board) && (
                  <DropdownMenuItem onClick={(e) => openMembers(board, e as any)}>
                    <Users className="h-4 w-4 mr-2" /> Gestionar miembros
                  </DropdownMenuItem>
                )}
                {isOwner(board) && (
                  <DropdownMenuItem onClick={(e) => handleDelete(board.id, e as any)} className="text-rose-600">
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center -space-x-2">
                <div className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                  <Users className="h-3 w-3 text-slate-400" />
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-indigo-600 font-semibold p-0 h-auto hover:bg-transparent">
                Ver tablero →
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Crear */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Tablero</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Nombre del Tablero</label>
            <Input
              placeholder="Ej: Proyecto Lanzamiento, Tareas Equipo..."
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading ? 'Creando...' : 'Crear Tablero'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Miembros */}
      <Dialog open={!!membersBoard} onOpenChange={(o) => !o && setMembersBoard(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Miembros — {membersBoard?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {boardMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {boardMembers.map(m => {
                  const p = profiles.find(x => x.user_id === m.member_user_id);
                  return (
                    <Badge key={m.id} variant="secondary" className="gap-1">
                      {p?.full_name || p?.email || m.member_user_id.slice(0, 8)}
                      <button onClick={() => toggleMember(m.member_user_id)} className="hover:opacity-70">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <Input
              placeholder="Buscar usuario..."
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
              {filteredProfiles.filter(p => p.user_id !== user?.id).map(p => {
                const isMember = boardMembers.some(m => m.member_user_id === p.user_id);
                return (
                  <button
                    key={p.user_id}
                    onClick={() => toggleMember(p.user_id)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent text-left text-sm"
                  >
                    <div>
                      <div className="font-medium">{p.full_name || '(sin nombre)'}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </div>
                    {isMember && <Check className="h-4 w-4 text-emerald-600" />}
                  </button>
                );
              })}
              {filteredProfiles.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersBoard(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
