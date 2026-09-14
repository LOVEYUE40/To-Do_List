import { Menu, Tray, app } from 'electron'
import type { AppSettings, ViewId, WindowMode } from '@shared/types'
import { IPC } from '@shared/constants'
import { createTrayIcon } from './assets'
import {
  captureBounds,
  getMainWindow,
  rebuildWindow,
  sendWhenReady,
  setQuitting,
  setWindowVisibilityListener,
  showMainWindow,
  toggleMainWindow
} from './windowManager'
import { store } from './store'

let tray: Tray | null = null

function requestView(view: ViewId): void {
  showMainWindow()
  sendWhenReady(IPC.evtViewRequest, view)
}

function requestQuickAdd(): void {
  showMainWindow()
  sendWhenReady(IPC.evtQuickAdd)
}

/** 窗口形态切换：捕获位置 -> 写设置 -> 整窗重建 -> 刷新托盘（IPC 与托盘菜单共用） */
export function requestMode(mode: WindowMode): void {
  const current = store.getSettings()
  if (current.windowMode === mode) return
  const bounds = captureBounds(current.bounds)
  const next = store.setSettings({ windowMode: mode, bounds })
  rebuildWindow(next)
  refreshTray(next)
}

/** 轻量刷新：只在任务数量变化时更新 tooltip，避免每次数据保存都重建原生菜单 */
export function updateTrayCounts(): void {
  if (!tray) return
  const activeCount = store.get().items.filter((item) => !item.done).length
  tray.setToolTip(`待办小组件 · ${activeCount} 项待完成`)
}

export function refreshTray(settings: AppSettings = store.getSettings()): void {
  if (!tray) return
  const win = getMainWindow()
  const visible = Boolean(win && !win.isDestroyed() && win.isVisible())

  updateTrayCounts()

  const menu = Menu.buildFromTemplate([
    {
      label: visible ? '隐藏窗口' : '显示窗口',
      click: () => toggleMainWindow()
    },
    { label: '快速新增任务', click: () => requestQuickAdd() },
    { type: 'separator' },
    { label: '待办列表', click: () => requestView('todo') },
    { label: '统计视图', click: () => requestView('stats') },
    { label: '数据管理', click: () => requestView('data') },
    { label: '外观设置', click: () => requestView('settings') },
    { label: '帮助中心', click: () => requestView('help') },
    { type: 'separator' },
    {
      label: '小组件模式',
      type: 'radio',
      checked: settings.windowMode === 'widget',
      click: () => requestMode('widget')
    },
    {
      label: '普通窗口模式',
      type: 'radio',
      checked: settings.windowMode === 'window',
      click: () => requestMode('window')
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        setQuitting(true)
        app.quit()
      }
    }
  ])

  tray.setContextMenu(menu)
}

export function createTray(settings: AppSettings): void {
  if (tray) return
  tray = new Tray(createTrayIcon(settings.customAccent))
  tray.on('click', () => toggleMainWindow())
  tray.on('double-click', () => showMainWindow())
  // 窗口显示/隐藏时刷新「显示/隐藏窗口」菜单标签
  setWindowVisibilityListener(() => refreshTray())
  refreshTray(settings)
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
  setWindowVisibilityListener(null)
}
