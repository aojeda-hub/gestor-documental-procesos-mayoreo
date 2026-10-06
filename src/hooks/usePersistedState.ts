import { useEffect, useState } from 'react';

// useState que persiste el valor en localStorage para que sobreviva a un refresco de página.
export function usePersistedState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Almacenamiento no disponible: se ignora y el estado sigue funcionando en memoria.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
