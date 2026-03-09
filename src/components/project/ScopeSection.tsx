import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { InlineEdit } from '../shared/InlineEdit';
import { IconButton } from '../shared/IconButton';

export function ScopeSection() {
  const scope = useProjectStore((s) => s.scope);
  const addScopeItem = useProjectStore((s) => s.addScopeItem);
  const updateScopeItem = useProjectStore((s) => s.updateScopeItem);
  const removeScopeItem = useProjectStore((s) => s.removeScopeItem);

  const inScope = scope.filter((s) => s.inScope);
  const outScope = scope.filter((s) => !s.inScope);

  return (
    <section>
      <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-3">
        Scope
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScopeColumn
          title="In Scope"
          items={inScope}
          isInScope={true}
          onAdd={(text) => addScopeItem(text, true)}
          onUpdate={updateScopeItem}
          onRemove={removeScopeItem}
          accentClass="text-success"
        />
        <ScopeColumn
          title="Out of Scope"
          items={outScope}
          isInScope={false}
          onAdd={(text) => addScopeItem(text, false)}
          onUpdate={updateScopeItem}
          onRemove={removeScopeItem}
          accentClass="text-danger"
        />
      </div>
    </section>
  );
}

function ScopeColumn({
  title,
  items,
  isInScope,
  onAdd,
  onUpdate,
  onRemove,
  accentClass,
}: {
  title: string;
  items: { id: string; text: string }[];
  isInScope: boolean;
  onAdd: (text: string) => void;
  onUpdate: (id: string, partial: { text?: string; inScope?: boolean }) => void;
  onRemove: (id: string) => void;
  accentClass: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [bulkDraft, setBulkDraft] = useState('');
  const [mdCopied, setMdCopied] = useState(false);

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (trimmed) onAdd(trimmed);
    setDraft('');
    setAdding(false);
  };

  const handleBulkAdd = () => {
    const lines = bulkDraft.split('\n').map((l) => l.trim()).filter(Boolean);
    lines.forEach((text) => onAdd(text));
    setBulkDraft('');
    setShowBulk(false);
  };

  const copyAsMd = () => {
    const header = isInScope ? '### ✅ In Scope' : '### ❌ Out of Scope';
    const lines = [header, ...items.map((i) => `- ${i.text}`)].join('\n');
    navigator.clipboard.writeText(lines).then(() => {
      setMdCopied(true);
      setTimeout(() => setMdCopied(false), 1500);
    });
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <div className="flex items-center gap-1.5">
          <h4 className={`text-xs font-medium ${accentClass}`}>{title}</h4>
          {items.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted">
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <button
              type="button"
              onClick={copyAsMd}
              title="Copy as Markdown"
              className={`text-[9px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                mdCopied ? 'text-success' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {mdCopied ? '✓' : 'MD'}
            </button>
          )}
          <button
            type="button"
            onClick={() => { setShowBulk((v) => !v); setBulkDraft(''); }}
            title="Bulk add items"
            className={`text-[9px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              showBulk ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Bulk
          </button>
        </div>
      </div>

      {showBulk && (
        <div className="px-3 py-2 border-b border-border-default bg-bg-tertiary/30 space-y-1.5">
          <p className="text-[9px] text-text-muted">One item per line</p>
          <textarea
            autoFocus
            value={bulkDraft}
            onChange={(e) => setBulkDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowBulk(false); setBulkDraft(''); }
            }}
            rows={3}
            placeholder={"Feature A\nFeature B\nFeature C"}
            className="w-full text-[10px] bg-bg-primary border border-border-default rounded px-2 py-1 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors resize-none font-mono"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleBulkAdd}
              disabled={!bulkDraft.trim()}
              className="text-[10px] text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent-muted rounded px-2 py-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add {bulkDraft.split('\n').filter((l) => l.trim()).length || 0}
            </button>
            <button
              type="button"
              onClick={() => { setShowBulk(false); setBulkDraft(''); }}
              className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer px-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border-default">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-1 px-1 group">
            <InlineEdit
              value={item.text}
              onSave={(v) => onUpdate(item.id, { text: v })}
              className="text-xs flex-1"
              placeholder="Item..."
            />
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              <button
                type="button"
                onClick={() => onUpdate(item.id, { inScope: !isInScope })}
                title={isInScope ? 'Move to Out of Scope' : 'Move to In Scope'}
                className="p-1 text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={isInScope ? 'M14 5l7 7m0 0l-7 7m7-7H3' : 'M10 19l-7-7m0 0l7-7m-7 7h18'} />
                </svg>
              </button>
              <IconButton onClick={() => onRemove(item.id)} variant="danger">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            </div>
          </div>
        ))}
      </div>
      {adding ? (
        <div className="px-3 py-2">
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setDraft(''); setAdding(false); }
            }}
            onBlur={handleAdd}
            placeholder="Add item..."
            className="w-full text-xs bg-transparent outline-none text-text-primary placeholder:text-text-placeholder"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full text-left text-xs text-text-muted hover:text-text-secondary px-3 py-2 hover:bg-bg-hover transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add item
        </button>
      )}
    </div>
  );
}
