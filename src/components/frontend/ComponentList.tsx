import { useFrontendStore } from '../../store/useFrontendStore';
import { ComponentCard } from './ComponentCard';
import type { ComponentKind, PageStatus } from '../../types';

interface ComponentListProps {
  search: string;
  filterKind: '' | ComponentKind;
  filterStatus: '' | PageStatus;
}

export function ComponentList({ search, filterKind, filterStatus }: ComponentListProps) {
  const components = useFrontendStore((s) => s.components);

  const filtered = components.filter((c) => {
    if (filterKind && c.kind !== filterKind) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.kind.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Show root-level components (no parent) when not searching
  const roots = search ? filtered : filtered.filter((c) => c.parentId === null);

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
        </svg>
        <p className="text-sm">No components yet</p>
        <p className="text-xs text-text-muted/60 mt-1">Click "New Component" to start building your component tree</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {roots.sort((a, b) => a.order - b.order).map((c) => (
        <ComponentCard key={c.id} component={c} depth={0} />
      ))}
    </div>
  );
}
