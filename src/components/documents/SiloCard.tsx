import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, FileText, Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DOC_TYPE_LABELS } from '@/types/database';
import type { Document, DocType, SiloType } from '@/types/database';
import { format } from 'date-fns';

const SILO_ICONS: Record<SiloType, string> = {
  compras: '🛒',
  logistica: '🚚',
  ventas: '💰',
  personal: '👥',
  control: '📊',
  mercadeo: '📢',
  sistemas: '💻',
};

interface SiloCardProps {
  silo: SiloType;
  siloLabel: string;
  docs: Document[];
  canEdit: boolean;
  onOpenDoc: (doc: Document) => void;
  onCreateDoc: (silo: SiloType, docType: DocType) => void;
}

export default function SiloCard({ silo, siloLabel, docs, canEdit, onOpenDoc, onCreateDoc }: SiloCardProps) {
  const [expandedType, setExpandedType] = useState<string | null>(null);

  // Group docs by doc_type
  const grouped = docs.reduce<Record<string, Document[]>>((acc, doc) => {
    if (!acc[doc.doc_type]) acc[doc.doc_type] = [];
    acc[doc.doc_type].push(doc);
    return acc;
  }, {});

  // All doc types (show all, even empty ones)
  const allDocTypes = Object.keys(DOC_TYPE_LABELS) as DocType[];

  return (
    <Card className="overflow-hidden border-border/60 hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-xl">{SILO_ICONS[silo]}</span>
          {siloLabel}
          <Badge variant="secondary" className="ml-auto text-xs">{docs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {allDocTypes.map(dt => {
          const typeDocs = grouped[dt] || [];
          const isOpen = expandedType === dt;

          return (
            <Collapsible key={dt} open={isOpen} onOpenChange={() => setExpandedType(isOpen ? null : dt)}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent/50 transition-colors">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <FileText className="h-3.5 w-3.5 text-primary/70" />
                <span className="flex-1 text-left font-medium">{DOC_TYPE_LABELS[dt]}</span>
                {typeDocs.length > 0 && (
                  <Badge variant="outline" className="h-5 text-[10px] px-1.5">{typeDocs.length}</Badge>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-6 mr-1 mb-2 space-y-1">
                  {typeDocs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 pl-2">Sin documentos</p>
                  ) : (
                    typeDocs.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => onOpenDoc(doc)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/40 transition-colors text-left group"
                      >
                        <span className="flex-1 truncate group-hover:text-primary">{doc.title}</span>
                        {doc.confidential && <Lock className="h-3 w-3 text-destructive/70" />}
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(new Date(doc.updated_at), 'dd/MM/yy')}
                        </span>
                      </button>
                    ))
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-7 text-primary/80 hover:text-primary"
                      onClick={() => onCreateDoc(silo, dt)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Agregar {DOC_TYPE_LABELS[dt]}
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
