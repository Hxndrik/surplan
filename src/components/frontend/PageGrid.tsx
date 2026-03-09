import { useFrontendStore } from '../../store/useFrontendStore';
import { PageCard } from './PageCard';
import type { PageStatus } from '../../types';

interface PageGridProps {
  search: string;
  filterStatus: '' | PageStatus;
  filterTag: string;
  onViewWireframe?: (pageId: string) => void;
}

export function PageGrid({ search, filterStatus, filterTag, onViewWireframe }: PageGridProps) {
  const pages = useFrontendStore((s) => s.pages);

  const filtered = pages
    .filter((p) => {
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterTag && !p.tags.includes(filterTag)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.path.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => a.order - b.order);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">No pages yet</p>
        <p className="text-xs text-text-muted/60 mt-1">Press Ctrl+N or click "New Page" to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {filtered.map((page) => (
        <PageCard key={page.id} page={page} onViewWireframe={onViewWireframe} />
      ))}
    </div>
  );
}
