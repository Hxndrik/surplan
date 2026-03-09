import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createId } from '../lib/id';
import { useEntityStore } from './useEntityStore';
import { useProjectStore } from './useProjectStore';
import { useHistoryStore } from './useHistoryStore';
import type { Entity, Feature, ScopeItem, ApiEndpoint, ProjectMeta, Milestone } from '../types';

export interface ProjectEntry {
  id: string;
  name: string;
  createdAt: number;
}

interface ProjectSnapshot {
  entities: Entity[];
  meta: ProjectMeta;
  features: Feature[];
  milestones: Milestone[];
  scope: ScopeItem[];
  endpoints: ApiEndpoint[];
}

interface ProjectsStore {
  projects: ProjectEntry[];
  activeProjectId: string;
  createProject: (name?: string) => void;
  deleteProject: (id: string) => void;
  switchProject: (id: string) => void;
  syncActiveProjectName: () => void;
}

function captureSnapshot(): ProjectSnapshot {
  const es = useEntityStore.getState();
  const ps = useProjectStore.getState();
  return {
    entities: es.entities,
    meta: ps.meta,
    features: ps.features,
    milestones: ps.milestones,
    scope: ps.scope,
    endpoints: ps.endpoints,
  };
}

function applySnapshot(snap: ProjectSnapshot | null) {
  const data = snap ?? {
    entities: [],
    meta: { name: 'Untitled Project', description: '', techStackNotes: '', notes: '' },
    features: [],
    milestones: [],
    scope: [],
    endpoints: [],
  };
  useEntityStore.setState({ entities: data.entities });
  useProjectStore.setState({
    meta: { ...data.meta },
    features: data.features,
    milestones: data.milestones ?? [],
    scope: data.scope,
    endpoints: data.endpoints,
  });
}

function saveSnap(projectId: string, snap: ProjectSnapshot) {
  localStorage.setItem(`surplan-snap-${projectId}`, JSON.stringify(snap));
}

function loadSnap(projectId: string): ProjectSnapshot | null {
  const raw = localStorage.getItem(`surplan-snap-${projectId}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export const useProjectsStore = create<ProjectsStore>()(
  persist(
    (set, get) => ({
      projects: [{ id: 'default', name: 'Untitled Project', createdAt: Date.now() }],
      activeProjectId: 'default',

      createProject: (name = 'New Project') => {
        const { activeProjectId } = get();
        const id = createId();

        const snap = captureSnapshot();
        saveSnap(activeProjectId, snap);

        set((s) => ({
          projects: [
            ...s.projects.map((p) =>
              p.id === activeProjectId ? { ...p, name: snap.meta.name } : p
            ),
            { id, name, createdAt: Date.now() },
          ],
          activeProjectId: id,
        }));

        useHistoryStore.setState({ isReverting: true, past: [], future: [] });
        applySnapshot({
          entities: [],
          meta: { name, description: '', techStackNotes: '', notes: '' },
          features: [],
          milestones: [],
          scope: [],
          endpoints: [],
        });
        Promise.resolve().then(() => useHistoryStore.setState({ isReverting: false }));
      },

      deleteProject: (id) => {
        const { projects, activeProjectId } = get();
        if (projects.length <= 1) return;

        localStorage.removeItem(`surplan-snap-${id}`);

        const remaining = projects.filter((p) => p.id !== id);
        const newActiveId = activeProjectId === id ? remaining[0].id : activeProjectId;

        set({ projects: remaining, activeProjectId: newActiveId });

        if (activeProjectId === id) {
          useHistoryStore.setState({ isReverting: true, past: [], future: [] });
          applySnapshot(loadSnap(newActiveId));
          Promise.resolve().then(() => useHistoryStore.setState({ isReverting: false }));
        }
      },

      switchProject: (id) => {
        const { activeProjectId } = get();
        if (id === activeProjectId) return;

        const snap = captureSnapshot();
        saveSnap(activeProjectId, snap);

        set((s) => ({
          activeProjectId: id,
          projects: s.projects.map((p) =>
            p.id === activeProjectId ? { ...p, name: snap.meta.name } : p
          ),
        }));

        useHistoryStore.setState({ isReverting: true, past: [], future: [] });
        applySnapshot(loadSnap(id));
        Promise.resolve().then(() => useHistoryStore.setState({ isReverting: false }));
      },

      syncActiveProjectName: () => {
        const { activeProjectId } = get();
        const name = useProjectStore.getState().meta.name;
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === activeProjectId ? { ...p, name } : p
          ),
        }));
      },
    }),
    { name: 'surplan-projects' }
  )
);
