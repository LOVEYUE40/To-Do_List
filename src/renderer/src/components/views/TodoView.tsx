import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CornerDownLeft, Plus } from 'lucide-react'
import type { TodoItem } from '@shared/types'
import { SMART_VIEWS } from '@shared/constants'
import { filterItems, sortItems } from '@shared/utils'
import { TaskList } from '@/components/task/TaskList'
import { TaskToolbar } from '@/components/task/TaskToolbar'
import { TaskEditorDialog } from '@/components/task/TaskEditorDialog'
import { useNow } from '@/hooks/useNow'
import { useTodoStore } from '@/store/useTodoStore'

function emptyHintFor(listId: string, status: string, keyword: string): string {
  if (keyword.trim()) return '没有匹配的任务，换个关键词试试'
  if (status === 'done') return '还没有已完成的任务'
  if (status === 'overdue') return '没有逾期任务，节奏保持得很好'
  const smart = SMART_VIEWS.find((view) => view.id === listId)
  if (smart) return `「${smart.name}」暂时没有任务`
  return '这个清单还是空的，添加第一项任务吧'
}

interface QuickAddBarProps {
  /** 递增信号：托盘/快捷键快速新增时聚焦输入框 */
  focusSignal: number
  onAdd: (title: string) => void
  onExpand: (title: string) => void
}

/** 快速添加输入框：草稿状态自持，避免每次击键重渲染整个任务视图 */
function QuickAddBar({ focusSignal, onAdd, onExpand }: QuickAddBarProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusSignal > 0) inputRef.current?.focus()
  }, [focusSignal])

  const submitDraft = (): void => {
    const title = draft.trim()
    if (!title) return
    onAdd(title)
    setDraft('')
    inputRef.current?.focus()
  }

  const expandDraft = (): void => {
    const title = draft.trim()
    if (!title) return
    setDraft('')
    onExpand(title)
  }

  return (
    <div className="no-drag flex shrink-0 items-center gap-2 rounded-2xl border border-line/12 bg-surface/55 px-2.5 py-2 transition-all duration-200 focus-within:border-accent/60 focus-within:shadow-[0_0_0_4px_rgb(var(--accent-rgb)/0.12)]">
      <input
        ref={inputRef}
        value={draft}
        placeholder="输入任务后回车即可添加…"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submitDraft()
          if (event.key === 'Escape') setDraft('')
        }}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-subtle"
      />
      <button
        type="button"
        title="带入详细编辑（不会直接创建）"
        disabled={!draft.trim()}
        onClick={expandDraft}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-subtle transition-colors duration-150 hover:bg-line/12 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <CornerDownLeft size={13} />
      </button>
      <button
        type="button"
        title="新建任务（含更多选项）"
        onClick={() => onExpand('')}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent2 text-white transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export function TodoView() {
  const items = useTodoStore((state) => state.items)
  const lists = useTodoStore((state) => state.lists)
  const activeListId = useTodoStore((state) => state.ui.activeListId)
  const status = useTodoStore((state) => state.ui.status)
  const priority = useTodoStore((state) => state.ui.priority)
  const keyword = useTodoStore((state) => state.ui.keyword)
  const sort = useTodoStore((state) => state.ui.sort)
  const addItem = useTodoStore((state) => state.addItem)
  const toggleDone = useTodoStore((state) => state.toggleDone)
  const removeItem = useTodoStore((state) => state.removeItem)
  const moveItems = useTodoStore((state) => state.moveItems)
  const quickAddSignal = useTodoStore((state) => state.quickAddSignal)

  const now = useNow(30_000)
  const [editing, setEditing] = useState<TodoItem | null>(null)
  const [initialTitle, setInitialTitle] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const visible = useMemo(
    () =>
      sortItems(
        filterItems(items, {
          listId: activeListId,
          status,
          priority,
          keyword,
          now
        }),
        sort
      ),
    [items, activeListId, status, priority, keyword, sort, now]
  )

  const openEditor = useCallback((item: TodoItem | null): void => {
    setEditing(item)
    setDialogOpen(true)
  }, [])

  /** 把快速添加草稿带入详细编辑弹窗（不直接创建任务，避免双份） */
  const openEditorWithDraft = useCallback((title: string): void => {
    setInitialTitle(title)
    setEditing(null)
    setDialogOpen(true)
  }, [])

  const closeEditor = useCallback((): void => {
    setDialogOpen(false)
    setInitialTitle('')
  }, [])

  const defaultListId = activeListId.startsWith('smart:') ? (lists[0]?.id ?? 'list_inbox') : activeListId

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2.5 px-3 pb-2 pt-3">
      <TaskToolbar />

      <div className="scroll-thin -mr-1 flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
        <TaskList
          items={visible}
          lists={lists}
          sortable={sort === 'manual'}
          now={now}
          emptyHint={emptyHintFor(activeListId, status, keyword)}
          onToggle={toggleDone}
          onEdit={openEditor}
          onRemove={removeItem}
          onReorder={moveItems}
        />
      </div>

      <QuickAddBar focusSignal={quickAddSignal} onAdd={(title) => addItem({ title })} onExpand={openEditorWithDraft} />

      <TaskEditorDialog
        open={dialogOpen}
        item={editing}
        initialTitle={initialTitle}
        defaultListId={defaultListId}
        onClose={closeEditor}
      />
    </section>
  )
}
