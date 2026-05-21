import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string | null;
  link: string | null;
  leida: boolean;
  created_at: string;
  tipo: string;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notificacion[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notificaciones' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setItems((data as any[] as Notificacion[]) || []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unread = items.filter(i => !i.leida).length;

  const markRead = async (id: string) => {
    await supabase.from('notificaciones' as any).update({ leida: true }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, leida: true } : i));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notificaciones' as any).update({ leida: true }).eq('user_id', user.id).eq('leida', false);
    setItems(prev => prev.map(i => ({ ...i, leida: true })));
  };

  const remove = async (id: string) => {
    await supabase.from('notificaciones' as any).delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const onClick = async (n: Notificacion) => {
    if (!n.leida) await markRead(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center bg-rose-500 hover:bg-rose-500 text-white border-0">
              {unread > 9 ? '9+' : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
              <Check className="h-3 w-3" /> Marcar todo
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Sin notificaciones</div>
          ) : (
            <div className="divide-y">
              {items.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    "p-3 hover:bg-accent/50 group cursor-pointer transition-colors",
                    !n.leida && "bg-blue-50/60 dark:bg-blue-950/20"
                  )}
                  onClick={() => onClick(n)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                        <p className="text-sm font-medium truncate">{n.titulo}</p>
                      </div>
                      {n.mensaje && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensaje}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-rose-500"
                      onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
