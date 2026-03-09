import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useFrontendStore } from '../../store/useFrontendStore';
import type { Page, PageStatus } from '../../types';

const STATUS_COLORS: Record<PageStatus, string> = {
  planned: '#6366f1',
  'in-progress': '#f59e0b',
  built: '#10b981',
};

interface NodePos {
  x: number;
  y: number;
}

export function SitemapView() {
  const pages = useFrontendStore((s) => s.pages);
  const [positions, setPositions] = useState<Record<string, NodePos>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Auto-layout: arrange in grid if no positions set
  useEffect(() => {
    if (pages.length === 0) return;
    setPositions((prev) => {
      const next = { ...prev };
      let needsLayout = false;
      for (const p of pages) {
        if (!next[p.id]) needsLayout = true;
      }
      if (!needsLayout) return prev;

      const cols = Math.max(3, Math.ceil(Math.sqrt(pages.length)));
      for (let i = 0; i < pages.length; i++) {
        if (!next[pages[i].id]) {
          next[pages[i].id] = {
            x: 60 + (i % cols) * 220,
            y: 60 + Math.floor(i / cols) * 140,
          };
        }
      }
      return next;
    });
  }, [pages]);

  const handleMouseDown = useCallback((pageId: string, e: React.MouseEvent) => {
    const pos = positions[pageId];
    if (!pos) return;
    setDragging(pageId);
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  }, [positions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPositions((prev) => ({
      ...prev,
      [dragging]: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y },
    }));
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Build edges
  const edges = useMemo(() => {
    const result: { from: string; to: string; fromPos: NodePos; toPos: NodePos }[] = [];
    for (const page of pages) {
      const fromPos = positions[page.id];
      if (!fromPos) continue;
      for (const targetId of page.navigatesTo) {
        const toPos = positions[targetId];
        if (!toPos) continue;
        result.push({ from: page.id, to: targetId, fromPos, toPos });
      }
    }
    return result;
  }, [pages, positions]);

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <p className="text-sm">No pages to visualize</p>
        <p className="text-xs text-text-muted/60 mt-1">Add pages and navigation links to see the sitemap</p>
      </div>
    );
  }

  const NODE_W = 180;
  const NODE_H = 60;

  return (
    <div className="relative border border-border-default rounded-lg bg-bg-secondary overflow-hidden" style={{ height: 'calc(100vh - 240px)' }}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" opacity="0.6" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge) => {
          const fx = edge.fromPos.x + NODE_W / 2;
          const fy = edge.fromPos.y + NODE_H;
          const tx = edge.toPos.x + NODE_W / 2;
          const ty = edge.toPos.y;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={fx} y1={fy} x2={tx} y2={ty}
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeOpacity={0.4}
              markerEnd="url(#arrow)"
            />
          );
        })}

        {/* Nodes */}
        {pages.map((page) => {
          const pos = positions[page.id];
          if (!pos) return null;
          return (
            <g
              key={page.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onMouseDown={(e) => handleMouseDown(page.id, e)}
              style={{ cursor: dragging === page.id ? 'grabbing' : 'grab' }}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill="var(--bg-primary)"
                stroke={STATUS_COLORS[page.status]}
                strokeWidth={2}
              />
              {page.authRequired && (
                <text x={NODE_W - 16} y={16} fontSize={10} fill="#f59e0b">🔒</text>
              )}
              <text x={NODE_W / 2} y={22} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--text-primary)">
                {page.name.length > 18 ? page.name.slice(0, 18) + '…' : page.name}
              </text>
              <text x={NODE_W / 2} y={40} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#6366f1">
                {page.path.length > 22 ? page.path.slice(0, 22) + '…' : page.path}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-bg-primary/80 rounded px-3 py-2 border border-border-default text-[10px] space-y-1">
        {(Object.entries(STATUS_COLORS) as [PageStatus, string][]).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-text-muted capitalize">{status}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-text-muted mt-1 pt-1 border-t border-border-default">
          <span>Drag nodes to reposition</span>
        </div>
      </div>
    </div>
  );
}
