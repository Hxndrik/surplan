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
      {/* Filter count indicator when filtering */}
      {q && (
        <div className="px-2 py-0.5 text-[9px] text-accent bg-accent-muted/20 border-b border-border-default/50">
          {visible.length}/{sorted.length} columns
        </div>
      )}

      {/* Column rows - no header needed, layout is self-explanatory */}
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
