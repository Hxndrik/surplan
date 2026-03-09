export type EntityId = string;
export type ColumnId = string;
export type FeatureId = string;
export type ScopeItemId = string;
export type ProjectId = string;

export const DATA_TYPES = [
  'uuid', 'string', 'varchar', 'text', 'char',
  'integer', 'bigint', 'smallint', 'float', 'decimal', 'numeric', 'number',
  'boolean',
  'date', 'datetime', 'timestamp', 'timestamptz', 'time',
  'json', 'jsonb', 'enum', 'blob', 'bytea', 'array',
] as const;

export type DataType = (typeof DATA_TYPES)[number];

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'nice-to-have';

export interface ForeignKeyRef {
  entityId: EntityId;
  entityName: string;
  columnName: string;
}

export interface Column {
  id: ColumnId;
  name: string;
  dataType: DataType;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  indexed: boolean;
  defaultValue: string;
  enumValues: string; // comma-separated, used when dataType === 'enum'
  check: string; // SQL CHECK constraint expression e.g. "age > 0"
  references: ForeignKeyRef | null;
  note: string;
  order: number;
}

export const ENTITY_COLORS = [
  '#6366f1', // indigo (default)
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#64748b', // slate
] as const;

export type EntityColor = (typeof ENTITY_COLORS)[number];

export interface Entity {
  id: EntityId;
  name: string;
  description: string;
  columns: Column[];
  collapsed: boolean;
  color: EntityColor;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export type Estimate = '' | '1' | '2' | '3' | '5' | '8' | '13' | '?';
export type FeatureKind = 'feature' | 'bug' | 'improvement' | 'chore';

export interface Feature {
  id: FeatureId;
  title: string;
  description: string;
  priority: Priority;
  estimate: Estimate;
  done: boolean;
  inProgress: boolean;
  entityRefs: EntityId[];
  tags: string[];
  milestone: string;
  notes: string; // acceptance criteria / dev notes
  blockedBy: FeatureId[]; // IDs of features that must be done first
  dueDate?: string; // ISO date string e.g. "2024-12-31"
  startDate?: string; // ISO date string for when work begins
  url?: string; // external link e.g. Jira ticket, GitHub issue, Linear task
  value?: Estimate; // business value score (same scale as estimate for effort/value matrix)
  completedAt?: string; // ISO date string when feature was marked done — used for velocity
  assignee?: string; // person assigned to this feature (free-text)
  kind?: FeatureKind; // feature type: feature (default), bug, improvement, chore
  pinned?: boolean; // pinned features float to top of each group
  sprint?: string; // sprint identifier e.g. "Sprint 1", "Week 3", "2024-W12"
  checklist?: ChecklistItem[]; // sub-tasks checklist
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  color: string;
  dueDate?: string; // ISO date string e.g. "2024-12-31"
}

export interface ScopeItem {
  id: ScopeItemId;
  text: string;
  inScope: boolean;
}

export type AuthScheme = 'none' | 'bearer' | 'apiKey' | 'basic' | 'oauth2';
export type EndpointStatus = 'draft' | 'implemented' | 'deprecated';

export interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  tag: string;
  entityRef: EntityId | null;
  requestBody: string;
  responseBody: string;
  auth: AuthScheme;
  statusCodes: string; // e.g. "200, 201, 404"
  queryParams: string; // e.g. "page, limit, sort, filter"
  notes: string; // implementation notes / caveats
  status?: EndpointStatus; // implementation lifecycle status
  rateLimit?: string; // e.g. "100/min" or "1000/hour"
  version?: string; // API version e.g. "v1", "v2", "2024-01"
}

export interface ProjectMeta {
  name: string;
  description: string;
  techStackNotes: string;
  notes: string; // freeform changelog / dev notes
}

export type ActiveTab = 'overview' | 'entities' | 'features' | 'api' | 'frontend';
export type EntityView = 'grid' | 'erd';
export type ExportFormat = 'sql-postgres' | 'sql-mysql' | 'sql-sqlite' | 'typescript' | 'zod' | 'prisma' | 'drizzle' | 'typeorm' | 'mermaid' | 'json' | 'dbml' | 'graphql' | 'sequelize' | 'mongoose' | 'sqlalchemy' | 'jsonschema' | 'knex' | 'mikro-orm';
export type FrontendExportFormat = 'react' | 'nextjs' | 'css-tokens' | 'tailwind-config' | 'component-docs' | 'mermaid-sitemap';
export type CopyFormat = 'sql' | 'markdown' | 'insert' | 'zod' | 'drizzle' | 'typeorm';

// ── Frontend Planner types ─────────────────────────────────────────

export type PageId = string;
export type ComponentId = string;
export type DesignTokenId = string;

export type PageStatus = 'planned' | 'in-progress' | 'built';

export interface PageDataBinding {
  endpointId: string;
  description: string;
}

export type WireframeSectionWidth = 'full' | '1/2' | '1/3' | '2/3' | '1/4' | '3/4';

export interface WireframeSection {
  id: string;
  label: string;
  componentRef: ComponentId | null;
  order: number;
  width: WireframeSectionWidth;
  notes: string;
}

export interface Page {
  id: PageId;
  name: string;
  path: string;
  description: string;
  layout: string;
  authRequired: boolean;
  roles: string;
  metaTitle: string;
  metaDescription: string;
  componentRefs: ComponentId[];
  entityRefs: EntityId[];
  dataBindings: PageDataBinding[];
  wireframeSections: WireframeSection[];
  navigatesTo: PageId[];
  featureRef: FeatureId | null;
  status: PageStatus;
  notes: string;
  tags: string[];
  order: number;
  createdAt: number;
  updatedAt: number;
}

export type ComponentKind = 'page' | 'layout' | 'container' | 'ui' | 'form' | 'data-display' | 'navigation' | 'feedback' | 'utility';

export interface ComponentProp {
  id: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue: string;
  description: string;
}

export interface ComponentEvent {
  id: string;
  name: string;
  payload: string;
  description: string;
}

export interface ComponentStateField {
  id: string;
  name: string;
  type: string;
  initialValue: string;
  description: string;
}

export interface UIComponent {
  id: ComponentId;
  name: string;
  description: string;
  kind: ComponentKind;
  props: ComponentProp[];
  events: ComponentEvent[];
  stateFields: ComponentStateField[];
  entityRef: EntityId | null;
  endpointRefs: string[];
  children: ComponentId[];
  parentId: ComponentId | null;
  tags: string[];
  notes: string;
  status: PageStatus;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface ColorToken {
  id: string;
  name: string;
  value: string;
  category: string;
}

export interface TypographyToken {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
}

export interface SpacingToken {
  id: string;
  name: string;
  value: string;
}

export interface BreakpointToken {
  name: string;
  value: string;
}

export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  breakpoints: BreakpointToken[];
  notes: string;
}
