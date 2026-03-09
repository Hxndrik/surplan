import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createId } from '../lib/id';
import type { Entity, EntityId, ColumnId, Column, DataType, EntityColor, ForeignKeyRef } from '../types';
import { ENTITY_COLORS } from '../types';

interface EntityStore {
  entities: Entity[];
  // Entity CRUD
  addEntity: (name: string, color?: EntityColor) => EntityId;
  addEntityFromTemplate: (template: Omit<Entity, 'id' | 'createdAt'>) => EntityId;
  updateEntity: (id: EntityId, partial: Partial<Omit<Entity, 'id' | 'columns'>>) => void;
  removeEntity: (id: EntityId) => void;
  duplicateEntity: (id: EntityId) => void;
  reorderEntities: (fromIndex: number, toIndex: number) => void;
  setAllCollapsed: (collapsed: boolean) => void;
  // Column CRUD
  addColumn: (entityId: EntityId) => ColumnId;
  addColumnPreset: (entityId: EntityId, preset: Partial<Column>) => ColumnId;
  duplicateColumn: (entityId: EntityId, columnId: ColumnId) => void;
  updateColumn: (entityId: EntityId, columnId: ColumnId, partial: Partial<Omit<Column, 'id'>>) => void;
  removeColumn: (entityId: EntityId, columnId: ColumnId) => void;
  reorderColumns: (entityId: EntityId, fromIndex: number, toIndex: number) => void;
  // Tag helpers
  addEntityTag: (entityId: EntityId, tag: string) => void;
  removeEntityTag: (entityId: EntityId, tag: string) => void;
  // FK helpers
  updateFKRefs: (entityId: EntityId, oldName: string, newName: string) => void;
}

const makeDefaultColumn = (order: number): Column => ({
  id: createId(),
  name: '',
  dataType: 'string' as DataType,
  nullable: false,
  primaryKey: false,
  unique: false,
  indexed: false,
  defaultValue: '',
  enumValues: '',
  check: '',
  references: null,
  note: '',
  order,
});

let colorIndex = 0;
const nextColor = (): EntityColor => {
  const c = ENTITY_COLORS[colorIndex % ENTITY_COLORS.length];
  colorIndex++;
  return c;
};

