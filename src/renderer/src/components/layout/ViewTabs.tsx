import { BarChart3, Database, HelpCircle, ListTodo, SlidersHorizontal } from 'lucide-react'
import type { ViewId } from '@shared/types'
import { cn } from '@/lib/cn'
import { useTodoStore } from '@/store/useTodoStore'

const TABS: Array<{ id: ViewId; label: string; icon: typeof ListTodo }> = [
  { id: 'todo', label: '待办', icon: ListTodo },
  { id: 'stats', label: '统计', icon: BarChart3 },
  { id: 'data', label: '数据', icon: Database },
  { id: 'settings', label: '设置', icon: SlidersHorizontal },
  { id: 'help', label: '帮助', icon: HelpCircle }
]

export function ViewTabs() {
  const view = useTodoStore((state) => state.ui.view)
  const setUi = useTodoStore((state) => state.setUi)

  return (
    <nav
      role="tablist"
      aria-label="主导航"
      className="no-drag relative z-20 flex h-12 shrink-0 items-center justify-around gap-1 border-t border-line/8 px-2"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon
        const active = view === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active ? 'page' : undefined}
            onClick={() => setUi({ view: tab.id })}
            className={cn(
              'group relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] rounded-xl py-1.5',
              'transition-all duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
              active ? 'text-ink' : 'text-subtle hover:text-muted'
            )}
          >
            <Icon
              size={16}
              className={cn(
                'transition-transform duration-200 ease-out',
                active ? 'scale-110 text-accent' : 'group-hover:scale-105'
              )}
            />
            <span className="whitespace-nowrap text-[10px] font-medium tracking-wide">{tab.label}</span>
            <span
              className={cn(
                'absolute bottom-0 h-[2px] rounded-pill bg-gradient-to-r from-accent to-accent2 transition-all duration-200 ease-out',
                active ? 'w-7 opacity-100' : 'w-0 opacity-0'
              )}
            />
          </button>
        )
      })}
    </nav>
  )
}
