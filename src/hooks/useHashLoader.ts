import { useState, useEffect, useRef } from 'react';
import { decodeHashToState } from '../lib/sharing';
import type { BackupData } from '../lib/backup';

export function useHashLoader() {
  const [sharedData, setSharedData] = useState<BackupData | null>(null);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const hash = window.location.hash.slice(1); // strip leading #
    if (!hash.startsWith('sp1')) return;

    const data = decodeHashToState(hash);
    if (!data) return;

    // Strip hash from URL so it doesn't re-trigger on refresh
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    setSharedData(data);
  }, []);

  const clearSharedData = () => setSharedData(null);

  return { sharedData, clearSharedData };
}
