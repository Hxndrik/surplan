import { Link } from 'react-router-dom';
import { PageLayout } from './PageLayout';

const FEATURE_GROUPS = [
  {
    group: 'Entity Designer',
    color: '#6366f1',
    items: [
      { name: 'Visual column editor', detail: 'Inline editing of column name, type, nullable, PK, FK, default, and enum values.' },
      { name: '20+ data types', detail: 'varchar, text, integer, bigint, decimal, float, boolean, timestamp, date, uuid, json, jsonb, enum, bytea, array, and more.' },
      { name: 'FK auto-detection', detail: 'Name a column ending in _id and surplan suggests the FK target from your entities.' },
      { name: 'Enum values', detail: 'Set comma-separated enum values on enum columns. Exports to CHECK(), ENUM(), z.enum(), union types.' },
      { name: 'Entity templates', detail: 'Pre-built column sets for User, Post, Product, Order, Session, Notification, and more.' },
      { name: 'Batch entity creation', detail: 'Type "users, posts, comments" to create multiple entities at once.' },
      { name: 'SQL / Prisma / JSON import', detail: 'Parse and import existing schemas from SQL DDL, Prisma schema files, TypeScript interfaces, or JSON objects.' },
      { name: 'Drag-to-reorder columns', detail: 'Drag column rows by the grip handle using @dnd-kit.' },
      { name: 'Entity tags', detail: 'Color-coded tag pills on entity cards with filter chips in the toolbar.' },
      { name: 'Validation warnings', detail: 'Orange ⚠ badge shows issues: no PK, duplicate names, empty names, unknown FK target.' },
      { name: 'Entity color picker', detail: '12 accent colors per entity — set via the dot in the card header.' },
      { name: 'Column filter', detail: 'Search bar appears on entities with 8+ columns for fast column finding.' },
      { name: 'Type breakdown tooltip', detail: 'Hover the column count badge to see type distribution.' },
    ],
  },
  {
    group: 'Export Engine',
    color: '#8b5cf6',
    items: [
      { name: 'PostgreSQL DDL', detail: 'Full CREATE TABLE with SERIAL, UUID, CHECK constraints, FK REFERENCES.' },
      { name: 'MySQL DDL', detail: 'MySQL-flavored schema with ENUM() types and AUTO_INCREMENT.' },
      { name: 'Prisma schema', detail: '@id, @default, @relation, enum blocks, and all scalar types.' },
      { name: 'Drizzle ORM', detail: 'pgTable(), pgEnum(), .notNull(), .references() — full TypeScript.' },
      { name: 'TypeORM', detail: '@Entity(), @PrimaryGeneratedColumn(), @Column(), @ManyToOne() decorators.' },
      { name: 'Sequelize', detail: 'InferAttributes/InferCreationAttributes + Model.init() with all column configs.' },
      { name: 'Mongoose', detail: 'Schema<I> + model() with TypeScript, timestamps, and ObjectId FK fields.' },
      { name: 'SQLAlchemy', detail: 'Python DeclarativeBase + Mapped[T] = mapped_column() with relationships.' },
      { name: 'TypeScript interfaces', detail: 'Clean interface definitions with optional nullable fields.' },
      { name: 'Zod schemas', detail: 'z.object() with z.string(), z.number(), z.enum(), .nullable(), .optional().' },
      { name: 'GraphQL SDL', detail: 'Type defs, scalar JSON, input types, Query/Mutation roots.' },
      { name: 'OpenAPI 3.0 YAML', detail: 'Full YAML spec from API endpoints with entity schemas as components.' },
      { name: 'Postman collection', detail: 'v2.1 JSON importable into Postman workspace.' },
      { name: 'Insomnia collection', detail: 'JSON collection importable into Insomnia REST client.' },
      { name: 'Markdown tables', detail: 'Pipe-table format for entity columns and API endpoints.' },
      { name: 'HTML documentation', detail: 'Self-contained dark-theme HTML page with all entities, API, features, and scope.' },
      { name: 'JSON backup', detail: 'Full project state snapshot. Import with Restore.' },
      { name: 'GitHub Issues', detail: 'Markdown issue list with labels, assignees, and milestones.' },
      { name: 'CSV features', detail: 'Spreadsheet-compatible feature export with all fields.' },
      { name: 'Sample INSERT', detail: 'Realistic INSERT INTO statement with placeholder values per entity.' },
    ],
  },
  {
    group: 'API Planning',
    color: '#06b6d4',
    items: [
      { name: 'REST endpoint documentation', detail: 'Method, path, description, auth, request body, response body, status codes, tags.' },
      { name: 'CRUD generation', detail: 'One click to generate 5 standard endpoints from any entity with correct paths and status codes.' },
      { name: 'Auth schemes', detail: 'None, Bearer, API Key, Basic, OAuth2 — color-coded in the UI.' },
      { name: 'Query params', detail: 'Add query params with key/type/required/default. Quick-add chips for page, limit, sort, filter.' },
      { name: 'Status code suggestions', detail: 'Chip suggestions for common status codes based on method (200, 201, 400, 404, 422…).' },
      { name: 'Path param highlighting', detail: ':param and {param} segments highlighted in the path display.' },
      { name: 'Version field', detail: 'Tag endpoints with v1/v2/v3/beta. Filter by version when multiple exist.' },
      { name: 'Endpoint status', detail: 'Draft / Implemented / Deprecated — with filter and badge in collapsed row.' },
      { name: 'Tag groups', detail: 'Group endpoints by resource name (Users, Auth, Products…).' },
      { name: 'Endpoint notes', detail: 'Textarea for implementation caveats, gotchas, and links.' },
      { name: 'OpenAPI export', detail: 'Generates full YAML with path params, query params, auth, deprecated flag, x-version.' },
      { name: 'Curl / fetch snippet', detail: 'Generated code snippet per endpoint with auth headers and body.' },
    ],
  },
  {
    group: 'Feature Tracking',
    color: '#10b981',
    items: [
      { name: 'Three-state status', detail: 'Todo → In Progress → Done. Click cycles states. In-progress sets start date automatically.' },
      { name: 'Priority levels', detail: 'Low, Medium, High, Critical — with color badges and sort support.' },
      { name: 'Story points & value score', detail: 'Estimate (points) and value (1–10) fields. Efficiency = value/points.' },
      { name: 'Milestones', detail: 'Group features into milestones with optional due dates and progress bars.' },
      { name: 'Assignees', detail: '@-prefixed assignee field per feature. Filter and group by assignee.' },
      { name: 'Due dates', detail: 'Optional due date with overdue badge (red) when past due.' },
      { name: 'Feature tags', detail: 'Color-coded tag pills with autocomplete from existing tags.' },
      { name: 'Feature kind', detail: 'Feature / Bug / Improvement / Chore — with group-by and kind breakdown card.' },
      { name: 'Dependencies (blockedBy)', detail: 'Link features as blockers. Cycle detection prevents loops. Blocked filter pill.' },
      { name: 'Acceptance criteria', detail: 'Expandable notes section below each feature row.' },
      { name: 'Pinned features', detail: 'Pin features to float them to the top of their group regardless of sort.' },
      { name: 'Advanced search tokens', detail: 'milestone:, assignee:, tag:, priority:, status:, est:>N, val:<=N, is:blocked, no:assignee, completed:today' },
      { name: 'Group by', detail: 'Group by milestone, assignee, tag, kind, or priority.' },
      { name: 'Sort by', detail: 'Sort by priority, status, estimate, value, efficiency, due date, created date.' },
      { name: 'Focus mode', detail: '⚡ Focus mode shows in-progress + top unblocked features — max 8 items.' },
      { name: 'Timeline view', detail: 'Gantt-style timeline by week or month showing feature distribution.' },
      { name: 'Bulk actions', detail: 'Select multiple features and bulk-set priority, milestone, assignee, or delete.' },
      { name: 'Velocity metrics', detail: 'Overview shows done/week for last 4 weeks, daily sparkline, and ETA forecast.' },
      { name: 'Effort/value matrix', detail: '2×2 quadrant: Quick Wins / Big Bets / Fill-ins / Skip.' },
      { name: 'CSV / bulk import', detail: 'Import features from CSV file or paste multiple lines.' },
    ],
  },
  {
    group: 'ERD View',
    color: '#f59e0b',
    items: [
      { name: 'Auto-generated ERD', detail: 'SVG diagram from entities and FK references. Drawn on the Entities tab sidebar.' },
      { name: 'FK edge detection', detail: 'Auto-detects FK columns and draws edges between tables.' },
      { name: 'Cardinality labels', detail: '1:N labels on FK edges.' },
      { name: 'Edge hover tooltips', detail: 'Hover an edge to see "entity.column → entity.column" tooltip.' },
      { name: 'Entity hover highlighting', detail: 'Hover an entity to dim unrelated entities and highlight connected ones.' },
      { name: 'Drag to position', detail: 'Drag entity boxes to custom positions. Positions persist to localStorage.' },
      { name: 'Focus in grid', detail: 'Hover an ERD entity and click the link icon to jump to it in the grid view.' },
      { name: 'Tags in ERD', detail: 'Entity tags shown below entity name in the ERD card.' },
    ],
  },
  {
    group: 'General UX',
    color: '#64748b',
    items: [
      { name: 'localStorage persistence', detail: 'All state auto-persisted. Reload safely. Data survives browser restarts.' },
      { name: 'Undo / redo', detail: 'Ctrl+Z / Ctrl+Shift+Z. In-memory history maintained during session.' },
      { name: 'Command palette', detail: 'Ctrl+K — search entities, run commands, jump to exports, toggle views.' },
      { name: 'Find & replace', detail: 'Ctrl+H — regex-capable find & replace across all text in the project.' },
      { name: 'Keyboard shortcuts', detail: '? to show shortcuts modal. Ctrl+1-4 for tabs, Ctrl+N for new, Ctrl+E for export.' },
      { name: 'JSON backup & restore', detail: 'Export full project as JSON. Restore from a previous backup file.' },
      { name: 'Inline editing everywhere', detail: 'Click-to-edit for entity names, column names, feature titles, endpoint paths, and more.' },
      { name: 'Dark theme', detail: '#0a0a0b background, indigo accent, JetBrains Mono throughout.' },
      { name: 'Scope section', detail: 'In-scope / out-of-scope item lists in the Overview tab.' },
      { name: 'Tech stack notes', detail: 'Free-text tech stack section in the Overview tab.' },
    ],
  },
];

