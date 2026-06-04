import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { SILO_LABELS } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface Props {
  title: string;
  description?: string;
  onExport: (silo: string) => Promise<void>;
}

export function ExportPDFDialog({ title, description, onExport }: Props) {
  const [open, setOpen] = useState(false);
  const [silo, setSilo] = useState('all');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      await onExport(silo);
      toast({ title: 'PDF generado', description: 'La descarga ha comenzado.' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Error al generar PDF', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Descargar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Silo</Label>
          <Select value={silo} onValueChange={setSilo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los silos</SelectItem>
              {Object.entries(SILO_LABELS).filter(([k]) => k !== 'sinsilo').map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Generar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
