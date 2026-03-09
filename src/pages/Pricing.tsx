import { Link } from 'react-router-dom';
import { PageLayout } from './PageLayout';

const PLAN_FEATURES = [
  { label: 'Unlimited entities & columns', note: '' },
  { label: 'Unlimited API endpoints', note: '' },
  { label: 'Unlimited features & milestones', note: '' },
  { label: 'ERD visualization', note: '' },
  { label: '18+ export formats', note: 'SQL, Prisma, Drizzle, TypeORM, Zod, GraphQL, OpenAPI…' },
  { label: 'Import from SQL / Prisma / JSON', note: '' },
  { label: 'JSON backup & restore', note: '' },
  { label: 'Full keyboard shortcuts', note: '' },
  { label: 'Command palette', note: '' },
  { label: 'Dark theme, mono font', note: '' },
  { label: 'No account required', note: '' },
  { label: 'No data ever leaves your browser', note: '' },
  { label: 'Offline capable', note: '' },
  { label: 'Open source', note: 'MIT license' },
];

const FAQ = [
  {
    q: 'Is this actually free?',
    a: 'Yes, completely free. There\'s no freemium, no trial, no credit card. surplan is a local-only browser app. There\'s nothing to charge for.',
  },
  {
    q: 'Will it always be free?',
    a: 'The core local-only version is free forever. If a hosted/team version is ever built, it may have paid tiers — but the local app stays free.',
  },
  {
    q: 'Why is it free?',
    a: 'surplan has no server costs. It runs entirely in your browser. There\'s no infrastructure to maintain, so there\'s nothing to recoup.',
  },
  {
    q: 'Is there a team/collaboration version?',
    a: 'Not yet. surplan is currently local-only and single-user. Real-time collaboration would require a backend, which is a different product. Stay tuned.',
  },
  {
    q: 'Can I use it for commercial projects?',
    a: 'Yes. Use surplan to plan any project — personal, commercial, client work. Your plans are yours.',
  },
  {
    q: 'What happens to my data if I clear localStorage?',
    a: 'It\'s gone. That\'s the tradeoff of local-only. Use the JSON Backup export regularly if you want persistent snapshots.',
  },
  {
    q: 'Does surplan support multiple projects?',
    a: 'Currently one project per browser session. You can export a JSON backup, clear storage, and start a new project, then import the old one back.',
  },
];

export function Pricing() {
  return (
    <PageLayout
      title="Pricing"
      subtitle="Free. No asterisks. No credit card. No account. Just open the app."
      badge="Pricing"
    >
      {/* Single plan card */}
      <div className="max-w-lg mx-auto mb-16">
        <div className="rounded-2xl border border-accent/30 bg-bg-secondary overflow-hidden shadow-lg shadow-accent/5">
          <div className="bg-accent/5 px-8 py-8 text-center border-b border-border-default">
            <div className="inline-block text-[9px] font-bold uppercase tracking-widest text-accent bg-accent/10 border border-accent/30 rounded-full px-3 py-1 mb-4">
              Only plan
            </div>
            <div className="text-5xl font-bold mb-1">$0</div>
            <p className="text-xs text-text-muted">forever · no credit card</p>
          </div>
          <div className="px-8 py-6">
            <ul className="space-y-3">
              {PLAN_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <span className="text-xs text-text-primary">{f.label}</span>
                    {f.note && <span className="text-[10px] text-text-muted ml-1.5">— {f.note}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-8 pb-8">
            <Link
              to="/app"
              className="block w-full text-center py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
            >
              Open surplan → free forever
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg font-bold mb-8 text-center">Frequently asked questions</h2>
        <div className="space-y-4">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-xl border border-border-default bg-bg-secondary p-5">
              <h3 className="text-sm font-semibold mb-2">{f.q}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
