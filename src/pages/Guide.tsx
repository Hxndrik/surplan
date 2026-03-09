import { Link } from 'react-router-dom';
import { PageLayout } from './PageLayout';

const GUIDES = [
  {
    title: 'Design your first schema',
    time: '5 min',
    steps: [
      { action: 'Open the app', detail: 'Navigate to /app. Your project is auto-saved in localStorage.' },
      { action: 'Name your project', detail: 'Click the project name in the header and type your project name. Press Enter.' },
      { action: 'Go to Entities tab', detail: 'Click "Entities" in the sidebar or press Ctrl+2.' },
      { action: 'Create your first entity', detail: 'Click "New Entity" or press Ctrl+N. Type the entity name (e.g. "User") and press Enter.' },
      { action: 'Add an id column', detail: 'A default "id" column is added automatically with uuid type and PK set.' },
      { action: 'Add more columns', detail: 'Click "+ Add column". Type the column name, tab to select type, toggle nullable if needed.' },
      { action: 'Add a FK column', detail: 'Name a column ending in _id (e.g. "role_id"). A FK suggestion appears — click it to link the reference.' },
      { action: 'Copy the SQL', detail: 'Click the copy icon on the entity card header and choose "PostgreSQL DDL". The schema is on your clipboard.' },
    ],
  },
  {
    title: 'Document your API surface',
    time: '3 min',
    steps: [
      { action: 'Switch to API tab', detail: 'Click "API" in the sidebar or press Ctrl+4.' },
      { action: 'Generate CRUD from entity', detail: 'Click "Generate CRUD", select an entity, and click the lightning button. 5 endpoints are created instantly.' },
      { action: 'Edit endpoint details', detail: 'Click any endpoint to expand it. Set auth scheme, request/response body, status codes, and notes.' },
      { action: 'Add query params', detail: 'In the expanded view, find the Query Params section. Click quick-add suggestions for page/limit/sort.' },
      { action: 'Export as OpenAPI', detail: 'Click "OpenAPI" in the top bar to download the YAML spec. Import it into Swagger UI, Postman, or Insomnia.' },
    ],
  },
  {
    title: 'Plan features with milestones',
    time: '4 min',
    steps: [
      { action: 'Switch to Features tab', detail: 'Click "Features" in the sidebar or press Ctrl+3.' },
      { action: 'Add a milestone', detail: 'Click "Add Milestone" in the Overview panel, or go to Overview (Ctrl+1) and type in the milestone name.' },
      { action: 'Add features', detail: 'Click "Add Feature" or press Ctrl+N. Type the feature title and press Enter. You can paste multiple lines to bulk import.' },
      { action: 'Set priority and estimate', detail: 'Click the priority badge to cycle (Low → Medium → High → Critical). Click the points field to set story points.' },
      { action: 'Assign to milestone', detail: 'Click the milestone badge on any feature row and select the milestone from the dropdown.' },
      { action: 'Mark in-progress', detail: 'Click the circle status icon to mark as in-progress (half-circle). Click again for done (checkmark). Start date is auto-set.' },
      { action: 'Use search tokens', detail: 'Type "milestone:v1 priority:high" in the search box to filter. Try "est:>5 no:assignee" for unassigned big features.' },
    ],
  },
  {
    title: 'Import an existing schema',
    time: '2 min',
    steps: [
      { action: 'Open Import dropdown', detail: 'On the Entities tab, click the Import button → choose "SQL / Prisma".' },
      { action: 'Paste your schema', detail: 'Paste any PostgreSQL CREATE TABLE statements, Prisma schema, or TypeScript interfaces into the text area.' },
      { action: 'Click Import', detail: 'surplan auto-detects the format and creates entities for each table/model found.' },
      { action: 'Import from JSON', detail: 'Paste a JSON object or array — surplan infers column types from value patterns (UUID, ISO dates, numbers, booleans).' },
    ],
  },
  {
    title: 'Export for handoff',
    time: '2 min',
    steps: [
      { action: 'Open Export panel', detail: 'Press Ctrl+E or click "Export" in the header. The panel shows all available formats.' },
      { action: 'Choose your format', detail: 'Select from SQL DDL, Prisma, Drizzle, TypeORM, Zod, GraphQL, TypeScript, OpenAPI, and more.' },
      { action: 'Copy or download', detail: 'Click Copy to copy to clipboard, or Download to save the file.' },
      { action: 'Export HTML docs', detail: 'Click "HTML Docs" in the Quick Export section on Overview. A self-contained dark-theme HTML page is generated with all entities, API, and features.' },
      { action: 'Backup your project', detail: 'Click "Backup JSON" to save the full project state. Restore it later with the Restore button.' },
    ],
  },
];

