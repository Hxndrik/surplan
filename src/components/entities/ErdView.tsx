import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { Entity } from '../../types';
import { useUIStore } from '../../store/useUIStore';

interface ErdViewProps {
  entities: Entity[];
  onEntityFocus?: (entityId: string) => void;
}

const CARD_WIDTH = 200;
const CARD_HEADER_HEIGHT = 40;
const ROW_HEIGHT = 22;
const CARD_PAD = 24;

function getCardHeight(entity: Entity) {
  return CARD_HEADER_HEIGHT + entity.columns.length * ROW_HEIGHT + CARD_PAD;
}

const LAYOUT_XGAP = 260;
const LAYOUT_YGAP = 32;
const LAYOUT_PAD = 20;

// FK-aware topological layout: referenced (master) entities come first
function autoLayoutFK(entities: Entity[]): Map<string, { x: number; y: number }> {
  if (entities.length === 0) return new Map();

  // deps.get(A) = set of entity IDs that A has FK columns pointing to
  const deps = new Map<string, Set<string>>();
  entities.forEach((e) => deps.set(e.id, new Set()));
  entities.forEach((e) => {
    e.columns.forEach((c) => {
      if (c.references && c.references.entityId !== e.id && deps.has(c.references.entityId)) {
        deps.get(e.id)!.add(c.references.entityId);
      }
    });
  });

  // Assign levels: level 0 = no FK refs (master/root tables), higher = depend on lower
  const levels = new Map<string, number>();
  entities.filter((e) => deps.get(e.id)!.size === 0).forEach((e) => levels.set(e.id, 0));

  // Iterative longest-path assignment
  let changed = true;
  let iterations = 0;
  while (changed && iterations++ < 50) {
    changed = false;
    entities.forEach((e) => {
      const d = deps.get(e.id)!;
      if (d.size === 0) return;
      let maxLevel = -1;
      let allResolved = true;
      d.forEach((depId) => {
        if (levels.has(depId)) maxLevel = Math.max(maxLevel, levels.get(depId)!);
        else allResolved = false;
      });
      if (allResolved && maxLevel >= 0) {
        const newLevel = maxLevel + 1;
        if (!levels.has(e.id) || levels.get(e.id)! < newLevel) {
          levels.set(e.id, newLevel);
          changed = true;
        }
      }
    });
  }
  // Assign level 0 to any remaining (circular refs or isolated)
  entities.forEach((e) => { if (!levels.has(e.id)) levels.set(e.id, 0); });

  // Group by level, preserving entity order within each level
  const byLevel = new Map<number, string[]>();
  entities.forEach((e) => {
    const lv = levels.get(e.id)!;
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv)!.push(e.id);
  });

  const positions = new Map<string, { x: number; y: number }>();
  byLevel.forEach((ids, level) => {
    let y = LAYOUT_PAD;
    ids.forEach((id) => {
      positions.set(id, { x: level * LAYOUT_XGAP + LAYOUT_PAD, y });
      const entity = entities.find((ent) => ent.id === id);
      if (entity) y += getCardHeight(entity) + LAYOUT_YGAP;
    });
  });

  return positions;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const SCALE_STEP = 0.15;

const MM_W = 160;
const MM_H = 100;

