import { useEffect, useMemo, useState } from 'react'
import {
  AlarmClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Layers,
  Plus,
  Trash2,
  X
} from 'lucide-react'
import { SMART_VIEWS } from '@shared/constants'
import { matchesSmartView } from '@shared/utils'
import { cn } from '@/lib/cn'
import { useNow } from '@/hooks/useNow'
import { useTodoStore } from '@/store/useTodoStore'

const SMART_ICONS: Record<string, typeof Layers> = {
  'smart:all': Layers,
  'smart:today': CalendarClock,
  'smart:overdue': AlarmClock,
  'smart:done': CheckCircle2
}

export function Sidebar() {
  const lists = useTodoStore((state) => state.lists)
  const items = useTodoStore((state) => state.items)
  const activeListId = useTodoStore((state) => state.ui.activeListId)
  const sidebarCollapsed = useTodoStore((state) => state.ui.sidebarCollapsed)
  const setUi = useTodoStore((state) => state.setUi)
  const addList = useTodoStore((state) => state.addList)
  const removeList = useTodoStore((state) => state.removeList)

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const collapsed = sidebarCollapsed
  // 分钟粒度的时间信号：「今天到期 / 已逾期」计数依赖它才会随时间刷新
  const now = useNow(30_000)

  // 单次遍历统计全部视图计数；smart:today/overdue 需走 matchesSmartView
  const counts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const item of items) {
      if (item.done) {
        result['smart:done'] = (result['smart:done'] ?? 0) + 1
        continue
      }
      result['smart:all'] = (result['smart:all'] ?? 0) + 1
      if (matchesSmartView(item, 'smart:today', now)) result['smart:today'] = (result['smart:today'] ?? 0) + 1
      if (matchesSmartView(item, 'smart:overdue', now)) result['smart:overdue'] = (result['smart:overdue'] ?? 0) + 1
      result[item.listId] = (result[item.listId] ?? 0) + 1
    }
    return result
  }, [items, now])
  const countOf = (listId: string): number => counts[listId] ?? 0

  // 删除确认 3 秒自动退出；切换目标时重置计时
  useEffect(() => {
    if (!pendingDelete) return () => undefined
    const timer = window.setTimeout(() => setPendingDelete(null), 3000)
    return () => window.clearTimeout(timer)
  }, [pendingDelete])

  const submitDraft = (): void => {
    if (draft.trim()) addList(draft)
    setDraft('')
    setAdding(false)
  }

  return (
    <aside
      className={cn(
        'relative flex shrink-0 flex-col gap-1 border-r border-line/8 py-2 transition-[width] duration-200 ease-out',
        collapsed ? 'w-[54px] items-center px-1.5' : 'w-[152px] px-2'
      )}
    >
      <button
        type="button"
        onClick={() => setUi({ sidebarCollapsed: !collapsed })}
        title={collapsed ? '展开清单栏' : '收起清单栏'}
        className="no-drag absolute -right-[11px] top-3 z-10 flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full border border-line/12 bg-surface/85 text-subtle transition-colors duration-150 hover:text-accent"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {!collapsed ? (
        <span className="px-2 pb-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-subtle">智能视图</span>
      ) : null}

      {SMART_VIEWS.map((view) => {
        const Icon = SMART_ICONS[view.id] ?? Layers
        const active = activeListId === view.id
        return (
          <button
            key={view.id}
            type="button"
            title={collapsed ? view.name : view.hint}
            onClick={() => setUi({ activeListId: view.id })}
            className={cn(
              'no-drag relative flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-[7px] text-left',
              'transition-all duration-150 ease-out',
              collapsed && 'justify-center px-0',
              active ? 'bg-accent/16 text-ink' : 'text-muted hover:bg-line/8 hover:text-ink'
            )}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-accent" />
            ) : null}
            <Icon size={14} className={cn('shrink-0', active && 'text-accent')} />
            {!collapsed ? (
              <>
                <span className="flex-1 truncate text-[12.5px] font-medium">{view.name}</span>
                <span className="text-[10.5px] tabular-nums text-subtle">{countOf(view.id)}</span>
              </>
            ) : null}
          </button>
        )
      })}

      <div className="my-1.5 h-px w-full bg-line/10" />

      {!collapsed ? (
        <span className="px-2 pb-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-subtle">我的清单</span>
      ) : null}

      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {lists.map((list) => {
          const active = activeListId === list.id
          const confirming = pendingDelete === list.id
          return (
            <div key={list.id} className="group relative">
              <button
                type="button"
                title={collapsed ? list.name : undefined}
                onClick={() => setUi({ activeListId: list.id })}
                className={cn(
                  'no-drag flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-[7px] text-left',
                  'transition-all duration-150 ease-out',
                  collapsed && 'justify-center px-0',
                  active ? 'bg-accent/16 text-ink' : 'text-muted hover:bg-line/8 hover:text-ink'
                )}
              >
                <span
                  className="h-[9px] w-[9px] shrink-0 rounded-full"
                  style={{ backgroundColor: list.color, boxShadow: `0 0 8px ${list.color}99` }}
                />
                {!collapsed ? (
                  <>
                    <span className="flex-1 truncate text-[12.5px] font-medium">{list.name}</span>
                    {!confirming ? (
                      <span className="text-[10.5px] tabular-nums text-subtle group-hover:hidden group-focus-within:hidden">
                        {countOf(list.id)}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </button>

              {!collapsed && !confirming ? (
                <button
                  type="button"
                  title="删除清单"
                  aria-label="删除清单"
                  onClick={() => setPendingDelete(list.id)}
                  // 用 opacity 而不是 hidden：display:none 会让按钮脱离 tab 顺序，键盘无法触达
                  className="no-drag absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-subtle opacity-0 transition-opacity duration-150 hover:bg-red-500/16 hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              ) : null}

              {!collapsed && confirming ? (
                <button
                  type="button"
                  onClick={() => {
                    removeList(list.id)
                    setPendingDelete(null)
                  }}
                  className="no-drag absolute right-1 top-1/2 flex h-6 -translate-y-1/2 cursor-pointer items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/15 px-1.5 text-[10.5px] text-red-400"
                >
                  确认删除
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      {adding && !collapsed ? (
        <div className="no-drag mt-1 flex items-center gap-1 rounded-xl border border-accent/45 bg-line/[0.06] px-2 py-1">
          <input
            autoFocus
            value={draft}
            placeholder="清单名称"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitDraft()
              if (event.key === 'Escape') {
                setDraft('')
                setAdding(false)
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-subtle"
          />
          <button
            type="button"
            title="取消新建清单"
            aria-label="取消新建清单"
            onClick={() => {
              setDraft('')
              setAdding(false)
            }}
            className="cursor-pointer text-subtle transition-colors hover:text-ink"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => (collapsed ? setUi({ sidebarCollapsed: false }) : setAdding(true))}
          title="新建清单"
          className={cn(
            'no-drag mt-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-accent/45 py-[7px]',
            'text-[12px] font-medium text-accent/90 transition-all duration-150 ease-out',
            'hover:border-accent hover:bg-accent/10 hover:text-accent'
          )}
        >
          <Plus size={13} />
          {!collapsed ? '新建清单' : null}
        </button>
      )}
    </aside>
  )
}