export function Features() {
  return (
    <PageLayout
      title="Features"
      subtitle="A complete breakdown of every feature in surplan."
      badge="Features"
    >
      {/* Quick jump */}
      <div className="flex flex-wrap gap-2 mb-12">
        {FEATURE_GROUPS.map((g) => (
          <a
            key={g.group}
            href={`#${g.group.replace(/\s+/g, '-').toLowerCase()}`}
            className="text-[10px] px-3 py-1.5 rounded border border-border-default text-text-secondary hover:border-border-active hover:text-text-primary transition-colors font-mono"
            style={{ borderColor: `${g.color}40`, color: g.color }}
          >
            {g.group}
          </a>
        ))}
      </div>

      <div className="space-y-14">
        {FEATURE_GROUPS.map((g) => (
          <section key={g.group} id={g.group.replace(/\s+/g, '-').toLowerCase()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-6 rounded-sm" style={{ backgroundColor: g.color }} />
              <h2 className="text-lg font-bold">{g.group}</h2>
              <span className="text-[9px] text-text-muted font-mono">{g.items.length} features</span>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {g.items.map((item) => (
                <div
                  key={item.name}
                  className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3 hover:border-border-active transition-colors"
                >
                  <div className="text-xs font-semibold mb-0.5" style={{ color: g.color }}>{item.name}</div>
                  <div className="text-xs text-text-secondary leading-relaxed">{item.detail}</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 text-center">
        <Link
          to="/app"
          className="inline-block px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        >
          Try all features for free →
        </Link>
      </div>
    </PageLayout>
  );
}