const TIPS = [
  { tip: 'Use batch create', detail: 'Type "users, posts, comments" in the New Entity input to create 3 entities at once.' },
  { tip: 'Command palette', detail: 'Press Ctrl+K to search all commands, jump to entities, or trigger exports.' },
  { tip: 'Drag to reorder', detail: 'Drag column rows by the grip handle on the left to reorder. Drag entity cards in the grid header.' },
  { tip: 'Entity templates', detail: 'Click the template icon when creating an entity to pick from User, Post, Product, Order, and more.' },
  { tip: 'Find & replace', detail: 'Ctrl+H opens a find & replace across all text in entities, features, and endpoints.' },
  { tip: 'ERD focus', detail: 'In the ERD view, hover an entity and click the external link icon to jump to that entity in the grid.' },
  { tip: 'Pin features', detail: 'Click the pin icon on any feature to float it to the top of its group, regardless of sort order.' },
  { tip: 'Undo/redo', detail: 'Ctrl+Z to undo, Ctrl+Shift+Z to redo. Undo history is maintained in memory during your session.' },
];

export function Guide() {
  return (
    <PageLayout
      title="Usage Guide"
      subtitle="Step-by-step walkthroughs for the most common surplan workflows."
      badge="Guide"
    >
      {/* Jump links */}
      <div className="flex flex-wrap gap-2 mb-12">
        {GUIDES.map((g) => (
          <a
            key={g.title}
            href={`#${g.title.replace(/\s+/g, '-').toLowerCase()}`}
            className="text-xs px-3 py-1.5 rounded border border-border-default text-text-secondary hover:border-border-active hover:text-text-primary transition-colors"
          >
            {g.title}
          </a>
        ))}
      </div>

      {/* Guides */}
      <div className="space-y-14">
        {GUIDES.map((g) => (
          <section key={g.title} id={g.title.replace(/\s+/g, '-').toLowerCase()}>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-lg font-bold">{g.title}</h2>
              <span className="text-[9px] font-mono text-text-muted bg-bg-secondary border border-border-default rounded px-2 py-0.5">
                ~{g.time}
              </span>
            </div>
            <div className="space-y-3">
              {g.steps.map((s, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-bg-secondary border border-border-default flex items-center justify-center text-[9px] font-bold text-text-muted group-hover:border-accent/30 group-hover:text-accent transition-colors">
                    {i + 1}
                  </div>
                  <div className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3 flex-1 hover:border-border-active transition-colors">
                    <div className="text-xs font-semibold mb-0.5">{s.action}</div>
                    <div className="text-xs text-text-secondary">{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Tips */}
      <section className="mt-16">
        <h2 className="text-lg font-bold mb-6">Pro tips</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {TIPS.map((t) => (
            <div key={t.tip} className="bg-bg-secondary border border-border-default rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-accent" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-0.5">{t.tip}</div>
                  <div className="text-xs text-text-secondary">{t.detail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="mt-16 rounded-xl border border-border-default bg-bg-secondary p-8 text-center">
        <h2 className="text-lg font-bold mb-2">Ready to try it?</h2>
        <p className="text-sm text-text-secondary mb-6">No setup. Opens instantly in your browser.</p>
        <Link
          to="/app"
          className="inline-block px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        >
          Open surplan →
        </Link>
      </div>
    </PageLayout>
  );
}
