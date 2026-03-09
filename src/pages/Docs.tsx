import { Link } from 'react-router-dom';
import { PageLayout } from './PageLayout';

const SECTIONS = [
  {
    id: 'quickstart',
    title: 'Quick start',
    content: [
      { type: 'p', text: 'surplan runs entirely in your browser. No installation, no account, no backend. Open the app and you\'re ready.' },
      { type: 'step', label: '1', text: 'Open the app at /app (or click "Open App" in the nav).' },
      { type: 'step', label: '2', text: 'Type a project name in the header — it\'s auto-saved.' },
      { type: 'step', label: '3', text: 'Switch to the Entities tab and click "New Entity" to start designing your schema.' },
      { type: 'step', label: '4', text: 'All changes are instantly persisted to localStorage. Reload safely.' },
    ],
  },
  {
    id: 'entities',
    title: 'Entity designer',
    content: [
      { type: 'p', text: 'The entity designer is the core of surplan. Create database tables, define columns with types, set primary keys, foreign keys, and nullable constraints.' },
      { type: 'h3', text: 'Creating entities' },
      { type: 'p', text: 'Click "New Entity" or press Ctrl+N on the Entities tab. Type a name and press Enter. You can also create multiple entities at once by typing comma-separated names: "users, posts, comments".' },
      { type: 'h3', text: 'Columns' },
      { type: 'p', text: 'Each entity has a column table. Click "+ Add column" to append a new row. Set the name, data type, nullable toggle, and PK flag inline. Tab through fields to fill them quickly.' },
      { type: 'h3', text: 'Data types' },
      { type: 'p', text: 'surplan supports 20+ data types grouped by category: text (varchar, text, char), numeric (integer, bigint, decimal, float), boolean, datetime (timestamp, date, time), uuid, json/jsonb, arrays, and enums.' },
      { type: 'h3', text: 'Foreign keys' },
      { type: 'p', text: 'Name a column ending in _id (e.g. user_id) and surplan will auto-suggest the FK target. Click the suggestion to wire the reference. FK columns are highlighted in blue with a → indicator.' },
      { type: 'h3', text: 'Importing' },
      { type: 'p', text: 'Import from SQL DDL, Prisma schema, TypeScript interfaces, or JSON objects. Click the Import dropdown in the entity grid toolbar.' },
    ],
  },
  {
    id: 'api',
    title: 'API planning',
    content: [
      { type: 'p', text: 'Document your REST API surface with the API tab. Every endpoint has a method, path, description, auth scheme, request/response body, status codes, tags, and version.' },
      { type: 'h3', text: 'Adding endpoints' },
      { type: 'p', text: 'Press Ctrl+N on the API tab or click "Add Endpoint". Endpoints are grouped by tag (resource group). Click "+ New group" to create a named group.' },
      { type: 'h3', text: 'CRUD generation' },
      { type: 'p', text: 'Select an entity and click "Generate CRUD" to auto-create 5 standard endpoints (LIST, CREATE, GET, UPDATE, DELETE) with correct paths, methods, and status codes.' },
      { type: 'h3', text: 'Exporting' },
      { type: 'p', text: 'Export to OpenAPI 3.0 YAML, Postman collection JSON, Insomnia collection JSON, or copy all endpoints as a Markdown table.' },
    ],
  },
  {
    id: 'features',
    title: 'Feature tracking',
    content: [
      { type: 'p', text: 'Track your project\'s feature roadmap with a lightweight but powerful feature list. Each feature has a title, status, priority, milestone, story points, value score, assignee, due date, tags, and acceptance criteria.' },
      { type: 'h3', text: 'Status lifecycle' },
      { type: 'p', text: 'Features have three states: Todo → In Progress → Done. Click the status icon to cycle. Starting a feature auto-sets its start date. Completing it records a completion timestamp for velocity tracking.' },
      { type: 'h3', text: 'Search tokens' },
      { type: 'p', text: 'The search bar supports advanced tokens: milestone:name, assignee:@name, tag:label, priority:high, status:done, is:pinned, is:blocked, est:>5, val:<=8, no:assignee, has:notes, completed:today.' },
      { type: 'h3', text: 'Milestones' },
      { type: 'p', text: 'Group features into milestones (v1.0, Beta, MVP, etc.) with due dates. Progress bars show done/in-progress/total per milestone in the Overview tab.' },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    content: [
      { type: 'shortcuts', items: [
        { keys: ['Ctrl', 'K'], desc: 'Open command palette' },
        { keys: ['Ctrl', '1'], desc: 'Go to Overview tab' },
        { keys: ['Ctrl', '2'], desc: 'Go to Entities tab' },
        { keys: ['Ctrl', '3'], desc: 'Go to Features tab' },
        { keys: ['Ctrl', '4'], desc: 'Go to API tab' },
        { keys: ['Ctrl', 'N'], desc: 'New entity / feature / endpoint (tab-dependent)' },
        { keys: ['Ctrl', 'E'], desc: 'Open export panel' },
        { keys: ['Ctrl', 'F'], desc: 'Focus search in active tab' },
        { keys: ['Ctrl', 'H'], desc: 'Find & replace across all text' },
        { keys: ['Ctrl', 'Z'], desc: 'Undo' },
        { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo' },
        { keys: ['?'], desc: 'Show keyboard shortcuts modal' },
        { keys: ['Esc'], desc: 'Close modal / cancel edit' },
      ]},
    ],
  },
  {
    id: 'exports',
    title: 'Exports reference',
    content: [
      { type: 'p', text: 'surplan exports to 18+ formats from the Export panel (Ctrl+E) or entity copy dropdown:' },
      { type: 'exportTable', items: [
        { fmt: 'PostgreSQL DDL', desc: 'Full CREATE TABLE with constraints, CHECK for enums, FK references' },
        { fmt: 'MySQL DDL', desc: 'MySQL-flavored CREATE TABLE with ENUM() types' },
        { fmt: 'SQLite DDL', desc: 'Lightweight schema for SQLite databases' },
        { fmt: 'Prisma Schema', desc: 'Complete schema.prisma with model blocks, @id, @default, and relations' },
        { fmt: 'Drizzle ORM', desc: 'TypeScript drizzle-orm table definitions with pgEnum and .references()' },
        { fmt: 'TypeORM', desc: '@Entity() and @Column() decorators for TypeORM class models' },
        { fmt: 'Sequelize', desc: 'TypeScript Sequelize models with InferAttributes/InferCreationAttributes' },
        { fmt: 'Mongoose', desc: 'TypeScript Schema<I> + model() with timestamps and ObjectId FKs' },
        { fmt: 'SQLAlchemy', desc: 'Python DeclarativeBase with Mapped[T] = mapped_column() and relationships' },
        { fmt: 'TypeScript Types', desc: 'Interface definitions with optional nullable fields' },
        { fmt: 'Zod Schema', desc: 'z.object() schemas per entity with proper nullability and enum unions' },
        { fmt: 'GraphQL Schema', desc: 'SDL type definitions, input types, scalar JSON, Query/Mutation roots' },
        { fmt: 'OpenAPI 3.0', desc: 'YAML spec with paths, components/schemas from entities, auth schemes' },
        { fmt: 'Postman Collection', desc: 'v2.1 collection JSON importable into Postman' },
        { fmt: 'Insomnia Collection', desc: 'JSON collection importable into Insomnia REST client' },
        { fmt: 'Markdown Docs', desc: 'Tables for entities and API endpoints, features by milestone' },
        { fmt: 'HTML Docs', desc: 'Self-contained dark-theme HTML page — entities, API, features, scope' },
        { fmt: 'JSON Backup', desc: 'Full project state backup, importable via "Restore"' },
        { fmt: 'GitHub Issues', desc: 'Markdown formatted issue list with labels, assignees, milestones' },
        { fmt: 'CSV Features', desc: 'Spreadsheet-compatible feature list with all fields' },
      ]},
    ],
  },
];

type ContentItem =
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'step'; label: string; text: string }
  | { type: 'shortcuts'; items: { keys: string[]; desc: string }[] }
  | { type: 'exportTable'; items: { fmt: string; desc: string }[] };

function renderContent(item: ContentItem, i: number) {
  if (item.type === 'p') {
    return <p key={i} className="text-sm text-text-secondary leading-relaxed mb-4">{item.text}</p>;
  }
  if (item.type === 'h3') {
    return <h3 key={i} className="text-xs font-semibold text-text-primary uppercase tracking-wider mt-6 mb-2">{item.text}</h3>;
  }
  if (item.type === 'step') {
    return (
      <div key={i} className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-5 h-5 rounded bg-accent/10 border border-accent/20 flex items-center justify-center text-[9px] font-bold text-accent">
          {item.label}
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{item.text}</p>
      </div>
    );
  }
  if (item.type === 'shortcuts') {
    return (
      <div key={i} className="rounded-lg border border-border-default overflow-hidden">
        {item.items.map((s, j) => (
          <div key={j} className="flex items-center justify-between px-4 py-2.5 border-b border-border-default last:border-0 hover:bg-bg-hover transition-colors">
            <span className="text-xs text-text-secondary">{s.desc}</span>
            <div className="flex items-center gap-1">
              {s.keys.map((k) => (
                <kbd key={k} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-default text-text-secondary">
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (item.type === 'exportTable') {
    return (
      <div key={i} className="rounded-lg border border-border-default overflow-hidden">
        <div className="grid grid-cols-[160px_1fr] text-[9px] uppercase tracking-wider text-text-muted px-4 py-2 border-b border-border-default bg-bg-tertiary/50">
          <span>Format</span><span>Description</span>
        </div>
        {item.items.map((r, j) => (
          <div key={j} className="grid grid-cols-[160px_1fr] px-4 py-2.5 border-b border-border-default last:border-0 hover:bg-bg-hover transition-colors">
            <span className="text-xs font-mono text-accent">{r.fmt}</span>
            <span className="text-xs text-text-secondary">{r.desc}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function Docs() {
  return (
    <PageLayout
      title="Documentation"
      subtitle="Everything you need to know about surplan — from first entity to full export."
      badge="Docs"
    >
      <div className="flex gap-10">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block w-44 flex-shrink-0">
          <div className="sticky top-28 space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-text-muted mb-3">On this page</p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-xs text-text-secondary hover:text-text-primary transition-colors py-0.5"
              >
                {s.title}
              </a>
            ))}
            <div className="pt-6">
              <Link
                to="/app"
                className="block text-xs text-center px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white transition-colors"
              >
                Open App →
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-lg font-bold mb-5 pb-3 border-b border-border-default">{section.title}</h2>
              {section.content.map((item, i) => renderContent(item as ContentItem, i))}
            </section>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
