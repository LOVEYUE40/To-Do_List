import { useEffect } from 'react'
import type { AppSettings, UpdateStatus } from '@shared/types'
import { VIEW_ID_SET } from '@shared/constants'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTodoStore } from '@/store/useTodoStore'

/**
 * 统一订阅主进程事件：
 * - 托盘菜单请求切换视图
 * - 全局快捷键触发快速新增
 * - 主进程侧设置变化（导入数据、托盘切换形态）回灌渲染层并重新拉取数据
 */
export function useDesktopEvents(): void {
  const setUi = useTodoStore((state) => state.setUi)
  const requestQuickAdd = useTodoStore((state) => state.requestQuickAdd)
  const hydrate = useTodoStore((state) => state.hydrate)
  const setToast = useTodoStore((state) => state.setToast)
  const applyExternal = useSettingsStore((state) => state.applyExternal)
  const setUpdateStatus = useSettingsStore((state) => state.setUpdateStatus)

  useEffect(() => {
    const bridge = window.desktop
    if (!bridge) return () => undefined

    const offView = bridge.on('view:request', (payload) => {
      const view = payload as string | undefined
      // 白名单来自共享常量，新增视图时无需再改这里
      if (view && VIEW_ID_SET.has(view)) {
        setUi({ view: view as Parameters<typeof setUi>[0]['view'] })
      }
    })

    const offQuickAdd = bridge.on('shortcut:quick-add', () => {
      requestQuickAdd()
    })

    const offSettings = bridge.on('settings:changed', (payload) => {
      const settings = payload as AppSettings | undefined
      if (settings && typeof settings === 'object' && 'theme' in settings) {
        applyExternal(settings)
      }
      void bridge.data.load().then((data) => hydrate(data))
    })

    // 窗口形态切换会整窗重建，重建完成后主进程回传一次通知
    const offMode = bridge.on('window:mode-changed', (payload) => {
      const mode = payload as 'widget' | 'window' | undefined
      if (mode === 'widget') setToast('已切换为桌面小组件模式')
      if (mode === 'window') setToast('已切换为普通窗口模式')
    })

    // 更新状态由主进程广播（含启动静默检查与下载进度）
    const offUpdate = bridge.on('update:status', (payload) => {
      const status = payload as UpdateStatus | undefined
      if (status && typeof status === 'object' && 'state' in status) setUpdateStatus(status)
    })

    return () => {
      offView()
      offQuickAdd()
      offSettings()
      offMode()
      offUpdate()
    }
  }, [setUi, requestQuickAdd, hydrate, setToast, applyExternal, setUpdateStatus])
}
