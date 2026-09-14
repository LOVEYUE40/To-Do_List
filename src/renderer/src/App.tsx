import { lazy, Suspense, useEffect } from 'react'
import { Loader2, Undo2 } from 'lucide-react'
import { GUIDE_VERSION } from '@shared/constants'
import { TitleBar } from '@/components/layout/TitleBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { ViewTabs } from '@/components/layout/ViewTabs'
import { TodoView } from '@/components/views/TodoView'
import { DataView } from '@/components/views/DataView'
import { SettingsView } from '@/components/views/SettingsView'
import { HelpView } from '@/components/views/HelpView'
import { GuideWizard } from '@/components/guide/GuideWizard'
import { Button } from '@/components/ui/Button'
import { useDesktopEvents } from '@/hooks/useDesktopEvents'
import { useReminder } from '@/hooks/useReminder'
import { useTheme } from '@/hooks/useTheme'
import { useSettingsStore, selectGlassAlpha } from '@/store/useSettingsStore'
import { useTodoStore } from '@/store/useTodoStore'
import { cn } from '@/lib/cn'

// recharts 体积较大，统计视图懒加载，只在首次打开时解析
const StatsView = lazy(() =>
  import('@/components/views/StatsView').then((module) => ({ default: module.StatsView }))
)

function Splash() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <span className="h-10 w-10 animate-breathe rounded-2xl bg-gradient-to-br from-accent to-accent2" />
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <Loader2 size={13} className="animate-spin" />
        正在载入本地数据…
      </div>
    </div>
  )
}

/** 独立订阅 toast/撤销状态，避免每次弹 toast 重渲染整个应用树 */
function Toast() {
  const toast = useTodoStore((state) => state.toast)
  const setToast = useTodoStore((state) => state.setToast)
  const lastDeleted = useTodoStore((state) => state.lastDeleted)
  const undoDelete = useTodoStore((state) => state.undoDelete)

  useEffect(() => {
    if (!toast) return () => undefined
    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast, setToast])

  if (!toast) return null

  return (
    <div className="no-drag absolute bottom-14 left-1/2 z-40 flex max-w-[92%] -translate-x-1/2 items-center gap-2 rounded-pill border border-line/14 bg-surface/85 px-3 py-1.5 shadow-glass backdrop-blur-xl animate-fade-in">
      <span className="truncate text-[11.5px] text-ink">{toast}</span>
      {lastDeleted ? (
        <Button
          size="sm"
          variant="ghost"
          icon={<Undo2 size={11} />}
          onClick={() => {
            undoDelete()
          }}
          className="h-6 px-1.5"
        >
          撤销
        </Button>
      ) : null}
    </div>
  )
}

export default function App() {
  const settings = useSettingsStore((state) => state.settings)
  const settingsReady = useSettingsStore((state) => state.ready)
  const loadSettings = useSettingsStore((state) => state.load)
  const guideOpen = useSettingsStore((state) => state.guideOpen)
  const openGuide = useSettingsStore((state) => state.openGuide)

  const todosReady = useTodoStore((state) => state.ready)
  const loadTodos = useTodoStore((state) => state.load)
  const view = useTodoStore((state) => state.ui.view)

  useTheme(settings)
  useReminder()
  useDesktopEvents()

  useEffect(() => {
    void loadSettings()
    void loadTodos()
  }, [loadSettings, loadTodos])

  // 首启引导：判定依据是主进程持久化的 guideVersion，
  // 因此窗口形态切换导致整窗重建后不会重复弹出
  useEffect(() => {
    if (!settingsReady || guideOpen) return
    if (settings.guideVersion >= GUIDE_VERSION) return
    openGuide()
  }, [settingsReady, settings.guideVersion, guideOpen, openGuide])

  const isWidget = settings.windowMode === 'widget'
  const glassAlpha = settings.hardenReadability ? selectGlassAlpha(settings) : settings.glassAlpha
  const ready = settingsReady && todosReady
  const boostReadability = settings.hardenReadability && settings.opacity <= 0.6
  // 底色拉满时末端色标同样为 1，窗口完全实心、不再透出桌面；底色越淡渐变层次越明显
  const endAlpha = Math.max(0, glassAlpha - 0.16 * (1 - glassAlpha))
  const backdrop = settings.blur > 0 && glassAlpha < 0.999 ? `blur(${settings.blur}px) saturate(1.4)` : 'none'

  return (
    <div className="h-full w-full" style={{ opacity: settings.opacity }}>
      <div
        className={cn(
          'relative flex h-full w-full flex-col overflow-hidden border border-line/12',
          isWidget ? 'rounded-widget' : 'rounded-none'
        )}
        style={{
          background: `linear-gradient(158deg, rgb(var(--surface-rgb) / ${glassAlpha}), rgb(var(--surface-rgb) / ${endAlpha}))`,
          backdropFilter: backdrop,
          WebkitBackdropFilter: backdrop,
          boxShadow: isWidget
            ? '0 26px 72px -34px rgba(0,0,0,0.85), inset 0 1px 0 0 rgb(var(--line-rgb) / 0.1)'
            : 'none',
          textShadow: boostReadability ? '0 1px 3px rgba(0,0,0,0.45)' : undefined
        }}
      >
        {/* 装饰光斑：为毛玻璃卡片提供可模糊的底层；静态渲染，不跑常驻动画以省 GPU */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -left-24 -top-20 h-60 w-60 rounded-full blur-[76px]"
            style={{ backgroundColor: 'rgb(var(--accent-rgb) / 0.32)' }}
          />
          <div
            className="absolute -right-20 top-1/3 h-56 w-56 rounded-full blur-[76px]"
            style={{ backgroundColor: 'rgb(var(--accent-2-rgb) / 0.2)' }}
          />
          <div
            className="absolute -bottom-24 left-1/4 h-56 w-72 rounded-full blur-[84px]"
            style={{ backgroundColor: 'rgb(var(--glow-rgb) / 0.16)' }}
          />
        </div>

        {ready ? (
          <>
            <TitleBar />

            <div className="relative z-10 flex min-h-0 flex-1">
              {view === 'todo' ? <Sidebar /> : null}

              <main className="flex min-w-0 flex-1 flex-col animate-fade-in">
                {view === 'todo' ? <TodoView /> : null}
                {view === 'stats' ? (
                  <Suspense fallback={<Splash />}>
                    <StatsView />
                  </Suspense>
                ) : null}
                {view === 'data' ? <DataView /> : null}
                {view === 'settings' ? <SettingsView /> : null}
                {view === 'help' ? <HelpView /> : null}
              </main>
            </div>

            <ViewTabs />

            <Toast />
            <GuideWizard />
          </>
        ) : (
          <Splash />
        )}
      </div>
    </div>
  )
}
