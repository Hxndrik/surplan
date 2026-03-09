import { useState, useMemo, useEffect, useRef } from 'react';
import { useEntityStore } from '../../store/useEntityStore';

interface Match {
  entityId: string;
  entityName: string;
  type: 'entity' | 'column';
  columnId?: string;
  currentValue: string;
}

interface FindReplaceModalProps {
  onClose: () => void;
}

export function FindReplaceModal({ onClose }: FindReplaceModalProps) {
  const entities = useEntityStore((s) => s.entities);
  const updateEntity = useEntityStore((s) => s.updateEntity);
  const updateColumn = useEntityStore((s) => s.updateColumn);

  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchWhole, setMatchWhole] = useState(false);
  const [scope, setScope] = useState<'all' | 'entities' | 'columns'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState(false);
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const matches = useMemo<Match[]>(() => {
    const q = find.trim();
    if (!q) return [];
    const results: Match[] = [];

    const test = (val: string): boolean => {
      const a = caseSensitive ? val : val.toLowerCase();
      const b = caseSensitive ? q : q.toLowerCase();
      if (matchWhole) return a === b;
      return a.includes(b);
    };

    entities.forEach((e) => {
      if (scope !== 'columns' && test(e.name)) {
        results.push({ entityId: e.id, entityName: e.name, type: 'entity', currentValue: e.name });
      }
      if (scope !== 'entities') {
        e.columns.forEach((c) => {
          if (test(c.name)) {
            results.push({ entityId: e.id, entityName: e.name, type: 'column', columnId: c.id, currentValue: c.name });
          }
        });
      }
    });
    return results;
  }, [find, entities, caseSensitive, matchWhole, scope]);

  // Auto-select all on new matches
  const matchKeys = useMemo(() => matches.map((m, i) => `${m.entityId}:${m.type}:${m.columnId ?? ''}:${i}`), [matches]);
  useEffect(() => {
    setSelected(new Set(matchKeys));
    setApplied(false);
  }, [matchKeys.join(',')]);

  const previewValue = (current: string): string => {
    if (!find.trim()) return current;
    const flags = caseSensitive ? 'g' : 'gi';
    try {
      if (matchWhole) {
        const test = caseSensitive ? current === find : current.toLowerCase() === find.toLowerCase();
        return test ? replace : current;
      }
      const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      return current.replace(re, replace);
    } catch {
      return current;
    }
  };

  const handleApply = () => {
    matchKeys.forEach((key, i) => {
      if (!selected.has(key)) return;
      const m = matches[i];
      const newVal = previewValue(m.currentValue);
      if (newVal === m.currentValue) return;
      if (m.type === 'entity') {
        updateEntity(m.entityId, { name: newVal });
      } else if (m.columnId) {
        updateColumn(m.entityId, m.columnId, { name: newVal });
      }
    });
    setApplied(true);
    setFind('');
  };

  const toggleKey = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected = matchKeys.length > 0 && matchKeys.every((k) => selected.has(k));
  const someSelected = matchKeys.some((k) => selected.has(k));

  return (
    <div
      className="fixed inset-0 z-[9997] flex items-start justify-center pt-[8vh] bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-bg-secondary border border-border-active rounded-xl shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Find & Replace</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Rename column names and entity names across all entities</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary cursor-pointer transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Find + Replace inputs */}
        <div className="px-5 pt-4 pb-3 space-y-3 border-b border-border-default">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Find</label>
              <input
                ref={findRef}
                type="text"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="Search term..."
                className="w-full text-xs bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Replace with</label>
              <input
                type="text"
                value={replace}
                onChange={(e) => setReplace(e.target.value)}
                placeholder="Replacement..."
                className="w-full text-xs bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="w-3 h-3 accent-indigo-500 cursor-pointer"
              />
              <span className="text-[11px] text-text-muted">Case sensitive</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={matchWhole}
                onChange={(e) => setMatchWhole(e.target.checked)}
                className="w-3 h-3 accent-indigo-500 cursor-pointer"
              />
              <span className="text-[11px] text-text-muted">Match whole word</span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-text-muted">Scope:</span>
              {(['all', 'entities', 'columns'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    scope === s
                      ? 'bg-accent text-white'
                      : 'bg-bg-primary border border-border-default text-text-muted hover:border-border-active hover:text-text-secondary'
                  }`}
                >
                  {s === 'all' ? 'All' : s === 'entities' ? 'Tables' : 'Columns'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col" style={{ maxHeight: '40vh' }}>
          {find.trim() === '' ? (
            <div className="flex items-center justify-center py-10 text-text-muted text-xs">
              Type a search term to find matches.
            </div>
          ) : matches.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-text-muted text-xs">
              No matches found.
            </div>
          ) : (
            <>
              {/* Select all header */}
              <div className="flex items-center gap-3 px-5 py-2 border-b border-border-default bg-bg-primary/30">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(matchKeys));
                      else setSelected(new Set());
                    }}
                    className="w-3 h-3 accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-text-muted">
                    {matchKeys.filter((k) => selected.has(k)).length} / {matches.length} selected
                  </span>
                </label>
                <span className="text-[10px] text-text-muted ml-auto">Preview</span>
              </div>

              <div className="overflow-y-auto divide-y divide-border-default">
                {matches.map((m, i) => {
                  const key = matchKeys[i];
                  const preview = previewValue(m.currentValue);
                  const changed = preview !== m.currentValue;
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-3 px-5 py-2 hover:bg-bg-hover transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggleKey(key)}
                        className="w-3 h-3 accent-indigo-500 cursor-pointer flex-shrink-0"
                      />
                      <div className="flex items-center gap-1.5 min-w-[80px] flex-shrink-0">
                        <span
                          className={`text-[8px] font-bold rounded px-1 py-0.5 ${
                            m.type === 'entity'
                              ? 'bg-warning-muted text-warning'
                              : 'bg-bg-tertiary text-text-muted border border-border-default'
                          }`}
                        >
                          {m.type === 'entity' ? 'TABLE' : 'COL'}
                        </span>
                        <span className="text-[10px] text-text-muted truncate max-w-[60px]" title={m.entityName}>
                          {m.entityName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0 font-mono">
                        <span className="text-[11px] text-text-secondary bg-bg-primary px-1.5 py-0.5 rounded truncate">
                          {m.currentValue}
                        </span>
                        {changed && (
                          <>
                            <svg className="w-3 h-3 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <span className="text-[11px] text-success bg-success/10 px-1.5 py-0.5 rounded truncate">
                              {preview}
                            </span>
                          </>
                        )}
                        {!changed && (
                          <span className="text-[10px] text-text-muted">(no change)</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-default">
          <div>
            {applied && (
              <span className="text-[11px] text-success flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Changes applied
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded border border-border-default text-text-muted hover:border-border-active hover:text-text-secondary transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!someSelected || !find.trim()}
              className="text-xs px-4 py-1.5 rounded bg-accent hover:bg-accent-hover text-white cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Replace {matchKeys.filter((k) => selected.has(k)).length > 0
                ? `${matchKeys.filter((k) => selected.has(k)).length} match${matchKeys.filter((k) => selected.has(k)).length !== 1 ? 'es' : ''}`
                : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
