import { useMemo } from 'react';
import type { Entity } from '../../types';

interface RelationshipMatrixProps {
  entities: Entity[];
}

// cell: { fromColName, fkCount } | null
interface Cell {
  cols: string[];
}

export function RelationshipMatrix({ entities }: RelationshipMatrixProps) {
  // Build N×N matrix[fromIdx][toIdx] = list of FK column names
  const matrix = useMemo<Cell[][]>(() => {
    const n = entities.length;
    const m: Cell[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => ({ cols: [] }))
    );
    entities.forEach((from, fi) => {
      from.columns.forEach((col) => {
        if (!col.references) return;
        const ti = entities.findIndex((e) => e.id === col.references!.entityId);
        if (ti >= 0 && ti !== fi) {
          m[fi][ti].cols.push(col.name);
        }
      });
    });
    return m;
  }, [entities]);

  // Summary: count total FKs, find most connected entities
  const { totalFKs, entityFKOut, entityFKIn } = useMemo(() => {
    let totalFKs = 0;
    const out: number[] = new Array(entities.length).fill(0);
    const inn: number[] = new Array(entities.length).fill(0);
    matrix.forEach((row, fi) => {
      row.forEach((cell, ti) => {
        totalFKs += cell.cols.length;
        out[fi] += cell.cols.length;
        inn[ti] += cell.cols.length;
      });
    });
    return { totalFKs, entityFKOut: out, entityFKIn: inn };
  }, [matrix, entities]);

  if (entities.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        No entities to display.
      </div>
    );
  }

  if (entities.length === 1) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Add more entities to see relationship matrix.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-[11px] text-text-muted">
        <span>
          <span className="text-text-secondary font-medium">{entities.length}</span> entities
        </span>
        <span>·</span>
        <span>
          <span className="text-text-secondary font-medium">{totalFKs}</span> FK relationship{totalFKs !== 1 ? 's' : ''}
        </span>
        {totalFKs > 0 && (
          <>
            <span>·</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-accent/40 inline-block border border-accent/60" />
                FK source
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-warning/30 inline-block border border-warning/50" />
                FK target (referenced)
              </span>
            </div>
          </>
        )}
      </div>

      <div className="overflow-auto rounded-lg border border-border-default">
        <table className="border-collapse text-[10px] min-w-full">
          <thead>
            <tr>
              {/* Top-left corner cell */}
              <th className="sticky left-0 z-20 bg-bg-secondary border-b border-r border-border-default px-3 py-2 text-left w-36 min-w-36">
                <div className="flex flex-col">
                  <span className="text-text-muted font-normal">FROM ↓ / TO →</span>
                  <span className="text-[9px] text-text-muted/60 mt-0.5">Row refs Column</span>
                </div>
              </th>
              {entities.map((e, ci) => (
                <th
                  key={e.id}
                  className="border-b border-r border-border-default px-2 py-2 text-center bg-bg-secondary whitespace-nowrap"
                  style={{ minWidth: 80 }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: e.color }}
                    />
                    <span
                      className="font-semibold text-text-secondary truncate max-w-[72px] block"
                      title={e.name}
                      style={{ color: e.color }}
                    >
                      {e.name || 'unnamed'}
                    </span>
                    {entityFKIn[ci] > 0 && (
                      <span className="text-[8px] text-warning font-mono">
                        ←{entityFKIn[ci]}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {/* Out-degree column */}
              <th className="border-b border-border-default px-2 py-2 text-center bg-bg-secondary whitespace-nowrap text-text-muted font-normal">
                Out
              </th>
            </tr>
          </thead>
          <tbody>
            {entities.map((fromEntity, fi) => (
              <tr key={fromEntity.id} className="group/row">
                {/* Row header */}
                <td className="sticky left-0 z-10 border-b border-r border-border-default px-3 py-2 bg-bg-secondary group-hover/row:bg-bg-hover transition-colors">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: fromEntity.color }}
                    />
                    <span
                      className="font-semibold truncate max-w-[100px] block"
                      title={fromEntity.name}
                      style={{ color: fromEntity.color }}
                    >
                      {fromEntity.name || 'unnamed'}
                    </span>
                  </div>
                  <div className="text-text-muted text-[9px] mt-0.5 pl-4">
                    {fromEntity.columns.length} col{fromEntity.columns.length !== 1 ? 's' : ''}
                  </div>
                </td>

                {/* Matrix cells */}
                {entities.map((toEntity, ti) => {
                  const cell = matrix[fi][ti];
                  const isDiagonal = fi === ti;
                  const hasFKs = cell.cols.length > 0;

                  if (isDiagonal) {
                    return (
                      <td
                        key={toEntity.id}
                        className="border-b border-r border-border-default text-center"
                        style={{ backgroundColor: `${fromEntity.color}08` }}
                      >
                        <div className="flex items-center justify-center h-full py-2">
                          <span
                            className="text-[9px] font-mono opacity-40"
                            style={{ color: fromEntity.color }}
                          >
                            ●
                          </span>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={toEntity.id}
                      className={`border-b border-r border-border-default text-center transition-colors ${
                        hasFKs ? 'bg-accent/8 hover:bg-accent/15' : 'hover:bg-bg-hover/50'
                      }`}
                      title={
                        hasFKs
                          ? `${fromEntity.name}.${cell.cols.join(', ')} → ${toEntity.name}`
                          : undefined
                      }
                    >
                      {hasFKs ? (
                        <div className="px-1 py-1.5 flex flex-col items-center gap-0.5">
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center font-bold text-[9px] text-white"
                            style={{ backgroundColor: `${fromEntity.color}cc` }}
                            title={cell.cols.join(', ')}
                          >
                            {cell.cols.length > 1 ? cell.cols.length : 'FK'}
                          </div>
                          {cell.cols.length <= 2 && (
                            <span className="text-[8px] text-text-muted font-mono truncate max-w-[68px]" title={cell.cols.join(', ')}>
                              {cell.cols[0]}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="py-2 text-text-muted/20 text-[9px]">·</div>
                      )}
                    </td>
                  );
                })}

                {/* Out-degree */}
                <td className="border-b border-border-default px-2 py-2 text-center text-text-muted">
                  {entityFKOut[fi] > 0 ? (
                    <span className="text-[10px] font-medium text-accent">{entityFKOut[fi]}</span>
                  ) : (
                    <span className="text-[9px] text-text-muted/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {/* In-degree footer */}
          <tfoot>
            <tr>
              <td className="sticky left-0 z-10 border-t border-r border-border-default px-3 py-2 bg-bg-secondary text-text-muted text-[9px]">
                In (refs)
              </td>
              {entities.map((e, ci) => (
                <td
                  key={e.id}
                  className="border-t border-r border-border-default px-2 py-2 text-center bg-bg-secondary"
                >
                  {entityFKIn[ci] > 0 ? (
                    <span className="text-[10px] font-medium text-warning">{entityFKIn[ci]}</span>
                  ) : (
                    <span className="text-[9px] text-text-muted/40">—</span>
                  )}
                </td>
              ))}
              <td className="border-t border-border-default px-2 py-2 text-center bg-bg-secondary" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend / help */}
      {totalFKs === 0 && (
        <p className="text-[11px] text-text-muted text-center py-2">
          No FK relationships defined yet. Use the FK ref field in column settings to add relationships.
        </p>
      )}
    </div>
  );
}
