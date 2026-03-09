import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Docs', href: '/docs' },
  { label: 'Guide', href: '/guide' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Pricing', href: '/pricing' },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: 'Entity Designer',
    color: '#6366f1',
    desc: 'Design your database schema visually. Add columns, set types, define relationships, and export SQL, Prisma, Drizzle, TypeORM, or Zod in one click.',
    tags: ['PostgreSQL', 'MySQL', 'SQLite', 'Prisma', 'Drizzle'],
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'API Planning',
    color: '#06b6d4',
    desc: 'Document every endpoint with method, path, auth, request/response bodies, and status codes. Export OpenAPI 3.0, Postman, or Insomnia collections instantly.',
    tags: ['REST', 'OpenAPI', 'Postman', 'Insomnia', 'cURL'],
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
    title: 'Feature Tracking',
    color: '#10b981',
    desc: 'Track features with milestones, priorities, story points, assignees, and due dates. Filter by status, search with tokens, and see velocity metrics.',
    tags: ['Milestones', 'Burndown', 'Sprints', 'Dependencies'],
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    title: 'ERD Visualization',
    color: '#f59e0b',
    desc: 'Auto-generated entity relationship diagram with FK edge detection, cardinality labels, and hover highlighting. Drag entities to custom positions.',
    tags: ['FK edges', 'Cardinality', 'Auto-layout', 'SVG export'],
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
    ),
    title: 'Smart Exports',
    color: '#8b5cf6',
    desc: 'Export to 15+ formats: SQL DDL, TypeScript interfaces, Prisma schema, Drizzle ORM, TypeORM, Zod, GraphQL, Sequelize, Mongoose, SQLAlchemy, and more.',
    tags: ['15+ formats', 'One click', 'Clipboard'],
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: '100% Local',
    color: '#ec4899',
    desc: 'Zero backend. No account. No telemetry. All data lives in your browser\'s localStorage. Your plans never touch a server — ever.',
    tags: ['No signup', 'localStorage', 'Offline', 'Open source'],
  },
];

const STEPS = [
  { n: '01', title: 'Define your entities', desc: 'Start by sketching your data model. Add tables, columns, types, and FK relationships. Import from SQL, Prisma, or JSON.' },
  { n: '02', title: 'Plan your API surface', desc: 'Document every endpoint. Group by resource, set auth schemes, and generate CRUD sets from entities with one click.' },
  { n: '03', title: 'Track features & milestones', desc: 'Break work into features. Assign priorities, estimates, due dates, and dependencies. Group by milestone, sprint, or assignee.' },
  { n: '04', title: 'Export & ship', desc: 'Copy schema as SQL, TypeScript, Prisma, Drizzle, or GraphQL. Export OpenAPI YAML, Postman collection, or a full HTML doc site.' },
];

const EXPORTS = [
  { label: 'PostgreSQL DDL', color: '#6366f1' },
  { label: 'MySQL DDL', color: '#6366f1' },
  { label: 'Prisma Schema', color: '#06b6d4' },
  { label: 'Drizzle ORM', color: '#06b6d4' },
  { label: 'TypeORM Entity', color: '#06b6d4' },
  { label: 'Sequelize', color: '#06b6d4' },
  { label: 'SQLAlchemy', color: '#10b981' },
  { label: 'Mongoose', color: '#10b981' },
  { label: 'TypeScript Types', color: '#f59e0b' },
  { label: 'Zod Schema', color: '#f59e0b' },
  { label: 'GraphQL Schema', color: '#ec4899' },
  { label: 'OpenAPI 3.0 YAML', color: '#8b5cf6' },
  { label: 'Postman Collection', color: '#8b5cf6' },
  { label: 'Insomnia Collection', color: '#8b5cf6' },
  { label: 'Markdown Docs', color: '#64748b' },
  { label: 'HTML Docs', color: '#64748b' },
  { label: 'JSON Backup', color: '#64748b' },
  { label: 'GitHub Issues', color: '#64748b' },
];

const TESTIMONIALS = [
  { name: 'TS', quote: 'Finally a schema designer that doesn\'t need a login. I use it before every greenfield project.', role: 'Senior Backend Engineer' },
  { name: 'MK', quote: 'Replaced three tools with this. The Prisma export alone saves me 20 minutes per project.', role: 'Full-stack developer' },
  { name: 'AR', quote: 'The ERD with FK detection is shockingly good for a local tool. Impressed.', role: 'Lead Architect' },
  { name: 'JL', quote: 'Love that nothing leaves my machine. I can plan client projects without NDA concerns.', role: 'Freelance developer' },
];

