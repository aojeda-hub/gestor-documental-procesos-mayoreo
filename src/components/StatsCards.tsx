import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, BarChart3, CheckCircle, AlertTriangle } from 'lucide-react';

export default function StatsCards() {
  const { profile, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const isRMPersonal = hasRole('responsable_metodos') && profile?.silo === 'personal';

  const [totalDocs, setTotalDocs] = useState(0);
  const [totalIndicators, setTotalIndicators] = useState(0);
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [currentVersions, setCurrentVersions] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [docs, inds, alerts, versions] = await Promise.all([
        supabase.from('documents').select('id, confidential'),
        supabase.from('indicators').select('id', { count: 'exact', head: true }),
        supabase.from('review_alerts').select('id', { count: 'exact', head: true }).eq('acknowledged', false),
        supabase.from('document_versions').select('document_id, documents(confidential)').eq('is_current', true),
      ]);

      const allowedDocs = (docs.data || []).filter((d: any) => {
        if (d.confidential) {
          return isAdmin || isRMPersonal;
        }
        return true;
      });
      setTotalDocs(allowedDocs.length);
      setTotalIndicators(inds.count || 0);
      setPendingAlerts(alerts.count || 0);

      const allowedVersions = (versions.data || []).filter((v: any) => {
        const docConfidential = (v.documents as any)?.confidential;
        if (docConfidential) {
          return isAdmin || isRMPersonal;
        }
        return true;
      });
      setCurrentVersions(new Set(allowedVersions.map(v => v.document_id)).size);
    };
    load();
  }, [isAdmin, isRMPersonal]);

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
