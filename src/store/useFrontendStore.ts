import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createId } from '../lib/id';
import type {
  Page, PageId, UIComponent, ComponentId, ComponentKind,
  DesignTokens, ColorToken, TypographyToken, SpacingToken,
  WireframeSection, ComponentProp, ComponentEvent, ComponentStateField,
  PageStatus,
} from '../types';

export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  colors: [
    { id: 'c1', name: 'primary', value: '#6366f1', category: 'brand' },
    { id: 'c2', name: 'secondary', value: '#8b5cf6', category: 'brand' },
    { id: 'c3', name: 'success', value: '#10b981', category: 'semantic' },
    { id: 'c4', name: 'warning', value: '#f59e0b', category: 'semantic' },
    { id: 'c5', name: 'danger', value: '#ef4444', category: 'semantic' },
    { id: 'c6', name: 'info', value: '#06b6d4', category: 'semantic' },
    { id: 'c7', name: 'background', value: '#0f172a', category: 'neutral' },
    { id: 'c8', name: 'text', value: '#f8fafc', category: 'neutral' },
  ],
  typography: [
    { id: 't1', name: 'heading-xl', fontFamily: 'Inter, sans-serif', fontSize: '2.25rem', fontWeight: '700', lineHeight: '1.2', letterSpacing: '-0.02em' },
    { id: 't2', name: 'heading-lg', fontFamily: 'Inter, sans-serif', fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.3', letterSpacing: '-0.01em' },
    { id: 't3', name: 'heading-md', fontFamily: 'Inter, sans-serif', fontSize: '1.25rem', fontWeight: '600', lineHeight: '1.4', letterSpacing: '0' },
    { id: 't4', name: 'body-lg', fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: '400', lineHeight: '1.6', letterSpacing: '0' },
    { id: 't5', name: 'body-md', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: '400', lineHeight: '1.5', letterSpacing: '0' },
    { id: 't6', name: 'body-sm', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: '400', lineHeight: '1.5', letterSpacing: '0.01em' },
  ],
  spacing: [
    { id: 's1', name: 'xs', value: '4px' },
    { id: 's2', name: 'sm', value: '8px' },
    { id: 's3', name: 'md', value: '16px' },
    { id: 's4', name: 'lg', value: '24px' },
    { id: 's5', name: 'xl', value: '48px' },
  ],
  breakpoints: [
    { name: 'sm', value: '640px' },
    { name: 'md', value: '768px' },
    { name: 'lg', value: '1024px' },
    { name: 'xl', value: '1280px' },
  ],
  notes: '',
};

interface FrontendStore {
  pages: Page[];
  components: UIComponent[];
  designTokens: DesignTokens;

  // Page CRUD
  addPage: (name: string) => PageId;
  updatePage: (id: PageId, partial: Partial<Omit<Page, 'id'>>) => void;
  removePage: (id: PageId) => void;
  duplicatePage: (id: PageId) => void;
  reorderPages: (activeId: string, overId: string) => void;

  // Page wireframe sections
  addWireframeSection: (pageId: PageId) => void;
  updateWireframeSection: (pageId: PageId, sectionId: string, partial: Partial<WireframeSection>) => void;
  removeWireframeSection: (pageId: PageId, sectionId: string) => void;
  reorderWireframeSections: (pageId: PageId, fromIndex: number, toIndex: number) => void;

  // Page data bindings
  addDataBinding: (pageId: PageId, endpointId: string, description?: string) => void;
  removeDataBinding: (pageId: PageId, endpointId: string) => void;

  // Component CRUD
  addComponent: (name: string, kind?: ComponentKind) => ComponentId;
  updateComponent: (id: ComponentId, partial: Partial<Omit<UIComponent, 'id'>>) => void;
  removeComponent: (id: ComponentId) => void;
  duplicateComponent: (id: ComponentId) => void;
  reorderComponents: (activeId: string, overId: string) => void;

  // Component props/events/state
  addComponentProp: (componentId: ComponentId) => void;
  updateComponentProp: (componentId: ComponentId, propId: string, partial: Partial<ComponentProp>) => void;
  removeComponentProp: (componentId: ComponentId, propId: string) => void;

