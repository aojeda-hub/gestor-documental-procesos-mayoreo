import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Upload, Lock, Unlock, ChevronDown, ChevronRight, FileUp, Loader2, MoreVertical, Trash2, ExternalLink, CheckCircle, Download, Eye, Edit } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Document, DocumentVersion, DocType, SiloType } from '@/types/database';
import { DOC_TYPE_LABELS, SILO_LABELS } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Documents() {
  const { user, profile, hasRole } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSilo, setFilterSilo] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<DocType>('procedimiento');
  const [formSilo, setFormSilo] = useState<SiloType>('compras');
  const [formConfidential, setFormConfidential] = useState(false);
  const [formFile, setFormFile] = useState<File | null>(null);

  // Version form
  const [vDesc, setVDesc] = useState('');
  const [vAuthors, setVAuthors] = useState('');
  const [vApprover, setVApprover] = useState('');
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [genericFile, setGenericFile] = useState<File | null>(null);
  const [vDriveUrl, setVDriveUrl] = useState('');

  // Bulk Upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkSilo, setBulkSilo] = useState<SiloType>('compras');
  const [bulkType, setBulkType] = useState<DocType>('procedimiento');
  const [uploadingBulk, setUploadingBulk] = useState(false);

  // Details (View/Edit) state
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [currentVersion, setCurrentVersion] = useState<DocumentVersion | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteAlert, setShowBulkDeleteAlert] = useState(false);

  // Google Drive edit confirmation state
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  const [editingDocForConfirm, setEditingDocForConfirm] = useState<Document | null>(null);
  const [confirmDesc, setConfirmDesc] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const canEdit = hasRole('admin') || hasRole('editor');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)));
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      for (const id of selectedIds) {
        await supabase.from('document_versions').delete().eq('document_id', id);
        await supabase.from('documents').delete().eq('id', id);
      }
      toast({ title: `${selectedIds.size} documento(s) eliminado(s)` });
      setSelectedIds(new Set());
      setShowBulkDeleteAlert(false);
      fetchDocs();
    } catch (err: any) {
      toast({ title: 'Error al eliminar', description: err.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchDocs = async () => {
    setLoading(true);
    // Fetch docs with their related current versions to get the Word URL directly
    const { data } = await supabase
      .from('documents')
      .select('*, document_versions(url_word, is_current)')
      .order('updated_at', { ascending: false });
    
    // Map the documents to include a top-level url_word for convenience
    const docsWithWord = (data || []).map((doc: any) => ({
      ...doc,
      url_word: doc.document_versions?.find((v: any) => v.is_current)?.url_word
    }));

    setDocs(docsWithWord as Document[]);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const fetchVersions = async (docId: string) => {
    const { data } = await supabase.from('document_versions').select('*')
      .eq('document_id', docId).order('version_number', { ascending: false });
    setVersions((data || []) as unknown as DocumentVersion[]);
  };

  const toggleExpand = (docId: string) => {
    if (expandedDoc === docId) {
      setExpandedDoc(null);
    } else {
      setExpandedDoc(docId);
      fetchVersions(docId);
    }
  };

  const handleCreateDoc = async () => {
    const { data: doc, error } = await supabase.from('documents').insert({
      title: formTitle, doc_type: formType, silo: formSilo, confidential: formConfidential, created_by: user?.id,
    } as any).select().single();
    
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    
    // Create initial version with Drive URL and/or uploaded files
    let urlWord = null;
    let urlPdf = null;
    let urlFile = null;
    if (wordFile) urlWord = await uploadFile(wordFile, (doc as any).id, 'word').catch(() => null);
    else if (vDriveUrl.trim()) urlWord = vDriveUrl.trim();
    if (pdfFile) urlPdf = await uploadFile(pdfFile, (doc as any).id, 'pdf').catch(() => null);
    if (genericFile) urlFile = await uploadFile(genericFile, (doc as any).id, 'file').catch(() => null);

    await supabase.from('document_versions').insert({
      document_id: (doc as any).id, version_number: 1,
      description: vDesc || 'Carga inicial', authors: profile?.full_name || user?.email || '', 
      approver: '', url_word: urlWord, url_pdf: urlPdf, url_file: urlFile, is_current: true,
    } as any);

    toast({ title: 'Documento creado' });
    setShowCreate(false);
    setFormTitle(''); setVDesc(''); setVDriveUrl('');
    setWordFile(null); setPdfFile(null); setGenericFile(null); setFormFile(null);
    fetchDocs();
  };

  const handleUpdateDoc = async () => {
    if (!selectedDoc) return;
    setIsUpdating(true);
    try {
      // 1. Update document metadata
      const { error: docError } = await supabase.from('documents').update({
        title: formTitle, doc_type: formType, silo: formSilo, confidential: formConfidential,
      } as any).eq('id', selectedDoc.id);

      if (docError) throw docError;

      // 2. Update current version metadata if available
      if (currentVersion) {
        let urlWord = currentVersion.url_word;
        let urlPdf = currentVersion.url_pdf;
        let urlFile = currentVersion.url_file;

        if (wordFile) urlWord = await uploadFile(wordFile, selectedDoc.id, 'word');
        if (pdfFile) urlPdf = await uploadFile(pdfFile, selectedDoc.id, 'pdf');
        if (genericFile) urlFile = await uploadFile(genericFile, selectedDoc.id, 'file');

        const { error: verError } = await supabase.from('document_versions').update({
          description: vDesc, authors: vAuthors, approver: vApprover,
          url_word: urlWord, url_pdf: urlPdf, url_file: urlFile,
        } as any).eq('id', currentVersion.id);

        if (verError) throw verError;
      }

      toast({ title: 'Cambios guardados exitosamente' });
      setShowDetailsDialog(false);
      setSelectedDoc(null);
      setCurrentVersion(null);
      setWordFile(null); setPdfFile(null); setGenericFile(null);
      fetchDocs();
    } catch (err: any) {
      toast({ title: 'Error al actualizar', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const openDetails = async (doc: Document) => {
    setSelectedDoc(doc);
    setFormTitle(doc.title);
    setFormType(doc.doc_type);
    setFormSilo(doc.silo);
    setFormConfidential(doc.confidential);
    setShowDetailsDialog(true);
    
    // Fetch and identify current version
    const { data } = await supabase.from('document_versions').select('*')
      .eq('document_id', doc.id).order('version_number', { ascending: false });
    
    const vers = (data || []) as unknown as DocumentVersion[];
    setVersions(vers);
    
    const current = vers.find(v => v.is_current) || (vers.length > 0 ? vers[0] : null);
    setCurrentVersion(current);
    if (current) {
      setVDesc(current.description || '');
      setVAuthors(current.authors || '');
      setVApprover(current.approver || '');
    } else {
      setVDesc(''); setVAuthors(''); setVApprover('');
    }
    setWordFile(null); setPdfFile(null); setGenericFile(null);
  };

  const handleDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      // First delete associated versions
      const { error: verErr } = await supabase.from('document_versions').delete().eq('document_id', docToDelete.id);
      if (verErr) throw verErr;

      // Then delete the document
      const { error: docErr } = await supabase.from('documents').delete().eq('id', docToDelete.id);
      if (docErr) throw docErr;

      toast({ title: 'Documento eliminado' });
      setShowDeleteAlert(false);
      setDocToDelete(null);
      fetchDocs();
    } catch (err: any) {
      toast({ title: 'Error al eliminar', description: err.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const uploadFile = async (file: File, docId: string, type: string) => {
    const path = `${docId}/${Date.now()}_${type}_${file.name}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCreateVersion = async () => {
    if (!selectedDocId) return;
    try {
      // Get next version number
      const { data: existing } = await supabase.from('document_versions')
        .select('version_number').eq('document_id', selectedDocId)
        .order('version_number', { ascending: false }).limit(1);
      const nextVersion = (existing && existing.length > 0 ? (existing[0] as any).version_number : 0) + 1;

      // Mark old versions as not current
      await supabase.from('document_versions').update({ is_current: false } as any).eq('document_id', selectedDocId);

      let urlWord = null;
      let urlPdf = null;
      if (wordFile) urlWord = await uploadFile(wordFile, selectedDocId, 'word');
      else if (vDriveUrl.trim()) urlWord = vDriveUrl.trim();
      if (pdfFile) urlPdf = await uploadFile(pdfFile, selectedDocId, 'pdf');

      const { error } = await supabase.from('document_versions').insert({
        document_id: selectedDocId, version_number: nextVersion,
        description: vDesc, authors: vAuthors, approver: vApprover,
        url_word: urlWord, url_pdf: urlPdf, is_current: true,
      } as any);

      if (error) throw error;
      toast({ title: `Versión ${nextVersion} creada` });
      setShowVersionDialog(false);
      setVDesc(''); setVAuthors(''); setVApprover('');
      setWordFile(null); setPdfFile(null); setVDriveUrl('');
      fetchVersions(selectedDocId);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    setUploadingBulk(true);
    let successCount = 0;
    
    try {
      for (const file of bulkFiles) {
        const title = file.name.split('.').slice(0, -1).join('.') || file.name;
        
        // 1. Create document
        const { data: doc, error: docErr } = await supabase.from('documents').insert({
          title, doc_type: bulkType, silo: bulkSilo, confidential: false, created_by: user?.id,
        } as any).select().single();
        
        if (docErr) throw docErr;

        // 2. Upload file
        const url = await uploadFile(file, (doc as any).id, 'file');

        // 3. Create version
        const { error: verErr } = await supabase.from('document_versions').insert({
          document_id: (doc as any).id, version_number: 1,
          description: 'Carga inicial masiva', authors: profile?.full_name || user?.email || '', 
          approver: '', url_word: url, is_current: true,
        } as any);

        if (verErr) throw verErr;
        successCount++;
      }
      
      toast({ title: 'Carga Masiva exitosa', description: `Se cargaron ${successCount} documentos.` });
      setShowBulkUpload(false);
      setBulkFiles([]);
      fetchDocs();
    } catch (err: any) {
      toast({ title: 'Error en carga masiva', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingBulk(false);
    }
  };

  const handleOpenInGoogleDrive = async (doc: Document) => {
    // Get current version's url_word (Google Drive link)
    const { data: currentVersions } = await supabase.from('document_versions')
      .select('*')
      .eq('document_id', doc.id)
      .eq('is_current', true)
      .limit(1);

    const currentVersion = currentVersions?.[0] as unknown as DocumentVersion | undefined;
    const driveUrl = currentVersion?.url_word;

    if (!driveUrl) {
      toast({ title: 'Sin enlace de edición', description: 'Este documento no tiene un enlace de Google Drive configurado. Agréguelo en el campo "Archivo Word" al crear una versión.', variant: 'destructive' });
      return;
    }

    // Open in new tab using anchor element to bypass iframe restrictions
    const a = document.createElement('a');
    a.href = driveUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Show confirm dialog
    setEditingDocForConfirm(doc);
    setConfirmDesc('');
    setShowConfirmEdit(true);
  };

  const handleConfirmEdit = async () => {
    if (!editingDocForConfirm) return;
    setIsConfirming(true);
    try {
      // Get next version number
      const { data: existing } = await supabase.from('document_versions')
        .select('version_number, url_word, url_pdf')
        .eq('document_id', editingDocForConfirm.id)
        .order('version_number', { ascending: false }).limit(1);

      const lastVersion = existing?.[0] as any;
      const nextVersion = (lastVersion?.version_number || 0) + 1;

      // Mark old versions as not current
      await supabase.from('document_versions').update({ is_current: false } as any).eq('document_id', editingDocForConfirm.id);

      // Create new version preserving the same URLs
      const { error } = await supabase.from('document_versions').insert({
        document_id: editingDocForConfirm.id,
        version_number: nextVersion,
        description: confirmDesc || 'Edición desde Google Drive',
        authors: profile?.full_name || user?.email || '',
        approver: '',
        url_word: lastVersion?.url_word || null,
        url_pdf: lastVersion?.url_pdf || null,
        is_current: true,
      } as any);

      if (error) throw error;

      // Update document's updated_at
      await supabase.from('documents').update({ updated_at: new Date().toISOString() } as any).eq('id', editingDocForConfirm.id);

      toast({ title: `Versión ${nextVersion} registrada`, description: 'La edición fue confirmada exitosamente.' });
      setShowConfirmEdit(false);
      setEditingDocForConfirm(null);
      fetchDocs();
      if (expandedDoc === editingDocForConfirm.id) {
        fetchVersions(editingDocForConfirm.id);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsConfirming(false);
    }
  };

  const filtered = docs.filter(d => {
    if (filterSilo !== 'all' && d.silo !== filterSilo) return false;
    if (filterType !== 'all' && d.doc_type !== filterType) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Buscar documentos..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterSilo} onValueChange={setFilterSilo}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos los silos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los silos</SelectItem>
            {Object.entries(SILO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        {canEdit && (
          <>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Nuevo Documento</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-xl">Agregar Documento</DialogTitle></DialogHeader>
                <div className="space-y-5 py-2">
                  <div className="space-y-2">
                    <Label>Título del documento</Label>
                    <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Nombre del documento" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea value={vDesc} onChange={e => setVDesc(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de documento</Label>
                      <Select value={formType} onValueChange={v => setFormType(v as DocType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Silo</Label>
                      <Select value={formSilo} onValueChange={v => setFormSilo(v as SiloType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(SILO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={formConfidential} onCheckedChange={setFormConfidential} />
                    <Label>Confidencial</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Enlace Google Drive (para edición en línea)</Label>
                    <Input
                      placeholder="https://docs.google.com/document/d/..."
                      value={vDriveUrl}
                      onChange={e => setVDriveUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Archivos</Label>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Word (.doc, .docx)</span>
                        <Input type="file" accept=".doc,.docx" onChange={e => setWordFile(e.target.files?.[0] || null)} />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">PDF</span>
                        <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Otro archivo (PPT, Excel, Imagen, Diagrama, etc.)</span>
                        <Input type="file" accept=".ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp,.svg,.vsd,.vsdx,.dwg,.ai,.eps,.tif,.tiff,.webp,.zip,.rar" onChange={e => setGenericFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreateDoc} disabled={!formTitle}>Guardar</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
              <DialogTrigger asChild>
                <Button><FileUp className="mr-2 h-4 w-4" /> Carga Masiva</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Carga Masiva de Documentos</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo para todos</Label>
                      <Select value={bulkType} onValueChange={v => setBulkType(v as DocType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Silo para todos</Label>
                      <Select value={bulkSilo} onValueChange={v => setBulkSilo(v as SiloType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(SILO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Seleccionar Archivos</Label>
                    <Input 
                      type="file" 
                      multiple 
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.svg,.ppt,.pptx,.xls,.xlsx,.vsd,.vsdx,.dwg,.ai,.eps,.tif,.tiff,.webp,.zip,.rar" 
                      onChange={e => setBulkFiles(Array.from(e.target.files || []))} 
                    />
                    {bulkFiles.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto rounded-md border p-2 text-xs">
                        {bulkFiles.map((f, i) => <div key={i} className="py-1 border-b last:border-0">{f.name}</div>)}
                      </div>
                    )}
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleBulkUpload} 
                    disabled={bulkFiles.length === 0 || uploadingBulk}
                  >
                    {uploadingBulk ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...</> : `Cargar ${bulkFiles.length} documentos`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
        {canEdit && selectedIds.size > 0 && (
          <Button variant="destructive" onClick={() => setShowBulkDeleteAlert(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar ({selectedIds.size})
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {canEdit && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead className="w-8"></TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Silo</TableHead>
                <TableHead>Confidencial</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={canEdit ? 8 : 7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={canEdit ? 8 : 7} className="text-center py-8 text-muted-foreground">No se encontraron documentos.</TableCell></TableRow>
              ) : filtered.map(doc => (
                <>
                  <TableRow key={doc.id} className="cursor-pointer" onClick={() => openDetails(doc)}>
                    {canEdit && (
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(doc.id)}
                          onCheckedChange={() => toggleSelect(doc.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell onClick={(e) => { e.stopPropagation(); toggleExpand(doc.id); }}>
                      {expandedDoc === doc.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-medium text-primary hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenInGoogleDrive(doc); }}>{doc.title}</TableCell>
                    <TableCell><Badge variant="secondary">{DOC_TYPE_LABELS[doc.doc_type]}</Badge></TableCell>
                    <TableCell>{SILO_LABELS[doc.silo]}</TableCell>
                    <TableCell>{doc.confidential ? <Lock className="h-4 w-4 text-destructive" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(doc.updated_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      {(doc as any).url_word && (
                        <Button variant="ghost" size="icon" asChild title="Abrir en Word">
                          <a href={(doc as any).url_word} target="_blank" rel="noopener noreferrer">
                             <FileText className="h-4 w-4 text-primary" />
                          </a>
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetails(doc); }}>
                            <Eye className="mr-2 h-4 w-4" /> Ver / Editar
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={async (e) => {
                            e.stopPropagation();
                            const { data: vers } = await supabase
                              .from('document_versions')
                              .select('url_pdf, url_word')
                              .eq('document_id', doc.id)
                              .eq('is_current', true)
                              .single();

                            // 1. Si ya tiene PDF, descargar directamente
                            if (vers?.url_pdf) {
                              const link = document.createElement('a');
                              link.href = vers.url_pdf;
                              link.download = `${doc.title}.pdf`;
                              link.target = '_blank';
                              link.click();
                              return;
                            }

                            // 2. Si tiene enlace de Google Drive, exportar como PDF
                            const driveUrl = vers?.url_word || '';
                            const driveIdMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                            if (driveIdMatch) {
                              const fileId = driveIdMatch[1];
                              let exportUrl = '';
                              if (driveUrl.includes('docs.google.com/document')) {
                                exportUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
                              } else if (driveUrl.includes('docs.google.com/spreadsheets')) {
                                exportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=pdf`;
                              } else if (driveUrl.includes('docs.google.com/presentation')) {
                                exportUrl = `https://docs.google.com/presentation/d/${fileId}/export/pdf`;
                              } else {
                                exportUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                              }
                              window.open(exportUrl, '_blank');
                              return;
                            }

                            toast({ title: 'Sin PDF disponible', description: 'Este documento no tiene un PDF ni un enlace de Google Drive para exportar.', variant: 'destructive' });
                          }}>
                            <Download className="mr-2 h-4 w-4" /> Descargar PDF
                          </DropdownMenuItem>

                          {canEdit && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); setDocToDelete(doc); setShowDeleteAlert(true); }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedDoc === doc.id && (
                    <TableRow key={`${doc.id}-versions`}>
                      <TableCell colSpan={canEdit ? 8 : 7} className="bg-muted p-4">
                        <p className="mb-2 text-sm font-semibold">Historial de Versiones</p>
                        {versions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sin versiones.</p>
                        ) : (
                          <div className="space-y-2">
                            {versions.map(v => (
                              <div key={v.id} className="flex items-center justify-between rounded border bg-card p-3 text-sm">
                                <div>
                                  <span className="font-medium">v{v.version_number}</span>
                                  {v.is_current && <Badge className="ml-2" variant="default">Actual</Badge>}
                                  <span className="ml-3 text-muted-foreground">{v.description}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">{v.authors}</span>
                                  {v.url_pdf && <a href={v.url_pdf} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">PDF</a>}
                                  {v.url_word && <a href={v.url_word} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Word/Drive</a>}
                                  {v.url_file && <a href={v.url_file} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Archivo</a>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Details Dialog (View/Edit) */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle>Detalles del Documento</DialogTitle>
            {currentVersion && (currentVersion.url_word || currentVersion.url_pdf || currentVersion.url_file) && (
              <Button asChild variant="default" size="sm" className="bg-primary hover:bg-primary/90 mr-8">
                <a href={currentVersion.url_word || currentVersion.url_pdf || currentVersion.url_file || '#'} target="_blank" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" /> {currentVersion.url_word ? 'Abrir en Word' : 'Ver Documento Actual'}
                </a>
              </Button>
            )}
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} disabled={!canEdit} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={formType} onValueChange={v => setFormType(v as DocType)} disabled={!canEdit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Silo</Label>
                    <Select value={formSilo} onValueChange={v => setFormSilo(v as SiloType)} disabled={!canEdit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SILO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch checked={formConfidential} onCheckedChange={setFormConfidential} disabled={!canEdit} />
                  <Label>Confidencial</Label>
                </div>

                {currentVersion && (
                   <div className="border-y py-4 space-y-4">
                     <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                       <Upload className="h-4 w-4" /> Datos de la Versión Actual (v{currentVersion.version_number})
                     </h3>
                     <div className="space-y-2">
                       <Label>Descripción del cambio</Label>
                       <Textarea value={vDesc} onChange={e => setVDesc(e.target.value)} placeholder="Ej: Nueva norma aprobada..." disabled={!canEdit} />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label>Autores</Label>
                         <Input value={vAuthors} onChange={e => setVAuthors(e.target.value)} disabled={!canEdit} />
                       </div>
                       <div className="space-y-2">
                         <Label>Aprobador</Label>
                         <Input value={vApprover} onChange={e => setVApprover(e.target.value)} disabled={!canEdit} />
                       </div>
                     </div>
                     {canEdit && (
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Actualizar Word</Label>
                            <Input type="file" accept=".doc,.docx" className="h-8 text-[10px]" onChange={e => setWordFile(e.target.files?.[0] || null)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Actualizar PDF</Label>
                            <Input type="file" accept=".pdf" className="h-8 text-[10px]" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-[10px]">Otros Archivos (Imagen, PPT, etc.)</Label>
                            <Input type="file" accept=".jpg,.jpeg,.png,.ppt,.pptx" className="h-8 text-[10px]" onChange={e => setGenericFile(e.target.files?.[0] || null)} />
                          </div>
                       </div>
                     )}
                   </div>
                )}

                {canEdit && (
                  <Button className="w-full" onClick={handleUpdateDoc} disabled={!formTitle || isUpdating}>
                    {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Todos los Cambios'}
                  </Button>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Historial de Versiones
                </h3>
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-4">Sin versiones cargadas.</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {versions.map(v => (
                      <div key={v.id} className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">v{v.version_number}</span>
                            {v.is_current && <Badge variant="default" className="text-[10px] h-4">Actual</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            {v.url_pdf && <a href={v.url_pdf} target="_blank" className="text-blue-600 hover:underline">PDF</a>}
                            {v.url_word && <a href={v.url_word} target="_blank" className="text-blue-600 hover:underline">Word</a>}
                            {v.url_file && <a href={v.url_file} target="_blank" className="text-blue-600 hover:underline">Ver</a>}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground italic truncate">"{v.description}"</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:flex flex-col border rounded-lg bg-slate-50 min-h-[400px]">
              <div className="p-3 border-b bg-white flex items-center justify-between rounded-t-lg">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Previsualización</span>
                {currentVersion?.url_pdf && <span className="text-[10px] text-muted-foreground">PDF Detectado</span>}
              </div>
              <div className="flex-1 flex items-center justify-center p-4">
                {currentVersion?.url_pdf ? (
                  <iframe src={currentVersion.url_pdf} className="w-full h-full rounded border shadow-sm bg-white" title="Preview" />
                ) : currentVersion?.url_file && (currentVersion.url_file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                  <img src={currentVersion.url_file} className="max-w-full max-h-full object-contain shadow-sm" alt="Preview" />
                ) : (
                  <div className="text-center space-y-2">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-400">Previsualización no disponible para este formato</p>
                    {(currentVersion?.url_word || currentVersion?.url_file) && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={currentVersion.url_word || currentVersion.url_file || '#'} target="_blank">Descargar Archivo</a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el documento "{docToDelete?.title}" y todas sus versiones. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={e => { e.preventDefault(); handleDeleteDoc(); }} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Alert Dialog */}
      <AlertDialog open={showBulkDeleteAlert} onOpenChange={setShowBulkDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.size} documento(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará los documentos seleccionados y todas sus versiones. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => { e.preventDefault(); handleBulkDelete(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : `Eliminar ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showConfirmEdit} onOpenChange={(open) => {
        if (!open && !isConfirming) {
          setShowConfirmEdit(false);
          setEditingDocForConfirm(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Confirmar Edición
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              El documento <strong>"{editingDocForConfirm?.title}"</strong> se abrió en Google Drive.
              Cuando termines de editar, confirma aquí para registrar una nueva versión.
            </p>
            <div className="space-y-2">
              <Label>Descripción del cambio (opcional)</Label>
              <Textarea 
                value={confirmDesc} 
                onChange={e => setConfirmDesc(e.target.value)} 
                placeholder="Ej: Actualización de procedimiento sección 3.2"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowConfirmEdit(false); setEditingDocForConfirm(null); }} disabled={isConfirming}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleConfirmEdit} disabled={isConfirming}>
                {isConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...</> : 'Confirmar y Registrar Versión'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
