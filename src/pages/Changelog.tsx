import { PageLayout } from './PageLayout';

const RELEASES = [
  {
    version: 'v0.9',
    date: 'March 2026',
    tag: 'Latest',
    tagColor: '#10b981',
    changes: [
      { type: 'new', text: 'Feature sprint/version field and filter' },
      { type: 'new', text: 'API endpoint version field (v1/v2/v3/beta) with filter dropdown' },
      { type: 'new', text: 'Feature pinning — pin features to top of group regardless of sort' },
      { type: 'new', text: 'Feature kind (Feature/Bug/Improvement/Chore) with group-by and By Kind breakdown card' },
      { type: 'new', text: 'Feature blockedBy dependencies with cycle detection and Blocked filter pill' },
      { type: 'new', text: 'Feature due dates with overdue badge' },
      { type: 'new', text: 'Three-state feature status: Todo → In Progress → Done (auto-sets start date)' },
      { type: 'new', text: 'Entity updatedAt tracking and "Sort: Recently Modified" in grid' },
      { type: 'new', text: 'ERD cardinality labels (1:N) and FK edge hover tooltips' },
      { type: 'new', text: 'ERD entity position persistence to localStorage' },
      { type: 'new', text: 'Entity sort (default/name/columns/created) with drag disabled when active' },
      { type: 'new', text: 'SQL/Prisma/TypeScript/JSON schema import modals' },
      { type: 'new', text: 'Entity validation warnings badge (⚠ N) listing issues on hover' },
      { type: 'new', text: 'est:>/< and val:>/< range search tokens in Features' },
      { type: 'new', text: 'Effort/Value 2×2 matrix in Overview (Quick Wins / Big Bets / Fill-ins / Skip)' },
      { type: 'new', text: 'Velocity metrics: done/week sparkline, 14-day daily completions, ETA forecast' },
      { type: 'new', text: 'Feature CSV import via Header button' },
      { type: 'new', text: 'Timeline view by week/month toggle' },
      { type: 'new', text: 'GitHub Issues markdown export' },
      { type: 'new', text: 'Focus mode (⚡): shows in-progress + top unblocked features' },
      { type: 'new', text: 'Batch entity creation: "users, posts, comments" in New Entity input' },
      { type: 'new', text: 'Enum values on Column type with full export support' },
      { type: 'new', text: 'JSON-to-entity import (JsonImportModal + parseJsonToEntity)' },
      { type: 'fix', text: 'Fixed EntityCardHeader getSnapshot infinite loop crash' },
      { type: 'fix', text: 'ApiEndpointsTab empty state now properly centered' },
      { type: 'fix', text: 'JSX fragment bug in ApiEndpointsTab export buttons' },
    ],
  },
  {
    version: 'v0.8',
    date: 'February 2026',
    tag: '',
    tagColor: '',
    changes: [
      { type: 'new', text: 'GraphQL SDL export' },
      { type: 'new', text: 'TypeORM entity export' },
      { type: 'new', text: 'Sequelize, Mongoose, SQLAlchemy exporters' },
      { type: 'new', text: 'Unified copy dropdown on entity cards (SQL/MD/INSERT/Zod/Drizzle/TypeORM)' },
      { type: 'new', text: 'ERD entity hover highlighting — dims unrelated, highlights connected' },
      { type: 'new', text: 'ERD "focus in grid" button on entity card hover' },
      { type: 'new', text: 'Auto-FK suggestion when column name ends in _id' },
      { type: 'new', text: 'FK column rename propagation across referencing columns' },
      { type: 'new', text: 'Milestone due dates — inline editing via clickable badge' },
      { type: 'new', text: 'Assignee workload card in Overview (Team Workload section)' },
      { type: 'new', text: 'Bulk assignee action in feature selection bar' },
      { type: 'new', text: 'Feature search tokens: no:assignee, no:notes, has:notes, is:unestimated' },
      { type: 'new', text: 'Group by Assignee and Group by Tag in features' },
      { type: 'new', text: 'HTML documentation export with full dark-theme HTML output' },
      { type: 'new', text: 'OpenAPI: deprecated endpoints, x-notes, x-status, x-version fields' },
      { type: 'new', text: 'Feature feature.completedAt timestamp + completed:today/week/month tokens' },
      { type: 'new', text: 'document.title updates with project name and completion %' },
      { type: 'new', text: 'FeatureList column headers clickable to cycle sort (Priority, Pts, Val)' },
    ],
  },
  {
    version: 'v0.7',
    date: 'January 2026',
    tag: '',
    tagColor: '',
    changes: [
      { type: 'new', text: 'Drizzle ORM export format' },
      { type: 'new', text: 'Entity tags — color-coded pills, tag filter chips, tags in ERD' },
      { type: 'new', text: 'API endpoint auth filter + path param highlighting + status code suggestion chips' },
      { type: 'new', text: 'API endpoint reorder arrows (↑↓ on hover)' },
      { type: 'new', text: 'Entity markdown table copy and sample INSERT copy' },
      { type: 'new', text: 'Feature notes/acceptance criteria expandable field' },
      { type: 'new', text: 'Feature CSV export' },
      { type: 'new', text: 'Feature bulk import (paste multiple lines)' },
      { type: 'new', text: 'Milestone filter + sort + group in feature list' },
      { type: 'new', text: 'Bulk selection mode: mark done/delete/priority/milestone actions' },
      { type: 'new', text: 'Tag autocomplete when adding tags' },
      { type: 'new', text: 'Entity templates: Message/Chat, Payment, Event, Settings' },
      { type: 'new', text: 'ERD entity description display in card header' },
      { type: 'new', text: 'Endpoint count badge in EntityCardHeader (links to API tab)' },
      { type: 'new', text: 'Default value badge in ColumnRow' },
      { type: 'new', text: 'User story copy button on feature rows' },
    ],
  },
  {
    version: 'v0.6',
    date: 'December 2025',
    tag: '',
    tagColor: '',
    changes: [
      { type: 'new', text: 'Zod schema export per entity and in ExportPanel' },
      { type: 'new', text: 'Smart FK suggestions in FKSelect dropdown' },
      { type: 'new', text: 'DataTypeSelect color-coded by category with grouped dropdown' },
      { type: 'new', text: 'ERD entity hover highlighting with FK edge animations' },
      { type: 'new', text: 'COLUMN_SUGGESTIONS expanded with 60+ patterns' },
      { type: 'new', text: 'API queryParams and notes fields with curl/fetch generators' },
      { type: 'new', text: 'ERD FK edge hover tooltips' },
    ],
  },
  {
    version: 'v0.5',
    date: 'November 2025',
    tag: '',
    tagColor: '',
    changes: [
      { type: 'new', text: 'Find & replace across all project text (Ctrl+H)' },
      { type: 'new', text: 'JSON backup & restore' },
      { type: 'new', text: 'OpenAPI 3.0 YAML export' },
      { type: 'new', text: 'Markdown documentation export' },
      { type: 'new', text: 'Command palette (Ctrl+K)' },
      { type: 'new', text: 'Keyboard shortcuts modal (?)' },
      { type: 'new', text: 'Undo / redo history manager (Ctrl+Z / Ctrl+Shift+Z)' },
      { type: 'new', text: 'ERD visualization with auto-FK edge detection' },
      { type: 'new', text: 'Postman and Insomnia collection export' },
      { type: 'new', text: 'CRUD endpoint generator from entity' },
    ],
  },
  {
    version: 'v0.1',
    date: 'October 2025',
    tag: 'Initial',
    tagColor: '#64748b',
    changes: [
      { type: 'new', text: 'Entity designer with inline column editing' },
      { type: 'new', text: 'Drag-to-reorder columns with @dnd-kit' },
      { type: 'new', text: '20+ data types with grouped DataTypeSelect' },
      { type: 'new', text: 'Feature list with priority, done toggle, and milestones' },
      { type: 'new', text: 'Project overview with scope in/out sections' },
      { type: 'new', text: 'localStorage persistence via Zustand persist middleware' },
      { type: 'new', text: 'SQL DDL + TypeScript interface export' },
      { type: 'new', text: 'Dark theme with JetBrains Mono' },
    ],
  },
];

