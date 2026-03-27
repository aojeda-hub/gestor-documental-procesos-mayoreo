import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [activeType, setActiveType] = useState<string>('all');

  const allDocTypes = Object.keys(DOC_TYPE_LABELS) as DocType[];

  const filtered = useMemo(() => {
    let result = docs;
    if (activeType !== 'all') result = result.filter(d => d.doc_type === activeType);
    if (search) result = result.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [docs, activeType, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">{siloLabel}</DialogTitle>
        </DialogHeader>

        {/* Search + Type filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={activeType} onValueChange={setActiveType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipo de documento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({docs.length})</SelectItem>
              {allDocTypes.map(dt => {
                const count = docs.filter(d => d.doc_type === dt).length;
                return (
                  <SelectItem key={dt} value={dt}>
                    {DOC_TYPE_LABELS[dt]} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
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
              onClick={() => onCreateDoc(silo, activeType !== 'all' ? activeType as DocType : 'procedimiento')}
            >
              <Plus className="h-4 w-4 mr-2" /> Nuevo Documento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