export const useEntityStore = create<EntityStore>()(
  persist(
    (set) => ({
      entities: [],

      addEntity: (name, color) => {
        const id = createId();
        const now = Date.now();
        set((state) => ({
          entities: [
            ...state.entities,
            {
              id,
              name,
              description: '',
              color: color ?? nextColor(),
              columns: [{
                ...makeDefaultColumn(0),
                id: createId(),
                name: 'id',
                dataType: 'uuid' as DataType,
                primaryKey: true,
              }],
              collapsed: false,
              tags: [],
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        return id;
      },

      addEntityFromTemplate: (template) => {
        const id = createId();
        const now = Date.now();
        set((state) => ({
          entities: [
            ...state.entities,
            { ...template, id, createdAt: now, updatedAt: now },
          ],
        }));
        return id;
      },

      updateEntity: (id, partial) =>
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === id ? { ...e, ...partial, updatedAt: Date.now() } : e
          ),
        })),

      removeEntity: (id) =>
        set((state) => ({
          // Also clear FK references pointing to this entity
          entities: state.entities
            .filter((e) => e.id !== id)
            .map((e) => ({
              ...e,
              columns: e.columns.map((c) =>
                c.references?.entityId === id
                  ? { ...c, references: null }
                  : c
              ),
            })),
        })),

      duplicateEntity: (id) =>
        set((state) => {
          const source = state.entities.find((e) => e.id === id);
          if (!source) return state;
          const now = Date.now();
          return {
            entities: [
              ...state.entities,
              {
                ...source,
                id: createId(),
                name: `${source.name}_copy`,
                columns: source.columns.map((c) => ({ ...c, id: createId() })),
                createdAt: now,
                updatedAt: now,
              },
            ],
          };
        }),

      reorderEntities: (fromIndex, toIndex) =>
        set((state) => {
          const list = [...state.entities];
          const [moved] = list.splice(fromIndex, 1);
          list.splice(toIndex, 0, moved);
          return { entities: list };
        }),

      setAllCollapsed: (collapsed) =>
        set((state) => ({
          entities: state.entities.map((e) => ({ ...e, collapsed })),
        })),

      addColumn: (entityId) => {
        const columnId = createId();
        set((state) => ({
          entities: state.entities.map((e) => {
            if (e.id !== entityId) return e;
            return {
              ...e,
              updatedAt: Date.now(),
              columns: [...e.columns, { ...makeDefaultColumn(e.columns.length), id: columnId }],
            };
          }),
        }));
        return columnId;
      },

      addColumnPreset: (entityId, preset) => {
        const columnId = createId();
        set((state) => ({
          entities: state.entities.map((e) => {
            if (e.id !== entityId) return e;
            return {
              ...e,
              updatedAt: Date.now(),
              columns: [...e.columns, { ...makeDefaultColumn(e.columns.length), ...preset, id: columnId }],
            };
          }),
        }));
        return columnId;
      },

      duplicateColumn: (entityId, columnId) =>
        set((state) => ({
          entities: state.entities.map((e) => {
            if (e.id !== entityId) return e;
            const idx = e.columns.findIndex((c) => c.id === columnId);
            if (idx === -1) return e;
            const src = e.columns[idx];
            const dup: Column = { ...src, id: createId(), name: src.name ? `${src.name}_copy` : '', primaryKey: false };
            const cols = [...e.columns];
            cols.splice(idx + 1, 0, dup);
            return { ...e, updatedAt: Date.now(), columns: cols.map((c, i) => ({ ...c, order: i })) };
          }),
        })),

      updateColumn: (entityId, columnId, partial) =>
        set((state) => {
          // Find old column name to propagate FK refs if name changed
          const entity = state.entities.find((e) => e.id === entityId);
          const oldCol = entity?.columns.find((c) => c.id === columnId);
          const nameChanged = partial.name !== undefined && oldCol && partial.name !== oldCol.name;
          const oldName = oldCol?.name ?? '';
          const newName = partial.name ?? oldName;

          return {
            entities: state.entities.map((e) => {
              if (e.id === entityId) {
                return {
                  ...e,
                  updatedAt: Date.now(),
                  columns: e.columns.map((c) =>
                    c.id === columnId ? { ...c, ...partial } : c
                  ),
                };
              }
              // Propagate column rename to FK references pointing at this entity's column
              if (nameChanged) {
                return {
                  ...e,
                  columns: e.columns.map((c) =>
                    c.references?.entityId === entityId && c.references.columnName === oldName
                      ? { ...c, references: { ...c.references, columnName: newName } as ForeignKeyRef }
                      : c
                  ),
                };
              }
              return e;
            }),
          };
        }),

      removeColumn: (entityId, columnId) =>
        set((state) => ({
          entities: state.entities.map((e) => {
            if (e.id !== entityId) return e;
            return {
              ...e,
              updatedAt: Date.now(),
              columns: e.columns
                .filter((c) => c.id !== columnId)
                .map((c, i) => ({ ...c, order: i })),
            };
          }),
        })),

      reorderColumns: (entityId, fromIndex, toIndex) =>
        set((state) => ({
          entities: state.entities.map((e) => {
            if (e.id !== entityId) return e;
            const cols = [...e.columns];
            const [moved] = cols.splice(fromIndex, 1);
            cols.splice(toIndex, 0, moved);
            return { ...e, updatedAt: Date.now(), columns: cols.map((c, i) => ({ ...c, order: i })) };
          }),
        })),

      addEntityTag: (entityId, tag) => {
        const t = tag.trim().toLowerCase();
        if (!t) return;
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === entityId && !e.tags.includes(t)
              ? { ...e, updatedAt: Date.now(), tags: [...e.tags, t] }
              : e
          ),
        }));
      },

      removeEntityTag: (entityId, tag) =>
        set((state) => ({
          entities: state.entities.map((e) =>
            e.id === entityId
              ? { ...e, updatedAt: Date.now(), tags: e.tags.filter((t) => t !== tag) }
              : e
          ),
        })),

      updateFKRefs: (entityId, _oldName, newName) =>
        set((state) => ({
          entities: state.entities.map((e) => ({
            ...e,
            columns: e.columns.map((c) =>
              c.references?.entityId === entityId
                ? { ...c, references: { ...c.references, entityName: newName } as ForeignKeyRef }
                : c
            ),
          })),
        })),
    }),
    {
      name: 'surplan-entities',
      version: 5,
      migrate: (persistedState: unknown, version: number) => {
        let state = persistedState as { entities: Entity[] };
        if (version < 2) {
          // Migrate entities to add v2 fields
          state = {
            ...state,
            entities: (state.entities || []).map((e: Entity) => {
              const raw = e as unknown as Record<string, unknown>;
              return {
                ...e,
                description: (raw.description as string) ?? '',
                color: (raw.color as EntityColor) ?? ENTITY_COLORS[0],
                columns: (e.columns || []).map((c: Column) => {
                  const rawC = c as unknown as Record<string, unknown>;
                  return {
                    ...c,
                    unique: (rawC.unique as boolean) ?? false,
                    indexed: (rawC.indexed as boolean) ?? false,
                    defaultValue: (rawC.defaultValue as string) ?? '',
                    references: (rawC.references as ForeignKeyRef | null) ?? null,
                  };
                }),
              };
            }),
          };
        }
        if (version < 3) {
          // Migrate entities to add v3 fields (tags)
          state = {
            ...state,
            entities: (state.entities || []).map((e: Entity) => {
              const raw = e as unknown as Record<string, unknown>;
              return { ...e, tags: (raw.tags as string[]) ?? [] };
            }),
          };
        }
        if (version < 4) {
          // Migrate columns to add v4 fields (enumValues, check)
          state = {
            ...state,
            entities: (state.entities || []).map((e: Entity) => ({
              ...e,
              columns: (e.columns || []).map((c: Column) => {
                const rawC = c as unknown as Record<string, unknown>;
                return {
                  ...c,
                  enumValues: (rawC.enumValues as string) ?? '',
                  check: (rawC.check as string) ?? '',
                };
              }),
            })),
          };
        }
        if (version < 5) {
          // Migrate entities to add v5 field (updatedAt)
          state = {
            ...state,
            entities: (state.entities || []).map((e: Entity) => {
              const raw = e as unknown as Record<string, unknown>;
              return { ...e, updatedAt: (raw.updatedAt as number) ?? e.createdAt };
            }),
          };
        }
        return state;
      },
    }
  )
);
