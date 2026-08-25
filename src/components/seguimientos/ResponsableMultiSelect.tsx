import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserDirectoryEntry } from '@/hooks/useUserDirectory';

interface ResponsableMultiSelectProps {
  directory: UserDirectoryEntry[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

export function ResponsableMultiSelect({ directory, value, onChange, placeholder = 'Selecciona responsables...' }: ResponsableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = directory.filter((u) => value.includes(u.user_id));

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            <span className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}>
              {selected.length > 0 ? `${selected.length} seleccionado${selected.length !== 1 ? 's' : ''}` : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar usuario..." />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {directory.map((u) => (
                  <CommandItem key={u.user_id} value={u.full_name} onSelect={() => toggle(u.user_id)}>
                    <Check className={cn('mr-2 h-4 w-4', value.includes(u.user_id) ? 'opacity-100' : 'opacity-0')} />
                    {u.full_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <Badge key={u.user_id} variant="secondary" className="gap-1">
              <User className="h-3 w-3" />{u.full_name}
              <button type="button" onClick={() => toggle(u.user_id)} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
