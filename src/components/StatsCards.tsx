import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, BarChart3, CheckCircle, AlertTriangle } from 'lucide-react';

export default function StatsCards() {
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalIndicators, setTotalIndicators] = useState(0);
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [currentVersions, setCurrentVersions] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [docs, inds, alerts, versions] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('indicators').select('id', { count: 'exact', head: true }),
        supabase.from('review_alerts').select('id', { count: 'exact', head: true }).eq('acknowledged', false),
        supabase.from('document_versions').select('document_id').eq('is_current', true),
      ]);
      setTotalDocs(docs.count || 0);
      setTotalIndicators(inds.count || 0);
      setPendingAlerts(alerts.count || 0);
      setCurrentVersions(new Set((versions.data || []).map(v => v.document_id)).size);
    };
    load();
  }, []);

  const stats = [
    { label: 'Documentos', value: totalDocs, icon: FileText, color: 'text-primary' },
    { label: 'Vigentes', value: currentVersions, icon: CheckCircle, color: 'text-success' },
    { label: 'Alertas', value: pendingAlerts, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Indicadores', value: totalIndicators, icon: BarChart3, color: 'text-accent-foreground' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(s => (
        <Card key={s.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            <s.icon className={`h-4 w-4 ${s.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
