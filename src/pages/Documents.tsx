import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Upload, Loader2, FileUp, CheckCircle, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Document, DocumentVersion, DocType, SiloType } from '@/types/database';
import { DOC_TYPE_LABELS, SILO_LABELS } from '@/types/database';
import SiloCard from '@/components/documents/SiloCard';
import SiloUniverse from '@/components/documents/SiloUniverse';

export default function Documents() {
  const [activeSilo, setActiveSilo] = useState<SiloType | null>(null);
  const { user, profile, hasRole } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<DocType>('procedimiento');
  const [formSilo, setFormSilo] = useState<SiloType>('compras');
  const [formConfidential, setFormConfidential] = useState(false);
  const [vDesc, setVDesc] = useState('');
  const [vAuthors, setVAuthors] = useState('');
  const [vApprover, setVApprover] = useState('');
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [genericFile, setGenericFile] = useState<File | null>(null);
  const [vDriveUrl, setVDriveUrl] = useState('');

  // Details dialog
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [currentVersion, setCurrentVersion] = useState<DocumentVersion | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Confirm edit
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  const [editingDocForConfirm, setEditingDocForConfirm] = useState<Document | null>(null);
  const [confirmDesc, setConfirmDesc] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Bulk upload
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkSilo, setBulkSilo] = useState<SiloType>('compras');
  const [bulkType, setBulkType] = useState<DocType>('procedimiento');
  const [uploadingBulk, setUploadingBulk] = useState(false);

  const canEdit = hasRole('admin') || hasRole('editor');

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*, document_versions(url_word, is_current)')
      .order('updated_at', { ascending: false });
    const docsWithWord = (data || []).map((doc: any) => ({
      ...doc,
      url_word: doc.document_versions?.find((v: any) => v.is_current)?.url_word,
    }));
    setDocs(docsWithWord as Document[]);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const uploadFile = async (file: File, docId: string, type: string) => {
    const path = `${docId}/${Date.now()}_${type}_${file.name}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    const { data, error: signError } = await supabase.storage.from('documents').createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signError) throw signError;
    return data.signedUrl;
  };

  const handleCreateDoc = async () => {
    const { data: doc, error } = await supabase.from('documents').insert({
      title: formTitle, doc_type: formType, silo: formSilo, confidential: formConfidential, created_by: user?.id,
    } as any).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    let urlWord = null, urlPdf = null, urlFile = null;
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
    resetForm();
    fetchDocs();
  };

  const resetForm = () => {
    setFormTitle(''); setVDesc(''); setVDriveUrl(''); setVAuthors(''); setVApprover('');
    setWordFile(null); setPdfFile(null); setGenericFile(null); setFormConfidential(false);
  };

  const openDetails = async (doc: Document) => {
    setSelectedDoc(doc);
    setFormTitle(doc.title);
    setFormType(doc.doc_type);
    setFormSilo(doc.silo);
    setFormConfidential(doc.confidential);
    setShowDetailsDialog(true);

    const { data } = await supabase.from('document_versions').select('*')
      .eq('document_id', doc.id).order('version_number', { ascending: false });
    const vers = (data || []) as unknown as DocumentVersion[];
    setVersions(vers);
    const current = vers.find(v => v.is_current) || vers[0] || null;
    setCurrentVersion(current);
    if (current) { setVDesc(current.description || ''); setVAuthors(current.authors || ''); setVApprover(current.approver || ''); }
    else { setVDesc(''); setVAuthors(''); setVApprover(''); }
    setWordFile(null); setPdfFile(null); setGenericFile(null);
  };

  const handleUpdateDoc = async () => {
    if (!selectedDoc) return;
    setIsUpdating(true);
    try {
      await supabase.from('documents').update({
        title: formTitle, doc_type: formType, silo: formSilo, confidential: formConfidential,
      } as any).eq('id', selectedDoc.id);

      if (currentVersion) {
        let urlWord = currentVersion.url_word, urlPdf = currentVersion.url_pdf, urlFile = currentVersion.url_file;
        if (wordFile) urlWord = await uploadFile(wordFile, selectedDoc.id, 'word');
        if (pdfFile) urlPdf = await uploadFile(pdfFile, selectedDoc.id, 'pdf');
        if (genericFile) urlFile = await uploadFile(genericFile, selectedDoc.id, 'file');
        await supabase.from('document_versions').update({
          description: vDesc, authors: vAuthors, approver: vApprover,
          url_word: urlWord, url_pdf: urlPdf, url_file: urlFile,
        } as any).eq('id', currentVersion.id);
      }
      toast({ title: 'Cambios guardados' });
      setShowDetailsDialog(false);
      fetchDocs();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setIsUpdating(false); }
  };

  const handleDeleteDoc = async () => {
    if (!selectedDoc) return;
    setIsDeleting(true);
    try {
      await supabase.from('document_versions').delete().eq('document_id', selectedDoc.id);
      await supabase.from('documents').delete().eq('id', selectedDoc.id);
      toast({ title: 'Documento eliminado' });
      setShowDeleteAlert(false);
      setShowDetailsDialog(false);
      fetchDocs();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setIsDeleting(false); }
  };

  const handleOpenUrl = (url: string) => {
    if (!url.includes('supabase')) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenInGoogleDrive = async (doc: Document) => {
    const { data: currentVersions } = await supabase.from('document_versions').select('*')
      .eq('document_id', doc.id).eq('is_current', true).limit(1);
    const cv = currentVersions?.[0] as unknown as DocumentVersion | undefined;
    if (!cv?.url_word) {
      toast({ title: 'Sin enlace de edición', description: 'No hay enlace de Google Drive configurado.', variant: 'destructive' });
      return;
    }
    window.open(cv.url_word, '_blank', 'noopener,noreferrer');
    setEditingDocForConfirm(doc); setConfirmDesc(''); setShowConfirmEdit(true);
  };

  const handleConfirmEdit = async () => {
    if (!editingDocForConfirm) return;
    setIsConfirming(true);
    try {
      const { data: existing } = await supabase.from('document_versions')
        .select('version_number, url_word, url_pdf').eq('document_id', editingDocForConfirm.id)
        .order('version_number', { ascending: false }).limit(1);
      const last = existing?.[0] as any;
      const nextV = (last?.version_number || 0) + 1;
      await supabase.from('document_versions').update({ is_current: false } as any).eq('document_id', editingDocForConfirm.id);
      await supabase.from('document_versions').insert({
        document_id: editingDocForConfirm.id, version_number: nextV,
        description: confirmDesc || 'Edición desde Google Drive',
        authors: profile?.full_name || user?.email || '', approver: '',
        url_word: last?.url_word || null, url_pdf: last?.url_pdf || null, is_current: true,
      } as any);
      await supabase.from('documents').update({ updated_at: new Date().toISOString() } as any).eq('id', editingDocForConfirm.id);
      toast({ title: `Versión ${nextV} registrada` });
      setShowConfirmEdit(false); setEditingDocForConfirm(null); fetchDocs();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setIsConfirming(false); }
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    setUploadingBulk(true);
    let ok = 0;
    try {
      for (const file of bulkFiles) {
        const title = file.name.split('.').slice(0, -1).join('.') || file.name;
        const { data: doc, error: docErr } = await supabase.from('documents').insert({
          title, doc_type: bulkType, silo: bulkSilo, confidential: false, created_by: user?.id,
        } as any).select().single();
        if (docErr) throw docErr;
        const url = await uploadFile(file, (doc as any).id, 'file');
        await supabase.from('document_versions').insert({
          document_id: (doc as any).id, version_number: 1, description: 'Carga masiva',
          authors: profile?.full_name || '', approver: '', url_word: url, is_current: true,
        } as any);
        ok++;
      }
      toast({ title: `${ok} documentos cargados` });
      setShowBulkUpload(false); setBulkFiles([]); fetchDocs();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setUploadingBulk(false); }
  };

  const onCreateFromCard = (silo: SiloType, docType: DocType) => {
    setFormSilo(silo);
    setFormType(docType);
    setFormTitle('');
    setFormConfidential(false);
    setVDesc(''); setVDriveUrl('');
    setWordFile(null); setPdfFile(null); setGenericFile(null);
    setShowCreate(true);
  };

  // Group by silo
  const silos = Object.entries(SILO_LABELS) as [SiloType, string][];
  const groupedBySilo = silos.reduce<Record<SiloType, Document[]>>((acc, [key]) => {
    acc[key] = docs.filter(d => d.silo === key);
    return acc;
  }, {} as any);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        {canEdit && (
          <>
            <Button variant="outline" onClick={() => { resetForm(); setShowCreate(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Documento
            </Button>
            <Button onClick={() => setShowBulkUpload(true)}>
              <FileUp className="mr-2 h-4 w-4" /> Carga Masiva
            </Button>
          </>
        )}
      </div>

      {/* Silo Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {silos.map(([key, label]) => (
            <SiloCard
              key={key}
              silo={key}
              siloLabel={label}
              docCount={groupedBySilo[key].length}
              onClick={() => setActiveSilo(key)}
            />
          ))}
        </div>
      )}

      {/* Silo Detail Dialog */}
      {activeSilo && (
        <SiloDetailDialog
          open={!!activeSilo}
          onOpenChange={(open) => !open && setActiveSilo(null)}
          silo={activeSilo}
          siloLabel={SILO_LABELS[activeSilo]}
          docs={groupedBySilo[activeSilo]}
          canEdit={canEdit}
          onViewDoc={openDetails}
          onEditDoc={openDetails}
          onDeleteDoc={(doc) => { setSelectedDoc(doc); setShowDeleteAlert(true); }}
          onDownload={async (doc, fmt) => {
            const { data } = await supabase.from('document_versions').select('*')
              .eq('document_id', doc.id).eq('is_current', true).single();
            const version = data as any;
            const url = fmt === 'pdf' ? version?.url_pdf : version?.url_word;
            if (url) window.open(url, '_blank');
            else toast({ title: 'Sin archivo', description: `No hay archivo ${fmt === 'pdf' ? 'PDF' : 'Word'} disponible.`, variant: 'destructive' });
          }}
          onCreateDoc={onCreateFromCard}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
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
                  <SelectContent>{Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Silo</Label>
                <Select value={formSilo} onValueChange={v => setFormSilo(v as SiloType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(SILO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formConfidential} onCheckedChange={setFormConfidential} />
              <Label>Confidencial</Label>
            </div>
            <div className="space-y-2">
              <Label>Enlace Google Drive</Label>
              <Input placeholder="https://docs.google.com/document/d/..." value={vDriveUrl} onChange={e => setVDriveUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Archivos</Label>
              <div className="grid grid-cols-1 gap-3">
                <div><span className="text-xs text-muted-foreground">Word</span><Input type="file" accept=".doc,.docx" onChange={e => setWordFile(e.target.files?.[0] || null)} /></div>
                <div><span className="text-xs text-muted-foreground">PDF</span><Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} /></div>
                <div><span className="text-xs text-muted-foreground">Otro archivo</span><Input type="file" onChange={e => setGenericFile(e.target.files?.[0] || null)} /></div>
              </div>
            </div>
            <Button className="w-full" onClick={handleCreateDoc} disabled={!formTitle}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Carga Masiva de Documentos</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={bulkType} onValueChange={v => setBulkType(v as DocType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Silo</Label>
                <Select value={bulkSilo} onValueChange={v => setBulkSilo(v as SiloType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(SILO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Archivos</Label>
              <Input type="file" multiple onChange={e => setBulkFiles(Array.from(e.target.files || []))} />
              {bulkFiles.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto rounded-md border p-2 text-xs">
                  {bulkFiles.map((f, i) => <div key={i} className="py-1 border-b last:border-0">{f.name}</div>)}
                </div>
              )}
            </div>
            <Button className="w-full" onClick={handleBulkUpload} disabled={bulkFiles.length === 0 || uploadingBulk}>
              {uploadingBulk ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...</> : `Cargar ${bulkFiles.length} documentos`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle>Detalles del Documento</DialogTitle>
            {currentVersion && (currentVersion.url_word || currentVersion.url_pdf || currentVersion.url_file) && (
              <Button variant="default" size="sm" className="mr-8" onClick={() => handleOpenUrl(currentVersion.url_word || currentVersion.url_pdf || currentVersion.url_file || '')}>
                <Eye className="h-4 w-4 mr-2" /> Abrir Documento
              </Button>
            )}
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2"><Label>Título</Label><Input value={formTitle} onChange={e => setFormTitle(e.target.value)} disabled={!canEdit} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={formType} onValueChange={v => setFormType(v as DocType)} disabled={!canEdit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Silo</Label>
                    <Select value={formSilo} onValueChange={v => setFormSilo(v as SiloType)} disabled={!canEdit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(SILO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={formConfidential} onCheckedChange={setFormConfidential} disabled={!canEdit} /><Label>Confidencial</Label></div>

                {currentVersion && (
                  <div className="border-y py-4 space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-primary"><Upload className="h-4 w-4" /> Versión Actual (v{currentVersion.version_number})</h3>
                    <div className="space-y-2"><Label>Descripción</Label><Textarea value={vDesc} onChange={e => setVDesc(e.target.value)} disabled={!canEdit} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Autores</Label><Input value={vAuthors} onChange={e => setVAuthors(e.target.value)} disabled={!canEdit} /></div>
                      <div className="space-y-2"><Label>Aprobador</Label><Input value={vApprover} onChange={e => setVApprover(e.target.value)} disabled={!canEdit} /></div>
                    </div>
                    {canEdit && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label className="text-[10px]">Actualizar Word</Label><Input type="file" accept=".doc,.docx" className="h-8 text-[10px]" onChange={e => setWordFile(e.target.files?.[0] || null)} /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Actualizar PDF</Label><Input type="file" accept=".pdf" className="h-8 text-[10px]" onChange={e => setPdfFile(e.target.files?.[0] || null)} /></div>
                        <div className="space-y-1 col-span-2"><Label className="text-[10px]">Otros Archivos</Label><Input type="file" className="h-8 text-[10px]" onChange={e => setGenericFile(e.target.files?.[0] || null)} /></div>
                      </div>
                    )}
                  </div>
                )}

                {canEdit && (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleUpdateDoc} disabled={!formTitle || isUpdating}>
                      {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Cambios'}
                    </Button>
                    <Button variant="destructive" onClick={() => setShowDeleteAlert(true)}>Eliminar</Button>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-4 text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Historial de Versiones</h3>
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-4">Sin versiones.</p>
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
                            {v.url_pdf && <a href={v.url_pdf} target="_blank" className="text-primary hover:underline">PDF</a>}
                            {v.url_word && <a href={v.url_word} target="_blank" className="text-primary hover:underline">Word</a>}
                            {v.url_file && <a href={v.url_file} target="_blank" className="text-primary hover:underline">Ver</a>}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground italic truncate">"{v.description}"</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:flex flex-col border rounded-lg bg-muted/20 min-h-[400px]">
              <div className="p-3 border-b flex items-center justify-between rounded-t-lg">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Previsualización</span>
              </div>
              <div className="flex-1 flex items-center justify-center p-4">
                {currentVersion?.url_pdf ? (
                  <iframe src={currentVersion.url_pdf} className="w-full h-full rounded border shadow-sm" title="Preview" />
                ) : currentVersion?.url_file?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={currentVersion.url_file} className="max-w-full max-h-full object-contain shadow-sm" alt="Preview" />
                ) : (
                  <div className="text-center space-y-2">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">Previsualización no disponible</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará "{selectedDoc?.title}" y todas sus versiones.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); handleDeleteDoc(); }} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Edit Dialog */}
      <Dialog open={showConfirmEdit} onOpenChange={open => { if (!open && !isConfirming) { setShowConfirmEdit(false); setEditingDocForConfirm(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /> Confirmar Edición</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">El documento <strong>"{editingDocForConfirm?.title}"</strong> se abrió en Google Drive.</p>
            <div className="space-y-2"><Label>Descripción del cambio</Label><Textarea value={confirmDesc} onChange={e => setConfirmDesc(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowConfirmEdit(false); setEditingDocForConfirm(null); }} disabled={isConfirming}>Cancelar</Button>
              <Button className="flex-1" onClick={handleConfirmEdit} disabled={isConfirming}>
                {isConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...</> : 'Confirmar Versión'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
