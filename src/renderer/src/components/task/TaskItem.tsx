import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bell, Check, GripVertical, Pencil, Trash2 } from 'lucide-react'
import type { TodoItem } from '@shared/types'
import { cn } from '@/lib/cn'
import { formatDueLabel } from '@shared/utils'
import { PriorityDot } from '@/components/ui/Controls'

interface TaskItemProps {
  item: TodoItem
  color?: string
  listName?: string
  sortable: boolean
  now: number
  onToggle: (id: string) => void
  onEdit: (item: TodoItem) => void
  onRemove: (id: string) => void
}

function TaskItemBase({ item, color, listName, sortable, now, onToggle, onEdit, onRemove }: TaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !sortable
  })

  const overdue = !item.done && !!item.dueAt && item.dueAt < now
  const dueSoon = !item.done && !!item.dueAt && !overdue && item.dueAt - now < 24 * 60 * 60 * 1000

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : undefined
      }}
      className={cn(
        'group relative flex items-start gap-2 rounded-card border px-2.5 py-2',
        'transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out',
        isDragging
          ? 'scale-[1.03] border-accent/50 bg-surface/80 shadow-glass'
          : 'border-line/8 bg-line/[0.045] hover:-translate-y-[1px] hover:border-line/18 hover:bg-line/8 hover:shadow-soft',
        item.done && 'opacity-55'
      )}
    >
      {sortable ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="拖动排序"
          className="no-drag mt-[3px] hidden cursor-grab shrink-0 text-subtle transition-colors hover:text-ink active:cursor-grabbing group-hover:block"
        >
          <GripVertical size={13} />
        </button>
      ) : null}

      <button
        type="button"
        aria-label={item.done ? '标记为未完成' : '标记为已完成'}
        onClick={() => onToggle(item.id)}
        className={cn(
          'no-drag mt-[1px] flex h-[17px] w-[17px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border transition-all duration-200 ease-out',
          item.done
            ? 'border-transparent bg-gradient-to-br from-accent to-accent2 text-white'
            : 'border-line/28 text-transparent hover:border-accent hover:bg-accent/12'
        )}
      >
        <Check size={11} strokeWidth={3} className={cn('transition-opacity duration-150', item.done ? 'opacity-100' : 'opacity-0')} />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start gap-1.5">
          <PriorityDot priority={item.priority} />
          <button
            type="button"
            onClick={() => onEdit(item)}
            className={cn(
              'no-drag min-w-0 flex-1 cursor-pointer text-left text-[12.5px] leading-snug text-ink',
              'transition-colors duration-150 hover:text-accent',
              item.done && 'line-through decoration-line/40'
            )}
          >
            {item.title}
          </button>
        </div>

        {item.note ? (
          <p className="line-clamp-2 pl-[13px] text-[11px] leading-relaxed text-subtle">{item.note}</p>
        ) : null}

        {item.dueAt || item.tags.length > 0 || (item.done && listName) ? (
          <div className="flex flex-wrap items-center gap-1.5 pl-[13px]">
            {item.dueAt ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-pill border px-1.5 py-[1px] text-[10.5px]',
                  overdue
                    ? 'border-red-500/45 bg-red-500/14 text-red-400'
                    : dueSoon
                      ? 'border-amber-500/45 bg-amber-500/14 text-amber-400'
                      : 'border-line/14 bg-line/8 text-subtle'
                )}
              >
                {formatDueLabel(item.dueAt, now)}
              </span>
            ) : null}

            {item.remindAt ? (
              <span className="inline-flex items-center gap-1 rounded-pill border border-line/14 bg-line/8 px-1.5 py-[1px] text-[10.5px] text-subtle">
                <Bell size={9} /> 已设提醒
              </span>
            ) : null}

            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-pill border border-line/14 bg-line/8 px-1.5 py-[1px] text-[10.5px] text-muted"
              >
                #{tag}
              </span>
            ))}

            {listName && color ? (
              <span className="inline-flex items-center gap-1 text-[10.5px] text-subtle">
                <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: color }} />
                {listName}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          type="button"
          title="编辑任务"
          onClick={() => onEdit(item)}
          className="no-drag flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-subtle transition-colors duration-150 hover:bg-line/12 hover:text-ink"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          title="删除任务"
          onClick={() => onRemove(item.id)}
          className="no-drag flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-subtle transition-colors duration-150 hover:bg-red-500/16 hover:text-red-400"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

export const TaskItem = memo(TaskItemBase)
