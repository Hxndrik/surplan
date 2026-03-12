import { useState, useRef, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEntityStore } from '../../store/useEntityStore';
import { EntityCard } from './EntityCard';
import type { Entity } from '../../types';
import { NewEntityButton } from './NewEntityButton';
import { EmptyState } from '../shared/EmptyState';
import { TemplatesModal } from './TemplatesModal';
import { ErdView } from './ErdView';
import { RelationshipMatrix } from './RelationshipMatrix';

function SortableEntityCard({ entity, highlight, flash, cardRef, columnMatchCount }: {
  entity: Entity;
  highlight?: string;
  flash?: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
  columnMatchCount?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entity.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={(el) => { setNodeRef(el); cardRef?.(el); }}
      style={style}
      className={`${isDragging ? 'opacity-40 z-10' : ''} ${flash ? 'ring-2 ring-accent animate-pulse rounded-xl' : ''}`}
    >
      <EntityCard entity={entity} dragHandle={{ ...listeners, ...attributes }} highlight={highlight} columnMatchCount={columnMatchCount} />
    </div>
  );
}

interface EntityGridProps {
  onExport?: () => void;
}

export function EntityGrid({ onExport }: EntityGridProps) {
  const entities = useEntityStore((s) => s.entities);
  const addEntity = useEntityStore((s) => s.addEntity);
  const setAllCollapsed = useEntityStore((s) => s.setAllCollapsed);
  const reorderEntities = useEntityStore((s) => s.reorderEntities);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = entities.findIndex((e) => e.id === active.id);
    const toIndex = entities.findIndex((e) => e.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) reorderEntities(fromIndex, toIndex);
  };
  const [search, setSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [view, setView] = useState<'grid' | 'erd' | 'matrix'>('grid');
  const [sortEntities, setSortEntities] = useState<'default' | 'name' | 'columns' | 'created' | 'updated'>('default');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showWarnings, setShowWarnings] = useState(false);
  const [filterWarnings, setFilterWarnings] = useState(false);
  const [flashEntityId, setFlashEntityId] = useState<string | null>(null);
  const entityCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const searchRef = useRef<HTMLInputElement>(null);

  const handleEntityFocusFromErd = useCallback((entityId: string) => {
    setView('grid');
    setSearch('');
    setTagFilter(null);
    setTypeFilter(null);
    // After switching to grid, scroll to the entity and flash it
    setTimeout(() => {
      const el = entityCardRefs.current.get(entityId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlashEntityId(entityId);
      setTimeout(() => setFlashEntityId(null), 1800);
    }, 50);
  }, []);

  useEffect(() => {
    const handler = () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener('surplan:focus-search', handler);
    return () => window.removeEventListener('surplan:focus-search', handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const entityId = (e as CustomEvent<{ entityId: string }>).detail?.entityId;
      if (entityId) handleEntityFocusFromErd(entityId);
    };
    window.addEventListener('surplan:focus-entity', handler);
    return () => window.removeEventListener('surplan:focus-entity', handler);
  }, [handleEntityFocusFromErd]);


  const totalColumns = entities.reduce((sum, e) => sum + e.columns.length, 0);
  const totalFKs = entities.reduce((sum, e) => sum + e.columns.filter((c) => c.references).length, 0);
  const totalChecks = entities.reduce((sum, e) => sum + e.columns.filter((c) => c.check?.trim()).length, 0);

  // Compute all warnings across all entities
  const allWarnings: { entityId: string; entityName: string; msg: string }[] = [];
  {
    const entityNameSet = new Set(entities.map((e) => e.name.toLowerCase()));
    entities.forEach((e) => {
      const hasPK = e.columns.some((c) => c.primaryKey);
      if (e.columns.length > 0 && !hasPK) allWarnings.push({ entityId: e.id, entityName: e.name, msg: 'No primary key' });
      const names = e.columns.map((c) => c.name.trim().toLowerCase()).filter(Boolean);
      const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
      if (dupes.length > 0) allWarnings.push({ entityId: e.id, entityName: e.name, msg: `Duplicate columns: ${dupes.join(', ')}` });
      const empty = e.columns.filter((c) => !c.name.trim()).length;
      if (empty > 0) allWarnings.push({ entityId: e.id, entityName: e.name, msg: `${empty} unnamed column${empty !== 1 ? 's' : ''}` });
      e.columns.forEach((c) => {
        if (c.references && !entityNameSet.has(c.references.entityName.toLowerCase())) {
          allWarnings.push({ entityId: e.id, entityName: e.name, msg: `FK "${c.name}" → unknown table "${c.references.entityName}"` });
        }
      });
    });
  }

  // Top column types summary (top 5)
  const typeFrequency = entities.flatMap((e) => e.columns.map((c) => c.dataType)).reduce((acc, t) => {
    acc.set(t, (acc.get(t) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
  const topTypes = [...typeFrequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // All unique tags across entities
  const allTags = [...new Set(entities.flatMap((e) => e.tags))].sort();

  const warningEntityIds = new Set(allWarnings.map((w) => w.entityId));

  const q = search.trim().toLowerCase();
  const filtered = entities.filter((e) => {
    if (tagFilter && !e.tags.includes(tagFilter)) return false;
    if (filterWarnings && !warningEntityIds.has(e.id)) return false;
    if (typeFilter && !e.columns.some((c) => c.dataType === typeFilter)) return false;
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.columns.some((c) => c.name.toLowerCase().includes(q) || c.note.toLowerCase().includes(q))
    );
  });

  const filteredSorted = sortEntities === 'default'
    ? filtered
    : [...filtered].sort((a, b) => {
        if (sortEntities === 'name') return a.name.localeCompare(b.name);
        if (sortEntities === 'columns') return b.columns.length - a.columns.length;
        if (sortEntities === 'created') return a.createdAt - b.createdAt;
        if (sortEntities === 'updated') return b.updatedAt - a.updatedAt;
        return 0;
      });

  // For each filtered entity, count how many columns match the search
  const columnMatchCounts = new Map<string, number>();
  if (q) {
    filtered.forEach((e) => {
      const count = e.columns.filter((c) => c.name.toLowerCase().includes(q) || c.note.toLowerCase().includes(q)).length;
      columnMatchCounts.set(e.id, count);
    });
  }

  if (entities.length === 0) {
    return (
      <div>
        <EmptyState
          icon={
            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M9 11h6M9 15h4" />
            </svg>
          }
          title="No entities yet"
          description="Start designing your database schema by creating your first entity."
          action={{ label: 'Create First Entity', onClick: () => addEntity('users') }}
          secondaryAction={{ label: 'Import from SQL', onClick: () => window.dispatchEvent(new Event("surplan:open-sql-import")) }}
        />
        {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none"
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entities..."
            className="w-full text-xs bg-bg-secondary border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-[11px] text-text-muted flex-wrap">
          <span title={`${entities.length} ${entities.length === 1 ? 'entity' : 'entities'}`}>
            <span className="text-text-secondary font-medium">{entities.length}</span>
            <span className="ml-0.5">{entities.length === 1 ? 'entity' : 'entities'}</span>
          </span>
          <span className="text-border-default">·</span>
          <span title={`${totalColumns} columns total`}>
            <span className="text-text-secondary font-medium">{totalColumns}</span>
            <span className="ml-0.5">{totalColumns === 1 ? 'col' : 'cols'}</span>
          </span>
          {totalFKs > 0 && (
            <>
              <span className="text-border-default">·</span>
              <span className="text-accent" title={`${totalFKs} FK relationships`}>
                <span className="font-medium">{totalFKs}</span>
                <span className="ml-0.5">FK</span>
              </span>
            </>
          )}
          {totalChecks > 0 && (
            <>
              <span className="text-border-default">·</span>
              <span className="text-text-muted" title={`${totalChecks} CHECK constraints`}>
                <span className="font-medium">{totalChecks}</span>
                <span className="ml-0.5">check</span>
              </span>
            </>
          )}
          {allWarnings.length > 0 && (
            <>
              <span className="text-border-default">·</span>
              <span
                className="text-orange-400 font-medium cursor-help"
                title={allWarnings.map((w) => `${w.entityName}: ${w.msg}`).join('\n')}
              >
                ⚠ {allWarnings.length}
              </span>
            </>
          )}
          {topTypes.length > 0 && (
            <>
              <span className="text-border-default hidden sm:inline">·</span>
              <div className="hidden sm:flex items-center gap-1 flex-wrap" title="Click a type to filter">
                {topTypes.map(([type, count]) => {
                  const isActive = typeFilter === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTypeFilter(isActive ? null : type)}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-accent text-white border border-accent'
                          : 'bg-bg-secondary border border-border-default hover:border-border-active'
                      }`}
                      title={`Filter to entities with ${type} columns`}
                    >
                      <span className={`font-mono ${isActive ? '' : 'text-text-secondary'}`}>{type}</span>
                      <span className={`ml-1 ${isActive ? 'text-white/70' : 'text-text-muted'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {allTags.map((tag) => {
              const isActive = tagFilter === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTagFilter(isActive ? null : tag)}
                  className={`text-[10px] rounded px-2 py-0.5 leading-none transition-colors cursor-pointer font-medium ${
                    isActive ? 'bg-accent text-white' : 'bg-bg-secondary border border-border-default text-text-muted hover:border-border-active hover:text-text-secondary'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1" />

        {/* Sort */}
        {view === 'grid' && entities.length > 1 && (
          <select
            value={sortEntities}
            onChange={(e) => setSortEntities(e.target.value as typeof sortEntities)}
            className="text-[10px] bg-bg-secondary border border-border-default rounded-lg px-2 py-1.5 text-text-muted outline-none focus:border-border-focus cursor-pointer hover:border-border-active transition-colors"
            title="Sort entities"
          >
            <option value="default">Sort: Default</option>
            <option value="name">Sort: Name A→Z</option>
            <option value="columns">Sort: Most Columns</option>
            <option value="created">Sort: Created</option>
            <option value="updated">Sort: Recently Modified</option>
          </select>
        )}

        {/* Collapse / Expand all */}
        {view === 'grid' && entities.length > 0 && (
          <div className="flex items-center border border-border-default rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setAllCollapsed(true)}
              title="Collapse all"
              className="px-2.5 py-1.5 cursor-pointer transition-colors text-text-muted hover:text-text-secondary hover:bg-bg-hover"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setAllCollapsed(false)}
              title="Expand all"
              className="px-2.5 py-1.5 cursor-pointer transition-colors text-text-muted hover:text-text-secondary hover:bg-bg-hover border-l border-border-default"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}

        {/* View toggle */}
        <div className="flex items-center border border-border-default rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setView('grid')}
            title="Grid view"
            className={`px-2.5 py-1.5 cursor-pointer transition-colors ${view === 'grid' ? 'bg-bg-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setView('erd')}
            title="ERD diagram view"
            className={`px-2.5 py-1.5 cursor-pointer transition-colors border-l border-border-default ${view === 'erd' ? 'bg-bg-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10a1 1 0 011 1v3a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM7 13h10a1 1 0 011 1v3a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1zM12 8v5M8 15.5l4 4 4-4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setView('matrix')}
            title="Relationship matrix view"
            className={`px-2.5 py-1.5 cursor-pointer transition-colors border-l border-border-default ${view === 'matrix' ? 'bg-bg-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M14 3v18" />
            </svg>
          </button>
        </div>

        {/* Import dropdown */}
        <div className="relative group">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-text-secondary border border-border-default hover:border-border-active hover:text-text-primary rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
            title="Import entities"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
            <svg className="w-2.5 h-2.5 ml-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="absolute right-0 top-full mt-1 w-36 bg-bg-secondary border border-border-default rounded-lg shadow-xl overflow-hidden z-20 hidden group-hover:block">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("surplan:open-sql-import"))}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
            >
              <span className="text-text-muted font-mono text-[10px]">SQL</span>
              SQL / Prisma
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('surplan:open-json-import'))}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer border-t border-border-default"
            >
              <span className="text-text-muted font-mono text-[10px]">{'{}'}</span>
              JSON / CSV
            </button>
          </div>
        </div>

        {/* Templates button */}
        <button
          type="button"
          onClick={() => setShowTemplates(true)}
          className="flex items-center gap-1.5 text-xs text-text-secondary border border-border-default hover:border-border-active hover:text-text-primary rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          Templates
        </button>

        {/* Export button */}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 text-xs text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent-muted rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        )}
      </div>

      {/* Schema warnings panel */}
      {allWarnings.length > 0 && (
        <div className="rounded-lg border border-orange-400/30 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-2.5 bg-orange-400/8">
            <button
              type="button"
              onClick={() => setShowWarnings((v) => !v)}
              className="flex items-center gap-2 flex-1 text-left cursor-pointer hover:opacity-80 transition-opacity"
            >
              <svg className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-xs font-medium text-orange-400">
                {allWarnings.length} schema issue{allWarnings.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[10px] text-text-muted">
                — {warningEntityIds.size} {warningEntityIds.size === 1 ? 'entity' : 'entities'} affected
              </span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterWarnings((v) => !v)}
                title={filterWarnings ? 'Show all entities' : 'Show only entities with issues'}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  filterWarnings
                    ? 'border-orange-400/60 text-orange-400 bg-orange-400/10'
                    : 'border-border-default text-text-muted hover:border-orange-400/40 hover:text-orange-400'
                }`}
              >
                {filterWarnings ? 'Issues only ✕' : 'Issues only'}
              </button>
              <svg
                className={`w-3.5 h-3.5 text-text-muted transition-transform cursor-pointer ${showWarnings ? 'rotate-180' : ''}`}
                onClick={() => setShowWarnings((v) => !v)}
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {showWarnings && (
            <div className="border-t border-orange-400/20 bg-bg-secondary divide-y divide-border-default">
              {allWarnings.map((w, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2">
                  <span
                    className="flex-shrink-0 w-2 h-2 rounded-full"
                    style={{ backgroundColor: entities.find((e) => e.id === w.entityId)?.color ?? '#f97316' }}
                  />
                  <span className="text-[10px] font-semibold text-text-secondary min-w-[90px] truncate" title={w.entityName}>
                    {w.entityName || 'unnamed'}
                  </span>
                  <span className="text-[10px] text-orange-400 flex-1">{w.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Matrix view */}
      {view === 'matrix' ? (
        <RelationshipMatrix entities={entities} />
      ) : view === 'erd' ? (
        <ErdView entities={entities} onEntityFocus={handleEntityFocusFromErd} />
      ) : filtered.length === 0 && (q || tagFilter || filterWarnings || typeFilter) ? (
        <div className="text-center py-12 text-text-muted text-sm">
          {filterWarnings && !q && !tagFilter && !typeFilter
            ? 'No entities with schema issues'
            : typeFilter && !q && !tagFilter
            ? <>No entities with <span className="text-text-secondary font-mono">{typeFilter}</span> columns</>
            : tagFilter && !q
            ? <>No entities tagged "<span className="text-text-secondary">{tagFilter}</span>"</>
            : <>No entities or columns match "<span className="text-text-secondary">{search}</span>"</>
          }
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={sortEntities === 'default' ? handleDragEnd : undefined}>
          <SortableContext items={filteredSorted.map((e) => e.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-2 items-start">
              {filteredSorted.map((entity) => (
                <SortableEntityCard
                  key={entity.id}
                  entity={entity}
                  highlight={q || undefined}
                  flash={flashEntityId === entity.id}
                  columnMatchCount={q ? (columnMatchCounts.get(entity.id) ?? 0) : undefined}
                  cardRef={(el) => {
                    if (el) entityCardRefs.current.set(entity.id, el);
                    else entityCardRefs.current.delete(entity.id);
                  }}
                />
              ))}
              {!search && <NewEntityButton />}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modals */}
      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
    </div>
  );
}
