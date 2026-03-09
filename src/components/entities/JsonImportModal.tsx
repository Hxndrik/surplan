import { useState, useRef, useEffect } from 'react';
import { parseJsonToEntity, parseCsvToEntity } from '../../lib/importers';
import { useEntityStore } from '../../store/useEntityStore';
import { useToast } from '../../hooks/useToast';

interface JsonImportModalProps {
  onClose: () => void;
}

const EXAMPLE = JSON.stringify(
  [
    { id: '550e8400-e29b-41d4-a716-446655440000', email: 'alice@example.com', name: 'Alice', age: 30, active: true, created_at: '2024-01-15T09:30:00Z' },
    { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', email: 'bob@example.com', name: 'Bob', age: null, active: false, created_at: '2024-02-20T14:00:00Z' },
  ],
  null,
  2
);

function detectInputFormat(input: string): 'json' | 'csv' {
  const t = input.trim();
  if (t.startsWith('{') || t.startsWith('[')) return 'json';
  return 'csv';
}

export function JsonImportModal({ onClose }: JsonImportModalProps) {
  const [input, setInput] = useState('');
  const [entityName, setEntityName] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof parseJsonToEntity> | null>(null);
  const [detectedFmt, setDetectedFmt] = useState<'json' | 'csv'>('json');
  const addEntityFromTemplate = useEntityStore((s) => s.addEntityFromTemplate);
  const entities = useEntityStore((s) => s.entities);
  const toast = useToast();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    setPreview(null);
    if (val.trim()) setDetectedFmt(detectInputFormat(val));
  };

  const handleParse = () => {
    if (!input.trim()) return;
    const fmt = detectInputFormat(input);
    setDetectedFmt(fmt);
    const result = fmt === 'csv'
      ? parseCsvToEntity(input, entityName, entities.length)
      : parseJsonToEntity(input, entityName, entities.length);
    setPreview(result);
  };

  const handleImport = () => {
    if (!preview?.entity) return;
    addEntityFromTemplate(preview.entity);
    toast.success(`Imported "${preview.entity.name}" with ${preview.entity.columns.length} columns`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-bg-secondary border border-border-default rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Import from JSON / CSV</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Paste JSON (object/array) or CSV data — field types are auto-detected</p>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {/* Entity name */}
          <div className="flex items-center gap-3">
            <label className="text-[10px] text-text-muted flex-shrink-0 w-24">Entity name</label>
            <input
              ref={nameRef}
              type="text"
              value={entityName}
              onChange={(e) => { setEntityName(e.target.value); setPreview(null); }}
              placeholder="users"
              className="flex-1 text-xs bg-bg-primary border border-border-default rounded-lg px-3 py-1.5 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors"
            />
          </div>

          {/* Input */}
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={EXAMPLE}
              spellCheck={false}
              rows={12}
              className="w-full font-mono text-[11px] bg-bg-primary border border-border-default rounded-lg px-3 py-2.5 text-text-secondary placeholder:text-text-placeholder outline-none focus:border-border-focus resize-none transition-colors"
            />
            {input.trim() && (
              <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider text-accent bg-accent-muted rounded px-1.5 py-0.5">
                {detectedFmt}
              </span>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div className={`border rounded-lg p-3 ${preview.error ? 'border-danger/40 bg-danger/5' : 'border-success/30 bg-success/5'}`}>
              {preview.error ? (
                <p className="text-xs text-danger flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {preview.error}
                </p>
              ) : preview.entity && (
                <div className="space-y-2">
                  <p className="text-xs text-success font-medium flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-semibold text-text-primary">{preview.entity.name}</span>
                    <span className="text-text-muted font-normal">— {preview.entity.columns.length} columns detected</span>
                    {preview.sampleCount > 1 && (
                      <span className="text-[10px] text-text-muted font-normal">from {preview.sampleCount} samples</span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {preview.entity.columns.map((col) => (
                      <div
                        key={col.id}
                        className="flex items-center justify-between px-2 py-1 rounded bg-bg-secondary border border-border-default"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {col.primaryKey && <span className="text-[8px] font-bold text-warning flex-shrink-0">PK</span>}
                          <span className="text-[10px] text-text-secondary truncate font-mono">{col.name}</span>
                          {col.nullable && <span className="text-[8px] text-text-muted flex-shrink-0">?</span>}
                        </div>
                        <span className="text-[9px] text-text-muted flex-shrink-0 ml-2">{col.dataType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border-default flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setInput(EXAMPLE); setEntityName('users'); setPreview(null); setDetectedFmt('json'); }}
            className="text-xs text-text-muted hover:text-text-secondary cursor-pointer transition-colors"
          >
            Load example
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleParse}
              disabled={!input.trim()}
              className="text-xs px-3 py-1.5 border border-border-default rounded-lg text-text-secondary hover:border-border-active hover:text-text-primary cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Preview →
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!preview?.entity}
              className="text-xs px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import entity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
