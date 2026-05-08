import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, BookOpen, Sparkles, Building2, GitBranch, FolderKanban, CalendarDays, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ICONS: Record<string, typeof BookOpen> = {
  BookOpen, Building2, GitBranch, FolderKanban, CalendarDays, Globe,
};

interface DevApp {
  title: string;
  description: string;
  url: string;
  icon: typeof BookOpen;
}

export default function Desarrollos() {
  const [apps, setApps] = useState<DevApp[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('desarrollos')
        .select('nombre, url, descripcion, icono, created_at')
        .order('created_at', { ascending: true });
      if (data) {
        setApps(
          data.map(d => ({
            title: d.nombre,
            description: d.descripcion ?? '',
            url: d.url,
            icon: ICONS[d.icono ?? 'Globe'] ?? Globe,
          }))
        );
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Desarrollos a la medida</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aplicaciones y recursos complementarios desarrollados para Mayoreo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map(app => (
          <button
            key={app.url}
            onClick={() => window.open(app.url, '_blank')}
            className="text-left group"
          >
            <Card className="rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 h-full">
              <div className="flex items-start justify-between">
                <div className="h-11 w-11 rounded-xl bg-[hsl(195_50%_20%)] flex items-center justify-center">
                  <app.icon className="h-5 w-5 text-white" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-semibold mt-4 group-hover:text-primary transition-colors">{app.title}</h3>
              {app.description && <p className="text-xs text-muted-foreground mt-1">{app.description}</p>}
            </Card>
          </button>
        ))}

        <Card className="rounded-2xl p-5 border border-dashed shadow-none flex items-center justify-center text-center text-muted-foreground">
          <div>
            <Sparkles className="h-5 w-5 mx-auto mb-2 opacity-60" />
            <p className="text-xs">Próximamente más desarrollos</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
