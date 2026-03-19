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
import { Plus, FileText, Upload, Eye, Lock, Unlock, ChevronDown, ChevronRight } from 'lucide-react';
import type { Document, DocumentVersion, DocType, SiloType } from '@/types/database';
import { DOC_TYPE_LABELS, SILO_LABELS } from '@/types/database';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Documents() {
  const { user, hasRole } = useAuth();
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

  // Version form
  const [vDesc, setVDesc] = useState('');
  const [vAuthors, setVAuthors] = useState('');
  const [vApprover, setVApprover] = useState('');
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

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
    const { error } = await supabase.from('documents').insert({
      title: formTitle, doc_type: formType, silo: formSilo, confidential: formConfidential, created_by: user?.id,
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Documento creado' });
    setShowCreate(false);
    setFormTitle('');
    fetchDocs();
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
      setWordFile(null); setPdfFile(null);
      fetchVersions(selectedDocId);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nuevo Documento</Button>
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
                <Button className="w-full" onClick={handleCreateDoc} disabled={!formTitle}>Crear Documento</Button>
              </div>
            </DialogContent>
          </Dialog>
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
                <TableHead></TableHead>
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
                    <TableCell>
                      {canEdit && (
                        <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setSelectedDocId(doc.id); setShowVersionDialog(true); }}>
                          <Upload className="mr-1 h-3 w-3" /> Versión
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedDoc === doc.id && (
                    <TableRow key={`${doc.id}-versions`}>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
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
          <DialogHeader><DialogTitle>Nueva Versión</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descripción del cambio</Label>
              <Textarea value={vDesc} onChange={e => setVDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Autores</Label>
                <Input value={vAuthors} onChange={e => setVAuthors(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Aprobador</Label>
                <Input value={vApprover} onChange={e => setVApprover(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Archivo Word</Label>
                <Input type="file" accept=".doc,.docx" onChange={e => setWordFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-2">
                <Label>Archivo PDF</Label>
                <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreateVersion}>Guardar Versión</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
