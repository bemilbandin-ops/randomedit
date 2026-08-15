import { useEffect, useState } from 'react';

const LOCAL_STORAGE_SYNC_EVENT = 'randomedit:local-storage-sync';

interface LocalStorageSyncDetail<T> {
  key: string;
  value: T;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent<LocalStorageSyncDetail<T>>).detail;
      if (!detail || detail.key !== key) return;
      setValue((current) => (
        JSON.stringify(current) === JSON.stringify(detail.value) ? current : detail.value
      ));
    };

    window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(LOCAL_STORAGE_SYNC_EVENT, handleSync);
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent<LocalStorageSyncDetail<T>>(LOCAL_STORAGE_SYNC_EVENT, {
        detail: { key, value },
      }));
    } catch {
      // Storage can be unavailable in privacy modes. The app still works in memory.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