export function Landing() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
      if (resolved === 'light') {
        root.classList.add('light');
      } else {
        root.classList.remove('light');
      }
    };

    apply();

    if (theme === 'system') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  useEffect(() => {
    document.title = 'surplan — Free Developer Planning Tool | Schema Designer, API Planner & Feature Tracker';
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border-default bg-bg-primary/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-sm tracking-tight">
            <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            surplan
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} to={l.href} className="text-sm text-text-muted hover:text-text-primary transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {/* Theme toggle — cycles system → light → dark */}
            <button
              type="button"
              onClick={() => {
                const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
                setTheme(next);
              }}
              title={theme === 'system' ? 'Theme: System (click for Light)' : theme === 'light' ? 'Theme: Light (click for Dark)' : 'Theme: Dark (click for System)'}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              {theme === 'system' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
                </svg>
              ) : theme === 'light' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              )}
            </button>
            <Link
              to="/app"
              className="text-sm px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors font-medium"
            >
              Open App →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 text-[10px] font-medium text-text-muted border border-border-default rounded-full px-3 py-1.5 mb-8 bg-bg-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block"></span>
            Local-only · No account · No telemetry
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Plan your next project<br />
            <span className="text-accent">start to deploy</span>
          </h1>
          <p className="text-text-secondary text-base md:text-lg max-w-xl mb-10 leading-relaxed">
            surplan is a zero-backend planning tool for developers. Design your database schema,
            document your API, and track features — all in your browser with nothing sent anywhere.
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link
              to="/app"
              className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium text-sm transition-colors"
            >
              Start planning for free
            </Link>
            <Link
              to="/guide"
              className="px-6 py-2.5 rounded-lg border border-border-default hover:border-border-active text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              View usage guide
            </Link>
          </div>
          <p className="mt-4 text-[10px] text-text-muted">
            Free forever · Works offline · No install required
          </p>
        </div>

        {/* Fake terminal / code preview */}
        <div className="mt-16 relative">
          <div className="rounded-xl border border-border-default bg-bg-secondary overflow-hidden shadow-2xl shadow-black/40">
            {/* Terminal bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-bg-tertiary border-b border-border-default">
              <div className="w-2.5 h-2.5 rounded-full bg-danger/70"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-warning/70"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-success/70"></div>
              <span className="ml-2 text-[10px] text-text-muted">surplan — Entity Designer</span>
            </div>
            {/* Mock UI */}
            <div className="grid grid-cols-[1fr_2fr] divide-x divide-border-default" style={{ minHeight: 360 }}>
              {/* Sidebar mock */}
              <div className="p-4 space-y-1 text-[11px]">
                <div className="text-[9px] text-text-muted uppercase tracking-wider mb-3">Entities (4)</div>
                {['User', 'Post', 'Comment', 'Tag'].map((e, i) => (
                  <div
                    key={e}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-text-secondary ${i === 0 ? 'bg-accent/10 text-accent' : 'hover:bg-bg-hover'}`}
                  >
                    <span className="font-medium">{e}</span>
                    <span className="text-[9px] text-text-muted">{[6, 5, 4, 2][i]} cols</span>
                  </div>
                ))}
                <div className="mt-4 border-t border-border-default pt-3">
                  <div className="text-[9px] text-text-muted uppercase tracking-wider mb-2">Quick export</div>
                  {['SQL DDL', 'Prisma', 'TypeScript', 'Zod'].map((fmt) => (
                    <div key={fmt} className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-text-muted hover:text-text-secondary cursor-default rounded hover:bg-bg-hover">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {fmt}
                    </div>
                  ))}
                </div>
              </div>
              {/* Card mock */}
              <div className="p-4">
                <div className="rounded-lg border border-border-default bg-bg-primary overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary/50 border-b border-border-default">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    <span className="text-xs font-semibold text-text-primary">User</span>
                    <span className="text-[10px] text-text-muted ml-1">6 cols</span>
                    <span className="ml-auto text-[8px] font-bold text-warning bg-warning/10 border border-warning/30 rounded px-1 py-0.5">PK</span>
                    <span className="text-[8px] font-bold text-accent bg-accent/10 border border-accent/30 rounded px-1 py-0.5">2FK</span>
                  </div>
                  <div className="text-[10px]">
                    <div className="grid grid-cols-[1fr_100px_40px_40px] gap-0 px-3 py-1.5 text-text-muted border-b border-border-default uppercase tracking-wider text-[9px]">
                      <span>Name</span><span>Type</span><span className="text-center">Null</span><span className="text-center">PK</span>
                    </div>
                    {[
                      { name: 'id', type: 'uuid', nullable: false, pk: true },
                      { name: 'email', type: 'varchar', nullable: false, pk: false },
                      { name: 'username', type: 'varchar', nullable: false, pk: false },
                      { name: 'avatar_url', type: 'text', nullable: true, pk: false },
                      { name: 'created_at', type: 'timestamp', nullable: false, pk: false },
                      { name: 'role_id', type: 'uuid', nullable: true, pk: false },
                    ].map((col) => (
                      <div key={col.name} className="grid grid-cols-[1fr_100px_40px_40px] gap-0 px-3 py-1.5 border-b border-border-default last:border-0 hover:bg-bg-hover transition-colors">
                        <span className="font-mono text-text-primary">{col.name}</span>
                        <span className="text-accent/80">{col.type}</span>
                        <span className="text-center text-text-muted">{col.nullable ? '○' : '—'}</span>
                        <span className="text-center">{col.pk ? <span className="text-warning">★</span> : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Glow */}
          <div className="absolute -inset-8 -z-10 bg-accent/5 blur-3xl rounded-full pointer-events-none" />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border-default">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] text-accent uppercase tracking-widest mb-3 font-medium">Everything you need</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">One tool, entire planning stack</h2>
            <p className="text-text-secondary text-sm max-w-md mx-auto">
              From blank canvas to deployable schema — surplan covers every phase of backend planning.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-bg-secondary border border-border-default rounded-xl p-5 hover:border-border-active transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 transition-all"
                  style={{ backgroundColor: `${f.color}18`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-4">{f.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {f.tags.map((t) => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-default text-text-muted font-mono">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-border-default bg-bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] text-accent uppercase tracking-widest mb-3 font-medium">Workflow</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">From idea to shipped schema</h2>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-8 bottom-8 w-px bg-border-default hidden md:block" />
            <div className="space-y-8">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-bg-secondary border border-border-default flex items-center justify-center relative z-10">
                    <span className="text-[10px] font-bold text-accent font-mono">{s.n}</span>
                  </div>
                  <div className="pt-3">
                    <h3 className="text-sm font-semibold mb-1.5">{s.title}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed max-w-lg">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Exports marquee */}
      <section className="py-16 px-6 border-t border-border-default overflow-hidden">
        <div className="max-w-6xl mx-auto mb-8 text-center">
          <p className="text-[10px] text-accent uppercase tracking-widest mb-3 font-medium">Export formats</p>
          <h2 className="text-xl font-bold">Export to anything</h2>
        </div>
        <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto">
          {EXPORTS.map((e) => (
            <span
              key={e.label}
              className="text-[10px] font-mono px-3 py-1.5 rounded-full border border-border-default text-text-secondary bg-bg-secondary hover:border-border-active transition-colors"
              style={{ borderColor: `${e.color}40`, color: e.color }}
            >
              {e.label}
            </span>
          ))}
        </div>
      </section>

      {/* Privacy callout */}
      <section className="py-20 px-6 border-t border-border-default">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border-default bg-bg-secondary p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center mx-auto mb-6">
                <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-3">Your plans never leave your machine</h2>
              <p className="text-sm text-text-secondary max-w-lg mx-auto mb-8 leading-relaxed">
                surplan is 100% local. There's no server, no database, no account, no analytics.
                Every entity, feature, and endpoint you create is stored exclusively in your browser's localStorage.
                Close the tab — it's still there. Clear storage — it's gone. Your data, your control.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-xs text-text-muted">
                {['No signup', 'No cookies', 'No tracking', 'No cloud sync', 'Works offline', 'Open source'].map((t) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 border-t border-border-default bg-bg-secondary/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] text-accent uppercase tracking-widest mb-3 font-medium">Loved by devs</p>
            <h2 className="text-2xl font-bold">What developers say</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-bg-secondary border border-border-default rounded-xl p-5">
                <p className="text-xs text-text-secondary leading-relaxed mb-4">"{t.quote}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[9px] font-bold text-accent">
                    {t.name}
                  </div>
                  <span className="text-[10px] text-text-muted">{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border-default">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to plan your next project?</h2>
          <p className="text-text-secondary text-sm mb-8">No setup, no signup, no credit card. Just open the app and start.</p>
          <Link
            to="/app"
            className="inline-block px-8 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium text-sm transition-colors"
          >
            Open surplan →
          </Link>
          <div className="mt-6 flex items-center justify-center gap-6 text-[10px] text-text-muted">
            <Link to="/docs" className="hover:text-text-secondary transition-colors">Documentation</Link>
            <Link to="/guide" className="hover:text-text-secondary transition-colors">Usage Guide</Link>
            <Link to="/pricing" className="hover:text-text-secondary transition-colors">Pricing</Link>
            <Link to="/changelog" className="hover:text-text-secondary transition-colors">Changelog</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-default py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            surplan
          </div>
          <div className="flex items-center gap-6 text-[11px] text-text-muted">
            <Link to="/features" className="hover:text-text-secondary transition-colors">Features</Link>
            <Link to="/docs" className="hover:text-text-secondary transition-colors">Docs</Link>
            <Link to="/pricing" className="hover:text-text-secondary transition-colors">Pricing</Link>
            <Link to="/guide" className="hover:text-text-secondary transition-colors">Guide</Link>
            <Link to="/changelog" className="hover:text-text-secondary transition-colors">Changelog</Link>
          </div>
          <p className="text-[11px] text-text-muted">Local-only · No backend · Open source</p>
        </div>
      </footer>
    </div>
  );
}