const TYPE_STYLES: Record<string, string> = {
  new: 'text-accent bg-accent/10 border-accent/30',
  fix: 'text-success bg-success/10 border-success/30',
  breaking: 'text-danger bg-danger/10 border-danger/30',
  perf: 'text-warning bg-warning/10 border-warning/30',
};

const TYPE_LABELS: Record<string, string> = {
  new: 'new',
  fix: 'fix',
  breaking: 'break',
  perf: 'perf',
};

export function Changelog() {
  return (
    <PageLayout
      title="Changelog"
      subtitle="Every release, every improvement, every fix."
      badge="Changelog"
    >
      <div className="relative">
        <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border-default" />
        <div className="space-y-12">
          {RELEASES.map((r) => (
            <div key={r.version} className="flex gap-6 items-start">
              {/* Timeline dot */}
              <div className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-bg-secondary border-2 border-border-active mt-1 relative z-10" />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold font-mono">{r.version}</h2>
                  {r.tag && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                      style={{ color: r.tagColor, backgroundColor: `${r.tagColor}15`, borderColor: `${r.tagColor}40` }}
                    >
                      {r.tag}
                    </span>
                  )}
                  <span className="text-xs text-text-muted">{r.date}</span>
                </div>
                <div className="space-y-1.5">
                  {r.changes.map((c, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className={`flex-shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border mt-0.5 ${TYPE_STYLES[c.type]}`}>
                        {TYPE_LABELS[c.type]}
                      </span>
                      <span className="text-xs text-text-secondary leading-relaxed">{c.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
