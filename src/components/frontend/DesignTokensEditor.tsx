import { useState } from 'react';
import { useFrontendStore } from '../../store/useFrontendStore';
import { InlineEdit } from '../shared/InlineEdit';

export function DesignTokensEditor() {
  const designTokens = useFrontendStore((s) => s.designTokens);
  const updateDesignTokens = useFrontendStore((s) => s.updateDesignTokens);
  const addColorToken = useFrontendStore((s) => s.addColorToken);
  const updateColorToken = useFrontendStore((s) => s.updateColorToken);
  const removeColorToken = useFrontendStore((s) => s.removeColorToken);
  const addTypographyToken = useFrontendStore((s) => s.addTypographyToken);
  const updateTypographyToken = useFrontendStore((s) => s.updateTypographyToken);
  const removeTypographyToken = useFrontendStore((s) => s.removeTypographyToken);
  const addSpacingToken = useFrontendStore((s) => s.addSpacingToken);
  const updateSpacingToken = useFrontendStore((s) => s.updateSpacingToken);
  const removeSpacingToken = useFrontendStore((s) => s.removeSpacingToken);

  const [colorsOpen, setColorsOpen] = useState(true);
  const [typographyOpen, setTypographyOpen] = useState(true);
  const [spacingOpen, setSpacingOpen] = useState(true);
  const [breakpointsOpen, setBreakpointsOpen] = useState(false);

  // Group colors by category
  const colorCategories = Array.from(new Set(designTokens.colors.map((c) => c.category)));

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Colors */}
      <section className="bg-bg-secondary rounded-lg border border-border-default overflow-hidden">
        <button
          onClick={() => setColorsOpen(!colorsOpen)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-bg-hover transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <svg className={`w-3 h-3 transition-transform ${colorsOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <h3 className="text-sm font-semibold text-text-primary">Colors</h3>
            <span className="text-[10px] text-text-muted">({designTokens.colors.length})</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); addColorToken(); setColorsOpen(true); }} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">+ Add</button>
        </button>
        {colorsOpen && (
          <div className="border-t border-border-default px-4 py-3 space-y-3">
            {colorCategories.map((cat) => (
              <div key={cat}>
                <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium mb-2">{cat}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {designTokens.colors.filter((c) => c.category === cat).map((color) => (
                    <div key={color.id} className="bg-bg-primary rounded border border-border-default p-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={color.value}
                          onChange={(e) => updateColorToken(color.id, { value: e.target.value })}
                          className="w-8 h-8 rounded border border-border-default cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <InlineEdit
                            value={color.name}
                            onChange={(v) => updateColorToken(color.id, { name: v })}
                            placeholder="name"
                            className="text-[11px] text-text-primary font-medium block"
                          />
                          <InlineEdit
                            value={color.value}
                            onChange={(v) => updateColorToken(color.id, { value: v })}
                            className="text-[10px] text-text-muted font-mono block"
                          />
                        </div>
                        <button onClick={() => removeColorToken(color.id)} className="text-danger/60 hover:text-danger text-xs cursor-pointer self-start">×</button>
                      </div>
                      <select
                        value={color.category}
                        onChange={(e) => updateColorToken(color.id, { category: e.target.value })}
                        className="text-[9px] bg-bg-tertiary border border-border-default rounded px-1 py-0.5 text-text-muted cursor-pointer w-full"
                      >
                        {['brand', 'semantic', 'neutral', 'surface', 'border'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Typography */}
      <section className="bg-bg-secondary rounded-lg border border-border-default overflow-hidden">
        <button
          onClick={() => setTypographyOpen(!typographyOpen)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-bg-hover transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <svg className={`w-3 h-3 transition-transform ${typographyOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <h3 className="text-sm font-semibold text-text-primary">Typography</h3>
            <span className="text-[10px] text-text-muted">({designTokens.typography.length})</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); addTypographyToken(); setTypographyOpen(true); }} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">+ Add</button>
        </button>
        {typographyOpen && (
          <div className="border-t border-border-default px-4 py-3 space-y-2">
            {designTokens.typography.map((t) => (
              <div key={t.id} className="bg-bg-primary rounded border border-border-default p-3 flex items-start gap-4">
                {/* Preview */}
                <div className="flex-shrink-0 w-48 min-h-[40px] flex items-center">
                  <span style={{
                    fontFamily: t.fontFamily, fontSize: t.fontSize,
                    fontWeight: t.fontWeight as string, lineHeight: t.lineHeight,
                    letterSpacing: t.letterSpacing,
                  }} className="text-text-primary truncate">
                    Aa Bb Cc
                  </span>
                </div>
                {/* Fields */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1">
                  <div>
                    <label className="text-[9px] text-text-muted uppercase">Name</label>
                    <InlineEdit value={t.name} onChange={(v) => updateTypographyToken(t.id, { name: v })} className="text-[11px] text-text-secondary block" />
                  </div>
                  <div>
                    <label className="text-[9px] text-text-muted uppercase">Font Family</label>
                    <InlineEdit value={t.fontFamily} onChange={(v) => updateTypographyToken(t.id, { fontFamily: v })} className="text-[11px] text-text-secondary block" />
                  </div>
                  <div>
                    <label className="text-[9px] text-text-muted uppercase">Size</label>
                    <InlineEdit value={t.fontSize} onChange={(v) => updateTypographyToken(t.id, { fontSize: v })} className="text-[11px] text-accent font-mono block" />
                  </div>
                  <div>
                    <label className="text-[9px] text-text-muted uppercase">Weight</label>
                    <InlineEdit value={t.fontWeight} onChange={(v) => updateTypographyToken(t.id, { fontWeight: v })} className="text-[11px] text-text-secondary block" />
                  </div>
                  <div>
                    <label className="text-[9px] text-text-muted uppercase">Line Height</label>
                    <InlineEdit value={t.lineHeight} onChange={(v) => updateTypographyToken(t.id, { lineHeight: v })} className="text-[11px] text-text-secondary block" />
                  </div>
                  <div>
                    <label className="text-[9px] text-text-muted uppercase">Letter Spacing</label>
                    <InlineEdit value={t.letterSpacing} onChange={(v) => updateTypographyToken(t.id, { letterSpacing: v })} className="text-[11px] text-text-secondary block" />
                  </div>
                </div>
                <button onClick={() => removeTypographyToken(t.id)} className="text-danger/60 hover:text-danger text-xs cursor-pointer flex-shrink-0">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Spacing */}
      <section className="bg-bg-secondary rounded-lg border border-border-default overflow-hidden">
        <button
          onClick={() => setSpacingOpen(!spacingOpen)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-bg-hover transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <svg className={`w-3 h-3 transition-transform ${spacingOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <h3 className="text-sm font-semibold text-text-primary">Spacing</h3>
            <span className="text-[10px] text-text-muted">({designTokens.spacing.length})</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); addSpacingToken(); setSpacingOpen(true); }} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">+ Add</button>
        </button>
        {spacingOpen && (
          <div className="border-t border-border-default px-4 py-3 space-y-2">
            {designTokens.spacing.map((sp) => {
              const px = parseInt(sp.value) || 0;
              return (
                <div key={sp.id} className="flex items-center gap-3 bg-bg-primary rounded border border-border-default px-3 py-2">
                  <InlineEdit value={sp.name} onChange={(v) => updateSpacingToken(sp.id, { name: v })} placeholder="name" className="text-[11px] text-text-secondary w-20" />
                  <InlineEdit value={sp.value} onChange={(v) => updateSpacingToken(sp.id, { value: v })} className="text-[11px] text-accent font-mono w-16" />
                  <div className="flex-1 h-4 bg-bg-tertiary rounded overflow-hidden">
                    <div className="h-full bg-accent/30 rounded" style={{ width: `${Math.min(px * 2, 100)}%` }} />
                  </div>
                  <button onClick={() => removeSpacingToken(sp.id)} className="text-danger/60 hover:text-danger text-xs cursor-pointer">×</button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Breakpoints */}
      <section className="bg-bg-secondary rounded-lg border border-border-default overflow-hidden">
        <button
          onClick={() => setBreakpointsOpen(!breakpointsOpen)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-bg-hover transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <svg className={`w-3 h-3 transition-transform ${breakpointsOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <h3 className="text-sm font-semibold text-text-primary">Breakpoints</h3>
            <span className="text-[10px] text-text-muted">({designTokens.breakpoints.length})</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); updateDesignTokens({ breakpoints: [...designTokens.breakpoints, { name: '', value: '0px' }] }); setBreakpointsOpen(true); }} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">+ Add</button>
        </button>
        {breakpointsOpen && (
          <div className="border-t border-border-default px-4 py-3 space-y-2">
            {designTokens.breakpoints.map((bp, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-bg-primary rounded border border-border-default px-3 py-2">
                <input
                  value={bp.name}
                  onChange={(e) => {
                    const bps = [...designTokens.breakpoints];
                    bps[idx] = { ...bp, name: e.target.value };
                    updateDesignTokens({ breakpoints: bps });
                  }}
                  placeholder="name"
                  className="text-[11px] text-text-secondary bg-transparent border-none outline-none w-16"
                />
                <input
                  value={bp.value}
                  onChange={(e) => {
                    const bps = [...designTokens.breakpoints];
                    bps[idx] = { ...bp, value: e.target.value };
                    updateDesignTokens({ breakpoints: bps });
                  }}
                  className="text-[11px] text-accent font-mono bg-transparent border-none outline-none w-20"
                />
                <div className="flex-1 h-3 bg-bg-tertiary rounded overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center">
                    {designTokens.breakpoints.map((b, i) => {
                      const val = parseInt(b.value);
                      if (isNaN(val)) return null;
                      const pct = Math.min((val / 1920) * 100, 100);
                      return <div key={i} className="absolute h-full border-l border-accent/40" style={{ left: `${pct}%` }} />;
                    })}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const bps = designTokens.breakpoints.filter((_, i) => i !== idx);
                    updateDesignTokens({ breakpoints: bps });
                  }}
                  className="text-danger/60 hover:text-danger text-xs cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notes */}
      <section className="bg-bg-secondary rounded-lg border border-border-default overflow-hidden">
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Design System Notes</h3>
          <textarea
            value={designTokens.notes}
            onChange={(e) => updateDesignTokens({ notes: e.target.value })}
            placeholder="Document your design system decisions, guidelines, and patterns here..."
            className="w-full text-[11px] bg-bg-primary border border-border-default rounded p-3 text-text-secondary resize-none min-h-[80px]"
            rows={4}
          />
        </div>
      </section>
    </div>
  );
}
