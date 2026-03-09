import { useState, useRef, useEffect } from 'react';
import { useEntityStore } from '../../store/useEntityStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { InlineEdit } from '../shared/InlineEdit';
import { IconButton } from '../shared/IconButton';
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
  // Compute which entities reference this one via FK — return stable string to avoid infinite loop
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
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showTagInput) tagInputRef.current?.focus();
  }, [showTagInput]);

  useEffect(() => {
    if (!showCopyMenu) return;
    const handler = (e: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCopyMenu]);

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

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default bg-bg-tertiary/50 group/header rounded-t-lg">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag handle */}
          {dragHandle && (
            <button
              type="button"
              className="cursor-grab touch-none text-text-muted opacity-0 group-hover/header:opacity-100 hover:text-text-secondary transition-opacity flex-shrink-0"
              title="Drag to reorder"
              {...dragHandle}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
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
              className={`w-3.5 h-3.5 transition-transform ${collapsed ? '' : 'rotate-90'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Color dot + picker */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-3 h-3 rounded-full ring-1 ring-black/20 hover:ring-2 hover:scale-110 transition-all cursor-pointer block"
              style={{ backgroundColor: color }}
              title="Change entity color"
            />
            {showColorPicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowColorPicker(false)}
                />
                <div className="absolute top-full left-0 mt-1.5 z-20 bg-bg-secondary border border-border-default rounded-lg p-2 shadow-xl grid grid-cols-4 gap-1.5 w-[92px]">
                  {ENTITY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        updateEntity(entityId, { color: c });
                        setShowColorPicker(false);
                      }}
                      className={`w-4 h-4 rounded-full transition-all hover:scale-125 cursor-pointer ${
                        c === color ? 'ring-2 ring-offset-1 ring-offset-bg-secondary ring-white' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Name + description + tags */}
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={name}
              onSave={(v) => { updateEntity(entityId, { name: v }); updateFKRefs(entityId, name, v); }}
              className="text-xs font-semibold truncate block"
              placeholder="entity_name"
            />
            <InlineEdit
              value={description}
              onSave={(v) => updateEntity(entityId, { description: v })}
              className="text-[10px] text-text-muted block mt-0 truncate"
              placeholder="Add description..."
            />
            {/* Tags row */}
            {(tags.length > 0 || showTagInput) && (
              <div className="flex items-center flex-wrap gap-1 mt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="group/tag inline-flex items-center gap-0.5 text-[9px] font-medium rounded px-1.5 py-0.5 leading-none cursor-default"
                    style={{ backgroundColor: `${tagColor(tag)}25`, color: tagColor(tag), border: `1px solid ${tagColor(tag)}40` }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeEntityTag(entityId, tag)}
                      className="ml-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity cursor-pointer hover:opacity-80"
                      title={`Remove tag "${tag}"`}
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
                    className="text-[9px] bg-bg-primary border border-border-focus rounded px-1.5 py-0.5 text-text-primary placeholder:text-text-placeholder outline-none w-14"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTagInput(true)}
                    className="text-[9px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer opacity-0 group-hover/header:opacity-100"
                    title="Add tag"
                  >
                    + tag
                  </button>
                )}
              </div>
            )}
            {tags.length === 0 && !showTagInput && (
              <button
                type="button"
                onClick={() => setShowTagInput(true)}
                className="text-[9px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer opacity-0 group-hover/header:opacity-100 block mt-0.5"
                title="Add tag"
              >
                + tag
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
            {pkCount !== undefined && pkCount > 0 && (
              <span className="text-[8px] font-bold text-warning bg-warning-muted rounded px-1 py-0.5 leading-none">
                PK
              </span>
            )}
            {fkCount !== undefined && fkCount > 0 && (
              <span className="text-[8px] font-bold text-accent bg-accent-muted rounded px-1 py-0.5 leading-none">
                {fkCount}FK
              </span>
            )}
            {referencedBy.length > 0 && (
              <span
                className="text-[8px] font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 rounded px-1 py-0.5 leading-none cursor-help"
                title={`Referenced by:\n${referencedBy.map((r) => `• ${r}`).join('\n')}`}
              >
                ←{referencedBy.length}
              </span>
            )}
            <span
              className="text-[10px] text-text-muted cursor-help"
              title={typeBreakdown ? `${columnCount} column${columnCount !== 1 ? 's' : ''}: ${typeBreakdown}` : `${columnCount} column${columnCount !== 1 ? 's' : ''}`}
            >
              {columnCount} col{columnCount !== 1 ? 's' : ''}
            </span>
            {linkedFeatureCount > 0 && (
              <span className="text-[8px] font-medium text-success bg-success-muted rounded px-1 py-0.5 leading-none" title={`${linkedFeatureCount} feature${linkedFeatureCount !== 1 ? 's' : ''} reference this entity`}>
                {linkedFeatureCount}f
              </span>
            )}
            {linkedEndpointCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('api')}
                className="text-[8px] font-medium text-warning bg-warning-muted rounded px-1 py-0.5 leading-none cursor-pointer hover:opacity-80 transition-opacity"
                title={`${linkedEndpointCount} API endpoint${linkedEndpointCount !== 1 ? 's' : ''} reference this entity — click to go to API tab`}
              >
                {linkedEndpointCount}ep
              </button>
            )}
            {warnings.length > 0 && (
              <span
                className="flex-shrink-0 text-[8px] font-bold text-orange-400 bg-orange-400/10 border border-orange-400/30 rounded px-1 py-0.5 leading-none cursor-help"
                title={warnings.join('\n')}
              >
                ⚠ {warnings.length}
              </span>
            )}
            {columnMatchCount !== undefined && columnMatchCount > 0 && (
              <span
                className="flex-shrink-0 text-[8px] font-medium text-accent bg-accent-muted border border-accent/25 rounded px-1 py-0.5 leading-none"
                title={`${columnMatchCount} column${columnMatchCount !== 1 ? 's' : ''} match search`}
              >
                {columnMatchCount}↓
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
          {onCopyAs && (
            <div className="relative" ref={copyMenuRef}>
              <IconButton onClick={() => setShowCopyMenu((v) => !v)} title="Copy entity as…">
                {copiedFormat ? (
                  <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </IconButton>
              {showCopyMenu && (
                <div className="absolute right-0 top-full mt-1 z-30 bg-bg-secondary border border-border-default rounded-lg shadow-xl overflow-hidden w-40">
                  {COPY_OPTIONS.map(({ format, label }) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => { onCopyAs(format); setShowCopyMenu(false); }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left cursor-pointer transition-colors hover:bg-bg-hover ${
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
            </div>
          )}
          <IconButton onClick={handleGenerateCrudEndpoints} title="Generate CRUD endpoints → API tab">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </IconButton>
          <IconButton onClick={() => duplicateEntity(entityId)} title="Duplicate entity">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </IconButton>
          <IconButton onClick={() => removeEntity(entityId)} title="Delete entity" variant="danger">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </IconButton>
        </div>
      </div>

      {showFilter && (
        <div className="px-2 py-1.5 border-b border-border-default bg-bg-tertiary/20">
          <div className="relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={columnFilter ?? ''}
              onChange={(e) => onColumnFilterChange!(e.target.value)}
              placeholder="Filter columns..."
              className="w-full text-[10px] bg-bg-primary border border-border-default rounded pl-6 pr-6 py-0.5 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors"
            />
            {columnFilter && (
              <button
                type="button"
                onClick={() => onColumnFilterChange!('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer"
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