  addComponentEvent: (componentId: ComponentId) => void;
  updateComponentEvent: (componentId: ComponentId, eventId: string, partial: Partial<ComponentEvent>) => void;
  removeComponentEvent: (componentId: ComponentId, eventId: string) => void;

  addComponentState: (componentId: ComponentId) => void;
  updateComponentState: (componentId: ComponentId, stateId: string, partial: Partial<ComponentStateField>) => void;
  removeComponentState: (componentId: ComponentId, stateId: string) => void;

  // Component tree
  setComponentParent: (childId: ComponentId, parentId: ComponentId | null) => void;

  // Design tokens
  updateDesignTokens: (partial: Partial<DesignTokens>) => void;
  addColorToken: () => void;
  updateColorToken: (id: string, partial: Partial<ColorToken>) => void;
  removeColorToken: (id: string) => void;
  addTypographyToken: () => void;
  updateTypographyToken: (id: string, partial: Partial<TypographyToken>) => void;
  removeTypographyToken: (id: string) => void;
  addSpacingToken: () => void;
  updateSpacingToken: (id: string, partial: Partial<SpacingToken>) => void;
  removeSpacingToken: (id: string) => void;
}

export const useFrontendStore = create<FrontendStore>()(
  persist(
    (set) => ({
      pages: [],
      components: [],
      designTokens: DEFAULT_DESIGN_TOKENS,

      // ── Page CRUD ──────────────────────────────────────────────

      addPage: (name: string) => {
        const id = createId();
        const now = Date.now();
        set((s) => ({
          pages: [
            ...s.pages,
            {
              id, name, path: `/${name.toLowerCase().replace(/\s+/g, '-')}`,
              description: '', layout: 'fullwidth', authRequired: false,
              roles: '', metaTitle: name, metaDescription: '',
              componentRefs: [], entityRefs: [], dataBindings: [],
              wireframeSections: [], navigatesTo: [],
              featureRef: null, status: 'planned' as PageStatus,
              notes: '', tags: [], order: s.pages.length,
              createdAt: now, updatedAt: now,
            },
          ],
        }));
        return id;
      },

      updatePage: (id, partial) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.id === id ? { ...p, ...partial, updatedAt: Date.now() } : p
          ),
        })),

      removePage: (id) =>
        set((s) => ({
          pages: s.pages.filter((p) => p.id !== id).map((p) => ({
            ...p,
            navigatesTo: p.navigatesTo.filter((n) => n !== id),
          })),
        })),

      duplicatePage: (id) =>
        set((s) => {
          const src = s.pages.find((p) => p.id === id);
          if (!src) return s;
          const now = Date.now();
          const newId = createId();
          const idx = s.pages.findIndex((p) => p.id === id);
          const next = [...s.pages];
          next.splice(idx + 1, 0, {
            ...src, id: newId, name: `${src.name} (copy)`,
            status: 'planned', createdAt: now, updatedAt: now,
          });
          return { pages: next };
        }),

      reorderPages: (activeId, overId) =>
        set((s) => {
          const items = [...s.pages];
          const from = items.findIndex((p) => p.id === activeId);
          const to = items.findIndex((p) => p.id === overId);
          if (from === -1 || to === -1) return s;
          const [moved] = items.splice(from, 1);
          items.splice(to, 0, moved);
          return { pages: items.map((p, i) => ({ ...p, order: i })) };
        }),

      // ── Wireframe sections ─────────────────────────────────────

      addWireframeSection: (pageId) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p, updatedAt: Date.now(),
              wireframeSections: [
                ...p.wireframeSections,
                { id: createId(), label: 'Section', componentRef: null, order: p.wireframeSections.length, width: 'full' as const, notes: '' },
              ],
            };
          }),
        })),

      updateWireframeSection: (pageId, sectionId, partial) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p, updatedAt: Date.now(),
              wireframeSections: p.wireframeSections.map((ws) =>
                ws.id === sectionId ? { ...ws, ...partial } : ws
              ),
            };
          }),
        })),

      removeWireframeSection: (pageId, sectionId) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p, updatedAt: Date.now(),
              wireframeSections: p.wireframeSections
                .filter((ws) => ws.id !== sectionId)
                .map((ws, i) => ({ ...ws, order: i })),
            };
          }),
        })),

      reorderWireframeSections: (pageId, fromIndex, toIndex) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            const secs = [...p.wireframeSections];
            const [moved] = secs.splice(fromIndex, 1);
            secs.splice(toIndex, 0, moved);
            return { ...p, updatedAt: Date.now(), wireframeSections: secs.map((ws, i) => ({ ...ws, order: i })) };
          }),
        })),

      // ── Data bindings ──────────────────────────────────────────

      addDataBinding: (pageId, endpointId, description = '') =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            if (p.dataBindings.some((db) => db.endpointId === endpointId)) return p;
            return {
              ...p, updatedAt: Date.now(),
              dataBindings: [...p.dataBindings, { endpointId, description }],
            };
          }),
        })),

      removeDataBinding: (pageId, endpointId) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p, updatedAt: Date.now(),
              dataBindings: p.dataBindings.filter((db) => db.endpointId !== endpointId),
            };
          }),
        })),

      // ── Component CRUD ─────────────────────────────────────────

      addComponent: (name, kind = 'ui') => {
        const id = createId();
        const now = Date.now();
        set((s) => ({
          components: [
            ...s.components,
            {
              id, name, description: '', kind,
              props: [], events: [], stateFields: [],
              entityRef: null, endpointRefs: [],
              children: [], parentId: null,
              tags: [], notes: '', status: 'planned' as PageStatus,
              order: s.components.length, createdAt: now, updatedAt: now,
            },
          ],
        }));
        return id;
      },

      updateComponent: (id, partial) =>
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id ? { ...c, ...partial, updatedAt: Date.now() } : c
          ),
        })),

      removeComponent: (id) =>
        set((s) => ({
          components: s.components
            .filter((c) => c.id !== id)
            .map((c) => ({
              ...c,
              children: c.children.filter((ch) => ch !== id),
              ...(c.parentId === id ? { parentId: null } : {}),
            })),
          pages: s.pages.map((p) => ({
            ...p,
            componentRefs: p.componentRefs.filter((cr) => cr !== id),
            wireframeSections: p.wireframeSections.map((ws) =>
              ws.componentRef === id ? { ...ws, componentRef: null } : ws
            ),
          })),
        })),

      duplicateComponent: (id) =>
        set((s) => {
          const src = s.components.find((c) => c.id === id);
          if (!src) return s;
          const now = Date.now();
          const newId = createId();
          const idx = s.components.findIndex((c) => c.id === id);
          const next = [...s.components];
          next.splice(idx + 1, 0, {
            ...src, id: newId, name: `${src.name}Copy`,
            children: [], parentId: src.parentId,
            props: src.props.map((p) => ({ ...p, id: createId() })),
            events: src.events.map((e) => ({ ...e, id: createId() })),
            stateFields: src.stateFields.map((sf) => ({ ...sf, id: createId() })),
            createdAt: now, updatedAt: now,
          });
          return { components: next };
        }),

      reorderComponents: (activeId, overId) =>
        set((s) => {
          const items = [...s.components];
          const from = items.findIndex((c) => c.id === activeId);
          const to = items.findIndex((c) => c.id === overId);
          if (from === -1 || to === -1) return s;
          const [moved] = items.splice(from, 1);
          items.splice(to, 0, moved);
          return { components: items.map((c, i) => ({ ...c, order: i })) };
        }),

      // ── Component props ────────────────────────────────────────

      addComponentProp: (componentId) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c, updatedAt: Date.now(),
              props: [...c.props, { id: createId(), name: '', type: 'string', required: false, defaultValue: '', description: '' }],
            };
          }),
        })),

      updateComponentProp: (componentId, propId, partial) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c, updatedAt: Date.now(),
              props: c.props.map((p) => p.id === propId ? { ...p, ...partial } : p),
            };
          }),
        })),

      removeComponentProp: (componentId, propId) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c, updatedAt: Date.now(),
              props: c.props.filter((p) => p.id !== propId),
            };
          }),
        })),

      // ── Component events ───────────────────────────────────────

      addComponentEvent: (componentId) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c, updatedAt: Date.now(),
              events: [...c.events, { id: createId(), name: '', payload: 'void', description: '' }],
            };
          }),
        })),

      updateComponentEvent: (componentId, eventId, partial) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c, updatedAt: Date.now(),
              events: c.events.map((e) => e.id === eventId ? { ...e, ...partial } : e),
            };
          }),
        })),

      removeComponentEvent: (componentId, eventId) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c, updatedAt: Date.now(),
              events: c.events.filter((e) => e.id !== eventId),
            };
          }),
        })),

      // ── Component state ────────────────────────────────────────

      addComponentState: (componentId) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c, updatedAt: Date.now(),
              stateFields: [...c.stateFields, { id: createId(), name: '', type: 'string', initialValue: '', description: '' }],
            };
          }),
        })),

      updateComponentState: (componentId, stateId, partial) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c, updatedAt: Date.now(),
              stateFields: c.stateFields.map((sf) => sf.id === stateId ? { ...sf, ...partial } : sf),
            };
          }),
        })),

      removeComponentState: (componentId, stateId) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c, updatedAt: Date.now(),
              stateFields: c.stateFields.filter((sf) => sf.id !== stateId),
            };
          }),
        })),

      // ── Component tree ─────────────────────────────────────────

      setComponentParent: (childId, parentId) =>
        set((s) => ({
          components: s.components.map((c) => {
            // Update the child
            if (c.id === childId) {
              return { ...c, parentId, updatedAt: Date.now() };
            }
            // Remove child from old parent's children array
            if (c.children.includes(childId)) {
              return { ...c, children: c.children.filter((ch) => ch !== childId), updatedAt: Date.now() };
            }
            // Add child to new parent's children array
            if (c.id === parentId && !c.children.includes(childId)) {
              return { ...c, children: [...c.children, childId], updatedAt: Date.now() };
            }
            return c;
          }),
        })),

      // ── Design tokens ──────────────────────────────────────────

      updateDesignTokens: (partial) =>
        set((s) => ({
          designTokens: { ...s.designTokens, ...partial },
        })),

      addColorToken: () =>
        set((s) => ({
          designTokens: {
            ...s.designTokens,
            colors: [...s.designTokens.colors, { id: createId(), name: '', value: '#6366f1', category: 'brand' }],
          },
        })),

      updateColorToken: (id, partial) =>
        set((s) => ({
          designTokens: {
            ...s.designTokens,
            colors: s.designTokens.colors.map((c) => c.id === id ? { ...c, ...partial } : c),
          },
        })),

      removeColorToken: (id) =>
        set((s) => ({
          designTokens: {
            ...s.designTokens,
            colors: s.designTokens.colors.filter((c) => c.id !== id),
          },
        })),

      addTypographyToken: () =>
        set((s) => ({
          designTokens: {
            ...s.designTokens,
            typography: [...s.designTokens.typography, { id: createId(), name: '', fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: '400', lineHeight: '1.5', letterSpacing: '0' }],
          },
        })),

      updateTypographyToken: (id, partial) =>
        set((s) => ({
          designTokens: {
            ...s.designTokens,
            typography: s.designTokens.typography.map((t) => t.id === id ? { ...t, ...partial } : t),
          },
        })),

      removeTypographyToken: (id) =>
        set((s) => ({
          designTokens: {
            ...s.designTokens,
            typography: s.designTokens.typography.filter((t) => t.id !== id),
          },
        })),

      addSpacingToken: () =>
        set((s) => ({
          designTokens: {
            ...s.designTokens,
            spacing: [...s.designTokens.spacing, { id: createId(), name: '', value: '0px' }],
          },
        })),

      updateSpacingToken: (id, partial) =>
        set((s) => ({
          designTokens: {
            ...s.designTokens,
            spacing: s.designTokens.spacing.map((sp) => sp.id === id ? { ...sp, ...partial } : sp),
          },
        })),

      removeSpacingToken: (id) =>
        set((s) => ({
          designTokens: {
            ...s.designTokens,
            spacing: s.designTokens.spacing.filter((sp) => sp.id !== id),
          },
        })),
    }),
    {
      name: 'surplan-frontend',
      version: 1,
    }
  )
);
