import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Column, EntityId } from '../../types';
import { useEntityStore } from '../../store/useEntityStore';
import { ColumnRow } from './ColumnRow';
import { AddColumnRow } from './AddColumnRow';

interface ColumnTableProps {
  columns: Column[];
  entityId: EntityId;
  highlight?: string;
  filter?: string;
}

export function ColumnTable({ columns, entityId, highlight, filter }: ColumnTableProps) {
  const reorderColumns = useEntityStore((s) => s.reorderColumns);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      reorderColumns(entityId, oldIndex, newIndex);
    }
  };

  const sorted = [...columns].sort((a, b) => a.order - b.order);
  const q = filter?.trim().toLowerCase() ?? '';
  const visible = q ? sorted.filter((c) => c.name.toLowerCase().includes(q) || c.note.toLowerCase().includes(q) || c.dataType.toLowerCase().includes(q)) : sorted;

  return (
    <div>
      {/* Column header — matches ColumnRow grid exactly */}
      <div className="grid grid-cols-[1fr_72px_28px_28px_16px] gap-0 px-3 py-1 text-text-muted/80 uppercase tracking-wider text-[9px] border-b border-border-default">
        <span>
          Name
          {q && (
            <span className="normal-case ml-1 text-[8px] text-accent bg-accent-muted rounded px-1 py-0.5 leading-none">
              {visible.length}/{sorted.length}
            </span>
          )}
        </span>
        <span>Type</span>
        <span className="text-center">Null</span>
        <span className="text-center">PK</span>
        <span />
      </div>

      {/* Column rows */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={q ? undefined : handleDragEnd}>
        <SortableContext items={sorted.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {visible.map((column) => (
            <ColumnRow key={column.id} column={column} entityId={entityId} highlight={highlight ?? (q || undefined)} />
          ))}
        </SortableContext>
      </DndContext>
      {q && visible.length === 0 && (
        <p className="text-[10px] text-text-muted text-center py-2">No columns match "{filter}"</p>
      )}

      {/* Add column */}
      <AddColumnRow entityId={entityId} />
    </div>
  );
}
