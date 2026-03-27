import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Plus, Lock, Search, MoreVertical, Eye, Pencil, FileDown, FileType2, Trash2 } from 'lucide-react';
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
  onViewDoc: (doc: Document) => void;
  onEditDoc: (doc: Document) => void;
  onDeleteDoc: (doc: Document) => void;
  onDownload: (doc: Document, format: 'pdf' | 'word') => void;
  onCreateDoc: (silo: SiloType, docType: DocType) => void;
}

export default function SiloDetailDialog({
  open, onOpenChange, silo, siloLabel, docs, canEdit,
  onViewDoc, onEditDoc, onDeleteDoc, onDownload, onCreateDoc,
}: SiloDetailDialogProps) {
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
              <div
                key={doc.id}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors border border-transparent hover:border-border/60 group"
              >
                <FileText className="h-4 w-4 text-primary/70 shrink-0" />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewDoc(doc)}>
                  <span className="block truncate font-medium group-hover:text-primary">{doc.title}</span>
                  <span className="text-xs text-muted-foreground">{DOC_TYPE_LABELS[doc.doc_type]}</span>
                </div>
                {doc.confidential && <Lock className="h-3.5 w-3.5 text-destructive/70 shrink-0" />}
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(doc.updated_at), 'dd/MM/yy')}
                </span>

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onViewDoc(doc)}>
                      <Eye className="h-4 w-4 mr-2" /> Ver
                    </DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEditDoc(doc)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onDownload(doc, 'pdf')}>
                      <FileDown className="h-4 w-4 mr-2" /> Descargar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDownload(doc, 'word')}>
                      <FileType2 className="h-4 w-4 mr-2" /> Descargar Word
                    </DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onDeleteDoc(doc)} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
