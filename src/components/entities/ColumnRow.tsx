import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Column, DataType, EntityId } from '../../types';
import { useEntityStore } from '../../store/useEntityStore';
import { useUIStore } from '../../store/useUIStore';
import { DataTypeSelect } from './DataTypeSelect';
import { Toggle } from '../shared/Toggle';
import { FKSelect } from './FKSelect';
import { COLUMN_SUGGESTIONS } from '../../lib/constants';
import type { ColumnSuggestion } from '../../lib/constants';

function buildColumnSQL(col: Column): string {
  let typePart = (col.dataType || 'TEXT').toUpperCase();
  if (col.dataType === 'enum' && col.enumValues?.trim()) {
    const vals = col.enumValues.split(',').map((v) => `'${v.trim()}'`).filter(Boolean).join(', ');
    typePart = `VARCHAR(50) CHECK (${col.name || 'col'} IN (${vals}))`;
  }
  const parts: string[] = [col.name || 'column_name', typePart];
  if (!col.nullable) parts.push('NOT NULL');
  if (col.primaryKey) parts.push('PRIMARY KEY');
  if (col.unique && !col.primaryKey) parts.push('UNIQUE');
  if (col.indexed) parts.push('/* INDEX */');
  if (col.defaultValue) parts.push(`DEFAULT ${col.defaultValue}`);
  if (col.references) parts.push(`REFERENCES ${col.references.entityName}(${col.references.columnName})`);
  if (col.note) parts.push(`-- ${col.note}`);
  return parts.join(' ');
}

interface ColumnRowProps {
  column: Column;
  entityId: EntityId;
  highlight?: string;
}

