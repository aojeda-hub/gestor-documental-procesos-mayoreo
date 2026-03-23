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
import { Plus, FileText, Upload, Eye, Lock, Unlock, ChevronDown, ChevronRight, FileUp, Loader2, MoreVertical, Edit, Trash2, ExternalLink, CheckCircle } from 'lucide-react';
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

  // Edit/Delete state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Google Drive edit confirmation state
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  const [editingDocForConfirm, setEditingDocForConfirm] = useState<Document | null>(null);
  const [confirmDesc, setConfirmDesc] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const canEdit = hasRole('admin') || hasRole('editor');

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase.from('documents').select('*').order('updated_at', { ascending: false });
    setDocs((data || []) as unknown as Document[]);
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
    
    if (formFile) {
      try {
        const url = await uploadFile(formFile, (doc as any).id, 'file');
        await supabase.from('document_versions').insert({
          document_id: (doc as any).id, version_number: 1,
          description: 'Carga inicial', authors: profile?.full_name || user?.email || '', 
          approver: '', url_word: url, is_current: true,
        } as any);
      } catch (err: any) {
        toast({ title: 'Error al subir archivo', description: err.message, variant: 'destructive' });
      }
    }

    toast({ title: 'Documento creado' });
    setShowCreate(false);
    setFormTitle('');
    setFormFile(null);
    fetchDocs();
  };

  const handleUpdateDoc = async () => {
    if (!editingDoc) return;
    const { error } = await supabase.from('documents').update({
      title: formTitle, doc_type: formType, silo: formSilo, confidential: formConfidential,
    } as any).eq('id', editingDoc.id);

    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    toast({ title: 'Documento actualizado' });
    setShowEditDialog(false);
    setEditingDoc(null);
    fetchDocs();
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
      setWordFile(null); setPdfFile(null); setGenericFile(null); setVDriveUrl('');
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
          approver: '', url_file: url, is_current: true,
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

    // Open in new tab
    window.open(driveUrl, '_blank');

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
        .select('version_number, url_word, url_pdf, url_file')
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
        url_file: lastVersion?.url_file || null,
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
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Documento</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
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
                    <Label>Seleccionar Documento (Opcional)</Label>
                    <Input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx" onChange={e => setFormFile(e.target.files?.[0] || null)} />
                    <p className="text-[10px] text-muted-foreground">Formatos soportados: PDF, Word, Imágenes, PowerPoint</p>
                  </div>
                  <Button className="w-full" onClick={handleCreateDoc} disabled={!formTitle}>Crear Documento</Button>
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
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx" 
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
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron documentos.</TableCell></TableRow>
              ) : filtered.map(doc => (
                <>
                  <TableRow key={doc.id} className="cursor-pointer" onClick={() => toggleExpand(doc.id)}>
                    <TableCell>
                      {expandedDoc === doc.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell><Badge variant="secondary">{DOC_TYPE_LABELS[doc.doc_type]}</Badge></TableCell>
                    <TableCell>{SILO_LABELS[doc.silo]}</TableCell>
                    <TableCell>{doc.confidential ? <Lock className="h-4 w-4 text-destructive" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(doc.updated_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleExpand(doc.id)}>
                            <Eye className="mr-2 h-4 w-4" /> Ver Versiones
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem onClick={() => handleOpenInGoogleDrive(doc)}>
                              <ExternalLink className="mr-2 h-4 w-4" /> Ver / Editar en Drive
                            </DropdownMenuItem>
                          )}
                          {canEdit && (
                            <>
                              <DropdownMenuItem onClick={() => { setSelectedDocId(doc.id); setShowVersionDialog(true); }}>
                                <Upload className="mr-2 h-4 w-4" /> Agregar Documento
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { 
                                setEditingDoc(doc);
                                setFormTitle(doc.title);
                                setFormType(doc.doc_type);
                                setFormSilo(doc.silo);
                                setFormConfidential(doc.confidential);
                                setShowEditDialog(true);
                              }}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setDocToDelete(doc); setShowDeleteAlert(true); }}>
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
                      <TableCell colSpan={7} className="bg-muted p-4">
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
                                  {v.url_pdf && <a href={v.url_pdf} target="_blank" className="text-primary hover:underline">PDF</a>}
                                  {v.url_word && <a href={v.url_word} target="_blank" className="text-primary hover:underline">Word</a>}
                                  {v.url_file && <a href={v.url_file} target="_blank" className="text-primary hover:underline">Archivo</a>}
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

      {/* Version Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar Documento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título del documento</Label>
              <Input value={vAuthors} onChange={e => setVAuthors(e.target.value)} placeholder="Nombre del documento" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={vDesc} onChange={e => setVDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={vApprover || 'procedimiento'} onValueChange={v => setVApprover(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Enlace Google Drive (para edición en línea)</Label>
              <Input
                placeholder="https://docs.google.com/document/d/..."
                value={vDriveUrl}
                onChange={e => setVDriveUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Pegue aquí el enlace de Google Drive del documento. Este enlace se usará para "Ver / Editar en Drive".</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Archivo Word (opcional)</Label>
                <Input type="file" accept=".doc,.docx" onChange={e => setWordFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-2">
                <Label>Archivo PDF</Label>
                <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Otros Archivos (Imagen, PPT, etc.)</Label>
              <Input type="file" accept=".jpg,.jpeg,.png,.ppt,.pptx" onChange={e => setGenericFile(e.target.files?.[0] || null)} />
            </div>
            <Button className="w-full" onClick={handleCreateVersion}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Documento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
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
            <Button className="w-full" onClick={handleUpdateDoc} disabled={!formTitle}>Actualizar Documento</Button>
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

      {/* Confirm Google Drive Edit Dialog */}
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
