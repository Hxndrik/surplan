import type { Entity, EntityColor, Priority, FeatureKind } from '../types';
import { createId } from './id';
import { ENTITY_COLORS } from '../types';

type ColumnTemplate = {
  name: string;
  dataType: string;
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  indexed?: boolean;
  defaultValue?: string;
  note?: string;
};

interface EntityTemplate {
  name: string;
  description: string;
  color: EntityColor;
  columns: ColumnTemplate[];
}

function buildEntity(template: EntityTemplate): Omit<Entity, 'id' | 'createdAt'> {
  return {
    name: template.name,
    description: template.description,
    color: template.color,
    collapsed: false,
    tags: [],
    columns: template.columns.map((c, i) => ({
      id: createId(),
      name: c.name,
      dataType: c.dataType as Entity['columns'][0]['dataType'],
      nullable: c.nullable ?? false,
      primaryKey: c.primaryKey ?? false,
      unique: c.unique ?? false,
      indexed: c.indexed ?? false,
      defaultValue: c.defaultValue ?? '',
      enumValues: '',
      check: '',
      references: null,
      note: c.note ?? '',
      order: i,
    })),
  };
}

export const ENTITY_TEMPLATES: { id: string; label: string; description: string; icon: string; build: () => Omit<Entity, 'id' | 'createdAt'> }[] = [
  {
    id: 'user',
    label: 'User',
    description: 'Authentication & user profile',
    icon: '👤',
    build: () => buildEntity({
      name: 'users',
      description: 'Application users',
      color: ENTITY_COLORS[0],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true, note: 'Primary key' },
        { name: 'email', dataType: 'string', unique: true, indexed: true, note: 'Unique email address' },
        { name: 'username', dataType: 'string', unique: true, nullable: true },
        { name: 'full_name', dataType: 'string', nullable: true },
        { name: 'password_hash', dataType: 'string', note: 'bcrypt hash' },
        { name: 'avatar_url', dataType: 'text', nullable: true },
        { name: 'email_verified', dataType: 'boolean', defaultValue: 'false' },
        { name: 'role', dataType: 'string', defaultValue: 'user', note: 'user | admin | moderator' },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
        { name: 'updated_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'post',
    label: 'Post / Article',
    description: 'Blog posts or articles',
    icon: '📝',
    build: () => buildEntity({
      name: 'posts',
      description: 'Blog posts or articles',
      color: ENTITY_COLORS[2],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'author_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
        { name: 'title', dataType: 'string' },
        { name: 'slug', dataType: 'string', unique: true, indexed: true },
        { name: 'content', dataType: 'text', nullable: true },
        { name: 'excerpt', dataType: 'text', nullable: true },
        { name: 'status', dataType: 'string', defaultValue: 'draft', note: 'draft | published | archived' },
        { name: 'published_at', dataType: 'timestamp', nullable: true },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
        { name: 'updated_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'product',
    label: 'Product',
    description: 'E-commerce product catalog',
    icon: '📦',
    build: () => buildEntity({
      name: 'products',
      description: 'Product catalog',
      color: ENTITY_COLORS[4],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'name', dataType: 'string' },
        { name: 'slug', dataType: 'string', unique: true },
        { name: 'description', dataType: 'text', nullable: true },
        { name: 'price', dataType: 'decimal' },
        { name: 'compare_price', dataType: 'decimal', nullable: true },
        { name: 'sku', dataType: 'string', unique: true, nullable: true },
        { name: 'stock_quantity', dataType: 'integer', defaultValue: '0' },
        { name: 'is_active', dataType: 'boolean', defaultValue: 'true' },
        { name: 'images', dataType: 'jsonb', nullable: true },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
        { name: 'updated_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'order',
    label: 'Order',
    description: 'E-commerce order management',
    icon: '🛒',
    build: () => buildEntity({
      name: 'orders',
      description: 'Customer orders',
      color: ENTITY_COLORS[5],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'user_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
        { name: 'status', dataType: 'string', defaultValue: 'pending', note: 'pending | processing | shipped | delivered | cancelled' },
        { name: 'total_amount', dataType: 'decimal' },
        { name: 'currency', dataType: 'string', defaultValue: 'USD' },
        { name: 'shipping_address', dataType: 'jsonb', nullable: true },
        { name: 'notes', dataType: 'text', nullable: true },
        { name: 'placed_at', dataType: 'timestamp', defaultValue: 'now()' },
        { name: 'updated_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'comment',
    label: 'Comment',
    description: 'Threaded comments',
    icon: '💬',
    build: () => buildEntity({
      name: 'comments',
      description: 'User comments',
      color: ENTITY_COLORS[3],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'author_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
        { name: 'parent_id', dataType: 'uuid', nullable: true, indexed: true, note: 'Self-reference for threading' },
        { name: 'content', dataType: 'text' },
        { name: 'is_deleted', dataType: 'boolean', defaultValue: 'false' },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'session',
    label: 'Session / Token',
    description: 'Auth sessions & tokens',
    icon: '🔑',
    build: () => buildEntity({
      name: 'sessions',
      description: 'User sessions',
      color: ENTITY_COLORS[1],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'user_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
        { name: 'token', dataType: 'string', unique: true, indexed: true },
        { name: 'ip_address', dataType: 'string', nullable: true },
        { name: 'user_agent', dataType: 'text', nullable: true },
        { name: 'expires_at', dataType: 'timestamp' },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'file',
    label: 'File / Media',
    description: 'File uploads & media',
    icon: '📁',
    build: () => buildEntity({
      name: 'files',
      description: 'Uploaded files and media',
      color: ENTITY_COLORS[6],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'owner_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
        { name: 'filename', dataType: 'string' },
        { name: 'original_name', dataType: 'string' },
        { name: 'mime_type', dataType: 'string' },
        { name: 'size_bytes', dataType: 'bigint' },
        { name: 'storage_path', dataType: 'text' },
        { name: 'url', dataType: 'text', nullable: true },
        { name: 'is_public', dataType: 'boolean', defaultValue: 'false' },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'notification',
    label: 'Notification',
    description: 'User notifications',
    icon: '🔔',
    build: () => buildEntity({
      name: 'notifications',
      description: 'User notifications',
      color: ENTITY_COLORS[4],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'user_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
        { name: 'type', dataType: 'string', indexed: true },
        { name: 'title', dataType: 'string' },
        { name: 'body', dataType: 'text', nullable: true },
        { name: 'data', dataType: 'jsonb', nullable: true },
        { name: 'read_at', dataType: 'timestamp', nullable: true },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'tag',
    label: 'Tag / Category',
    description: 'Tagging & categorization',
    icon: '🏷️',
    build: () => buildEntity({
      name: 'tags',
      description: 'Tags and categories',
      color: ENTITY_COLORS[3],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'name', dataType: 'string', unique: true },
        { name: 'slug', dataType: 'string', unique: true },
        { name: 'color', dataType: 'string', nullable: true, note: 'Hex color' },
        { name: 'description', dataType: 'text', nullable: true },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'audit',
    label: 'Audit Log',
    description: 'Activity and change tracking',
    icon: '📋',
    build: () => buildEntity({
      name: 'audit_logs',
      description: 'Audit trail of all actions',
      color: ENTITY_COLORS[7],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'actor_id', dataType: 'uuid', indexed: true, nullable: true, note: 'FK → users.id (null = system)' },
        { name: 'action', dataType: 'string', indexed: true, note: 'CREATE | UPDATE | DELETE | LOGIN etc.' },
        { name: 'entity_type', dataType: 'string', indexed: true },
        { name: 'entity_id', dataType: 'string', indexed: true },
        { name: 'changes', dataType: 'jsonb', nullable: true, note: 'Before/after diff' },
        { name: 'ip_address', dataType: 'string', nullable: true },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'subscription',
    label: 'Subscription',
    description: 'SaaS billing subscriptions',
    icon: '💳',
    build: () => buildEntity({
      name: 'subscriptions',
      description: 'Billing subscriptions',
      color: ENTITY_COLORS[3],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'user_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
        { name: 'plan', dataType: 'string', note: 'free | starter | pro | enterprise' },
        { name: 'status', dataType: 'string', defaultValue: 'active', indexed: true, note: 'active | past_due | cancelled | trialing' },
        { name: 'stripe_subscription_id', dataType: 'string', unique: true, nullable: true },
        { name: 'stripe_customer_id', dataType: 'string', nullable: true, indexed: true },
        { name: 'current_period_start', dataType: 'timestamp', nullable: true },
        { name: 'current_period_end', dataType: 'timestamp', nullable: true },
        { name: 'trial_ends_at', dataType: 'timestamp', nullable: true },
        { name: 'cancelled_at', dataType: 'timestamp', nullable: true },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
        { name: 'updated_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'webhook',
    label: 'Webhook',
    description: 'Outgoing webhooks',
    icon: '🪝',
    build: () => buildEntity({
      name: 'webhooks',
      description: 'Outgoing webhook endpoints',
      color: ENTITY_COLORS[1],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'owner_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
        { name: 'url', dataType: 'text' },
        { name: 'secret', dataType: 'string', note: 'Used to sign payloads (HMAC)' },
        { name: 'events', dataType: 'jsonb', note: 'Array of subscribed event types' },
        { name: 'is_active', dataType: 'boolean', defaultValue: 'true' },
        { name: 'last_triggered_at', dataType: 'timestamp', nullable: true },
        { name: 'failure_count', dataType: 'integer', defaultValue: '0' },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'role',
    label: 'Role / Permission',
    description: 'RBAC roles and permissions',
    icon: '🔐',
    build: () => buildEntity({
      name: 'roles',
      description: 'RBAC roles',
      color: ENTITY_COLORS[5],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'name', dataType: 'string', unique: true, note: 'admin | moderator | editor | viewer' },
        { name: 'description', dataType: 'text', nullable: true },
        { name: 'permissions', dataType: 'jsonb', nullable: true, note: 'Array of permission strings' },
        { name: 'is_system', dataType: 'boolean', defaultValue: 'false', note: 'System roles cannot be deleted' },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'address',
    label: 'Address',
    description: 'Physical address / shipping',
    icon: '📍',
    build: () => buildEntity({
      name: 'addresses',
      description: 'Physical addresses',
      color: ENTITY_COLORS[2],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'user_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
        { name: 'label', dataType: 'string', nullable: true, note: 'Home | Work | etc.' },
        { name: 'line1', dataType: 'string' },
        { name: 'line2', dataType: 'string', nullable: true },
        { name: 'city', dataType: 'string' },
        { name: 'state', dataType: 'string', nullable: true },
        { name: 'postal_code', dataType: 'string' },
        { name: 'country', dataType: 'string', defaultValue: 'US' },
        { name: 'is_default', dataType: 'boolean', defaultValue: 'false' },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'message',
    label: 'Message / Chat',
    description: 'Direct messages or chat rooms',
    icon: '💬',
    build: () => buildEntity({
      name: 'messages',
      description: 'Chat messages',
      color: ENTITY_COLORS[1],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'conversation_id', dataType: 'uuid', indexed: true, note: 'FK → conversations.id' },
        { name: 'sender_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
        { name: 'body', dataType: 'text' },
        { name: 'type', dataType: 'enum', enumValues: 'text,image,file,system', defaultValue: 'text' },
        { name: 'read_at', dataType: 'timestamp', nullable: true },
        { name: 'edited_at', dataType: 'timestamp', nullable: true },
        { name: 'deleted_at', dataType: 'timestamp', nullable: true, note: 'Soft delete' },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'payment',
    label: 'Payment',
    description: 'Payment transactions & invoices',
    icon: '💳',
    build: () => buildEntity({
      name: 'payments',
      description: 'Payment transactions',
      color: ENTITY_COLORS[4],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'user_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
        { name: 'order_id', dataType: 'uuid', nullable: true, indexed: true, note: 'FK → orders.id' },
        { name: 'amount', dataType: 'decimal' },
        { name: 'currency', dataType: 'string', defaultValue: 'USD' },
        { name: 'status', dataType: 'enum', enumValues: 'pending,completed,failed,refunded', defaultValue: 'pending' },
        { name: 'provider', dataType: 'string', note: 'stripe | paypal | etc.' },
        { name: 'provider_tx_id', dataType: 'string', unique: true, nullable: true },
        { name: 'metadata', dataType: 'jsonb', nullable: true },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
  {
    id: 'event_log',
    label: 'Event / Analytics',
    description: 'User event tracking & analytics',
    icon: '📊',
    build: () => buildEntity({
      name: 'events',
      description: 'User analytics events',
      color: ENTITY_COLORS[6],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'user_id', dataType: 'uuid', nullable: true, indexed: true, note: 'FK → users.id (null = anonymous)' },
        { name: 'session_id', dataType: 'uuid', nullable: true, indexed: true },
        { name: 'event_name', dataType: 'string', indexed: true, note: 'e.g. page_view, button_click' },
        { name: 'page', dataType: 'string', nullable: true },
        { name: 'properties', dataType: 'jsonb', nullable: true },
        { name: 'ip', dataType: 'string', nullable: true },
        { name: 'user_agent', dataType: 'text', nullable: true },
        { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()', indexed: true },
      ],
    }),
  },
  {
    id: 'settings',
    label: 'Settings / Config',
    description: 'User or app settings key-value store',
    icon: '⚙️',
    build: () => buildEntity({
      name: 'settings',
      description: 'User or app configuration',
      color: ENTITY_COLORS[7],
      columns: [
        { name: 'id', dataType: 'uuid', primaryKey: true },
        { name: 'user_id', dataType: 'uuid', nullable: true, indexed: true, note: 'null = global settings' },
        { name: 'key', dataType: 'string', indexed: true },
        { name: 'value', dataType: 'jsonb' },
        { name: 'updated_at', dataType: 'timestamp', defaultValue: 'now()' },
      ],
    }),
  },
];

// ─── Project Starters ─────────────────────────────────────────────────────────

export type ProjectStarterFeature = {
  title: string;
  priority: Priority;
  kind?: FeatureKind;
  milestoneIdx?: number; // index into the starter's milestones array
  notes?: string;
};

export type ProjectStarterEndpoint = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  tag: string;
  description: string;
  auth?: string;
};

export type ProjectStarterData = {
  meta: { name: string; description: string; techStackNotes: string };
  entities: ReturnType<typeof buildEntity>[];
  milestones: Array<{ name: string; description: string; color: string }>;
  scope: Array<{ text: string; inScope: boolean }>;
  features: ProjectStarterFeature[];
  endpoints: ProjectStarterEndpoint[];
};

export type ProjectStarter = {
  id: string;
  icon: string;
  label: string;
  description: string;
  tags: string[];
  build: () => ProjectStarterData;
};

const MILESTONE_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];

export const PROJECT_STARTERS: ProjectStarter[] = [
  // ─── SaaS / B2B ─────────────────────────────────────────────────────────────
  {
    id: 'saas',
    icon: '🚀',
    label: 'SaaS / B2B',
    description: 'Multi-tenant SaaS with auth, teams, billing, and audit logs.',
    tags: ['auth', 'teams', 'billing', 'stripe'],
    build: (): ProjectStarterData => ({
      meta: {
        name: 'SaaS Starter',
        description: 'A multi-tenant B2B SaaS application with team management, subscription billing, and role-based access control.',
        techStackNotes: 'Backend: Node.js + TypeScript + Fastify\nDatabase: PostgreSQL + Prisma\nAuth: JWT + OAuth2 (Google, GitHub)\nBilling: Stripe\nFrontend: React + TanStack Query\nInfra: Docker + Railway / Render',
      },
      milestones: [
        { name: 'MVP', description: 'Auth, basic team creation, and core feature', color: MILESTONE_PALETTE[0] },
        { name: 'Billing', description: 'Stripe integration and subscription management', color: MILESTONE_PALETTE[1] },
        { name: 'Growth', description: 'Invites, roles, audit logs, and polish', color: MILESTONE_PALETTE[2] },
      ],
      scope: [
        { text: 'Email/password and OAuth authentication', inScope: true },
        { text: 'Multi-tenant team workspace', inScope: true },
        { text: 'Role-based access control (admin / member)', inScope: true },
        { text: 'Subscription billing via Stripe', inScope: true },
        { text: 'Email invitations', inScope: true },
        { text: 'Audit log of important actions', inScope: true },
        { text: 'Real-time collaboration', inScope: false },
        { text: 'Mobile app', inScope: false },
        { text: 'Self-hosted / on-prem option', inScope: false },
      ],
      features: [
        { title: 'User signup with email & password', priority: 'critical', kind: 'feature', milestoneIdx: 0, notes: 'Hash password with bcrypt. Send verification email.' },
        { title: 'Email verification on signup', priority: 'critical', kind: 'feature', milestoneIdx: 0 },
        { title: 'Login with JWT tokens (access + refresh)', priority: 'critical', kind: 'feature', milestoneIdx: 0 },
        { title: 'OAuth login: Google + GitHub', priority: 'high', kind: 'feature', milestoneIdx: 0 },
        { title: 'Password reset via email', priority: 'high', kind: 'feature', milestoneIdx: 0 },
        { title: 'Create and name a team workspace', priority: 'critical', kind: 'feature', milestoneIdx: 0 },
        { title: 'Invite members by email', priority: 'high', kind: 'feature', milestoneIdx: 2 },
        { title: 'Accept / decline team invitations', priority: 'high', kind: 'feature', milestoneIdx: 2 },
        { title: 'Admin and member roles with permission gates', priority: 'high', kind: 'feature', milestoneIdx: 2 },
        { title: 'Remove team member', priority: 'medium', kind: 'feature', milestoneIdx: 2 },
        { title: 'Stripe checkout for subscription plans', priority: 'critical', kind: 'feature', milestoneIdx: 1 },
        { title: 'Billing portal (upgrade, downgrade, cancel)', priority: 'high', kind: 'feature', milestoneIdx: 1 },
        { title: 'Stripe webhook handler', priority: 'critical', kind: 'feature', milestoneIdx: 1, notes: 'Handle subscription.created, updated, deleted, invoice.paid, invoice.failed' },
        { title: 'Usage / seat limit enforcement', priority: 'medium', kind: 'feature', milestoneIdx: 1 },
        { title: 'Audit log of team actions', priority: 'medium', kind: 'feature', milestoneIdx: 2 },
        { title: 'User profile (name, avatar, timezone)', priority: 'low', kind: 'feature', milestoneIdx: 2 },
      ],
      endpoints: [
        { method: 'POST', path: '/auth/signup', tag: 'Auth', description: 'Register new user', auth: 'none' },
        { method: 'POST', path: '/auth/login', tag: 'Auth', description: 'Login, returns JWT pair', auth: 'none' },
        { method: 'POST', path: '/auth/refresh', tag: 'Auth', description: 'Refresh access token', auth: 'none' },
        { method: 'POST', path: '/auth/logout', tag: 'Auth', description: 'Revoke refresh token', auth: 'bearer' },
        { method: 'POST', path: '/auth/forgot-password', tag: 'Auth', description: 'Send password reset email', auth: 'none' },
        { method: 'POST', path: '/auth/reset-password', tag: 'Auth', description: 'Reset password with token', auth: 'none' },
        { method: 'GET', path: '/auth/me', tag: 'Auth', description: 'Get current user profile', auth: 'bearer' },
        { method: 'GET', path: '/teams', tag: 'Teams', description: 'List teams current user belongs to', auth: 'bearer' },
        { method: 'POST', path: '/teams', tag: 'Teams', description: 'Create a new team', auth: 'bearer' },
        { method: 'GET', path: '/teams/:teamId', tag: 'Teams', description: 'Get team details', auth: 'bearer' },
        { method: 'PATCH', path: '/teams/:teamId', tag: 'Teams', description: 'Update team settings', auth: 'bearer' },
        { method: 'POST', path: '/teams/:teamId/invites', tag: 'Teams', description: 'Invite member by email', auth: 'bearer' },
        { method: 'DELETE', path: '/teams/:teamId/members/:userId', tag: 'Teams', description: 'Remove team member', auth: 'bearer' },
        { method: 'POST', path: '/billing/checkout', tag: 'Billing', description: 'Create Stripe checkout session', auth: 'bearer' },
        { method: 'GET', path: '/billing/portal', tag: 'Billing', description: 'Create billing portal session URL', auth: 'bearer' },
        { method: 'POST', path: '/billing/webhook', tag: 'Billing', description: 'Stripe webhook receiver', auth: 'none' },
        { method: 'GET', path: '/audit-logs', tag: 'Audit', description: 'Paginated audit log for team', auth: 'bearer' },
      ],
      entities: [
        buildEntity({
          name: 'users', description: 'Registered users', color: ENTITY_COLORS[0],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'email', dataType: 'string', unique: true, indexed: true },
            { name: 'password_hash', dataType: 'string', nullable: true, note: 'null for OAuth-only accounts' },
            { name: 'name', dataType: 'string' },
            { name: 'avatar_url', dataType: 'string', nullable: true },
            { name: 'email_verified_at', dataType: 'timestamp', nullable: true },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
            { name: 'updated_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
        buildEntity({
          name: 'teams', description: 'Workspace teams', color: ENTITY_COLORS[1],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'name', dataType: 'string' },
            { name: 'slug', dataType: 'string', unique: true, indexed: true },
            { name: 'owner_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
            { name: 'plan', dataType: 'string', defaultValue: 'free', note: 'free | starter | pro | enterprise' },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
        buildEntity({
          name: 'team_members', description: 'User↔team membership', color: ENTITY_COLORS[2],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'team_id', dataType: 'uuid', indexed: true, note: 'FK → teams.id' },
            { name: 'user_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
            { name: 'role', dataType: 'string', defaultValue: 'member', note: 'admin | member' },
            { name: 'joined_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
        buildEntity({
          name: 'subscriptions', description: 'Stripe subscriptions', color: ENTITY_COLORS[3],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'team_id', dataType: 'uuid', indexed: true, note: 'FK → teams.id' },
            { name: 'stripe_subscription_id', dataType: 'string', unique: true },
            { name: 'stripe_customer_id', dataType: 'string', indexed: true },
            { name: 'status', dataType: 'string', indexed: true, note: 'active | past_due | cancelled | trialing' },
            { name: 'current_period_end', dataType: 'timestamp' },
            { name: 'cancelled_at', dataType: 'timestamp', nullable: true },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
        buildEntity({
          name: 'invitations', description: 'Pending team invites', color: ENTITY_COLORS[4],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'team_id', dataType: 'uuid', indexed: true, note: 'FK → teams.id' },
            { name: 'invited_email', dataType: 'string', indexed: true },
            { name: 'role', dataType: 'string', defaultValue: 'member' },
            { name: 'token', dataType: 'string', unique: true },
            { name: 'expires_at', dataType: 'timestamp' },
            { name: 'accepted_at', dataType: 'timestamp', nullable: true },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
        buildEntity({
          name: 'audit_logs', description: 'Team action audit trail', color: ENTITY_COLORS[5],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'team_id', dataType: 'uuid', indexed: true, note: 'FK → teams.id' },
            { name: 'actor_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
            { name: 'action', dataType: 'string', indexed: true, note: 'e.g. member.invited, plan.upgraded' },
            { name: 'metadata', dataType: 'jsonb', nullable: true },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
      ],
    }),
  },

  // ─── Blog / CMS ─────────────────────────────────────────────────────────────
  {
    id: 'blog',
    icon: '✍️',
    label: 'Blog / CMS',
    description: 'Content management system with posts, authors, tags, and comments.',
    tags: ['content', 'cms', 'seo', 'comments'],
    build: (): ProjectStarterData => ({
      meta: {
        name: 'Blog / CMS',
        description: 'A modern content management system with markdown support, authorship, categorization, and public comments.',
        techStackNotes: 'Backend: Node.js + Express / Fastify\nDatabase: PostgreSQL + Prisma\nAuth: JWT\nMedia: S3 / Cloudflare R2\nFrontend: Next.js (SSR/ISR)\nSearch: MeiliSearch or pg_trgm',
      },
      milestones: [
        { name: 'Core', description: 'Authors, posts, categories, publish flow', color: MILESTONE_PALETTE[0] },
        { name: 'Engagement', description: 'Comments, search, RSS, tags', color: MILESTONE_PALETTE[1] },
        { name: 'Polish', description: 'SEO, analytics, media management', color: MILESTONE_PALETTE[2] },
      ],
      scope: [
        { text: 'Author accounts and authentication', inScope: true },
        { text: 'Rich text / markdown post editor', inScope: true },
        { text: 'Post drafts, scheduling, and publishing', inScope: true },
        { text: 'Categories and tags', inScope: true },
        { text: 'Public comments with moderation', inScope: true },
        { text: 'Full-text search', inScope: true },
        { text: 'RSS and sitemap generation', inScope: true },
        { text: 'Paid newsletter / paywalled posts', inScope: false },
        { text: 'Native mobile app', inScope: false },
      ],
      features: [
        { title: 'Author signup and login', priority: 'critical', kind: 'feature', milestoneIdx: 0 },
        { title: 'Create and save post draft', priority: 'critical', kind: 'feature', milestoneIdx: 0 },
        { title: 'Publish / unpublish post', priority: 'critical', kind: 'feature', milestoneIdx: 0 },
        { title: 'Schedule post publish date', priority: 'high', kind: 'feature', milestoneIdx: 0 },
        { title: 'Markdown editor with preview', priority: 'high', kind: 'feature', milestoneIdx: 0 },
        { title: 'Assign post to category', priority: 'high', kind: 'feature', milestoneIdx: 0 },
        { title: 'Add tags to posts', priority: 'medium', kind: 'feature', milestoneIdx: 1 },
        { title: 'Featured image upload', priority: 'medium', kind: 'feature', milestoneIdx: 0 },
        { title: 'Public comments with email', priority: 'medium', kind: 'feature', milestoneIdx: 1 },
        { title: 'Comment moderation (approve/delete)', priority: 'medium', kind: 'feature', milestoneIdx: 1 },
        { title: 'Full-text post search', priority: 'high', kind: 'feature', milestoneIdx: 1 },
        { title: 'RSS feed generation', priority: 'medium', kind: 'feature', milestoneIdx: 1 },
        { title: 'XML sitemap', priority: 'medium', kind: 'feature', milestoneIdx: 2 },
        { title: 'SEO meta fields (title, description, OG image)', priority: 'high', kind: 'feature', milestoneIdx: 2 },
        { title: 'Post view count tracking', priority: 'low', kind: 'feature', milestoneIdx: 2 },
      ],
      endpoints: [
        { method: 'GET', path: '/posts', tag: 'Posts', description: 'List published posts (paginated)', auth: 'none' },
        { method: 'POST', path: '/posts', tag: 'Posts', description: 'Create new post draft', auth: 'bearer' },
        { method: 'GET', path: '/posts/:slug', tag: 'Posts', description: 'Get single post by slug', auth: 'none' },
        { method: 'PUT', path: '/posts/:id', tag: 'Posts', description: 'Update post content', auth: 'bearer' },
        { method: 'DELETE', path: '/posts/:id', tag: 'Posts', description: 'Delete post', auth: 'bearer' },
        { method: 'POST', path: '/posts/:id/publish', tag: 'Posts', description: 'Publish post', auth: 'bearer' },
        { method: 'GET', path: '/categories', tag: 'Categories', description: 'List categories', auth: 'none' },
        { method: 'POST', path: '/categories', tag: 'Categories', description: 'Create category', auth: 'bearer' },
        { method: 'GET', path: '/tags', tag: 'Tags', description: 'List all tags', auth: 'none' },
        { method: 'GET', path: '/posts/:id/comments', tag: 'Comments', description: 'Get comments for post', auth: 'none' },
        { method: 'POST', path: '/posts/:id/comments', tag: 'Comments', description: 'Submit a comment', auth: 'none' },
        { method: 'DELETE', path: '/comments/:id', tag: 'Comments', description: 'Moderate: delete comment', auth: 'bearer' },
        { method: 'GET', path: '/search', tag: 'Search', description: 'Full-text search posts', auth: 'none' },
        { method: 'POST', path: '/media/upload', tag: 'Media', description: 'Upload image, return URL', auth: 'bearer' },
      ],
      entities: [
        buildEntity({
          name: 'users', description: 'Author accounts', color: ENTITY_COLORS[0],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'email', dataType: 'string', unique: true },
            { name: 'password_hash', dataType: 'string' },
            { name: 'name', dataType: 'string' },
            { name: 'bio', dataType: 'text', nullable: true },
            { name: 'avatar_url', dataType: 'string', nullable: true },
            { name: 'role', dataType: 'string', defaultValue: 'author', note: 'admin | editor | author' },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
        buildEntity({
          name: 'posts', description: 'Blog posts and articles', color: ENTITY_COLORS[1],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'author_id', dataType: 'uuid', indexed: true, note: 'FK → users.id' },
            { name: 'category_id', dataType: 'uuid', nullable: true, indexed: true, note: 'FK → categories.id' },
            { name: 'title', dataType: 'string' },
            { name: 'slug', dataType: 'string', unique: true, indexed: true },
            { name: 'excerpt', dataType: 'text', nullable: true },
            { name: 'content', dataType: 'text' },
            { name: 'cover_image_url', dataType: 'string', nullable: true },
            { name: 'status', dataType: 'string', defaultValue: 'draft', indexed: true, note: 'draft | published | archived' },
            { name: 'published_at', dataType: 'timestamp', nullable: true },
            { name: 'scheduled_at', dataType: 'timestamp', nullable: true },
            { name: 'view_count', dataType: 'integer', defaultValue: '0' },
            { name: 'seo_title', dataType: 'string', nullable: true },
            { name: 'seo_description', dataType: 'string', nullable: true },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
            { name: 'updated_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
        buildEntity({
          name: 'categories', description: 'Post categories', color: ENTITY_COLORS[2],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'name', dataType: 'string', unique: true },
            { name: 'slug', dataType: 'string', unique: true },
            { name: 'description', dataType: 'text', nullable: true },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
        buildEntity({
          name: 'tags', description: 'Content tags', color: ENTITY_COLORS[3],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'name', dataType: 'string', unique: true },
            { name: 'slug', dataType: 'string', unique: true },
          ],
        }),
        buildEntity({
          name: 'post_tags', description: 'Many-to-many post↔tag', color: ENTITY_COLORS[4],
          columns: [
            { name: 'post_id', dataType: 'uuid', primaryKey: true, note: 'FK → posts.id' },
            { name: 'tag_id', dataType: 'uuid', primaryKey: true, note: 'FK → tags.id' },
          ],
        }),
        buildEntity({
          name: 'comments', description: 'Reader comments', color: ENTITY_COLORS[5],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'post_id', dataType: 'uuid', indexed: true, note: 'FK → posts.id' },
            { name: 'author_name', dataType: 'string' },
            { name: 'author_email', dataType: 'string' },
            { name: 'content', dataType: 'text' },
            { name: 'approved', dataType: 'boolean', defaultValue: 'false', indexed: true },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
      ],
    }),
  },

  // ─── E-commerce ─────────────────────────────────────────────────────────────
  {
    id: 'ecommerce',
    icon: '🛒',
    label: 'E-Commerce',
    description: 'Online store with products, cart, orders, and payment processing.',
    tags: ['products', 'orders', 'payments', 'stripe'],
    build: (): ProjectStarterData => ({
      meta: {
        name: 'E-Commerce Store',
        description: 'A full-featured e-commerce platform with product catalog, shopping cart, order management, and Stripe payments.',
        techStackNotes: 'Backend: Node.js + TypeScript + Express\nDatabase: PostgreSQL + Prisma\nPayments: Stripe\nStorage: S3 (product images)\nFrontend: Next.js + React\nCache: Redis (cart sessions)',
      },
      milestones: [
        { name: 'Catalog', description: 'Products, categories, variants, search', color: MILESTONE_PALETTE[0] },
        { name: 'Commerce', description: 'Cart, checkout, payments, orders', color: MILESTONE_PALETTE[1] },
        { name: 'Operations', description: 'Inventory, fulfillment, reviews', color: MILESTONE_PALETTE[2] },
      ],
      scope: [
        { text: 'Product catalog with variants (size, color)', inScope: true },
        { text: 'Shopping cart (session-based, then merged on login)', inScope: true },
        { text: 'Stripe checkout (cards, Apple Pay, Google Pay)', inScope: true },
        { text: 'Order tracking and status updates', inScope: true },
        { text: 'Inventory management', inScope: true },
        { text: 'Product reviews and ratings', inScope: true },
        { text: 'Discount codes and promotions', inScope: false },
        { text: 'Physical store / POS integration', inScope: false },
        { text: 'Marketplace / multi-vendor', inScope: false },
      ],
      features: [
        { title: 'Product listing with pagination and filters', priority: 'critical', kind: 'feature', milestoneIdx: 0 },
        { title: 'Product detail page with images', priority: 'critical', kind: 'feature', milestoneIdx: 0 },
        { title: 'Product variants (size, color, SKU)', priority: 'high', kind: 'feature', milestoneIdx: 0 },
        { title: 'Category hierarchy and navigation', priority: 'high', kind: 'feature', milestoneIdx: 0 },
        { title: 'Full-text product search', priority: 'high', kind: 'feature', milestoneIdx: 0 },
        { title: 'Add to cart', priority: 'critical', kind: 'feature', milestoneIdx: 1 },
        { title: 'Cart management (update qty, remove)', priority: 'critical', kind: 'feature', milestoneIdx: 1 },
        { title: 'Guest and logged-in checkout', priority: 'critical', kind: 'feature', milestoneIdx: 1 },
        { title: 'Stripe payment (card, Apple Pay)', priority: 'critical', kind: 'feature', milestoneIdx: 1, notes: 'Use Stripe Payment Intents. Show 3D Secure modal when required.' },
        { title: 'Order confirmation email', priority: 'high', kind: 'feature', milestoneIdx: 1 },
        { title: 'Order history and status tracking', priority: 'high', kind: 'feature', milestoneIdx: 1 },
        { title: 'Inventory decrement on order', priority: 'high', kind: 'feature', milestoneIdx: 2 },
        { title: 'Low stock alerts', priority: 'medium', kind: 'feature', milestoneIdx: 2 },
        { title: 'Product reviews and star rating', priority: 'medium', kind: 'feature', milestoneIdx: 2 },
        { title: 'Admin: order fulfillment and status update', priority: 'high', kind: 'feature', milestoneIdx: 2 },
      ],
      endpoints: [
        { method: 'GET', path: '/products', tag: 'Products', description: 'List products with filters and pagination', auth: 'none' },
        { method: 'POST', path: '/products', tag: 'Products', description: 'Create product (admin)', auth: 'bearer' },
        { method: 'GET', path: '/products/:id', tag: 'Products', description: 'Get product details + variants', auth: 'none' },
        { method: 'PATCH', path: '/products/:id', tag: 'Products', description: 'Update product (admin)', auth: 'bearer' },
        { method: 'GET', path: '/categories', tag: 'Products', description: 'List categories', auth: 'none' },
        { method: 'GET', path: '/search', tag: 'Products', description: 'Search products by query', auth: 'none' },
        { method: 'GET', path: '/cart', tag: 'Cart', description: 'Get current cart', auth: 'none' },
        { method: 'POST', path: '/cart/items', tag: 'Cart', description: 'Add item to cart', auth: 'none' },
        { method: 'PATCH', path: '/cart/items/:id', tag: 'Cart', description: 'Update cart item quantity', auth: 'none' },
        { method: 'DELETE', path: '/cart/items/:id', tag: 'Cart', description: 'Remove item from cart', auth: 'none' },
        { method: 'POST', path: '/checkout', tag: 'Orders', description: 'Create Stripe payment intent + order', auth: 'none' },
        { method: 'POST', path: '/checkout/webhook', tag: 'Orders', description: 'Stripe payment webhook', auth: 'none' },
        { method: 'GET', path: '/orders', tag: 'Orders', description: 'List user orders', auth: 'bearer' },
        { method: 'GET', path: '/orders/:id', tag: 'Orders', description: 'Order details and status', auth: 'bearer' },
        { method: 'POST', path: '/products/:id/reviews', tag: 'Reviews', description: 'Submit product review', auth: 'bearer' },
      ],
      entities: [
        buildEntity({
          name: 'products', description: 'Product catalog', color: ENTITY_COLORS[0],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'category_id', dataType: 'uuid', nullable: true, indexed: true, note: 'FK → categories.id' },
            { name: 'name', dataType: 'string' },
            { name: 'slug', dataType: 'string', unique: true, indexed: true },
            { name: 'description', dataType: 'text', nullable: true },
            { name: 'base_price', dataType: 'decimal' },
            { name: 'status', dataType: 'string', defaultValue: 'draft', note: 'draft | active | archived' },
            { name: 'images', dataType: 'jsonb', nullable: true, note: 'Array of image URLs' },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
        buildEntity({
          name: 'product_variants', description: 'SKU variants (size, color)', color: ENTITY_COLORS[1],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'product_id', dataType: 'uuid', indexed: true, note: 'FK → products.id' },
            { name: 'sku', dataType: 'string', unique: true },
            { name: 'options', dataType: 'jsonb', note: 'e.g. {"size": "M", "color": "blue"}' },
            { name: 'price', dataType: 'decimal' },
            { name: 'stock_quantity', dataType: 'integer', defaultValue: '0' },
          ],
        }),
        buildEntity({
          name: 'categories', description: 'Product categories', color: ENTITY_COLORS[2],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'parent_id', dataType: 'uuid', nullable: true, note: 'FK → categories.id (self-ref)' },
            { name: 'name', dataType: 'string' },
            { name: 'slug', dataType: 'string', unique: true },
          ],
        }),
        buildEntity({
          name: 'orders', description: 'Customer orders', color: ENTITY_COLORS[3],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'user_id', dataType: 'uuid', nullable: true, indexed: true, note: 'null for guest orders' },
            { name: 'status', dataType: 'string', defaultValue: 'pending', indexed: true, note: 'pending | paid | fulfilled | cancelled' },
            { name: 'total_amount', dataType: 'decimal' },
            { name: 'stripe_payment_intent_id', dataType: 'string', nullable: true, unique: true },
            { name: 'shipping_address', dataType: 'jsonb' },
            { name: 'email', dataType: 'string', note: 'For guest orders and confirmations' },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
        buildEntity({
          name: 'order_items', description: 'Line items in an order', color: ENTITY_COLORS[4],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'order_id', dataType: 'uuid', indexed: true, note: 'FK → orders.id' },
            { name: 'variant_id', dataType: 'uuid', note: 'FK → product_variants.id' },
            { name: 'quantity', dataType: 'integer' },
            { name: 'unit_price', dataType: 'decimal', note: 'Price at time of order' },
          ],
        }),
        buildEntity({
          name: 'reviews', description: 'Product reviews', color: ENTITY_COLORS[5],
          columns: [
            { name: 'id', dataType: 'uuid', primaryKey: true },
            { name: 'product_id', dataType: 'uuid', indexed: true, note: 'FK → products.id' },
            { name: 'user_id', dataType: 'uuid', note: 'FK → users.id' },
            { name: 'rating', dataType: 'integer', note: '1–5' },
            { name: 'body', dataType: 'text', nullable: true },
            { name: 'approved', dataType: 'boolean', defaultValue: 'false' },
            { name: 'created_at', dataType: 'timestamp', defaultValue: 'now()' },
          ],
        }),
      ],
    }),
  },
];

// ─── Column Presets ───────────────────────────────────────────────────────────

export const COLUMN_PRESETS: { id: string; label: string; icon: string; preset: Partial<import('../types').Column> }[] = [
  { id: 'created_at', label: 'created_at', icon: '📅', preset: { name: 'created_at', dataType: 'timestamp', nullable: false, defaultValue: 'now()' } },
  { id: 'updated_at', label: 'updated_at', icon: '📅', preset: { name: 'updated_at', dataType: 'timestamp', nullable: false, defaultValue: 'now()' } },
  { id: 'deleted_at', label: 'deleted_at (soft delete)', icon: '🗑️', preset: { name: 'deleted_at', dataType: 'timestamp', nullable: true, note: 'Soft delete timestamp' } },
  { id: 'is_active', label: 'is_active', icon: '✅', preset: { name: 'is_active', dataType: 'boolean', nullable: false, defaultValue: 'true' } },
  { id: 'sort_order', label: 'sort_order', icon: '🔢', preset: { name: 'sort_order', dataType: 'integer', nullable: false, defaultValue: '0' } },
  { id: 'metadata', label: 'metadata (json)', icon: '📋', preset: { name: 'metadata', dataType: 'jsonb', nullable: true } },
];
