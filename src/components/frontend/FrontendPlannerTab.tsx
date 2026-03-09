import { useState, useEffect } from 'react';
import { useFrontendStore } from '../../store/useFrontendStore';
import { PageGrid } from './PageGrid';
import { ComponentList } from './ComponentList';
import { WireframeEditor } from './WireframeEditor';
import { SitemapView } from './SitemapView';
import { DesignTokensEditor } from './DesignTokensEditor';
import type { ComponentKind, PageStatus } from '../../types';

type FrontendViewMode = 'pages' | 'components' | 'wireframe' | 'sitemap' | 'tokens';

const VIEWS: { id: FrontendViewMode; label: string; icon: string }[] = [
  { id: 'pages', label: 'Pages', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'components', label: 'Components', icon: 'M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5' },
  { id: 'wireframe', label: 'Wireframe', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { id: 'sitemap', label: 'Sitemap', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
  { id: 'tokens', label: 'Design Tokens', icon: 'M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z' },
];

const COMPONENT_KINDS: ComponentKind[] = ['page', 'layout', 'container', 'ui', 'form', 'data-display', 'navigation', 'feedback', 'utility'];

export function FrontendPlannerTab() {
  const pages = useFrontendStore((s) => s.pages);
  const components = useFrontendStore((s) => s.components);
  const addPage = useFrontendStore((s) => s.addPage);
  const addComponent = useFrontendStore((s) => s.addComponent);

  const [viewMode, setViewMode] = useState<FrontendViewMode>('pages');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | PageStatus>('');
  const [filterTag, setFilterTag] = useState('');
  const [filterKind, setFilterKind] = useState<'' | ComponentKind>('');
  const [wireframePageId, setWireframePageId] = useState<string | null>(null);

  // Listen for surplan events
  useEffect(() => {
    const focusSearch = () => document.getElementById('frontend-search')?.focus();
    const handleViewChange = (e: Event) => {
      const view = (e as CustomEvent<FrontendViewMode>).detail;
      if (view) setViewMode(view);
    };
    window.addEventListener('surplan:focus-search', focusSearch);
    window.addEventListener('surplan:frontend-view', handleViewChange);
    return () => {
      window.removeEventListener('surplan:focus-search', focusSearch);
      window.removeEventListener('surplan:frontend-view', handleViewChange);
    };
  }, []);

  const handleViewWireframe = (pageId: string) => {
    setWireframePageId(pageId);
    setViewMode('wireframe');
  };

  // Stats
  const totalSections = pages.reduce((acc, p) => acc + p.wireframeSections.length, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-text-primary">Frontend</h2>
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <span>{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{components.length} component{components.length !== 1 ? 's' : ''}</span>
            {totalSections > 0 && (
              <>
                <span>·</span>
                <span>{totalSections} wireframe section{totalSections !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {viewMode === 'pages' && (
            <button
              onClick={() => addPage('New Page')}
              className="text-xs px-3 py-1.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
            >
              + New Page
            </button>
          )}
          {viewMode === 'components' && (
            <button
              onClick={() => addComponent('NewComponent')}
              className="text-xs px-3 py-1.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
            >
              + New Component
            </button>
          )}
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex items-center gap-1 border-b border-border-default pb-2">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            onClick={() => {
              setViewMode(view.id);
              if (view.id !== 'wireframe') setWireframePageId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs transition-colors cursor-pointer ${
              viewMode === view.id
                ? 'bg-bg-secondary text-text-primary border border-border-default border-b-bg-secondary -mb-[1px]'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={view.icon} />
            </svg>
            {view.label}
          </button>
        ))}
      </div>

      {/* Filters toolbar (pages & components only) */}
      {(viewMode === 'pages' || viewMode === 'components') && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            id="frontend-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${viewMode}...`}
            className="text-xs bg-bg-secondary border border-border-default rounded px-3 py-1.5 text-text-secondary w-48 outline-none focus:border-accent"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as '' | PageStatus)}
            className="text-[11px] bg-bg-secondary border border-border-default rounded px-2 py-1.5 text-text-secondary cursor-pointer"
          >
            <option value="">All statuses</option>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="built">Built</option>
          </select>
          {viewMode === 'components' && (
            <select
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value as '' | ComponentKind)}
              className="text-[11px] bg-bg-secondary border border-border-default rounded px-2 py-1.5 text-text-secondary cursor-pointer"
            >
              <option value="">All kinds</option>
              {COMPONENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
          {(search || filterStatus || filterTag || filterKind) && (
            <button
              onClick={() => { setSearch(''); setFilterStatus(''); setFilterTag(''); setFilterKind(''); }}
              className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {viewMode === 'pages' && (
        <PageGrid
          search={search}
          filterStatus={filterStatus}
          filterTag={filterTag}
          onViewWireframe={handleViewWireframe}
        />
      )}

      {viewMode === 'components' && (
        <ComponentList
          search={search}
          filterKind={filterKind}
          filterStatus={filterStatus}
        />
      )}

      {viewMode === 'wireframe' && wireframePageId && (
        <WireframeEditor
          pageId={wireframePageId}
          onBack={() => { setViewMode('pages'); setWireframePageId(null); }}
        />
      )}

      {viewMode === 'wireframe' && !wireframePageId && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">Select a page to edit its wireframe:</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => setWireframePageId(p.id)}
                className="text-left bg-bg-secondary rounded-lg border border-border-default p-3 hover:border-accent/50 transition-colors cursor-pointer"
              >
                <p className="text-xs font-semibold text-text-primary">{p.name}</p>
                <p className="text-[10px] text-accent font-mono mt-0.5">{p.path}</p>
                <p className="text-[10px] text-text-muted mt-1">{p.wireframeSections.length} section{p.wireframeSections.length !== 1 ? 's' : ''}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'sitemap' && <SitemapView />}

      {viewMode === 'tokens' && <DesignTokensEditor />}
    </div>
  );
}
