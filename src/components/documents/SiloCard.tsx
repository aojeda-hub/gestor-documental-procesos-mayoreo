import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, FileText, Plus, Lock, ShoppingCart, Truck, DollarSign, Users, BarChart3, Megaphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DOC_TYPE_LABELS } from '@/types/database';
import type { Document, DocType, SiloType } from '@/types/database';
import { format } from 'date-fns';

const SILO_CONFIG: Record<SiloType, { icon: typeof ShoppingCart; description: string }> = {
  compras: { icon: ShoppingCart, description: 'Gestione documentos de adquisiciones, órdenes de compra y proveedores.' },
  logistica: { icon: Truck, description: 'Documentación de transporte, almacén e inventarios.' },
  ventas: { icon: DollarSign, description: 'Procesos comerciales, cotizaciones y facturación.' },
  personal: { icon: Users, description: 'Gestión de personal, captación, desarrollo y estructura organizacional.' },
  control: { icon: BarChart3, description: 'Control de crédito, cobranza y auditoría interna.' },
  mercadeo: { icon: Megaphone, description: 'Estrategias de marketing, campañas y análisis de mercado.' },
  sistemas: { icon: Monitor, description: 'Infraestructura tecnológica, soporte y desarrollo de sistemas.' },
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
  const [expanded, setExpanded] = useState(false);

  const grouped = docs.reduce<Record<string, Document[]>>((acc, doc) => {
    if (!acc[doc.doc_type]) acc[doc.doc_type] = [];
    acc[doc.doc_type].push(doc);
    return acc;
  }, {});

  const allDocTypes = Object.keys(DOC_TYPE_LABELS) as DocType[];
  const config = SILO_CONFIG[silo];
  const Icon = config.icon;

  return (
    <Card
      className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={() => !expanded && setExpanded(true)}
    >
      {/* Header area - always visible */}
      <div className="flex flex-col items-center text-center px-6 pt-8 pb-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{siloLabel}</h3>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{config.description}</p>
        {docs.length > 0 && (
          <Badge variant="secondary" className="mt-3 text-xs">{docs.length} documento{docs.length !== 1 ? 's' : ''}</Badge>
        )}
      </div>

      {/* Expandable doc types */}
      {expanded && (
        <CardContent className="space-y-1 pt-0 pb-4 border-t border-border/40 mt-2">
          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" className="text-xs h-6 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setExpanded(false); setExpandedType(null); }}>
              Cerrar
            </Button>
          </div>
          {allDocTypes.map(dt => {
            const typeDocs = grouped[dt] || [];
            const isOpen = expandedType === dt;

            return (
              <Collapsible key={dt} open={isOpen} onOpenChange={() => setExpandedType(isOpen ? null : dt)}>
                <CollapsibleTrigger
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent/50 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
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
                          onClick={(e) => { e.stopPropagation(); onOpenDoc(doc); }}
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
                        onClick={(e) => { e.stopPropagation(); onCreateDoc(silo, dt); }}
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
      )}
    </Card>
  );
}
