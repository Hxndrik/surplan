import { useState } from 'react';
import { parseSchemaAuto } from '../../lib/sqlParser';
import type { ParsedTable } from '../../lib/sqlParser';
import { useEntityStore } from '../../store/useEntityStore';
import { createId } from '../../lib/id';
import type { DataType, EntityColor } from '../../types';
import { ENTITY_COLORS } from '../../types';

const PLACEHOLDER = `-- Paste SQL, Prisma schema, or TypeScript interfaces, e.g.:

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

interface Props {
  onClose: () => void;
}

let colorCursor = 0;
function pickColor(): EntityColor {
  const c = ENTITY_COLORS[colorCursor % ENTITY_COLORS.length];
  colorCursor++;
  return c;
}

export function SqlImportModal({ onClose }: Props) {
  const [sql, setSql] = useState('');
  const [parsed, setParsed] = useState<ParsedTable[] | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<'sql' | 'prisma' | 'typescript' | 'unknown'>('unknown');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const addEntityFromTemplate = useEntityStore((s) => s.addEntityFromTemplate);

  const handleParse = () => {
    const result = parseSchemaAuto(sql);
    setParsed(result.tables);
    setDetectedFormat(result.format);
    setSelected(new Set(result.tables.map((t) => t.name)));
  };

  const toggleTable = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleImport = () => {
    if (!parsed) return;
    for (const table of parsed) {
      if (!selected.has(table.name)) continue;
      addEntityFromTemplate({
        name: table.name,
        description: '',
        color: pickColor(),
        collapsed: false,
        updatedAt: Date.now(),
        tags: [],
        columns: table.columns.map((c, i) => ({
          id: createId(),
          name: c.name,
          dataType: c.dataType as DataType,
          nullable: c.nullable,
          primaryKey: c.primaryKey,
          unique: c.unique,
          indexed: false,
          defaultValue: c.defaultValue,
          enumValues: c.enumValues ?? '',
          check: c.check ?? '',
          references: null,
          note: c.note,
          order: i,
        })),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-bg-secondary border border-border-default rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Import Schema</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Paste SQL, Prisma schema, or TypeScript interfaces</p>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {!parsed ? (
            <>
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder={PLACEHOLDER}
                spellCheck={false}
                className="w-full h-72 font-mono text-[11px] bg-bg-primary border border-border-default rounded-lg p-3 text-text-secondary placeholder:text-text-placeholder outline-none focus:border-border-focus resize-none transition-colors"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-text-muted">
                  Supports SQL (PostgreSQL, MySQL, SQLite), Prisma schema, and TypeScript interfaces
                </p>
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={!sql.trim()}
                  className="text-xs px-4 py-1.5 rounded-lg bg-accent text-white font-medium cursor-pointer hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Parse SQL →
                </button>
              </div>
            </>
          ) : parsed.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-text-muted mb-3">No CREATE TABLE statements found.</p>
              <button type="button" onClick={() => setParsed(null)} className="text-xs text-accent cursor-pointer hover:underline">
                ← Go back
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-text-muted">
                  Found <span className="text-text-secondary font-medium">{parsed.length}</span> {detectedFormat === 'typescript' ? 'interface' : 'table'}{parsed.length !== 1 ? 's' : ''} — select which to import:
                  {detectedFormat !== 'unknown' && (
                    <span className="ml-2 text-[9px] uppercase tracking-wider text-accent bg-accent-muted rounded px-1.5 py-0.5">
                      {detectedFormat === 'sql' ? 'SQL' : detectedFormat === 'prisma' ? 'Prisma' : 'TypeScript'}
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelected(new Set(parsed.map((t) => t.name)))} className="text-[10px] text-accent cursor-pointer hover:underline">All</button>
                  <span className="text-text-muted text-[10px]">·</span>
                  <button type="button" onClick={() => setSelected(new Set())} className="text-[10px] text-accent cursor-pointer hover:underline">None</button>
                </div>
              </div>

              <div className="space-y-2">
                {parsed.map((table) => (
                  <label
                    key={table.name}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected.has(table.name)
                        ? 'border-accent/50 bg-accent-muted/10'
                        : 'border-border-default bg-bg-primary/40 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(table.name)}
                      onChange={() => toggleTable(table.name)}
                      className="mt-0.5 accent-[var(--color-accent)] cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold font-mono text-text-primary">{table.name}</span>
                        <span className="text-[9px] text-text-muted">{table.columns.length} col{table.columns.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {table.columns.map((col) => (
                          <span
                            key={col.name}
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                              col.primaryKey
                                ? 'bg-warning-muted text-warning border-warning/30'
                                : 'bg-bg-tertiary text-text-muted border-border-default'
                            }`}
                            title={`${col.dataType}${col.nullable ? ' NULL' : ' NOT NULL'}${col.unique ? ' UNIQUE' : ''}`}
                          >
                            {col.primaryKey && <span className="mr-0.5 text-warning">PK</span>}
                            {col.name}
                            <span className="ml-1 opacity-60">{col.dataType}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {parsed && parsed.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
            <button type="button" onClick={() => setParsed(null)} className="text-xs text-text-muted hover:text-text-secondary cursor-pointer transition-colors">
              ← Back
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={selected.size === 0}
              className="text-xs px-4 py-1.5 rounded-lg bg-accent text-white font-medium cursor-pointer hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Import {selected.size > 0 ? `${selected.size} ` : ''}table{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
