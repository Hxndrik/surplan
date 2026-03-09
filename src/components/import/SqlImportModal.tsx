import { useState } from 'react';
import { useEntityStore } from '../../store/useEntityStore';
import { useToast } from '../../hooks/useToast';
import { parseSql } from '../../lib/importers';

interface SqlImportModalProps {
  onClose: () => void;
}

const EXAMPLE_SQL = `CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);`;

export function SqlImportModal({ onClose }: SqlImportModalProps) {
  const [sql, setSql] = useState('');
  const addEntityFromTemplate = useEntityStore((s) => s.addEntityFromTemplate);
  const toast = useToast();
  const [preview, setPreview] = useState<ReturnType<typeof parseSql> | null>(null);

  const handlePreview = () => {
    if (!sql.trim()) return;
    const result = parseSql(sql);
    setPreview(result);
  };

  const handleImport = () => {
    if (!preview) return;
    preview.entities.forEach((e) => addEntityFromTemplate(e));
    toast.success(`Imported ${preview.entities.length} ${preview.entities.length === 1 ? 'entity' : 'entities'}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-bg-secondary border border-border-default rounded-xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Import from SQL</h2>
            <p className="text-xs text-text-muted mt-0.5">Paste CREATE TABLE statements to import entities</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
          {/* SQL input */}
          <div>
            <textarea
              value={sql}
              onChange={(e) => { setSql(e.target.value); setPreview(null); }}
              placeholder={EXAMPLE_SQL}
              rows={10}
              className="w-full text-[11px] font-mono bg-bg-primary border border-border-default rounded-lg px-3 py-2.5 text-text-secondary outline-none focus:border-border-focus resize-none placeholder:text-text-placeholder"
            />
          </div>

          {/* Preview */}
          {preview && (
            <div className="border border-border-default rounded-lg p-3 bg-bg-primary">
              {preview.errors.length > 0 ? (
                <div className="flex items-center gap-2 text-danger text-xs">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {preview.errors[0].message}
                </div>
              ) : (
                <div>
                  <p className="text-xs text-success font-medium mb-2">
                    Found {preview.entities.length} {preview.entities.length === 1 ? 'entity' : 'entities'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {preview.entities.map((e, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] bg-bg-secondary border border-border-default rounded px-2 py-1">
                        <span className="font-medium text-text-primary">{e.name}</span>
                        <span className="text-text-muted">({e.columns.length} cols)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3 border-t border-border-default flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setSql(EXAMPLE_SQL); setPreview(null); }}
            className="text-xs text-text-muted hover:text-text-secondary cursor-pointer"
          >
            Load example
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!sql.trim()}
              className="text-xs px-3 py-1.5 border border-border-default rounded-lg text-text-secondary hover:border-border-active hover:text-text-primary cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!preview || preview.entities.length === 0}
              className="text-xs px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import {preview && preview.entities.length > 0 ? `${preview.entities.length} ${preview.entities.length === 1 ? 'entity' : 'entities'}` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
