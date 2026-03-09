import { useFrontendStore } from '../../store/useFrontendStore';
import { InlineEdit } from '../shared/InlineEdit';
import type { WireframeSectionWidth } from '../../types';

const WIDTH_GRID: Record<WireframeSectionWidth, string> = {
  full: 'col-span-12',
  '1/2': 'col-span-6',
  '1/3': 'col-span-4',
  '2/3': 'col-span-8',
  '1/4': 'col-span-3',
  '3/4': 'col-span-9',
};

const WIDTH_OPTIONS: { value: WireframeSectionWidth; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: '1/2', label: '1/2' },
  { value: '1/3', label: '1/3' },
  { value: '2/3', label: '2/3' },
  { value: '1/4', label: '1/4' },
  { value: '3/4', label: '3/4' },
];

interface WireframeEditorProps {
  pageId: string;
  onBack: () => void;
}

export function WireframeEditor({ pageId, onBack }: WireframeEditorProps) {
  const page = useFrontendStore((s) => s.pages.find((p) => p.id === pageId));
  const components = useFrontendStore((s) => s.components);
  const addWireframeSection = useFrontendStore((s) => s.addWireframeSection);
  const updateWireframeSection = useFrontendStore((s) => s.updateWireframeSection);
  const removeWireframeSection = useFrontendStore((s) => s.removeWireframeSection);

  if (!page) {
    return (
      <div className="text-center py-8 text-text-muted">
        <p>Page not found</p>
        <button onClick={onBack} className="text-accent text-sm mt-2 cursor-pointer">Go back</button>
      </div>
    );
  }

  const sections = [...page.wireframeSections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-text-muted hover:text-text-secondary cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{page.name} — Wireframe</h3>
          <p className="text-[11px] text-accent font-mono">{page.path}</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-bg-tertiary text-text-muted">{page.layout} layout</span>
        <button
          onClick={() => addWireframeSection(pageId)}
          className="ml-auto text-xs px-3 py-1.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
        >
          + Add Section
        </button>
      </div>

      {/* Wireframe grid */}
      {sections.length === 0 ? (
        <div className="border-2 border-dashed border-border-default rounded-lg p-12 text-center">
          <p className="text-text-muted text-sm">No sections yet</p>
          <p className="text-text-muted/60 text-xs mt-1">Add sections to build your page wireframe</p>
          <button
            onClick={() => addWireframeSection(pageId)}
            className="mt-3 text-xs px-4 py-2 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
          >
            + Add First Section
          </button>
        </div>
      ) : (
        <div className="border border-border-default rounded-lg p-4 bg-bg-secondary">
          {/* Live preview */}
          <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium mb-3">Preview</p>
          <div className="grid grid-cols-12 gap-2 mb-6">
            {sections.map((ws) => {
              const linkedComp = components.find((c) => c.id === ws.componentRef);
              return (
                <div
                  key={ws.id}
                  className={`${WIDTH_GRID[ws.width]} min-h-[60px] rounded border border-border-default bg-bg-tertiary flex flex-col items-center justify-center p-2`}
                >
                  <span className="text-[11px] text-text-secondary font-medium">{ws.label}</span>
                  {linkedComp && (
                    <span className="text-[9px] text-accent mt-0.5">{'<'}{linkedComp.name} /{'>'}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section editor list */}
          <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium mb-2">Sections</p>
          <div className="space-y-2">
            {sections.map((ws, idx) => (
              <div key={ws.id} className="flex items-center gap-2 bg-bg-primary rounded px-3 py-2 border border-border-default">
                <span className="text-[10px] text-text-muted w-5">{idx + 1}</span>
                <InlineEdit
                  value={ws.label}
                  onChange={(v) => updateWireframeSection(pageId, ws.id, { label: v })}
                  className="text-xs text-text-secondary flex-1"
                />
                <div className="flex gap-1">
                  {WIDTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateWireframeSection(pageId, ws.id, { width: opt.value })}
                      className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        ws.width === opt.value
                          ? 'bg-accent/20 text-accent'
                          : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <select
                  value={ws.componentRef ?? ''}
                  onChange={(e) => updateWireframeSection(pageId, ws.id, { componentRef: e.target.value || null })}
                  className="text-[10px] bg-bg-tertiary border border-border-default rounded px-1.5 py-0.5 text-text-muted cursor-pointer max-w-[120px]"
                >
                  <option value="">No component</option>
                  {components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  onClick={() => removeWireframeSection(pageId, ws.id)}
                  className="text-danger/60 hover:text-danger text-xs cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
