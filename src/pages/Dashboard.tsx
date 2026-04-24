import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, BarChart3, Users, FolderOpen } from 'lucide-react';
import { SILO_LABELS } from '@/types/database';
import type { SiloType } from '@/types/database';

interface SiloStat {
  silo: SiloType;
  count: number;
}

export default function Dashboard() {
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalIndicators, setTotalIndicators] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [siloStats, setSiloStats] = useState<SiloStat[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const [docsRes, indRes, usersRes, docsData] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('indicators').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('silo'),
      ]);
      setTotalDocs(docsRes.count || 0);
      setTotalIndicators(indRes.count || 0);
      setTotalUsers(usersRes.count || 0);

      // Group by silo
      const map = new Map<SiloType, number>();
      (docsData.data || []).forEach((d: any) => {
        map.set(d.silo, (map.get(d.silo) || 0) + 1);
      });
      const stats: SiloStat[] = Array.from(map.entries())
        .map(([silo, count]) => ({ silo, count }))
        .sort((a, b) => b.count - a.count);
      setSiloStats(stats);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel de Inicio</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Indicadores</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIndicators}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Docs per silo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-5 w-5 text-primary" />
            Documentos por Silo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {siloStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin documentos aún.</p>
          ) : (
            <div className="space-y-3">
              {siloStats.map(s => (
                <div 
                  key={s.silo} 
                  className="flex items-center justify-between group cursor-pointer hover:bg-accent/30 p-2 -mx-2 rounded-md transition-colors"
                  onClick={() => navigate(`/documentos?silo=${s.silo}`)}
                >
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">{SILO_LABELS[s.silo]}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${totalDocs > 0 ? (s.count / totalDocs) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold tabular-nums w-8 text-right group-hover:text-primary transition-colors">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