export function ErdView({ entities, onEntityFocus }: ErdViewProps) {
  const storedPositions = useUIStore((s) => s.erdPositions);
  const setErdPositions = useUIStore((s) => s.setErdPositions);

  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(() => {
    const initial = autoLayoutFK(entities);
    // Overlay persisted positions for known entities
    Object.entries(storedPositions).forEach(([id, pos]) => {
      if (initial.has(id)) initial.set(id, pos);
    });
    return initial;
  });
  // Keep a ref so callbacks can read latest positions without stale closure issues
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredEdgeIdx, setHoveredEdgeIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [erdSearch, setErdSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const erdSearchRef = useRef<HTMLInputElement>(null);

  // Handle Ctrl+F in ERD view
  useEffect(() => {
    const handler = () => {
      erdSearchRef.current?.focus();
      erdSearchRef.current?.select();
    };
    window.addEventListener('surplan:focus-search', handler);
    return () => window.removeEventListener('surplan:focus-search', handler);
  }, []);

  // Keyboard zoom shortcuts: + / - / Ctrl+0
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '=' || (e.key === '+')) {
        e.preventDefault();
        setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)));
      } else if (e.key === '-') {
        e.preventDefault();
        setScale((s) => Math.max(0.2, +(s - 0.1).toFixed(2)));
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setScale(1); setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const erdQ = erdSearch.trim().toLowerCase();
  const matchedEntityIds = useMemo(() => {
    if (!erdQ) return new Set<string>();
    return new Set(
      entities
        .filter(
          (e) =>
            e.name.toLowerCase().includes(erdQ) ||
            e.columns.some((c) => c.name.toLowerCase().includes(erdQ))
        )
        .map((e) => e.id)
    );
  }, [entities, erdQ]);

  // Pan to first match when search changes
  useEffect(() => {
    if (!erdQ || matchedEntityIds.size === 0 || !containerRef.current) return;
    const firstId = [...matchedEntityIds][0];
    const pos = positions.get(firstId);
    if (!pos) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    setPan({
      x: width / 2 - (pos.x + CARD_WIDTH / 2) * scale,
      y: height / 2 - (pos.y + CARD_HEADER_HEIGHT / 2) * scale,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [erdQ, matchedEntityIds]);

  // Recalculate layout if entity count changes (new entities added)
  useMemo(() => {
    setPositions((prev) => {
      const updated = new Map(prev);
      entities.forEach((e) => {
        if (!updated.has(e.id)) {
          const cols = Math.max(1, Math.ceil(Math.sqrt(entities.length)));
          const idx = entities.findIndex((x) => x.id === e.id);
          updated.set(e.id, {
            x: (idx % cols) * 260 + 20,
            y: Math.floor(idx / cols) * 220 + 20,
          });
        }
      });
      for (const key of updated.keys()) {
        if (!entities.find((e) => e.id === key)) updated.delete(key);
      }
      return updated;
    });
  }, [entities]);

  // Calculate canvas size
  const canvasWidth = useMemo(() => {
    let maxX = 600;
    positions.forEach((p) => { maxX = Math.max(maxX, p.x + CARD_WIDTH + 40); });
    return maxX;
  }, [positions]);

  const canvasHeight = useMemo(() => {
    let maxY = 400;
    entities.forEach((e) => {
      const p = positions.get(e.id);
      if (p) maxY = Math.max(maxY, p.y + getCardHeight(e) + 40);
    });
    return maxY;
  }, [entities, positions]);

  const handleCardMouseDown = useCallback(
    (e: React.MouseEvent, entityId: string) => {
      const pos = positions.get(entityId);
      if (!pos) return;
      e.preventDefault();
      e.stopPropagation();
      // Adjust for scale when computing offsets
      setDragging({
        id: entityId,
        ox: e.clientX / scale - pos.x,
        oy: e.clientY / scale - pos.y,
      });
    },
    [positions, scale]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) return;
      setPanning({ startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y });
    },
    [dragging, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) {
        setPositions((prev) => {
          const next = new Map(prev);
          next.set(dragging.id, {
            x: Math.max(0, e.clientX / scale - dragging.ox),
            y: Math.max(0, e.clientY / scale - dragging.oy),
          });
          return next;
        });
      } else if (panning) {
        setPan({
          x: panning.panX + (e.clientX - panning.startX),
          y: panning.panY + (e.clientY - panning.startY),
        });
      }
    },
    [dragging, panning, scale]
  );

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      // Persist positions when a card drag ends
      const posRecord: Record<string, { x: number; y: number }> = {};
      positionsRef.current.forEach((pos, id) => { posRecord[id] = pos; });
      setErdPositions(posRecord);
    }
    setDragging(null);
    setPanning(null);
  }, [dragging, setErdPositions]);

  // Zoom via scroll wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP;
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)));
    },
    []
  );

  const handleZoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  const handleZoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const handleReset = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  // Build FK edges
  const edges = useMemo(() => {
    const lines: { fromId: string; toId: string; fromColName: string; color: string }[] = [];
    entities.forEach((e) => {
      e.columns.forEach((c) => {
        if (c.references) {
          lines.push({
            fromId: e.id,
            toId: c.references.entityId,
            fromColName: c.name,
            color: e.color,
          });
        }
      });
    });
    return lines;
  }, [entities]);

  // Entities directly connected to the hovered entity via FK
  const relatedIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const ids = new Set<string>([hoveredId]);
    edges.forEach((e) => {
      if (e.fromId === hoveredId) ids.add(e.toId);
      if (e.toId === hoveredId) ids.add(e.fromId);
    });
    return ids;
  }, [hoveredId, edges]);

  const getEdgeData = useCallback((fromId: string, toId: string, fromColName: string) => {
    const from = positions.get(fromId);
    const to = positions.get(toId);
    if (!from || !to) return null;
    const fromE = entities.find((e) => e.id === fromId);
    const toE = entities.find((e) => e.id === toId);
    if (!fromE || !toE) return null;

    // Anchor at FK column row (clamped to visible rows)
    const fromColIdx = Math.max(0, Math.min(7, fromE.columns.findIndex((c) => c.name === fromColName)));
    const toPKIdx = Math.max(0, Math.min(7, toE.columns.findIndex((c) => c.primaryKey)));

    const fromY = from.y + CARD_HEADER_HEIGHT + fromColIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
    const toY = to.y + CARD_HEADER_HEIGHT + toPKIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

    // Choose connection sides based on relative x position
    const fromCenterX = from.x + CARD_WIDTH / 2;
    const toCenterX = to.x + CARD_WIDTH / 2;

    let fx: number, tx: number, dir: number;
    if (toCenterX >= fromCenterX) {
      fx = from.x + CARD_WIDTH;
      tx = to.x;
      dir = 1;
    } else {
      fx = from.x;
      tx = to.x + CARD_WIDTH;
      dir = -1;
    }

    const gap = Math.max(60, Math.abs(tx - fx));
    const cx = gap * 0.45;

    return {
      path: `M ${fx} ${fromY} C ${fx + dir * cx} ${fromY}, ${tx - dir * cx} ${toY}, ${tx} ${toY}`,
      fx, fromY, tx, toY, dir,
    };
  }, [positions, entities]);

  const handleExportSVG = useCallback(() => {
    if (entities.length === 0) return;
    const pad = 32;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    entities.forEach((e) => {
      const p = positions.get(e.id);
      if (!p) return;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + CARD_WIDTH);
      maxY = Math.max(maxY, p.y + getCardHeight(e));
    });
    const W = maxX - minX + pad * 2;
    const H = maxY - minY + pad * 2;
    const dx = -minX + pad;
    const dy = -minY + pad;

    const entityRects = entities.map((entity) => {
      const p = positions.get(entity.id);
      if (!p) return '';
      const x = p.x + dx, y = p.y + dy;
      const h = getCardHeight(entity);
      const cols = entity.columns.slice(0, 8).map((col, i) => {
        const ry = y + CARD_HEADER_HEIGHT + i * ROW_HEIGHT;
        const pk = col.primaryKey ? '<text x="8" font-size="8" font-weight="bold" fill="#f59e0b" text-anchor="start">' + 'PK' + '</text>' : '';
        const fk = col.references ? '<text x="22" font-size="8" font-weight="bold" fill="#6366f1" text-anchor="start">FK</text>' : '';
        const colName = col.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const typeTxt = col.dataType.replace(/&/g, '&amp;');
        return `<g>
          <rect x="${x}" y="${ry}" width="${CARD_WIDTH}" height="${ROW_HEIGHT}" fill="${i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}"/>
          ${pk}${fk}
          <text x="${x + 36}" y="${ry + 14}" font-size="9" fill="#e2e8f0" font-family="monospace">${colName}</text>
          <text x="${x + CARD_WIDTH - 4}" y="${ry + 14}" font-size="8" fill="#64748b" font-family="monospace" text-anchor="end">${typeTxt}</text>
          <line x1="${x}" y1="${ry + ROW_HEIGHT}" x2="${x + CARD_WIDTH}" y2="${ry + ROW_HEIGHT}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>
        </g>`;
      }).join('');
      const entityName = entity.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<g>
        <rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${h}" rx="6" fill="#1a1a1f" stroke="${entity.color}" stroke-width="2"/>
        <rect x="${x}" y="${y}" width="3" height="${h}" rx="2" fill="${entity.color}"/>
        <rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${CARD_HEADER_HEIGHT}" rx="4" fill="${entity.color}20"/>
        <text x="${x + 12}" y="${y + 16}" font-size="11" font-weight="bold" fill="#f1f5f9" font-family="system-ui, sans-serif">${entityName}</text>
        <text x="${x + 12}" y="${y + 30}" font-size="9" fill="#64748b" font-family="system-ui, sans-serif">${entity.columns.length} columns</text>
        ${cols}
      </g>`;
    }).join('\n');

    const edgePaths = edges.map((edge, i) => {
      const edgeData = getEdgeData(edge.fromId, edge.toId, edge.fromColName);
      if (!edgeData) return '';
      const path = edgeData.path;
      // Adjust path coordinates by dx, dy
      const adjusted = path.replace(/M ([\d.]+) ([\d.]+)/, (_, x, y) => `M ${+x + dx} ${+y + dy}`)
        .replace(/C ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+)/, (_, x1, y1, x2, y2, x3, y3) =>
          `C ${+x1 + dx} ${+y1 + dy}, ${+x2 + dx} ${+y2 + dy}, ${+x3 + dx} ${+y3 + dy}`);
      return `<path d="${adjusted}" stroke="${edge.color}70" stroke-width="1.5" fill="none" stroke-dasharray="5 3" key="${i}"/>`;
    }).join('\n');

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#0a0a0b"/>
  <defs>
    <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.04)"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#dots)"/>
  ${edgePaths}
  ${entityRects}
</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'erd.svg';
    a.click();
    URL.revokeObjectURL(url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, positions]);
  const handleAutoLayout = useCallback(() => {
    const newPositions = autoLayoutFK(entities);
    setPositions(newPositions);
    const posRecord: Record<string, { x: number; y: number }> = {};
    newPositions.forEach((pos, id) => { posRecord[id] = pos; });
    setErdPositions(posRecord);
    setPan({ x: 0, y: 0 });
    setScale(1);
  }, [entities, setErdPositions]);

  const handleFitAll = useCallback(() => {
    if (!containerRef.current || entities.length === 0) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    entities.forEach((e) => {
      const p = positions.get(e.id);
      if (!p) return;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + CARD_WIDTH);
      maxY = Math.max(maxY, p.y + getCardHeight(e));
    });
    const contentW = maxX - minX + 80;
    const contentH = maxY - minY + 80;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(width / contentW, height / contentH)));
    setScale(newScale);
    setPan({
      x: (width - contentW * newScale) / 2 - minX * newScale + 40 * newScale,
      y: (height - contentH * newScale) / 2 - minY * newScale + 40 * newScale,
    });
  }, [entities, positions]);

  const minimapScale = useMemo(
    () => Math.min(MM_W / Math.max(canvasWidth, 1), MM_H / Math.max(canvasHeight, 1)),
    [canvasWidth, canvasHeight]
  );

  const cursorStyle = dragging ? 'grabbing' : panning ? 'grabbing' : 'grab';

  return (
    <div className="relative flex flex-col rounded-lg border border-border-default overflow-hidden" style={{ height: 'calc(100vh - 160px)', minHeight: 400 }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-default bg-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer text-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <span className="text-[10px] text-text-muted w-10 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="h-3 w-px bg-border-default" />

        <button
          type="button"
          onClick={handleReset}
          title="Reset zoom and pan"
          className="text-[10px] text-text-muted hover:text-text-secondary px-2 py-1 rounded hover:bg-bg-hover transition-colors cursor-pointer"
        >
          100%
        </button>

        <button
          type="button"
          onClick={handleFitAll}
          title="Fit all entities"
          className="text-[10px] text-text-muted hover:text-text-secondary px-2 py-1 rounded hover:bg-bg-hover transition-colors cursor-pointer flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Fit
        </button>

        <div className="h-3 w-px bg-border-default" />

        <button
          type="button"
          onClick={handleAutoLayout}
          title="Auto-layout based on FK relationships"
          className="text-[10px] text-text-muted hover:text-text-secondary px-2 py-1 rounded hover:bg-bg-hover transition-colors cursor-pointer flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
          </svg>
          Auto Layout
        </button>

        {/* ERD Search */}
        <div className="relative ml-auto flex items-center gap-1.5">
          <div className="relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={erdSearchRef}
              type="text"
              value={erdSearch}
              onChange={(e) => setErdSearch(e.target.value)}
              placeholder="Find entity..."
              className="text-[10px] bg-bg-primary border border-border-default rounded pl-6 pr-2 py-1 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors w-28"
            />
            {erdSearch && (
              <button type="button" onClick={() => setErdSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {erdQ && (
            <span className={`text-[10px] flex-shrink-0 ${matchedEntityIds.size > 0 ? 'text-accent' : 'text-danger'}`}>
              {matchedEntityIds.size > 0 ? `${matchedEntityIds.size} match${matchedEntityIds.size !== 1 ? 'es' : ''}` : 'no match'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span>
            <span className="text-text-secondary font-medium">{entities.length}</span> {entities.length === 1 ? 'entity' : 'entities'}
          </span>
          <span>·</span>
          <span>
            <span className="text-text-secondary font-medium">
              {entities.reduce((s, e) => s + e.columns.length, 0)}
            </span> cols
          </span>
          {edges.length > 0 && (
            <>
              <span>·</span>
              <span className="text-accent/80">
                <span className="font-medium">{edges.length}</span> FK{edges.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
          <span className="hidden sm:inline">· Scroll to zoom · Drag to pan</span>
          <div className="h-3 w-px bg-border-default" />
          <button
            type="button"
            onClick={handleExportSVG}
            title="Export diagram as SVG"
            className="px-2 py-1 rounded transition-colors cursor-pointer hover:bg-bg-hover hover:text-text-secondary flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            SVG
          </button>
          <div className="h-3 w-px bg-border-default" />
          <button
            type="button"
            onClick={() => setShowMinimap((v) => !v)}
            title={showMinimap ? 'Hide minimap' : 'Show minimap'}
            className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${showMinimap ? 'bg-bg-hover text-text-secondary' : 'hover:bg-bg-hover hover:text-text-secondary'}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Map
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative overflow-hidden bg-bg-primary flex-1"
        style={{ cursor: cursorStyle }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
      >
        {/* Transformed content */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            position: 'absolute',
            width: canvasWidth,
            height: canvasHeight,
          }}
        >
          {/* SVG layer: grid + edges */}
          <svg
            width={canvasWidth}
            height={canvasHeight}
            className="absolute inset-0"
          >
            <defs>
              <pattern id="erd-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.04)" />
              </pattern>
              {/* Arrow marker for FK target (PK end) */}
              <marker id="fk-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M1 1 L9 5 L1 9" fill="none" strokeWidth="1.5" strokeLinejoin="round" stroke="rgba(99,102,241,0.8)" />
              </marker>
              {/* Circle marker for FK source (many end) */}
              <marker id="fk-circle" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                <circle cx="5" cy="5" r="3.5" fill="rgba(99,102,241,0.2)" stroke="rgba(99,102,241,0.7)" strokeWidth="1.2" />
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="url(#erd-grid)" style={{ pointerEvents: 'none' }} />

            {edges.map((edge, i) => {
              const edgeData = getEdgeData(edge.fromId, edge.toId, edge.fromColName);
              if (!edgeData) return null;
              const { path, fx, fromY, tx, toY, dir } = edgeData;
              const edgeHovered = hoveredEdgeIdx === i;
              const edgeActive = !hoveredId || edge.fromId === hoveredId || edge.toId === hoveredId;
              const strokeColor = edgeHovered
                ? edge.color
                : edgeActive
                ? (hoveredId ? edge.color : `${edge.color}80`)
                : `${edge.color}18`;
              const strokeWidth = edgeHovered ? 2.5 : edgeActive && hoveredId ? 2 : 1.5;
              const labelOpacity = edgeHovered ? 1 : edgeActive && hoveredId ? 0.8 : 0.35;
              return (
                <g key={i}>
                  {/* Cardinality labels: N (many/FK side) and 1 (one/PK side) */}
                  <text
                    x={fx + dir * 10}
                    y={fromY - 4}
                    fontSize={9}
                    fontWeight="bold"
                    fontFamily="monospace"
                    fill={edge.color}
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', opacity: labelOpacity, transition: 'opacity 0.15s' }}
                  >N</text>
                  <text
                    x={tx - dir * 10}
                    y={toY - 4}
                    fontSize={9}
                    fontWeight="bold"
                    fontFamily="monospace"
                    fill={edge.color}
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', opacity: labelOpacity, transition: 'opacity 0.15s' }}
                  >1</text>
                  {/* Transparent hit area — interactive */}
                  <path
                    d={path}
                    stroke="transparent"
                    strokeWidth={10}
                    fill="none"
                    style={{ cursor: 'pointer' }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => {
                      setHoveredEdgeIdx(i);
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseMove={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseLeave={() => { setHoveredEdgeIdx(null); setTooltipPos(null); }}
                  />
                  {/* Visual path — not interactive */}
                  <path
                    d={path}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={edgeHovered || (edgeActive && hoveredId) ? 'none' : '5 3'}
                    markerEnd="url(#fk-arrow)"
                    markerStart="url(#fk-circle)"
                    style={{ pointerEvents: 'none', transition: 'stroke 0.15s, stroke-width 0.15s' }}
                  />
                </g>
              );
            })}
          </svg>

          {/* FK edge labels - entity count display */}

          {/* Entity cards */}
          {entities.map((entity) => {
            const pos = positions.get(entity.id);
            if (!pos) return null;
            const isMatch = matchedEntityIds.has(entity.id);
            const isDimmed = erdQ && !isMatch;
            const isHovered = entity.id === hoveredId;
            const isRelated = relatedIds.has(entity.id);
            const dimByHover = !!hoveredId && !isRelated;
            const opacity = isDimmed ? 0.25 : dimByHover ? 0.2 : 1;
            return (
              <div
                key={entity.id}
                className="absolute bg-bg-secondary border rounded-lg overflow-hidden shadow-lg select-none"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: CARD_WIDTH,
                  borderColor: isMatch ? '#fff' : isHovered ? entity.color : entity.color,
                  borderLeftWidth: 3,
                  cursor: dragging?.id === entity.id ? 'grabbing' : 'grab',
                  opacity,
                  transition: 'opacity 0.15s, box-shadow 0.15s',
                  boxShadow: isMatch
                    ? `0 0 0 2px ${entity.color}, 0 0 16px ${entity.color}60`
                    : isHovered
                    ? `0 0 0 1.5px ${entity.color}, 0 4px 20px ${entity.color}40`
                    : undefined,
                }}
                onMouseDown={(e) => handleCardMouseDown(e, entity.id)}
                onMouseEnter={() => !dragging && setHoveredId(entity.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className="px-3 py-2 border-b border-border-default group/header relative"
                  style={{ backgroundColor: `${entity.color}15` }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold text-text-primary truncate flex-1">{entity.name || 'unnamed'}</p>
                    {onEntityFocus && (
                      <button
                        type="button"
                        title="Focus in grid view"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onEntityFocus(entity.id); }}
                        className="flex-shrink-0 opacity-0 group-hover/header:opacity-100 transition-opacity text-text-muted hover:text-text-secondary cursor-pointer ml-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {entity.description ? (
                    <p className="text-[10px] text-text-muted truncate" title={entity.description}>{entity.description}</p>
                  ) : (
                    <p className="text-[10px] text-text-muted">{entity.columns.length} col{entity.columns.length !== 1 ? 's' : ''}</p>
                  )}
                  {entity.tags.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {entity.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[8px] rounded px-1 py-0.5 leading-none font-medium" style={{ backgroundColor: `${entity.color}30`, color: entity.color }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  {entity.columns.slice(0, 8).map((col) => (
                    <div
                      key={col.id}
                      className="flex items-center justify-between px-3 py-1 border-b border-border-default/50 last:border-0"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {col.primaryKey && (
                          <span className="text-[8px] font-bold text-warning flex-shrink-0">PK</span>
                        )}
                        {col.references && (
                          <span className="text-[8px] font-bold text-accent flex-shrink-0">FK</span>
                        )}
                        <span className="text-[10px] text-text-secondary truncate">{col.name || '—'}</span>
                      </div>
                      <span className="text-[9px] text-text-muted flex-shrink-0 ml-1">{col.dataType}</span>
                    </div>
                  ))}
                  {entity.columns.length > 8 && (
                    <div className="px-3 py-1 text-[10px] text-text-muted">
                      +{entity.columns.length - 8} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FK edge tooltip */}
        {hoveredEdgeIdx !== null && tooltipPos && (() => {
          const edge = edges[hoveredEdgeIdx];
          if (!edge) return null;
          const fromE = entities.find((e) => e.id === edge.fromId);
          const toE = entities.find((e) => e.id === edge.toId);
          const col = fromE?.columns.find((c) => c.name === edge.fromColName);
          const refCol = col?.references?.columnName;
          const left = tooltipPos.x + 14;
          const top = tooltipPos.y - 12;
          return (
            <div
              className="absolute z-50 bg-bg-secondary border border-border-active rounded-lg shadow-xl px-3 py-2 pointer-events-none"
              style={{ left, top, maxWidth: 260 }}
            >
              <p className="text-[9px] text-text-muted uppercase tracking-wider mb-1.5">FK Relationship</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-text-primary">{fromE?.name ?? edge.fromId}</span>
                <span className="text-[10px] text-accent font-mono">.{edge.fromColName}</span>
                <svg className="w-3 h-3 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span className="text-[11px] font-semibold text-text-primary">{toE?.name ?? edge.toId}</span>
                {refCol && <span className="text-[10px] text-warning font-mono">.{refCol}</span>}
              </div>
            </div>
          );
        })()}

        {/* Minimap overlay */}
        {showMinimap && entities.length > 0 && (() => {
          const vpW = containerRef.current?.offsetWidth ?? 600;
          const vpH = containerRef.current?.offsetHeight ?? 400;
          const vx = -pan.x / scale;
          const vy = -pan.y / scale;
          const vw = vpW / scale;
          const vh = vpH / scale;
          return (
            <div
              className="absolute bottom-3 right-3 bg-bg-secondary/90 border border-border-default rounded-lg overflow-hidden shadow-lg pointer-events-none"
              style={{ width: MM_W + 8, height: MM_H + 8 }}
            >
              <svg width={MM_W} height={MM_H} className="block m-1">
                {/* Entity rects */}
                {entities.map((entity) => {
                  const pos = positions.get(entity.id);
                  if (!pos) return null;
                  const h = getCardHeight(entity);
                  return (
                    <rect
                      key={entity.id}
                      x={pos.x * minimapScale}
                      y={pos.y * minimapScale}
                      width={CARD_WIDTH * minimapScale}
                      height={h * minimapScale}
                      fill={`${entity.color}30`}
                      stroke={entity.color}
                      strokeWidth={0.8}
                      rx={1}
                    />
                  );
                })}
                {/* FK edges */}
                {edges.map((edge, i) => {
                  const fp = positions.get(edge.fromId);
                  const tp = positions.get(edge.toId);
                  if (!fp || !tp) return null;
                  const fx = (fp.x + CARD_WIDTH / 2) * minimapScale;
                  const fy = (fp.y + CARD_HEADER_HEIGHT / 2) * minimapScale;
                  const tx = (tp.x + CARD_WIDTH / 2) * minimapScale;
                  const ty = (tp.y + CARD_HEADER_HEIGHT / 2) * minimapScale;
                  return (
                    <line key={i} x1={fx} y1={fy} x2={tx} y2={ty}
                      stroke={`${edge.color}60`} strokeWidth={0.6} />
                  );
                })}
                {/* Viewport rect */}
                <rect
                  x={vx * minimapScale}
                  y={vy * minimapScale}
                  width={vw * minimapScale}
                  height={vh * minimapScale}
                  fill="rgba(255,255,255,0.04)"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={0.8}
                  rx={1}
                />
              </svg>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
