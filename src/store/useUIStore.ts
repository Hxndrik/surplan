import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActiveTab, EntityId, ColumnId, Column } from '../types';

export type ColumnClipboard = Omit<Column, 'id' | 'order'>;
export type Theme = 'dark' | 'light' | 'system';

interface UIStore {
  activeTab: ActiveTab;
  selectedEntityId: EntityId | null;
  editingColumnId: ColumnId | null;
  columnClipboard: ColumnClipboard | null;
  erdPositions: Record<string, { x: number; y: number }>;
  theme: Theme;
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedEntity: (id: EntityId | null) => void;
  setEditingColumn: (id: ColumnId | null) => void;
  setColumnClipboard: (col: ColumnClipboard | null) => void;
  setErdPositions: (positions: Record<string, { x: number; y: number }>) => void;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      activeTab: 'entities',
      selectedEntityId: null,
      editingColumnId: null,
      columnClipboard: null,
      erdPositions: {},
      theme: 'system',
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedEntity: (id) => set({ selectedEntityId: id }),
      setEditingColumn: (id) => set({ editingColumnId: id }),
      setColumnClipboard: (col) => set({ columnClipboard: col }),
      setErdPositions: (positions) => set({ erdPositions: positions }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'surplan-ui',
      version: 4,
      migrate: (state, version) => {
        const result = state as Record<string, unknown>;
        if (version < 2) {
          return { ...result, erdPositions: {} };
        }
        if (version < 3) {
          return { ...result, theme: 'system' };
        }
        if (version < 4) {
          return { ...result, theme: 'system' };
        }
        return result;
      },
      partialize: (state) => ({
        activeTab: state.activeTab,
        erdPositions: state.erdPositions,
        theme: state.theme,
      }),
    }
  )
);
