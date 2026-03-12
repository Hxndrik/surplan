import { useState, useRef } from 'react';
import { useEntityStore } from '../../store/useEntityStore';
import { useUIStore } from '../../store/useUIStore';
import { COLUMN_PRESETS } from '../../lib/templates';
import type { EntityId, DataType, Column } from '../../types';
import { DATA_TYPES } from '../../types';

function parseBatchInput(input: string): { name: string; dataType: DataType }[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const colonIdx = s.indexOf(':');
      if (colonIdx === -1) return { name: s.trim(), dataType: 'string' as DataType };
      const name = s.slice(0, colonIdx).trim();
      const rawType = s.slice(colonIdx + 1).trim().toLowerCase();
      const exact = DATA_TYPES.find((t) => t === rawType);
      const prefixed = DATA_TYPES.find((t) => t.startsWith(rawType));
      const type: DataType = exact ?? prefixed ?? 'string';
      return { name, dataType: type };
    })
    .filter((c) => c.name.length > 0);
}

interface AddColumnRowProps {
  entityId: EntityId;
}

export function AddColumnRow({ entityId }: AddColumnRowProps) {
  const addColumn = useEntityStore((s) => s.addColumn);
  const addColumnPreset = useEntityStore((s) => s.addColumnPreset);
  const setEditingColumn = useUIStore((s) => s.setEditingColumn);
  const columnClipboard = useUIStore((s) => s.columnClipboard);
  const [showPresets, setShowPresets] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const batchRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const columnId = addColumn(entityId);
    setEditingColumn(columnId);
  };

  const handlePreset = (presetId: string) => {
    const p = COLUMN_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    addColumnPreset(entityId, p.preset);
    setShowPresets(false);
  };

  const handleBatchPreset = (type: 'timestamps' | 'softdelete') => {
    if (type === 'timestamps') {
      addColumnPreset(entityId, { name: 'created_at', dataType: 'timestamp', nullable: false, defaultValue: 'now()' });
      addColumnPreset(entityId, { name: 'updated_at', dataType: 'timestamp', nullable: false, defaultValue: 'now()' });
    } else if (type === 'softdelete') {
      addColumnPreset(entityId, { name: 'deleted_at', dataType: 'timestamp', nullable: true, note: 'Soft delete timestamp' });
      addColumnPreset(entityId, { name: 'is_deleted', dataType: 'boolean', nullable: false, defaultValue: 'false' });
    }
    setShowPresets(false);
  };

  const handleBatchSubmit = () => {
    const cols = parseBatchInput(batchInput);
    for (const col of cols) {
      addColumnPreset(entityId, col);
    }
    setBatchInput('');
    setBatchMode(false);
  };

  const openBatchMode = () => {
    setShowPresets(false);
    setBatchMode(true);
    setTimeout(() => batchRef.current?.focus(), 0);
  };

  const handlePasteColumn = () => {
    if (!columnClipboard) return;
    addColumnPreset(entityId, columnClipboard as Partial<Column>);
  };

  if (batchMode) {
    return (
      <div className="border-t border-border-default/50 px-2 py-1.5 bg-bg-primary/30 animate-fade-in">
        <div className="flex items-center gap-1.5">
          <input
            ref={batchRef}
            type="text"
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleBatchSubmit(); }
              if (e.key === 'Escape') { setBatchMode(false); setBatchInput(''); }
            }}
            placeholder="name:varchar, age:integer, active:boolean, ..."
            className="flex-1 text-[10px] bg-bg-tertiary border border-border-default rounded px-2 py-1 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors"
          />
          <button
            type="button"
            onClick={handleBatchSubmit}
            disabled={!batchInput.trim()}
            className="text-[10px] px-2 py-1 rounded bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            Add {parseBatchInput(batchInput).length > 0 ? `${parseBatchInput(batchInput).length}` : ''}
          </button>
          <button
            type="button"
            onClick={() => { setBatchMode(false); setBatchInput(''); }}
            className="text-[10px] px-1.5 py-1 rounded text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer flex-shrink-0"
          >
            ✕
          </button>
        </div>
        <p className="text-[9px] text-text-muted mt-1">
          Tip: <span className="font-mono">col:type</span> — types: varchar, integer, boolean, timestamp, uuid, text, ... · Enter to confirm
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex items-center border-t border-border-default/50">
      <button
        type="button"
        onClick={handleAdd}
        className="flex-1 text-left text-[10px] text-text-muted hover:text-text-secondary px-2 py-1 hover:bg-bg-hover transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add column
      </button>

      {/* Batch text input trigger */}
      <button
        type="button"
        onClick={openBatchMode}
        title="Batch add columns (name:type, ...)"
        className="px-2 py-1.5 text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer text-[10px] border-l border-border-default/50"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
        </svg>
      </button>

      {/* Paste column from clipboard */}
      {columnClipboard && (
        <button
          type="button"
          onClick={handlePasteColumn}
          title={`Paste column: ${columnClipboard.name} (${columnClipboard.dataType})`}
          className="px-2 py-1.5 text-accent hover:text-accent-hover hover:bg-bg-hover transition-colors cursor-pointer text-[10px] border-l border-border-default/50 flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="font-mono">{columnClipboard.name}</span>
        </button>
      )}

      {/* Presets dropdown trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          title="Add preset column"
          className="px-2 py-1.5 text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer text-[10px] border-l border-border-default/50"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {showPresets && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowPresets(false)} />
            <div className="absolute bottom-full right-0 mb-1 z-20 bg-bg-secondary border border-border-default rounded-lg shadow-xl overflow-hidden min-w-[200px]">
              <p className="text-[10px] text-text-muted uppercase tracking-wider px-3 py-1.5 border-b border-border-default">
                Batch
              </p>
              <button
                type="button"
                onClick={() => handleBatchPreset('timestamps')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-bg-hover transition-colors cursor-pointer"
              >
                <span className="text-sm">⏱️</span>
                <div>
                  <span className="text-xs text-text-secondary block">Add timestamps</span>
                  <span className="text-[10px] text-text-muted">created_at + updated_at</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleBatchPreset('softdelete')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-bg-hover transition-colors cursor-pointer"
              >
                <span className="text-sm">🗑️</span>
                <div>
                  <span className="text-xs text-text-secondary block">Add soft delete</span>
                  <span className="text-[10px] text-text-muted">deleted_at + is_deleted</span>
                </div>
              </button>
              <p className="text-[10px] text-text-muted uppercase tracking-wider px-3 py-1.5 border-t border-border-default">
                Single column
              </p>
              {COLUMN_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePreset(p.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-bg-hover transition-colors cursor-pointer"
                >
                  <span className="text-sm">{p.icon}</span>
                  <span className="text-xs text-text-secondary">{p.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
