import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, BarChart3, Users, FolderOpen, ArrowUpRight, Plus,
  TrendingUp, Network, FolderKanban, Activity
} from 'lucide-react';
import { SILO_LABELS } from '@/types/database';
import type { SiloType } from '@/types/database';

interface SiloStat {
  silo: SiloType;
  count: number;
}

interface RecentDoc {
  id: string;
  title: string;
  silo: SiloType;
  updated_at: string;
}

export default function Dashboard() {
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalIndicators, setTotalIndicators] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [siloStats, setSiloStats] = useState<SiloStat[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const [docsRes, indRes, usersRes, projRes, docsData, recentRes] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('indicators').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('projects' as any).select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('silo'),
        supabase.from('documents').select('id, title, silo, updated_at').order('updated_at', { ascending: false }).limit(5),
      ]);
      setTotalDocs(docsRes.count || 0);
      setTotalIndicators(indRes.count || 0);
      setTotalUsers(usersRes.count || 0);
      setTotalProjects(projRes.count || 0);

      const map = new Map<SiloType, number>();
      (docsData.data || []).forEach((d: any) => {
        map.set(d.silo, (map.get(d.silo) || 0) + 1);
      });
      const stats: SiloStat[] = Array.from(map.entries())
        .map(([silo, count]) => ({ silo, count }))
        .sort((a, b) => b.count - a.count);
      setSiloStats(stats);
      setRecentDocs((recentRes.data || []) as RecentDoc[]);
    };
    load();
  }, []);

  const siloIcons: Record<string, typeof FileText> = {
    documentos: FileText, indicadores: BarChart3, usuarios: Users,
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return ''; }
  };

  const maxSilo = Math.max(...siloStats.map(s => s.count), 1);
  const top4Silos = siloStats.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inicio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planifica, prioriza y gestiona tus procesos con facilidad.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/documentos')} className="gap-2 rounded-full bg-[hsl(220_70%_25%)] hover:bg-[hsl(220_70%_30%)] text-white">
            <Plus className="h-4 w-4" /> Nuevo Documento
          </Button>
          <Button variant="outline" onClick={() => navigate('/proyectos')} className="rounded-full border-2">
            Ver Proyectos
          </Button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Featured Card */}
        <button
          onClick={() => navigate('/documentos')}
          className="text-left relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(220_60%_15%)] via-[hsl(220_70%_22%)] to-[hsl(220_80%_30%)] p-5 text-white shadow-lg transition-transform hover:scale-[1.02] group"
        >
          <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <p className="text-sm font-semibold">Total Documentos</p>
          </div>
          <p className="text-5xl font-bold mt-6">{totalDocs}</p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-xs">
            <TrendingUp className="h-3 w-3" />
            Sistema centralizado
          </div>
        </button>

        {/* Standard Cards */}
        <StatCard
          label="Indicadores"
          value={totalIndicators}
          icon={BarChart3}
          subtitle="Métricas activas"
          onClick={() => navigate('/indicadores')}
        />
        <StatCard
          label="Proyectos"
          value={totalProjects}
          icon={FolderKanban}
          subtitle="En seguimiento"
          onClick={() => navigate('/proyectos')}
        />
        <StatCard
          label="Usuarios"
          value={totalUsers}
          icon={Users}
          subtitle="Equipo activo"
          onClick={() => navigate('/usuarios')}
        />
      </div>

      {/* Middle Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity / Silo bars */}
        <Card className="lg:col-span-2 rounded-2xl p-5 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg">Distribución por Silo</h3>
              <p className="text-xs text-muted-foreground">Documentos clasificados por área</p>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          {top4Silos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Sin documentos aún.</p>
          ) : (
            <div className="flex items-end justify-around gap-3 h-48 px-2">
              {top4Silos.map(s => {
                const heightPct = (s.count / maxSilo) * 100;
                return (
                  <button
                    key={s.silo}
                    onClick={() => navigate(`/documentos?silo=${s.silo}`)}
                    className="flex-1 flex flex-col items-center gap-2 group max-w-[100px]"
                  >
                    <span className="text-xs font-bold text-foreground">{s.count}</span>
                    <div
                      className="w-full rounded-2xl bg-gradient-to-t from-[hsl(220_70%_22%)] to-[hsl(220_70%_45%)] transition-all group-hover:from-[hsl(220_75%_28%)] group-hover:to-[hsl(220_75%_55%)] min-h-[20px]"
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                    />
                    <span className="text-[11px] text-muted-foreground font-medium truncate max-w-full">
                      {SILO_LABELS[s.silo]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Quick Access / Reminder */}
        <Card className="rounded-2xl p-5 border-0 shadow-sm bg-gradient-to-br from-[hsl(220_30%_12%)] to-[hsl(220_40%_18%)] text-white">
          <p className="text-xs text-white/60 font-medium">Acceso Rápido</p>
          <h3 className="font-bold text-xl mt-1">Mapa BPA</h3>
          <p className="text-sm text-white/70 mt-2">
            Visualiza la red de procesos e interacciones del negocio.
          </p>
          <Button
            onClick={() => navigate('/bpa')}
            className="mt-6 w-full rounded-full bg-white text-[hsl(220_60%_15%)] hover:bg-white/90 gap-2"
          >
            <Network className="h-4 w-4" />
            Ir al BPA
          </Button>
        </Card>
      </div>

      {/* Bottom Row: Silos full list + Recent docs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl p-5 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Documentos por Silo
            </h3>
          </div>
          {siloStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin datos.</p>
          ) : (
            <div className="space-y-2.5">
              {siloStats.map(s => (
                <button
                  key={s.silo}
                  onClick={() => navigate(`/documentos?silo=${s.silo}`)}
                  className="w-full flex items-center justify-between group hover:bg-accent/5 p-2 -mx-2 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium group-hover:text-primary">{SILO_LABELS[s.silo]}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[hsl(220_70%_30%)] to-[hsl(220_70%_50%)]"
                        style={{ width: `${totalDocs > 0 ? (s.count / totalDocs) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold tabular-nums w-8 text-right">{s.count}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="rounded-2xl p-5 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Documentos Recientes</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/documentos')} className="h-7 text-xs gap-1">
              Ver todos <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>
          {recentDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin documentos.</p>
          ) : (
            <div className="space-y-2">
              {recentDocs.map(d => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/documentos?silo=${d.silo}`)}
                  className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-accent/5 transition-colors text-left"
                >
                  <div className="h-9 w-9 rounded-lg bg-[hsl(220_70%_95%)] flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-[hsl(220_70%_30%)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground">Actualizado: {formatDate(d.updated_at)}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{SILO_LABELS[d.silo]}</Badge>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, subtitle, onClick,
}: {
  label: string; value: number; icon: typeof FileText; subtitle: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left relative overflow-hidden rounded-2xl bg-card p-5 shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 group"
    >
      <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-[hsl(220_70%_22%)] group-hover:text-white transition-colors">
        <ArrowUpRight className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <p className="text-5xl font-bold mt-6 text-foreground">{value}</p>
      <p className="mt-4 text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}
