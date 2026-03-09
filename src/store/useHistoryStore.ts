import { create } from 'zustand';
import { useEntityStore } from './useEntityStore';
import { useProjectStore } from './useProjectStore';
import { useFrontendStore, DEFAULT_DESIGN_TOKENS } from './useFrontendStore';
import type { Entity, Feature, ScopeItem, ApiEndpoint, ProjectMeta, Milestone, Page, UIComponent, DesignTokens } from '../types';

const MAX_HISTORY = 50;

export interface HistorySnapshot {
  entities: Entity[];
  meta: ProjectMeta;
  features: Feature[];
  milestones: Milestone[];
  scope: ScopeItem[];
  endpoints: ApiEndpoint[];
  pages: Page[];
  components: UIComponent[];
  designTokens: DesignTokens;
}

interface HistoryStore {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  isReverting: boolean;
  push: (snapshot: HistorySnapshot) => void;
  undo: () => void;
  redo: () => void;
}

export function captureHistorySnapshot(): HistorySnapshot {
  const es = useEntityStore.getState();
  const ps = useProjectStore.getState();
  const fs = useFrontendStore.getState();
  return {
    entities: es.entities,
    meta: ps.meta,
    features: ps.features,
    milestones: ps.milestones,
    scope: ps.scope,
    endpoints: ps.endpoints,
    pages: fs.pages,
    components: fs.components,
    designTokens: fs.designTokens,
  };
}

function applyHistorySnapshot(snap: HistorySnapshot) {
  useEntityStore.setState({ entities: snap.entities });
  useProjectStore.setState({
    meta: snap.meta,
    features: snap.features,
    milestones: snap.milestones ?? [],
    scope: snap.scope,
    endpoints: snap.endpoints,
  });
  useFrontendStore.setState({
    pages: snap.pages ?? [],
    components: snap.components ?? [],
    designTokens: snap.designTokens ?? DEFAULT_DESIGN_TOKENS,
  });
}

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  past: [],
  future: [],
  isReverting: false,

  push: (snapshot) => {
    set((s) => ({
      past: [...s.past.slice(-MAX_HISTORY + 1), snapshot],
      future: [],
    }));
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return;

    set({ isReverting: true });

    const prev = past[past.length - 1];
    const current = captureHistorySnapshot();

    applyHistorySnapshot(prev);

    set((s) => ({
      past: s.past.slice(0, -1),
      future: [current, ...s.future],
    }));

    Promise.resolve().then(() =>
      useHistoryStore.setState({ isReverting: false })
    );
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return;

    set({ isReverting: true });

    const next = future[0];
    const current = captureHistorySnapshot();

    applyHistorySnapshot(next);

    set((s) => ({
      past: [...s.past, current],
      future: s.future.slice(1),
    }));

    Promise.resolve().then(() =>
      useHistoryStore.setState({ isReverting: false })
    );
  },
}));