export const ColumnRow = memo(function ColumnRow({ column, entityId, highlight }: ColumnRowProps) {
  const updateColumn = useEntityStore((s) => s.updateColumn);
  const removeColumn = useEntityStore((s) => s.removeColumn);
  const duplicateColumn = useEntityStore((s) => s.duplicateColumn);
  const entities = useEntityStore((s) => s.entities);
  const editingColumnId = useUIStore((s) => s.editingColumnId);
  const setEditingColumn = useUIStore((s) => s.setEditingColumn);
  const columnClipboard = useUIStore((s) => s.columnClipboard);
  const setColumnClipboard = useUIStore((s) => s.setColumnClipboard);
  const nameRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clipped, setClipped] = useState(false);
  const [suggestions, setSuggestions] = useState<ColumnSuggestion[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const computeSuggestions = useCallback((val: string) => {
    if (!val.trim()) { setSuggestions([]); return; }
    const lower = val.toLowerCase();

    const fkSuggestions: ColumnSuggestion[] = [];
    const idSuffix = lower.endsWith('_id') ? '_id' : lower.endsWith('id') && lower.length > 2 ? 'id' : null;
    if (idSuffix) {
      const prefix = lower.slice(0, -idSuffix.length);
      if (prefix.length >= 2) {
        const candidates = [prefix, prefix + 's', prefix.replace(/ies$/, 'y'), prefix.replace(/s$/, '')];
        const matched = entities.find((e) =>
          e.id !== entityId && candidates.some((c) => c === e.name.toLowerCase())
        );
        if (matched) {
          const pkCol = matched.columns.find((c) => c.primaryKey) ?? matched.columns[0];
          if (pkCol) {
            fkSuggestions.push({
              name: val,
              dataType: pkCol.dataType,
              nullable: false,
              references: { entityId: matched.id, entityName: matched.name, columnName: pkCol.name },
              fkLabel: `→ FK: ${matched.name}.${pkCol.name}`,
            });
          }
        }
      }
    }

    const staticMatches = COLUMN_SUGGESTIONS.filter((s) =>
      s.name.startsWith(lower) && s.name !== val
    ).slice(0, 5);

    setSuggestions([...fkSuggestions, ...staticMatches]);
    setSuggestionIndex(-1);
  }, [entities, entityId]);

  const applySuggestion = useCallback((s: ColumnSuggestion) => {
    const patch: Partial<Column> = { name: s.name, dataType: s.dataType };
    if (s.nullable !== undefined) patch.nullable = s.nullable;
    if (s.primaryKey !== undefined) patch.primaryKey = s.primaryKey;
    if (s.unique !== undefined) patch.unique = s.unique;
    if (s.defaultValue !== undefined) patch.defaultValue = s.defaultValue;
    if (s.references !== undefined) patch.references = s.references;
    updateColumn(entityId, column.id, patch);
    if (s.dataType === 'enum') setExpanded(true);
    setSuggestions([]);
    setSuggestionIndex(-1);
  }, [entityId, column.id, updateColumn]);

  const copySQL = async () => {
    try {
      await navigator.clipboard.writeText(buildColumnSQL(column));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard not available */ }
  };

  const copyToColumnClipboard = () => {
    const { id: _id, order: _order, ...rest } = column;
    setColumnClipboard(rest);
    setClipped(true);
    setTimeout(() => setClipped(false), 1200);
  };

  const isInClipboard = columnClipboard?.name === column.name && columnClipboard?.dataType === column.dataType;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (editingColumnId === column.id && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [editingColumnId, column.id]);

  const hasExtra = column.unique || column.indexed || !!column.defaultValue || !!column.references || (column.dataType === 'enum' && !!column.enumValues) || !!column.check?.trim();
  const isMatch = highlight ? column.name.toLowerCase().includes(highlight.toLowerCase()) || column.note.toLowerCase().includes(highlight.toLowerCase()) || column.dataType.toLowerCase().includes(highlight.toLowerCase()) : false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-b border-border-default/50 transition-colors ${isDragging ? 'opacity-50 bg-bg-hover' : ''} ${isMatch ? 'bg-accent-muted/30' : ''}`}
    >
      {/* Landing-page style grid: NAME | TYPE | NULL | PK | expand | delete */}
      <div className="grid grid-cols-[1fr_72px_28px_28px_16px_16px] gap-0 items-center px-3 py-1 group hover:bg-bg-hover/50 transition-colors text-[10px]">
        {/* Name - mono, truncates. Also serves as drag handle via the row background */}
        <div
          className="relative min-w-0 cursor-grab touch-none"
          {...attributes}
          {...listeners}
        >
          <input
            ref={nameRef}
            type="text"
            value={column.name}
            onChange={(e) => {
              updateColumn(entityId, column.id, { name: e.target.value });
              computeSuggestions(e.target.value);
            }}
            onFocus={() => {
              setEditingColumn(column.id);
              computeSuggestions(column.name);
            }}
            onBlur={() => {
              setEditingColumn(null);
              setTimeout(() => setSuggestions([]), 150);
            }}
            onKeyDown={(e) => {
              if (!suggestions.length) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSuggestionIndex((i) => Math.min(i + 1, suggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSuggestionIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (suggestionIndex >= 0) {
                  e.preventDefault();
                  applySuggestion(suggestions[suggestionIndex]);
                }
              } else if (e.key === 'Escape') {
                setSuggestions([]);
              }
            }}
            placeholder="column_name"
            className="font-mono text-[11px] bg-transparent outline-none text-text-primary placeholder:text-text-placeholder py-0 rounded hover:bg-bg-tertiary focus:bg-bg-tertiary transition-colors w-full min-w-0 truncate cursor-text"
          />
          {suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 top-full mt-0.5 z-50 bg-bg-secondary border border-border-default rounded-lg shadow-xl min-w-[180px] overflow-hidden"
            >
              {suggestions.map((s, i) => (
                <button
                  key={s.fkLabel ? `fk-${s.name}` : s.name}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${
                    i === suggestionIndex ? 'bg-accent/20 text-text-primary' : 'text-text-secondary hover:bg-bg-hover'
                  } ${s.fkLabel ? 'border-b border-border-default' : ''}`}
                >
                  {s.fkLabel ? (
                    <>
                      <span className="text-[9px] font-bold text-accent bg-accent-muted rounded px-1 py-0.5 flex-shrink-0">FK</span>
                      <span className="text-[11px] text-accent flex-1">{s.fkLabel}</span>
                      <span className="text-[9px] text-text-muted uppercase tracking-wider flex-shrink-0">{s.dataType}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] font-mono font-medium flex-1">{s.name}</span>
                      <span className="text-[9px] text-text-muted uppercase tracking-wider flex-shrink-0">{s.dataType}</span>
                      {s.primaryKey && <span className="text-[8px] font-bold text-warning flex-shrink-0">PK</span>}
                      {s.unique && !s.primaryKey && <span className="text-[8px] font-bold text-accent flex-shrink-0">UQ</span>}
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type selector - standalone, not wrapped */}
        <DataTypeSelect
          value={column.dataType}
          onChange={(v: DataType) => {
            updateColumn(entityId, column.id, { dataType: v });
            if (v === 'enum') setExpanded(true);
          }}
        />

        {/* Nullable - circle/dash indicator, click to toggle */}
        <button
          type="button"
          onClick={() => updateColumn(entityId, column.id, { nullable: !column.nullable })}
          className="text-center text-text-muted hover:text-text-secondary cursor-pointer transition-colors"
          title={column.nullable ? 'Nullable (click to toggle)' : 'Not null (click to toggle)'}
        >
          {column.nullable ? '○' : '—'}
        </button>

        {/* PK - star/dash indicator, click to toggle */}
        <button
          type="button"
          onClick={() => updateColumn(entityId, column.id, { primaryKey: !column.primaryKey })}
          className={`text-center cursor-pointer transition-colors ${column.primaryKey ? 'text-warning' : 'text-text-muted hover:text-text-secondary'}`}
          title={column.primaryKey ? 'Primary Key (click to toggle)' : 'Not PK (click to toggle)'}
        >
          {column.primaryKey ? '★' : '—'}
        </button>

        {/* Expand chevron */}
        <button
          type="button"
          title={expanded ? 'Collapse' : 'Edit details'}
          onClick={() => setExpanded(!expanded)}
          className={`justify-self-center cursor-pointer transition-all ${
            hasExtra || expanded
              ? 'text-accent opacity-100'
              : 'text-text-muted opacity-0 group-hover:opacity-100'
          }`}
        >
          <svg
            className={`w-2.5 h-2.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Delete column */}
        <button
          type="button"
          onClick={() => removeColumn(entityId, column.id)}
          title="Delete column"
          className="justify-self-center opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-danger cursor-pointer"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded panel - all detailed editing controls */}
      {expanded && (
        <div className="px-6 py-2 bg-bg-primary/40 border-t border-border-default/50 animate-fade-in space-y-2">
          {/* Row 1: constraint toggles */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Toggle
                checked={column.primaryKey}
                onChange={(v) => updateColumn(entityId, column.id, { primaryKey: v })}
                label="Primary Key"
              />
              <span className="text-[10px] text-text-muted">Primary Key</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Toggle
                checked={column.unique}
                onChange={(v) => updateColumn(entityId, column.id, { unique: v })}
                label="Unique"
              />
              <span className="text-[10px] text-text-muted">Unique</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Toggle
                checked={column.nullable}
                onChange={(v) => updateColumn(entityId, column.id, { nullable: v })}
                label="Nullable"
              />
              <span className="text-[10px] text-text-muted">Nullable</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Toggle
                checked={column.indexed}
                onChange={(v) => updateColumn(entityId, column.id, { indexed: v })}
                label="Indexed"
              />
              <span className="text-[10px] text-text-muted">Indexed</span>
            </label>
          </div>

          {/* Default value */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted flex-shrink-0 w-12">Default</span>
            <input
              type="text"
              value={column.defaultValue}
              onChange={(e) => updateColumn(entityId, column.id, { defaultValue: e.target.value })}
              placeholder="e.g. now(), true, 0, ''"
              className="flex-1 text-[10px] bg-bg-tertiary border border-border-default rounded px-2 py-0.5 text-text-secondary outline-none focus:border-border-focus placeholder:text-text-placeholder min-w-0"
            />
          </div>
          {!column.defaultValue && (
            <div className="flex items-center gap-1 flex-wrap pl-14">
              {((): { label: string; value: string }[] => {
                const isNumeric = ['integer', 'bigint', 'smallint', 'float', 'decimal', 'numeric', 'number'].includes(column.dataType);
                const isDate = ['date', 'datetime', 'timestamp', 'timestamptz'].includes(column.dataType);
                const isBool = column.dataType === 'boolean';
                const isUuid = column.dataType === 'uuid';
                if (isUuid) return [{ label: 'gen_random_uuid()', value: 'gen_random_uuid()' }, { label: 'uuid_generate_v4()', value: 'uuid_generate_v4()' }];
                if (isDate) return [{ label: 'now()', value: 'now()' }, { label: 'CURRENT_TIMESTAMP', value: 'CURRENT_TIMESTAMP' }];
                if (isBool) return [{ label: 'true', value: 'true' }, { label: 'false', value: 'false' }];
                if (isNumeric) return [{ label: '0', value: '0' }, { label: '1', value: '1' }];
                return [{ label: "''", value: "''" }, { label: 'NULL', value: 'NULL' }];
              })().map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => updateColumn(entityId, column.id, { defaultValue: value })}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer border text-text-muted border-border-default hover:border-border-active hover:text-text-secondary bg-bg-primary transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Note */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted flex-shrink-0 w-12">Note</span>
            <input
              type="text"
              value={column.note}
              onChange={(e) => updateColumn(entityId, column.id, { note: e.target.value })}
              placeholder="Description or note..."
              className="flex-1 text-[10px] bg-bg-tertiary border border-border-default rounded px-2 py-0.5 text-text-secondary outline-none focus:border-border-focus placeholder:text-text-placeholder min-w-0"
            />
          </div>

          {/* Enum values */}
          {column.dataType === 'enum' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted flex-shrink-0 w-12">Values</span>
              <input
                type="text"
                value={column.enumValues ?? ''}
                onChange={(e) => updateColumn(entityId, column.id, { enumValues: e.target.value })}
                placeholder="active, inactive, pending, ..."
                className="flex-1 text-[10px] bg-bg-tertiary border border-border-default rounded px-2 py-0.5 text-text-secondary outline-none focus:border-border-focus placeholder:text-text-placeholder min-w-0 font-mono"
              />
            </div>
          )}

          {/* Check constraint */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted flex-shrink-0 w-12">Check</span>
            <input
              type="text"
              value={column.check ?? ''}
              onChange={(e) => updateColumn(entityId, column.id, { check: e.target.value })}
              placeholder="e.g. age > 0, price >= 0"
              className="flex-1 text-[10px] bg-bg-tertiary border border-border-default rounded px-2 py-0.5 text-text-secondary outline-none focus:border-border-focus placeholder:text-text-placeholder min-w-0 font-mono"
            />
          </div>

          {/* FK reference */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted flex-shrink-0 w-12">FK ref</span>
            <div className="flex-1">
              <FKSelect
                value={column.references}
                currentEntityId={entityId}
                columnName={column.name}
                onChange={(ref) => updateColumn(entityId, column.id, { references: ref })}
              />
            </div>
            {column.references && (
              <button
                type="button"
                title={`Jump to ${column.references.entityName}`}
                onClick={() => window.dispatchEvent(new CustomEvent('surplan:focus-entity', { detail: { entityId: column.references!.entityId } }))}
                className="flex-shrink-0 text-accent hover:text-accent-hover transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-2 pt-1 border-t border-border-default/30">
            <button
              type="button"
              onClick={copySQL}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${copied ? 'text-success border-success/30' : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary'}`}
            >
              {copied ? 'Copied!' : 'Copy SQL'}
            </button>
            <button
              type="button"
              onClick={() => duplicateColumn(entityId, column.id)}
              className="text-[10px] px-2 py-0.5 rounded border text-text-muted border-border-default hover:border-border-active hover:text-text-secondary transition-colors cursor-pointer"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={copyToColumnClipboard}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                clipped || isInClipboard ? 'text-accent border-accent/30' : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary'
              }`}
            >
              {clipped ? 'Copied!' : 'Clipboard'}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => removeColumn(entityId, column.id)}
              className="text-[10px] px-2 py-0.5 rounded border text-danger border-danger/30 hover:bg-danger-muted transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
