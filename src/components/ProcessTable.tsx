import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SILO_LABELS, DOC_TYPE_LABELS } from '@/types/database';
import type { Document } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ProcessTable() {
  const [docs, setDocs] = useState<Document[]>([]);

  useEffect(() => {
    supabase.from('documents').select('*').order('updated_at', { ascending: false }).limit(10)
      .then(({ data }) => setDocs((data || []) as Document[]));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documentos Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay documentos aún.</p>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {SILO_LABELS[doc.silo as keyof typeof SILO_LABELS]} · {DOC_TYPE_LABELS[doc.doc_type as keyof typeof DOC_TYPE_LABELS]}
                  </p>
                </div>
                <Badge variant="secondary">
                  {format(new Date(doc.updated_at), 'dd MMM yyyy', { locale: es })}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
