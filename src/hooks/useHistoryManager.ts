import { useEffect, useRef } from 'react';
import { useEntityStore } from '../store/useEntityStore';
import { useProjectStore } from '../store/useProjectStore';
import {
  useHistoryStore,
  captureHistorySnapshot,
  type HistorySnapshot,
} from '../store/useHistoryStore';

const DEBOUNCE_MS = 500;

export function useHistoryManager() {
  const lastSnapshotRef = useRef<HistorySnapshot>(captureHistorySnapshot());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const record = () => {
      if (useHistoryStore.getState().isReverting) return;

      const prev = lastSnapshotRef.current;
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        if (useHistoryStore.getState().isReverting) return;

        const current = captureHistorySnapshot();
        // Only push if state actually changed (shallow check on serialization)
        const prevStr = JSON.stringify(prev);
        const curStr = JSON.stringify(current);
        if (prevStr !== curStr) {
          useHistoryStore.getState().push(prev);
          lastSnapshotRef.current = current;
        }
      }, DEBOUNCE_MS);
    };

    const unsub1 = useEntityStore.subscribe(record);
    const unsub2 = useProjectStore.subscribe(record);

    return () => {
      unsub1();
      unsub2();
      clearTimeout(timeout);
    };
  }, []);

  // Sync lastSnapshot when project is switched externally
  useEffect(() => {
    const unsub = useHistoryStore.subscribe((state) => {
      if (state.isReverting) {
        // After reverting, update our ref to the new current state
        Promise.resolve().then(() => {
          lastSnapshotRef.current = captureHistorySnapshot();
        });
      }
    });
    return unsub;
  }, []);
}
