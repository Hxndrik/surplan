import type { BackupData } from '../../lib/backup';
import { applySharedData } from '../../lib/sharing';

interface ShareImportModalProps {
  data: BackupData;
  onClose: () => void;
}

export function ShareImportModal({ data, onClose }: ShareImportModalProps) {
  const projectName = data.projectName || data.meta.name || 'Shared Project';
  const entityCount = data.entities?.length ?? 0;
  const featureCount = data.features?.length ?? 0;
  const endpointCount = data.endpoints?.length ?? 0;

  const handleCreate = () => {
    applySharedData(data, 'new');
    onClose();
  };

  const handleReplace = () => {
    applySharedData(data, 'replace');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[8vh] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-bg-primary border border-border-default rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-text-primary">Shared Project Received</h2>
          <p className="text-xs text-text-muted mt-1">
            Someone shared <span className="font-medium text-text-secondary">{projectName}</span> with you.
          </p>
        </div>

        {/* Stats */}
        <div className="px-5 pb-4">
          <div className="flex gap-3 text-[11px] text-text-muted">
            {entityCount > 0 && <span>{entityCount} {entityCount === 1 ? 'entity' : 'entities'}</span>}
            {featureCount > 0 && <span>{featureCount} {featureCount === 1 ? 'feature' : 'features'}</span>}
            {endpointCount > 0 && <span>{endpointCount} {endpointCount === 1 ? 'endpoint' : 'endpoints'}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCreate}
            className="w-full px-4 py-2 rounded text-sm font-medium bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer"
          >
            Create new project
          </button>
          <button
            type="button"
            onClick={handleReplace}
            className="w-full px-4 py-2 rounded text-sm font-medium border border-border-default text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            Replace current project
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-1.5 rounded text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
