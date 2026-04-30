import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  ArrowLeft, Search, FileText, Lock, Plus, ChevronRight,
  MoreVertical, Eye, Pencil, FileDown, FileType2, Trash2,
  ShoppingCart, Truck, DollarSign, Users, BarChart3, Megaphone, Monitor, Cog,
  ExternalLink, CheckSquare, X, FileSpreadsheet,
} from 'lucide-react';
import { DOC_TYPE_LABELS } from '@/types/database';
import type { Document, DocType, SiloType } from '@/types/database';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import DescripcionesCargo from './DescripcionesCargo';

const SILO_ICONS: Record<SiloType, typeof ShoppingCart> = {
  compras: ShoppingCart,
  logistica: Truck,
  ventas: DollarSign,
  personal: Users,
  control: BarChart3,
  mercadeo: Megaphone,
  sistemas: Monitor,
  procesos: Cog,
  sinsilo: FileText,
};

export interface SiloUniverseProps {
  silo: SiloType;
  siloLabel: string;
  docs: Document[];
  canEdit: boolean;
  onBack?: () => void;
  onViewDoc: (doc: Document) => void;
  onEditDoc: (doc: Document) => void;
  onDeleteDoc: (doc: Document) => void;
  onBulkDelete?: (docs: Document[]) => void;
  onDownload: (doc: Document, format: 'pdf' | 'word') => void;
  onCreateDoc: (silo: SiloType, docType: DocType) => void;
  customContent?: React.ReactNode;
}

