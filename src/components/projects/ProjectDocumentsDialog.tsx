import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Download, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Doc {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

const sanitize = (n: string) =>
  n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');

const formatSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export function ProjectDocumentsDialog({ open, onOpenChange, projectId, projectName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_documents' as any)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setDocs((data as any[] as Doc[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (open && projectId) load(); }, [open, projectId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = `${projectId}/${Date.now()}_${sanitize(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from('project-documents')
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from('project_documents' as any).insert({
        project_id: projectId,
        name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;

      toast({ title: 'Documento subido' });
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDownload = async (doc: Doc) => {
    const { data, error } = await supabase.storage
      .from('project-documents')
      .createSignedUrl(doc.file_path, 60);
    if (error || !data) {
      toast({ title: 'Error', description: error?.message || 'No se pudo abrir', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return;
    await supabase.storage.from('project-documents').remove([doc.file_path]);
    const { error } = await supabase.from('project_documents' as any).delete().eq('id', doc.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Documento eliminado' });
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Documentos de soporte — {projectName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {docs.length} {docs.length === 1 ? 'documento' : 'documentos'}
            </p>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading} size="sm">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Subir documento
            </Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
            ) : docs.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-md">
                Sin documentos. Sube el primero.
              </div>
            ) : (
              docs.map(d => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-3 rounded-md border hover:border-primary/50 transition-colors"
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatSize(d.file_size)} · {format(new Date(d.created_at), 'd MMM yyyy, HH:mm')}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleDownload(d)} title="Descargar">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-rose-500"
                    onClick={() => handleDelete(d)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
