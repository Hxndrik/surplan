import { useUIStore } from '../../store/useUIStore';
import { ProjectOverview } from '../project/ProjectOverview';
import { EntityGrid } from '../entities/EntityGrid';
import { FeatureList } from '../project/FeatureList';
import { ApiEndpointsTab } from '../api/ApiEndpointsTab';

interface MainContentProps {
  onExport?: () => void;
}

export function MainContent({ onExport }: MainContentProps) {
  const activeTab = useUIStore((s) => s.activeTab);

  return (
    <main className="flex-1 overflow-auto p-6">
      {activeTab === 'overview' && <ProjectOverview />}
      {activeTab === 'entities' && <EntityGrid onExport={onExport} />}
      {activeTab === 'features' && <FeatureList />}
      {activeTab === 'api' && <ApiEndpointsTab />}
    </main>
  );
}
