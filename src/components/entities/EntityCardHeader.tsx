import { useState, useRef, useEffect } from 'react';
import { useEntityStore } from '../../store/useEntityStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { InlineEdit } from '../shared/InlineEdit';
import type { EntityId, EntityColor, CopyFormat } from '../../types';
import { ENTITY_COLORS } from '../../types';

const COPY_OPTIONS: { format: CopyFormat; label: string }[] = [
  { format: 'sql',      label: 'PostgreSQL DDL' },
  { format: 'markdown', label: 'Markdown Table' },
  { format: 'insert',   label: 'Sample INSERT' },
  { format: 'zod',      label: 'Zod Schema' },
  { format: 'drizzle',  label: 'Drizzle ORM' },
  { format: 'typeorm',  label: 'TypeORM Entity' },
];

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#64748b',
];
function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff;
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

interface EntityCardHeaderProps {
  entityId: EntityId;
  name: string;
  description: string;
  color: EntityColor;
  tags: string[];
  columnCount: number;
  pkCount?: number;
  fkCount?: number;
  collapsed: boolean;
  dragHandle?: React.HTMLAttributes<HTMLButtonElement>;
  onCopyAs?: (format: CopyFormat) => void;
  copiedFormat?: CopyFormat | null;
  warnings?: string[];
  columnFilter?: string;
  onColumnFilterChange?: (v: string) => void;
  typeBreakdown?: string;
  columnMatchCount?: number;
}

