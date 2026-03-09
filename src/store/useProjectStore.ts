import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createId } from '../lib/id';
import type {
  ProjectMeta, Feature, ScopeItem, ApiEndpoint,
  FeatureId, ScopeItemId, Priority, Milestone, ChecklistItem,
} from '../types';

interface ProjectStore {
  meta: ProjectMeta;
  features: Feature[];
  milestones: Milestone[];
  scope: ScopeItem[];
  endpoints: ApiEndpoint[];
  updateMeta: (partial: Partial<ProjectMeta>) => void;
  addFeature: (title: string, milestoneId?: string, priority?: Priority) => void;
  duplicateFeature: (id: FeatureId) => void;
  updateFeature: (id: FeatureId, partial: Partial<Omit<Feature, 'id'>>) => void;
  removeFeature: (id: FeatureId) => void;
  reorderFeatures: (activeId: string, overId: string) => void;
  addMilestone: (name: string) => string;
  updateMilestone: (id: string, partial: Partial<Omit<Milestone, 'id'>>) => void;
  removeMilestone: (id: string) => void;
  addScopeItem: (text: string, inScope: boolean) => void;
  updateScopeItem: (id: ScopeItemId, partial: Partial<Omit<ScopeItem, 'id'>>) => void;
  removeScopeItem: (id: ScopeItemId) => void;
  addEndpoint: (tag?: string) => string;
  duplicateEndpoint: (id: string) => void;
  updateEndpoint: (id: string, partial: Partial<Omit<ApiEndpoint, 'id'>>) => void;
  removeEndpoint: (id: string) => void;
  reorderEndpoints: (activeId: string, overId: string) => void;
  addChecklistItem: (featureId: FeatureId, text: string) => void;
  toggleChecklistItem: (featureId: FeatureId, itemId: string) => void;
  updateChecklistItem: (featureId: FeatureId, itemId: string, text: string) => void;
  removeChecklistItem: (featureId: FeatureId, itemId: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      meta: { name: 'Untitled Project', description: '', techStackNotes: '', notes: '' },
      features: [],
      milestones: [],
      scope: [],
      endpoints: [],

      updateMeta: (partial) =>
        set((state) => ({ meta: { ...state.meta, ...partial } })),

      addFeature: (title, milestoneId = '', priority = 'medium') =>
        set((state) => ({
          features: [
            ...state.features,
            {
              id: createId(), title, description: '', priority: priority as Priority,
              estimate: '' as const, value: '' as const, done: false, inProgress: false, entityRefs: [], milestone: milestoneId, tags: [], notes: '', blockedBy: [],
            },
          ],
        })),

      duplicateFeature: (id) =>
        set((state) => {
          const src = state.features.find((f) => f.id === id);
          if (!src) return state;
          const copy = { ...src, id: createId(), title: `${src.title} (copy)`, done: false, inProgress: false, blockedBy: [] };
          const idx = state.features.findIndex((f) => f.id === id);
          const next = [...state.features];
          next.splice(idx + 1, 0, copy);
          return { features: next };
        }),

      updateFeature: (id, partial) =>
        set((state) => ({
          features: state.features.map((f) => {
            if (f.id !== id) return f;
            const updated = { ...f, ...partial };
            // Auto-set completedAt when transitioning to done
            if (partial.done === true && !f.done) {
              updated.completedAt = new Date().toISOString().slice(0, 10);
            } else if (partial.done === false) {
              updated.completedAt = undefined;
            }
            return updated;
          }),
        })),

      removeFeature: (id) =>
        set((state) => ({
          features: state.features.filter((f) => f.id !== id),
        })),

      reorderFeatures: (activeId, overId) =>
        set((state) => {
          const items = [...state.features];
          const fromIndex = items.findIndex((f) => f.id === activeId);
          const toIndex = items.findIndex((f) => f.id === overId);
          if (fromIndex === -1 || toIndex === -1) return state;
          const [moved] = items.splice(fromIndex, 1);
          items.splice(toIndex, 0, moved);
          return { features: items };
        }),

      addMilestone: (name) => {
        const id = createId();
        set((state) => ({
          milestones: [
            ...state.milestones,
            { id, name, description: '', color: MILESTONE_COLORS[state.milestones.length % MILESTONE_COLORS.length] },
          ],
        }));
        return id;
      },

      updateMilestone: (id, partial) =>
        set((state) => ({
          milestones: state.milestones.map((m) =>
            m.id === id ? { ...m, ...partial } : m
          ),
        })),

      removeMilestone: (id) =>
        set((state) => ({
          milestones: state.milestones.filter((m) => m.id !== id),
          // Clear milestone refs from features
          features: state.features.map((f) =>
            f.milestone === id ? { ...f, milestone: '' } : f
          ),
        })),

      addScopeItem: (text, inScope) =>
        set((state) => ({
          scope: [...state.scope, { id: createId(), text, inScope }],
        })),

      updateScopeItem: (id, partial) =>
        set((state) => ({
          scope: state.scope.map((s) =>
            s.id === id ? { ...s, ...partial } : s
          ),
        })),

      removeScopeItem: (id) =>
        set((state) => ({
          scope: state.scope.filter((s) => s.id !== id),
        })),

      addEndpoint: (tag = '') => {
        const id = createId();
        set((state) => ({
          endpoints: [
            ...state.endpoints,
            {
              id, method: 'GET', path: '/api/', description: '',
              tag, entityRef: null, requestBody: '', responseBody: '',
              auth: 'none', statusCodes: '', queryParams: '', notes: '',
            } as ApiEndpoint,
          ],
        }));
        return id;
      },

      duplicateEndpoint: (id) =>
        set((state) => {
          const src = state.endpoints.find((e) => e.id === id);
          if (!src) return state;
          const copy = { ...src, id: createId() };
          const idx = state.endpoints.findIndex((e) => e.id === id);
          const next = [...state.endpoints];
          next.splice(idx + 1, 0, copy);
          return { endpoints: next };
        }),

      updateEndpoint: (id, partial) =>
        set((state) => ({
          endpoints: state.endpoints.map((e) =>
            e.id === id ? { ...e, ...partial } : e
          ),
        })),

      removeEndpoint: (id) =>
        set((state) => ({
          endpoints: state.endpoints.filter((e) => e.id !== id),
        })),

      reorderEndpoints: (activeId, overId) =>
        set((state) => {
          const from = state.endpoints.findIndex((e) => e.id === activeId);
          const to = state.endpoints.findIndex((e) => e.id === overId);
          if (from === -1 || to === -1) return state;
          const next = [...state.endpoints];
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item);
          return { endpoints: next };
        }),

