import { useEffect, useMemo, useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Pencil, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getMatchedCargoDoc } from '@/lib/cargoDocMatch';
import type { Document } from '@/types/database';
import './cargoOrganigrama.css';

const ROOT = '__root__';

interface CargoOrganigramaProps {
  depto: string;
  cargoItems: { cargo: string; archivo: string }[];
  docs: Document[];
  canEdit: boolean;
  onViewDoc: (doc: Document) => void;
}

function getDescendants(cargo: string, childrenMap: Map<string, string[]>): Set<string> {
  const result = new Set<string>();
  const stack = [...(childrenMap.get(cargo) || [])];
  while (stack.length) {
    const c = stack.pop()!;
    if (result.has(c)) continue;
    result.add(c);
    stack.push(...(childrenMap.get(c) || []));
  }
  return result;
}

export default function CargoOrganigrama({ depto, cargoItems, docs, canEdit, onViewDoc }: CargoOrganigramaProps) {
  const { user } = useAuth();
  const [parentOf, setParentOf] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [savingCargo, setSavingCargo] = useState<string | null>(null);

  const cargos = useMemo(() => cargoItems.map(i => i.cargo), [cargoItems]);
  const archivoByCargo = useMemo(
    () => new Map(cargoItems.map(i => [i.cargo, i.archivo])),
    [cargoItems]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cargo_jerarquia')
      .select('cargo, parent_cargo')
      .eq('depto', depto);
    const map = new Map<string, string | null>();
    for (const row of data || []) map.set(row.cargo, row.parent_cargo);
    setParentOf(map);
    setLoading(false);
  }, [depto]);

  useEffect(() => { load(); }, [load]);

  const cargoSet = useMemo(() => new Set(cargos), [cargos]);

  const childrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of cargos) {
      const parent = parentOf.get(c);
      const key = parent && cargoSet.has(parent) ? parent : ROOT;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [cargos, parentOf, cargoSet]);

  const roots = childrenMap.get(ROOT) || [];

  const onChangeParent = async (cargo: string, newParent: string | null) => {
    setSavingCargo(cargo);
    const { error } = await supabase.from('cargo_jerarquia').upsert(
      { depto, cargo, parent_cargo: newParent, updated_by: user?.id || null, updated_at: new Date().toISOString() },
      { onConflict: 'depto,cargo' }
    );
    if (!error) {
      setParentOf(prev => new Map(prev).set(cargo, newParent));
    }
    setSavingCargo(null);
  };

  const renderNode = (cargo: string): JSX.Element => {
    const kids = childrenMap.get(cargo) || [];
    const descendants = getDescendants(cargo, childrenMap);
    const matchedDoc = getMatchedCargoDoc(docs, archivoByCargo.get(cargo) || '', cargo, depto);
    return (
      <li key={cargo}>
        <div className="org-node-card rounded-md border bg-card px-3 py-2 shadow-sm">
          {matchedDoc ? (
            <span
              className="text-sm font-semibold text-center cursor-pointer hover:text-primary hover:underline"
              onClick={() => onViewDoc(matchedDoc)}
              title="Ver descripción de cargo"
            >
              {cargo}
            </span>
          ) : (
            <span className="text-sm font-semibold text-center">{cargo}</span>
          )}
          {editMode && (
            <Select
              value={parentOf.get(cargo) && cargoSet.has(parentOf.get(cargo)!) ? parentOf.get(cargo)! : ROOT}
              onValueChange={(v) => onChangeParent(cargo, v === ROOT ? null : v)}
              disabled={savingCargo === cargo}
            >
              <SelectTrigger className="h-7 text-[11px]">
                <SelectValue placeholder="Reporta a..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT}>— Nivel superior —</SelectItem>
                {cargos
                  .filter(c => c !== cargo && !descendants.has(c))
                  .map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {kids.length > 0 && (
          <ul>
            {kids.map(k => renderNode(k))}
          </ul>
        )}
      </li>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando organigrama...
      </div>
    );
  }

  if (cargos.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No hay cargos en este departamento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button
            variant={editMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditMode(v => !v)}
          >
            {editMode ? <Check className="h-4 w-4 mr-1.5" /> : <Pencil className="h-4 w-4 mr-1.5" />}
            {editMode ? 'Listo' : 'Editar estructura'}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-md border bg-muted/20 py-4">
        <ul className="org-chart">
          {roots.map(c => renderNode(c))}
        </ul>
      </div>
    </div>
  );
}