export function EntityCardHeader({
  entityId,
  name,
  description,
  color,
  tags,
  columnCount,
  pkCount,
  fkCount,
  collapsed,
  dragHandle,
  onCopyAs,
  copiedFormat,
  warnings = [],
  columnFilter,
  onColumnFilterChange,
  typeBreakdown,
  columnMatchCount,
}: EntityCardHeaderProps) {
  const updateEntity = useEntityStore((s) => s.updateEntity);
  const removeEntity = useEntityStore((s) => s.removeEntity);
  const duplicateEntity = useEntityStore((s) => s.duplicateEntity);
  const addEntityTag = useEntityStore((s) => s.addEntityTag);
  const removeEntityTag = useEntityStore((s) => s.removeEntityTag);
  const updateFKRefs = useEntityStore((s) => s.updateFKRefs);
  const referencedByStr = useEntityStore((s) =>
    s.entities
      .flatMap((e) =>
        e.id !== entityId
          ? e.columns
              .filter((c) => c.references?.entityId === entityId)
              .map((c) => `${e.name}.${c.name}`)
          : []
      )
      .join('\n')
  );
  const referencedBy = referencedByStr ? referencedByStr.split('\n') : [];
  const linkedFeatureCount = useProjectStore((s) =>
    s.features.filter((f) => f.entityRefs.includes(entityId)).length
  );
  const linkedEndpointCount = useProjectStore((s) =>
    s.endpoints.filter((ep) => ep.entityRef === entityId).length
  );
  const addEndpoint = useProjectStore((s) => s.addEndpoint);
  const updateEndpoint = useProjectStore((s) => s.updateEndpoint);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showTagInput) tagInputRef.current?.focus();
  }, [showTagInput]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleAddTag = () => {
    const t = tagDraft.trim().toLowerCase().replace(/\s+/g, '-');
    if (t) addEntityTag(entityId, t);
    setTagDraft('');
    setShowTagInput(false);
  };

  const handleGenerateCrudEndpoints = () => {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const tag = name;
    const crud: { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string; description: string; statusCodes: string }[] = [
      { method: 'GET',    path: `/api/${base}`,      description: `List all ${name}`,   statusCodes: '200, 400' },
      { method: 'POST',   path: `/api/${base}`,      description: `Create a ${name}`,   statusCodes: '201, 400, 422' },
      { method: 'GET',    path: `/api/${base}/:id`,  description: `Get a ${name} by ID`, statusCodes: '200, 404' },
      { method: 'PUT',    path: `/api/${base}/:id`,  description: `Update a ${name}`,   statusCodes: '200, 400, 404, 422' },
      { method: 'DELETE', path: `/api/${base}/:id`,  description: `Delete a ${name}`,   statusCodes: '204, 404' },
    ];
    crud.forEach(({ method, path, description, statusCodes }) => {
      const id = addEndpoint(tag);
      updateEndpoint(id, { method, path, description, statusCodes, entityRef: entityId, auth: 'bearer' });
    });
    setActiveTab('api');
  };

  const showFilter = columnCount >= 8 && onColumnFilterChange !== undefined;

  // Build tooltip for entity info
  const infoTooltip = [
    typeBreakdown ? `${columnCount} column${columnCount !== 1 ? 's' : ''}: ${typeBreakdown}` : `${columnCount} column${columnCount !== 1 ? 's' : ''}`,
    referencedBy.length > 0 ? `Referenced by:\n${referencedBy.map((r) => `  ${r}`).join('\n')}` : '',
    warnings.length > 0 ? `Warnings:\n${warnings.map((w) => `  ${w}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');

  return (
    <div>
      {/* Primary header row - compact */}
      <div className="flex items-center gap-1 px-1.5 py-1 border-b border-border-default bg-bg-tertiary/50 group/header rounded-t-lg">
        {/* Drag handle - hover only */}
        {dragHandle && (
          <button
            type="button"
            className="cursor-grab touch-none text-text-muted opacity-0 group-hover/header:opacity-100 hover:text-text-secondary transition-opacity flex-shrink-0"
            title="Drag to reorder"
            {...dragHandle}
          >
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
            </svg>
          </button>
        )}

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => updateEntity(entityId, { collapsed: !collapsed })}
          className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer flex-shrink-0"
        >
          <svg
            className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Color dot */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-2.5 h-2.5 rounded-full ring-1 ring-black/20 hover:ring-2 hover:scale-110 transition-all cursor-pointer block"
            style={{ backgroundColor: color }}
            title="Change color"
          />
          {showColorPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
              <div className="absolute top-full left-0 mt-1 z-20 bg-bg-secondary border border-border-default rounded-lg p-1.5 shadow-xl grid grid-cols-4 gap-1 w-[76px]">
                {ENTITY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      updateEntity(entityId, { color: c });
                      setShowColorPicker(false);
                    }}
                    className={`w-3.5 h-3.5 rounded-full transition-all hover:scale-125 cursor-pointer ${
                      c === color ? 'ring-2 ring-offset-1 ring-offset-bg-secondary ring-white' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Entity name - truncates to preserve layout */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <InlineEdit
            value={name}
            onSave={(v) => { updateEntity(entityId, { name: v }); updateFKRefs(entityId, name, v); }}
            className="text-[11px] font-semibold truncate block"
            placeholder="entity_name"
          />
        </div>

        {/* Compact badges */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {pkCount !== undefined && pkCount > 0 && (
            <span className="text-[7px] font-bold text-warning bg-warning-muted rounded px-0.5 py-0.5 leading-none">
              PK
            </span>
          )}
          {fkCount !== undefined && fkCount > 0 && (
            <span className="text-[7px] font-bold text-accent bg-accent-muted rounded px-0.5 py-0.5 leading-none">
              {fkCount}FK
            </span>
          )}
          {referencedBy.length > 0 && (
            <span
              className="text-[7px] font-bold text-cyan-400 bg-cyan-400/10 rounded px-0.5 py-0.5 leading-none cursor-help"
              title={`Referenced by:\n${referencedBy.map((r) => `${r}`).join('\n')}`}
            >
              {referencedBy.length}ref
            </span>
          )}
          {warnings.length > 0 && (
            <span
              className="text-[7px] font-bold text-orange-400 bg-orange-400/10 rounded px-0.5 py-0.5 leading-none cursor-help"
              title={warnings.join('\n')}
            >
              {warnings.length}!
            </span>
          )}
          <span
            className="text-[9px] text-text-muted cursor-help"
            title={infoTooltip}
          >
            {columnCount}
          </span>
          {columnMatchCount !== undefined && columnMatchCount > 0 && (
            <span className="text-[7px] font-medium text-accent bg-accent-muted rounded px-0.5 py-0.5 leading-none">
              {columnMatchCount}
            </span>
          )}
        </div>

        {/* Overflow menu - replaces individual action buttons */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer opacity-0 group-hover/header:opacity-100 p-0.5"
            title="Actions"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-bg-secondary border border-border-default rounded-lg shadow-xl overflow-hidden w-44">
              {/* Description inline edit */}
              <div className="px-3 py-1.5 border-b border-border-default">
                <InlineEdit
                  value={description}
                  onSave={(v) => updateEntity(entityId, { description: v })}
                  className="text-[10px] text-text-muted block w-full"
                  placeholder="Add description..."
                />
              </div>

              {/* Tags section */}
              <div className="px-3 py-1.5 border-b border-border-default">
                <div className="flex items-center flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="group/tag inline-flex items-center gap-0.5 text-[8px] font-medium rounded px-1 py-0.5 leading-none"
                      style={{ backgroundColor: `${tagColor(tag)}25`, color: tagColor(tag), border: `1px solid ${tagColor(tag)}40` }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeEntityTag(entityId, tag)}
                        className="ml-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity cursor-pointer"
                      >
                        <svg className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {showTagInput ? (
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
                        if (e.key === 'Escape') { setShowTagInput(false); setTagDraft(''); }
                      }}
                      onBlur={handleAddTag}
                      placeholder="tag..."
                      className="text-[9px] bg-bg-primary border border-border-focus rounded px-1 py-0.5 text-text-primary placeholder:text-text-placeholder outline-none w-14"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTagInput(true)}
                      className="text-[9px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                    >
                      + tag
                    </button>
                  )}
                </div>
              </div>

              {/* Info row */}
              {(linkedFeatureCount > 0 || linkedEndpointCount > 0) && (
                <div className="px-3 py-1.5 border-b border-border-default flex items-center gap-2 text-[9px] text-text-muted">
                  {linkedFeatureCount > 0 && (
                    <span className="text-success">{linkedFeatureCount} feature{linkedFeatureCount !== 1 ? 's' : ''}</span>
                  )}
                  {linkedEndpointCount > 0 && (
                    <button
                      type="button"
                      onClick={() => { setActiveTab('api'); setShowMenu(false); }}
                      className="text-warning hover:opacity-80 cursor-pointer"
                    >
                      {linkedEndpointCount} endpoint{linkedEndpointCount !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              )}

              {/* Copy submenu */}
              {onCopyAs && (
                <div className="border-b border-border-default">
                  <p className="text-[9px] text-text-muted uppercase tracking-wider px-3 py-1">Copy as</p>
                  {COPY_OPTIONS.map(({ format, label }) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => { onCopyAs(format); setShowMenu(false); }}
                      className={`w-full flex items-center justify-between px-3 py-1 text-left cursor-pointer transition-colors hover:bg-bg-hover ${
                        copiedFormat === format ? 'text-success' : 'text-text-secondary'
                      }`}
                    >
                      <span className="text-[10px]">{label}</span>
                      {copiedFormat === format && (
                        <svg className="w-2.5 h-2.5 text-success flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              <button
                type="button"
                onClick={() => { handleGenerateCrudEndpoints(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[10px] text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Generate CRUD
              </button>
              <button
                type="button"
                onClick={() => { duplicateEntity(entityId); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[10px] text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => { removeEntity(entityId); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[10px] text-danger hover:bg-danger-muted transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Column filter - only for large entities */}
      {showFilter && !collapsed && (
        <div className="px-2 py-1 border-b border-border-default/50 bg-bg-tertiary/20">
          <div className="relative">
            <svg className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-text-muted pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={columnFilter ?? ''}
              onChange={(e) => onColumnFilterChange!(e.target.value)}
              placeholder="Filter columns..."
              className="w-full text-[10px] bg-bg-primary border border-border-default rounded pl-5 pr-5 py-0.5 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors"
            />
            {columnFilter && (
              <button
                type="button"
                onClick={() => onColumnFilterChange!('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
