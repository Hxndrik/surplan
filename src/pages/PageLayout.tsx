import { Link, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { useUIStore } from '../store/useUIStore';

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Docs', href: '/docs' },
  { label: 'Guide', href: '/guide' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Pricing', href: '/pricing' },
];

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
}

export function PageLayout({ children, title, subtitle, badge }: PageLayoutProps) {
  const { pathname } = useLocation();
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
    document.title = `${title} — surplan`;
  }, [title]);

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
              <Link
                key={l.href}
                to={l.href}
                className={`text-sm transition-colors ${pathname === l.href ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-primary'}`}
              >
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

      {/* Page hero */}
      <div className="pt-28 pb-12 px-6 border-b border-border-default">
        <div className="max-w-4xl mx-auto">
          {badge && (
            <p className="text-xs text-accent uppercase tracking-widest mb-3 font-semibold font-mono">{badge}</p>
          )}
          <h1 className="text-3xl font-bold mb-3 tracking-tight">{title}</h1>
          {subtitle && <p className="text-text-secondary text-base max-w-xl leading-relaxed">{subtitle}</p>}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default py-8 px-6 mt-16">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="text-sm font-bold flex items-center gap-1.5">
            <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            surplan
          </Link>
          <div className="flex items-center gap-5 text-xs text-text-muted">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} to={l.href} className="hover:text-text-secondary transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
