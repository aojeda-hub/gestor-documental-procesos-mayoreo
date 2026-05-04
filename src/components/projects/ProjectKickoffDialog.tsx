import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Download, FileArchive, Paperclip, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Project } from '@/types/database';

interface ProjectKickoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSave: () => void;
}

const AGENDA_ITEMS = [
  { id: 'obj', label: 'Presentación del objetivo general' },
  { id: 'scope', label: 'Revisión de alcance (qué sí / qué no)' },
  { id: 'chrono', label: 'Mostrar cronograma de alto nivel' },
  { id: 'roles', label: 'Definir roles y responsabilidades' },
  { id: 'comm', label: 'Acordar canales de comunicación' },
  { id: 'risks', label: 'Establecer riesgos iniciales' },
  { id: 'steps', label: 'Definir próximos pasos (acciones inmediatas)' },
];

export function ProjectKickoffDialog({ open, onOpenChange, project, onSave }: ProjectKickoffDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({
    date: '',
    time: '',
    duration: '',
    location: '',
    leader: project.responsible || '',
    sponsor: '',
    team: [],
    stakeholders: [],
    agenda: {},
    others: '',
    agreements: '',
    next_steps: '',
    attachments: [] // List of { name: string, url: string }
  });

  const [newMember, setNewMember] = useState('');
  const [newStakeholder, setNewStakeholder] = useState('');

  useEffect(() => {
    if (open && project.kickoff_data) {
      setData({ ...data, ...project.kickoff_data, leader: data.leader || project.responsible });
    }
  }, [open, project]);

  const save = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ kickoff_data: data })
        .eq('id', project.id);

      if (error) throw error;
      toast({ title: 'Datos del Kickoff guardados' });
      onSave();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addItem = (field: 'team' | 'stakeholders', value: string, setter: any) => {
    if (!value.trim()) return;
    setData({ ...data, [field]: [...data[field], value.trim()] });
    setter('');
  };

  const removeItem = (field: 'team' | 'stakeholders', index: number) => {
    const newList = [...data[field]];
    newList.splice(index, 1);
    setData({ ...data, [field]: newList });
  };

  const toggleAgenda = (id: string) => {
    setData({
      ...data,
      agenda: { ...data.agenda, [id]: !data.agenda[id] }
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text(`Acta de Kickoff - ${project.name}`, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, pageWidth - 20, 30, { align: 'right' });

    // General Info
    autoTable(doc, {
      startY: 40,
      head: [['Información del Proyecto', '']],
      body: [
        ['Nombre:', project.name],
        ['Responsable:', project.responsible || '-'],
        ['Fechas:', `${project.start_date || '-'} a ${project.end_date || '-'}`],
        ['Silo:', project.silo],
      ],
      theme: 'striped',
      headStyles: { fillColor: [240, 240, 240], textColor: 50 }
    });

    // Kickoff Details
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Detalles del Kickoff', '']],
      body: [
        ['Fecha/Hora:', `${data.date || '-'} ${data.time || '-'}`],
        ['Lugar:', data.location || '-'],
        ['Líder:', data.leader || '-'],
        ['Sponsor:', data.sponsor || '-'],
        ['Duración:', `${data.duration || '-'} horas`],
      ],
      theme: 'grid'
    });

    // Participants
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Equipo Clave', 'Stakeholders']],
      body: [
        [data.team.join(', ') || '-', data.stakeholders.join(', ') || '-']
      ],
    });

    // Agenda Checklist
    doc.setFontSize(14);
    doc.text('Agenda Tratada', 14, (doc as any).lastAutoTable.finalY + 15);
    let agendaY = (doc as any).lastAutoTable.finalY + 20;
    AGENDA_ITEMS.forEach(item => {
      const checked = data.agenda[item.id] ? '[X]' : '[ ]';
      doc.setFontSize(11);
      doc.text(`${checked} ${item.label}`, 14, agendaY);
      agendaY += 7;
    });

    if (data.others) {
      doc.text('Otros temas:', 14, agendaY + 5);
      doc.setFontSize(10);
      doc.text(data.others, 14, agendaY + 12, { maxWidth: pageWidth - 28 });
      agendaY += 25;
    }

    // Agreements & Next Steps
    autoTable(doc, {
      startY: agendaY + 10,
      head: [['Acuerdos Principales', 'Próximos Pasos']],
      body: [
        [data.agreements || '-', data.next_steps || '-']
      ],
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } }
    });

    // Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 40;
    doc.line(30, finalY, 90, finalY);
    doc.text('Firma Líder', 45, finalY + 5);
    
    doc.line(120, finalY, 180, finalY);
    doc.text('Firma Sponsor', 135, finalY + 5);

    return doc;
  };

  const downloadPDF = () => {
    const doc = generatePDF();
    doc.save(`Acta_Kickoff_${project.name.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadZIP = async () => {
    const zip = new JSZip();
    const doc = generatePDF();
    const pdfBlob = doc.output('blob');
    
    zip.file(`Acta_Kickoff_${project.name}.pdf`, pdfBlob);
    
    // Add attachments if any (mocking download if they are URLs)
    // For now, just adding a dummy readme if no attachments
    if (data.attachments.length === 0) {
      zip.file("nota.txt", "No se adjuntaron archivos adicionales.");
    }
    
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `Kickoff_${project.name}.zip`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center pr-8">
            <DialogTitle className="text-2xl font-bold">Configuración de Kickoff</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadPDF} className="text-blue-600 border-blue-200">
                <Download className="mr-2 h-4 w-4" /> Acta (PDF)
              </Button>
              <Button variant="outline" size="sm" onClick={downloadZIP} className="text-purple-600 border-purple-200">
                <FileArchive className="mr-2 h-4 w-4" /> Todo (ZIP)
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-8 py-6">
          {/* Left Column: Details */}
          <div className="space-y-6">
            <section className="space-y-4 bg-muted/30 p-4 rounded-xl border">
              <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                Logística
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={data.date} onChange={e => setData({...data, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input type="time" value={data.time} onChange={e => setData({...data, time: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Duración (Horas)</Label>
                  <Input type="number" value={data.duration} onChange={e => setData({...data, duration: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Lugar / Enlace</Label>
                  <Input value={data.location} onChange={e => setData({...data, location: e.target.value})} />
                </div>
              </div>
            </section>

            <section className="space-y-4 bg-muted/30 p-4 rounded-xl border">
              <h3 className="font-semibold text-lg border-b pb-2">Equipo Clave</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Líder del Proyecto</Label>
                  <Input value={data.leader} onChange={e => setData({...data, leader: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Sponsor</Label>
                  <Input value={data.sponsor} onChange={e => setData({...data, sponsor: e.target.value})} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Equipo (Integrantes)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={newMember} 
                    onChange={e => setNewMember(e.target.value)} 
                    placeholder="Nombre del integrante..."
                    onKeyDown={e => e.key === 'Enter' && addItem('team', newMember, setNewMember)}
                  />
                  <Button size="icon" onClick={() => addItem('team', newMember, setNewMember)}><Plus className="h-4 w-4"/></Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.team.map((m: string, i: number) => (
                    <span key={i} className="bg-white border rounded-full px-3 py-1 text-sm flex items-center gap-2 shadow-sm">
                      {m} <X className="h-3 w-3 cursor-pointer text-red-500" onClick={() => removeItem('team', i)} />
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4 bg-muted/30 p-4 rounded-xl border">
              <h3 className="font-semibold text-lg border-b pb-2">Stakeholders</h3>
              <div className="flex gap-2">
                <Input 
                  value={newStakeholder} 
                  onChange={e => setNewStakeholder(e.target.value)} 
                  placeholder="Ej: Director TI..."
                  onKeyDown={e => e.key === 'Enter' && addItem('stakeholders', newStakeholder, setNewStakeholder)}
                />
                <Button size="icon" onClick={() => addItem('stakeholders', newStakeholder, setNewStakeholder)}><Plus className="h-4 w-4"/></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.stakeholders.map((s: string, i: number) => (
                  <span key={i} className="bg-slate-100 border rounded-full px-3 py-1 text-sm flex items-center gap-2">
                    {s} <X className="h-3 w-3 cursor-pointer text-red-500" onClick={() => removeItem('stakeholders', i)} />
                  </span>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Agenda & Steps */}
          <div className="space-y-6">
            <section className="space-y-4 bg-muted/30 p-4 rounded-xl border">
              <h3 className="font-semibold text-lg border-b pb-2">Agenda del Kickoff</h3>
              <div className="space-y-3">
                {AGENDA_ITEMS.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <Checkbox id={item.id} checked={data.agenda[item.id]} onCheckedChange={() => toggleAgenda(item.id)} />
                    <Label htmlFor={item.id} className="cursor-pointer text-sm">{item.label}</Label>
                  </div>
                ))}
              </div>
              <div className="space-y-2 mt-4">
                <Label>Otros temas tratados</Label>
                <Textarea 
                  value={data.others} 
                  onChange={e => setData({...data, others: e.target.value})} 
                  placeholder="Detalles adicionales..."
                  className="h-20"
                />
              </div>
            </section>

            <section className="space-y-4 bg-muted/30 p-4 rounded-xl border">
              <h3 className="font-semibold text-lg border-b pb-2">Resultados</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Acuerdos Principales</Label>
                  <Textarea 
                    value={data.agreements} 
                    onChange={e => setData({...data, agreements: e.target.value})} 
                    className="h-24"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Próximos Pasos / Acciones Inmediatas</Label>
                  <Textarea 
                    value={data.next_steps} 
                    onChange={e => setData({...data, next_steps: e.target.value})} 
                    className="h-24"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? 'Guardando...' : 'Guardar Datos de Kickoff'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
