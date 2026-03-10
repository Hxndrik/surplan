import { deflateSync, inflateSync } from 'fflate';
import { useEntityStore } from '../store/useEntityStore';
import { useProjectStore } from '../store/useProjectStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { useProjectsStore } from '../store/useProjectsStore';
import type { BackupData } from './backup';

const HASH_PREFIX = 'sp1';
const MAX_HASH_LENGTH = 1_500_000; // ~1.5 MB

// --- base64url helpers (RFC 4648 §5, no padding) ---

function toBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// --- Encode / Decode ---

export function encodeStateToHash(): string {
  const es = useEntityStore.getState();
  const ps = useProjectStore.getState();

  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projectName: ps.meta.name || 'Untitled Project',
    entities: es.entities,
    meta: ps.meta,
    features: ps.features,
    milestones: ps.milestones,
    scope: ps.scope,
    endpoints: ps.endpoints,
  };

  const json = JSON.stringify(data);
  const compressed = deflateSync(new TextEncoder().encode(json));
  const encoded = HASH_PREFIX + toBase64url(compressed);

  if (encoded.length > MAX_HASH_LENGTH) {
    throw new Error('Project too large for URL sharing. Use Backup instead.');
  }

  return encoded;
}

export function decodeHashToState(hash: string): BackupData | null {
  try {
    if (!hash.startsWith(HASH_PREFIX)) return null;
    const payload = hash.slice(HASH_PREFIX.length);
    const compressed = fromBase64url(payload);
    const json = new TextDecoder().decode(inflateSync(compressed));
    const data = JSON.parse(json) as BackupData;

    if (!data.version || !data.entities || !data.meta) return null;
    return data;
  } catch {
    return null;
  }
}

export function generateShareUrl(): string {
  const hash = encodeStateToHash();
  return `${window.location.origin}/app#${hash}`;
}

// --- Apply shared data ---

export function applySharedData(data: BackupData, mode: 'new' | 'replace'): void {
  if (mode === 'new') {
    const name = data.projectName || data.meta.name || 'Shared Project';
    useProjectsStore.getState().createProject(name);
  }

  // Apply data to current stores (either the newly created project or the existing one)
  useHistoryStore.setState({ isReverting: true, past: [], future: [] });

  useEntityStore.setState({ entities: data.entities ?? [] });
  useProjectStore.setState({
    meta: data.meta,
    features: data.features ?? [],
    milestones: data.milestones ?? [],
    scope: data.scope ?? [],
    endpoints: data.endpoints ?? [],
  });

  if (mode === 'replace') {
    useProjectsStore.getState().syncActiveProjectName();
  }

  Promise.resolve().then(() => useHistoryStore.setState({ isReverting: false }));
}
