import { useState, useEffect, useRef, useMemo } from 'react';
import { useEntityStore } from '../store/useEntityStore';
import { useProjectStore } from '../store/useProjectStore';
import { useUIStore } from '../store/useUIStore';
import { useToast } from '../hooks/useToast';
import { ENTITY_TEMPLATES } from '../lib/templates';
import { backupProject, exportProjectMarkdown, exportOpenApi, exportFeaturesCSV, exportHtmlDocs, exportGithubIssues, exportChangelog, generateMultiAgentPrompt } from '../lib/backup';
import { generateShareUrl } from '../lib/sharing';
import type { ActiveTab } from '../types';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: string;
  category: string;
  keywords?: string[];
  action: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const addEntity = useEntityStore((s) => s.addEntity);
  const addEntityFromTemplate = useEntityStore((s) => s.addEntityFromTemplate);
  const entities = useEntityStore((s) => s.entities);
  const setAllCollapsed = useEntityStore((s) => s.setAllCollapsed);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const addFeature = useProjectStore((s) => s.addFeature);
  const addEndpoint = useProjectStore((s) => s.addEndpoint);
  const updateEndpoint = useProjectStore((s) => s.updateEndpoint);
  const features = useProjectStore((s) => s.features);
  const toast = useToast();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commands = useMemo<Command[]>(() => [
    // Navigation
    {
      id: 'nav-overview', label: 'Go to Overview', icon: '🏠',
      category: 'Navigate', keywords: ['overview', 'project'],
      action: () => { setActiveTab('overview'); onClose(); },
    },
    {
      id: 'nav-entities', label: 'Go to Entities', icon: '🗂️',
      category: 'Navigate', keywords: ['entities', 'schema', 'database', 'tables'],
      action: () => { setActiveTab('entities'); onClose(); },
    },
    {
      id: 'nav-features', label: 'Go to Features', icon: '📋',
      category: 'Navigate', keywords: ['features', 'tasks', 'backlog'],
      action: () => { setActiveTab('features'); onClose(); },
    },
    {
      id: 'nav-api', label: 'Go to API Endpoints', icon: '🔌',
      category: 'Navigate', keywords: ['api', 'endpoints', 'rest'],
      action: () => { setActiveTab('api' as ActiveTab); onClose(); },
    },
    // Entity actions
    {
      id: 'new-entity', label: 'New Entity', description: 'Create a blank entity',
      icon: '➕', category: 'Entity',
      action: () => {
        setActiveTab('entities');
        addEntity('new_entity');
        toast.success('Entity created');
        onClose();
      },
    },
    {
      id: 'import-sql', label: 'Import from SQL', description: 'Paste CREATE TABLE statements to import entities',
      icon: '📥', category: 'Entity',
      keywords: ['import', 'sql', 'create table', 'schema', 'postgres', 'mysql'],
      action: () => {
        setActiveTab('entities');
        window.dispatchEvent(new Event('surplan:open-sql-import'));
        onClose();
      },
    },
    {
      id: 'import-json', label: 'Import from JSON / CSV', description: 'Paste JSON or CSV data to create an entity',
      icon: '{}', category: 'Entity',
      keywords: ['import', 'json', 'csv', 'object', 'array', 'api', 'response', 'spreadsheet'],
      action: () => {
        setActiveTab('entities');
        window.dispatchEvent(new Event('surplan:open-json-import'));
        onClose();
      },
    },
    // Templates
    ...ENTITY_TEMPLATES.map((t) => ({
      id: `template-${t.id}`,
      label: `Add ${t.label} template`,
      description: t.description,
      icon: t.icon,
      category: 'Templates',
      keywords: ['template', t.id, t.label.toLowerCase()],
      action: () => {
        setActiveTab('entities');
        addEntityFromTemplate(t.build());
        toast.success(`${t.label} entity added`);
        onClose();
      },
    })),
    // Feature action
    {
      id: 'new-feature', label: 'New Feature', description: 'Add a feature to the backlog',
      icon: '✨', category: 'Features',
      action: () => {
        setActiveTab('features');
        addFeature('New feature');
        toast.success('Feature added');
        onClose();
      },
    },
    // Export actions
    {
      id: 'export-sql', label: 'Export SQL (PostgreSQL)', icon: '💾',
      category: 'Export', keywords: ['export', 'sql', 'postgres', 'ddl'],
      action: () => {
        setActiveTab('entities');
        onClose();
        // dispatch event for export panel to open
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'sql-postgres' }));
      },
    },
    {
      id: 'export-sql-mysql', label: 'Export SQL (MySQL)', icon: '🐬',
      category: 'Export', keywords: ['export', 'sql', 'mysql', 'ddl'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'sql-mysql' }));
      },
    },
    {
      id: 'export-sql-sqlite', label: 'Export SQL (SQLite)', icon: '🪨',
      category: 'Export', keywords: ['export', 'sql', 'sqlite', 'ddl'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'sql-sqlite' }));
      },
    },
    {
      id: 'export-zod', label: 'Export Zod Schemas', icon: '🛡',
      category: 'Export', keywords: ['export', 'zod', 'validation', 'schema', 'typescript'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'zod' }));
      },
    },
    {
      id: 'export-ts', label: 'Export TypeScript', icon: '🔷',
      category: 'Export', keywords: ['export', 'typescript', 'types', 'interfaces'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'typescript' }));
      },
    },
    {
      id: 'export-prisma', label: 'Export Prisma Schema', icon: '🔺',
      category: 'Export', keywords: ['export', 'prisma', 'orm'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'prisma' }));
      },
    },
    {
      id: 'export-typeorm', label: 'Export TypeORM Entities', icon: '🏛',
      category: 'Export', keywords: ['export', 'typeorm', 'orm', 'entity', 'nestjs'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'typeorm' }));
      },
    },
    {
      id: 'export-drizzle', label: 'Export Drizzle ORM', icon: '💧',
      category: 'Export', keywords: ['export', 'drizzle', 'orm', 'typescript'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'drizzle' }));
      },
    },
    {
      id: 'export-mermaid', label: 'Export Mermaid ERD', icon: '📊',
      category: 'Export', keywords: ['export', 'mermaid', 'erd', 'diagram'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'mermaid' }));
      },
    },
    {
      id: 'export-dbml', label: 'Export DBML', icon: '🗂',
      category: 'Export', keywords: ['export', 'dbml', 'dbdiagram', 'diagram'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'dbml' }));
      },
    },
    {
      id: 'export-graphql', label: 'Export GraphQL Schema', icon: '◈',
      category: 'Export', keywords: ['export', 'graphql', 'gql', 'schema', 'sdl'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'graphql' }));
      },
    },
    {
      id: 'export-sequelize', label: 'Export Sequelize Models', icon: '⚡',
      category: 'Export', keywords: ['export', 'sequelize', 'orm', 'node', 'typescript'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'sequelize' }));
      },
    },
    {
      id: 'export-mongoose', label: 'Export Mongoose Schemas', icon: '🍃',
      category: 'Export', keywords: ['export', 'mongoose', 'mongodb', 'schema', 'nosql'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'mongoose' }));
      },
    },
    {
      id: 'export-sqlalchemy', label: 'Export SQLAlchemy Models', icon: '🐍',
      category: 'Export', keywords: ['export', 'sqlalchemy', 'python', 'orm', 'alembic'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'sqlalchemy' }));
      },
    },
    {
      id: 'export-json', label: 'Export JSON (raw)', icon: '{ }',
      category: 'Export', keywords: ['export', 'json', 'raw', 'data'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'json' }));
      },
    },
    {
      id: 'export-jsonschema', label: 'Export JSON Schema', icon: '{}',
      category: 'Export', keywords: ['export', 'json', 'schema', 'jsonschema', 'draft', 'validation'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'jsonschema' }));
      },
    },
    {
      id: 'export-knex', label: 'Export Knex.js Migration', icon: '🔧',
      category: 'Export', keywords: ['export', 'knex', 'migration', 'query', 'builder', 'js'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'knex' }));
      },
    },
    {
      id: 'export-mikroorm', label: 'Export MikroORM Entities', icon: '🧬',
      category: 'Export', keywords: ['export', 'mikro', 'orm', 'entity', 'decorator', 'ts'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new CustomEvent('surplan:export', { detail: 'mikro-orm' }));
      },
    },
    {
      id: 'copy-status-summary', label: 'Copy Status Summary',
      description: 'Copy a markdown status update (progress, in-progress, blocked, upcoming)',
      icon: '📋', category: 'Export',
      keywords: ['status', 'summary', 'standup', 'progress', 'report', 'copy', 'markdown'],
      action: () => {
        setActiveTab('overview');
        onClose();
        window.dispatchEvent(new Event('surplan:copy-status-summary'));
      },
    },
    {
      id: 'find-replace', label: 'Find & Replace', description: 'Rename columns/entities across all tables',
      icon: '🔤', category: 'Entity',
      keywords: ['find', 'replace', 'rename', 'refactor', 'search', 'bulk'],
      action: () => {
        setActiveTab('entities');
        onClose();
        window.dispatchEvent(new Event('surplan:find-replace'));
      },
    },
    // Entity actions
    {
      id: 'collapse-all', label: 'Collapse All Entities',
      icon: '🔼', category: 'Entity',
      keywords: ['collapse', 'fold', 'hide'],
      action: () => { setAllCollapsed(true); setActiveTab('entities'); onClose(); },
    },
    {
      id: 'expand-all', label: 'Expand All Entities',
      icon: '🔽', category: 'Entity',
      keywords: ['expand', 'unfold', 'show'],
      action: () => { setAllCollapsed(false); setActiveTab('entities'); onClose(); },
    },
    // New API endpoint
    {
      id: 'new-endpoint', label: 'New API Endpoint',
      icon: '🔌', category: 'API',
      keywords: ['endpoint', 'api', 'route', 'rest'],
      action: () => { setActiveTab('api'); addEndpoint(); toast.success('Endpoint added'); onClose(); },
    },
    {
      id: 'generate-crud-all', label: 'Generate CRUD Endpoints for All Entities',
      icon: '⚡', category: 'API',
      description: `Generate 5 REST endpoints per entity (${entities.length} entities)`,
      keywords: ['crud', 'generate', 'rest', 'endpoints', 'api', 'scaffold'],
      action: () => {
        let count = 0;
        entities.forEach((entity) => {
          const base = entity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const tag = entity.name;
          const crud: { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string; description: string; statusCodes: string }[] = [
            { method: 'GET',    path: `/api/${base}`,      description: `List all ${entity.name}`,    statusCodes: '200, 400' },
            { method: 'POST',   path: `/api/${base}`,      description: `Create a ${entity.name}`,    statusCodes: '201, 400, 422' },
            { method: 'GET',    path: `/api/${base}/:id`,  description: `Get ${entity.name} by ID`,   statusCodes: '200, 404' },
            { method: 'PUT',    path: `/api/${base}/:id`,  description: `Update a ${entity.name}`,    statusCodes: '200, 400, 404, 422' },
            { method: 'DELETE', path: `/api/${base}/:id`,  description: `Delete a ${entity.name}`,    statusCodes: '204, 404' },
          ];
          crud.forEach(({ method, path, description, statusCodes }) => {
            const id = addEndpoint(tag);
            updateEndpoint(id, { method, path, description, statusCodes, entityRef: entity.id, auth: 'bearer' });
            count++;
          });
        });
        setActiveTab('api');
        toast.success(`Generated ${count} endpoints for ${entities.length} entities`);
        onClose();
      },
    },
    {
      id: 'export-openapi', label: 'Export OpenAPI YAML',
      icon: '📄', category: 'Export',
      keywords: ['export', 'openapi', 'swagger', 'yaml', 'api spec'],
      action: () => { exportOpenApi(); toast.success('OpenAPI YAML downloaded'); onClose(); },
    },
    {
      id: 'export-md', label: 'Export Markdown', description: 'Full project as .md',
      icon: '📝', category: 'Export',
      keywords: ['export', 'markdown', 'md', 'docs'],
      action: () => { exportProjectMarkdown(); toast.success('Markdown exported'); onClose(); },
    },
    {
      id: 'export-html', label: 'Export HTML Docs', description: 'Self-contained HTML documentation',
      icon: '🌐', category: 'Export',
      keywords: ['export', 'html', 'docs', 'documentation', 'share', 'web'],
      action: () => { exportHtmlDocs(); toast.success('HTML docs exported'); onClose(); },
    },
    {
      id: 'export-features-csv', label: 'Export Features CSV', description: 'Features as spreadsheet-ready CSV',
      icon: '📊', category: 'Export',
      keywords: ['export', 'csv', 'features', 'spreadsheet', 'excel'],
      action: () => { exportFeaturesCSV(); toast.success('Features CSV downloaded'); onClose(); },
    },
    {
      id: 'import-features-csv', label: 'Import Features CSV', description: 'Add features from a CSV file',
      icon: '📥', category: 'Export',
      keywords: ['import', 'csv', 'features', 'spreadsheet', 'excel', 'upload'],
      action: () => { window.dispatchEvent(new CustomEvent('surplan:import-features-csv')); onClose(); },
    },
    {
      id: 'export-github-issues', label: 'Export GitHub Issues', description: 'Features as GitHub-ready markdown',
      icon: '🐙', category: 'Export',
      keywords: ['export', 'github', 'issues', 'markdown', 'tickets'],
      action: () => { exportGithubIssues(); toast.success('GitHub Issues markdown downloaded'); onClose(); },
    },
    {
      id: 'export-changelog', label: 'Export Changelog', description: 'Done features grouped by milestone as CHANGELOG.md',
      icon: '📜', category: 'Export',
      keywords: ['export', 'changelog', 'release', 'notes', 'history', 'done', 'milestone'],
      action: () => { exportChangelog(); toast.success('Changelog downloaded'); onClose(); },
    },
    {
      id: 'copy-claude-prompt', label: 'Copy Claude Code Build Prompt', description: 'Multi-agent prompt ready to paste into Claude Code',
      icon: '✦', category: 'Export',
      keywords: ['claude', 'prompt', 'ai', 'build', 'agent', 'subagent', 'copy', 'multiagent'],
      action: () => {
        const md = generateMultiAgentPrompt();
        navigator.clipboard.writeText(md).then(() => {
          toast.success('Claude Code prompt copied!');
          onClose();
        }).catch(() => toast.error('Failed to copy to clipboard'));
      },
    },
    {
      id: 'backup', label: 'Download Backup',
      icon: '💾', category: 'Export',
      keywords: ['backup', 'save', 'json', 'download'],
      action: () => { backupProject(); toast.success('Backup downloaded'); onClose(); },
    },
    {
      id: 'restore', label: 'Restore from Backup',
      icon: '📂', category: 'Export',
      keywords: ['restore', 'import', 'json', 'load'],
      action: () => { window.dispatchEvent(new CustomEvent('surplan:restore')); onClose(); },
    },
    {
      id: 'share-url', label: 'Share Project via URL',
      description: 'Copy a shareable link with compressed project data',
      icon: '🔗', category: 'Export',
      keywords: ['share', 'url', 'link', 'copy', 'cloud', 'sync'],
      action: async () => {
        try {
          const url = generateShareUrl();
          await navigator.clipboard.writeText(url);
          toast.success('Share link copied!');
        } catch {
          toast.error('Project too large for URL sharing. Use Backup instead.');
        }
        onClose();
      },
    },
    {
      id: 'load-starter', label: 'Load Project Starter',
      icon: '🚀', category: 'Export',
      keywords: ['starter', 'template', 'saas', 'blog', 'ecommerce', 'bootstrap', 'scaffold'],
      action: () => { window.dispatchEvent(new CustomEvent('surplan:open-starter')); onClose(); },
    },
    // Entity jumps
    ...entities.map((e) => ({
      id: `entity-${e.id}`,
      label: e.name || 'Unnamed entity',
      description: `Jump to entity · ${e.columns.length} cols${e.description ? ` · ${e.description}` : ''}`,
      icon: '📄',
      category: 'Entities',
      keywords: [e.name.toLowerCase(), 'entity', 'table', ...e.tags],
      action: () => {
        setActiveTab('entities');
        onClose();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('surplan:focus-entity', { detail: { entityId: e.id } }));
        }, 50);
      },
    })),
    // Feature filter shortcuts
    {
      id: 'show-blocked-features', label: 'Show Blocked Features',
      description: 'Filter features waiting on a dependency',
      icon: '⛔', category: 'Features',
      keywords: ['blocked', 'filter', 'dependency', 'waiting', 'stuck'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'is:blocked' }));
        onClose();
      },
    },
    {
      id: 'show-blocking-features', label: 'Show Features Blocking Others',
      description: 'Find features that are a dependency for other features',
      icon: '🔒', category: 'Features',
      keywords: ['blocking', 'filter', 'dependency', 'blocker'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'is:blocking' }));
        onClose();
      },
    },
    {
      id: 'show-overdue-features', label: 'Show Overdue Features',
      description: 'Features past their due date',
      icon: '⚠️', category: 'Features',
      keywords: ['overdue', 'filter', 'due', 'late', 'past'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'is:overdue' }));
        onClose();
      },
    },
    {
      id: 'show-active-features', label: 'Show In-Progress Features',
      description: 'Features currently being worked on',
      icon: '🔆', category: 'Features',
      keywords: ['active', 'in-progress', 'working', 'filter'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'is:active' }));
        onClose();
      },
    },
    {
      id: 'show-features-with-url', label: 'Show Features with External Links',
      description: 'Features that have a Jira, GitHub, or Linear URL',
      icon: '🔗', category: 'Features',
      keywords: ['url', 'link', 'jira', 'github', 'linear', 'filter'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'has:url' }));
        onClose();
      },
    },
    {
      id: 'group-features-milestone', label: 'Group Features by Milestone',
      description: 'Organize features into milestone groups',
      icon: '🏁', category: 'Features',
      keywords: ['group', 'milestone', 'organize', 'view'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:group-features', { detail: 'milestone' }));
        onClose();
      },
    },
    {
      id: 'group-features-priority', label: 'Group Features by Priority',
      description: 'Organize features into critical / high / medium / low groups',
      icon: '🎯', category: 'Features',
      keywords: ['group', 'priority', 'organize', 'view'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:group-features', { detail: 'priority' }));
        onClose();
      },
    },
    {
      id: 'group-features-status', label: 'Group Features by Status',
      description: 'Organize features into To Do / In Progress / Done columns',
      icon: '📊', category: 'Features',
      keywords: ['group', 'status', 'todo', 'done', 'kanban', 'organize', 'view'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:group-features', { detail: 'status' }));
        onClose();
      },
    },
    {
      id: 'sort-features-value', label: 'Sort Features by Value',
      description: 'Order features by business value score (highest first)',
      icon: '💎', category: 'Features',
      keywords: ['sort', 'value', 'priority', 'business', 'score'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:sort-features', { detail: 'value' }));
        onClose();
      },
    },
    {
      id: 'sort-features-efficiency', label: 'Sort Features by Efficiency',
      description: 'Order features by value ÷ effort ratio (best ROI first)',
      icon: '⚡', category: 'Features',
      keywords: ['sort', 'efficiency', 'roi', 'ratio', 'value', 'effort', 'bang', 'buck'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:sort-features', { detail: 'efficiency' }));
        onClose();
      },
    },
    {
      id: 'sort-features-due', label: 'Sort Features by Due Date',
      description: 'Order features by due date (soonest first)',
      icon: '📅', category: 'Features',
      keywords: ['sort', 'due', 'date', 'deadline', 'upcoming'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:sort-features', { detail: 'due' }));
        onClose();
      },
    },
    {
      id: 'sort-features-estimate', label: 'Sort Features by Estimate',
      description: 'Order features by story point size (smallest first)',
      icon: '📏', category: 'Features',
      keywords: ['sort', 'estimate', 'points', 'size', 'effort', 'sprint'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:sort-features', { detail: 'estimate' }));
        onClose();
      },
    },
    {
      id: 'sort-features-cycle', label: 'Sort Features by Cycle Time',
      description: 'Order features by days from start to completion (fastest first)',
      icon: '⏱', category: 'Features',
      keywords: ['sort', 'cycle', 'time', 'duration', 'speed', 'days'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:sort-features', { detail: 'cycle' }));
        onClose();
      },
    },
    {
      id: 'sort-features-start', label: 'Sort Features by Start Date',
      description: 'Order features by planned start date (soonest first)',
      icon: '▶', category: 'Features',
      keywords: ['sort', 'start', 'date', 'begin', 'schedule', 'sprint'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:sort-features', { detail: 'start' }));
        onClose();
      },
    },
    {
      id: 'show-unestimated-features', label: 'Show Unestimated Features',
      description: 'Filter to features missing story point estimates',
      icon: '❓', category: 'Features',
      keywords: ['unestimated', 'no estimate', 'missing', 'points', 'filter'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'is:unestimated' }));
        onClose();
      },
    },
    {
      id: 'show-quick-wins', label: 'Show Quick Wins',
      description: 'Filter to low-effort (≤5pt), high-value (>5) features',
      icon: '🚀', category: 'Features',
      keywords: ['quick wins', 'low effort', 'high value', 'roi', 'filter', 'prioritize', 'bang', 'buck'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'is:quickwin' }));
        onClose();
      },
    },
    {
      id: 'toggle-timeline', label: 'Toggle Timeline View',
      description: 'Switch between list and calendar timeline for features',
      icon: '📅', category: 'Features',
      keywords: ['timeline', 'calendar', 'view', 'dates', 'schedule', 'gantt'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new Event('surplan:toggle-timeline'));
        onClose();
      },
    },
    {
      id: 'toggle-board', label: 'Toggle Board View',
      description: 'Switch to kanban-style board (Todo / In Progress / Done columns)',
      icon: '🗂', category: 'Features',
      keywords: ['board', 'kanban', 'columns', 'card', 'view'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new Event('surplan:toggle-board'));
        onClose();
      },
    },
    {
      id: 'toggle-retro', label: 'Toggle Retrospective View',
      description: 'Sprint retrospective: completed features grouped by sprint with velocity metrics',
      icon: '📋', category: 'Features',
      keywords: ['retro', 'retrospective', 'sprint', 'review', 'velocity', 'done', 'history'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new Event('surplan:toggle-retro'));
        onClose();
      },
    },
    {
      id: 'show-overdue', label: 'Show Overdue Features',
      description: 'Filter to features past their due date',
      icon: '⚠', category: 'Features',
      keywords: ['overdue', 'late', 'deadline', 'due', 'filter'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'is:overdue' }));
        onClose();
      },
    },
    {
      id: 'show-blocked', label: 'Show Blocked Features',
      description: 'Filter to features with active blockers',
      icon: '⛔', category: 'Features',
      keywords: ['blocked', 'blocker', 'dependency', 'filter'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'is:blocked' }));
        onClose();
      },
    },
    {
      id: 'show-in-progress', label: 'Show In Progress Features',
      description: 'Filter to features currently being worked on',
      icon: '▶', category: 'Features',
      keywords: ['active', 'in progress', 'working', 'current', 'filter'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'is:active' }));
        onClose();
      },
    },
    {
      id: 'group-by-status', label: 'Group Features by Status',
      description: 'Group features into Todo / In Progress / Done',
      icon: '🗂', category: 'Features',
      keywords: ['group', 'status', 'todo', 'done', 'columns'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:group-features', { detail: 'status' }));
        onClose();
      },
    },
    {
      id: 'group-by-priority', label: 'Group Features by Priority',
      description: 'Group features by critical / high / medium / low',
      icon: '🎯', category: 'Features',
      keywords: ['group', 'priority', 'critical', 'high'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:group-features', { detail: 'priority' }));
        onClose();
      },
    },
    {
      id: 'group-by-milestone', label: 'Group Features by Milestone',
      description: 'Group features by milestone (default)',
      icon: '🏁', category: 'Features',
      keywords: ['group', 'milestone', 'sprint', 'default'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:group-features', { detail: 'milestone' }));
        onClose();
      },
    },
    {
      id: 'group-by-entity', label: 'Group Features by Entity',
      description: 'Group features by the database entity they reference',
      icon: '🗄', category: 'Features',
      keywords: ['group', 'entity', 'table', 'database', 'model'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:group-features', { detail: 'entity' }));
        onClose();
      },
    },
    {
      id: 'group-by-tag', label: 'Group Features by Tag',
      description: 'Organize features into groups by their tags',
      icon: '#', category: 'Features',
      keywords: ['group', 'tag', 'label', 'category', 'organize'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:group-features', { detail: 'tag' }));
        onClose();
      },
    },
    {
      id: 'group-by-assignee', label: 'Group Features by Assignee',
      description: 'Organize features into groups by who they are assigned to',
      icon: '👤', category: 'Features',
      keywords: ['group', 'assignee', 'person', 'owner', 'team', 'workload'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:group-features', { detail: 'assignee' }));
        onClose();
      },
    },
    {
      id: 'group-by-kind', label: 'Group Features by Kind',
      description: 'Organize features by type: feature, bug, improvement, chore',
      icon: '🏷', category: 'Features',
      keywords: ['group', 'kind', 'type', 'bug', 'improvement', 'chore', 'feature'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:group-features', { detail: 'kind' }));
        onClose();
      },
    },
    {
      id: 'group-by-sprint', label: 'Group Features by Sprint',
      description: 'Organize features by sprint/iteration',
      icon: '⚡', category: 'Features',
      keywords: ['group', 'sprint', 'iteration', 'week', 'cycle'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:group-features', { detail: 'sprint' }));
        onClose();
      },
    },
    {
      id: 'reset-feature-filters', label: 'Reset Feature Filters',
      description: 'Clear all feature filters, search query, and sort settings',
      icon: '↺', category: 'Features',
      keywords: ['reset', 'clear', 'filters', 'search', 'sort', 'default', 'all'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new Event('surplan:reset-filters'));
        onClose();
      },
    },
    {
      id: 'show-completed-today', label: 'Show Completed Today',
      description: 'Filter to features completed today',
      icon: '✅', category: 'Features',
      keywords: ['completed', 'today', 'done', 'finished', 'filter'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'completed:today' }));
        onClose();
      },
    },
    {
      id: 'show-unassigned', label: 'Show Unassigned Features',
      description: 'Filter to features with no assignee',
      icon: '👤', category: 'Features',
      keywords: ['unassigned', 'no assignee', 'assign', 'filter', 'owner'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'no:assignee' }));
        onClose();
      },
    },
    {
      id: 'show-with-notes', label: 'Show Features with Notes',
      description: 'Filter to features that have acceptance criteria or dev notes',
      icon: '📝', category: 'Features',
      keywords: ['notes', 'acceptance criteria', 'description', 'filter'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'has:notes' }));
        onClose();
      },
    },
    {
      id: 'show-completed-this-week', label: 'Show Completed This Week',
      description: 'Filter to features completed in the last 7 days',
      icon: '📆', category: 'Features',
      keywords: ['completed', 'week', 'done', 'finished', 'recent', 'velocity', 'filter'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'completed:this-week' }));
        onClose();
      },
    },
    {
      id: 'show-completed-this-month', label: 'Show Completed This Month',
      description: 'Filter to features completed in the current calendar month',
      icon: '🗓', category: 'Features',
      keywords: ['completed', 'month', 'done', 'finished', 'recent', 'velocity', 'filter'],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: 'completed:this-month' }));
        onClose();
      },
    },
    // Feature jumps
    ...features.slice(0, 20).map((f) => ({
      id: `feature-${f.id}`,
      label: f.title || 'Unnamed feature',
      description: f.done ? '✓ Done' : f.inProgress ? '● Active' : f.priority !== 'medium' ? f.priority : 'Todo',
      icon: f.done ? '✅' : f.inProgress ? '🔆' : '⬜',
      category: 'Features',
      keywords: [f.title.toLowerCase(), 'feature', 'task', ...(f.tags ?? [])],
      action: () => {
        setActiveTab('features');
        window.dispatchEvent(new CustomEvent('surplan:search-feature', { detail: f.title }));
        onClose();
      },
    })),
  ], [addEndpoint, addEntity, addEntityFromTemplate, addFeature, entities, features, setActiveTab, setAllCollapsed, toast, onClose]);

  // Column search results — shown when query is 2+ chars
  const columnResults = useMemo<Command[]>(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    const results: Command[] = [];
    for (const entity of entities) {
      for (const col of entity.columns) {
        if (!col.name) continue;
        if (col.name.toLowerCase().includes(q) || col.dataType.includes(q) || col.note?.toLowerCase().includes(q)) {
          results.push({
            id: `col-${entity.id}-${col.id}`,
            label: `${entity.name}.${col.name}`,
            description: `${col.dataType}${col.primaryKey ? ' · PK' : ''}${col.references ? ` · FK → ${col.references.entityName}` : ''}${col.note ? ` · ${col.note}` : ''}`,
            icon: col.primaryKey ? '🔑' : col.references ? '🔗' : '▪',
            category: 'Columns',
            action: () => {
              setActiveTab('entities');
              onClose();
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('surplan:focus-entity', { detail: { entityId: entity.id } }));
              }, 50);
            },
          });
        }
      }
    }
    return results.slice(0, 8);
  }, [query, entities, setActiveTab, onClose]);

  const filtered = useMemo(() => {
    if (!query) return commands.slice(0, 15);
    const q = query.toLowerCase();
    const cmdResults = commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.keywords?.some((k) => k.includes(q))
    ).slice(0, 10);
    return [...cmdResults, ...columnResults];
  }, [commands, columnResults, query]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      if (!map.has(cmd.category)) map.set(cmd.category, []);
      map.get(cmd.category)!.push(cmd);
    }
    return map;
  }, [filtered]);

  // Flat list for keyboard nav
  const flatList = useMemo(() => {
    const list: Command[] = [];
    grouped.forEach((cmds) => list.push(...cmds));
    return list;
  }, [grouped]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flatList[selectedIndex]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-bg-secondary border border-border-active rounded-xl shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 text-sm bg-transparent outline-none text-text-primary placeholder:text-text-placeholder"
          />
          <kbd className="text-[10px] text-text-muted border border-border-default rounded px-1.5 py-0.5">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {grouped.size === 0 && (
            <p className="text-xs text-text-muted text-center py-6">No commands found</p>
          )}
          {Array.from(grouped.entries()).map(([category, cmds]) => (
            <div key={category}>
              <p className="text-[10px] text-text-muted uppercase tracking-wider px-4 py-1.5">{category}</p>
              {cmds.map((cmd) => {
                const idx = flatIdx++;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={cmd.id}
                    data-idx={idx}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer transition-colors ${
                      isSelected ? 'bg-accent-muted' : 'hover:bg-bg-hover'
                    }`}
                  >
                    <span className="text-base w-5 text-center">{cmd.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {cmd.label}
                      </p>
                      {cmd.description && (
                        <p className="text-[10px] text-text-muted truncate">{cmd.description}</p>
                      )}
                    </div>
                    {isSelected && (
                      <kbd className="text-[10px] text-text-muted border border-border-default rounded px-1.5 py-0.5 flex-shrink-0">↵</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border-default flex items-center gap-4 text-[10px] text-text-muted">
          <span><kbd className="border border-border-default rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border border-border-default rounded px-1">↵</kbd> select</span>
          <span><kbd className="border border-border-default rounded px-1">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
