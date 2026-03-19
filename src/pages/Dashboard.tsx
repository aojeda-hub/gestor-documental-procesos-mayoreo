import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import type { ReviewAlert, Document } from '@/types/database';
import { DOC_TYPE_LABELS, SILO_LABELS } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalIndicators, setTotalIndicators] = useState(0);
  const [alerts, setAlerts] = useState<(ReviewAlert & { documents: Document })[]>([]);
  const [docsWithCurrent, setDocsWithCurrent] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [docsRes, indRes, alertsRes, versionsRes] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('indicators').select('id', { count: 'exact', head: true }),
        supabase.from('review_alerts').select('*, documents(*)').eq('acknowledged', false).order('due_date'),
        supabase.from('document_versions').select('document_id').eq('is_current', true),
      ]);
      setTotalDocs(docsRes.count || 0);
      setTotalIndicators(indRes.count || 0);
      setAlerts((alertsRes.data || []) as unknown as (ReviewAlert & { documents: Document })[]);
      setDocsWithCurrent(new Set((versionsRes.data || []).map((v: any) => v.document_id)).size);
    };
    load();
  }, []);

  const vigentePct = totalDocs > 0 ? Math.round((docsWithCurrent / totalDocs) * 100) : 0;
  const pendingAlerts = alerts.filter(a => new Date(a.due_date) <= new Date());
  const upcomingAlerts = alerts.filter(a => new Date(a.due_date) > new Date());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Salud Documental</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">% Vigentes</CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vigentePct}%</div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${vigentePct}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{pendingAlerts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Indicadores</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIndicators}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Alertas de Revisión
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay alertas pendientes.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{alert.documents?.title || 'Documento'}</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.documents?.silo ? SILO_LABELS[alert.documents.silo as keyof typeof SILO_LABELS] : ''} ·{' '}
                      {alert.documents?.doc_type ? DOC_TYPE_LABELS[alert.documents.doc_type as keyof typeof DOC_TYPE_LABELS] : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={new Date(alert.due_date) <= new Date() ? 'destructive' : 'secondary'}>
                      {format(new Date(alert.due_date), 'dd MMM yyyy', { locale: es })}
                    </Badge>
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
