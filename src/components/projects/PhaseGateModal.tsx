import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle2, AlertTriangle, Paperclip, MessageSquare, ExternalLink, Trash2, Check } from 'lucide-react';
import type { PhaseGateItem } from '@/types/database';

interface PhaseGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  fase: string;
  items: PhaseGateItem[];
  allTasksCompleted: boolean;
  onItemUpdated: () => void;
  onConfirmClosePhase: () => void;
}

export function PhaseGateModal({
  open,
  onOpenChange,
  projectId,
  projectName,
  fase,
  items,
  allTasksCompleted,
  onItemUpdated,
  onConfirmClosePhase,
}: PhaseGateModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedItemForUpload, setSelectedItemForUpload] = useState<string | null>(null);

  // Filter items for current phase
  const phaseItems = items.filter(i => i.fase === fase);
  const itemsPendientes = phaseItems.filter(i => !i.completado);
  const completedCount = phaseItems.filter(i => i.completado).length;
  const isAllChecklistComplete = phaseItems.length > 0 && completedCount === phaseItems.length;

  const toggleItem = async (item: PhaseGateItem) => {
    try {
      const newStatus = !item.completado;
      let userName = user?.email || 'Usuario';
      // Attempt to get user full name if available
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', user.id)
          .single();
        if (profile?.full_name) userName = profile.full_name;
        else if (profile?.email) userName = profile.email;
      }

      const patch: any = {
        completado: newStatus,
        fecha_completado: newStatus ? new Date().toISOString() : null,
        usuario_completado: newStatus ? userName : null,
      };

      const { error } = await supabase
        .from('phase_gate_checklist')
        .update(patch)
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: newStatus ? 'Item completado' : 'Item marcado pendiente',
        description: item.item,
      });

      onItemUpdated();
    } catch (err: any) {
      toast({ title: 'Error al actualizar item', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveComment = async (item: PhaseGateItem) => {
    try {
      const { error } = await supabase
        .from('phase_gate_checklist')
        .update({ comentario: commentText.trim() || null })
        .eq('id', item.id);

      if (error) throw error;

      toast({ title: 'Comentario guardado' });
      setActiveCommentId(null);
      setCommentText('');
      onItemUpdated();
    } catch (err: any) {
      toast({ title: 'Error al guardar comentario', description: err.message, variant: 'destructive' });
    }
  };

  const triggerUpload = (itemId: string) => {
    setSelectedItemForUpload(itemId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedItemForUpload) return;

    setUploadingItemId(selectedItemForUpload);
    try {
      const fileExt = file.name.split('.').pop();
      const path = `phase-gate-evidence/${projectId}/${selectedItemForUpload}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('project-documents')
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      // Get public or signed URL
      const { data: urlData } = supabase.storage
        .from('project-documents')
        .getPublicUrl(path);

      const evidenciaUrl = urlData.publicUrl;

      const { error: updateErr } = await supabase
        .from('phase_gate_checklist')
        .update({ evidencia_url: evidenciaUrl })
        .eq('id', selectedItemForUpload);

      if (updateErr) throw updateErr;

      toast({ title: 'Evidencia subida con éxito' });
      onItemUpdated();
    } catch (err: any) {
      toast({ title: 'Error al subir evidencia', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingItemId(null);
      setSelectedItemForUpload(null);
    }
  };

  const handleRemoveEvidence = async (item: PhaseGateItem) => {
    try {
      const { error } = await supabase
        .from('phase_gate_checklist')
        .update({ evidencia_url: null })
        .eq('id', item.id);

      if (error) throw error;
      toast({ title: 'Evidencia eliminada' });
      onItemUpdated();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const markAllComplete = async () => {
    try {
      let userName = user?.email || 'Usuario';
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', user.id)
          .single();
        if (profile?.full_name) userName = profile.full_name;
      }

      const itemIds = phaseItems.map(i => i.id);
      const { error } = await supabase
        .from('phase_gate_checklist')
        .update({
          completado: true,
          fecha_completado: new Date().toISOString(),
          usuario_completado: userName,
        })
        .in('id', itemIds);

      if (error) throw error;
      toast({ title: 'Todos los ítems marcados como completados' });
      onItemUpdated();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span>📋 PHASE GATE - {fase}</span>
            <Badge variant="outline" className="ml-auto">
              {completedCount}/{phaseItems.length} completados
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Proyecto: <span className="font-semibold">{projectName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file input for evidence */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />

        <div className="flex-1 overflow-y-auto space-y-4 py-3 px-1">
          {/* Warning / Success Banner */}
          {!allTasksCompleted ? (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50/50 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">⚠️ Tareas pendientes en esta fase</p>
                <p>Todas las tareas asociadas a la fase &quot;{fase}&quot; deben estar al 100% de avance para poder cerrar la fase.</p>
              </div>
            </div>
          ) : !isAllChecklistComplete ? (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">⚠️ Phase Gate Incompleto</p>
                <p>Faltan {itemsPendientes.length} ítems por completar para cerrar la fase &quot;{fase}&quot;.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">✅ Phase Gate completado</p>
                <p>Todos los requisitos han sido cumplidos. Ahora puedes cerrar esta fase y avanzar a la siguiente.</p>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span>Progreso del Checklist:</span>
              <span>{Math.round((completedCount / (phaseItems.length || 1)) * 100)}%</span>
            </div>
            <Progress value={(completedCount / (phaseItems.length || 1)) * 100} className="h-2" />
          </div>

          {/* Checklist Items */}
          <div className="space-y-2 pt-2">
            {phaseItems.map((item, idx) => {
              const isCommentEditing = activeCommentId === item.id;
              const isConstruccionTasksItem =
                fase === 'Construcción' && item.item.includes('Todas las tareas');

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border transition-all ${
                    item.completado
                      ? 'bg-emerald-500/5 border-emerald-200 dark:border-emerald-900/40'
                      : 'bg-card border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`chk-${item.id}`}
                      checked={item.completado}
                      onCheckedChange={() => toggleItem(item)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={`chk-${item.id}`}
                        className={`text-sm font-medium leading-tight cursor-pointer select-none ${
                          item.completado ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {idx + 1}. {item.item}
                      </label>

                      {isConstruccionTasksItem && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          {allTasksCompleted ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <Check className="h-3 w-3" /> Tareas al 100% de la fase verificadas
                            </span>
                          ) : (
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Faltan tareas por completar al 100%
                            </span>
                          )}
                        </div>
                      )}

                      {/* Metadata: User & Date */}
                      {item.completado && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-2 pt-0.5">
                          <span>Completado por: <strong>{item.usuario_completado || 'Usuario'}</strong></span>
                          {item.fecha_completado && (
                            <span>
                              el {new Date(item.fecha_completado).toLocaleDateString()} {new Date(item.fecha_completado).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Evidence & Comment Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {/* Subir Evidencia Button */}
                        <Button
                          size="sm"
                          variant={item.evidencia_url ? 'secondary' : 'outline'}
                          onClick={() => triggerUpload(item.id)}
                          disabled={uploadingItemId === item.id}
                          className="h-7 text-xs px-2.5 gap-1.5"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          <span>{uploadingItemId === item.id ? 'Subiendo...' : item.evidencia_url ? 'Cambiar evidencia' : 'Subir evidencia'}</span>
                        </Button>

                        {/* View Evidence Link */}
                        {item.evidencia_url && (
                          <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs">
                            <a
                              href={item.evidencia_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 font-medium"
                            >
                              Ver archivo <ExternalLink className="h-3 w-3" />
                            </a>
                            <button
                              onClick={() => handleRemoveEvidence(item)}
                              className="text-muted-foreground hover:text-red-500 ml-1"
                              title="Eliminar evidencia"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {/* Comment Button */}
                        <Button
                          size="sm"
                          variant={item.comentario ? 'secondary' : 'outline'}
                          onClick={() => {
                            if (isCommentEditing) {
                              setActiveCommentId(null);
                            } else {
                              setActiveCommentId(item.id);
                              setCommentText(item.comentario || '');
                            }
                          }}
                          className="h-7 text-xs px-2.5 gap-1.5"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{item.comentario ? 'Editar comentario' : 'Agregar comentario'}</span>
                        </Button>
                      </div>

                      {/* Display Comment */}
                      {item.comentario && !isCommentEditing && (
                        <div className="bg-muted/40 p-2 rounded text-xs italic text-muted-foreground mt-1 border-l-2 border-primary/40">
                          💬 &quot;{item.comentario}&quot;
                        </div>
                      )}

                      {/* Comment Editor */}
                      {isCommentEditing && (
                        <div className="space-y-2 pt-2 border-t mt-2">
                          <Textarea
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            placeholder="Escribe una observación o detalle sobre este ítem..."
                            className="text-xs min-h-[60px]"
                          />
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setActiveCommentId(null)}
                              className="h-7 text-xs"
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveComment(item)}
                              className="h-7 text-xs"
                            >
                              Guardar Comentario
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={markAllComplete}
            className="text-xs"
          >
            Completar todos los ítems
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={onConfirmClosePhase}
              disabled={!allTasksCompleted || !isAllChecklistComplete}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Cerrar Fase
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
