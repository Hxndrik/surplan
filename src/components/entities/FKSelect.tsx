import { useState, useRef, useEffect } from 'react';
import { useEntityStore } from '../../store/useEntityStore';
import type { ForeignKeyRef, EntityId } from '../../types';

interface FKSelectProps {
  value: ForeignKeyRef | null;
  currentEntityId: EntityId;
  columnName?: string;
  onChange: (ref: ForeignKeyRef | null) => void;
}

function detectFKSuggestions(
  columnName: string,
  entities: { id: EntityId; name: string; columns: { id: string; name: string; dataType: string; primaryKey: boolean }[] }[],
  currentEntityId: EntityId
): { entityId: EntityId; entityName: string; columnName: string }[] {
  if (!columnName) return [];
  const cn = columnName.toLowerCase();
  // Strip _id or Id suffix to get the entity name prefix
  let prefix = '';
  if (cn.endsWith('_id')) prefix = cn.slice(0, -3);
  else if (cn.endsWith('id') && cn.length > 2) prefix = cn.slice(0, -2).replace(/_$/, '');
  if (!prefix) return [];

  const suggestions: { entityId: EntityId; entityName: string; columnName: string }[] = [];
  for (const e of entities) {
    if (e.id === currentEntityId) continue;
    const eName = e.name.toLowerCase();
    // Match plural/singular: users → user, user → users
    if (eName === prefix || eName === prefix + 's' || eName + 's' === prefix || eName === prefix + 'es') {
      const pkCol = e.columns.find((c) => c.primaryKey) ?? e.columns.find((c) => c.name === 'id');
      if (pkCol) {
        suggestions.push({ entityId: e.id, entityName: e.name, columnName: pkCol.name });
      }
    }
  }
  return suggestions;
}

export function FKSelect({ value, currentEntityId, columnName, onChange }: FKSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const entities = useEntityStore((s) => s.entities);

  const otherEntities = entities.filter((e) => e.id !== currentEntityId);
  const suggestions = detectFKSuggestions(columnName ?? '', entities, currentEntityId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const label = value
    ? `${value.entityName}.${value.columnName}`
    : 'None';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer transition-colors w-full text-left flex items-center justify-between gap-1 ${
          value
            ? 'border-accent/40 text-accent bg-accent-muted'
            : 'border-border-default text-text-muted hover:border-border-active'
        }`}
      >
        <span className="truncate">{label}</span>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="text-text-muted hover:text-danger flex-shrink-0 ml-1"
          >✕</button>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 bottom-full left-0 mb-1 w-52 bg-bg-secondary border border-border-default rounded-md shadow-lg overflow-hidden animate-fade-in">
          {otherEntities.length === 0 ? (
            <p className="text-[10px] text-text-muted px-3 py-2">No other entities yet</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {suggestions.length > 0 && (
                <>
                  <div className="px-3 py-1 text-[9px] text-accent uppercase tracking-wider border-b border-border-default bg-accent-muted/10 flex items-center gap-1">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Suggested
                  </div>
                  {suggestions.map((s) => (
                    <button
                      key={`${s.entityId}-${s.columnName}`}
                      type="button"
                      onClick={() => { onChange(s); setIsOpen(false); }}
                      className="w-full text-left text-[10px] px-4 py-1.5 cursor-pointer transition-colors flex items-center justify-between text-accent bg-accent-muted/5 hover:bg-accent-muted/20"
                    >
                      <span className="font-medium">{s.entityName}.{s.columnName}</span>
                      <span className="text-[9px] opacity-60">auto</span>
                    </button>
                  ))}
                </>
              )}
              {otherEntities.map((entity) => (
                <div key={entity.id}>
                  <div className="px-3 py-1 text-[9px] text-text-muted uppercase tracking-wider border-b border-border-default bg-bg-primary/40">
                    {entity.name}
                  </div>
                  {entity.columns.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        onChange({
                          entityId: entity.id,
                          entityName: entity.name,
                          columnName: col.name,
                        });
                        setIsOpen(false);
                      }}
                      className={`w-full text-left text-[10px] px-4 py-1.5 cursor-pointer transition-colors flex items-center justify-between ${
                        value?.entityId === entity.id && value?.columnName === col.name
                          ? 'bg-accent-muted text-accent'
                          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }`}
                    >
                      <span>{col.name || '(unnamed)'}</span>
                      <span className="text-text-muted text-[9px]">{col.dataType}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
