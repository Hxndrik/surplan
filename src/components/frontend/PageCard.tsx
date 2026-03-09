import { useState } from 'react';
import { useFrontendStore } from '../../store/useFrontendStore';
import { useEntityStore } from '../../store/useEntityStore';
import { useProjectStore } from '../../store/useProjectStore';
import { InlineEdit } from '../shared/InlineEdit';
import { Badge } from '../shared/Badge';
import type { Page, PageStatus, WireframeSectionWidth } from '../../types';

const STATUS_COLORS: Record<PageStatus, string> = {
  planned: '#6366f1',
  'in-progress': '#f59e0b',
  built: '#10b981',
};

const STATUS_LABELS: Record<PageStatus, string> = {
  planned: 'Planned',
  'in-progress': 'In Progress',
  built: 'Built',
};

const LAYOUTS = ['fullwidth', 'sidebar', 'centered', 'dashboard', 'split', 'stacked'];

const WIDTH_LABELS: Record<WireframeSectionWidth, string> = {
  full: '1/1', '1/2': '1/2', '1/3': '1/3', '2/3': '2/3', '1/4': '1/4', '3/4': '3/4',
};

interface PageCardProps {
  page: Page;
  onViewWireframe?: (id: string) => void;
}

export function PageCard({ page, onViewWireframe }: PageCardProps) {
  const updatePage = useFrontendStore((s) => s.updatePage);
  const removePage = useFrontendStore((s) => s.removePage);
  const duplicatePage = useFrontendStore((s) => s.duplicatePage);
  const addWireframeSection = useFrontendStore((s) => s.addWireframeSection);
  const removeWireframeSection = useFrontendStore((s) => s.removeWireframeSection);
  const updateWireframeSection = useFrontendStore((s) => s.updateWireframeSection);
  const entities = useEntityStore((s) => s.entities);
  const endpoints = useProjectStore((s) => s.endpoints);
  const components = useFrontendStore((s) => s.components);
  const pages = useFrontendStore((s) => s.pages);

  const [expanded, setExpanded] = useState(false);
  const [showNavPicker, setShowNavPicker] = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [showComponentPicker, setShowComponentPicker] = useState(false);

  const linkedEntities = entities.filter((e) => page.entityRefs.includes(e.id));
  const linkedComponents = components.filter((c) => page.componentRefs.includes(c.id));

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-default overflow-hidden" style={{ borderLeftColor: STATUS_COLORS[page.status], borderLeftWidth: 3 }}>
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={page.name}
              onChange={(v) => updatePage(page.id, { name: v })}
              className="text-sm font-semibold text-text-primary"
            />
            <div className="flex items-center gap-1.5 mt-0.5">
              <InlineEdit
                value={page.path}
                onChange={(v) => updatePage(page.id, { path: v })}
                className="text-[11px] text-accent font-mono"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {page.authRequired && (
              <span title="Auth required" className="text-warning text-[11px]">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </span>
            )}
            <select
              value={page.status}
              onChange={(e) => updatePage(page.id, { status: e.target.value as PageStatus })}
              className="text-[10px] bg-bg-tertiary border border-border-default rounded px-1.5 py-0.5 text-text-secondary cursor-pointer"
            >
              {(Object.keys(STATUS_LABELS) as PageStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Layout + Description */}
        <div className="mt-2 flex items-center gap-2">
          <select
            value={page.layout}
            onChange={(e) => updatePage(page.id, { layout: e.target.value })}
            className="text-[10px] bg-bg-tertiary border border-border-default rounded px-1.5 py-0.5 text-text-secondary cursor-pointer"
          >
            {LAYOUTS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-[10px] text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={page.authRequired}
              onChange={(e) => updatePage(page.id, { authRequired: e.target.checked })}
              className="w-3 h-3"
            />
            Auth
          </label>
        </div>

        <InlineEdit
          value={page.description}
          onChange={(v) => updatePage(page.id, { description: v })}
          placeholder="Add description..."
          className="text-[11px] text-text-muted mt-1 block w-full"
        />

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mt-2">
          {linkedEntities.map((e) => (
            <Badge key={e.id} color={e.color}>{e.name}</Badge>
          ))}
          {linkedComponents.map((c) => (
            <span key={c.id} className="text-[9px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary">{c.name}</span>
          ))}
          {page.dataBindings.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-bg-tertiary text-accent">{page.dataBindings.length} endpoint{page.dataBindings.length !== 1 ? 's' : ''}</span>
          )}
          {page.navigatesTo.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">{page.navigatesTo.length} link{page.navigatesTo.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Mini wireframe preview */}
        {page.wireframeSections.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {page.wireframeSections.sort((a, b) => a.order - b.order).map((ws) => {
              const widthMap: Record<WireframeSectionWidth, string> = {
                full: 'w-full', '1/2': 'w-[48%]', '1/3': 'w-[31%]', '2/3': 'w-[64%]', '1/4': 'w-[23%]', '3/4': 'w-[73%]',
              };
              return (
                <div key={ws.id} className={`${widthMap[ws.width]} h-5 rounded bg-bg-tertiary border border-border-default flex items-center justify-center`}>
                  <span className="text-[8px] text-text-muted truncate px-1">{ws.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expand toggle */}
      <div className="border-t border-border-default">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-1.5 text-[10px] text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors flex items-center justify-between cursor-pointer"
        >
          <span>{expanded ? 'Collapse' : 'Expand details'}</span>
          <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border-default px-4 py-3 space-y-3 bg-bg-primary/30">
          {/* SEO meta */}
          <div className="space-y-1">
            <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">SEO</p>
            <InlineEdit
              value={page.metaTitle}
              onChange={(v) => updatePage(page.id, { metaTitle: v })}
              placeholder="Meta title..."
              className="text-[11px] text-text-secondary block w-full"
            />
            <InlineEdit
              value={page.metaDescription}
              onChange={(v) => updatePage(page.id, { metaDescription: v })}
              placeholder="Meta description..."
              className="text-[11px] text-text-muted block w-full"
            />
          </div>

          {/* Roles */}
          <div className="space-y-1">
            <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Roles (comma-separated)</p>
            <InlineEdit
              value={page.roles}
              onChange={(v) => updatePage(page.id, { roles: v })}
              placeholder="admin, editor, viewer..."
              className="text-[11px] text-text-secondary block w-full"
            />
          </div>

          {/* Wireframe sections */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Wireframe Sections</p>
              <div className="flex gap-1">
                <button onClick={() => addWireframeSection(page.id)} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">+ Add</button>
                {onViewWireframe && <button onClick={() => onViewWireframe(page.id)} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer ml-2">Visual editor</button>}
              </div>
            </div>
            {page.wireframeSections.sort((a, b) => a.order - b.order).map((ws) => (
              <div key={ws.id} className="flex items-center gap-2 bg-bg-tertiary rounded px-2 py-1.5">
                <InlineEdit
                  value={ws.label}
                  onChange={(v) => updateWireframeSection(page.id, ws.id, { label: v })}
                  className="text-[11px] text-text-secondary flex-1"
                />
                <select
                  value={ws.width}
                  onChange={(e) => updateWireframeSection(page.id, ws.id, { width: e.target.value as WireframeSectionWidth })}
                  className="text-[10px] bg-bg-secondary border border-border-default rounded px-1 py-0.5 text-text-muted cursor-pointer"
                >
                  {(Object.entries(WIDTH_LABELS)).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <select
                  value={ws.componentRef ?? ''}
                  onChange={(e) => updateWireframeSection(page.id, ws.id, { componentRef: e.target.value || null })}
                  className="text-[10px] bg-bg-secondary border border-border-default rounded px-1 py-0.5 text-text-muted cursor-pointer max-w-[100px]"
                >
                  <option value="">No component</option>
                  {components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => removeWireframeSection(page.id, ws.id)} className="text-danger/60 hover:text-danger text-[10px] cursor-pointer">×</button>
              </div>
            ))}
          </div>

          {/* Entity refs */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Linked Entities</p>
              <button onClick={() => setShowEntityPicker(!showEntityPicker)} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">+ Link</button>
            </div>
            {showEntityPicker && (
              <div className="flex flex-wrap gap-1">
                {entities.filter((e) => !page.entityRefs.includes(e.id)).map((e) => (
                  <button key={e.id} onClick={() => { updatePage(page.id, { entityRefs: [...page.entityRefs, e.id] }); setShowEntityPicker(false); }} className="text-[10px] px-2 py-0.5 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary cursor-pointer">{e.name}</button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {linkedEntities.map((e) => (
                <span key={e.id} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary flex items-center gap-1">
                  {e.name}
                  <button onClick={() => updatePage(page.id, { entityRefs: page.entityRefs.filter((r) => r !== e.id) })} className="text-danger/60 hover:text-danger cursor-pointer">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Component refs */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Linked Components</p>
              <button onClick={() => setShowComponentPicker(!showComponentPicker)} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">+ Link</button>
            </div>
            {showComponentPicker && (
              <div className="flex flex-wrap gap-1">
                {components.filter((c) => !page.componentRefs.includes(c.id)).map((c) => (
                  <button key={c.id} onClick={() => { updatePage(page.id, { componentRefs: [...page.componentRefs, c.id] }); setShowComponentPicker(false); }} className="text-[10px] px-2 py-0.5 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary cursor-pointer">{c.name}</button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {linkedComponents.map((c) => (
                <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary flex items-center gap-1">
                  {c.name}
                  <button onClick={() => updatePage(page.id, { componentRefs: page.componentRefs.filter((r) => r !== c.id) })} className="text-danger/60 hover:text-danger cursor-pointer">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Navigation links */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Navigates To</p>
              <button onClick={() => setShowNavPicker(!showNavPicker)} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">+ Link</button>
            </div>
            {showNavPicker && (
              <div className="flex flex-wrap gap-1">
                {pages.filter((p) => p.id !== page.id && !page.navigatesTo.includes(p.id)).map((p) => (
                  <button key={p.id} onClick={() => { updatePage(page.id, { navigatesTo: [...page.navigatesTo, p.id] }); setShowNavPicker(false); }} className="text-[10px] px-2 py-0.5 rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary cursor-pointer">{p.name}</button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {page.navigatesTo.map((nid) => {
                const target = pages.find((p) => p.id === nid);
                if (!target) return null;
                return (
                  <span key={nid} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary flex items-center gap-1">
                    → {target.name}
                    <button onClick={() => updatePage(page.id, { navigatesTo: page.navigatesTo.filter((n) => n !== nid) })} className="text-danger/60 hover:text-danger cursor-pointer">×</button>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Data bindings */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">API Bindings</p>
            </div>
            {endpoints.filter((ep) => !page.dataBindings.some((db) => db.endpointId === ep.id)).length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    useFrontendStore.getState().addDataBinding(page.id, e.target.value);
                  }
                }}
                className="text-[10px] bg-bg-tertiary border border-border-default rounded px-1.5 py-0.5 text-text-muted cursor-pointer w-full"
              >
                <option value="">+ Bind API endpoint...</option>
                {endpoints.filter((ep) => !page.dataBindings.some((db) => db.endpointId === ep.id)).map((ep) => (
                  <option key={ep.id} value={ep.id}>{ep.method} {ep.path}</option>
                ))}
              </select>
            )}
            {page.dataBindings.map((db) => {
              const ep = endpoints.find((e) => e.id === db.endpointId);
              return (
                <div key={db.endpointId} className="flex items-center gap-2 text-[10px] bg-bg-tertiary rounded px-2 py-1">
                  <span className="text-accent font-mono">{ep ? `${ep.method} ${ep.path}` : 'Unknown'}</span>
                  <button onClick={() => useFrontendStore.getState().removeDataBinding(page.id, db.endpointId)} className="text-danger/60 hover:text-danger ml-auto cursor-pointer">×</button>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Notes</p>
            <textarea
              value={page.notes}
              onChange={(e) => updatePage(page.id, { notes: e.target.value })}
              placeholder="Implementation notes..."
              className="w-full text-[11px] bg-bg-tertiary border border-border-default rounded p-2 text-text-secondary resize-none min-h-[40px]"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={() => duplicatePage(page.id)} className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer">Duplicate</button>
            <button onClick={() => removePage(page.id)} className="text-[10px] text-danger/60 hover:text-danger cursor-pointer">Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
