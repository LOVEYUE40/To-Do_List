import { useMemo } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { ClipboardList } from 'lucide-react'
import type { TodoItem, TodoList } from '@shared/types'
import { TaskItem } from './TaskItem'

interface TaskListProps {
  items: TodoItem[]
  lists: TodoList[]
  sortable: boolean
  now: number
  emptyHint: string
  onToggle: (id: string) => void
  onEdit: (item: TodoItem) => void
  onRemove: (id: string) => void
  onReorder: (orderedIds: string[]) => void
}

export function TaskList({
  items,
  lists,
  sortable,
  now,
  emptyHint,
  onToggle,
  onEdit,
  onRemove,
  onReorder
}: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const listMap = useMemo(() => new Map(lists.map((list) => [list.id, list])), [lists])
  const ids = useMemo(() => items.map((item) => item.id), [items])

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line/12 bg-line/[0.06] text-subtle">
          <ClipboardList size={20} />
        </span>
        <p className="text-[12.5px] font-medium text-muted">{emptyHint}</p>
        <p className="text-[11px] leading-relaxed text-subtle">
          在下方输入框回车即可创建任务，也可以按 Ctrl + Alt + N 随时快速新增。
        </p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5">
          {items.map((item) => {
            const list = listMap.get(item.listId)
            return (
              <TaskItem
                key={item.id}
                item={item}
                color={list?.color}
                listName={list?.name}
                sortable={sortable}
                now={now}
                onToggle={onToggle}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
