import { useMemo } from 'react'
import { Minus, PanelTop, Pin, PinOff, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { IconButton } from '@/components/ui/Button'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTodoStore } from '@/store/useTodoStore'
import { useNow } from '@/hooks/useNow'
import { SMART_VIEWS } from '@shared/constants'
import { matchesSmartView } from '@shared/utils'
import { desktop } from '@/lib/desktop-api'

export function TitleBar() {
  // 只订阅用到的两个字段：否则拖动外观滑块会连带重渲染标题栏
  const [windowMode, alwaysOnTop] = useSettingsStore(
    useShallow((state) => [state.settings.windowMode, state.settings.alwaysOnTop])
  )
  const patch = useSettingsStore((state) => state.patch)
  const setWindowMode = useSettingsStore((state) => state.setWindowMode)

  const lists = useTodoStore((state) => state.lists)
  const items = useTodoStore((state) => state.items)
  const activeListId = useTodoStore((state) => state.ui.activeListId)
  // 分钟粒度的时间信号：作为依赖让「待完成数」随时间自动刷新
  const now = useNow(30_000)

  const isWidget = windowMode === 'widget'
  const smart = SMART_VIEWS.find((view) => view.id === activeListId)
  const activeList = lists.find((list) => list.id === activeListId)
  const title = smart?.name ?? activeList?.name ?? '全部任务'

  // 待完成数按当前视图统计：智能视图（今天/已逾期等）走 matchesSmartView
  const visible = useMemo(() => {
    return items.filter((item) => !item.done && matchesSmartView(item, activeListId, now)).length
  }, [items, activeListId, now])

  return (
    <header className="drag-region relative z-20 flex h-11 shrink-0 items-center justify-between gap-2 border-b border-line/8 px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-5 w-5 shrink-0 rounded-[7px] bg-gradient-to-br from-accent to-accent2"
          style={{ boxShadow: '0 4px 14px -4px rgb(var(--accent-rgb) / 0.95)' }}
        />
        <div className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-[13px] font-semibold tracking-tight text-ink">{title}</span>
          <span className="mt-[2px] truncate text-[10.5px] text-subtle">
            {visible} 项待完成 · 共 {items.length} 项
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          label={alwaysOnTop ? '取消置顶' : '窗口置顶'}
          active={alwaysOnTop}
          onClick={() => patch({ alwaysOnTop: !alwaysOnTop })}
        >
          {alwaysOnTop ? <Pin size={13} /> : <PinOff size={13} />}
        </IconButton>

        <IconButton
          label={isWidget ? '切换为普通窗口' : '切换为桌面小组件'}
          onClick={() => setWindowMode(isWidget ? 'window' : 'widget')}
        >
          <PanelTop size={13} />
        </IconButton>

        {isWidget ? (
          <>
            <IconButton label="最小化" onClick={() => desktop.window.minimize()}>
              <Minus size={13} />
            </IconButton>
            <IconButton label="隐藏到系统托盘" onClick={() => desktop.window.hide()}>
              <X size={13} />
            </IconButton>
          </>
        ) : null}
      </div>
    </header>
  )
}
