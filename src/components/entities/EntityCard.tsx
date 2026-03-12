import { memo, useState } from 'react';
import type React from 'react';
import type { Entity, CopyFormat } from '../../types';
import { EntityCardHeader } from './EntityCardHeader';
import { ColumnTable } from './ColumnTable';
import { exportEntities, exportEntityMarkdownTable, exportEntitySampleInsert, exportEntityZodSchema } from '../../lib/exporters';
import { useEntityStore } from '../../store/useEntityStore';

function getEntityWarnings(entity: Entity, allEntities: Entity[]): string[] {
  const warnings: string[] = [];
  const hasPK = entity.columns.some((c) => c.primaryKey);
  if (entity.columns.length > 0 && !hasPK) warnings.push('No primary key defined');
  const names = entity.columns.map((c) => c.name.trim().toLowerCase()).filter(Boolean);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length > 0) warnings.push(`Duplicate column name: ${[...new Set(dupes)].join(', ')}`);
  const emptyNames = entity.columns.filter((c) => !c.name.trim()).length;
  if (emptyNames > 0) warnings.push(`${emptyNames} unnamed column${emptyNames !== 1 ? 's' : ''}`);
  const entityNameSet = new Set(allEntities.map((e) => e.name.toLowerCase()));
  for (const col of entity.columns) {
    if (col.references && !entityNameSet.has(col.references.entityName.toLowerCase())) {
      warnings.push(`FK "${col.name}" references unknown table "${col.references.entityName}"`);
    }
  }
  return warnings;
}

interface EntityCardProps {
  entity: Entity;
  dragHandle?: React.HTMLAttributes<HTMLButtonElement>;
  highlight?: string;
  columnMatchCount?: number;
}

export const EntityCard = memo(function EntityCard({ entity, dragHandle, highlight, columnMatchCount }: EntityCardProps) {
  const allEntities = useEntityStore((s) => s.entities);
  const warnings = getEntityWarnings(entity, allEntities);
  const [copiedFormat, setCopiedFormat] = useState<CopyFormat | null>(null);
  const [columnFilter, setColumnFilter] = useState('');

  const copyAs = async (format: CopyFormat) => {
    try {
      let text = '';
      if (format === 'sql') text = exportEntities([entity], 'sql-postgres');
      else if (format === 'markdown') text = exportEntityMarkdownTable(entity);
      else if (format === 'insert') text = exportEntitySampleInsert(entity);
      else if (format === 'zod') text = exportEntityZodSchema(entity);
      else if (format === 'drizzle') text = exportEntities([entity], 'drizzle');
      else if (format === 'typeorm') text = exportEntities([entity], 'typeorm');
      await navigator.clipboard.writeText(text);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 1500);
    } catch { /* clipboard not available */ }
  };

  // Compact type breakdown for tooltip e.g. "varchar×3 · int×2 · bool×1 | nullable: 3 | indexed: 2"
  const typeBreakdown = entity.columns.length > 0
    ? (() => {
        const freq = entity.columns.reduce((acc, c) => {
          acc.set(c.dataType, (acc.get(c.dataType) ?? 0) + 1);
          return acc;
        }, new Map<string, number>());
        const types = [...freq.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([t, n]) => n > 1 ? `${t}×${n}` : t)
          .join(' · ');
        const nullCount = entity.columns.filter((c) => c.nullable).length;
        const idxCount = entity.columns.filter((c) => c.indexed && !c.primaryKey).length;
        const uniqCount = entity.columns.filter((c) => c.unique && !c.primaryKey).length;
        const extras = [
          nullCount > 0 ? `nullable: ${nullCount}` : '',
          idxCount > 0 ? `indexed: ${idxCount}` : '',
          uniqCount > 0 ? `unique: ${uniqCount}` : '',
        ].filter(Boolean).join(' · ');
        return extras ? `${types}\n${extras}` : types;
      })()
    : '';

  return (
    <div
      className="bg-bg-secondary border border-border-default rounded-lg hover:border-border-active transition-colors animate-fade-in-up"
      style={{ borderLeftColor: entity.color, borderLeftWidth: '3px' }}
    >
      <EntityCardHeader
        entityId={entity.id}
        name={entity.name}
        description={entity.description}
        color={entity.color}
        tags={entity.tags}
        columnCount={entity.columns.length}
        pkCount={entity.columns.filter((c) => c.primaryKey).length}
        fkCount={entity.columns.filter((c) => !!c.references).length}
        collapsed={entity.collapsed}
        dragHandle={dragHandle}
        onCopyAs={copyAs}
        copiedFormat={copiedFormat}
        warnings={warnings}
        columnFilter={columnFilter}
        onColumnFilterChange={setColumnFilter}
        typeBreakdown={typeBreakdown}
        columnMatchCount={columnMatchCount}
        lineBreak={entity.lineBreak}
      />
      {!entity.collapsed && (
        <ColumnTable columns={entity.columns} entityId={entity.id} highlight={highlight} filter={columnFilter} />
      )}
    </div>
  );
});