      addChecklistItem: (featureId, text) =>
        set((state) => ({
          features: state.features.map((f) =>
            f.id !== featureId ? f : {
              ...f,
              checklist: [...(f.checklist ?? []), { id: createId(), text, done: false } satisfies ChecklistItem],
            }
          ),
        })),

      toggleChecklistItem: (featureId, itemId) =>
        set((state) => ({
          features: state.features.map((f) =>
            f.id !== featureId ? f : {
              ...f,
              checklist: (f.checklist ?? []).map((c) => c.id === itemId ? { ...c, done: !c.done } : c),
            }
          ),
        })),

      updateChecklistItem: (featureId, itemId, text) =>
        set((state) => ({
          features: state.features.map((f) =>
            f.id !== featureId ? f : {
              ...f,
              checklist: (f.checklist ?? []).map((c) => c.id === itemId ? { ...c, text } : c),
            }
          ),
        })),

      removeChecklistItem: (featureId, itemId) =>
        set((state) => ({
          features: state.features.map((f) =>
            f.id !== featureId ? f : {
              ...f,
              checklist: (f.checklist ?? []).filter((c) => c.id !== itemId),
            }
          ),
        })),
    }),
    {
      name: 'surplan-project',
      version: 15,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        let result = { ...state };
        if (version < 2) {
          result = {
            ...result,
            endpoints: [],
            features: ((result.features as Feature[]) || []).map((f: Feature) => {
              const raw = f as unknown as Record<string, unknown>;
              return {
                ...f,
                entityRefs: (raw.entityRefs as string[]) ?? [],
                milestone: (raw.milestone as string) ?? '',
              };
            }),
          };
        }
        if (version < 3) {
          result = { ...result, milestones: [] };
        }
        if (version < 4) {
          result = {
            ...result,
            endpoints: ((result.endpoints as ApiEndpoint[]) || []).map((e) => ({
              ...e,
              tag: (e as unknown as Record<string, unknown>).tag as string ?? '',
            })),
          };
        }
        if (version < 5) {
          result = {
            ...result,
            features: ((result.features as Feature[]) || []).map((f) => ({
              ...f,
              estimate: (f as unknown as Record<string, unknown>).estimate as string ?? '',
            })),
          };
        }
        if (version < 6) {
          result = {
            ...result,
            features: ((result.features as Feature[]) || []).map((f) => ({
              ...f,
              tags: (f as unknown as Record<string, unknown>).tags as string[] ?? [],
            })),
          };
        }
        if (version < 7) {
          result = {
            ...result,
            endpoints: ((result.endpoints as ApiEndpoint[]) || []).map((e) => ({
              ...e,
              auth: (e as unknown as Record<string, unknown>).auth ?? 'none',
              statusCodes: (e as unknown as Record<string, unknown>).statusCodes ?? '',
            })),
          };
        }
        if (version < 8) {
          result = {
            ...result,
            features: ((result.features as Feature[]) || []).map((f) => ({
              ...f,
              notes: (f as unknown as Record<string, unknown>).notes as string ?? '',
            })),
          };
        }
        if (version < 9) {
          result = {
            ...result,
            features: ((result.features as Feature[]) || []).map((f) => ({
              ...f,
              inProgress: (f as unknown as Record<string, unknown>).inProgress as boolean ?? false,
            })),
          };
        }
        if (version < 10) {
          result = {
            ...result,
            features: ((result.features as Feature[]) || []).map((f) => ({
              ...f,
              blockedBy: ((f as unknown as Record<string, unknown>).blockedBy as string[]) ?? [],
            })),
          };
        }
        // v11: dueDate is optional, no migration needed (undefined by default)
        if (version < 12) {
          result = {
            ...result,
            endpoints: ((result.endpoints as ApiEndpoint[]) || []).map((e) => ({
              ...e,
              queryParams: (e as unknown as Record<string, unknown>).queryParams as string ?? '',
              notes: (e as unknown as Record<string, unknown>).notes as string ?? '',
            })),
          };
        }
        // v13: completedAt is optional, no migration needed (undefined by default)
        // v14: sprint is optional, no migration needed (undefined by default)
        // v15: checklist is optional array, no migration needed (undefined by default)
        return result;
      },
    }
  )
);

export const MILESTONE_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#64748b',
];
