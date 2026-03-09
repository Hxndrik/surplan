import { useState } from 'react';
import { useEntityStore } from '../../store/useEntityStore';
import { useFrontendStore } from '../../store/useFrontendStore';
import { exportEntities, exportFrontend } from '../../lib/exporters';
import { useToast } from '../../hooks/useToast';
import type { ExportFormat, FrontendExportFormat } from '../../types';

type AnyFormat = ExportFormat | FrontendExportFormat;

const FORMATS: { id: AnyFormat; label: string; ext: string; icon: string; description: string; color: string; category?: string }[] = [
  { id: 'sql-postgres', label: 'PostgreSQL', ext: 'sql', icon: '🐘', description: 'CREATE TABLE with constraints', color: 'text-blue-400' },
  { id: 'sql-mysql', label: 'MySQL', ext: 'sql', icon: '🐬', description: 'MySQL compatible DDL', color: 'text-orange-400' },
  { id: 'sql-sqlite', label: 'SQLite', ext: 'sql', icon: '🪨', description: 'Lightweight SQLite schema', color: 'text-yellow-400' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts', icon: '🔷', description: 'Interface definitions', color: 'text-blue-300' },
  { id: 'zod', label: 'Zod', ext: 'ts', icon: '🛡', description: 'Zod validation schemas', color: 'text-emerald-400' },
  { id: 'prisma', label: 'Prisma', ext: 'prisma', icon: '🔺', description: 'Prisma ORM schema', color: 'text-purple-400' },
  { id: 'drizzle', label: 'Drizzle ORM', ext: 'ts', icon: '💧', description: 'Drizzle pgTable schema', color: 'text-cyan-400' },
  { id: 'typeorm', label: 'TypeORM', ext: 'ts', icon: '🏛', description: 'TypeORM entity classes', color: 'text-rose-400' },
  { id: 'mermaid', label: 'Mermaid ERD', ext: 'md', icon: '📊', description: 'Mermaid.js ER diagram', color: 'text-green-400' },
  { id: 'dbml', label: 'DBML', ext: 'dbml', icon: '🗂', description: 'dbdiagram.io compatible', color: 'text-pink-400' },
  { id: 'json', label: 'JSON', ext: 'json', icon: '{ }', description: 'Raw JSON data model', color: 'text-text-secondary' },
  { id: 'graphql', label: 'GraphQL', ext: 'graphql', icon: '◈', description: 'GraphQL schema SDL', color: 'text-pink-300' },
  { id: 'sequelize', label: 'Sequelize', ext: 'ts', icon: '⚡', description: 'Sequelize v6 model classes', color: 'text-blue-400' },
  { id: 'mongoose', label: 'Mongoose', ext: 'ts', icon: '🍃', description: 'Mongoose Schema + model', color: 'text-green-500' },
  { id: 'sqlalchemy', label: 'SQLAlchemy', ext: 'py', icon: '🐍', description: 'SQLAlchemy 2.x mapped models', color: 'text-yellow-500' },
  { id: 'jsonschema', label: 'JSON Schema', ext: 'json', icon: '{}', description: 'JSON Schema draft-07 definitions', color: 'text-cyan-400' },
  { id: 'knex', label: 'Knex.js', ext: 'js', icon: '🔧', description: 'Knex migration (up/down)', color: 'text-orange-300' },
  { id: 'mikro-orm', label: 'MikroORM', ext: 'ts', icon: '🧬', description: 'MikroORM entity decorators', color: 'text-violet-400' },
  // Frontend exports
  { id: 'react', label: 'React', ext: 'tsx', icon: '⚛', description: 'React component stubs', color: 'text-cyan-300', category: 'frontend' },
  { id: 'nextjs', label: 'Next.js', ext: 'tsx', icon: '▲', description: 'Next.js App Router pages', color: 'text-text-primary', category: 'frontend' },
  { id: 'css-tokens', label: 'CSS Tokens', ext: 'css', icon: '🎨', description: 'CSS custom properties', color: 'text-blue-300', category: 'frontend' },
  { id: 'tailwind-config', label: 'Tailwind', ext: 'ts', icon: '🌊', description: 'Tailwind config tokens', color: 'text-cyan-400', category: 'frontend' },
  { id: 'component-docs', label: 'Component Docs', ext: 'md', icon: '📖', description: 'Markdown component docs', color: 'text-green-300', category: 'frontend' },
  { id: 'mermaid-sitemap', label: 'Sitemap', ext: 'md', icon: '🗺', description: 'Mermaid sitemap diagram', color: 'text-purple-300', category: 'frontend' },
];

const FRONTEND_FORMATS: FrontendExportFormat[] = ['react', 'nextjs', 'css-tokens', 'tailwind-config', 'component-docs', 'mermaid-sitemap'];

interface ExportPanelProps {
  initialFormat?: ExportFormat | null;
  onClose: () => void;
}

export function ExportPanel({ initialFormat, onClose }: ExportPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<AnyFormat>(initialFormat ?? 'sql-postgres');
  const [copied, setCopied] = useState(false);
  const entities = useEntityStore((s) => s.entities);
  const { pages, components: feComponents, designTokens } = useFrontendStore();
  const toast = useToast();

  const isFrontendFormat = FRONTEND_FORMATS.includes(selectedFormat as FrontendExportFormat);
  const output = isFrontendFormat
    ? exportFrontend(selectedFormat as FrontendExportFormat, pages, feComponents, designTokens, entities)
    : exportEntities(entities, selectedFormat as ExportFormat);
  const fmt = FORMATS.find((f) => f.id === selectedFormat)!;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(`${fmt.label} copied to clipboard`);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema.${fmt.ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded schema.${fmt.ext}`);
  };

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-bg-secondary border border-border-default rounded-xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Export Schema</h2>
            <p className="text-xs text-text-muted mt-0.5">{entities.length} entities</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Format selector */}
          <div className="w-44 flex-shrink-0 border-r border-border-default py-2 overflow-y-auto">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFormat(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer transition-colors ${
                  selectedFormat === f.id
                    ? 'bg-accent-muted'
                    : 'hover:bg-bg-hover'
                }`}
              >
                <span className="text-base w-5">{f.icon}</span>
                <div>
                  <p className={`text-xs font-medium ${selectedFormat === f.id ? 'text-accent' : 'text-text-secondary'}`}>
                    {f.label}
                  </p>
                  <p className="text-[10px] text-text-muted">.{f.ext}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Code output */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-bg-primary/50">
              <span className="text-[10px] text-text-muted flex items-center gap-1.5">
                {fmt.icon} {fmt.label} · {fmt.description}
                {output && <><span className="text-border-active">·</span><span>{output.split('\n').length} lines</span></>}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className={`text-xs px-3 py-1 rounded border cursor-pointer transition-colors ${
                    copied
                      ? 'border-success text-success'
                      : 'border-border-default text-text-secondary hover:border-border-active hover:text-text-primary'
                  }`}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className="text-xs px-3 py-1 rounded bg-accent hover:bg-accent-hover text-white cursor-pointer transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-[11px] text-text-secondary leading-relaxed">
              <code>{output || '// No entities to export'}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
