import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useEntityStore } from '../../store/useEntityStore';
import { exportOpenApi } from '../../lib/backup';
import { InlineEdit } from '../shared/InlineEdit';
import { IconButton } from '../shared/IconButton';
import { EmptyState } from '../shared/EmptyState';
import type { ApiEndpoint, AuthScheme, EndpointStatus } from '../../types';

const METHOD_COLORS: Record<ApiEndpoint['method'], string> = {
  GET: 'text-success bg-success-muted',
  POST: 'text-accent bg-accent-muted',
  PUT: 'text-warning bg-warning-muted',
  PATCH: 'text-warning bg-warning-muted',
  DELETE: 'text-danger bg-danger-muted',
};

const METHODS: ApiEndpoint['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const AUTH_LABELS: Record<AuthScheme, string> = {
  none: 'No auth',
  bearer: 'Bearer',
  apiKey: 'API Key',
  basic: 'Basic',
  oauth2: 'OAuth2',
};

const AUTH_COLORS: Record<AuthScheme, string> = {
  none: 'text-text-muted',
  bearer: 'text-accent',
  apiKey: 'text-warning',
  basic: 'text-success',
  oauth2: 'text-violet',
};

const UNTAGGED = '__untagged__';

const ENDPOINT_STATUS_LABELS: Record<EndpointStatus, string> = {
  draft: 'Draft',
  implemented: 'Impl',
  deprecated: 'Depr',
};

const ENDPOINT_STATUS_COLORS: Record<EndpointStatus, string> = {
  draft: 'text-text-muted bg-bg-tertiary border-border-default',
  implemented: 'text-success bg-success/10 border-success/30',
  deprecated: 'text-warning bg-warning/10 border-warning/30',
};

const METHOD_STATUS_SUGGESTIONS: Record<ApiEndpoint['method'], string[]> = {
  GET:    ['200', '400', '401', '403', '404'],
  POST:   ['201', '400', '401', '403', '409', '422'],
  PUT:    ['200', '400', '401', '403', '404', '422'],
  PATCH:  ['200', '400', '401', '403', '404', '422'],
  DELETE: ['204', '400', '401', '403', '404'],
};

