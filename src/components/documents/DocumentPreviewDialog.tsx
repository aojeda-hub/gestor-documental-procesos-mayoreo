import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, ExternalLink, FileText, Download, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Document, DocumentVersion } from '@/types/database';
import { DOC_TYPE_LABELS } from '@/types/database';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: Document | null;
  canEdit: boolean;
  onEdit?: (doc: Document) => void;
}

type SourceKey = 'pdf' | 'word' | 'drive' | 'file';

interface AvailableSource {
  key: SourceKey;
  label: string;
  url: string;
  embedUrl: string;
}

/**
 * Build a Google Docs / Office viewer URL so we can preview PDF and Word
 * files inline without forcing the user to download them.
 */
function buildEmbedUrl(url: string, kind: SourceKey): string {
  if (!url) return '';

  if (kind === 'drive') {
    // Drive shareable links: convert /view to /preview when possible
    if (url.includes('drive.google.com')) {
      return url.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
    }
    return url;
  }

  if (kind === 'pdf') {
    // Native browser PDF viewer works for direct .pdf URLs
    return url;
  }

  if (kind === 'word') {
    // Office Online viewer for .doc/.docx
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }

  // Generic file: try Google Docs viewer as a best-effort
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

export default function DocumentPreviewDialog({
  open,
  onOpenChange,
  doc,
  canEdit,
  onEdit,
}: DocumentPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState<DocumentVersion | null>(null);
  const [activeSource, setActiveSource] = useState<SourceKey | null>(null);

  useEffect(() => {
    if (!open || !doc) return;
    let cancelled = false;
    setLoading(true);
    setVersion(null);
    setActiveSource(null);

    (async () => {
      const { data } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', doc.id)
        .eq('is_current', true)
        .maybeSingle();
      if (cancelled) return;
      setVersion((data as unknown as DocumentVersion) || null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, doc]);

  const sources: AvailableSource[] = [];
  if (version?.url_pdf) sources.push({ key: 'pdf', label: 'PDF', url: version.url_pdf, embedUrl: buildEmbedUrl(version.url_pdf, 'pdf') });
  if (version?.url_word && !version.url_word.includes('docs.google.com') && !version.url_word.includes('drive.google.com')) {
    sources.push({ key: 'word', label: 'Word', url: version.url_word, embedUrl: buildEmbedUrl(version.url_word, 'word') });
  }
  if ((version as any)?.drive_link || (doc as any)?.drive_link) {
    const driveUrl = ((version as any)?.drive_link || (doc as any)?.drive_link) as string;
    sources.push({ key: 'drive', label: 'Drive', url: driveUrl, embedUrl: buildEmbedUrl(driveUrl, 'drive') });
  }
  if (version?.url_file && !version.url_pdf && !version.url_word) {
    sources.push({ key: 'file', label: 'Archivo', url: version.url_file, embedUrl: buildEmbedUrl(version.url_file, 'file') });
  }

  // Pick a default source the first time the version loads
  useEffect(() => {
    if (!activeSource && sources.length > 0) {
      setActiveSource(sources[0].key);
    }
  }, [sources, activeSource]);

  const current = sources.find(s => s.key === activeSource) || sources[0] || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border/60 shrink-0">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base truncate">{doc?.title || 'Vista previa'}</DialogTitle>
              {doc && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {DOC_TYPE_LABELS[doc.doc_type]}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canEdit && doc && onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(doc);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                </Button>
              )}
              {current && (
                <Button size="sm" variant="outline" asChild>
                  <a href={current.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir
                  </a>
                </Button>
              )}
              {current && current.key !== 'drive' && (
                <Button size="sm" asChild>
                  <a href={current.url} download>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Descargar
                  </a>
                </Button>
              )}
            </div>
          </div>

          {sources.length > 1 && (
            <Tabs
              value={activeSource || sources[0].key}
              onValueChange={(v) => setActiveSource(v as SourceKey)}
              className="mt-3"
            >
              <TabsList className="h-8">
                {sources.map(s => (
                  <TabsTrigger key={s.key} value={s.key} className="text-xs h-6 px-3">
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/30 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !current ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No hay archivo disponible para previsualizar este documento.
              </p>
              {canEdit && doc && onEdit && (
                <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onEdit(doc); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Subir archivo
                </Button>
              )}
            </div>
          ) : (
            <iframe
              key={current.embedUrl}
              src={current.embedUrl}
              title={`Vista previa - ${doc?.title}`}
              className="w-full h-full border-0 bg-background"
              allow="autoplay"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
