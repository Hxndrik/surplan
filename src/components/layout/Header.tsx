import { useProjectStore } from '../../store/useProjectStore';
import { useProjectsStore } from '../../store/useProjectsStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useEntityStore } from '../../store/useEntityStore';
import { useUIStore } from '../../store/useUIStore';
import { InlineEdit } from '../shared/InlineEdit';
import { useToast } from '../../hooks/useToast';
import { generateShareUrl } from '../../lib/sharing';

const TAB_TITLES: Record<string, string> = {
  overview: 'Project Overview',
  entities: 'Entity Designer',
  features: 'Features',
  api: 'API Endpoints',
};

export function Header() {
  const name = useProjectStore((s) => s.meta.name);
  const updateMeta = useProjectStore((s) => s.updateMeta);
  const syncActiveProjectName = useProjectsStore((s) => s.syncActiveProjectName);
  const activeTab = useUIStore((s) => s.activeTab);
  const { undo, redo, past, future } = useHistoryStore();
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // Tab-specific stats
  const features = useProjectStore((s) => s.features);
  const endpoints = useProjectStore((s) => s.endpoints);
  const entityCount = useEntityStore((s) => s.entities.length);
  const toast = useToast();

  const featureTotal = features.length;
  const featureDone = features.filter((f) => f.done).length;
  const featureActive = features.filter((f) => f.inProgress && !f.done).length;
  const featurePct = featureTotal > 0 ? Math.round((featureDone / featureTotal) * 100) : null;

  const renderBreadcrumbStat = () => {
    if (activeTab === 'features' && featureTotal > 0) {
      return (
        <span className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className={`font-medium tabular-nums ${featurePct === 100 ? 'text-success' : 'text-text-secondary'}`}>
            {featureDone}/{featureTotal}
          </span>
          {featurePct !== null && (
            <span className="flex items-center gap-1">
              <span className="w-16 h-1 rounded-full bg-bg-tertiary overflow-hidden inline-block align-middle">
                <span
                  className={`h-full rounded-full inline-block transition-all duration-500 ${featurePct === 100 ? 'bg-success' : featureActive > 0 ? 'bg-accent' : 'bg-accent/60'}`}
                  style={{ width: `${featurePct}%` }}
                />
              </span>
              <span className={`text-[9px] font-medium tabular-nums ${featurePct === 100 ? 'text-success' : 'text-text-muted'}`}>
                {featurePct}%
              </span>
            </span>
          )}
          {featureActive > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
              {featureActive} active
            </span>
          )}
        </span>
      );
    }
    if (activeTab === 'api' && endpoints.length > 0) {
      const implCount = endpoints.filter((e) => e.status === 'implemented').length;
      return (
        <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <span className="text-text-secondary font-medium">{endpoints.length}</span> endpoint{endpoints.length !== 1 ? 's' : ''}
          {implCount > 0 && (
            <span className="px-1.5 py-0.5 rounded border text-[9px] font-medium text-success bg-success/10 border-success/30">
              {implCount}/{endpoints.length} impl
            </span>
          )}
        </span>
      );
    }
    if (activeTab === 'entities' && entityCount > 0) {
      return (
        <span className="text-[10px] text-text-muted">
          <span className="text-text-secondary font-medium">{entityCount}</span> entit{entityCount !== 1 ? 'ies' : 'y'}
        </span>
      );
    }
    return null;
  };

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border-default bg-bg-secondary flex-shrink-0">
      <div className="flex items-center gap-2">
        <InlineEdit
          value={name}
          onSave={(v) => { updateMeta({ name: v }); syncActiveProjectName(); }}
          className="text-sm font-medium"
          placeholder="Project Name"
        />
        <span className="text-text-muted text-xs">/</span>
        <span className="text-text-secondary text-xs">{TAB_TITLES[activeTab] ?? activeTab}</span>
        {renderBreadcrumbStat()}
      </div>
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 mr-1">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6M21 10l-6-6" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              const url = generateShareUrl();
              await navigator.clipboard.writeText(url);
              toast.success('Share link copied!');
            } catch {
              toast.error('Project too large for URL sharing. Use Backup instead.');
            }
          }}
          title="Copy shareable URL to clipboard"
          className="flex items-center gap-1.5 text-xs text-white bg-accent hover:bg-accent-hover rounded px-2.5 py-1 transition-colors cursor-pointer"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Share
        </button>
        <span className="text-[10px] text-text-muted flex items-center gap-1.5 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
          Saved locally
        </span>
      </div>
    </header>
  );
}