function renderHighlightedPath(path: string) {
  // Split on :param or {param} segments
  const parts = path.split(/(:[a-zA-Z_][a-zA-Z0-9_]*|\{[a-zA-Z_][a-zA-Z0-9_]*\})/g);
  return (
    <>
      {parts.map((part, i) =>
        /^(:[a-zA-Z_]|{)/.test(part)
          ? <span key={i} className="text-warning font-semibold">{part}</span>
          : <Fragment key={i}>{part}</Fragment>
      )}
    </>
  );
}

// Generates realistic mock values based on column name + data type
function generateMockValue(name: string, dataType: string, nullable: boolean, primaryKey: boolean, enumValues?: string): string | number | boolean | null {
  const n = name.toLowerCase();
  // Enum: first value
  if (dataType === 'enum' && enumValues?.trim()) {
    const vals = enumValues.split(',').map((v) => v.trim()).filter(Boolean);
    if (vals.length > 0) return `"${vals[0]}"`;
  }
  // Primary key UUID
  if (primaryKey && (dataType === 'uuid' || n === 'id')) return '"550e8400-e29b-41d4-a716-446655440000"';
  // FK UUID columns (ending in _id)
  if (n.endsWith('_id') && dataType === 'uuid') return '"550e8400-e29b-41d4-a716-446655440001"';
  // Timestamps
  if (n === 'created_at' || n === 'updated_at' || n === 'deleted_at' || n === 'timestamp' || dataType === 'timestamptz' || dataType === 'datetime') return '"2024-01-15T10:30:00Z"';
  if (dataType === 'date' || n === 'date' || n === 'birth_date' || n === 'due_date' || n === 'start_date' || n === 'end_date') return '"2024-01-15"';
  if (dataType === 'time') return '"10:30:00"';
  // Booleans
  if (dataType === 'boolean') {
    if (n.startsWith('is_') || n.startsWith('has_') || n.startsWith('can_') || n.startsWith('show_') || n === 'active' || n === 'enabled' || n === 'verified') return true;
    return false;
  }
  // Numbers
  if (dataType === 'integer' || dataType === 'number' || dataType === 'smallint') {
    if (n.includes('count') || n.includes('quantity') || n.includes('qty')) return 5;
    if (n.includes('age')) return 28;
    if (n.includes('year')) return 2024;
    if (n.includes('sort') || n.includes('order') || n.includes('position') || n.includes('rank')) return 1;
    return 42;
  }
  if (dataType === 'bigint') return 1000000;
  if (dataType === 'float' || dataType === 'decimal' || dataType === 'numeric') {
    if (n.includes('price') || n.includes('cost') || n.includes('amount') || n.includes('total') || n.includes('balance')) return 29.99;
    if (n.includes('lat')) return 40.7128;
    if (n.includes('lng') || n.includes('lon')) return -74.006;
    if (n.includes('rate') || n.includes('percent') || n.includes('ratio')) return 0.95;
    return 1.0;
  }
  // JSON/JSONB
  if (dataType === 'json' || dataType === 'jsonb') {
    if (n.includes('metadata') || n.includes('meta')) return '{}';
    if (n.includes('address')) return '{"street": "123 Main St", "city": "New York", "country": "US"}';
    if (n.includes('settings') || n.includes('config')) return '{"theme": "dark", "notifications": true}';
    if (n.includes('tags')) return '["tag1", "tag2"]';
    return '{}';
  }
  if (dataType === 'array') return '["item1", "item2"]';
  // Nullable returns null
  if (nullable && !primaryKey) {
    if (n.includes('deleted') || n.includes('archived') || n === 'description' || n === 'bio' || n === 'notes' || n === 'note') return null;
  }
  // String fields by name pattern
  if (n === 'id' || n.endsWith('_id')) return '"abc123"';
  if (n === 'uuid' || n === 'guid') return '"550e8400-e29b-41d4-a716-446655440000"';
  if (n === 'email' || n.includes('email')) return '"user@example.com"';
  if (n === 'phone' || n.includes('phone') || n === 'mobile') return '"+1-555-0123"';
  if (n === 'url' || n.includes('url') || n.includes('website') || n.includes('link')) return '"https://example.com"';
  if (n === 'image' || n.includes('image') || n.includes('avatar') || n.includes('photo') || n.includes('thumbnail')) return '"https://picsum.photos/200"';
  if (n === 'name' || n === 'full_name' || n === 'display_name') return '"Jane Doe"';
  if (n === 'first_name' || n === 'firstname') return '"Jane"';
  if (n === 'last_name' || n === 'lastname' || n === 'surname') return '"Doe"';
  if (n === 'username' || n === 'login') return '"jane_doe"';
  if (n.includes('title') || n.includes('headline')) return '"Sample Title"';
  if (n.includes('description') || n.includes('body') || n.includes('content') || n.includes('text') || n.includes('summary')) return '"Sample description text."';
  if (n.includes('bio') || n.includes('about')) return '"Brief bio or about text."';
  if (n.includes('address') || n.includes('street')) return '"123 Main Street"';
  if (n.includes('city')) return '"New York"';
  if (n.includes('state') || n.includes('province') || n.includes('region')) return '"NY"';
  if (n.includes('country')) return '"US"';
  if (n.includes('zip') || n.includes('postal')) return '"10001"';
  if (n.includes('color') || n.includes('colour')) return '"#6366f1"';
  if (n.includes('slug')) return '"sample-slug"';
  if (n.includes('token') || n.includes('key') || n.includes('secret') || n.includes('hash') || n.includes('password')) return '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."';
  if (n.includes('code')) return '"CODE123"';
  if (n.includes('status')) return '"active"';
  if (n.includes('type') || n.includes('kind') || n.includes('category')) return '"default"';
  if (n.includes('role')) return '"user"';
  if (n.includes('currency')) return '"USD"';
  if (n.includes('language') || n.includes('locale')) return '"en"';
  if (n.includes('timezone') || n.includes('tz')) return '"America/New_York"';
  if (n.includes('ip') && !n.includes('ship')) return '"192.168.1.1"';
  // Default string
  return `"${name}"`;
}

function buildQueryString(queryParams: string): string {
  const params = queryParams.split(',').map((p) => p.trim()).filter(Boolean);
  if (!params.length) return '';
  return '?' + params.map((p) => `${p}={${p}}`).join('&');
}

function generateCurl(ep: ApiEndpoint, baseUrl = 'http://localhost:3000'): string {
  const method = ep.method;
  const qs = ep.queryParams?.trim() ? buildQueryString(ep.queryParams) : '';
  const url = `${baseUrl}${ep.path}${qs}`;
  const parts: string[] = [`curl -X ${method} "${url}"`];
  parts.push(`  -H "Content-Type: application/json"`);
  const auth = ep.auth ?? 'none';
  if (auth === 'bearer') parts.push(`  -H "Authorization: Bearer YOUR_TOKEN"`);
  else if (auth === 'apiKey') parts.push(`  -H "X-API-Key: YOUR_KEY"`);
  else if (auth === 'basic') parts.push(`  -u "username:password"`);
  else if (auth === 'oauth2') parts.push(`  -H "Authorization: Bearer YOUR_OAUTH_TOKEN"`);
  if (['POST', 'PUT', 'PATCH'].includes(method) && ep.requestBody?.trim()) {
    const body = ep.requestBody.trim().replace(/\n/g, ' ');
    parts.push(`  -d '${body}'`);
  }
  return parts.join(' \\\n');
}

function generateFetch(ep: ApiEndpoint, baseUrl = 'http://localhost:3000'): string {
  const qs = ep.queryParams?.trim() ? buildQueryString(ep.queryParams) : '';
  const url = `${baseUrl}${ep.path}${qs}`;
  const auth = ep.auth ?? 'none';
  const headers: string[] = [`'Content-Type': 'application/json'`];
  if (auth === 'bearer' || auth === 'oauth2') headers.push(`'Authorization': 'Bearer YOUR_TOKEN'`);
  else if (auth === 'apiKey') headers.push(`'X-API-Key': 'YOUR_KEY'`);
  else if (auth === 'basic') headers.push(`'Authorization': 'Basic ' + btoa('username:password')`);

  const lines: string[] = [];
  lines.push(`const response = await fetch('${url}', {`);
  lines.push(`  method: '${ep.method}',`);
  lines.push(`  headers: {`);
  headers.forEach((h) => lines.push(`    ${h},`));
  lines.push(`  },`);
  if (['POST', 'PUT', 'PATCH'].includes(ep.method) && ep.requestBody?.trim()) {
    lines.push(`  body: JSON.stringify(${ep.requestBody.trim()}),`);
  }
  lines.push(`});`);
  lines.push(`const data = await response.json();`);
  return lines.join('\n');
}

function generatePostmanCollection(
  endpoints: ApiEndpoint[],
  allTagsOrder: string[],
  baseUrl: string,
  projectName: string
): string {
  const grouped: Record<string, ApiEndpoint[]> = {};
  endpoints.forEach((ep) => {
    const tag = ep.tag || UNTAGGED;
    if (!grouped[tag]) grouped[tag] = [];
    grouped[tag].push(ep);
  });

  const items = allTagsOrder
    .filter((tag) => grouped[tag]?.length > 0)
    .map((tag) => ({
      name: tag === UNTAGGED ? 'General' : tag,
      item: grouped[tag].map((ep) => {
        const fullUrl = `${baseUrl}${ep.path}`;
        const auth = ep.auth ?? 'none';
        const headers: Array<{ key: string; value: string }> = [
          { key: 'Content-Type', value: 'application/json' },
        ];
        if (auth === 'bearer' || auth === 'oauth2') headers.push({ key: 'Authorization', value: 'Bearer {{token}}' });
        else if (auth === 'apiKey') headers.push({ key: 'X-API-Key', value: '{{apiKey}}' });
        else if (auth === 'basic') headers.push({ key: 'Authorization', value: 'Basic {{basicAuth}}' });
        const queryParams = ep.queryParams?.trim()
          ? ep.queryParams.split(',').map((p) => p.trim()).filter(Boolean).map((k) => ({ key: k, value: `{{${k}}}`, disabled: false }))
          : [];
        const qs = queryParams.length > 0 ? '?' + queryParams.map((q) => `${q.key}=${q.value}`).join('&') : '';
        return {
          name: `${ep.method} ${ep.path || '/'}`,
          request: {
            method: ep.method,
            header: headers,
            url: { raw: `${fullUrl}${qs}`, query: queryParams.length > 0 ? queryParams : undefined },
            body: ['POST', 'PUT', 'PATCH'].includes(ep.method) && ep.requestBody?.trim()
              ? { mode: 'raw', raw: ep.requestBody, options: { raw: { language: 'json' } } }
              : undefined,
            description: ep.description || undefined,
          },
          response: [],
        };
      }),
    }));

  return JSON.stringify({
    info: { name: projectName, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: items,
  }, null, 2);
}

function generateInsomniaCollection(
  endpoints: ApiEndpoint[],
  allTagsOrder: string[],
  baseUrl: string,
  projectName: string
): string {
  const resources: unknown[] = [];
  const workspaceId = `wrk_${Date.now()}`;
  const baseEnvId = `env_${Date.now()}`;

  // workspace
  resources.push({
    _id: workspaceId,
    _type: 'workspace',
    name: projectName,
    description: '',
    scope: 'collection',
  });

  // base environment with baseUrl variable
  resources.push({
    _id: baseEnvId,
    _type: 'environment',
    parentId: workspaceId,
    name: 'Base Environment',
    data: { base_url: baseUrl },
  });

  // folder per tag
  const folderIds: Record<string, string> = {};
  allTagsOrder.forEach((tag, i) => {
    const folderId = `fld_${i}_${Date.now()}`;
    folderIds[tag] = folderId;
    resources.push({
      _id: folderId,
      _type: 'request_group',
      parentId: workspaceId,
      name: tag === UNTAGGED ? 'General' : tag,
      description: '',
    });
  });

  // requests
  endpoints.forEach((ep, i) => {
    const tag = ep.tag || UNTAGGED;
    const auth = ep.auth ?? 'none';
    const headers: Array<{ name: string; value: string }> = [
      { name: 'Content-Type', value: 'application/json' },
    ];
    if (auth === 'bearer' || auth === 'oauth2') headers.push({ name: 'Authorization', value: 'Bearer {{ _.bearer_token }}' });
    else if (auth === 'apiKey') headers.push({ name: 'X-API-Key', value: '{{ _.api_key }}' });
    else if (auth === 'basic') headers.push({ name: 'Authorization', value: 'Basic {{ _.basic_auth }}' });

    const body = ['POST', 'PUT', 'PATCH'].includes(ep.method) && ep.requestBody?.trim()
      ? { mimeType: 'application/json', text: ep.requestBody.trim() }
      : { mimeType: 'application/json' };

    resources.push({
      _id: `req_${i}_${Date.now()}`,
      _type: 'request',
      parentId: folderIds[tag] ?? workspaceId,
      name: `${ep.method} ${ep.path || '/'}`,
      description: ep.description || '',
      method: ep.method,
      url: `{{ _.base_url }}${ep.path}`,
      headers,
      body,
      parameters: [],
    });
  });

  return JSON.stringify({ _type: 'export', __export_format: 4, resources }, null, 2);
}

function pluralize(name: string): string {
  const lower = name.toLowerCase().replace(/\s+/g, '-');
  if (lower.endsWith('s')) return lower;
  if (lower.endsWith('y') && !/[aeiou]y$/.test(lower)) {
    return lower.slice(0, -1) + 'ies';
  }
  return lower + 's';
}

const CRUD_DEFS = (resource: string, label: string): Array<{ method: ApiEndpoint['method']; path: string; description: string }> => [
  { method: 'GET',    path: `/api/${resource}`,     description: `List all ${label}` },
  { method: 'POST',   path: `/api/${resource}`,     description: `Create ${label}` },
  { method: 'GET',    path: `/api/${resource}/:id`, description: `Get ${label} by ID` },
  { method: 'PUT',    path: `/api/${resource}/:id`, description: `Update ${label}` },
  { method: 'DELETE', path: `/api/${resource}/:id`, description: `Delete ${label}` },
];

export function ApiEndpointsTab() {
  const endpoints = useProjectStore((s) => s.endpoints);
  const addEndpoint = useProjectStore((s) => s.addEndpoint);
  const duplicateEndpoint = useProjectStore((s) => s.duplicateEndpoint);
  const updateEndpoint = useProjectStore((s) => s.updateEndpoint);
  const removeEndpoint = useProjectStore((s) => s.removeEndpoint);
  const reorderEndpoints = useProjectStore((s) => s.reorderEndpoints);
  const entities = useEntityStore((s) => s.entities);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());
  const [addingInTag, setAddingInTag] = useState<string | null>(null);
  const [showCrudGen, setShowCrudGen] = useState(false);
  const [crudEntityId, setCrudEntityId] = useState('');
  const [curlCopiedId, setCurlCopiedId] = useState<string | null>(null);
  const [fetchCopiedId, setFetchCopiedId] = useState<string | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupDraft, setGroupDraft] = useState('');
  const [mdCopied, setMdCopied] = useState(false);

  const handleCopyCurl = async (ep: ApiEndpoint) => {
    try {
      await navigator.clipboard.writeText(generateCurl(ep, baseUrl));
      setCurlCopiedId(ep.id);
      setTimeout(() => setCurlCopiedId(null), 1500);
    } catch { /* clipboard not available */ }
  };

  const handleCopyFetch = async (ep: ApiEndpoint) => {
    try {
      await navigator.clipboard.writeText(generateFetch(ep, baseUrl));
      setFetchCopiedId(ep.id);
      setTimeout(() => setFetchCopiedId(null), 1500);
    } catch { /* clipboard not available */ }
  };

  const copyAllAsMd = async () => {
    const rows: string[] = ['| Method | Path | Description | Auth | Status Codes |', '|--------|------|-------------|------|--------------|'];
    const allTags = Array.from(new Set(endpoints.map((e) => e.tag || UNTAGGED)));
    allTags.forEach((tag) => {
      const group = endpoints.filter((e) => (e.tag || UNTAGGED) === tag);
      if (group.length === 0) return;
      rows.push(`| **${tag === UNTAGGED ? 'General' : tag}** | | | | |`);
      group.forEach((ep) => {
        const auth = ep.auth && ep.auth !== 'none' ? AUTH_LABELS[ep.auth] : '—';
        rows.push(`| \`${ep.method}\` | \`${ep.path || '/'}\` | ${ep.description || ''} | ${auth} | ${ep.statusCodes || ''} |`);
      });
    });
    try {
      await navigator.clipboard.writeText(rows.join('\n'));
      setMdCopied(true);
      setTimeout(() => setMdCopied(false), 1500);
    } catch { /* clipboard not available */ }
  };

  const meta = useProjectStore((s) => s.meta);
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState<'' | ApiEndpoint['method']>('');
  const [filterAuth, setFilterAuth] = useState<'' | AuthScheme>('');
  const [filterEntity, setFilterEntity] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [editingBaseUrl, setEditingBaseUrl] = useState(false);
  const [baseUrlDraft, setBaseUrlDraft] = useState('');
  const [postmanCopied, setPostmanCopied] = useState(false);
  const [insomniacCopied, setInsomniacCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);
  const [filterStatus, setFilterStatus] = useState<'' | EndpointStatus>('');
  const [filterVersion, setFilterVersion] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener('surplan:focus-search', handler);
    return () => window.removeEventListener('surplan:focus-search', handler);
  }, []);

  const toggleTag = (tag: string) =>
    setCollapsedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });

  const hasFilters = search.trim() !== '' || filterMethod !== '' || filterAuth !== '' || filterEntity !== '' || filterStatus !== '' || filterVersion !== '';

  const filteredEndpoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return endpoints.filter((ep) => {
      if (filterMethod && ep.method !== filterMethod) return false;
      if (filterAuth && (ep.auth ?? 'none') !== filterAuth) return false;
      if (filterEntity && ep.entityRef !== filterEntity) return false;
      if (filterStatus && (ep.status ?? 'draft') !== filterStatus) return false;
      if (filterVersion && (ep.version ?? '').trim() !== filterVersion.trim()) return false;
      if (q) {
        return (
          ep.path.toLowerCase().includes(q) ||
          ep.description.toLowerCase().includes(q) ||
          ep.tag.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [endpoints, search, filterMethod, filterAuth, filterEntity, filterStatus, filterVersion]);

  // Collect unique tags preserving order of first appearance
  const allTags = Array.from(
    new Set(endpoints.map((e) => e.tag || UNTAGGED))
  );

  const groups = allTags.map((tag) => ({
    tag,
    label: tag === UNTAGGED ? 'General' : tag,
    endpoints: filteredEndpoints.filter((e) => (e.tag || UNTAGGED) === tag),
  })).filter((g) => !hasFilters || g.endpoints.length > 0);

  // CRUD generation preview
  const crudPreview = useMemo(() => {
    const entity = entities.find((e) => e.id === crudEntityId);
    if (!entity) return null;
    return CRUD_DEFS(pluralize(entity.name), entity.name);
  }, [crudEntityId, entities]);

  const handleGenerateCrud = () => {
    const entity = entities.find((e) => e.id === crudEntityId);
    if (!entity) return;
    const resource = pluralize(entity.name);
    for (const def of CRUD_DEFS(resource, entity.name)) {
      const id = addEndpoint(entity.name);
      updateEndpoint(id, {
        method: def.method,
        path: def.path,
        description: def.description,
        entityRef: entity.id,
      });
    }
    setShowCrudGen(false);
    setCrudEntityId('');
  };

  if (endpoints.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        title="No API endpoints yet"
        description="Document your REST API endpoints with request/response examples."
        action={{ label: 'Add First Endpoint', onClick: () => addEndpoint() }}
      />
    );
  }

  return (
    <div className="max-w-4xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">API Endpoints</h2>
          {endpoints.length > 0 ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-text-muted">{endpoints.length} total · {groups.length} group{groups.length !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-1">
                {METHODS.map((m) => {
                  const n = endpoints.filter((e) => e.method === m).length;
                  if (n === 0) return null;
                  return (
                    <span key={m} className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${METHOD_COLORS[m]}`}>
                      {m[0]}{n}
                    </span>
                  );
                })}
              </div>
              {(() => {
                const implN = endpoints.filter((e) => (e.status ?? 'draft') === 'implemented').length;
                const deprN = endpoints.filter((e) => (e.status ?? 'draft') === 'deprecated').length;
                if (implN === 0 && deprN === 0) return null;
                return (
                  <div className="flex items-center gap-1">
                    {implN > 0 && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border text-success bg-success/10 border-success/30">
                        {implN}/{endpoints.length} impl
                      </span>
                    )}
                    {deprN > 0 && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border text-warning bg-warning/10 border-warning/30">
                        {deprN} depr
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <p className="text-xs text-text-muted mt-0.5">No endpoints yet</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Generate CRUD button */}
          {entities.length > 0 && (
            <button
              type="button"
              onClick={() => { setShowCrudGen((v) => !v); setCrudEntityId(''); }}
              className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                showCrudGen
                  ? 'text-text-primary bg-bg-hover border-border-active'
                  : 'text-text-secondary border-border-default hover:border-border-active hover:text-text-primary'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate CRUD
            </button>
          )}
          {endpoints.length > 0 && (
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setShowExportMenu((v) => !v)}
                className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                  showExportMenu
                    ? 'text-text-primary bg-bg-hover border-border-active'
                    : 'text-text-secondary border-border-default hover:border-border-active hover:text-text-primary'
                }`}
                title="Export: OpenAPI, Postman, Insomnia, Markdown"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
                <svg className="w-3 h-3 text-text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 z-30 bg-bg-secondary border border-border-default rounded-lg shadow-lg py-1 w-44 text-xs">
                  <button
                    type="button"
                    onClick={() => { exportOpenApi(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-text-secondary hover:bg-bg-hover cursor-pointer"
                  >
                    <span className="text-text-muted w-4">📄</span> OpenAPI YAML
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const json = generatePostmanCollection(endpoints, allTags, baseUrl, meta.name || 'API');
                      await navigator.clipboard.writeText(json);
                      setPostmanCopied(true);
                      setTimeout(() => setPostmanCopied(false), 2000);
                      setShowExportMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-bg-hover cursor-pointer ${postmanCopied ? 'text-success' : 'text-text-secondary'}`}
                  >
                    <span className="text-text-muted w-4">📮</span> {postmanCopied ? '✓ Copied!' : 'Postman JSON'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const json = generateInsomniaCollection(endpoints, allTags, baseUrl, meta.name || 'API');
                      await navigator.clipboard.writeText(json);
                      setInsomniacCopied(true);
                      setTimeout(() => setInsomniacCopied(false), 2000);
                      setShowExportMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-bg-hover cursor-pointer ${insomniacCopied ? 'text-success' : 'text-text-secondary'}`}
                  >
                    <span className="text-text-muted w-4">🌙</span> {insomniacCopied ? '✓ Copied!' : 'Insomnia JSON'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { copyAllAsMd(); setShowExportMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-bg-hover cursor-pointer ${mdCopied ? 'text-success' : 'text-text-secondary'}`}
                  >
                    <span className="text-text-muted w-4">📋</span> {mdCopied ? '✓ Copied!' : 'Copy Markdown'}
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => addEndpoint()}
            className="flex items-center gap-1.5 text-xs text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent-muted rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Endpoint
          </button>
        </div>
      </div>

      {/* Search + filter bar */}
      {endpoints.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search endpoints..."
              className="w-full text-xs bg-bg-secondary border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center border border-border-default rounded-lg overflow-hidden">
            {(['', ...METHODS] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFilterMethod(m as '' | ApiEndpoint['method'])}
                className={`text-[10px] font-bold px-2 py-1.5 transition-colors cursor-pointer border-r border-border-default last:border-r-0 ${
                  filterMethod === m
                    ? m === '' ? 'bg-bg-hover text-text-primary' : `${METHOD_COLORS[m as ApiEndpoint['method']]} opacity-100`
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {m === '' ? 'ALL' : m}
              </button>
            ))}
          </div>
          {/* Auth filter */}
          {endpoints.some((e) => (e.auth ?? 'none') !== 'none') && (
            <select
              value={filterAuth}
              onChange={(e) => setFilterAuth(e.target.value as '' | AuthScheme)}
              className={`text-[10px] border rounded-full px-2.5 py-1 outline-none cursor-pointer transition-colors ${
                filterAuth
                  ? 'bg-accent-muted text-accent border-accent/30'
                  : 'bg-bg-secondary text-text-muted border-border-default'
              }`}
            >
              <option value="">All auth</option>
              <option value="none">No auth</option>
              <option value="bearer">Bearer</option>
              <option value="apiKey">API Key</option>
              <option value="basic">Basic</option>
              <option value="oauth2">OAuth2</option>
            </select>
          )}
          {/* Entity filter */}
          {entities.some((e) => endpoints.some((ep) => ep.entityRef === e.id)) && (
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className={`text-[10px] border rounded-full px-2.5 py-1 outline-none cursor-pointer transition-colors ${
                filterEntity
                  ? 'bg-accent-muted text-accent border-accent/30'
                  : 'bg-bg-secondary text-text-muted border-border-default'
              }`}
            >
              <option value="">All entities</option>
              {entities.filter((e) => endpoints.some((ep) => ep.entityRef === e.id)).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          )}
          {/* Status filter */}
          {endpoints.some((e) => e.status && e.status !== 'draft') && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as '' | EndpointStatus)}
              className={`text-[10px] border rounded-full px-2.5 py-1 outline-none cursor-pointer transition-colors ${
                filterStatus
                  ? 'bg-accent-muted text-accent border-accent/30'
                  : 'bg-bg-secondary text-text-muted border-border-default'
              }`}
            >
              <option value="">All status</option>
              <option value="draft">Draft</option>
              <option value="implemented">Implemented</option>
              <option value="deprecated">Deprecated</option>
            </select>
          )}
          {/* Version filter */}
          {(() => {
            const versions = [...new Set(endpoints.map((e) => e.version?.trim()).filter(Boolean) as string[])].sort();
            if (versions.length < 2) return null;
            return (
              <select
                value={filterVersion}
                onChange={(e) => setFilterVersion(e.target.value)}
                className={`text-[10px] border rounded-full px-2.5 py-1 outline-none cursor-pointer transition-colors font-mono ${
                  filterVersion
                    ? 'bg-accent-muted text-accent border-accent/30'
                    : 'bg-bg-secondary text-text-muted border-border-default'
                }`}
              >
                <option value="">All versions</option>
                {versions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            );
          })()}
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearch(''); setFilterMethod(''); setFilterAuth(''); setFilterEntity(''); setFilterStatus(''); setFilterVersion(''); }}
              className="text-xs text-text-muted hover:text-text-secondary px-2 py-1.5 rounded transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Stats bar */}
      {endpoints.length > 0 && !hasFilters && (() => {
        const byMethod = METHODS.map((m) => ({ m, n: endpoints.filter((e) => e.method === m).length })).filter((x) => x.n > 0);
        const implCount = endpoints.filter((e) => e.status === 'implemented').length;
        const deprCount = endpoints.filter((e) => e.status === 'deprecated').length;
        const authCount = endpoints.filter((e) => (e.auth ?? 'none') !== 'none').length;
        return (
          <div className="flex items-center gap-3 text-[10px] text-text-muted flex-wrap px-1">
            <span className="font-medium text-text-secondary">{endpoints.length} total</span>
            {byMethod.map(({ m, n }) => (
              <span key={m} className={`font-mono font-bold ${METHOD_COLORS[m]}`}>{m} ×{n}</span>
            ))}
            {implCount > 0 && <span className="text-success">✓ {implCount} impl</span>}
            {deprCount > 0 && <span className="text-warning">~ {deprCount} depr</span>}
            {authCount > 0 && <span className="text-accent">🔑 {authCount} auth</span>}
          </div>
        );
      })()}

      {/* CRUD Generator Panel */}
      {showCrudGen && (
        <div className="bg-bg-secondary border border-border-active rounded-lg p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs font-semibold text-text-primary">Generate CRUD Endpoints</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-text-muted flex-shrink-0">Entity</label>
            <select
              value={crudEntityId}
              onChange={(e) => setCrudEntityId(e.target.value)}
              autoFocus
              className="flex-1 text-xs bg-bg-primary border border-border-default rounded px-2 py-1.5 text-text-primary outline-none focus:border-border-focus cursor-pointer"
            >
              <option value="">Select an entity…</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {crudPreview && (
            <div className="bg-bg-primary border border-border-default rounded-lg overflow-hidden">
              <p className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium px-3 py-1.5 border-b border-border-default">
                Will generate {crudPreview.length} endpoints
              </p>
              {crudPreview.map((def, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-1.5 border-b border-border-default last:border-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 w-14 text-center ${METHOD_COLORS[def.method]}`}>
                    {def.method}
                  </span>
                  <span className="text-xs font-mono text-text-secondary flex-1">{def.path}</span>
                  <span className="text-[11px] text-text-muted hidden sm:block">{def.description}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowCrudGen(false); setCrudEntityId(''); }}
              className="text-xs text-text-muted hover:text-text-secondary px-3 py-1.5 rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateCrud}
              disabled={!crudEntityId}
              className="flex items-center gap-1.5 text-xs text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent-muted rounded-lg px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate {crudPreview ? `${crudPreview.length} Endpoints` : 'Endpoints'}
            </button>
          </div>
        </div>
      )}

      {/* No results when filtering */}
      {endpoints.length > 0 && hasFilters && filteredEndpoints.length === 0 && (
        <div className="text-center py-12 text-text-muted text-sm">
          No endpoints match your filters
        </div>
      )}

      {/* Tag groups */}
      <div className="space-y-3">
          {groups.map(({ tag, label, endpoints: groupEps }) => {
            const isCollapsed = collapsedTags.has(tag);
            return (
              <div key={tag} className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
                {/* Group header */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5 border-b border-border-default cursor-pointer hover:bg-bg-hover transition-colors select-none group"
                  onClick={() => toggleTag(tag)}
                >
                  <svg
                    className={`w-3 h-3 text-text-muted transition-transform flex-shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="text-xs font-semibold text-text-primary flex-1">{label}</span>
                  <span className="text-[10px] text-text-muted">{groupEps.length}</span>
                  {/* Add endpoint in this group */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addEndpoint(tag === UNTAGGED ? '' : tag); }}
                    title={`Add endpoint to ${label}`}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent transition-colors cursor-pointer flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Endpoints */}
                {!isCollapsed && (
                  <div>
                    {groupEps.map((ep) => {
                      const isExpanded = expandedId === ep.id;
                      return (
                        <div
                          key={ep.id}
                          className="border-b border-border-default last:border-0 hover:bg-bg-hover/50 transition-colors"
                        >
                          {/* Main row */}
                          <div className="flex items-center gap-3 px-4 py-2.5 group/row">
                            {/* Method selector */}
                            <select
                              value={ep.method}
                              onChange={(e) => updateEndpoint(ep.id, { method: e.target.value as ApiEndpoint['method'] })}
                              className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer border-0 outline-none w-16 text-center flex-shrink-0 ${METHOD_COLORS[ep.method]}`}
                            >
                              {METHODS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>

                            {/* Path */}
                            <div className={`flex-1 min-w-0 ${(ep.status ?? 'draft') === 'deprecated' ? 'opacity-50' : ''}`}>
                              <InlineEdit
                                value={ep.path}
                                onSave={(v) => updateEndpoint(ep.id, { path: v })}
                                className="text-xs font-mono text-text-primary truncate block"
                                placeholder="/api/resource/:id"
                                renderDisplay={renderHighlightedPath}
                              />
                            </div>

                            {/* Description */}
                            <div className="w-48 hidden md:block">
                              <InlineEdit
                                value={ep.description}
                                onSave={(v) => updateEndpoint(ep.id, { description: v })}
                                className="text-xs text-text-muted truncate block"
                                placeholder="Description..."
                              />
                            </div>

                            {/* Tag */}
                            <div className="w-24 hidden lg:block">
                              <InlineEdit
                                value={ep.tag}
                                onSave={(v) => updateEndpoint(ep.id, { tag: v })}
                                className="text-[10px] text-text-muted truncate block"
                                placeholder="tag..."
                              />
                            </div>

                            {/* Auth scheme */}
                            <select
                              value={ep.auth ?? 'none'}
                              onChange={(e) => updateEndpoint(ep.id, { auth: e.target.value as AuthScheme })}
                              title="Auth scheme"
                              className={`text-[10px] bg-bg-tertiary border border-border-default rounded px-1.5 py-1 outline-none cursor-pointer hidden lg:block flex-shrink-0 ${AUTH_COLORS[ep.auth ?? 'none']}`}
                            >
                              {(Object.keys(AUTH_LABELS) as AuthScheme[]).map((a) => (
                                <option key={a} value={a}>{AUTH_LABELS[a]}</option>
                              ))}
                            </select>

                            {/* Entity ref */}
                            <select
                              value={ep.entityRef ?? ''}
                              onChange={(e) => updateEndpoint(ep.id, { entityRef: e.target.value || null })}
                              className="text-[10px] bg-bg-tertiary border border-border-default rounded px-1.5 py-1 text-text-secondary outline-none cursor-pointer hidden xl:block"
                            >
                              <option value="">No entity</option>
                              {entities.map((e) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                            </select>

                            {/* Query params indicator */}
                            {ep.queryParams?.trim() && !isExpanded && (
                              <span
                                title={`Query params: ${ep.queryParams}`}
                                className="hidden xl:inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-bg-tertiary border border-border-default text-text-muted flex-shrink-0 font-mono"
                              >
                                ?{ep.queryParams.split(',').filter(Boolean).length}
                              </span>
                            )}

                            {/* Status badge (only if non-draft) */}
                            {ep.status && ep.status !== 'draft' && (
                              <span
                                className={`hidden xl:inline-flex text-[9px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${ENDPOINT_STATUS_COLORS[ep.status]}`}
                              >
                                {ENDPOINT_STATUS_LABELS[ep.status]}
                              </span>
                            )}

                            {/* Version badge */}
                            {ep.version?.trim() && (
                              <span className="hidden xl:inline-flex text-[9px] px-1.5 py-0.5 rounded border border-accent/25 bg-accent/5 text-accent font-mono flex-shrink-0">
                                {ep.version.trim()}
                              </span>
                            )}

                            {/* Reorder arrows */}
                            {!hasFilters && (
                              <div className="flex flex-col opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const idx = endpoints.findIndex((e) => e.id === ep.id);
                                    if (idx > 0) reorderEndpoints(ep.id, endpoints[idx - 1].id);
                                  }}
                                  disabled={endpoints.findIndex((e) => e.id === ep.id) === 0}
                                  title="Move up"
                                  className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const idx = endpoints.findIndex((e) => e.id === ep.id);
                                    if (idx < endpoints.length - 1) reorderEndpoints(ep.id, endpoints[idx + 1].id);
                                  }}
                                  disabled={endpoints.findIndex((e) => e.id === ep.id) === endpoints.length - 1}
                                  title="Move down"
                                  className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            )}

                            {/* Duplicate endpoint */}
                            <button
                              type="button"
                              onClick={() => duplicateEndpoint(ep.id)}
                              className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer opacity-0 group-hover/row:opacity-100 flex-shrink-0"
                              title="Duplicate endpoint"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>

                            {/* Expand toggle */}
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : ep.id)}
                              className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer opacity-0 group-hover/row:opacity-100 flex-shrink-0"
                              title={isExpanded ? 'Collapse' : 'Show request/response'}
                            >
                              <svg
                                className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {/* Delete */}
                            <div className="opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
                              <IconButton onClick={() => removeEndpoint(ep.id)} variant="danger" title="Delete endpoint">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </IconButton>
                            </div>
                          </div>

                          {/* Expanded: request / response body + meta */}
                          {isExpanded && (
                            <div className="border-t border-border-default animate-fade-in">
                              {/* Implementation status */}
                              <div className="flex items-center gap-4 px-4 py-2 border-b border-border-default bg-bg-primary/50">
                                <label className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium w-24 flex-shrink-0">Status</label>
                                <div className="flex items-center gap-1.5">
                                  {(['draft', 'implemented', 'deprecated'] as const).map((s) => {
                                    const current = ep.status ?? 'draft';
                                    return (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => updateEndpoint(ep.id, { status: s })}
                                        className={`text-[9px] px-2.5 py-1 rounded border cursor-pointer transition-colors font-medium ${
                                          current === s
                                            ? ENDPOINT_STATUS_COLORS[s]
                                            : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary'
                                        }`}
                                      >
                                        {s === 'draft' ? 'Draft' : s === 'implemented' ? '✓ Implemented' : '~ Deprecated'}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              {/* Meta row: status codes */}
                              <div className="flex items-start gap-4 px-4 py-2 border-b border-border-default bg-bg-primary/50">
                                <label className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium w-24 flex-shrink-0 mt-1">Status Codes</label>
                                <div className="flex-1 space-y-1.5">
                                  <input
                                    type="text"
                                    value={ep.statusCodes ?? ''}
                                    onChange={(e) => updateEndpoint(ep.id, { statusCodes: e.target.value })}
                                    placeholder="200, 201, 400, 404"
                                    className="w-full max-w-xs text-xs font-mono bg-transparent border-b border-border-default focus:border-border-focus outline-none text-text-secondary py-0.5 placeholder:text-text-placeholder"
                                  />
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {METHOD_STATUS_SUGGESTIONS[ep.method].map((code) => {
                                      const current = (ep.statusCodes ?? '').split(',').map((s) => s.trim());
                                      const active = current.includes(code);
                                      return (
                                        <button
                                          key={code}
                                          type="button"
                                          onClick={() => {
                                            const codes = (ep.statusCodes ?? '').split(',').map((s) => s.trim()).filter(Boolean);
                                            const next = active
                                              ? codes.filter((c) => c !== code)
                                              : [...codes, code];
                                            updateEndpoint(ep.id, { statusCodes: next.sort((a, b) => parseInt(a) - parseInt(b)).join(', ') });
                                          }}
                                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer transition-colors border ${
                                            active
                                              ? 'bg-accent-muted text-accent border-accent/40'
                                              : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary'
                                          }`}
                                        >
                                          {code}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              {/* Query params */}
                              <div className="flex items-start gap-4 px-4 py-2 border-b border-border-default bg-bg-primary/50">
                                <label className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium w-24 flex-shrink-0 mt-1">Query Params</label>
                                <div className="flex-1 space-y-1">
                                  <input
                                    type="text"
                                    value={ep.queryParams ?? ''}
                                    onChange={(e) => updateEndpoint(ep.id, { queryParams: e.target.value })}
                                    placeholder="page, limit, sort, filter, search"
                                    className="w-full max-w-sm text-xs font-mono bg-transparent border-b border-border-default focus:border-border-focus outline-none text-text-secondary py-0.5 placeholder:text-text-placeholder"
                                  />
                                  {ep.method === 'GET' && !(ep.queryParams ?? '').trim() && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {['page', 'limit', 'sort', 'order', 'search', 'filter', 'cursor', 'before', 'after', 'include'].map((p) => (
                                        <button
                                          key={p}
                                          type="button"
                                          onClick={() => {
                                            const cur = (ep.queryParams ?? '').split(',').map((s) => s.trim()).filter(Boolean);
                                            if (!cur.includes(p)) updateEndpoint(ep.id, { queryParams: [...cur, p].join(', ') });
                                          }}
                                          className="text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer transition-colors border text-text-muted border-border-default hover:border-border-active hover:text-text-secondary"
                                        >
                                          {p}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Version */}
                              <div className="flex items-center gap-4 px-4 py-2 border-b border-border-default bg-bg-primary/50">
                                <label className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium w-24 flex-shrink-0">Version</label>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <input
                                    type="text"
                                    value={ep.version ?? ''}
                                    onChange={(e) => updateEndpoint(ep.id, { version: e.target.value })}
                                    placeholder="e.g. v1, v2, 2024-01"
                                    className="w-36 text-xs font-mono bg-transparent border-b border-border-default focus:border-border-focus outline-none text-text-secondary py-0.5 placeholder:text-text-placeholder"
                                  />
                                  {!ep.version?.trim() && (
                                    <div className="flex items-center gap-1">
                                      {['v1', 'v2', 'v3', 'beta'].map((v) => (
                                        <button
                                          key={v}
                                          type="button"
                                          onClick={() => updateEndpoint(ep.id, { version: v })}
                                          className="text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer border text-text-muted border-border-default hover:border-border-active hover:text-text-secondary"
                                        >
                                          {v}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Rate limit */}
                              <div className="flex items-start gap-4 px-4 py-2 border-b border-border-default bg-bg-primary/50">
                                <label className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium w-24 flex-shrink-0 mt-1">Rate Limit</label>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <input
                                    type="text"
                                    value={ep.rateLimit ?? ''}
                                    onChange={(e) => updateEndpoint(ep.id, { rateLimit: e.target.value })}
                                    placeholder="e.g. 100/min"
                                    className="w-36 text-xs font-mono bg-transparent border-b border-border-default focus:border-border-focus outline-none text-text-secondary py-0.5 placeholder:text-text-placeholder"
                                  />
                                  {!ep.rateLimit?.trim() && (
                                    <div className="flex items-center gap-1">
                                      {['60/min', '100/min', '1000/hour', '10000/day'].map((rl) => (
                                        <button
                                          key={rl}
                                          type="button"
                                          onClick={() => updateEndpoint(ep.id, { rateLimit: rl })}
                                          className="text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer border text-text-muted border-border-default hover:border-border-active hover:text-text-secondary"
                                        >
                                          {rl}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-0">
                                <div className="p-3 border-r border-border-default">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium">Request Body</p>
                                    {['POST', 'PUT', 'PATCH'].includes(ep.method) && ep.entityRef && (() => {
                                      const ent = entities.find((e) => e.id === ep.entityRef);
                                      if (!ent) return null;
                                      const AUTO_FIELDS = new Set(['created_at', 'updated_at', 'deleted_at']);
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const writableColumns = ent.columns.filter(
                                              (c) => !c.primaryKey && !AUTO_FIELDS.has(c.name)
                                            );
                                            const shape = Object.fromEntries(
                                              writableColumns.map((c) => {
                                                const raw = generateMockValue(c.name, c.dataType, c.nullable, c.primaryKey, c.enumValues);
                                                const val = typeof raw === 'string' && raw.startsWith('"') ? raw.slice(1, -1) : raw;
                                                return [c.name, val];
                                              })
                                            );
                                            updateEndpoint(ep.id, { requestBody: JSON.stringify(shape, null, 2) });
                                          }}
                                          className="text-[9px] text-accent hover:text-accent/80 cursor-pointer transition-colors"
                                          title={`Generate from ${ent.name} schema (writable fields only)`}
                                        >
                                          Generate ↓
                                        </button>
                                      );
                                    })()}
                                  </div>
                                  <textarea
                                    value={ep.requestBody}
                                    onChange={(e) => updateEndpoint(ep.id, { requestBody: e.target.value })}
                                    placeholder={'{\n  "name": "string"\n}'}
                                    rows={5}
                                    className="w-full text-[11px] font-mono bg-bg-primary border border-border-default rounded px-2 py-1.5 text-text-secondary outline-none focus:border-border-focus resize-none placeholder:text-text-placeholder"
                                  />
                                </div>
                                <div className="p-3">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium">Response Body</p>
                                    {ep.entityRef && (() => {
                                      const ent = entities.find((e) => e.id === ep.entityRef);
                                      if (!ent) return null;
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const shape = Object.fromEntries(
                                              ent.columns.map((c) => {
                                                const raw = generateMockValue(c.name, c.dataType, c.nullable, c.primaryKey, c.enumValues);
                                                const val = typeof raw === 'string' && raw.startsWith('"') ? raw.slice(1, -1) : raw;
                                                return [c.name, val];
                                              })
                                            );
                                            const isListEndpoint = !ep.path.match(/:[a-zA-Z_]|{[a-zA-Z_]/);
                                            const body = isListEndpoint && ep.method === 'GET'
                                              ? JSON.stringify([shape], null, 2)
                                              : JSON.stringify(shape, null, 2);
                                            updateEndpoint(ep.id, { responseBody: body });
                                          }}
                                          className="text-[9px] text-accent hover:text-accent/80 cursor-pointer transition-colors"
                                          title={`Generate from ${ent.name} schema`}
                                        >
                                          Generate ↓
                                        </button>
                                      );
                                    })()}
                                  </div>
                                  <textarea
                                    value={ep.responseBody}
                                    onChange={(e) => updateEndpoint(ep.id, { responseBody: e.target.value })}
                                    placeholder={'{\n  "id": "uuid",\n  "name": "string"\n}'}
                                    rows={5}
                                    className="w-full text-[11px] font-mono bg-bg-primary border border-border-default rounded px-2 py-1.5 text-text-secondary outline-none focus:border-border-focus resize-none placeholder:text-text-placeholder"
                                  />
                                </div>
                              </div>
                              {/* Notes / implementation caveats */}
                              <div className="border-t border-border-default px-4 py-2 bg-bg-primary/30">
                                <div className="flex items-start gap-3">
                                  <label className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium w-24 flex-shrink-0 mt-1.5">Notes</label>
                                  <textarea
                                    value={ep.notes ?? ''}
                                    onChange={(e) => updateEndpoint(ep.id, { notes: e.target.value })}
                                    placeholder="Implementation notes, caveats, rate limits, pagination details..."
                                    rows={2}
                                    className="flex-1 text-[11px] bg-transparent border border-transparent focus:border-border-default rounded px-1 py-1 text-text-muted outline-none focus:text-text-secondary resize-none placeholder:text-text-placeholder transition-colors"
                                  />
                                </div>
                              </div>
                              {/* Code snippets */}
                              <div className="border-t border-border-default bg-bg-primary/30 p-3 space-y-2">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <span className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium">Code Snippets</span>
                                  {/* Base URL config */}
                                  <div className="flex items-center gap-1 text-[10px] text-text-muted">
                                    <span className="flex-shrink-0">Base:</span>
                                    {editingBaseUrl ? (
                                      <input
                                        autoFocus
                                        value={baseUrlDraft}
                                        onChange={(e) => setBaseUrlDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') { setBaseUrl(baseUrlDraft.trim() || 'http://localhost:3000'); setEditingBaseUrl(false); }
                                          if (e.key === 'Escape') setEditingBaseUrl(false);
                                        }}
                                        onBlur={() => { setBaseUrl(baseUrlDraft.trim() || 'http://localhost:3000'); setEditingBaseUrl(false); }}
                                        className="text-[10px] font-mono bg-bg-primary border border-border-focus rounded px-1.5 py-0.5 text-text-primary outline-none w-44"
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => { setBaseUrlDraft(baseUrl); setEditingBaseUrl(true); }}
                                        className="font-mono text-accent hover:underline cursor-pointer"
                                        title="Click to edit base URL"
                                      >
                                        {baseUrl}
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCurl(ep)}
                                    className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                      curlCopiedId === ep.id
                                        ? 'text-success border-success/40 bg-success/10'
                                        : 'text-text-muted border-border-default hover:text-text-secondary hover:border-border-active'
                                    }`}
                                  >
                                    {curlCopiedId === ep.id ? '✓ Copied' : 'Copy curl'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyFetch(ep)}
                                    className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                      fetchCopiedId === ep.id
                                        ? 'text-success border-success/40 bg-success/10'
                                        : 'text-text-muted border-border-default hover:text-text-secondary hover:border-border-active'
                                    }`}
                                  >
                                    {fetchCopiedId === ep.id ? '✓ Copied' : 'Copy fetch'}
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-[9px] text-text-muted/70 mb-1 font-medium uppercase tracking-wide">curl</p>
                                    <pre className="text-[10px] font-mono text-text-secondary bg-bg-primary border border-border-default rounded px-2.5 py-2 overflow-x-auto whitespace-pre leading-relaxed">{generateCurl(ep, baseUrl)}</pre>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-text-muted/70 mb-1 font-medium uppercase tracking-wide">fetch</p>
                                    <pre className="text-[10px] font-mono text-text-secondary bg-bg-primary border border-border-default rounded px-2.5 py-2 overflow-x-auto whitespace-pre leading-relaxed">{generateFetch(ep, baseUrl)}</pre>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add endpoint inline in this group */}
                    {addingInTag === tag ? (
                      <div className="px-4 py-2 border-t border-border-default flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          placeholder="/api/new-endpoint"
                          className="flex-1 text-xs font-mono bg-transparent outline-none text-text-primary placeholder:text-text-placeholder"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const ep = addEndpoint(tag === UNTAGGED ? '' : tag);
                              updateEndpoint(ep, { path: (e.target as HTMLInputElement).value || '/api/' });
                              setAddingInTag(null);
                            }
                            if (e.key === 'Escape') setAddingInTag(null);
                          }}
                          onBlur={() => setAddingInTag(null)}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingInTag(tag)}
                        className="w-full text-left px-4 py-2 text-xs text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add endpoint
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add new tagged group */}
          {addingGroup ? (
            <div className="flex items-center gap-2 px-4 py-3 border border-dashed border-border-active rounded-lg bg-bg-secondary animate-fade-in">
              <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h6" />
              </svg>
              <input
                autoFocus
                type="text"
                value={groupDraft}
                onChange={(e) => setGroupDraft(e.target.value)}
                placeholder="Group name (e.g. Users, Auth, Products)"
                className="flex-1 text-xs bg-transparent outline-none text-text-primary placeholder:text-text-placeholder"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const name = groupDraft.trim();
                    if (name) addEndpoint(name);
                    setGroupDraft('');
                    setAddingGroup(false);
                  }
                  if (e.key === 'Escape') { setGroupDraft(''); setAddingGroup(false); }
                }}
                onBlur={() => {
                  const name = groupDraft.trim();
                  if (name) addEndpoint(name);
                  setGroupDraft('');
                  setAddingGroup(false);
                }}
              />
              <span className="text-[10px] text-text-muted flex-shrink-0">Enter to confirm</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingGroup(true)}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs text-text-muted hover:text-text-secondary border border-dashed border-border-default rounded-lg hover:border-border-active transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New group
            </button>
          )}
        </div>
    </div>
  );
}