export default function SiloUniverse({
  silo, siloLabel, docs, canEdit, onBack,
  onViewDoc, onEditDoc, onDeleteDoc, onBulkDelete, onDownload, onCreateDoc, customContent,
}: SiloUniverseProps) {
  const [search, setSearch] = useState('');
  const [expandedType, setExpandedType] = useState<DocType | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'general' | 'cargos'>('general');

  const Icon = SILO_ICONS[silo] || Cog;

  const grouped = useMemo(() => {
    const allTypes = (Object.keys(DOC_TYPE_LABELS) as DocType[])
      .filter(dt => !(silo === 'personal' && dt === 'descripcion_cargo'));
    const filtered = search
      ? docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
      : docs;

    const map: { type: DocType; label: string; docs: Document[] }[] = [];
    for (const dt of allTypes) {
      const typeDocs = filtered.filter(d => d.doc_type === dt);
      if (typeDocs.length > 0 || docs.some(d => d.doc_type === dt)) {
        map.push({ type: dt, label: DOC_TYPE_LABELS[dt], docs: typeDocs });
      }
    }
    return map;
  }, [docs, search, silo]);

  const toggleType = (dt: DocType) => {
    setExpandedType(prev => (prev === dt ? null : dt));
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (typeDocs: Document[]) => {
    const allSelected = typeDocs.every(d => selected.has(d.id));
    setSelected(prev => {
      const next = new Set(prev);
      typeDocs.forEach(d => allSelected ? next.delete(d.id) : next.add(d.id));
      return next;
    });
  };

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  const handleBulkDelete = () => {
    if (onBulkDelete && selected.size > 0) {
      const selectedDocs = docs.filter(d => selected.has(d.id));
      onBulkDelete(selectedDocs);
    }
  };

  const handleExportExcel = (e: React.MouseEvent, type: DocType, label: string, typeDocs: Document[]) => {
    e.stopPropagation();
    if (typeDocs.length === 0) return;
    const rows = typeDocs.map(d => ({
      'Título': d.title,
      'Tipo': label,
      'Silo': siloLabel,
      'Confidencial': d.confidential ? 'Sí' : 'No',
      'Word': d.url_word || '',
      'PDF': d.url_pdf || '',
      'Archivo': d.url_file || '',
      'Drive': d.drive_link || '',
      'Actualizado': format(new Date(d.updated_at), 'dd/MM/yyyy'),
      'Creado': format(new Date(d.created_at), 'dd/MM/yyyy'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 30));
    const safeSilo = siloLabel.replace(/[^a-z0-9]/gi, '_');
    const safeLabel = label.replace(/[^a-z0-9]/gi, '_');
    XLSX.writeFile(wb, `${safeSilo}_${safeLabel}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">{siloLabel}</h1>
            {!customContent && <p className="text-sm text-muted-foreground">{docs.length} documento{docs.length !== 1 ? 's' : ''}</p>}
          </div>
        </div>
        {!customContent && canEdit && !selectMode && (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setSelectMode(true)}>
              <CheckSquare className="h-4 w-4 mr-1.5" /> Seleccionar
            </Button>
            <Button size="sm" onClick={() => onCreateDoc(silo, 'procedimiento')}>
              <Plus className="h-4 w-4 mr-1.5" /> Nuevo
            </Button>
          </div>
        )}
        {selectMode && (
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</Badge>
            <Button size="sm" variant="destructive" disabled={selected.size === 0} onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Eliminar
            </Button>
            <Button size="sm" variant="ghost" onClick={exitSelectMode}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {customContent ? (
        <div>{customContent}</div>
      ) : (
      <>

      {silo === 'personal' && (
        <div className="border-b border-border/40 pb-4 mb-4">
          <div className="flex gap-4 border-b">
            <button 
              className={`pb-2 text-sm font-bold ${activeTab === 'general' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('general')}
            >
              Documentos Generales
            </button>
            <button 
              className={`pb-2 text-sm font-bold ${activeTab === 'cargos' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('cargos')}
            >
              Descripciones de Cargo
            </button>
          </div>
        </div>
      )}

      {activeTab === 'cargos' ? (
        <DescripcionesCargo 
          docs={docs} 
          canEdit={canEdit}
          onViewDoc={onViewDoc}
          onEditDoc={onEditDoc}
          onDeleteDoc={onDeleteDoc}
          onDownload={onDownload}
          onUploadDoc={() => onCreateDoc(silo, 'descripcion_cargo')}
        />
      ) : (
        <>
          {/* Search */}
          <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar documentos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Doc type cards */}
      <div className="space-y-2">
        {grouped.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay documentos en este silo</p>
          </div>
        ) : (
          grouped.map(({ type, label, docs: typeDocs }) => {
            const isExpanded = expandedType === type;
            const totalForType = docs.filter(d => d.doc_type === type).length;

            return (
              <div key={type} className="rounded-lg border border-border/60 bg-card overflow-hidden">
                {/* Type header - clickable */}
                <div
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={() => toggleType(type)}
                >
                  {selectMode && typeDocs.length > 0 && (
                    <Checkbox
                      checked={typeDocs.length > 0 && typeDocs.every(d => selected.has(d.id))}
                      onCheckedChange={() => toggleSelectAll(typeDocs)}
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                  <FileText className="h-4 w-4 text-primary/70" />
                  <span className="font-medium text-sm text-foreground flex-1">{label}</span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {totalForType}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                    title={`Descargar ${label} en Excel`}
                    disabled={totalForType === 0}
                    onClick={(e) => handleExportExcel(e, type, label, docs.filter(d => d.doc_type === type))}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                </div>

                {/* Expanded document list */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/40 bg-muted/20">
                        {typeDocs.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">
                            {search ? 'Sin resultados para esta búsqueda' : 'Sin documentos de este tipo'}
                          </p>
                        ) : (
                          <div className="divide-y divide-border/30">
                            {typeDocs.map(doc => (
                              <div
                                key={doc.id}
                                className={`flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-accent/20 transition-colors group ${selected.has(doc.id) ? 'bg-primary/5' : ''}`}
                              >
                                {selectMode && (
                                  <Checkbox
                                    checked={selected.has(doc.id)}
                                    onCheckedChange={() => toggleSelect(doc.id)}
                                  />
                                )}
                                <div
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => onViewDoc(doc)}
                                >
                                  <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">
                                    {doc.title}
                                  </span>
                                </div>
                                {/* File links */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {doc.url_word && (
                                    <a
                                      href={doc.url_word}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline px-1.5 py-0.5 rounded bg-primary/5 hover:bg-primary/10 transition-colors"
                                    >
                                      <ExternalLink className="h-3 w-3" /> Word
                                    </a>
                                  )}
                                  {doc.url_pdf && (
                                    <a
                                      href={doc.url_pdf}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive hover:underline px-1.5 py-0.5 rounded bg-destructive/5 hover:bg-destructive/10 transition-colors"
                                    >
                                      <ExternalLink className="h-3 w-3" /> PDF
                                    </a>
                                  )}
                                  {doc.url_file && !doc.url_word && !doc.url_pdf && (
                                    <a
                                      href={doc.url_file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:underline px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors"
                                    >
                                      <ExternalLink className="h-3 w-3" /> Archivo
                                    </a>
                                  )}
                                  {doc.drive_link && (
                                    <a
                                      href={doc.drive_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 hover:underline px-1.5 py-0.5 rounded bg-green-500/5 hover:bg-green-500/10 transition-colors"
                                    >
                                      <ExternalLink className="h-3 w-3" /> Drive
                                    </a>
                                  )}
                                </div>
                                {doc.confidential && (
                                  <Lock className="h-3.5 w-3.5 text-destructive/70 shrink-0" />
                                )}
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {format(new Date(doc.updated_at), 'dd/MM/yy')}
                                </span>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
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
                                      <DropdownMenuItem
                                        onClick={() => onDeleteDoc(doc)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add doc of this type */}
                        {canEdit && (
                          <div className="px-5 py-2 border-t border-border/30">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-muted-foreground hover:text-primary"
                              onClick={() => onCreateDoc(silo, type)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar {label}
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
      </>
      )}
      </>
      )}
    </motion.div>
  );
}
