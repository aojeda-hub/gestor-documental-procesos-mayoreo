import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Lock, Search } from 'lucide-react';
import { DOC_TYPE_LABELS } from '@/types/database';
import type { Document, DocType, SiloType } from '@/types/database';
import { format } from 'date-fns';

interface SiloDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  silo: SiloType;
  siloLabel: string;
  docs: Document[];
  canEdit: boolean;
  onOpenDoc: (doc: Document) => void;
  onCreateDoc: (silo: SiloType, docType: DocType) => void;
}

export default function SiloDetailDialog({ open, onOpenChange, silo, siloLabel, docs, canEdit, onOpenDoc, onCreateDoc }: SiloDetailDialogProps) {
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<DocType | null>(null);

  const allDocTypes = Object.keys(DOC_TYPE_LABELS) as DocType[];

  // Doc types that have documents
  const typesWithDocs = useMemo(() => {
    const set = new Set(docs.map(d => d.doc_type));
    return allDocTypes.filter(dt => set.has(dt));
  }, [docs]);

  const filtered = useMemo(() => {
    let result = docs;
    if (activeType) result = result.filter(d => d.doc_type === activeType);
    if (search) result = result.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [docs, activeType, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">{siloLabel}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeType === null ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveType(null)}
          >
            Todos ({docs.length})
          </Button>
          {typesWithDocs.map(dt => {
            const count = docs.filter(d => d.doc_type === dt).length;
            return (
              <Button
                key={dt}
                variant={activeType === dt ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveType(activeType === dt ? null : dt)}
              >
                {DOC_TYPE_LABELS[dt]} ({count})
              </Button>
            );
          })}
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin documentos encontrados</p>
          ) : (
            filtered.map(doc => (
              <button
                key={doc.id}
                onClick={() => onOpenDoc(doc)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors text-left group border border-transparent hover:border-border/60"
              >
                <FileText className="h-4 w-4 text-primary/70 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="block truncate font-medium group-hover:text-primary">{doc.title}</span>
                  <span className="text-xs text-muted-foreground">{DOC_TYPE_LABELS[doc.doc_type]}</span>
                </div>
                {doc.confidential && <Lock className="h-3.5 w-3.5 text-destructive/70 shrink-0" />}
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(doc.updated_at), 'dd/MM/yy')}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Add button */}
        {canEdit && (
          <div className="pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onCreateDoc(silo, activeType || 'procedimiento')}
            >
              <Plus className="h-4 w-4 mr-2" /> Nuevo Documento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
